import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fakeImage,
  importEdge,
  inertBuilder,
  invoke,
  loadHandler,
  router,
  type AdminFake,
  type Reply,
} from './scan-edge-harness';

/*
 * PROVIDER FAILURE HANDS BACK WHAT IT SPENT (agents/requests/coord-release-capture-session-on-provider-failure.md).
 *
 * The REAL identify-plant handler runs against a scripted provider and a fake service-role client. What
 * this proves: WHICH outcomes call `release_capture_session` and `refund_scan_claim`, with which
 * arguments, and that a failing call never changes the answer. What it does NOT prove: that either SQL
 * function does its job. Both are fakes here; the real database path is the coordinator's TEST run.
 */
vi.mock('npm:@supabase/supabase-js@2', async () => (await import('./scan-edge-harness')).supabaseMock);

const ALICE = '11111111-1111-4111-8111-111111111111';
const SESSION = '22222222-2222-4222-8222-222222222222';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const NONCE = 'ab'.repeat(32);
const collect = { purpose: 'collect', capture_session_id: SESSION, capture_nonce: NONCE };

type Mode = 'ok' | 'empty' | 'status500' | 'status502' | 'status400' | 'status401' | 'status429' | 'throw';
let mode: Mode = 'ok';
let realFetch: typeof fetch;

function plantNetAnswer(): Response {
  switch (mode) {
    case 'empty':
      return new Response('{}', { status: 404 });
    case 'status500':
      return new Response('x', { status: 500 });
    case 'status502':
      return new Response('x', { status: 502 });
    case 'status400':
      return new Response('x', { status: 400 });
    case 'status401':
      return new Response('x', { status: 401 });
    case 'status429':
      return new Response('x', { status: 429 });
    case 'throw':
      throw new TypeError('network down');
    default:
      return new Response(
        JSON.stringify({
          results: [{ score: 0.8, species: { scientificNameWithoutAuthor: 'Taraxacum officinale', commonNames: [] }, gbif: { id: '1' }, powo: { id: '1-1' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
  }
}

interface Script {
  consume?: Reply;
  release?: 'true' | 'false' | 'error' | 'throw';
  refund?: 'ok' | 'false' | 'error' | 'throw' | 'string' | 'null';
  /** Replaces the scripted refund answer entirely (a stateful fake of the real SQL rules). */
  refundFn?: (args: Record<string, unknown>) => Reply;
  sessions?: unknown[];
  receipts?: unknown[];
}
function fakeAdmin(script: Script = {}) {
  const rpc: Array<[string, Record<string, unknown>]> = [];
  const admin: AdminFake = {
    async rpc(name, args) {
      rpc.push([name, args]);
      if (name === 'claim_scan_pair') return { data: 3, error: null };
      if (name === 'consume_capture_session') return script.consume ?? { data: { ok: true, replay: false }, error: null };
      if (name === 'issue_capture_receipts') return { data: [{ id: 'rcpt_' + '0'.repeat(32), herb_id: 'taraxacum-officinale', rank_position: 'top' }], error: null };
      if (name === 'release_capture_session') {
        if (script.release === 'throw') throw new Error('boom');
        if (script.release === 'error') return { data: null, error: { message: 'down' } };
        return { data: script.release !== 'false', error: null };
      }
      if (name === 'refund_scan_claim') {
        if (script.refund === 'throw') throw new Error('boom');
        if (script.refund === 'error') return { data: null, error: { message: 'down' } };
        if (script.refund === 'false') return { data: false, error: null };
        if (script.refund === 'string') return { data: 'true', error: null };
        if (script.refund === 'null') return { data: null, error: null };
        if (script.refundFn) return script.refundFn(args);
        return { data: true, error: null };
      }
      return { data: null, error: { message: `unexpected rpc ${name}` } };
    },
    from(table) {
      const rows = table === 'capture_sessions' ? script.sessions : table === 'capture_receipts' ? script.receipts : undefined;
      if (rows === undefined) return inertBuilder();
      return { select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: rows, error: null }) }) }) };
    },
  };
  return { admin, rpc };
}

const count = (rpc: Array<[string, Record<string, unknown>]>, name: string) => rpc.filter(([n]) => n === name).length;

let handler: Awaited<ReturnType<typeof loadHandler>>;
beforeAll(async () => {
  realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (!String(input).startsWith('https://my-api.plantnet.org/')) throw new Error(`unexpected fetch ${String(input)}`);
    return plantNetAnswer();
  }) as typeof fetch;
  handler = await loadHandler(() => importEdge('index'));
});
afterAll(() => {
  globalThis.fetch = realFetch;
});
beforeEach(() => {
  router.tokens = { 'Bearer tok-alice': ALICE };
  router.callerCalls = [];
  mode = 'ok';
});

describe('provider-side failure after an accepted capture', () => {
  it.each(['status500', 'status502', 'throw'] as const)('%s releases the session and refunds the caller once each', async (m) => {
    mode = m;
    const { admin, rpc } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.status).toBe(502);
    expect(out.body.capture).toEqual({ accepted: true, retryable: true });
    expect(count(rpc, 'release_capture_session')).toBe(1);
    expect(count(rpc, 'refund_scan_claim')).toBe(1);
    expect(rpc.find(([n]) => n === 'release_capture_session')![1]).toEqual({ p_user: ALICE, p_session: SESSION });
    const claim = rpc.find(([n]) => n === 'claim_scan_pair')![1];
    expect(rpc.find(([n]) => n === 'refund_scan_claim')![1]).toEqual({ p_bucket: claim.p_bucket, p_day: claim.p_day, p_observation_id: expect.stringMatching(UUID) });
    expect(claim.p_bucket).toBe(`user:${ALICE}`);
    // The shared unit is never refunded: there is exactly one refund call and it names the caller's bucket.
    expect(count(rpc, 'issue_capture_receipts')).toBe(0);
  });

  it('a release that reports false (receipts exist) refunds but is NOT marked retryable', async () => {
    mode = 'status502';
    const { admin, rpc } = fakeAdmin({ release: 'false' });
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.status).toBe(502);
    expect(out.body.capture).toBeUndefined();
    expect(count(rpc, 'refund_scan_claim')).toBe(1);
  });

  it.each([
    ['release throws', { release: 'throw' }],
    ['release errors', { release: 'error' }],
    ['refund throws', { refund: 'throw' }],
    ['refund errors', { refund: 'error' }],
    ['both throw', { release: 'throw', refund: 'throw' }],
  ] as Array<[string, Script]>)('%s: the player still sees the same 502', async (_n, script) => {
    mode = 'status502';
    const { admin } = fakeAdmin(script);
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.status).toBe(502);
    expect(out.body.code).toBe('provider');
    expect(out.body.error).toBe('The identification service could not be reached. Please try again.');
  });
});

describe('everything else calls neither', () => {
  const neither = (rpc: Array<[string, Record<string, unknown>]>) => {
    expect(count(rpc, 'release_capture_session')).toBe(0);
    expect(count(rpc, 'refund_scan_claim')).toBe(0);
  };

  it('a replay', async () => {
    const { admin, rpc } = fakeAdmin({
      sessions: [{ id: SESSION, consumed_at: '2030-01-01T00:00:00Z' }],
      consume: { data: { ok: true, replay: true }, error: null },
      receipts: [{ id: 'rcpt_' + '0'.repeat(32), herb_id: 'taraxacum-officinale', rank_position: 'top', expires_at: 'x' }],
    });
    router.admin = admin;
    mode = 'status502';
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.status).toBe(200);
    neither(rpc);
  });

  it('a refused capture (session already used) never reaches the provider, so there is nothing to release or refund', async () => {
    mode = 'status502';
    const { admin, rpc } = fakeAdmin({ consume: { data: { ok: false, code: 'capture_session_used' }, error: null } });
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.status).toBe(409);
    expect(out.body.capture).toEqual({ accepted: false, code: 'capture_session_used' });
    expect(count(rpc, 'release_capture_session')).toBe(0);
    expect(count(rpc, 'refund_scan_claim')).toBe(0);
    expect(count(rpc, 'claim_scan_pair')).toBe(0);
  });

  it('a success', async () => {
    const { admin, rpc } = fakeAdmin();
    router.admin = admin;
    expect((await invoke(handler, { token: 'tok-alice', fields: collect })).status).toBe(200);
    neither(rpc);
  });

  it('"nothing found"', async () => {
    mode = 'empty';
    const { admin, rpc } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect(out.body.providerFoundNothing).toBe(true);
    neither(rpc);
  });

  it.each(['status400', 'status401', 'status429'] as const)('a provider rejection (%s) is not an outage', async (m) => {
    mode = m;
    const { admin, rpc } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields: collect });
    expect([429, 500, 502]).toContain(out.status);
    expect(out.body.capture).toBeUndefined();
    neither(rpc);
  });

  it('an oversized photograph is refused before the provider', async () => {
    const big = new File([new Uint8Array(20 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    const { admin, rpc } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', images: [big, fakeImage('b')], fields: collect });
    expect(out.status).toBe(413);
    neither(rpc);
  });
});

describe('anonymous callers', () => {
  it('a non-collect provider failure refunds the anonymous bucket but never releases', async () => {
    mode = 'status500';
    const { admin, rpc } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler);
    expect(out.status).toBe(502);
    expect(out.body.capture).toBeUndefined();
    expect(count(rpc, 'release_capture_session')).toBe(0);
    const claim = rpc.find(([n]) => n === 'claim_scan_pair')![1];
    expect(rpc.filter(([n]) => n === 'refund_scan_claim')).toEqual([['refund_scan_claim', { p_bucket: claim.p_bucket, p_day: claim.p_day, p_observation_id: expect.stringMatching(UUID) }]]);
    expect(String(claim.p_bucket)).not.toBe('global');
  });

  it('a signed-out collect request is refused before any allowance or provider, with nothing to release or refund', async () => {
    mode = 'status500';
    const { admin, rpc } = fakeAdmin();
    router.admin = admin;
    const out = await invoke(handler, { fields: collect });
    expect(out.status).toBe(409);
    expect(out.body.capture).toEqual({ accepted: false, code: 'capture_not_signed_in' });
    expect(rpc).toEqual([]);
  });

});

/*
 * THE ALLOWANCE FIELD: what the backend CONFIRMED, never what the handler hoped.
 * `released` and `refunded` are independent facts; the 502 body reports each separately.
 */
describe('allowance reporting on provider-side failures', () => {
  const PLAYER_FORBIDDEN = /global|shared|budget/i;
  const hit = async (script: Script, fields: Record<string, string> | undefined = collect) => {
    mode = 'status502';
    const { admin, rpc } = fakeAdmin(script);
    router.admin = admin;
    const out = await invoke(handler, { token: 'tok-alice', fields });
    return { out, rpc };
  };

  it('released + refunded', async () => {
    const { out } = await hit({});
    expect(out.body.capture).toEqual({ accepted: true, retryable: true });
    expect(out.body.allowance).toBe('refunded');
  });
  it('released + not refunded (rpc says false)', async () => {
    const { out } = await hit({ refund: 'false' });
    expect(out.body.capture).toEqual({ accepted: true, retryable: true });
    expect(out.body.allowance).toBe('not_refunded');
  });
  it('not released + refunded', async () => {
    const { out } = await hit({ release: 'false' });
    expect(out.body.capture).toBeUndefined();
    expect(out.body.allowance).toBe('refunded');
  });
  it('neither', async () => {
    const { out } = await hit({ release: 'false', refund: 'false' });
    expect(out.body.capture).toBeUndefined();
    expect(out.body.allowance).toBe('not_refunded');
  });
  it.each(['false', 'error', 'throw', 'string', 'null'] as const)('refund rpc %s is not_refunded', async (refund) => {
    const { out } = await hit({ refund });
    expect(out.status).toBe(502);
    expect(out.body.allowance).toBe('not_refunded');
    expect(out.body.capture).toEqual({ accepted: true, retryable: true });
  });
  it('the 502 text itself never mentions the shared budget', async () => {
    const { out } = await hit({});
    expect(String(out.body.error)).not.toMatch(PLAYER_FORBIDDEN);
  });
  it('non-provider failures and successes carry no allowance field', async () => {
    for (const m of ['status400', 'status401', 'status429', 'empty', 'ok'] as const) {
      mode = m;
      const { admin } = fakeAdmin();
      router.admin = admin;
      const out = await invoke(handler, { token: 'tok-alice', fields: collect });
      expect(out.body, m).not.toHaveProperty('allowance');
    }
  });

  /** A fake of the real function's rules: idempotent per request id, cap 3 per bucket per UTC day, refuses 'global'. */
  function sqlLikeRefund() {
    const byBucketDay = new Map<string, Set<string>>();
    const seen = new Set<string>();
    return (args: Record<string, unknown>): Reply => {
      const { p_bucket, p_day, p_observation_id } = args as Record<string, string>;
      if (!p_bucket || !p_day || !p_observation_id || p_bucket === 'global' || !UUID.test(p_observation_id)) return { data: false, error: null };
      const key = `${p_bucket}|${p_day}`;
      const set = byBucketDay.get(key) ?? new Set<string>();
      byBucketDay.set(key, set);
      if (set.size >= 3 || seen.has(p_observation_id)) return { data: false, error: null };
      seen.add(p_observation_id);
      set.add(p_observation_id);
      return { data: true, error: null };
    };
  }

  it('repeated failures: requests 1-3 refunded, 4+ not_refunded', async () => {
    const refundFn = sqlLikeRefund();
    const results: unknown[] = [];
    for (let i = 0; i < 5; i++) {
      const { out, rpc } = await hit({ refundFn });
      results.push(out.body.allowance);
      expect(rpc.find(([n]) => n === 'refund_scan_claim')![1].p_bucket).toBe(`user:${ALICE}`);
    }
    expect(results).toEqual(['refunded', 'refunded', 'refunded', 'not_refunded', 'not_refunded']);
  });

  it('concurrent: 12 failing requests from one bucket give exactly 3 refunded', async () => {
    const refundFn = sqlLikeRefund();
    const outs = await Promise.all(Array.from({ length: 12 }, () => hit({ refundFn })));
    const allowances = outs.map((o) => o.out.body.allowance);
    expect(allowances.filter((a) => a === 'refunded')).toHaveLength(3);
    expect(allowances.filter((a) => a === 'not_refunded')).toHaveLength(9);
    const ids = outs.map((o) => o.rpc.find(([n]) => n === 'refund_scan_claim')![1].p_observation_id);
    expect(new Set(ids).size).toBe(12);
  });

  it('the same request id twice refunds once (fake rules)', () => {
    const refundFn = sqlLikeRefund();
    const args = { p_bucket: 'user:a', p_day: '2030-01-01', p_observation_id: '33333333-3333-4333-8333-333333333333' };
    expect([refundFn(args).data, refundFn(args).data]).toEqual([true, false]);
  });

  it('the fake refuses the global bucket', () => {
    expect(sqlLikeRefund()({ p_bucket: 'global', p_day: 'd', p_observation_id: '33333333-3333-4333-8333-333333333333' }).data).toBe(false);
  });
});
