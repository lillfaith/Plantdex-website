import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CaptureSession, OpenSessionResult } from './scan-capture-session';
import { captureUnavailableMessage } from './scan-capture-copy';
import {
  SESSION_REUSE_MS,
  captureSessionFailure,
  clearCaptureSessions,
  currentCaptureSession,
  ensureCaptureSession,
  spendCaptureSession,
} from './scan-session-holder';

const made = (id: string, at: number): CaptureSession => ({ sessionId: id, nonce: 'n-' + id, minCaptureMs: 0, openedAtMs: at });
const ok = (id: string, at = 0): OpenSessionResult => ({ ok: true, session: made(id, at) });

beforeEach(() => clearCaptureSessions());

describe('the capture session is reused, not stranded (rehearsal blocker 1)', () => {
  it('opens once and reuses it for every later camera open', async () => {
    const open = vi.fn(async () => ok('s1'));
    for (let i = 0; i < 5; i++) await ensureCaptureSession('u1', open, () => 1000);
    expect(open).toHaveBeenCalledTimes(1);
    expect(currentCaptureSession('u1', 1000)?.sessionId).toBe('s1');
  });

  it('concurrent opens share ONE request (two taps, two components, StrictMode)', async () => {
    let release!: (r: OpenSessionResult) => void;
    const open = vi.fn(() => new Promise<OpenSessionResult>((r) => (release = r)));
    const a = ensureCaptureSession('u1', open, () => 0);
    const b = ensureCaptureSession('u1', open, () => 0);
    release(ok('s1'));
    await Promise.all([a, b]);
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('survives what used to strand it: it is module state, so a remount finds the same session', async () => {
    await ensureCaptureSession('u1', async () => ok('s1'), () => 0);
    // a new "component" asks again, e.g. after navigating away and back
    const open = vi.fn(async () => ok('s2'));
    await ensureCaptureSession('u1', open, () => 1);
    expect(open).not.toHaveBeenCalled();
    expect(currentCaptureSession('u1', 1)?.sessionId).toBe('s1');
  });

  it('never offers an expired session and opens a fresh one instead', async () => {
    await ensureCaptureSession('u1', async () => ok('s1', 0), () => 0);
    expect(currentCaptureSession('u1', SESSION_REUSE_MS + 1)).toBeNull();
    const open = vi.fn(async () => ok('s2', SESSION_REUSE_MS + 1));
    await ensureCaptureSession('u1', open, () => SESSION_REUSE_MS + 1);
    expect(open).toHaveBeenCalledTimes(1);
    expect(currentCaptureSession('u1', SESSION_REUSE_MS + 2)?.sessionId).toBe('s2');
  });

  it('is isolated per account: another user never receives or reuses it', async () => {
    await ensureCaptureSession('u1', async () => ok('s1'), () => 0);
    expect(currentCaptureSession('u2', 0)).toBeNull();
    const open = vi.fn(async () => ok('s2'));
    await ensureCaptureSession('u2', open, () => 0);
    expect(open).toHaveBeenCalledTimes(1);
    expect(currentCaptureSession('u1', 0)).toBeNull(); // u1's slot was replaced, never shared
  });

  it('an open that finishes after the account changed is discarded, not handed to the new account', async () => {
    let release!: (r: OpenSessionResult) => void;
    const slow = ensureCaptureSession('u1', () => new Promise<OpenSessionResult>((r) => (release = r)), () => 0);
    await ensureCaptureSession('u2', async () => ok('mine'), () => 0);
    release(ok('theirs'));
    await slow;
    expect(currentCaptureSession('u2', 0)?.sessionId).toBe('mine');
    expect(currentCaptureSession('u1', 0)).toBeNull();
  });

  it('records why opening failed, and a later success clears it', async () => {
    await ensureCaptureSession('u1', async () => ({ ok: false, code: 'too_many_open_sessions' }), () => 0);
    expect(currentCaptureSession('u1', 0)).toBeNull();
    expect(captureSessionFailure('u1')).toBe('too_many_open_sessions');
    await ensureCaptureSession('u1', async () => ok('s1'), () => 0);
    expect(captureSessionFailure('u1')).toBeNull();
  });

  it('a thrown open is a network failure, never an unhandled rejection', async () => {
    await ensureCaptureSession('u1', async () => { throw new Error('boom'); }, () => 0);
    expect(captureSessionFailure('u1')).toBe('network');
  });

  it('is spent only by the matching id, and only when told: a failed request keeps it', async () => {
    await ensureCaptureSession('u1', async () => ok('s1'), () => 0);
    spendCaptureSession('u1', 'other');
    spendCaptureSession('u2', 's1');
    expect(currentCaptureSession('u1', 0)?.sessionId).toBe('s1');
    spendCaptureSession('u1', 's1');
    expect(currentCaptureSession('u1', 0)).toBeNull();
  });

  it('is forgotten on sign-out', async () => {
    await ensureCaptureSession('u1', async () => ok('s1'), () => 0);
    clearCaptureSessions();
    expect(currentCaptureSession('u1', 0)).toBeNull();
  });
});

describe('what the player is told (rehearsal blocker 2)', () => {
  it('names the real cause and a real next step, never the old catch-all', () => {
    for (const why of ['signed_out', 'too_many_open_sessions', 'daily_session_limit', 'network', 'not-deployed', 'expired'] as const) {
      const m = captureUnavailableMessage(why);
      expect(m, why).not.toMatch(/could not be started/i);
      expect(m, why).not.toMatch(/try the camera again\.?$/i);
    }
    expect(captureUnavailableMessage('expired')).toMatch(/take the photo again/);
    expect(captureUnavailableMessage('too_many_open_sessions')).toMatch(/few minutes/);
  });

  it('never points at a route to a card that skips the camera', () => {
    for (const why of ['signed_out', 'too_many_open_sessions', 'daily_session_limit', 'network', 'expired'] as const) {
      expect(captureUnavailableMessage(why)).not.toMatch(/library photo can collect|unlock/i);
    }
  });
});

describe('the scan panel wiring', () => {
  const panel = readFileSync('src/components/scan/ScanPanel.tsx', 'utf8');
  it('no longer owns a session ref, and no longer spends the session before the server has answered', () => {
    expect(panel).not.toMatch(/captureSession\s*=\s*useRef/);
    expect(panel).not.toMatch(/captureSession\.current/);
    expect(panel).not.toContain('openCaptureSession');
    expect(panel).toContain('ensureCaptureSession(user.id)');
    expect(panel).toContain('currentCaptureSession(user.id)');
  });
  it('drops the session only on a real answer or a backend-confirmed spend', () => {
    expect(panel).toMatch(/!isScanFailure\(answer\) \|\| \(answer\.kind === 'error' && answer\.captureSpent\)/);
  });
  it('forgets sessions when the account signs out', () => {
    expect(panel).toMatch(/if \(!user\) clearCaptureSessions\(\)/);
  });
});
