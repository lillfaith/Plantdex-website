'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { resolveRegion, type Region } from './regions';

/**
 * The region a player has chosen, remembered on this device.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * KEYED BY ACCOUNT, NOT BY BROWSER — and this repository has shipped the other version
 * three times.
 *
 * The local-progress import offer used one global key and silently denied itself to every
 * account after the first on a shared device. The Field Card unlock record did the same and
 * handed one player's unlocks to the next. A region is lower stakes than either, but the
 * shape of the bug is identical: two people share a laptop, and the second one's Herbdex
 * quietly filters to a state they have never been to.
 *
 * A signed-out device gets its own scope, which is correct rather than a fallback — signed
 * out, everything else is local too.
 *
 * THE KEY IS UNDER `plantdex.`, so account deletion's prefix sweep takes every scope with
 * it (`delete-account.ts`). A preference that survived account deletion would be a small
 * but real breach of what that button promises.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WHY THERE IS NO SERVER COPY YET. Persisting a region to an account needs a column on
 * `profiles`, which needs a migration, which needs an approved Supabase project. Until
 * then this is device-local and the UI says so. It degrades honestly: a player who signs
 * in on a second device picks their region again, which is one tap, rather than seeing
 * somebody else's.
 *
 * READ THROUGH `useSyncExternalStore`, NOT AN EFFECT. The same mechanism `reveals.ts` and
 * the Herbdex store use: localStorage does not exist during a server render, and a
 * `useState` seeded from an effect both trips React 19's set-state-in-effect rule and
 * renders one frame of the wrong answer first.
 */

export const REGION_STORAGE_KEY = 'plantdex.region.v1';

/** The signed-out scope. A device is a player too. */
export const ANONYMOUS_SCOPE = 'device';

function storageKey(scope: string): string {
  return `${REGION_STORAGE_KEY}:${scope}`;
}

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  /*
   * `storage` fires in OTHER tabs, which is exactly the case worth handling: somebody
   * changes their region in one tab and the board in another must not keep filtering to
   * the old one.
   */
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key.startsWith(REGION_STORAGE_KEY)) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function readRegionId(scope: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(storageKey(scope));
  } catch {
    // Private browsing, blocked site data, a quota error: a missing preference is not an
    // error worth surfacing. The player sees the unfiltered collection, which is the state
    // the app had before regions existed.
    return null;
  }
}

export function readRegion(scope: string): Region | null {
  return resolveRegion(readRegionId(scope));
}

export function writeRegion(scope: string, regionId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (regionId === null) window.localStorage.removeItem(storageKey(scope));
    else window.localStorage.setItem(storageKey(scope), regionId);
  } catch {
    // Same reasoning: a preference that cannot be saved must not break the page that set it.
  }
  emit();
}

/**
 * The chosen region, and a setter.
 *
 * `ready` is separate from `region === null`, because they are different states and the UI
 * must not confuse them: one is "we have not looked yet" and the other is "this player has
 * no region". Rendering the empty state during the server pass would flash "pick a region"
 * at somebody who picked one months ago.
 */
export function useRegion(scope: string = ANONYMOUS_SCOPE): {
  region: Region | null;
  ready: boolean;
  setRegion: (regionId: string | null) => void;
} {
  const storedId = useSyncExternalStore(
    subscribe,
    () => readRegionId(scope),
    // The server knows nothing about this device. `ready` below is what distinguishes that
    // from "chose nothing".
    () => null,
  );
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  const setRegion = useCallback(
    (regionId: string | null) => writeRegion(scope, regionId),
    [scope],
  );

  return { region: resolveRegion(storedId), ready, setRegion };
}
