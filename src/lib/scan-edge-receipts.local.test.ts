import { execFileSync } from 'node:child_process';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fakeImage,
  importEdge,
  installFetch,
  invoke,
  loadHandler,
  provider,
  router,
  type AdminFake,
  type Reply,
} from './scan-edge-harness';

/*
 * THE REAL handler, THE REAL migration 0016, A THROW-AWAY LOCAL POSTGRESQL. Skipped unless
 * `S6_LOCAL_DB` names a database that `docs/scan-s6/run-local.sh` built (0001..0014 + 0016, enforcement
 * OFF), so `npm test` and CI never run it and it can never reach a Supabase project: it speaks to
 * `psql` on this machine and nothing else.
 *
 * What is faked: only the provider (PlantNet's answer) and the HTTP hop between supabase-js and
 * PostgREST. `consume_capture_session`, `issue_capture_receipts`, `open_capture_session` and
 * `claim_discovery` are the real SQL, executed under the real roles (`service_role` for the function,
 * `authenticated` / `anon` for players), so a grant that is wrong fails here and not in production.
 *
 * THE ENFORCEMENT SWITCH IS NEVER TURNED ON, here or anywhere. `claim_discovery` writes the discovery
 * row either way; the refusal side of enforcement is 0016_verify.sql's, run by the same script.
 */
const DB = process.env.S6_LOCAL_DB;
const AS_POSTGRES = process.env.S6_LOCAL_AS_POSTGRES === '1';

vi.mock('npm:@supabase/supabase-js@2', async () => (await import('./scan-edge-harness')).supabaseMock);

const ALICE = '00000000-0000-4000-8000-0000000a11ce';
const BOB = '00000000-0000-4000-8000-0000000000b0';
const STAMP = Date.now().toString(36);

function runPsql(sql: string): string {
  const flags = ['-q', '-At', '-v', 'ON_ERROR_STOP=1', '-d', DB!];
  const out = AS_POSTGRES
    ? execFileSync('su', ['postgres', '-c', `psql ${flags.map((f) => `'${f}'`).join(' ')}`], { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
    : execFileSync('psql', flags, { input: sql, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  return out.trim();
}

type Who = { role: 'postgres' } | { role: 'service_role' } | { role: 'anon' } | { role: 'authenticated'; sub: string };

/** Runs one statement as a role and returns its last output line, or throws with the database's message. */
function as(who: Who, sql: string): string {
  const prefix =
    who.role === 'postgres'
      ? ''
      : who.role === 'authenticated'
        ? `set role authenticated; select set_config('request.jwt.claim.sub','${who.sub}',false) \\g /dev/null\n`
        : `set role ${who.role};\n`;
  const out = runPsql(`${prefix}${sql};`);
  const lines = out.split('\n').filter(Boolean);
  return lines[lines.length - 1] ?? '';
}
function attempt(who: Who, sql: string): { ok: true; out: string } | { ok: false; error: string } {
  try {
    return { ok: true, out: as(who, sql) };
  } catch (e) {
    const err = e as { stderr?: string; message: string };
    return { ok: false, error: String(err.stderr ?? err.message) };
  }
}
const asAlice: Who = { role: 'authenticated', sub: ALICE };
const asBob: Who = { role: 'authenticated', sub: BOB };

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return `array[${v.map(lit).join(',')}]::text[]`;
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
};

/** supabase-js, but against psql: service_role, named-argument RPCs, and the two builders the function uses. */
const pgAdmin: AdminFake = {
  rpc(name, args) {
    const call = `select public.${name}(${Object.entries(args).map(([k, v]) => `${k} => ${lit(v)}`).join(', ')})::text`;
    const r = attempt({ role: 'service_role' }, call);
    const reply: Reply = r.ok ? { data: JSON.parse(r.out), error: null } : { data: null, error: { message: r.error } };
    return Promise.resolve(reply);
  },
  from(table) {
    return {
      select: (cols: string) => ({
        eq: (c1: string, v1: unknown) => ({
          eq: (c2: string, v2: unknown) => {
            const q = `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)::text from (select ${cols} from public.${table} where ${c1} = ${lit(v1)} and ${c2} = ${lit(v2)}) t`;
            const r = attempt({ role: 'service_role' }, q);
            return Promise.resolve(r.ok ? { data: JSON.parse(r.out), error: null } : { data: null, error: { message: r.error } });
          },
        }),
      }),
      delete: () => ({
        lt: (col: string, value: unknown) => {
          attempt({ role: 'service_role' }, `delete from public.${table} where ${col} < ${lit(value)}`);
          return Promise.resolve({ data: null, error: null } as Reply);
        },
      }),
    };
  },
};

const collect = (s: { sessionId: string; nonce: string }) => ({ purpose: 'collect', capture_session_id: s.sessionId, capture_nonce: s.nonce });

function open(who: Who = asAlice): { sessionId: string; nonce: string } {
  const body = JSON.parse(as(who, 'select public.open_capture_session()::text'));
  expect(body.ok, JSON.stringify(body)).toBe(true);
  return { sessionId: body.session_id, nonce: body.nonce };
}
/** Pretend the player took a moment (the real minimum is 2s): fixtures only, via the superuser. */
const aged = (sessionId: string) =>
  as({ role: 'postgres' }, `update public.capture_sessions set issued_at = issued_at - interval '30 seconds', expires_at = expires_at - interval '30 seconds' where id = '${sessionId}'`);
const sessionRow = (sessionId: string) => JSON.parse(as({ role: 'postgres' }, `select to_jsonb(s)::text from public.capture_sessions s where id = '${sessionId}'`));
const count = (sql: string) => Number(as({ role: 'postgres' }, sql));

const photos = (tag: string) => [fakeImage(`${STAMP}-${tag}-1`), fakeImage(`${STAMP}-${tag}-2`)];

describe.skipIf(!DB)('identify-plant + migration 0016, end to end on a local PostgreSQL', () => {
  let handler: Awaited<ReturnType<typeof loadHandler>>;
  let restoreFetch: () => void;

  beforeAll(async () => {
    expect(as({ role: 'postgres' }, 'select enforce from public.discovery_enforcement')).toBe('f');
    as({ role: 'postgres' }, `insert into auth.users (id, email) values ('${ALICE}', 'alice-${STAMP}@s6.invalid'), ('${BOB}', 'bob-${STAMP}@s6.invalid') on conflict do nothing`);
    restoreFetch = installFetch();
    router.admin = pgAdmin;
    router.tokens = { 'Bearer tok-alice': ALICE, 'Bearer tok-bob': BOB };
    handler = await loadHandler(() => importEdge('index'));
  });
  afterAll(() => {
    restoreFetch?.();
    // The switch was never touched.
    expect(as({ role: 'postgres' }, 'select enforce from public.discovery_enforcement')).toBe('f');
    as({ role: 'postgres' }, `delete from auth.users where id in ('${ALICE}', '${BOB}')`);
  });
  beforeEach(() => {
    // Fixture hygiene only (superuser): the real limits are 3 open sessions and 10 scans a day per
    // account, and one run exercises far more than that. They are covered by 0016_verify.sql.
    as({ role: 'postgres' }, `delete from public.capture_sessions where consumed_at is null and user_id in ('${ALICE}', '${BOB}'); delete from public.scan_quota`);
    provider.calls = 0;
    provider.plan = { mode: 'ok', names: [{ name: 'Taraxacum officinale', score: 0.81 }, { name: 'Bellis perennis', score: 0.1 }] };
  });

  it('open -> identify -> receipt -> claim -> discovery row, then replay and idempotence', async () => {
    const session = open();
    aged(session.sessionId);
    const images = photos('happy');
    const out = await invoke(handler, { token: 'tok-alice', images, fields: collect(session) });
    expect(out.status).toBe(200);
    expect(out.body.capture).toEqual({ accepted: true });
    const dandelion = (out.body.candidates as Array<{ scientificName: string; captureReceipt?: { id: string; rankPosition: string; expiresAt: string } }>)[0]!;
    expect(dandelion.captureReceipt).toMatchObject({ rankPosition: 'top' });
    expect(dandelion.captureReceipt!.id).toMatch(/^rcpt_[0-9a-f]{32}$/);
    expect(Date.parse(dandelion.captureReceipt!.expiresAt)).toBeGreaterThan(Date.now() + 29 * 86_400_000);
    // The species with no card gets no receipt.
    expect((out.body.candidates as Array<{ captureReceipt?: unknown }>)[1]!.captureReceipt).toBeUndefined();

    const row = sessionRow(session.sessionId);
    expect(row.consumed_at).not.toBeNull();
    expect(row.observation_id).toBe(out.body.observationId);

    const receiptId = dandelion.captureReceipt!.id;
    const stored = JSON.parse(as({ role: 'postgres' }, `select to_jsonb(r)::text from public.capture_receipts r where id = '${receiptId}'`));
    expect(stored).toMatchObject({ user_id: ALICE, herb_id: 'taraxacum-officinale', eligibility: 'exact', rank_position: 'top', species_confidence: 'high', claimed_at: null, observed_taxon_key: 'taraxacum officinale', receipt_version: 1 });
    // No score, location, image or device value has a column to live in.
    expect(Object.keys(stored).sort()).toEqual(
      ['claimed_at', 'eligibility', 'expires_at', 'herb_id', 'id', 'issued_at', 'observation_id', 'observed_taxon_key', 'observed_taxon_rank', 'rank_position', 'receipt_version', 'session_id', 'species_confidence', 'user_id'].sort(),
    );

    expect(count(`select count(*) from public.discoveries where user_id = '${ALICE}' and herb_id = 'taraxacum-officinale'`)).toBe(0);
    const claim = JSON.parse(as(asAlice, `select public.claim_discovery('${receiptId}')::text`));
    expect(claim).toMatchObject({ ok: true, status: 'claimed', herb_id: 'taraxacum-officinale' });
    expect(count(`select count(*) from public.discoveries where user_id = '${ALICE}' and herb_id = 'taraxacum-officinale'`)).toBe(1);
    expect(JSON.parse(as(asAlice, `select public.claim_discovery('${receiptId}')::text`))).toMatchObject({ ok: true, status: 'already_claimed' });
    expect(count(`select count(*) from public.discoveries where user_id = '${ALICE}'`)).toBe(1);

    // REPLAY: the identical request again. No provider call, no second quota unit, same receipt, no candidates.
    const quotaBefore = count(`select coalesce(sum(count),0) from public.scan_quota where bucket = 'user:${ALICE}'`);
    const providerBefore = provider.calls;
    const again = await invoke(handler, { token: 'tok-alice', images, fields: collect(session) });
    expect(provider.calls).toBe(providerBefore);
    expect(count(`select coalesce(sum(count),0) from public.scan_quota where bucket = 'user:${ALICE}'`)).toBe(quotaBefore);
    expect(again.body).toMatchObject({ candidates: [], capture: { accepted: true, replay: true } });
    expect((again.body.capture as { receipts: Array<{ id: string }> }).receipts.map((r) => r.id)).toEqual([receiptId]);
  });

  it('a foreign receipt, a foreign session and a forged receipt id are refused', async () => {
    const session = open(asAlice);
    aged(session.sessionId);
    const ok = await invoke(handler, { token: 'tok-alice', images: photos('foreign'), fields: collect(session) });
    const receiptId = (ok.body.candidates as Array<{ captureReceipt?: { id: string } }>)[0]!.captureReceipt!.id;
    // Bob presents Alice's receipt.
    expect(JSON.parse(as(asBob, `select public.claim_discovery('${receiptId}')::text`))).toEqual({ ok: false, code: 'receipt_unknown' });
    expect(JSON.parse(as(asBob, `select public.claim_discovery('rcpt_${'f'.repeat(32)}')::text`))).toEqual({ ok: false, code: 'receipt_unknown' });
    expect(count(`select count(*) from public.discoveries where user_id = '${BOB}'`)).toBe(0);

    // Bob presents Alice's OPEN session and nonce on his own scan.
    const aliceOpen = open(asAlice);
    aged(aliceOpen.sessionId);
    const stolen = await invoke(handler, { token: 'tok-bob', images: photos('stolen'), fields: collect(aliceOpen) });
    expect([200, 409]).toContain(stolen.status); // legacy lookup answer, or the refusal (2026-11-27)
    expect(stolen.body.capture).toEqual({ accepted: false, code: 'capture_session_unknown' });
    expect(JSON.stringify(stolen.body.candidates ?? [])).not.toContain('rcpt_');
    expect(sessionRow(aliceOpen.sessionId).consumed_at).toBeNull();
  });

  it('an expired session is refused, and no receipt is ever issued', async () => {
    const session = open();
    as({ role: 'postgres' }, `update public.capture_sessions set issued_at = now() - interval '20 minutes', expires_at = now() - interval '10 minutes' where id = '${session.sessionId}'`);
    const out = await invoke(handler, { token: 'tok-alice', images: photos('expired'), fields: collect(session) });
    expect([200, 409]).toContain(out.status); // legacy lookup answer, or the refusal (2026-11-27)
    expect(provider.calls).toBeLessThanOrEqual(1);
    expect(out.body.capture).toEqual({ accepted: false, code: 'capture_session_expired' });
    if (out.status === 200) expect((out.body.candidates as unknown[]).length).toBe(2);
    expect(JSON.stringify(out.body)).not.toContain('rcpt_');
  });

  it('a mismatched nonce is refused WITHOUT spending the session, which the right nonce then uses', async () => {
    const session = open();
    aged(session.sessionId);
    const wrong = await invoke(handler, { token: 'tok-alice', images: photos('nonce'), fields: collect({ ...session, nonce: '0'.repeat(64) }) });
    expect(wrong.body.capture).toEqual({ accepted: false, code: 'capture_session_nonce' });
    expect(sessionRow(session.sessionId).consumed_at).toBeNull();
    const right = await invoke(handler, { token: 'tok-alice', images: photos('nonce'), fields: collect(session) });
    expect(right.body.capture).toEqual({ accepted: true });
  });

  it('an import / lookup request never receives a receipt and never spends a session', async () => {
    const session = open();
    aged(session.sessionId);
    const explicit = await invoke(handler, { token: 'tok-alice', images: photos('lookup'), fields: { ...collect(session), purpose: 'lookup' } });
    expect(explicit.body.capture).toBeUndefined();
    expect(JSON.stringify(explicit.body)).not.toContain('rcpt_');
    const bare = await invoke(handler, { token: 'tok-alice', images: photos('lookup2') });
    expect(bare.body.capture).toBeUndefined();
    expect(JSON.stringify(bare.body)).not.toContain('rcpt_');
    expect(sessionRow(session.sessionId).consumed_at).toBeNull();
    // Nor did it record the images: a later real capture may use these very photographs.
    const later = await invoke(handler, { token: 'tok-alice', images: photos('lookup'), fields: collect(session) });
    expect(later.body.capture).toEqual({ accepted: true });
  });

  it('a duplicate image is ACCEPTED (never refused), flagged only when it was seen under ANOTHER account, and the response says nothing', async () => {
    const first = open();
    aged(first.sessionId);
    const images = photos('dup');
    expect((await invoke(handler, { token: 'tok-alice', images, fields: collect(first) })).body.capture).toEqual({ accepted: true });
    expect(sessionRow(first.sessionId).suspect_duplicate).toBe(false);

    // The SAME account re-using a photograph is a retake: accepted, not flagged.
    const second = open();
    aged(second.sessionId);
    const reuse = await invoke(handler, { token: 'tok-alice', images: [images[0]!, fakeImage(`${STAMP}-dup-fresh`)], fields: collect(second) });
    expect(reuse.body.capture).toEqual({ accepted: true });
    expect(sessionRow(second.sessionId).suspect_duplicate).toBe(false);

    // ANOTHER account submitting the same photograph is accepted and FLAGGED for review, silently.
    const bobSession = open(asBob);
    aged(bobSession.sessionId);
    const bobReuse = await invoke(handler, { token: 'tok-bob', images, fields: collect(bobSession) });
    expect(bobReuse.body.capture).toEqual({ accepted: true });
    expect(sessionRow(bobSession.sessionId).suspect_duplicate).toBe(true);
    expect(JSON.stringify(bobReuse.body).toLowerCase()).not.toMatch(/duplicate|suspect/);

    // The same photograph twice in ONE request is still invalid.
    const third = open();
    aged(third.sessionId);
    const twin = await invoke(handler, { token: 'tok-alice', images: [fakeImage(`${STAMP}-twin`), fakeImage(`${STAMP}-twin`)], fields: collect(third) });
    expect(twin.body.capture).toEqual({ accepted: false, code: 'capture_images_invalid' });
  });

  it('there is no mandatory capture delay: an immediate submit is accepted (owner decision)', async () => {
    const session = open();
    const out = await invoke(handler, { token: 'tok-alice', images: photos('fast'), fields: collect(session) });
    expect(out.body.capture).toEqual({ accepted: true });
  });

  it('a consumed session cannot be reused for different photographs', async () => {
    const session = open();
    aged(session.sessionId);
    await invoke(handler, { token: 'tok-alice', images: photos('reuse-a'), fields: collect(session) });
    const other = await invoke(handler, { token: 'tok-alice', images: photos('reuse-b'), fields: collect(session) });
    expect(other.body.capture).toEqual({ accepted: false, code: 'capture_session_used' });
    expect(JSON.stringify(other.body)).not.toContain('rcpt_');
  });

  it('an anonymous collect is an education lookup: capture_not_signed_in, no receipt', async () => {
    const session = open();
    const out = await invoke(handler, { images: photos('anon'), fields: collect(session) });
    expect(out.body.capture).toEqual({ accepted: false, code: 'capture_not_signed_in' });
    expect(sessionRow(session.sessionId).consumed_at).toBeNull();
  });

  it('a capture with no species that has a card is accepted and says so (a Seed Shelf case)', async () => {
    provider.plan = { mode: 'ok', names: [{ name: 'Bellis perennis', score: 0.9 }] };
    const session = open();
    aged(session.sessionId);
    const out = await invoke(handler, { token: 'tok-alice', images: photos('shelf'), fields: collect(session) });
    expect(out.body.capture).toEqual({ accepted: true, code: 'no_eligible_candidate' });
    expect(count(`select count(*) from public.capture_receipts where session_id = '${session.sessionId}'`)).toBe(0);
  });

  describe('direct-API bypass: with the function deployed, a client still cannot do what only the function may', () => {
    it('cannot call consume_capture_session or issue_capture_receipts, as any client role', () => {
      const session = open();
      for (const who of [asAlice, { role: 'anon' } as Who]) {
        const consume = attempt(who, `select public.consume_capture_session('${ALICE}', '${session.sessionId}', '${session.nonce}', 'obs', array['${'a'.repeat(64)}','${'b'.repeat(64)}'])`);
        expect(consume.ok).toBe(false);
        if (!consume.ok) expect(consume.error).toMatch(/permission denied/);
        const issue = attempt(who, `select public.issue_capture_receipts('${ALICE}', '${session.sessionId}', '[]'::jsonb)`);
        expect(issue.ok).toBe(false);
        if (!issue.ok) expect(issue.error).toMatch(/permission denied/);
      }
      expect(sessionRow(session.sessionId).consumed_at).toBeNull();
    });
    it('cannot write, rewrite or delete a receipt, a session or a digest directly', () => {
      const session = open();
      const rows = JSON.parse(as({ role: 'postgres' }, `select coalesce(jsonb_agg(id), '[]')::text from public.capture_receipts where user_id = '${ALICE}'`)) as string[];
      expect(rows.length).toBeGreaterThan(0);
      const statements = [
        `insert into public.capture_receipts (id, user_id, session_id, observation_id, herb_id, observed_taxon_key, observed_taxon_rank, eligibility, rank_position, species_confidence, expires_at) values ('rcpt_${'a'.repeat(32)}', '${ALICE}', '${session.sessionId}', 'o', 'urtica-dioica', 'urtica dioica', 'species', 'exact', 'top', 'high', now() + interval '1 day')`,
        `update public.capture_receipts set herb_id = 'urtica-dioica' where id = '${rows[0]}'`,
        `delete from public.capture_receipts where id = '${rows[0]}'`,
        `insert into public.capture_sessions (user_id, nonce_digest, expires_at) values ('${ALICE}', '\\x00', now() + interval '1 day')`,
        `update public.capture_sessions set consumed_at = null where id = '${session.sessionId}'`,
        `delete from public.capture_image_digests`,
        `select * from public.capture_sessions`,
        `select * from public.capture_image_digests`,
      ];
      for (const who of [asAlice, { role: 'anon' } as Who]) {
        for (const sql of statements) {
          const r = attempt(who, sql);
          expect(r.ok, `${who.role}: ${sql}`).toBe(false);
        }
      }
    });
    it('can read only its OWN receipts, and anon can claim nothing', () => {
      expect(count(`select count(*) from public.capture_receipts`)).toBeGreaterThan(0);
      const mine = Number(as(asAlice, 'select count(*) from public.capture_receipts'));
      const bobs = Number(as(asBob, 'select count(*) from public.capture_receipts'));
      expect(mine).toBe(count(`select count(*) from public.capture_receipts where user_id = '${ALICE}'`));
      expect(bobs).toBe(count(`select count(*) from public.capture_receipts where user_id = '${BOB}'`));
      expect(Number(as(asBob, `select count(*) from public.capture_receipts where user_id = '${ALICE}'`))).toBe(0);
      const anon = attempt({ role: 'anon' }, `select public.claim_discovery('rcpt_${'a'.repeat(32)}')`);
      expect(anon.ok).toBe(false);
    });
    it('the switch stays OFF and cannot be set by a player', () => {
      const r = attempt(asAlice, 'select public.set_discovery_enforcement(true, null, null)');
      expect(r.ok).toBe(false);
      expect(as({ role: 'postgres' }, 'select enforce from public.discovery_enforcement')).toBe('f');
    });
  });
});
