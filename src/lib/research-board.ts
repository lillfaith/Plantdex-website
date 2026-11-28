'use client';

import { useSyncExternalStore } from 'react';
import { ANONYMOUS_SCOPE } from './unlocked-field-cards';
import { DAILY_BOARD_SIZE, pickDailyTasks, type ResearchWorld } from './research';

/**
 * The open daily-research board.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS NOT PART OF HerbdexState
 *
 * Being *offered* a task awards nothing. `HerbdexState` holds only records XP is derived
 * from, plus achievements — the same reasoning that keeps reveals.ts out of it. This is a
 * scratchpad of "what am I being nudged towards", and the V0.3 server has no need to own
 * it. Completions, which DO pay, live in `HerbdexState.research`.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The board rotates without ever expiring. It tops up once per local day, and a task that
 * has been offered stays open until it is done — so skipping a week costs nothing, there
 * is no streak to break, and no countdown anywhere. It also refills only on a NEW day, not
 * the instant a task is finished, which is what keeps it a daily nudge rather than a
 * treadmill you can grind.
 *
 * KEYED BY ACCOUNT. The board is picked from one player's own progress (a task is only
 * offered while it is unsatisfied), so a single device-wide entry handed account A's picks to
 * account B on a shared browser — including dailies B had already satisfied, which then paid
 * at once — and B's completions pruned A's board. Same shape and same fix as
 * `unlocked-field-cards.ts`: one key per scope, `ANONYMOUS_SCOPE` for signed-out, and a
 * per-scope cache so switching accounts in one session cannot show the previous one's tasks.
 * The legacy un-scoped key is adopted by the signed-out scope only, never by an account.
 */

/** Prefix every scope's key shares; starts with `plantdex.` so account deletion's sweep takes all. */
export const RESEARCH_BOARD_STORAGE_KEY = 'plantdex.research-board.v1';

/** The pre-scoping key. Read once into the signed-out scope, never into an account. */
export const LEGACY_RESEARCH_BOARD_KEY = RESEARCH_BOARD_STORAGE_KEY;

export { ANONYMOUS_SCOPE };

export function boardStorageKey(scope: string): string {
  return `${RESEARCH_BOARD_STORAGE_KEY}:${scope}`;
}

interface BoardState {
  /** Local date key of the last top-up, or null if never filled. */
  lastFilled: string | null;
  /** Task ids currently offered and not yet completed. */
  open: string[];
}

const EMPTY_OPEN: readonly string[] = Object.freeze([]);

/** One cached board per scope; never a single slot, so scopes cannot bleed into each other. */
const caches = new Map<string, BoardState>();

/**
 * Scopes whose board the SERVER decided this session. Session-only on purpose: it is the
 * provider's job to call `setServerBoard` again after a reload, and until it does the stored
 * list is simply the last server answer, which `refreshBoard` may not top up either way
 * for a signed-in scope (the caller only uses `refreshBoard` for the signed-out scope).
 */
const serverScopes = new Set<string>();
const listeners = new Set<() => void>();

function parse(raw: string | null): BoardState | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const entry = parsed as Record<string, unknown>;
    const open = Array.isArray(entry.open)
      ? entry.open.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];
    return { lastFilled: typeof entry.lastFilled === 'string' ? entry.lastFilled : null, open };
  } catch {
    return null;
  }
}

function persist(scope: string, state: BoardState): void {
  try {
    window.localStorage.setItem(boardStorageKey(scope), JSON.stringify(state));
  } catch {
    // Non-fatal; the board still applies for this session.
  }
}

function read(scope: string): BoardState {
  const hit = caches.get(scope);
  if (hit) return hit;
  let board: BoardState = { lastFilled: null, open: [] };
  try {
    const stored = parse(window.localStorage.getItem(boardStorageKey(scope)));
    if (stored) {
      board = stored;
    } else if (scope === ANONYMOUS_SCOPE) {
      // One-time adoption of the old device-wide board, by the signed-out scope ONLY. An
      // account scope must never inherit it: nobody can say whose progress it was picked from.
      const legacy = parse(window.localStorage.getItem(LEGACY_RESEARCH_BOARD_KEY));
      if (legacy) {
        board = legacy;
        persist(scope, board);
        window.localStorage.removeItem(LEGACY_RESEARCH_BOARD_KEY);
      }
    }
  } catch {
    // Blocked storage: an empty board is a fine place to start.
  }
  caches.set(scope, board);
  return board;
}

function commit(scope: string, next: BoardState): void {
  caches.set(scope, next);
  persist(scope, next);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Bring `scope`'s board up to date: drop anything that has been completed, and top up to
 * size once per local day. Touches no other scope.
 *
 * Safe to call on every render. It writes and notifies ONLY when something actually
 * changed, which is what stops the effect that calls it from looping.
 */
export function refreshBoard(
  world: ResearchWorld,
  dateKey: string,
  scope: string = ANONYMOUS_SCOPE,
): void {
  // The server owns a server board: the client must never top it up with its own picks.
  if (serverScopes.has(scope)) return;
  const board = read(scope);
  const completed = world.state.research;
  const isNewDay = board.lastFilled !== dateKey;

  // A task finished today STAYS on the board, ticked, until tomorrow's top-up clears it.
  // Removing it the instant it completes is tidier but worse: the player never sees the
  // thing they just did get marked done, and the board silently shrinks instead.
  if (!isNewDay) return;

  const open = board.open.filter((id) => !completed[id]);
  const exclude = new Set<string>([...open, ...Object.keys(completed)]);
  const picks =
    open.length < DAILY_BOARD_SIZE
      ? pickDailyTasks(world, dateKey, exclude, DAILY_BOARD_SIZE - open.length)
      : [];

  const next: BoardState = {
    lastFilled: dateKey,
    open: [...open, ...picks.map((task) => task.id)],
  };

  const unchanged =
    next.lastFilled === board.lastFilled &&
    next.open.length === board.open.length &&
    next.open.every((id, index) => id === board.open[index]);

  if (unchanged) return;
  commit(scope, next);
}

/** Task ids on `scope`'s board. Empty on the server and on the first client render. */
export function useResearchBoard(scope: string = ANONYMOUS_SCOPE): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => read(scope).open,
    () => EMPTY_OPEN,
  );
}

/** Testing and "reset my progress" only. Clears one scope; every other player's board stays. */
export function clearBoard(scope: string = ANONYMOUS_SCOPE): void {
  commit(scope, { lastFilled: null, open: [] });
}

/** Testing only: forget every in-memory board so the next read goes back to storage. */
export function resetBoardCacheForTests(): void {
  caches.clear();
  serverScopes.clear();
}

/** Non-hook read of `scope`'s open task ids (tests, and callers outside React). */
export function boardIds(scope: string = ANONYMOUS_SCOPE): readonly string[] {
  return read(scope).open;
}

/**
 * SIGNED-IN PATH: the server decides the board.
 *
 * Replaces `scope`'s open list with exactly `ids` (only non-strings and empty strings are
 * dropped; nothing is validated against the client's own picks) and stamps `lastFilled` with
 * `boardDay`. From then on `refreshBoard` is a no-op for this scope for the session.
 *
 * `boardDay` is the server's board day: a UTC date string `YYYY-MM-DD`. The local-date key
 * (`localDateKey()`) remains only for the signed-out scope's own top-up.
 */
export function setServerBoard(scope: string, ids: readonly string[], boardDay: string): void {
  const open = ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
  serverScopes.add(scope);
  const board = read(scope);
  if (
    board.lastFilled === boardDay &&
    board.open.length === open.length &&
    board.open.every((id, index) => id === open[index])
  ) {
    return;
  }
  commit(scope, { lastFilled: boardDay, open });
}

/** True once `setServerBoard` has been called for `scope` this session. */
export function isServerBoard(scope: string): boolean {
  return serverScopes.has(scope);
}
