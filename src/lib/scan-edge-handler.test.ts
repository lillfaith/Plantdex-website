import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import {
  ENV,
  TEST_SERVICE_VALUE,
  fakeImage,
  importEdge,
  inertBuilder,
  installFetch,
  invoke,
  loadHandler,
  provider,
  router,
  type AdminFake,
  type Reply,
} from './scan-edge-harness';

/*
 * THE REAL identify-plant HANDLER, run under vitest with a faked provider and a faked service-role
 * client. This is where "a request with no purpose is byte-identical to today's" is pinned: the
 * GOLDEN strings below were captured by running the handler as it stood BEFORE the capture work
 * (git `HEAD` of this branch's base) through this same harness, with a fixed observation id.
 *
 * What it does not prove: that the SQL does what the fake says. `scan-edge-receipts.local.test.ts`
 * runs this same handler against a real PostgreSQL carrying migration 0016.
 */
vi.mock('npm:@supabase/supabase-js@2', async () => (await import('./scan-edge-harness')).supabaseMock);

const OBS = '00000000-0000-4000-8000-000000000001';
const ALICE = '11111111-1111-4111-8111-111111111111';
const SESSION = '22222222-2222-4222-8222-222222222222';
const NONCE = 'ab'.repeat(32);

const CANDIDATES =
  '[{"scientificName":"Taraxacum officinale","commonNames":[],"score":0.81,"rank":"species","gbifId":"1","powoId":"1-1"},{"scientificName":"Bellis perennis","commonNames":[],"score":0.1,"rank":"species","gbifId":"1","powoId":"1-1"}]';
const tail = `"provider":"plantnet","observationId":"${OBS}"}`;
const GOLDEN = {
  anon: `{"candidates":${CANDIDATES},"remaining":2,"limit":5,"signedIn":false,${tail}`,
  signedIn: `{"candidates":${CANDIDATES},"remaining":7,"limit":10,"signedIn":true,${tail}`,
  empty: `{"candidates":[],"providerFoundNothing":true,${tail}`,
  providerDown:
    '{"error":"The identification service could not be reached. Please try again.","code":"provider","provider":"plantnet","providerStatus":502,"providerMessage":"PlantNet returned 502."}',
};

interface Calls {
  rpc: Array<[string, Record<string, unknown>]>;
  from: string[];
}
interface Script {
  consume?: (args: Record<string, unknown>) => Reply | Promise<Reply>;
  issue?: (args: Record<string, unknown>) => Reply | Promise<Reply>;
  sessions?: unknown[];
  receipts?: unknown[];
}

function fakeAdmin(script: Script = {}): { admin: AdminFake; calls: Calls } {
  const calls: Calls = { rpc: [], from: [] };
  const admin: AdminFake = {
    async rpc(name, args) {
      calls.rpc.push([name, args]);
      if (name === 'claim_scan_pair') return { data: 3, error: null };
      if (name === 'consume_capture_session') return (script.consume ?? (() => ({ data: { ok: true, replay: false }, error: null })))(args);
      if (name === 'issue_capture_receipts') {
        return (script.issue ?? ((a) => ({
          data: (a.p_items as Array<Record<string, string>>).map((it, i) => ({ id: `rcpt_${String(i).padStart(32, '0')}`, herb_id: it.herb_id, rank_position: it.rank_position })),
          error: null,
        })))(args);
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    },
    from(table) {
      calls.from.push(table);
      const rows = table === 'capture_sessions' ? script.sessions : table === 'capture_receipts' ? script.receipts : undefined;
      if (rows === undefined) return inertBuilder();
      return { select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: rows, error: null }) }) }) };
    },
  };
  return { admin, calls };
}

const collect = { purpose: 'collect', capture_session_id: SESSION, capture_nonce: NONCE };

/*
 * A REFUSED CAPTURE, ASSERTED ONLY BY WHAT HOLDS UNDER BOTH HANDLERS.
 *
 * Until 2026-11-27 a collect request whose capture was refused was served as an education lookup: HTTP 200 with the identification, a
 * provider call and a spent allowance, plus `capture: {accepted: false, code}`. The owner then directed that invalid collect requests
 * fail BEFORE the allowance claim and the provider (see docs/release/v1-refused-attempts-allowance.md). Contract first, feature second:
 * this contract PR lets these tests pass under either answer, and the feature PR (scan lane) pins the new one strictly in
 * `scan-edge-refuse.test.ts`. What must hold under both: the capture is reported honestly with its code, no receipt is issued, the
 * provider is called at most once, and a 200 still carries the identification.
 */
/** The same RPCs were made, whichever of the claim and the capture came first; the session is always consumed before receipts are issued. */
function expectCalls(calls: Calls, names: string[]): void {
  const seen = calls.rpc.map(([n]) => n);
  expect([...seen].sort()).toEqual([...names].sort());
  if (seen.includes('consume_capture_session') && seen.includes('issue_capture_receipts')) {
    expect(seen.indexOf('consume_capture_session')).toBeLessThan(seen.indexOf('issue_capture_receipts'));
  }
}
const rpcArgs = (calls: Calls, name: string): Record<string, unknown> => calls.rpc.find(([n]) => n === name)![1];

function expectRefusedCapture(out: { status: number; body: Record<string, unknown> }, code: string, calls?: Calls): void {
  expect([200, 409]).toContain(out.status);
  expect(out.body.capture).toEqual({ accepted: false, code });
  expect(provider.calls).toBeLessThanOrEqual(1);
  if (out.status === 200) expect(JSON.stringify(out.body.candidates)).toBe(CANDIDATES);
  else expect(out.body.candidates).toBeUndefined();
  if (calls) expect(calls.rpc.map(([n]) => n)).not.toContain('issue_capture_receipts');
}

let handler: Awaited<ReturnType<typeof loadHandler>>;
let restoreFetch: () => void;

beforeAll(async () => {
  void ENV;
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(OBS);
  restoreFetch = installFetch();
  handler = await loadHandler(() => importEdge('index'));
});
afterAll(() => restoreFetch());
beforeEach(() => {
  router.tokens = { 'Bearer tok-alice': ALICE };
  router.callerCalls = [];
  provider.calls = 0;
  provider.plan = {
    mode: 'ok',
    names: [
      { name: 'Taraxacum officinale', score: 0.81 },
      { name: 'Bellis perennis', score: 0.1 },
    ],
  };
});

/**
 * A provider-side failure may now carry TWO additive, honest fields (owner direction 2026-11-26): `capture` ({accepted, retryable}) when the
 * capture session was really handed back, and `allowance` ('refunded' | 'not_refunded') for what the backend confirmed about the caller's own
 * daily unit. The rest of the body must still be byte-for-byte what it always was, and no other failure may gain either field. This compares
 * everything else exactly, so the golden still pins the old contract while allowing only those two fields and only with their known values.
 */
function expectProviderDownBody(text: string): void {
  const body = JSON.parse(text) as Record<string, unknown>;
  const { allowance, capture, ...rest } = body;
  expect([undefined, 'refunded', 'not_refunded']).toContain(allowance);
  expect([undefined, JSON.stringify({ accepted: true, retryable: true })]).toContain(capture === undefined ? undefined : JSON.stringify(capture));
  expect(rest).toEqual(JSON.parse(GOLDEN.providerDown));
}

describe('a request with no capture purpose is byte-identical to the pre-capture handler', () => {
  it('anonymous, no extra fields', async () => {
    const { admin, calls } = fakeAdmin();
    router.admin = admin;
    expect((await invoke(handler)).text).toBe(GOLDEN.anon);
    expect(calls.rpc.map(([n]) => n)).toEqual(['claim_scan_pair']);
  });

  it('signed in, no extra fields', async () => {
    const { admin, calls } = fakeAdmin();
    router.admin = admin;
    expect((await invoke(handler, { token: 'tok-alice' })).text).toBe(GOLDEN.signedIn);
    expect(calls.rpc.map(([n]) => n)).toEqual(['claim_scan_pair']);
  });

  it('purpose=lookup with a session attached is a lookup: same bytes, no capture call, no receipt', async () => {
    const { admin, calls } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: { ...collect, purpose: 'lookup' } });
    expect(out.text).toBe(GOLDEN.signedIn);
    expect(calls.rpc.map(([n]) => n)).toEqual(['claim_scan_pair']);
  });

  it('session fields WITHOUT a purpose are ignored too (absent means lookup)', async () => {
    const { admin, calls } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: { capture_session_id: SESSION, capture_nonce: NONCE } });
    expect(out.text).toBe(GOLDEN.signedIn);
    expect(calls.rpc.map(([n]) => n)).toEqual(['claim_scan_pair']);
  });

  it('provider found nothing, and provider down, are unchanged', async () => {
    const { admin } = fakeAdmin();
    router.admin = admin;
    provider.plan = { mode: 'ok', names: [] };
    expect((await invoke(handler, { token: 'tok-alice' })).text).toBe(GOLDEN.empty);
    provider.plan = { mode: 'fail', names: [] };
    const down = await invoke(handler, { token: 'tok-alice' });
    expect(down.status).toBe(502);
    expectProviderDownBody(down.text);
  });
});

describe('purpose=collect', () => {
  it('consumes the session with the SHA-256 of each image, calls the provider once, then issues receipts', async () => {
    const { admin, calls } = fakeAdmin({ receipts: [{ id: 'rcpt_00000000000000000000000000000000', herb_id: 'taraxacum-officinale', rank_position: 'top', expires_at: '2030-01-01T00:00:00+00:00' }] });
    router.admin = admin;
    const images = [fakeImage('one'), fakeImage('two')];
    const out = await invoke(handler, { token: 'tok-alice', images, fields: collect });
    expect(out.status).toBe(200);
    expect(provider.calls).toBe(1);
    expectCalls(calls, ['claim_scan_pair', 'consume_capture_session', 'issue_capture_receipts']);

    const consume = rpcArgs(calls, 'consume_capture_session');
    const sha = async (f: File) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await f.arrayBuffer()))].map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(consume).toEqual({
      p_user: ALICE,
      p_session: SESSION,
      p_nonce: NONCE,
      p_observation_id: OBS,
      p_image_digests: [await sha(images[0]!), await sha(images[1]!)],
    });

    const issue = rpcArgs(calls, 'issue_capture_receipts');
    expect(issue.p_user).toBe(ALICE);
    expect(issue.p_session).toBe(SESSION);
    expect(issue.p_items).toEqual([
      { herb_id: 'taraxacum-officinale', observed_taxon_key: 'taraxacum officinale', observed_taxon_rank: 'species', eligibility: 'exact', rank_position: 'top', species_confidence: 'high' },
    ]);

    const body = out.body as { candidates: Array<Record<string, unknown>>; capture: unknown };
    expect(body.capture).toEqual({ accepted: true });
    expect(body.candidates[0]!.captureReceipt).toEqual({ id: 'rcpt_00000000000000000000000000000000', rankPosition: 'top', expiresAt: '2030-01-01T00:00:00+00:00' });
    // Bellis perennis has no card: it earns no receipt (it is a Seed Shelf case).
    expect(body.candidates[1]!.captureReceipt).toBeUndefined();
    // The caller's own client is never used for a capture call.
    expect(router.callerCalls).toEqual([]);
    expect(out.text).not.toContain(TEST_SERVICE_VALUE);
  });

  it('the receipt names the card from the SERVER match, never a client field', async () => {
    const { admin, calls } = fakeAdmin();
    router.admin = admin;
    await invoke(handler, { token: 'tok-alice', fields: { ...collect, herb_id: 'urtica-dioica', card: 'urtica-dioica', receipt_herb: 'urtica-dioica' } });
    const items = calls.rpc.find(([n]) => n === 'issue_capture_receipts')![1].p_items as Array<{ herb_id: string }>;
    expect(items.map((i) => i.herb_id)).toEqual(['taraxacum-officinale']);
  });

  it('a listed (non-leading) card candidate gets a receipt marked listed', async () => {
    const { admin, calls } = fakeAdmin();
    router.admin = admin;
    provider.plan = { mode: 'ok', names: [{ name: 'Bellis perennis', score: 0.5 }, { name: 'Plantago major', score: 0.3 }] };
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    const items = calls.rpc.find(([n]) => n === 'issue_capture_receipts')![1].p_items as Array<{ herb_id: string; rank_position: string }>;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ herb_id: 'plantago-major', rank_position: 'listed' });
    expect((out.body.candidates as Array<{ captureReceipt?: { rankPosition: string } }>)[1]!.captureReceipt?.rankPosition).toBe('listed');
  });

  it.each([
    ['capture_session_unknown'],
    ['capture_session_nonce'],
    ['capture_session_expired'],
    ['capture_session_used'],
    ['capture_too_fast'],
    ['capture_images_invalid'],
    ['capture_images_invalid'],
  ])('a refused consume (%s) reports its code and issues no receipt', async (code) => {
    const { admin, calls } = fakeAdmin({ consume: () => ({ data: { ok: false, code }, error: null }) });
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expectRefusedCapture(out, code, calls);
  });

  it('a consume that throws or that the database does not have is capture_unavailable, with no receipt', async () => {
    for (const consume of [
      () => { throw new Error('boom'); },
      () => ({ data: null, error: { message: 'function not found', code: 'PGRST202' } }),
      () => ({ data: 'garbage', error: null }),
    ]) {
      const { admin } = fakeAdmin({ consume });
      router.admin = admin;
      provider.calls = 0;
      const out = await invoke(handler, { token: 'tok-alice', fields: collect });
      expectRefusedCapture(out, 'capture_unavailable');
    }
  });

  it('an issue that throws leaves the identification intact', async () => {
    const { admin } = fakeAdmin({ issue: () => { throw new Error('boom'); } });
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.status).toBe(200);
    expect(out.body.capture).toEqual({ accepted: false, code: 'capture_unavailable' });
    expect(JSON.stringify(out.body.candidates)).toBe(CANDIDATES);
  });

  it('an anonymous collect reports capture_not_signed_in and touches no capture call', async () => {
    const { admin, calls } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { fields: collect });
    expectRefusedCapture(out, 'capture_not_signed_in');
    expect(calls.rpc.map(([n]) => n).filter((n) => n !== 'claim_scan_pair')).toEqual([]);
  });

  it('collect without a session is capture_purpose_missing; a malformed one is capture_session_unknown', async () => {
    const { admin, calls } = fakeAdmin();
    router.admin = admin;
    const missing = await invoke(handler, { token: 'tok-alice', fields: { purpose: 'collect' } });
    expect([200, 409]).toContain(missing.status);
    expect(missing.body.capture).toEqual({ accepted: false, code: 'capture_purpose_missing' });
    const bad = await invoke(handler, { token: 'tok-alice', fields: { ...collect, capture_session_id: 'not-a-uuid' } });
    expect([200, 409]).toContain(bad.status);
    expect(bad.body.capture).toEqual({ accepted: false, code: 'capture_session_unknown' });
    expect(calls.rpc.map(([n]) => n).filter((n) => n.includes('capture'))).toEqual([]);
  });

  it('accepted capture with nothing that maps to a card says no_eligible_candidate', async () => {
    const { admin } = fakeAdmin();
    router.admin = admin;
    provider.plan = { mode: 'ok', names: [{ name: 'Bellis perennis', score: 0.9 }] };
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.body.capture).toEqual({ accepted: true, code: 'no_eligible_candidate' });
  });

  it('the provider finding nothing after a consume reports the capture honestly, with no receipt', async () => {
    const { admin } = fakeAdmin();
    router.admin = admin;
    provider.plan = { mode: 'ok', names: [] };
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.body).toMatchObject({ candidates: [], providerFoundNothing: true, capture: { accepted: true, code: 'no_eligible_candidate' } });
  });

  it('a provider outage is the same error as before, and issues nothing', async () => {
    const { admin, calls } = fakeAdmin();
    router.admin = admin;
    provider.plan = { mode: 'fail', names: [] };
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.status).toBe(502);
    expectProviderDownBody(out.text);
    expect(calls.rpc.map(([n]) => n)).not.toContain('issue_capture_receipts');
  });

  it('a replay (identical request after a lost response) calls no provider and spends no quota', async () => {
    const { admin, calls } = fakeAdmin({
      sessions: [{ id: SESSION, consumed_at: '2030-01-01T00:00:00Z' }],
      consume: () => ({ data: { ok: true, replay: true, session_id: SESSION, observation_id: OBS }, error: null }),
      receipts: [{ id: 'rcpt_00000000000000000000000000000000', herb_id: 'taraxacum-officinale', rank_position: 'top', expires_at: 'x' }],
    });
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.status).toBe(200);
    expect(provider.calls).toBe(0);
    expect(calls.rpc.map(([n]) => n)).toEqual(['consume_capture_session']);
    expect(out.body).toEqual({
      candidates: [],
      capture: { accepted: true, replay: true, receipts: [{ id: 'rcpt_00000000000000000000000000000000', herbId: 'taraxacum-officinale', rankPosition: 'top' }], minCaptureMs: 0 },
      signedIn: true,
    });
  });

  it('a consumed session presented with DIFFERENT images is not a replay', async () => {
    const { admin, calls } = fakeAdmin({
      sessions: [{ id: SESSION, consumed_at: '2030-01-01T00:00:00Z' }],
      consume: () => ({ data: { ok: false, code: 'capture_session_used' }, error: null }),
    });
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expectRefusedCapture(out, 'capture_session_used');
    expect(calls.rpc.filter(([n]) => n === 'claim_scan_pair').length).toBeLessThanOrEqual(1);
  });

  it('a replay with nothing to return is never an empty success: it is reported as capture_session_used', async () => {
    const { admin } = fakeAdmin({
      sessions: [{ id: SESSION, consumed_at: '2030-01-01T00:00:00Z' }],
      consume: () => ({ data: { ok: true, replay: true }, error: null }),
      receipts: [],
    });
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expectRefusedCapture(out, 'capture_session_used');
  });

  it('EXACTLY ONE in-app camera photo completes the capture and earns a receipt (owner decision 2026-11-26)', async () => {
    const { admin, calls } = fakeAdmin({ receipts: [{ id: 'rcpt_00000000000000000000000000000000', herb_id: 'taraxacum-officinale', rank_position: 'top', expires_at: '2030-01-01T00:00:00+00:00' }] });
    router.admin = admin;
    const image = fakeImage('solo');
    const out = await invoke(handler, { token: 'tok-alice', images: [image], fields: collect });
    expect(out.status).toBe(200);
    expect(provider.calls).toBe(1);
    expectCalls(calls, ['claim_scan_pair', 'consume_capture_session', 'issue_capture_receipts']);
    const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await image.arrayBuffer()))].map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(rpcArgs(calls, 'consume_capture_session').p_image_digests).toEqual([sha]);
    const body = out.body as { candidates: Array<Record<string, unknown>>; capture: unknown };
    expect(body.capture).toEqual({ accepted: true });
    expect(body.candidates[0]!.captureReceipt).toEqual({ id: 'rcpt_00000000000000000000000000000000', rankPosition: 'top', expiresAt: '2030-01-01T00:00:00+00:00' });
  });

  it('three images are still accepted and a FOURTH is refused (the contract maximum)', async () => {
    const ok = fakeAdmin();
    router.admin = ok.admin;
    const three = await invoke(handler, { token: 'tok-alice', images: [fakeImage('a'), fakeImage('b'), fakeImage('c')], fields: collect });
    expect(three.status).toBe(200);
    const bad = fakeAdmin();
    router.admin = bad.admin;
    const four = await invoke(handler, { token: 'tok-alice', images: [fakeImage('a'), fakeImage('b'), fakeImage('c'), fakeImage('d')], fields: collect });
    expect(four.status).toBe(400);
    expect(bad.calls.rpc.map(([n]) => n)).not.toContain('consume_capture_session');
  });

  it('NO images is a 400 before any capture call (holds for the collect floor of 1 and the old floor of 2)', async () => {
    const { admin, calls } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', images: [], fields: collect });
    expect(out.status).toBe(400);
    expect(out.body.code).toBe('tooFewImages');
    expect(calls.rpc.map(([n]) => n).filter((n) => n !== 'claim_scan_pair')).toEqual([]);
  });

  it('a NON-collect request of one image is still the old 400 (education lookups keep the two-photo floor)', async () => {
    const { admin, calls } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', images: [fakeImage('solo')] });
    expect(out.status).toBe(400);
    expect(out.body.code).toBe('tooFewImages');
    expect(calls.rpc.map(([n]) => n).filter((n) => n !== 'claim_scan_pair')).toEqual([]);
  });
});
