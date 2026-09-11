'use client';

import { useSyncExternalStore } from 'react';
import { gardenStageIndex, type GardenEntry, type GardenStage } from './garden';

/**
 * WHICH PLANTS GREW SINCE YOU LAST LOOKED AT THEM.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BUG THIS FIXES FIRST. `GrowthSprite` applied `stage-grow` unconditionally, and a page
 * load is a MOUNT — so all 45 plants crossfaded every single time the Garden opened. The
 * comment above it claimed the animation "never fires on an ordinary re-render of a plant that
 * has not moved", which was true and beside the point: nobody re-renders the Garden, they
 * navigate to it. A moment that fires on arrival is not a moment, it is a page transition, and
 * the actual event — a plant advancing — was invisible inside it.
 *
 * So the question is not "did this render" but "did this plant move since the last time we
 * SHOWED it to you", and only the store below can answer that.
 *
 * SESSION-SCOPED, AND DELIBERATELY NOT PERSISTED. `unlocked-field-cards.ts` makes this exact
 * call for `justUnlocked` and documents it: not persisting means a reload shows the new state
 * as simply held rather than re-announcing something won yesterday, while a player still moving
 * around the app sees the moment. The same reasoning applies here, and it buys a great deal —
 * no storage key, no migration, and NO PER-ACCOUNT SCOPING, which the unlock record needed
 * precisely because it persists. Nothing here is written down, so nothing can leak from one
 * account to the next on a shared device.
 *
 * What it catches is the real flow: pass a card's knowledge check, tap Garden. That is a
 * client-side navigation, so this module stays alive across it. What it misses is a hard reload
 * in between, and missing a celebration is the right direction to fail in — the opposite
 * mistake is congratulating somebody for something they did last week.
 *
 * FORWARD ONLY. Mastery never goes backwards, so a plant moving DOWN the ladder is not a plant
 * shrinking; it is the collection changing identity underneath us, which is exactly what
 * signing out mid-session does. That must not read as a reward.
 *
 * REPLACED, NEVER APPENDED, same rule as `justUnlocked`: two advances in one session are two
 * events, and the second should not re-announce the first alongside it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** herbId -> the stage this session last SHOWED the player. */
const shown = new Map<string, GardenStage>();

let justAdvanced: readonly string[] = [];

const listeners = new Set<() => void>();
const EMPTY: readonly string[] = Object.freeze([]);

/** Cached so `useSyncExternalStore` sees a stable value between unrelated renders. */
let snapshot: readonly string[] = EMPTY;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Record what the Garden is about to show, and report which plants that is news for.
 *
 * Called from an effect rather than during render: it mutates module state, and doing that
 * while rendering makes the component impure and fires twice under StrictMode. Returning the
 * fresh ids as well as publishing them keeps it testable without rendering anything.
 */
export function recordStages(entries: readonly GardenEntry[]): string[] {
  const fresh: string[] = [];

  for (const entry of entries) {
    const previous = shown.get(entry.herbId);
    // An id we have never shown is NOT an advance. This is the whole of the arrival fix: on
    // the first visit of a session every plant is unknown, so nothing is announced.
    if (previous !== undefined && gardenStageIndex(entry.stage) > gardenStageIndex(previous)) {
      fresh.push(entry.herbId);
    }
    shown.set(entry.herbId, entry.stage);
  }

  if (fresh.length > 0) {
    justAdvanced = fresh;
    snapshot = justAdvanced;
    for (const listener of listeners) listener();
  }
  return fresh;
}

/** Stop announcing the current batch, once it has been on screen long enough to be seen. */
export function clearAdvanced(): void {
  if (justAdvanced.length === 0) return;
  justAdvanced = EMPTY;
  snapshot = EMPTY;
  for (const listener of listeners) listener();
}

/** The ids the Garden should be celebrating right now. */
export function advancedNow(): readonly string[] {
  return snapshot;
}

/** Subscribe a component to the current batch. */
export function useGardenMoments(): readonly string[] {
  return useSyncExternalStore(subscribe, advancedNow, () => EMPTY);
}

/** Testing only. A session boundary is the only thing that clears the map in real use. */
export function resetGardenMoments(): void {
  shown.clear();
  justAdvanced = EMPTY;
  snapshot = EMPTY;
  for (const listener of listeners) listener();
}
