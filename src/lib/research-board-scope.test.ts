import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ANONYMOUS_SCOPE,
  LEGACY_RESEARCH_BOARD_KEY,
  RESEARCH_BOARD_STORAGE_KEY,
  boardIds,
  boardStorageKey,
  clearBoard,
  refreshBoard,
  resetBoardCacheForTests,
} from './research-board';
import { applyDiscovery } from './herbdex-reducer';
import { buildWorld, DAILY_BOARD_SIZE } from './research';
import { PRINTED_CARDS } from './deck';
import { emptyState } from './storage';

const at = '2026-01-01T00:00:00.000Z';
const DAY = '2026-11-28';

function fakeWindow(): Map<string, string> {
  const store = new Map<string, string>();
  const ls = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  (globalThis as { window?: unknown }).window = { localStorage: ls };
  return store;
}

/** A player who has discovered the first ten cards, so learn/revisit/master dailies are possible. */
function veteran() {
  let state = emptyState();
  for (const card of PRINTED_CARDS.slice(0, 10)) state = applyDiscovery(state, card.id, at).state;
  return buildWorld(state, {});
}
const newcomer = () => buildWorld(emptyState(), {});

let store: Map<string, string>;
beforeEach(() => {
  store = fakeWindow();
  resetBoardCacheForTests();
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe('research board scoping', () => {
  it('REPRODUCES THE LEAK: account B never sees the tasks picked for account A', () => {
    refreshBoard(veteran(), DAY, 'user-a');
    const a = [...boardIds('user-a')];
    expect(a).toHaveLength(DAILY_BOARD_SIZE);
    // B signs in on the same browser in the same session.
    expect(boardIds('user-b')).toEqual([]);
    refreshBoard(newcomer(), DAY, 'user-b');
    // B's board is built from B's world: only "find" tasks exist for a player with nothing.
    expect(boardIds('user-b').every((id) => id.startsWith('daily:find:'))).toBe(true);
    expect(boardIds('user-a')).toEqual(a);
  });

  it('keeps each scope in its own storage key', () => {
    refreshBoard(veteran(), DAY, 'user-a');
    refreshBoard(newcomer(), DAY);
    expect(store.has(boardStorageKey('user-a'))).toBe(true);
    expect(store.has(boardStorageKey(ANONYMOUS_SCOPE))).toBe(true);
    expect(store.has(RESEARCH_BOARD_STORAGE_KEY)).toBe(false);
    expect(boardStorageKey('user-a')).not.toBe(boardStorageKey(ANONYMOUS_SCOPE));
  });

  it("B's completions and refresh never mutate A's board", () => {
    refreshBoard(veteran(), DAY, 'user-a');
    const before = store.get(boardStorageKey('user-a'));
    const idsA = [...boardIds('user-a')];
    // B has completed every one of A's tasks and moves to a new day.
    const research = Object.fromEntries(idsA.map((id) => [id, at]));
    const w = buildWorld({ ...emptyState(), research }, {});
    refreshBoard(w, '2026-11-29', 'user-b');
    expect(boardIds('user-a')).toEqual(idsA);
    expect(store.get(boardStorageKey('user-a'))).toBe(before);
  });

  it('switching scope in one session shows only that scope, and survives a cold reload', () => {
    refreshBoard(veteran(), DAY, 'user-a');
    refreshBoard(newcomer(), DAY, 'user-b');
    const a = [...boardIds('user-a')];
    const b = [...boardIds('user-b')];
    expect(a).not.toEqual(b);
    resetBoardCacheForTests();
    expect(boardIds('user-a')).toEqual(a);
    expect(boardIds('user-b')).toEqual(b);
  });

  it('reset clears one scope only', () => {
    refreshBoard(veteran(), DAY, 'user-a');
    refreshBoard(veteran(), DAY, 'user-b');
    const b = [...boardIds('user-b')];
    clearBoard('user-a');
    expect(boardIds('user-a')).toEqual([]);
    expect(boardIds('user-b')).toEqual(b);
  });
});

describe('legacy un-scoped key', () => {
  const legacy = JSON.stringify({ lastFilled: DAY, open: ['daily:find:taraxacum-officinale'] });

  it('is adopted by the signed-out scope once, then removed', () => {
    store.set(LEGACY_RESEARCH_BOARD_KEY, legacy);
    expect(boardIds(ANONYMOUS_SCOPE)).toEqual(['daily:find:taraxacum-officinale']);
    expect(store.has(LEGACY_RESEARCH_BOARD_KEY)).toBe(false);
    expect(store.has(boardStorageKey(ANONYMOUS_SCOPE))).toBe(true);
  });

  it('is never handed to an account, even one reading first', () => {
    store.set(LEGACY_RESEARCH_BOARD_KEY, legacy);
    expect(boardIds('user-a')).toEqual([]);
    expect(store.get(LEGACY_RESEARCH_BOARD_KEY)).toBe(legacy);
    // The device scope can still adopt it afterwards.
    expect(boardIds(ANONYMOUS_SCOPE)).toEqual(['daily:find:taraxacum-officinale']);
    expect(boardIds('user-a')).toEqual([]);
  });

  it('does not overwrite an existing device board', () => {
    store.set(boardStorageKey(ANONYMOUS_SCOPE), JSON.stringify({ lastFilled: DAY, open: ['daily:find:x'] }));
    store.set(LEGACY_RESEARCH_BOARD_KEY, legacy);
    expect(boardIds(ANONYMOUS_SCOPE)).toEqual(['daily:find:x']);
  });
});

describe('account deletion coverage', () => {
  it('every scoped key starts with the plantdex. prefix the deletion sweep removes', () => {
    expect(boardStorageKey('any-user-id').startsWith('plantdex.')).toBe(true);
    const source = readFileSync('src/lib/delete-account.ts', 'utf8');
    expect(source).toContain("key.startsWith('plantdex.')");
  });
});
