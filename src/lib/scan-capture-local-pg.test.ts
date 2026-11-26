import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

/**
 * S6 END TO END, LOCAL ONLY. SKIPPED unless `S6_LOCAL_PG=1` (so `npm test` and CI never run it).
 * Run it with `docs/scan-s6/run-local-e2e.sh`, which builds a throw-away PostgreSQL database with
 * migrations 0001..0014 and the 0016 draft (switch OFF as shipped) and never touches Supabase.
 *
 * What is REAL here: the 0016 functions, tables, RLS, grants and triggers, executed by PostgreSQL 16,
 * and the deployed `identify-plant` handler (`index.ts`), driven through its real request path.
 * What is FAKED: the Supabase client (its service-role calls are forwarded to the database through
 * `psql`, under the `service_role` role, exactly as PostgREST would run them), the JWT check (a bearer
 * of `A`..`H` is that user), the provider (a canned PlantNet body) and the daily scan quota (always
 * granted, so the ten-a-day limit cannot interfere with a many-case suite).
 *
 * The suite turns enforcement ON in the LOCAL database for its whole run. That is the stricter case:
 * it proves the capture path is the thing that unlocks a card when the database refuses everything
 * else, which is the situation the missing edge half would have turned into "no collecting at all".
 */
const ENABLED = process.env.S6_LOCAL_PG === '1';
const DB = process.env.S6_DB ?? 's6test';

const FN = join(__dirname, '..', '..', 'supabase', 'functions', 'identify-plant');

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// ─── psql ───────────────────────────────────────────────────────────────────

function psqlRaw(sql: string): { out: string; err: string; ok: boolean } {
  const base = `psql -v ON_ERROR_STOP=1 -q -At -d ${DB}`;
  const [cmd, args] = process.getuid?.() === 0 ? ['su', ['postgres', '-c', base]] : ['sh', ['-c', base]];
  const r = spawnSync(cmd as string, args as string[], { input: sql, encoding: 'utf8' });
  return { out: r.stdout.trim(), err: r.stderr.trim(), ok: r.status === 0 };
}

const lit = (v: string) => `'${v.replace(/'/g, "''")}'`;

function asRole(role: 'authenticated' | 'service_role' | 'anon', sub?: string): string {
  return `set role ${role};${sub ? ` select set_config('request.jwt.claim.sub', ${lit(sub)}, false);` : ''}\n`;
}

/** Runs `body` as a role; returns the LAST output line parsed as JSON, or the database's error text. */
function sqlJson(role: 'authenticated' | 'service_role' | 'anon', sub: string | undefined, body: string): { data: Json; error?: string } {
  const r = psqlRaw(asRole(role, sub) + body);
  if (!r.ok) return { data: {}, error: r.err };
  const last = r.out.split('\n').filter(Boolean).pop() ?? '';
  try {
    return { data: JSON.parse(last) };
  } catch {
    return { data: last as unknown as Json };
  }
}

const superSql = (body: string) => {
  const r = psqlRaw(body);
  if (!r.ok) throw new Error(r.err);
  return r.out;
};

// ─── The faked Supabase, forwarding service-role traffic to the real database ─

const world = vi.hoisted(() => ({
  bearer: { A: '', B: '', C: '', D: '', E: '', F: '', G: '', H: '', I: '' } as Record<string, string>,
  adminRpc: null as null | ((fn: string, args: Record<string, unknown>) => Promise<unknown>),
  adminFrom: null as null | ((table: string) => unknown),
}));

vi.mock('npm:@supabase/supabase-js@2', () => ({
  createClient: (_u: string, key: string, opts?: { global?: { headers?: Record<string, string> } }) => {
    if (key === 'anon-key') {
      return {
        auth: {
          getUser: async () => {
            const auth = opts?.global?.headers?.Authorization ?? '';
            const tag = auth.replace('Bearer ', '');
            const id = world.bearer[tag];
            return { data: { user: id ? { id } : null } };
          },
        },
      };
    }
    return { rpc: (fn: string, args: Record<string, unknown>) => world.adminRpc!(fn, args), from: (t: string) => world.adminFrom!(t) };
  },
}));

const UUID_PARAMS = new Set(['p_user', 'p_session']);

function serviceRpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  if (fn === 'claim_scan_pair') return Promise.resolve({ data: 1, error: null });
  const params = Object.entries(args).map(([k, v]) => {
    if (v === null) return `${k} => null`;
    if (k === 'p_image_digests') return `${k} => array[${(v as string[]).map(lit).join(',')}]::text[]`;
    if (k === 'p_items') return `${k} => ${lit(JSON.stringify(v))}::jsonb`;
    if (UUID_PARAMS.has(k)) return `${k} => ${lit(String(v))}::uuid`;
    return `${k} => ${lit(String(v))}`;
  });
  const r = sqlJson('service_role', undefined, `select to_jsonb(public.${fn}(${params.join(', ')}));\n`);
  return Promise.resolve(r.error ? { data: null, error: { message: r.error } } : { data: r.data, error: null });
}

function serviceFrom(table: string) {
  const filters: string[] = [];
  const chain: Record<string, unknown> = {
    select: () => chain,
    delete: () => chain,
    lt: () => chain,
    eq: (col: string, val: string) => {
      filters.push(`${col} = ${lit(String(val))}`);
      return chain;
    },
    then: (ok: (v: unknown) => unknown) => {
      if (table !== 'capture_receipts') return ok({ data: [], error: null });
      const where = filters.length ? ` where ${filters.join(' and ')}` : '';
      const r = sqlJson('service_role', undefined, `select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) from public.capture_receipts r${where};\n`);
      return ok(r.error ? { data: null, error: { message: r.error } } : { data: r.data, error: null });
    },
  };
  return chain;
}

// ─── Fixtures ───────────────────────────────────────────────────────────────

const USERS: Record<string, string> = {
  A: '00000000-0000-0000-0000-0000000005a1',
  B: '00000000-0000-0000-0000-0000000005b1',
  C: '00000000-0000-0000-0000-0000000005c1',
  D: '00000000-0000-0000-0000-0000000005d1',
  E: '00000000-0000-0000-0000-0000000005e1',
  F: '00000000-0000-0000-0000-0000000005f1',
  G: '00000000-0000-0000-0000-000000000561',
  H: '00000000-0000-0000-0000-000000000581',
  I: '00000000-0000-0000-0000-000000000591',
};

const PLANTNET = (names: Array<[string, number]>) => ({
  results: names.map(([n, score]) => ({ score, species: { scientificNameWithoutAuthor: n, commonNames: [] } })),
});
const DANDELION = PLANTNET([['Taraxacum officinale', 0.82], ['Capsella rubella', 0.1]]);

let handler: (req: Request) => Promise<Response>;
let providerCalls = 0;
function provide(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      providerCalls += 1;
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
}

function post(user: string | null, bytes: string[], fields: Record<string, string>): Request {
  const form = new FormData();
  for (const b of bytes) {
    form.append('image', new File([new TextEncoder().encode(b)], `${b}.jpg`, { type: 'image/jpeg' }));
    form.append('organ', 'auto');
  }
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new Request('https://fn.test/identify-plant', {
    method: 'POST',
    body: form,
    headers: user ? { Authorization: `Bearer ${user}` } : {},
  });
}

function open(user: string, backdate = true): { sessionId: string; nonce: string } {
  const r = sqlJson('authenticated', USERS[user], 'select public.open_capture_session();\n');
  expect(r.error).toBeUndefined();
  expect(r.data.ok).toBe(true);
  expect(r.data.nonce).toMatch(/^[0-9a-f]{64}$/); // the shape the edge function accepts
  if (backdate) {
    // Only the 2 s minimum is skipped; the TTL, nonce and single-use rules are all real.
    superSql(`update public.capture_sessions set issued_at = issued_at - interval '5 seconds' where id = ${lit(r.data.session_id)};`);
  }
  return { sessionId: r.data.session_id, nonce: r.data.nonce };
}

const collect = (s: { sessionId: string; nonce: string }, over: Record<string, string> = {}) => ({
  purpose: 'collect',
  capture_session_id: s.sessionId,
  capture_nonce: s.nonce,
  ...over,
});

const count = (sql: string) => Number(superSql(sql));
const sessionRow = (id: string) => JSON.parse(superSql(`select to_jsonb(s) from public.capture_sessions s where id = ${lit(id)};`));

describe.skipIf(!ENABLED)('S6: identify-plant + migration 0016 on a real local PostgreSQL', () => {
  let happy: { receiptId: string; observationId: string; session: { sessionId: string; nonce: string } };

  beforeAll(async () => {
    for (const [tag, id] of Object.entries(USERS)) {
      world.bearer[tag] = id;
      superSql(`insert into auth.users (id, email) values (${lit(id)}, ${lit(`s6-${tag}@example.invalid`)}) on conflict do nothing;`);
    }
    world.adminRpc = serviceRpc;
    world.adminFrom = serviceFrom;
    const env: Record<string, string> = {
      SUPABASE_URL: 'https://local.test',
      SUPABASE_ANON_KEY: 'anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      PLANTNET_API_KEY: 'provider-key',
    };
    (globalThis as unknown as { Deno: unknown }).Deno = {
      env: { get: (k: string) => env[k] },
      serve: (h: (req: Request) => Promise<Response>) => {
        handler = h;
      },
    };
    await import(/* @vite-ignore */ join(FN, 'index.ts'));

    // Enforcement ON, in the LOCAL database only: the strict case.
    const on = sqlJson(
      'service_role',
      undefined,
      `select public.set_discovery_enforcement(true, now() - interval '1 second', 'ENFORCE NEW DISCOVERIES');\n`,
    );
    expect(on.error).toBeUndefined();
    expect(superSql('select enforce from public.discovery_enforcement;')).toBe('t');
  });

  afterAll(() => {
    if (!ENABLED) return;
    sqlJson('service_role', undefined, 'select public.set_discovery_enforcement(false, null, null);\n');
  });

  it('precondition: with enforcement ON a direct insert of a new card is refused', () => {
    const r = sqlJson('authenticated', USERS.A, `insert into public.discoveries (user_id, herb_id) values (${lit(USERS.A!)}, 'taraxacum-officinale');\n`);
    expect(r.error).toMatch(/discovery_requires_capture_receipt/);
    expect(count(`select count(*) from public.discoveries where user_id = ${lit(USERS.A!)};`)).toBe(0);
  });

  it('HAPPY PATH: open_capture_session -> identify-plant -> receipt -> claim_discovery -> discovery row', async () => {
    provide(DANDELION);
    const session = open('A');
    const res = await handler(post('A', ['happy-1', 'happy-2'], collect(session)));
    const body = (await res.json()) as Json;
    expect(res.status).toBe(200);
    expect(body.capture).toEqual({ accepted: true });
    const withReceipt = body.candidates.filter((c: Json) => c.captureReceipt);
    expect(withReceipt.map((c: Json) => c.scientificName)).toEqual(['Taraxacum officinale']);
    const receiptId = withReceipt[0].captureReceipt.id as string;
    expect(receiptId).toMatch(/^rcpt_[0-9a-f]{32}$/);
    expect(withReceipt[0].captureReceipt.rankPosition).toBe('top');
    expect(Date.parse(withReceipt[0].captureReceipt.expiresAt)).toBeGreaterThan(Date.now() + 29 * 86400_000);

    // The stored receipt is what the server decided, not what any client said.
    const row = JSON.parse(superSql(`select to_jsonb(r) from public.capture_receipts r where id = ${lit(receiptId)};`));
    expect(row).toMatchObject({
      user_id: USERS.A,
      herb_id: 'taraxacum-officinale',
      eligibility: 'exact',
      rank_position: 'top',
      observed_taxon_rank: 'species',
      species_confidence: 'high',
      observation_id: body.observationId,
    });
    expect(row.claimed_at).toBeNull();
    expect(sessionRow(session.sessionId).consumed_at).not.toBeNull();
    expect(sessionRow(session.sessionId).observation_id).toBe(body.observationId);
    // Only digests are kept of an image; and exactly two of them.
    expect(count(`select count(*) from public.capture_image_digests where user_id = ${lit(USERS.A!)};`)).toBe(2);

    const claim = sqlJson('authenticated', USERS.A, `select public.claim_discovery(${lit(receiptId)});\n`);
    expect(claim.data).toMatchObject({ ok: true, status: 'claimed', herb_id: 'taraxacum-officinale' });
    expect(count(`select count(*) from public.discoveries where user_id = ${lit(USERS.A!)} and herb_id = 'taraxacum-officinale';`)).toBe(1);

    // Idempotent: a retried claim neither duplicates the row nor re-awards.
    const again = sqlJson('authenticated', USERS.A, `select public.claim_discovery(${lit(receiptId)});\n`);
    expect(again.data).toMatchObject({ ok: true, status: 'already_claimed' });
    expect(count(`select count(*) from public.discoveries where user_id = ${lit(USERS.A!)};`)).toBe(1);

    happy = { receiptId, observationId: body.observationId, session };
  });

  it('REPLAY: the identical request resent returns the receipts and does NOT call the provider again', async () => {
    provide(DANDELION);
    const before = providerCalls;
    const res = await handler(post('A', ['happy-1', 'happy-2'], collect(happy.session)));
    const body = (await res.json()) as Json;
    expect(providerCalls).toBe(before);
    expect(body.candidates).toEqual([]);
    expect(body.observationId).toBe(happy.observationId);
    expect(body.capture).toEqual({
      accepted: true,
      replay: true,
      receipts: [{ id: happy.receiptId, herbId: 'taraxacum-officinale', rankPosition: 'top' }],
    });
    expect(count(`select count(*) from public.capture_receipts where user_id = ${lit(USERS.A!)};`)).toBe(1);
  });

  it('a consumed session cannot be used for DIFFERENT photographs (capture_session_used)', async () => {
    provide(DANDELION);
    const res = await handler(post('A', ['other-1', 'other-2'], collect(happy.session)));
    const body = (await res.json()) as Json;
    expect(res.status).toBe(200);
    expect(body.capture).toEqual({ accepted: false, code: 'capture_session_used' });
    expect(body.candidates.length).toBeGreaterThan(0); // still an ordinary identification
    expect(body.candidates.every((c: Json) => !c.captureReceipt)).toBe(true);
  });

  it('FOREIGN receipt: another account cannot claim it, and learns nothing about it', () => {
    const r = sqlJson('authenticated', USERS.B, `select public.claim_discovery(${lit(happy.receiptId)});\n`);
    expect(r.data).toEqual({ ok: false, code: 'receipt_unknown' });
    const forged = sqlJson('authenticated', USERS.B, `select public.claim_discovery('rcpt_${'0'.repeat(32)}');\n`);
    expect(forged.data).toEqual({ ok: false, code: 'receipt_unknown' }); // indistinguishable from a foreign one
    expect(count(`select count(*) from public.discoveries where user_id = ${lit(USERS.B!)};`)).toBe(0);
    // And B cannot even read A's receipt.
    const seen = sqlJson('authenticated', USERS.B, `select count(*) from public.capture_receipts;\n`);
    expect(Number(seen.data)).toBe(0);
  });

  it('EXPIRED session: identification still works, no receipt, session untouched', async () => {
    provide(DANDELION);
    const s = open('C');
    superSql(`update public.capture_sessions set issued_at = now() - interval '20 minutes', expires_at = now() - interval '10 minutes' where id = ${lit(s.sessionId)};`);
    const res = await handler(post('C', ['expired-1', 'expired-2'], collect(s)));
    const body = (await res.json()) as Json;
    expect(res.status).toBe(200);
    expect(body.capture).toEqual({ accepted: false, code: 'capture_session_expired' });
    expect(body.candidates.length).toBeGreaterThan(0);
    expect(count(`select count(*) from public.capture_receipts where user_id = ${lit(USERS.C!)};`)).toBe(0);
    expect(sessionRow(s.sessionId).consumed_at).toBeNull();
  });

  it('MISMATCHED nonce: refused without consuming, and the right nonce still works afterwards', async () => {
    provide(DANDELION);
    const s = open('D');
    const bad = await (await handler(post('D', ['nonce-1', 'nonce-2'], collect(s, { capture_nonce: 'ff'.repeat(32) })))).json() as Json;
    expect(bad.capture).toEqual({ accepted: false, code: 'capture_session_nonce' });
    expect(sessionRow(s.sessionId).consumed_at).toBeNull();
    const good = (await (await handler(post('D', ['nonce-1', 'nonce-2'], collect(s)))).json()) as Json;
    expect(good.capture).toEqual({ accepted: true });
    expect(good.candidates.filter((c: Json) => c.captureReceipt)).toHaveLength(1);
  });

  it("another account's session id and nonce are refused (the session belongs to its opener)", async () => {
    provide(DANDELION);
    const s = open('E');
    const body = (await (await handler(post('B', ['theft-1', 'theft-2'], collect(s)))).json()) as Json;
    expect(body.capture).toEqual({ accepted: false, code: 'capture_session_unknown' });
    expect(sessionRow(s.sessionId).consumed_at).toBeNull();
  });

  it('IMPORT-ONLY requests never get a receipt, and never touch capture state', async () => {
    provide(DANDELION);
    const s = open('F');
    const digestsBefore = count('select count(*) from public.capture_image_digests;');
    const receiptsBefore = count('select count(*) from public.capture_receipts;');

    const none = (await (await handler(post('F', ['import-1', 'import-2'], {}))).json()) as Json;
    const lookup = (await (await handler(post('F', ['import-3', 'import-4'], { purpose: 'lookup', capture_session_id: s.sessionId, capture_nonce: s.nonce }))).json()) as Json;
    const strays = (await (await handler(post('F', ['import-5', 'import-6'], { capture_session_id: s.sessionId, capture_nonce: s.nonce }))).json()) as Json;
    for (const body of [none, lookup, strays]) {
      expect(body.capture).toBeUndefined();
      expect(body.candidates.length).toBeGreaterThan(0);
      expect(body.candidates.every((c: Json) => !c.captureReceipt)).toBe(true);
    }
    expect(count('select count(*) from public.capture_image_digests;')).toBe(digestsBefore);
    expect(count('select count(*) from public.capture_receipts;')).toBe(receiptsBefore);
    expect(sessionRow(s.sessionId).consumed_at).toBeNull();

    // And with nothing to claim, a made-up id unlocks nothing: the card stays locked.
    const claim = sqlJson('authenticated', USERS.F, `select public.claim_discovery('rcpt_${'1'.repeat(32)}');\n`);
    expect(claim.data).toEqual({ ok: false, code: 'receipt_unknown' });
    expect(count(`select count(*) from public.discoveries where user_id = ${lit(USERS.F!)};`)).toBe(0);
    const direct = sqlJson('authenticated', USERS.F, `insert into public.discoveries (user_id, herb_id) values (${lit(USERS.F!)}, 'taraxacum-officinale');\n`);
    expect(direct.error).toMatch(/discovery_requires_capture_receipt/);
  });

  it('anonymous collect is an ordinary identification with capture_not_signed_in', async () => {
    provide(DANDELION);
    const s = open('F', true);
    const body = (await (await handler(post(null, ['anon-1', 'anon-2'], collect(s)))).json()) as Json;
    expect(body.capture).toEqual({ accepted: false, code: 'capture_not_signed_in' });
    expect(body.candidates.length).toBeGreaterThan(0);
    expect(sessionRow(s.sessionId).consumed_at).toBeNull();
  });

  it('DUPLICATE image (already seen, any account): refused without consuming; fresh photos then work', async () => {
    provide(DANDELION);
    const s = open('G');
    const dup = (await (await handler(post('G', ['happy-1', 'fresh-g-1'], collect(s)))).json()) as Json; // happy-1 was A's
    expect(dup.capture).toEqual({ accepted: false, code: 'capture_duplicate_image' });
    expect(dup.candidates.length).toBeGreaterThan(0);
    expect(sessionRow(s.sessionId).consumed_at).toBeNull();
    expect(count(`select count(*) from public.capture_receipts where user_id = ${lit(USERS.G!)};`)).toBe(0);
    const ok = (await (await handler(post('G', ['fresh-g-1', 'fresh-g-2'], collect(s)))).json()) as Json;
    expect(ok.capture).toEqual({ accepted: true });
  });

  it('the same photograph twice in one request is capture_images_invalid', async () => {
    provide(DANDELION);
    const s = open('H');
    const body = (await (await handler(post('H', ['twin', 'twin'], collect(s)))).json()) as Json;
    expect(body.capture).toEqual({ accepted: false, code: 'capture_images_invalid' });
    expect(sessionRow(s.sessionId).consumed_at).toBeNull();
  });

  it('TOO FAST (inside min_capture_ms): refused without consuming', async () => {
    provide(DANDELION);
    const s = open('I', false); // not backdated
    const body = (await (await handler(post('I', ['fast-1', 'fast-2'], collect(s)))).json()) as Json;
    expect(body.capture).toEqual({ accepted: false, code: 'capture_too_fast' });
    expect(sessionRow(s.sessionId).consumed_at).toBeNull();
  });

  it('a listed (non-leading) card species earns a `listed` receipt, and a card-less leader earns none', async () => {
    provide(PLANTNET([['Capsella rubella', 0.6], ['Plantago major', 0.3]]));
    const s = open('B');
    const body = (await (await handler(post('B', ['listed-1', 'listed-2'], collect(s)))).json()) as Json;
    const receipted = body.candidates.filter((c: Json) => c.captureReceipt);
    expect(receipted.map((c: Json) => [c.scientificName, c.captureReceipt.rankPosition])).toEqual([['Plantago major', 'listed']]);
  });

  it('legacyGenus and unmatched names get no receipt: accepted, no_eligible_candidate', async () => {
    provide(PLANTNET([['Solidago altissima', 0.9], ['Capsella rubella', 0.05]]));
    const s = open('E');
    const body = (await (await handler(post('E', ['legacy-1', 'legacy-2'], collect(s)))).json()) as Json;
    expect(body.capture).toEqual({ accepted: true, code: 'no_eligible_candidate' });
    expect(body.candidates.every((c: Json) => !c.captureReceipt)).toBe(true);
    expect(count(`select count(*) from public.capture_receipts where user_id = ${lit(USERS.E!)};`)).toBe(0);
  });

  describe('direct-API bypass checks stay true with the function present', () => {
    const consume = `select public.consume_capture_session(${lit(USERS.A!)}::uuid, ${lit(USERS.A!)}::uuid, 'x', 'o', array[${lit('a'.repeat(64))},${lit('b'.repeat(64))}]);\n`;
    const issue = `select public.issue_capture_receipts(${lit(USERS.A!)}::uuid, ${lit(USERS.A!)}::uuid, '[]'::jsonb);\n`;

    it.each(['authenticated', 'anon'] as const)('%s cannot call consume_capture_session or issue_capture_receipts', (role) => {
      expect(sqlJson(role, USERS.A, consume).error).toMatch(/permission denied for function consume_capture_session/);
      expect(sqlJson(role, USERS.A, issue).error).toMatch(/permission denied for function issue_capture_receipts/);
    });

    it('a client cannot mint, edit or delete a receipt, a session or a digest, or flip the switch', () => {
      const attempts = [
        `insert into public.capture_receipts (id, user_id, session_id, observation_id, herb_id, observed_taxon_key, observed_taxon_rank, eligibility, rank_position, species_confidence, expires_at) values ('rcpt_${'2'.repeat(32)}', ${lit(USERS.A!)}, ${lit(USERS.A!)}, 'o', 'plantago-major', 'k', 'species', 'exact', 'top', 'high', now() + interval '1 day');`,
        `update public.capture_receipts set claimed_at = null;`,
        `delete from public.capture_receipts;`,
        `select * from public.capture_sessions;`,
        `select * from public.capture_image_digests;`,
        `insert into public.capture_sessions (user_id, nonce_digest, expires_at) values (${lit(USERS.A!)}, 'x'::bytea, now() + interval '1 hour');`,
        `select public.set_discovery_enforcement(false, null, null);`,
      ];
      for (const sql of attempts) {
        const r = sqlJson('authenticated', USERS.A, sql + '\n');
        expect(r.error, sql).toMatch(/permission denied|row-level security|must be owner/);
      }
      // Nothing above changed what A holds: A's card is still the one claimed legitimately.
      expect(count(`select count(*) from public.capture_receipts where user_id = ${lit(USERS.A!)};`)).toBe(1);
      expect(superSql('select enforce from public.discovery_enforcement;')).toBe('t');
    });
  });
});
