import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('./supabase-client', () => ({ supabase: { rpc } }));

import { decideConfirm, shouldClaim, type ConfirmInput } from './scan-receipt';
import { claimDiscovery, fetchDiscoveryRules, openCaptureSession } from './scan-capture-session';

afterEach(() => {
  vi.unstubAllEnvs();
  rpc.mockReset();
});

const RECEIPT = { id: 'rcpt_' + 'a'.repeat(32), rankPosition: 'top' as const, expiresAt: '2026-12-26T00:00:00Z' };
const base: ConfirmInput = { channel: 'collect', signedIn: true, wasHeld: false, receipt: RECEIPT, claim: null };

describe('decideConfirm: the table (a NEW card needs camera + signed in + receipt + ok claim)', () => {
  const ok = { ok: true, status: 'claimed' } as const;
  it('a held card is never blocked, whatever the channel or account (grandfathered, idempotent)', () => {
    for (const channel of ['collect', 'lookup', 'unspecified'] as const) {
      for (const signedIn of [true, false]) {
        expect(decideConfirm({ ...base, channel, signedIn, wasHeld: true, receipt: undefined })).toMatchObject({ allow: true, kind: 'held', line: null });
      }
    }
  });
  it('lookup (library photo): identification only, even with a receipt and an ok claim', () => {
    for (const extra of [{}, { claim: ok }, { signedIn: false }]) {
      const d = decideConfirm({ ...base, channel: 'lookup', ...extra });
      expect(d).toMatchObject({ allow: false, kind: 'blocked' });
      expect(d.line).toMatch(/^Identification only/);
    }
  });
  it('unspecified (camera feature off): identification only, cannot unlock, even with an ok claim', () => {
    for (const extra of [{}, { claim: ok }, { signedIn: false }, { receipt: undefined }]) {
      const d = decideConfirm({ ...base, channel: 'unspecified', ...extra });
      expect(d).toMatchObject({ allow: false, kind: 'blocked' });
      expect(d.line).toMatch(/^Identification only/);
    }
  });
  it('signed out: blocked with a calm sign-in line that says scanning still works', () => {
    const d = decideConfirm({ ...base, signedIn: false, receipt: undefined });
    expect(d).toMatchObject({ allow: false, kind: 'blocked' });
    expect(d.line).toMatch(/^Sign in to collect/);
    expect(d.line).toMatch(/identifying work without an account/);
    expect(d.line).toMatch(/in-app camera/);
    expect(decideConfirm({ ...base, signedIn: false, claim: ok }).allow).toBe(false);
  });
  it('signed in + camera + receipt + ok claim: allowed, for every success status', () => {
    for (const status of ['claimed', 'already_claimed', 'already_held'] as const) {
      const d = decideConfirm({ ...base, claim: { ok: true, status } });
      expect(d).toMatchObject({ allow: true, kind: 'claimed' });
      expect(d.line).toMatch(/Captured in the app/);
    }
  });
  it('every refused claim code blocks, with a line, and unlocks nothing', () => {
    for (const code of ['receipt_unknown', 'receipt_expired', 'receipt_ineligible', 'not_signed_in', 'network', 'not-deployed'] as const) {
      const d = decideConfirm({ ...base, claim: { ok: false, code } });
      expect(d).toMatchObject({ allow: false, kind: 'blocked' });
      expect(d.line).toBeTruthy();
    }
  });
  it('a receipt with no claim attempted blocks (a claim that never ran is not a claim)', () => {
    expect(decideConfirm({ ...base, claim: null }).allow).toBe(false);
  });
  it('camera, signed in, NO receipt: blocked and told to retake, with no mock or fallback', () => {
    const d = decideConfirm({ ...base, receipt: undefined });
    expect(d).toMatchObject({ allow: false, kind: 'blocked' });
    expect(d.line).toMatch(/not recorded for collecting/);
    expect(d.line).toMatch(/camera/);
  });
  it('no input can produce any kind but claimed, held or blocked, and only those two allow', () => {
    const channels = ['collect', 'lookup', 'unspecified'] as const;
    const claims = [null, { ok: true, status: 'claimed' }, { ok: false, code: 'not-deployed' }, { ok: false, code: 'network' }] as const;
    for (const channel of channels) for (const signedIn of [true, false]) for (const wasHeld of [true, false])
      for (const receipt of [undefined, RECEIPT]) for (const claim of claims) {
        const d = decideConfirm({ channel, signedIn, wasHeld, receipt, claim });
        expect(['claimed', 'held', 'blocked']).toContain(d.kind);
        if (d.allow && !wasHeld) expect(channel === 'collect' && signedIn && !!receipt && claim?.ok === true).toBe(true);
      }
  });
  it('never says verified or outdoors', () => {
    const lines = [
      decideConfirm({ ...base, claim: { ok: true, status: 'claimed' } }),
      decideConfirm({ ...base, claim: { ok: false, code: 'not-deployed' } }),
      decideConfirm({ ...base, claim: { ok: false, code: 'receipt_unknown' } }),
      decideConfirm({ ...base, receipt: undefined }),
      decideConfirm({ ...base, signedIn: false }),
      decideConfirm({ ...base, channel: 'unspecified' }),
      decideConfirm({ ...base, channel: 'lookup' }),
    ].map((d) => d.line ?? '');
    for (const line of lines) expect(line).not.toMatch(/verif|outdoor|in the wild|proof|MOCK/i);
  });
  it('shouldClaim is only for a signed-in new camera card with a receipt', () => {
    expect(shouldClaim(base)).toBe(true);
    for (const off of [{ channel: 'lookup' as const }, { channel: 'unspecified' as const }, { signedIn: false }, { wasHeld: true }, { receipt: undefined }]) {
      expect(shouldClaim({ ...base, ...off })).toBe(false);
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
    rpc.mockResolvedValueOnce({ data: { ok: true, session_id: 'sid', nonce: 'n'.repeat(64), min_capture_ms: 0 }, error: null });
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
