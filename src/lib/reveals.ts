'use client';

import { useSyncExternalStore } from 'react';

/**
 * Which herbs the player has chosen to *reveal* without discovering them.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REVEAL IS NOT DISCOVERY. This is deliberately a separate store with its own
 * storage key, kept well away from `HerbdexState`:
 *
 *   Reveal   = "I want to read about this plant."   Awards nothing.
 *   Discover = "I actually found this plant."       Awards XP, counts toward the
 *                                                    collection, unlocks the grid card.
 *
 * Keeping them in separate stores means no code path can mistake one for the other —
 * including the server that will own discoveries in V0.3, which must never learn about
 * reveals at all. The Herbdex grid reads only `isDiscovered`, so a revealed-but-not-found
 * herb correctly stays a silhouette there.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const STORAGE_KEY = 'plantdex.reveals.v1';

let cache: Set<string> | null = null;
const listeners = new Set<() => void>();

function read(): Set<string> {
  if (cache) return cache;
  cache = new Set<string>();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const id of parsed) if (typeof id === 'string' && id) cache.add(id);
      }
    }
  } catch {
    // Private mode, blocked storage or malformed JSON: reveals are a convenience, so
    // degrade to "nothing revealed" rather than breaking the page.
  }
  return cache;
}

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...read()]));
  } catch {
    // Non-fatal: the reveal still applies for this session.
  }
}

export function revealHerb(herbId: string): void {
  const set = read();
  if (set.has(herbId)) return;
  set.add(herbId);
  persist();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * True when this herb has been revealed for reading.
 *
 * Always false on the server and on the first client render, so the static HTML never
 * contains revealed content and hydration cannot mismatch.
 */
export function useRevealed(herbId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => read().has(herbId),
    () => false,
  );
}
