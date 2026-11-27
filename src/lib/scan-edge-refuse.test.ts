import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
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
 * INVALID REQUESTS FAIL BEFORE THE ALLOWANCE AND BEFORE THE PROVIDER (owner direction 2026-11-27).
 *
 * The REAL identify-plant handler, a fake provider and a fake service-role client that RECORDS EVERY CALL IN ORDER. Run 3 of the live
 * suite measured that refused capture attempts moved both quota counters, and reading the handler showed they then reached the provider.
 * This pins the new order: validate photographs -> admit the capture session -> claim the allowance -> provider.
 *
 * What this proves: ORDER and COUNTS of calls (quota claims, session consumes, releases, provider requests) for every kind of invalid
 * request, valid retries, a quota refusal after admission, and two simultaneous identical requests. What it does not: that the SQL
 * does its job; the local-database suite (`scan-edge-receipts.local.test.ts`) and the live run cover that.
 */
vi.mock('npm:@supabase/supabase-js@2', async () => (await import('./scan-edge-harness')).supabaseMock);

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '33333333-3333-4333-8333-333333333333';
const SESSION = '22222222-2222-4222-8222-222222222222';
const NONCE = 'cd'.repeat(32);
const collect = { purpose: 'collect', capture_session_id: SESSION, capture_nonce: NONCE };

type Call = [string, Record<string, unknown>];
interface Script {
  consume?: (n: number, args: Record<string, unknown>) => Reply;
  claim?: () => Reply;
  release?: 'ok' | 'throw';
}
function fakeAdmin(script: Script = {}) {
  const rpc: Call[] = [];
  let consumes = 0;
  const admin: AdminFake = {
    async rpc(name, args) {
      rpc.push([name, args]);
      if (name === 'claim_scan_pair') return (script.claim ?? (() => ({ data: 3, error: null })))();
      if (name === 'consume_capture_session') return (script.consume ?? (() => ({ data: { ok: true, replay: false }, error: null })))(consumes++, args);
      if (name === 'issue_capture_receipts') return { data: [{ id: 'rcpt_' + '0'.repeat(32), herb_id: 'taraxacum-officinale', rank_position: 'top' }], error: null };
      if (name === 'release_capture_session') {
        if (script.release === 'throw') throw new Error('boom');
        return { data: true, error: null };
      }
      if (name === 'refund_scan_claim') return { data: true, error: null };
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    },
    from() {
      return inertBuilder();
    },
  };
  return { admin, rpc };
}
const names = (rpc: Call[]) => rpc.map(([n]) => n);
const count = (rpc: Call[], n: string) => rpc.filter(([x]) => x === n).length;

let handler: Awaited<ReturnType<typeof loadHandler>>;
let restoreFetch: () => void;
beforeAll(async () => {
  restoreFetch = installFetch();
  handler = await loadHandler(() => importEdge('index'));
});
afterAll(() => restoreFetch());
beforeEach(() => {
  router.tokens = { 'Bearer tok-alice': ALICE, 'Bearer tok-bob': BOB };
  router.callerCalls = [];
  provider.calls = 0;
  provider.plan = { mode: 'ok', names: [{ name: 'Taraxacum officinale', score: 0.81 }] };
});

describe('a collect request whose capture cannot be accepted costs nothing and reaches no provider', () => {
  it.each([
    'capture_session_unknown',
    'capture_session_nonce',
    'capture_session_expired',
    'capture_session_used',
    'capture_too_fast',
    'capture_images_invalid',
  ])('%s: 409, no allowance claim, no provider, no receipt, no release, no refund', async (code) => {
    const { admin, rpc } = fakeAdmin({ consume: () => ({ data: { ok: false, code }, error: null }) });
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.status).toBe(409);
    expect(out.body).toMatchObject({ code: 'captureRefused', capture: { accepted: false, code }, signedIn: true });
    expect(out.body.candidates).toBeUndefined();
    expect(provider.calls).toBe(0);
    expect(names(rpc)).toEqual(['consume_capture_session']);
  });

  it('the capture store being unavailable is a refusal too, never a quiet lookup', async () => {
    for (const consume of [() => { throw new Error('boom'); }, () => ({ data: null, error: { message: 'x', code: 'PGRST202' } }), () => ({ data: 'garbage', error: null })]) {
      const { admin, rpc } = fakeAdmin({ consume });
      router.admin = admin;
      provider.calls = 0;
      const out = await invoke(handler, { token: 'tok-alice', fields: collect });
      expect(out.status).toBe(409);
      expect(out.body.capture).toEqual({ accepted: false, code: 'capture_unavailable' });
      expect(provider.calls).toBe(0);
      expect(count(rpc, 'claim_scan_pair')).toBe(0);
    }
  });

  it('a signed-out collect, and one with no session or a malformed session, never touch the database at all', async () => {
    for (const [token, fields, code] of [
      [undefined, collect, 'capture_not_signed_in'],
      ['tok-alice', { purpose: 'collect' }, 'capture_purpose_missing'],
      ['tok-alice', { ...collect, capture_session_id: 'not-a-uuid' }, 'capture_session_unknown'],
    ] as const) {
      const { admin, rpc } = fakeAdmin();
      router.admin = admin;
      provider.calls = 0;
      const out = await invoke(handler, { token, fields });
      expect(out.status).toBe(409);
      expect(out.body.capture).toEqual({ accepted: false, code });
      expect(provider.calls).toBe(0);
      expect(rpc).toEqual([]);
    }
  });

  it("another player's session is charged to NOBODY: the refusal is identical to an unknown session and leaks nothing", async () => {
    const { admin, rpc } = fakeAdmin({ consume: () => ({ data: { ok: false, code: 'capture_session_unknown' }, error: null }) });
    router.admin = admin;
    const foreign = await invoke(handler, { token: 'tok-bob', fields: collect });
    const unknown = await invoke(handler, { token: 'tok-bob', fields: { ...collect, capture_session_id: '44444444-4444-4444-8444-444444444444' } });
    expect(foreign.status).toBe(409);
    expect(foreign.body.error).toBe(unknown.body.error);
    expect(foreign.text).not.toContain(SESSION);
    expect(foreign.text).not.toContain(NONCE);
    expect(foreign.text).not.toContain(ALICE);
    expect(count(rpc, 'claim_scan_pair')).toBe(0);
    expect(provider.calls).toBe(0);
  });
});

describe('a valid capture is admitted first, then charged once, then identified', () => {
  it('order: consume -> allowance -> provider -> receipts; the allowance is the CALLER\'s own bucket', async () => {
    const { admin, rpc } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-bob', fields: collect });
    expect(out.status).toBe(200);
    expect(names(rpc)).toEqual(['consume_capture_session', 'claim_scan_pair', 'issue_capture_receipts']);
    expect(provider.calls).toBe(1);
    expect(rpc[1]![1].p_bucket).toBe(`user:${BOB}`);
    expect(rpc[1]![1].p_bucket).not.toBe(`user:${ALICE}`);
    expect(rpc[0]![1].p_user).toBe(BOB);
  });

  it.each([
    ['over the caller\'s own daily limit', -1, 429],
    ['the shared pool exhausted', -2, 429],
  ])('%s after admission: the session is handed back, no provider call, so the same photographs can be sent again', async (_label, claimed, status) => {
    const { admin, rpc } = fakeAdmin({ claim: () => ({ data: claimed, error: null }) });
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.status).toBe(status);
    expect(provider.calls).toBe(0);
    expect(names(rpc)).toEqual(['consume_capture_session', 'claim_scan_pair', 'release_capture_session']);
    expect(rpc[2]![1]).toEqual({ p_user: ALICE, p_session: SESSION });
  });

  it('an allowance check that errors hands the session back too, and a failing release never changes the answer', async () => {
    const { admin, rpc } = fakeAdmin({ claim: () => ({ data: null, error: { message: 'down' } }), release: 'throw' });
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.status).toBe(500);
    expect(out.body.error).toBe('Could not check your daily allowance.');
    expect(count(rpc, 'release_capture_session')).toBe(1);
    expect(provider.calls).toBe(0);
  });
});

describe('malformed requests are refused before any allowance, for lookups as well as captures', () => {
  it.each([
    ['a collect with no photograph', { token: 'tok-alice', images: [], fields: collect }, 400],
    ['a lookup with one photograph (the two-photograph floor)', { token: 'tok-alice', images: [fakeImage('x')], fields: {} }, 400],
    ['four photographs', { token: 'tok-alice', images: [fakeImage('a'), fakeImage('b'), fakeImage('c'), fakeImage('d')], fields: {} }, 400],
    ['an oversize photograph', { token: 'tok-alice', images: [new File([new Uint8Array(6 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' }), fakeImage('y')], fields: {} }, 413],
  ])('%s: %i, no quota claim, no capture call, no provider', async (_label, options, status) => {
    const { admin, rpc } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, options);
    expect(out.status).toBe(status);
    expect(rpc).toEqual([]);
    expect(provider.calls).toBe(0);
  });
});

describe('educational lookups are unchanged', () => {
  it('no purpose: allowance then provider, no capture call, no refusal path', async () => {
    const { admin, rpc } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: {} });
    expect(out.status).toBe(200);
    expect(names(rpc)).toEqual(['claim_scan_pair']);
    expect(provider.calls).toBe(1);
  });
  it('session fields without purpose=collect are ignored (an imported photo is a lookup, never a capture)', async () => {
    const { admin, rpc } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: { capture_session_id: SESSION, capture_nonce: NONCE } });
    expect(out.status).toBe(200);
    expect(names(rpc)).toEqual(['claim_scan_pair']);
  });
});

describe('simultaneous identical requests', () => {
  it('two at once: exactly one is admitted, charged and identified; the other is refused and costs nothing', async () => {
    // The database is atomic: the first consume wins, the second finds the same session already spent by an identical request that has
    // no receipts yet (the winner is still mid-provider), which is reported as used, not as a free lookup.
    const { admin, rpc } = fakeAdmin({ consume: (n) => ({ data: { ok: true, replay: n > 0 }, error: null }) });
    router.admin = admin;
    const [a, b] = await Promise.all([
      invoke(handler, { token: 'tok-alice', fields: collect }),
      invoke(handler, { token: 'tok-alice', fields: collect }),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    expect(count(rpc, 'claim_scan_pair')).toBe(1);
    expect(provider.calls).toBe(1);
    expect(count(rpc, 'issue_capture_receipts')).toBe(1);
  });

  it('twelve at once from one session: one provider call, one allowance claim, eleven refusals', async () => {
    const { admin, rpc } = fakeAdmin({ consume: (n) => ({ data: { ok: true, replay: n > 0 }, error: null }) });
    router.admin = admin;
    const outs = await Promise.all(Array.from({ length: 12 }, () => invoke(handler, { token: 'tok-alice', fields: collect })));
    expect(outs.filter((o) => o.status === 200)).toHaveLength(1);
    expect(outs.filter((o) => o.status === 409)).toHaveLength(11);
    expect(count(rpc, 'claim_scan_pair')).toBe(1);
    expect(provider.calls).toBe(1);
  });
});
