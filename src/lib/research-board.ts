'use client';

import { useSyncExternalStore } from 'react';
import type { HerbdexState } from './types';
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
 */

const STORAGE_KEY = 'plantdex.research-board.v1';

interface BoardState {
  /** Local date key of the last top-up, or null if never filled. */
  lastFilled: string | null;
  /** Task ids currently offered and not yet completed. */
  open: string[];
}

const EMPTY_OPEN: readonly string[] = Object.freeze([]);

let cache: BoardState | null = null;
const listeners = new Set<() => void>();

function read(): BoardState {
  if (cache) return cache;
  cache = { lastFilled: null, open: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const entry = parsed as Record<string, unknown>;
        const open = Array.isArray(entry.open)
          ? entry.open.filter((id): id is string => typeof id === 'string' && id.length > 0)
          : [];
        cache = {
          lastFilled: typeof entry.lastFilled === 'string' ? entry.lastFilled : null,
          open,
        };
      }
    }
  } catch {
    // Blocked storage or malformed JSON: an empty board is a fine place to start.
  }
  return cache;
}

function commit(next: BoardState): void {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal; the board still applies for this session.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Bring the board up to date: drop anything that has been completed, and top up to size
 * once per local day.
 *
 * Safe to call on every render. It writes and notifies ONLY when something actually
 * changed, which is what stops the effect that calls it from looping.
 */
export function refreshBoard(world: ResearchWorld, dateKey: string): void {
  const board = read();
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
  commit(next);
}

/** Task ids currently on the board. Empty on the server and on the first client render. */
export function useResearchBoard(): readonly string[] {
  return useSyncExternalStore(
    subscribe,
    () => read().open,
    () => EMPTY_OPEN,
  );
}

/** Testing and "reset my progress" only. */
export function clearBoard(): void {
  commit({ lastFilled: null, open: [] });
}

/** Drop board entries for tasks recorded as complete. Used when state is reset. */
export function pruneBoard(state: HerbdexState): void {
  const board = read();
  const open = board.open.filter((id) => !state.research[id]);
  if (open.length === board.open.length) return;
  commit({ ...board, open });
}
