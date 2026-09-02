'use client';

import { useSyncExternalStore } from 'react';
import {
  SEED_SHELF_STORAGE_KEY,
  newFind,
  parseFind,
  type NewSeedShelfFind,
  type SeedShelfFind,
} from './seed-shelf';

/**
 * The signed-out Seed Shelf: this browser's own, in localStorage.
 *
 * Same shape as `remote-seed-shelf.ts` so `seed-shelf-store.ts` can swap between them, and
 * the same posture as `sightings.ts`: a synchronous read behind a cache, wrapped so blocked
 * storage degrades to an empty shelf rather than breaking a page.
 *
 * Scanning works signed out (see the `identify-plant` function), so shelving has to as well
 * — otherwise the answer to "this plant isn't in the deck yet" would be "and you cannot keep
 * it either", which is the dead end this feature exists to remove.
 *
 * Finds are stored, not merged entries: same rows as the server holds, so signing in is an
 * import of the same shape rather than a conversion.
 */

let cache: SeedShelfFind[] | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function read(): SeedShelfFind[] {
  if (cache) return cache;
  cache = [];
  try {
    const raw = window.localStorage.getItem(SEED_SHELF_STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cache = parsed.map(parseFind).filter((find): find is SeedShelfFind => find !== null);
      }
    }
  } catch {
    // Private mode, blocked storage or malformed JSON. An empty shelf is the safe reading:
    // nothing is derived from it, so nothing downstream is wrong because of it.
  }
  return cache;
}

function commit(next: SeedShelfFind[]): void {
  cache = next;
  try {
    window.localStorage.setItem(SEED_SHELF_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal: the find still stands for this session.
  }
  emit();
}

/** Every find on this device. Exported for the device export and the sign-in import. */
export function getLocalFinds(): SeedShelfFind[] {
  try {
    return read();
  } catch {
    return [];
  }
}

export function addLocalFind(input: NewSeedShelfFind): SeedShelfFind | null {
  const find = newFind(input);
  if (!find) return null;
  commit([...read(), find]);
  return find;
}

/** Removes every find of one species — the shelf is a species list, so that is the unit. */
export function removeLocalSpecies(speciesKey: string): void {
  commit(read().filter((find) => find.speciesKey !== speciesKey));
}

const EMPTY: SeedShelfFind[] = [];

/** Always empty on the server and on the first client render — no hydration mismatch. */
export function useLocalFinds(): SeedShelfFind[] {
  return useSyncExternalStore(
    subscribe,
    () => read(),
    () => EMPTY,
  );
}
