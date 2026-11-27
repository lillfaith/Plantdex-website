/**
 * THE CAMERA'S CAPTURE SESSION, HELD SO IT IS REUSED RATHER THAN STRANDED.
 *
 * The server allows three open sessions per account, each living ten minutes (migration 0016),
 * and only the identify function can release one. The first version of the client opened a new
 * session every time the camera screen opened and kept it in a component ref, so denying the
 * camera, declining consent, leaving the page and coming back each stranded one. Three of those
 * and the player could not collect for up to ten minutes, with a message that blamed the wrong
 * thing. Found live on the TEST project during the V1 rehearsal.
 *
 * What changed, and what deliberately did not:
 *  - ONE session is held per signed-in account, at module level, so it survives navigating between
 *    pages and a remount of the scan panel. Opening the camera again, cancelling, declining consent
 *    or retrying all reuse it; a new one is requested only when there is none that is still valid.
 *  - Concurrent opens share ONE request (two taps, two components, StrictMode's double effect).
 *  - Memory only. The nonce is a bearer secret and is never written to storage, so a full reload
 *    still forgets it (the server session simply expires). Nothing about the server contract moved:
 *    a session is still single-use, still bound to its account, and the server still decides.
 *  - A session is dropped only when the server has actually answered about it. A failed or
 *    unreachable request leaves it in place, because the server releases a session on a provider
 *    failure and a lost response proves nothing; if it was in fact spent, the server says so on the
 *    retry and the player is told to take the photo again.
 *  - Nothing here is trusted: reusing a session client-side grants no right the database does not
 *    separately check on every request.
 */
import { openCaptureSession, type CaptureSession, type OpenSessionResult } from './scan-capture-session';

/** Server TTL is 10 minutes; stop offering one a minute early so a stale session is never sent. */
export const SESSION_REUSE_MS = 9 * 60 * 1000;

type OpenFailure = Extract<OpenSessionResult, { ok: false }>['code'];

interface Held {
  userId: string;
  session: CaptureSession | null;
  /** Why the last attempt to open one failed, so the screen can say something true. */
  failure: OpenFailure | null;
  inflight: Promise<void> | null;
}

let held: Held | null = null;

function slotFor(userId: string): Held {
  if (!held || held.userId !== userId) held = { userId, session: null, failure: null, inflight: null };
  return held;
}

function fresh(session: CaptureSession | null, now: number): session is CaptureSession {
  return !!session && now - session.openedAtMs < SESSION_REUSE_MS;
}

/** The session this account can send right now, or null. Never opens one. */
export function currentCaptureSession(userId: string, now: number = Date.now()): CaptureSession | null {
  const slot = held && held.userId === userId ? held : null;
  return slot && fresh(slot.session, now) ? slot.session : null;
}

/** Why there is no session: null when there is one, or when nothing has been tried. */
export function captureSessionFailure(userId: string): OpenFailure | null {
  return held && held.userId === userId ? held.failure : null;
}

/**
 * Make sure a session is held, opening one only if there is none that is valid and none already
 * being opened. Resolves when that is settled; read the result with `currentCaptureSession`.
 */
export function ensureCaptureSession(
  userId: string,
  open: () => Promise<OpenSessionResult> = openCaptureSession,
  now: () => number = Date.now,
): Promise<void> {
  const slot = slotFor(userId);
  if (fresh(slot.session, now())) return Promise.resolve();
  if (slot.inflight) return slot.inflight;
  slot.session = null;
  const request = open().then(
    (opened) => {
      // The account may have changed while this was in flight; never hand its session to another.
      if (held !== slot) return;
      if (opened.ok) {
        slot.session = opened.session;
        slot.failure = null;
      } else {
        slot.failure = opened.code;
      }
    },
    () => {
      if (held === slot) slot.failure = 'network';
    },
  ).finally(() => {
    if (held === slot) slot.inflight = null;
  });
  slot.inflight = request;
  return request;
}

/** The server answered about this session (used or refused): it can never be sent again. */
export function spendCaptureSession(userId: string, sessionId: string): void {
  if (held && held.userId === userId && held.session?.sessionId === sessionId) held.session = null;
}

/** Signing out, or a different account: forget everything held. */
export function clearCaptureSessions(): void {
  held = null;
}
