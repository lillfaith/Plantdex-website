import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  CAPTURE_CODES as EDGE_CODES,
  RECEIPT_ELIGIBILITIES as EDGE_ELIGIBILITIES,
  beginCapture,
  finishCapture,
  parseCaptureIntent,
  receiptItems,
  sha256Hex,
  withReceipts,
  type CaptureCandidate,
  type CaptureDeps,
  type ReceiptRow,
} from '../../supabase/functions/identify-plant/capture';
import { CAPTURE_CODES, RECEIPT_ELIGIBILITIES, receiptItemsFor } from './observation-capture-receipt';
import { matchScientificName, speciesConfidenceFor } from './plant-match';

/**
 * THE EDGE HALF OF THE DISCOVERY RECEIPT CONTRACT (identify-plant, S6).
 *
 * Two layers. The pure module (`capture.ts`, no imports) is tested directly. The real handler
 * (`index.ts`) is then driven end to end with a faked Supabase client and a stubbed provider, which is
 * the only honest way to pin "a request with no purpose is unchanged": a source regex cannot see a
 * response.
 */

const ROOT = join(__dirname, '..', '..');
const FN = join(ROOT, 'supabase', 'functions', 'identify-plant');
const read = (name: string) => readFileSync(join(FN, name), 'utf8');

const USER = '00000000-0000-0000-0000-0000000000a1';
const SESSION = '11111111-1111-4111-8111-111111111111';
const NONCE = 'ab'.repeat(32);
const DIGESTS = ['a'.repeat(64), 'b'.repeat(64)];

// ─── Pure module ────────────────────────────────────────────────────────────

describe('the edge capture module agrees with the client contract mirror', () => {
  it('speaks exactly the contract codes, and the same five eligibilities', () => {
    expect([...EDGE_CODES]).toEqual([...CAPTURE_CODES]);
    expect([...EDGE_ELIGIBILITIES]).toEqual([...RECEIPT_ELIGIBILITIES]);
  });

  it('issues receipts for exactly the candidates receiptItemsFor does, over real matches', () => {
    const names = [
      'Taraxacum officinale',
      'Taraxacum sect. Taraxacum',
      'Solidago altissima', // legacyGenus: never
      'Solidago canadensis',
      'Oxalis stricta',
      'Oxalis dillenii',
      'Mentha x piperita',
      'Quercus alba',
      'Capsella rubella', // no card
      'Plantago major',
      'Plantago lanceolata',
      'Not a plant',
    ];
    const candidates: CaptureCandidate[] = names.map((n, i) => {
      const match = matchScientificName(n);
      return {
        match,
        rankPosition: i === 0 ? 'top' : 'listed',
        speciesConfidence: match.observedTaxon ? speciesConfidenceFor(match.observedTaxon.rank, 0.5) : 'unresolved',
      };
    });
    const edge = receiptItems(candidates).map((e) => e.item);
    const client = receiptItemsFor(candidates as unknown as Parameters<typeof receiptItemsFor>[0]);
    expect(edge).toEqual(client);
    expect(edge.length).toBeGreaterThan(2);
    expect(edge.some((i) => i.eligibility === ('legacyGenus' as string))).toBe(false);
  });

  it('never issues for legacyGenus, ambiguous, related, none or an unconfirmable match', () => {
    const base = { confirmable: true, herbId: 'x', observedTaxon: { key: 'k', rank: 'species' } };
    for (const eligibility of ['legacyGenus', 'ambiguous', 'related', 'sameGenus', 'none']) {
      expect(receiptItems([{ match: { ...base, eligibility }, rankPosition: 'top', speciesConfidence: 'high' }])).toEqual([]);
    }
    expect(
      receiptItems([{ match: { ...base, eligibility: 'exact', confirmable: false }, rankPosition: 'top', speciesConfidence: 'high' }]),
    ).toEqual([]);
  });

  it('records one receipt per card and keeps the first (leading) candidate for it', () => {
    const m = { confirmable: true, herbId: 'h', eligibility: 'exact', observedTaxon: { key: 'k', rank: 'species' } };
    const out = receiptItems([
      { match: m, rankPosition: 'top', speciesConfidence: 'high' },
      { match: m, rankPosition: 'listed', speciesConfidence: 'low' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.index).toBe(0);
    expect(out[0]!.item.rank_position).toBe('top');
  });
});

describe('parseCaptureIntent', () => {
  const form = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });

  it('no purpose, or lookup, is NO capture whatever else was sent', () => {
    expect(parseCaptureIntent(form({}))).toEqual({ mode: 'none' });
    expect(parseCaptureIntent(form({ purpose: 'lookup' }))).toEqual({ mode: 'none' });
    expect(
      parseCaptureIntent(form({ capture_session_id: SESSION, capture_nonce: NONCE })),
    ).toEqual({ mode: 'none' });
    expect(parseCaptureIntent(form({ purpose: 'COLLECT' }))).toEqual({ mode: 'none' });
  });

  it('collect carries a well-formed session and nonce, and drops malformed ones to null', () => {
    expect(
      parseCaptureIntent(form({ purpose: 'collect', capture_session_id: SESSION, capture_nonce: NONCE })),
    ).toEqual({ mode: 'collect', sessionId: SESSION, nonce: NONCE });
    expect(parseCaptureIntent(form({ purpose: 'collect' }))).toEqual({ mode: 'collect', sessionId: null, nonce: null });
    expect(
      parseCaptureIntent(form({ purpose: 'collect', capture_session_id: "x'; drop table", capture_nonce: 'zz' })),
    ).toEqual({ mode: 'collect', sessionId: null, nonce: null });
  });
});

describe('sha256Hex', () => {
  it('is the standard digest of the bytes and reads nothing else', async () => {
    const bytes = new TextEncoder().encode('abc');
    expect(await sha256Hex(bytes.buffer as ArrayBuffer)).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

function fakeDeps(over: Partial<CaptureDeps> & { consume?: unknown; issue?: unknown } = {}) {
  const calls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const deps: CaptureDeps = {
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      if (fn === 'consume_capture_session') return { data: over.consume ?? { ok: true, replay: false }, error: null };
      if (fn === 'issue_capture_receipts') return { data: over.issue ?? [], error: null };
      return { data: null, error: { message: 'unexpected' } };
    },
    receiptsFor: over.receiptsFor ?? (async () => []),
  };
  return { deps, calls };
}

const collect = { mode: 'collect' as const, sessionId: SESSION, nonce: NONCE };

describe('beginCapture', () => {
  it('is a no-op for mode none: no RPC at all', async () => {
    const { deps, calls } = fakeDeps();
    expect(await beginCapture(deps, { userId: USER, intent: { mode: 'none' }, digests: DIGESTS, observationId: 'o' })).toEqual({
      kind: 'none',
    });
    expect(calls).toEqual([]);
  });

  it('anonymous: capture_not_signed_in, no RPC', async () => {
    const { deps, calls } = fakeDeps();
    expect(await beginCapture(deps, { userId: null, intent: collect, digests: DIGESTS, observationId: 'o' })).toEqual({
      kind: 'refused',
      code: 'capture_not_signed_in',
    });
    expect(calls).toEqual([]);
  });

  it('collect without session fields: capture_purpose_missing, no RPC', async () => {
    const { deps, calls } = fakeDeps();
    const r = await beginCapture(deps, {
      userId: USER,
      intent: { mode: 'collect', sessionId: null, nonce: null },
      digests: DIGESTS,
      observationId: 'o',
    });
    expect(r).toEqual({ kind: 'refused', code: 'capture_purpose_missing' });
    expect(calls).toEqual([]);
  });

  it('passes the account, session, nonce, observation and ordered digests to the database', async () => {
    const { deps, calls } = fakeDeps();
    const r = await beginCapture(deps, { userId: USER, intent: collect, digests: DIGESTS, observationId: 'obs-1' });
    expect(r).toEqual({ kind: 'accepted', sessionId: SESSION });
    expect(calls).toEqual([
      {
        fn: 'consume_capture_session',
        args: { p_user: USER, p_session: SESSION, p_nonce: NONCE, p_observation_id: 'obs-1', p_image_digests: DIGESTS },
      },
    ]);
  });

  it.each([
    'capture_session_unknown',
    'capture_session_nonce',
    'capture_session_expired',
    'capture_session_used',
    'capture_too_fast',
    'capture_images_invalid',
    'capture_duplicate_image',
  ])('relays %s as a refusal, never an error', async (code) => {
    const { deps } = fakeDeps({ consume: { ok: false, code } });
    expect(await beginCapture(deps, { userId: USER, intent: collect, digests: DIGESTS, observationId: 'o' })).toEqual({
      kind: 'refused',
      code,
    });
  });

  it('an unknown code, a database error, a throw, or a missing function all become capture_unavailable', async () => {
    const unavailable = { kind: 'refused', code: 'capture_unavailable' };
    const run = (deps: CaptureDeps) => beginCapture(deps, { userId: USER, intent: collect, digests: DIGESTS, observationId: 'o' });
    expect(await run(fakeDeps({ consume: { ok: false, code: 'made_up' } }).deps)).toEqual(unavailable);
    expect(await run({ rpc: async () => ({ data: null, error: { message: 'PGRST202' } }), receiptsFor: async () => [] })).toEqual(unavailable);
    expect(
      await run({
        rpc: () => {
          throw new Error('boom');
        },
        receiptsFor: async () => [],
      }),
    ).toEqual(unavailable);
    expect(await run(fakeDeps({ consume: 'garbage' }).deps)).toEqual(unavailable);
  });

  it('a replay returns the receipts already recorded for that observation', async () => {
    const rows: ReceiptRow[] = [{ id: 'rcpt_' + 'c'.repeat(32), herbId: 'h', rankPosition: 'top', expiresAt: '2027-01-01T00:00:00Z' }];
    const asked: unknown[] = [];
    const { deps } = fakeDeps({
      consume: { ok: true, replay: true, session_id: SESSION, observation_id: 'obs-0' },
      receiptsFor: async (u, o) => {
        asked.push([u, o]);
        return rows;
      },
    });
    expect(await beginCapture(deps, { userId: USER, intent: collect, digests: DIGESTS, observationId: 'obs-new' })).toEqual({
      kind: 'replay',
      observationId: 'obs-0',
      receipts: rows,
    });
    expect(asked).toEqual([[USER, 'obs-0']]);
  });
});

describe('finishCapture', () => {
  const eligible: CaptureCandidate = {
    match: { confirmable: true, herbId: 'taraxacum-officinale', eligibility: 'exact', observedTaxon: { key: 'taraxacum officinale', rank: 'species' } },
    rankPosition: 'top',
    speciesConfidence: 'high',
  };
  const rid = 'rcpt_' + 'd'.repeat(32);

  it('nothing eligible: no RPC, an accepted capture with no_eligible_candidate', async () => {
    const { deps, calls } = fakeDeps();
    const out = await finishCapture(deps, { userId: USER, sessionId: SESSION, observationId: 'o', candidates: [] });
    expect(out).toEqual({ receipts: [], code: 'no_eligible_candidate' });
    expect(calls).toEqual([]);
  });

  it('issues one receipt per eligible candidate and reports the stored expiry', async () => {
    const { deps, calls } = fakeDeps({
      issue: [{ id: rid, herb_id: 'taraxacum-officinale', rank_position: 'top' }],
      receiptsFor: async () => [{ id: rid, herbId: 'taraxacum-officinale', rankPosition: 'top', expiresAt: '2026-12-26T00:00:00Z' }],
    });
    const out = await finishCapture(deps, { userId: USER, sessionId: SESSION, observationId: 'o', candidates: [eligible] });
    expect(out).toEqual({ receipts: [{ index: 0, id: rid, rankPosition: 'top', expiresAt: '2026-12-26T00:00:00Z' }] });
    expect(calls[0]).toEqual({
      fn: 'issue_capture_receipts',
      args: {
        p_user: USER,
        p_session: SESSION,
        p_items: [
          {
            herb_id: 'taraxacum-officinale',
            observed_taxon_key: 'taraxacum officinale',
            observed_taxon_rank: 'species',
            eligibility: 'exact',
            rank_position: 'top',
            species_confidence: 'high',
          },
        ],
      },
    });
  });

  it('a failing database or a throw is a code, never an exception', async () => {
    const args = { userId: USER, sessionId: SESSION, observationId: 'o', candidates: [eligible] };
    expect(await finishCapture({ rpc: async () => ({ data: null, error: { message: 'x' } }), receiptsFor: async () => [] }, args)).toEqual({
      receipts: [],
      code: 'capture_unavailable',
    });
    expect(
      await finishCapture(
        {
          rpc: () => {
            throw new Error('boom');
          },
          receiptsFor: async () => [],
        },
        args,
      ),
    ).toEqual({ receipts: [], code: 'capture_unavailable' });
    // issued, but the expiry cannot be read back: the receipt is withheld rather than invented
    const { deps } = fakeDeps({ issue: [{ id: rid, herb_id: 'taraxacum-officinale', rank_position: 'top' }] });
    expect(await finishCapture(deps, args)).toEqual({ receipts: [], code: 'capture_unavailable' });
  });
});

describe('withReceipts', () => {
  it('adds captureReceipt to the receipted rows only and leaves the others the same objects', () => {
    const a = { scientificName: 'A' };
    const b = { scientificName: 'B' };
    const out = withReceipts([a, b], [{ index: 1, id: 'rcpt_x', rankPosition: 'listed', expiresAt: 'T' }]);
    expect(out[0]).toBe(a);
    expect(out[1]).toEqual({ scientificName: 'B', captureReceipt: { id: 'rcpt_x', rankPosition: 'listed', expiresAt: 'T' } });
  });
});

// ─── The real handler, with a faked Supabase and a stubbed provider ─────────

type Call = { fn: string; args: Record<string, unknown> };

const world = vi.hoisted(() => ({
  calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  tables: [] as string[],
  rpcAnswers: {} as Record<string, unknown>,
  receipts: [] as Array<Record<string, unknown>>,
  userFor: (auth: string | null): string | null => (auth === 'Bearer user' ? '00000000-0000-0000-0000-0000000000a1' : null),
}));

vi.mock('npm:@supabase/supabase-js@2', () => ({
  createClient: (_url: string, key: string, opts?: { global?: { headers?: Record<string, string> } }) => {
    if (key === 'anon-key') {
      return {
        auth: {
          getUser: async () => {
            const id = world.userFor(opts?.global?.headers?.Authorization ?? null);
            return { data: { user: id ? { id } : null } };
          },
        },
      };
    }
    const chain = (rows: unknown) => {
      const c: Record<string, unknown> = {
        select: () => c,
        eq: () => c,
        lt: () => c,
        delete: () => c,
        then: (ok: (v: unknown) => unknown) => ok({ data: rows, error: null }),
      };
      return c;
    };
    return {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        world.calls.push({ fn, args });
        if (fn === 'claim_scan_pair') return { data: 1, error: null };
        const a = world.rpcAnswers[fn];
        if (a instanceof Error) throw a;
        return a === undefined ? { data: null, error: { message: 'function not found' } } : a;
      },
      from: (table: string) => {
        world.tables.push(table);
        return chain(table === 'capture_receipts' ? world.receipts : []);
      },
    };
  },
}));

const PLANTNET = {
  results: [
    { score: 0.82, species: { scientificNameWithoutAuthor: 'Taraxacum officinale', commonNames: ['Dandelion'] }, gbif: { id: 1 }, powo: { id: '1-1' } },
    { score: 0.12, species: { scientificNameWithoutAuthor: 'Capsella rubella', commonNames: [] } },
    { score: 0.05, species: { scientificNameWithoutAuthor: 'Plantago major', commonNames: [] } },
  ],
};

function request(fields: Record<string, string>, opts: { auth?: string | null; names?: string[] } = {}): Request {
  const form = new FormData();
  (opts.names ?? ['one', 'two']).forEach((n, i) => {
    form.append('image', new File([new TextEncoder().encode(`photo-${n}`)], `${i}.jpg`, { type: 'image/jpeg' }));
    form.append('organ', 'leaf');
  });
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const headers: Record<string, string> = {};
  if (opts.auth !== null) headers.Authorization = opts.auth ?? 'Bearer user';
  return new Request('https://fn.test/identify-plant', { method: 'POST', body: form, headers });
}

let handler: (req: Request) => Promise<Response>;

beforeAll(async () => {
  const env: Record<string, string> = {
    SUPABASE_URL: 'https://x.supabase.co',
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
  const path = join(FN, 'index.ts');
  await import(/* @vite-ignore */ path);
});

afterEach(() => {
  world.calls.length = 0;
  world.tables.length = 0;
  world.rpcAnswers = {};
  world.receipts = [];
  vi.restoreAllMocks();
});

function stubProvider(body: unknown = PLANTNET) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const capRpcs = () => world.calls.filter((c: Call) => c.fn !== 'claim_scan_pair').map((c: Call) => c.fn);
const NO_CAPTURE_KEYS = ['candidates', 'limit', 'observationId', 'provider', 'remaining', 'signedIn'];

describe('identify-plant, a request with no purpose is unchanged', () => {
  it('returns exactly today’s keys, no capture block, no receipt, and makes no capture call', async () => {
    const fetchMock = stubProvider();
    const res = await handler(request({}));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(NO_CAPTURE_KEYS);
    for (const c of body.candidates) expect(Object.keys(c)).not.toContain('captureReceipt');
    expect(capRpcs()).toEqual([]);
    expect(world.tables).not.toContain('capture_receipts');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('purpose=lookup, and session fields without collect, are byte-identical to no purpose', async () => {
    stubProvider();
    const plain = await (await handler(request({}))).json();
    const lookup = await (await handler(request({ purpose: 'lookup' }))).json();
    const strays = await (await handler(request({ capture_session_id: SESSION, capture_nonce: NONCE }))).json();
    const norm = (b: Record<string, unknown>) => JSON.stringify({ ...b, observationId: 'x' });
    expect(norm(lookup)).toBe(norm(plain));
    expect(norm(strays)).toBe(norm(plain));
    expect(capRpcs()).toEqual([]);
  });

  it('an anonymous no-purpose request is the same too', async () => {
    stubProvider();
    const body = await (await handler(request({}, { auth: null }))).json();
    expect(Object.keys(body).sort()).toEqual(NO_CAPTURE_KEYS);
    expect(body.signedIn).toBe(false);
  });
});

describe('identify-plant, purpose=collect', () => {
  const fields = { purpose: 'collect', capture_session_id: SESSION, capture_nonce: NONCE };
  const rid = 'rcpt_' + 'e'.repeat(32);

  it('consumes the session BEFORE the provider, issues receipts AFTER the matcher, and attaches them', async () => {
    const order: string[] = [];
    world.rpcAnswers.consume_capture_session = { data: { ok: true, replay: false }, error: null };
    world.rpcAnswers.issue_capture_receipts = { data: [{ id: rid, herb_id: 'taraxacum-officinale', rank_position: 'top' }], error: null };
    world.receipts = [{ id: rid, herb_id: 'taraxacum-officinale', rank_position: 'top', expires_at: '2026-12-26T00:00:00Z' }];
    vi.stubGlobal('fetch', vi.fn(async () => {
      order.push('provider');
      return new Response(JSON.stringify(PLANTNET), { status: 200 });
    }));
    const realRpc = world.calls.push.bind(world.calls);
    world.calls.push = ((c: Call) => {
      order.push(c.fn);
      return realRpc(c);
    }) as typeof world.calls.push;

    const body = await (await handler(request(fields))).json();
    world.calls.push = realRpc;

    expect(order.filter((o) => o !== 'claim_scan_pair')).toEqual(['consume_capture_session', 'provider', 'issue_capture_receipts']);
    expect(body.capture).toEqual({ accepted: true });
    const dandelion = body.candidates.find((c: { scientificName: string }) => c.scientificName === 'Taraxacum officinale');
    expect(dandelion.captureReceipt).toEqual({ id: rid, rankPosition: 'top', expiresAt: '2026-12-26T00:00:00Z' });
    expect(body.candidates.filter((c: Record<string, unknown>) => c.captureReceipt)).toHaveLength(1);

    const consume = world.calls.find((c: Call) => c.fn === 'consume_capture_session')!;
    expect(consume.args.p_user).toBe(USER);
    expect(consume.args.p_session).toBe(SESSION);
    expect(consume.args.p_nonce).toBe(NONCE);
    expect(consume.args.p_observation_id).toBe(body.observationId);
    const digests = consume.args.p_image_digests as string[];
    expect(digests).toHaveLength(2);
    for (const d of digests) expect(d).toMatch(/^[0-9a-f]{64}$/);
    expect(await sha256Hex(new TextEncoder().encode('photo-one').buffer as ArrayBuffer)).toBe(digests[0]);

    const issue = world.calls.find((c: Call) => c.fn === 'issue_capture_receipts')!;
    // Eligibility came from the server's own matcher: the two card species, the card-less one
    // (Capsella rubella) never appears, and the leading answer is `top` while the other is `listed`.
    expect(
      (issue.args.p_items as Array<{ herb_id: string; rank_position: string }>).map((i) => [i.herb_id, i.rank_position]),
    ).toEqual([
      ['taraxacum-officinale', 'top'],
      ['plantago-major', 'listed'],
    ]);
  });

  it.each(['capture_session_expired', 'capture_session_nonce', 'capture_session_used', 'capture_duplicate_image', 'capture_too_fast'])(
    '%s: the identification is still returned in full, with the code and no receipt',
    async (code) => {
      world.rpcAnswers.consume_capture_session = { data: { ok: false, code }, error: null };
      const fetchMock = stubProvider();
      const res = await handler(request(fields));
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(body.capture).toEqual({ accepted: false, code });
      expect(body.candidates.length).toBeGreaterThan(0);
      for (const c of body.candidates) expect(c.captureReceipt).toBeUndefined();
      expect(capRpcs()).toEqual(['consume_capture_session']);
    },
  );

  it('anonymous collect: identification works, capture_not_signed_in, no capture RPC', async () => {
    stubProvider();
    const body = await (await handler(request(fields, { auth: null }))).json();
    expect(body.capture).toEqual({ accepted: false, code: 'capture_not_signed_in' });
    expect(body.candidates.length).toBeGreaterThan(0);
    expect(capRpcs()).toEqual([]);
  });

  it('collect without a session: capture_purpose_missing and a normal identification', async () => {
    stubProvider();
    const body = await (await handler(request({ purpose: 'collect' }))).json();
    expect(body.capture).toEqual({ accepted: false, code: 'capture_purpose_missing' });
    expect(body.candidates.length).toBeGreaterThan(0);
    expect(capRpcs()).toEqual([]);
  });

  it('a deployment without 0016 (function not found) is capture_unavailable and never a failed scan', async () => {
    stubProvider();
    const res = await handler(request(fields)); // rpcAnswers is empty: consume_capture_session -> error
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.capture).toEqual({ accepted: false, code: 'capture_unavailable' });
    expect(body.candidates.length).toBeGreaterThan(0);
  });

  it('a throw while consuming is capture_unavailable', async () => {
    world.rpcAnswers.consume_capture_session = new Error('network');
    stubProvider();
    const res = await handler(request(fields));
    expect(res.status).toBe(200);
    expect((await res.json()).capture).toEqual({ accepted: false, code: 'capture_unavailable' });
  });

  it('a failure while issuing leaves the identification intact', async () => {
    world.rpcAnswers.consume_capture_session = { data: { ok: true, replay: false }, error: null };
    world.rpcAnswers.issue_capture_receipts = new Error('db down');
    stubProvider();
    const res = await handler(request(fields));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.capture).toEqual({ accepted: true, code: 'capture_unavailable' });
    for (const c of body.candidates) expect(c.captureReceipt).toBeUndefined();
  });

  it('no eligible candidate: accepted, no_eligible_candidate, no issue call', async () => {
    world.rpcAnswers.consume_capture_session = { data: { ok: true, replay: false }, error: null };
    stubProvider({ results: [{ score: 0.9, species: { scientificNameWithoutAuthor: 'Capsella rubella', commonNames: [] } }] });
    const body = await (await handler(request(fields))).json();
    expect(body.capture).toEqual({ accepted: true, code: 'no_eligible_candidate' });
    expect(capRpcs()).toEqual(['consume_capture_session']);
  });

  it('a replay does not call the provider and returns the receipts, no candidates', async () => {
    world.rpcAnswers.consume_capture_session = {
      data: { ok: true, replay: true, session_id: SESSION, observation_id: 'obs-first' },
      error: null,
    };
    world.receipts = [{ id: rid, herb_id: 'taraxacum-officinale', rank_position: 'top', expires_at: '2026-12-26T00:00:00Z' }];
    const fetchMock = stubProvider();
    const body = await (await handler(request(fields))).json();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(body.candidates).toEqual([]);
    expect(body.observationId).toBe('obs-first');
    expect(body.capture).toEqual({
      accepted: true,
      replay: true,
      receipts: [{ id: rid, herbId: 'taraxacum-officinale', rankPosition: 'top' }],
    });
    expect(capRpcs()).toEqual(['consume_capture_session']);
  });

  it('a provider failure is still a provider failure, annotated so the client knows nothing was issued', async () => {
    world.rpcAnswers.consume_capture_session = { data: { ok: true, replay: false }, error: null };
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const res = await handler(request(fields));
    expect(res.status).toBe(502);
    expect((await res.json()).capture).toEqual({ accepted: false, code: 'capture_unavailable' });
    expect(capRpcs()).toEqual(['consume_capture_session']);
  });
});

describe('identify-plant capture source rules', () => {
  const index = read('index.ts');
  const capture = read('capture.ts');
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('capture.ts has no imports, so the file the tests run is the file that deploys', () => {
    expect(strip(capture)).not.toMatch(/^\s*import\s/m);
  });

  it('reads no EXIF, coordinates or device identifiers anywhere in the function', () => {
    for (const src of [strip(index), strip(capture)]) {
      expect(src).not.toMatch(/exif|gps|latitude|longitude|geolocation|device[-_ ]?id|user-agent|fingerprint/i);
    }
  });

  it('uses the service role only through the one `admin` client, and never reads it into capture.ts', () => {
    expect(strip(capture)).not.toMatch(/SERVICE_ROLE|service_role|createClient|Deno\.env/);
    // Everything from the capture block onward may only use the `admin` handle, never the raw key.
    expect(index.slice(index.indexOf('CAPTURE RECEIPTS'))).not.toMatch(/SERVICE_ROLE_KEY|SUPABASE_ANON_KEY/);
  });

  it('the capture path runs only for purpose=collect and consume precedes the provider call', () => {
    const code = strip(index);
    expect(code).toMatch(/captureIntent\.mode === 'collect'/);
    expect(code.indexOf('beginCapture(')).toBeGreaterThan(0);
    expect(code.indexOf('beginCapture(')).toBeLessThan(code.indexOf('identifyWithPlantNet('));
    expect(code.indexOf('finishCapture(')).toBeGreaterThan(code.indexOf('identifyWithPlantNet('));
  });

  it('never trusts a client-supplied eligibility: receipts derive from matchScientificName', () => {
    const code = strip(index);
    expect(code).toMatch(/matchScientificName\(candidate\.scientificName\)/);
    expect(code).not.toMatch(/form\.get\('(eligibility|herb_id|herbId|receipt)/);
  });
});
