/**
 * Live-camera capture: the pure half. States, transitions, error mapping, the remembered
 * decline, and the channel tag. No DOM, no navigator, nothing that can be switched on by
 * importing it. The side-effecting half is `scan-capture-camera.ts`.
 *
 * PILOT, NOT A REQUIREMENT (owner decisions D1 and D6). Everything here sits behind
 * `NEXT_PUBLIC_CAMERA_CAPTURE` (default 'off'). A player without a usable camera keeps
 * browsing and keeps educational identification; no camera-free route to a new collectible
 * card is designed here or anywhere. This module offers no such route and no bypass.
 *
 * WHAT A CAPTURE IS. A frame the page read from a camera, re-encoded through the existing
 * `prepareImage`. It says nothing about where the plant was or whether anyone found it, and
 * nothing in this module may be read as saying so. It stores nothing and uploads nothing.
 */

/** The only read of the flag, a literal comparison so the bundler can drop the branch. */
export function isCameraCaptureEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CAMERA_CAPTURE === 'on';
}

export const CAPTURE_STATES = [
  'unsupported',
  'insecure-context',
  'not-asked',
  'prompting',
  'granted',
  'denied',
  'no-device',
  'in-use',
  'error',
  'capturing',
  'captured',
] as const;
export type CaptureState = (typeof CAPTURE_STATES)[number];

/**
 * The reason a capture was made, as a plain value a classifier can read later. `collect` is
 * the Collect entry point; `lookup` is educational identification. The tag is a declaration
 * by the caller, not something this module can observe.
 */
export const CAPTURE_CHANNELS = ['collect', 'lookup'] as const;
export type CaptureChannel = (typeof CAPTURE_CHANNELS)[number];

export function isCaptureChannel(value: unknown): value is CaptureChannel {
  return typeof value === 'string' && (CAPTURE_CHANNELS as readonly string[]).includes(value);
}

/** States in which no stream is open. Every exit path must land in one of these. */
export const STREAMLESS_STATES: readonly CaptureState[] = [
  'unsupported',
  'insecure-context',
  'not-asked',
  'denied',
  'no-device',
  'in-use',
  'error',
  'captured',
];

/** What the environment can do, probed once, before anything is asked. */
export interface CaptureEnvironment {
  secureContext: boolean;
  hasGetUserMedia: boolean;
}

export type CaptureEvent =
  | { type: 'probe'; env: CaptureEnvironment; declinedBefore: boolean }
  | { type: 'request' }
  | { type: 'granted' }
  | { type: 'failed'; to: Exclude<CaptureState, 'prompting' | 'granted' | 'capturing' | 'captured'> }
  | { type: 'capture' }
  | { type: 'captured' }
  | { type: 'capture-failed' }
  | { type: 'release' };

/**
 * The transition function. Total: an event that makes no sense in a state returns the same
 * state, so a stray call is a no-op and never a crash.
 *
 * NOTHING LEAVES `denied` EXCEPT A NEW `probe`, and a probe that finds the remembered
 * decline lands straight back in it. So a player who said no is never asked again by this
 * code; changing their mind is the browser's own settings, not a second prompt from us.
 */
export function transition(state: CaptureState, event: CaptureEvent): CaptureState {
  switch (event.type) {
    case 'probe':
      if (!event.env.secureContext) return 'insecure-context';
      if (!event.env.hasGetUserMedia) return 'unsupported';
      return event.declinedBefore ? 'denied' : 'not-asked';
    case 'request':
      return state === 'not-asked' || state === 'no-device' || state === 'in-use' ||
        state === 'error' || state === 'captured'
        ? 'prompting'
        : state;
    case 'granted':
      return state === 'prompting' ? 'granted' : state;
    case 'failed':
      return state === 'prompting' ? event.to : state;
    case 'capture':
      return state === 'granted' ? 'capturing' : state;
    case 'captured':
      return state === 'capturing' ? 'captured' : state;
    case 'capture-failed':
      return state === 'capturing' ? 'error' : state;
    case 'release':
      // Closing a stream never un-declines and never invents a grant.
      return state === 'prompting' || state === 'granted' || state === 'capturing'
        ? 'not-asked'
        : state;
  }
}

/** Map what `getUserMedia` rejected with onto a state. Unknown names are `error`. */
export function stateForError(error: unknown): 'denied' | 'no-device' | 'in-use' | 'insecure-context' | 'error' {
  const name =
    error && typeof error === 'object' && 'name' in error ? String((error as { name: unknown }).name) : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'denied';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'no-device';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'in-use';
    case 'SecurityError':
      return 'insecure-context';
    default:
      // OverconstrainedError, AbortError, TypeError and anything else. Never retried.
      return 'error';
  }
}

/* ---- the remembered decline: one boolean, one account-scoped key, validated on read ---- */

export const CAMERA_DECLINE_STORAGE_KEY = 'plantdex.camera-capture.v1';
export const ANONYMOUS_CAPTURE_SCOPE = 'device';

/** The slice of `Storage` used here, so a test can hand in a fake. */
export interface DeclineStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function declineKey(scope: string): string {
  return `${CAMERA_DECLINE_STORAGE_KEY}:${scope}`;
}

/** True only for exactly `{"declined":true}`; anything malformed reads as "not declined". */
export function readDeclined(storage: DeclineStorage | null, scope: string): boolean {
  if (!storage) return false;
  try {
    const raw = storage.getItem(declineKey(scope));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return !!parsed && typeof parsed === 'object' && (parsed as { declined?: unknown }).declined === true;
  } catch {
    return false;
  }
}

export function writeDeclined(storage: DeclineStorage | null, scope: string): void {
  if (!storage) return;
  try {
    storage.setItem(declineKey(scope), JSON.stringify({ declined: true }));
  } catch {
    /* A blocked store costs one extra ask in a later session, never a broken page. */
  }
}
