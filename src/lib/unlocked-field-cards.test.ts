import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ANONYMOUS_SCOPE,
  FIELD_CARD_UNLOCKS_STORAGE_KEY,
  clearFieldCardUnlocks,
  fieldCardUnlockState,
  recordUnlocks,
  resolveUnlocked,
  unlockedAt,
} from './unlocked-field-cards';
import { FIELD_CARD_SLOTS } from './field-cards';

/**
 * THE UNLOCK RECORD, ATTACKED FROM THE FOUR DIRECTIONS IT HAS TO SURVIVE.
 *
 * Refresh, a second account on the same device, an XP formula that moves downwards, and the
 * announcement firing more than once. Each is a separate `describe` because each has a
 * different failure and conflating them is how one of them stops being checked.
 */

/** The smallest localStorage that behaves like the real one, including the SSR-less case. */
function fakeWindow(): { store: Map<string, string> } {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    // `clearFieldCardUnlocks` sweeps by prefix via Object.keys(localStorage), so the fake
    // has to expose its keys as own enumerable properties the way the real one does.
    get length() {
      return store.size;
    },
  };
  const proxy = new Proxy(localStorage, {
    ownKeys: () => [...store.keys()],
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
  (globalThis as { window?: unknown }).window = { localStorage: proxy };
  return { store };
}

const XP = Object.fromEntries(FIELD_CARD_SLOTS.map((slot) => [slot.ordinal, slot.xp]));

let store: Map<string, string>;

beforeEach(() => {
  ({ store } = fakeWindow());
  clearFieldCardUnlocks();
});

afterEach(() => {
  clearFieldCardUnlocks();
  delete (globalThis as { window?: unknown }).window;
});

describe('persistence across a refresh', () => {
  it('writes the record under the scope it was earned in, and reads it back', () => {
    recordUnlocks(XP[1]!, 'user-a', '2026-01-01T00:00:00.000Z');
    expect(store.get(`${FIELD_CARD_UNLOCKS_STORAGE_KEY}:user-a`)).toBe(
      JSON.stringify({ '1': '2026-01-01T00:00:00.000Z' }),
    );
  });

  it('needs no record at all to survive a reload, because the set is derived from XP', () => {
    /*
     * The point of the whole design: nothing was stored, and the cards are still held. A
     * reload, a sync and a new phone all arrive here, because XP is already synced.
     */
    expect(resolveUnlocked(XP[2]!, {}).map((slot) => slot.ordinal)).toEqual([1, 2]);
  });
});

describe('the record belongs to an account, not to a browser', () => {
  it('does not hand one player unlocks to the next account on the same device', () => {
    recordUnlocks(XP[2]!, 'user-a', '2026-01-01T00:00:00.000Z');

    /*
     * A different account, no XP. Asserted on the HELD SET, which is what the panel renders:
     * `recordUnlocks` returns [] here whatever the key is (no threshold was crossed at 0 XP),
     * so checking its return value would pass under the global key this guards against and
     * prove nothing. The ratchet grants cards the current XP does not — a global key would
     * have shown this player 2 / 9 on a brand-new account.
     */
    expect(recordUnlocks(0, 'user-b', '2026-01-02T00:00:00.000Z')).toEqual([]);
    expect(resolveUnlocked(0, fieldCardUnlockState('user-b').record)).toEqual([]);
    expect(store.has(`${FIELD_CARD_UNLOCKS_STORAGE_KEY}:user-b`)).toBe(false);
  });

  it('gives a signed-out device a scope of its own, not an account\u2019s', () => {
    recordUnlocks(XP[1]!, ANONYMOUS_SCOPE, '2026-01-01T00:00:00.000Z');
    expect(store.has(`${FIELD_CARD_UNLOCKS_STORAGE_KEY}:${ANONYMOUS_SCOPE}`)).toBe(true);
    expect(store.has(`${FIELD_CARD_UNLOCKS_STORAGE_KEY}:user-a`)).toBe(false);
  });

  it('takes every scope on the device when an account is deleted', () => {
    recordUnlocks(XP[1]!, 'user-a', '2026-01-01T00:00:00.000Z');
    recordUnlocks(XP[1]!, ANONYMOUS_SCOPE, '2026-01-01T00:00:00.000Z');
    clearFieldCardUnlocks();
    expect([...store.keys()].filter((key) => key.startsWith(FIELD_CARD_UNLOCKS_STORAGE_KEY))).toEqual(
      [],
    );
  });
});

describe('the ratchet', () => {
  it('keeps a card an XP formula change would otherwise take back', () => {
    recordUnlocks(XP[2]!, 'user-a', '2026-01-01T00:00:00.000Z');
    const record = JSON.parse(store.get(`${FIELD_CARD_UNLOCKS_STORAGE_KEY}:user-a`)!) as Record<
      string,
      string
    >;
    // XP recomputed to zero. Nothing in Plantdex has ever revoked something a player earned.
    expect(resolveUnlocked(0, record).map((slot) => slot.ordinal)).toEqual([1, 2]);
  });

  it('never moves the date a card was first reached', () => {
    recordUnlocks(XP[1]!, 'user-a', '2026-01-01T00:00:00.000Z');
    recordUnlocks(XP[2]!, 'user-a', '2026-06-06T00:00:00.000Z');
    const record = JSON.parse(store.get(`${FIELD_CARD_UNLOCKS_STORAGE_KEY}:user-a`)!) as Record<
      string,
      string
    >;
    expect(unlockedAt(1, record)).toBe('2026-01-01T00:00:00.000Z');
    expect(unlockedAt(2, record)).toBe('2026-06-06T00:00:00.000Z');
  });
});

describe('"new" means the crossing that just happened', () => {
  it('announces only the slots of the latest crossing, not every slot of the session', () => {
    recordUnlocks(XP[1]!, 'user-a');
    expect(fieldCardUnlockState('user-a').justUnlocked).toEqual([1]);
    /*
     * THE BUG THIS PINS, and it is read off the state a component would render rather than
     * off the return value — which was only ever the fresh slots, so it could not have
     * caught this. A player who crosses 600 and then 1,200 in one sitting must see Cattail
     * announced, not Coneflower announced a second time beside it.
     */
    recordUnlocks(XP[2]!, 'user-a');
    expect(fieldCardUnlockState('user-a').justUnlocked).toEqual([2]);
  });

  it('announces both when one XP gain crosses two thresholds, because that is one event', () => {
    recordUnlocks(XP[3]!, 'user-a');
    expect(fieldCardUnlockState('user-a').justUnlocked).toEqual([1, 2, 3]);
  });

  it('says nothing on a repeat, which is what stops the reveal firing twice', () => {
    recordUnlocks(XP[1]!, 'user-a');
    expect(recordUnlocks(XP[1]!, 'user-a')).toEqual([]);
    // And the announcement from the real crossing is still standing, not cleared by the
    // no-op: a player reading the page must not have it vanish under them.
    expect(fieldCardUnlockState('user-a').justUnlocked).toEqual([1]);
  });

  it('drops the previous account\u2019s announcement when a different scope is read', () => {
    recordUnlocks(XP[1]!, 'user-a');
    expect(fieldCardUnlockState('user-b').justUnlocked).toEqual([]);
  });
});

describe('the panel is bound to the account, not to the device', () => {
  it('passes a scope to the store rather than taking the default', () => {
    /*
     * Read from the source because the default argument makes the mistake invisible:
     * `useFieldCardUnlocks()` compiles, type-checks and renders — it just reads the
     * signed-out device's record while somebody is signed in, which is the exact failure
     * the per-account key exists to prevent.
     */
    const source = readFileSync('src/components/research/FieldCardReward.tsx', 'utf8');
    expect(source).toMatch(/useFieldCardUnlocks\(scope\)/);
    expect(source).toMatch(/recordUnlocks\(progress\.xp, scope\)/);
    expect(source).toMatch(/const scope = user\?\.id \?\? ANONYMOUS_SCOPE/);
  });
});
