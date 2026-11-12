import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ANONYMOUS_SCOPE,
  WELCOME_STORAGE_KEY,
  clearWelcomeState,
  markWelcomeSeen,
  shouldShowWelcome,
  welcomeSeen,
} from './first-run';
import { ANONYMOUS_SCOPE as UNLOCK_SCOPE } from './unlocked-field-cards';

/**
 * A REAL STORAGE STUB, BECAUSE THIS SUITE RUNS IN `node`.
 *
 * `vitest.config.ts` sets `environment: 'node'` and no test file in this repo opts into
 * jsdom, so there is no `window` and no `localStorage` anywhere by default. Without a stub
 * the flag tests below pass off the module's in-memory cache alone and prove nothing about
 * persistence — the write silently throws into its own catch and the read never runs. That
 * is exactly the failure this stub exists to close, and it is worth knowing it applies to
 * every other storage module tested here too.
 *
 * Keys are own enumerable properties on a real Storage object; this provides the specified
 * `length` / `key(i)` interface instead, which is what `first-run.ts` now uses.
 */
function installStorage(): void {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, value),
    removeItem: (key: string) => void entries.delete(key),
    clear: () => entries.clear(),
    key: (index: number) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
  };
  (globalThis as { window?: unknown }).window = { localStorage: storage };
}

beforeEach(() => {
  installStorage();
  clearWelcomeState();
});

afterEach(() => {
  clearWelcomeState();
  delete (globalThis as { window?: unknown }).window;
});

const NEW_VISITOR = { ready: true, discoveredCount: 0, seen: false };

describe('who sees the welcome', () => {
  it('shows it to a genuinely new player', () => {
    expect(shouldShowWelcome(NEW_VISITOR)).toBe(true);
  });

  // A new account, signed in, with nothing found yet is the same case as a new visitor:
  // the decision reads a count, not an auth state.
  it('shows it to a new authenticated player with an empty collection', () => {
    expect(shouldShowWelcome({ ready: true, discoveredCount: 0, seen: false })).toBe(true);
  });

  /*
   * THE RULE THAT MATTERS MOST. A returning player must never be interrupted, and their
   * count arrives from the server when signed in, so this holds across devices and through a
   * cleared browser without any flag surviving.
   */
  it('never shows it to a player who has found anything', () => {
    expect(shouldShowWelcome({ ready: true, discoveredCount: 1, seen: false })).toBe(false);
    expect(shouldShowWelcome({ ready: true, discoveredCount: 40, seen: false })).toBe(false);
  });

  it('does not show it again once dismissed, while the collection is still empty', () => {
    expect(shouldShowWelcome({ ready: true, discoveredCount: 0, seen: true })).toBe(false);
  });

  /*
   * Before hydration EVERY collection looks empty, so without `ready` a player with forty
   * cards meets a first-run welcome for the length of a load. `FirstFindNote` carries the
   * same note; this is the easiest way to get the gate wrong.
   */
  it('shows nothing at all before the collection has hydrated', () => {
    expect(shouldShowWelcome({ ready: false, discoveredCount: 0, seen: false })).toBe(false);
    expect(shouldShowWelcome({ ready: false, discoveredCount: 40, seen: false })).toBe(false);
    expect(shouldShowWelcome({ ready: false, discoveredCount: 0, seen: true })).toBe(false);
  });

  // A cleared browser loses the flag. Signed out with nothing found, that player genuinely
  // has no progress, so the welcome is correct rather than an interruption.
  it('returns for a cleared browser only when there is also no progress', () => {
    expect(shouldShowWelcome({ ready: true, discoveredCount: 0, seen: false })).toBe(true);
    // Signed in, the server's count suppresses it even with the flag gone.
    expect(shouldShowWelcome({ ready: true, discoveredCount: 12, seen: false })).toBe(false);
  });

  it('is exhaustive over the eight combinations', () => {
    const shown: string[] = [];
    for (const ready of [true, false]) {
      for (const discoveredCount of [0, 3]) {
        for (const seen of [true, false]) {
          if (shouldShowWelcome({ ready, discoveredCount, seen })) {
            shown.push(`${ready}/${discoveredCount}/${seen}`);
          }
        }
      }
    }
    // Exactly one of the eight shows the overlay.
    expect(shown).toEqual(['true/0/false']);
  });
});

describe('the dismissal flag', () => {
  it('starts unset and records a dismissal', () => {
    expect(welcomeSeen('alice')).toBe(false);
    markWelcomeSeen('alice');
    expect(welcomeSeen('alice')).toBe(true);
  });

  it('is idempotent', () => {
    markWelcomeSeen('alice');
    markWelcomeSeen('alice');
    expect(welcomeSeen('alice')).toBe(true);
  });

  /*
   * ACCOUNT-SCOPED, AND THIS REPO HAS SHIPPED THE GLOBAL-KEY BUG TWICE — the local-progress
   * import offer and the Field Card unlock record. Here it would mean one person dismissing
   * the welcome and their partner never seeing it on a shared device.
   */
  it('does not leak between accounts on one device', () => {
    markWelcomeSeen('alice');
    expect(welcomeSeen('bob')).toBe(false);
    expect(welcomeSeen(ANONYMOUS_SCOPE)).toBe(false);
  });

  // The anonymous → account transition: the device flag must not pre-dismiss the new account,
  // and signing in must not resurrect a dismissal that account never made.
  it('keeps the signed-out scope separate from an account', () => {
    markWelcomeSeen(ANONYMOUS_SCOPE);
    expect(welcomeSeen(ANONYMOUS_SCOPE)).toBe(true);
    expect(welcomeSeen('alice')).toBe(false);
  });

  it('writes under the sweepable prefix so account deletion takes it', () => {
    markWelcomeSeen('alice');
    const store = (globalThis as { window?: { localStorage: Storage } }).window!.localStorage;
    const keys = Array.from({ length: store.length }, (_, index) => store.key(index)).filter(
      (key): key is string => key !== null && key.startsWith(WELCOME_STORAGE_KEY),
    );
    expect(keys).toHaveLength(1);
    expect(keys[0]).toContain('alice');
    expect(WELCOME_STORAGE_KEY.startsWith('plantdex.')).toBe(true);
  });

  // Proves the write reached storage rather than only the module's cache: clearing the
  // cache alone would make this pass vacuously.
  it('persists across a cache reset, not just in memory', () => {
    markWelcomeSeen('alice');
    const store = (globalThis as { window?: { localStorage: Storage } }).window!.localStorage;
    expect(store.getItem(`${WELCOME_STORAGE_KEY}:alice`)).toBe('seen');
  });

  it('sweeps every scope when cleared', () => {
    markWelcomeSeen('alice');
    markWelcomeSeen('bob');
    markWelcomeSeen(ANONYMOUS_SCOPE);
    const store = (globalThis as { window?: { localStorage: Storage } }).window!.localStorage;
    expect(store.length).toBe(3);
    clearWelcomeState();
    expect(store.length).toBe(0);
  });

  // Two spellings of the signed-out scope would read one player's flag under another's name.
  it('shares one spelling of the signed-out scope with the unlock record', () => {
    expect(ANONYMOUS_SCOPE).toBe(UNLOCK_SCOPE);
  });
});
