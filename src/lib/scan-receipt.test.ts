import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('./supabase-client', () => ({ supabase: { rpc } }));

import { decideConfirm, shouldClaim, shouldFetchRules, type ConfirmInput } from './scan-receipt';
import { claimDiscovery, fetchDiscoveryRules, openCaptureSession } from './scan-capture-session';

afterEach(() => {
  vi.unstubAllEnvs();
  rpc.mockReset();
});

const RECEIPT = { id: 'rcpt_' + 'a'.repeat(32), rankPosition: 'top' as const, expiresAt: '2026-12-26T00:00:00Z' };
const base: ConfirmInput = { channel: 'collect', signedIn: true, wasHeld: false, receipt: RECEIPT, claim: null, rules: null };

describe('decideConfirm: the table', () => {
  it('flag off (unspecified): unrestricted, exactly today', () => {
    expect(decideConfirm({ ...base, channel: 'unspecified' })).toMatchObject({ allow: true, kind: 'unrestricted', line: null });
  });
  it('a held card is never blocked, whatever the channel (grandfathered, idempotent)', () => {
    for (const channel of ['collect', 'lookup', 'unspecified'] as const) {
      expect(decideConfirm({ ...base, channel, wasHeld: true })).toMatchObject({ allow: true, kind: 'held' });
    }
  });
  it('a lookup can never unlock a new card, with or without a receipt', () => {
    expect(decideConfirm({ ...base, channel: 'lookup' }).allow).toBe(false);
    expect(decideConfirm({ ...base, channel: 'lookup', claim: { ok: true, status: 'claimed' } }).allow).toBe(false);
  });
  it('signed out: local only, no receipt, said plainly', () => {
    const d = decideConfirm({ ...base, signedIn: false, receipt: undefined });
    expect(d).toMatchObject({ allow: true, kind: 'local-only' });
    expect(d.line).toMatch(/this device only/);
  });
  it('a claimed receipt allows and says captured in the app', () => {
    for (const status of ['claimed', 'already_claimed', 'already_held'] as const) {
      const d = decideConfirm({ ...base, claim: { ok: true, status } });
      expect(d).toMatchObject({ allow: true, kind: 'claimed' });
      expect(d.line).toMatch(/Captured in the app/);
    }
  });
  it('a refused claim blocks, with a plain line, and unlocks nothing', () => {
    for (const code of ['receipt_unknown', 'receipt_expired', 'receipt_ineligible', 'not_signed_in', 'network'] as const) {
      const d = decideConfirm({ ...base, claim: { ok: false, code } });
      expect(d.allow).toBe(false);
      expect(d.kind).toBe('blocked');
      expect(d.line).toBeTruthy();
    }
  });
  it('functions not deployed: MOCK fallback, labelled, never presented as a receipt', () => {
    const withReceipt = decideConfirm({ ...base, claim: { ok: false, code: 'not-deployed' } });
    const noReceipt = decideConfirm({ ...base, receipt: undefined, rules: { kind: 'not-deployed' } });
    const offRules = decideConfirm({ ...base, receipt: undefined, rules: { kind: 'known', enforcing: false } });
    for (const d of [withReceipt, noReceipt, offRules]) {
      expect(d).toMatchObject({ allow: true, kind: 'mock' });
      expect(d.line).toMatch(/MOCK/);
    }
  });
  it('enforcing, or unknown, with no receipt: blocked (fail safe)', () => {
    expect(decideConfirm({ ...base, receipt: undefined, rules: { kind: 'known', enforcing: true } }).allow).toBe(false);
    expect(decideConfirm({ ...base, receipt: undefined, rules: { kind: 'unknown' } }).allow).toBe(false);
    expect(decideConfirm({ ...base, receipt: undefined, rules: null }).allow).toBe(false);
  });
  it('never says verified or outdoors', () => {
    const lines = [
      decideConfirm({ ...base, claim: { ok: true, status: 'claimed' } }),
      decideConfirm({ ...base, claim: { ok: false, code: 'not-deployed' } }),
      decideConfirm({ ...base, claim: { ok: false, code: 'receipt_unknown' } }),
      decideConfirm({ ...base, receipt: undefined, rules: { kind: 'unknown' } }),
    ].map((d) => d.line ?? '');
    for (const line of lines) expect(line).not.toMatch(/verif|outdoor|in the wild|proof/i);
  });
  it('shouldClaim / shouldFetchRules are mutually exclusive and only for a signed-in new camera card', () => {
    expect(shouldClaim(base)).toBe(true);
    expect(shouldFetchRules(base)).toBe(false);
    expect(shouldFetchRules({ ...base, receipt: undefined })).toBe(true);
    for (const off of [{ channel: 'lookup' as const }, { signedIn: false }, { wasHeld: true }]) {
      expect(shouldClaim({ ...base, ...off })).toBe(false);
      expect(shouldFetchRules({ ...base, receipt: undefined, ...off })).toBe(false);
    }
  });
});

describe('the RPC adapters (coded to the contract)', () => {
  it('do nothing and call nothing with the pilot off', async () => {
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'off');
    expect(await openCaptureSession()).toMatchObject({ ok: false, code: 'not-deployed' });
    expect(await claimDiscovery('x')).toMatchObject({ ok: false, code: 'not-deployed' });
    expect(await fetchDiscoveryRules()).toEqual({ kind: 'not-deployed' });
    expect(rpc).not.toHaveBeenCalled();
  });
  it('open_capture_session: ok, refusal codes, missing function, transport failure', async () => {
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'on');
    rpc.mockResolvedValueOnce({ data: { ok: true, session_id: 'sid', nonce: 'n'.repeat(64), min_capture_ms: 2000 }, error: null });
    const ok = await openCaptureSession();
    expect(ok.ok && ok.session.sessionId).toBe('sid');
    expect(rpc).toHaveBeenCalledWith('open_capture_session');
    rpc.mockResolvedValueOnce({ data: { ok: false, code: 'daily_session_limit' }, error: null });
    expect(await openCaptureSession()).toEqual({ ok: false, code: 'daily_session_limit' });
    rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } });
    expect(await openCaptureSession()).toEqual({ ok: false, code: 'not-deployed' });
    rpc.mockRejectedValueOnce(new Error('offline'));
    expect(await openCaptureSession()).toEqual({ ok: false, code: 'network' });
  });
  it('claim_discovery: statuses, codes, and a malformed answer is a failure not a claim', async () => {
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'on');
    rpc.mockResolvedValueOnce({ data: { ok: true, status: 'claimed', herb_id: 'h' }, error: null });
    expect(await claimDiscovery('rcpt_1')).toEqual({ ok: true, status: 'claimed' });
    expect(rpc).toHaveBeenCalledWith('claim_discovery', { p_receipt_id: 'rcpt_1' });
    rpc.mockResolvedValueOnce({ data: { ok: false, code: 'receipt_expired' }, error: null });
    expect(await claimDiscovery('rcpt_1')).toEqual({ ok: false, code: 'receipt_expired' });
    rpc.mockResolvedValueOnce({ data: { ok: true, status: 'something-new' }, error: null });
    expect(await claimDiscovery('rcpt_1')).toEqual({ ok: false, code: 'network' });
    rpc.mockResolvedValueOnce({ data: 'ok', error: null });
    expect(await claimDiscovery('rcpt_1')).toEqual({ ok: false, code: 'network' });
    rpc.mockResolvedValueOnce({ data: null, error: { code: '42883' } });
    expect(await claimDiscovery('rcpt_1')).toEqual({ ok: false, code: 'not-deployed' });
  });
  it('discovery_rules: known, not deployed, unknown', async () => {
    vi.stubEnv('NEXT_PUBLIC_CAMERA_CAPTURE', 'on');
    rpc.mockResolvedValueOnce({ data: { enforcing: true }, error: null });
    expect(await fetchDiscoveryRules()).toEqual({ kind: 'known', enforcing: true });
    rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } });
    expect(await fetchDiscoveryRules()).toEqual({ kind: 'not-deployed' });
    rpc.mockResolvedValueOnce({ data: null, error: { code: '500' } });
    expect(await fetchDiscoveryRules()).toEqual({ kind: 'unknown' });
  });
  it('the session nonce is never stored or logged', () => {
    const src = readFileSync('src/lib/scan-capture-session.ts', 'utf8');
    expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB|console\./);
  });
});
