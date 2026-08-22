'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import type { DiscoveryResult, Herb, HerbdexState } from '@/lib/types';
import { createLocalStorageAdapter, type HerbdexStorage } from '@/lib/storage';
import { progressFromState, type Progress } from '@/lib/progression';
import { masteryTotals, stageFor, type MasteryStage } from '@/lib/mastery';
import { useSightingCounts } from '@/lib/sightings';
import { DECK_SIZE } from '@/lib/deck';
import { createHerbdexStore } from './herbdex-store';

interface HerbdexContextValue {
  state: HerbdexState;
  /** False until the browser's stored collection has been read. */
  ready: boolean;
  progress: Progress;
  discoveredCount: number;
  learnedCount: number;
  masteredCount: number;
  deckSize: number;
  isDiscovered: (herbId: string) => boolean;
  isLearned: (herbId: string) => boolean;
  isMastered: (herbId: string) => boolean;
  /** Which of the three mastery stages a card sits at, or null if undiscovered. */
  stageOf: (herbId: string) => MasteryStage | null;
  /** How many sightings are logged for a species. Drives the mastery predicate. */
  sightingsFor: (herbId: string) => number;
  discover: (herb: Herb) => DiscoveryResult;
  markLearned: (herb: Herb) => DiscoveryResult;
  reset: () => void;
}

const HerbdexContext = createContext<HerbdexContextValue | null>(null);

export function HerbdexProvider({
  children,
  storage,
}: {
  children: React.ReactNode;
  /** Injectable for tests; defaults to localStorage. */
  storage?: HerbdexStorage;
}) {
  // Lazy initializer so the store is built once and stays stable across renders.
  const [store] = useState(() => createHerbdexStore(storage ?? createLocalStorageAdapter()));

  const { state, ready } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const sightingCounts = useSightingCounts();

  /*
   * Mastery is the one stage that depends on a *different* store, so it is reconciled
   * here rather than awarded at a click. Sightings can be added from the journal, from a
   * card page, or (in V0.3) from another device, and this runs after any of them without
   * each of those sites having to remember to award anything.
   *
   * Safe to run on every change: reconcileMastery returns the same state object — and the
   * store writes nothing — unless a card genuinely just qualified, so this cannot loop.
   */
  useEffect(() => {
    store.syncMastery(sightingCounts);
  }, [store, state, sightingCounts]);

  const discover = useCallback((herb: Herb) => store.discover(herb), [store]);
  const markLearned = useCallback((herb: Herb) => store.markLearned(herb), [store]);
  const reset = useCallback(() => store.reset(), [store]);

  const value = useMemo<HerbdexContextValue>(() => {
    const totals = masteryTotals(state);
    return {
      state,
      ready,
      progress: progressFromState(state),
      discoveredCount: totals.discovered,
      learnedCount: totals.learned,
      masteredCount: totals.mastered,
      deckSize: DECK_SIZE,
      isDiscovered: (herbId: string) => Boolean(state.discoveries[herbId]),
      isLearned: (herbId: string) => Boolean(state.learned[herbId]),
      isMastered: (herbId: string) => Boolean(state.mastered[herbId]),
      stageOf: (herbId: string) => stageFor(state, herbId),
      sightingsFor: (herbId: string) => sightingCounts[herbId] ?? 0,
      discover,
      markLearned,
      reset,
    };
  }, [state, ready, sightingCounts, discover, markLearned, reset]);

  return <HerbdexContext.Provider value={value}>{children}</HerbdexContext.Provider>;
}

export function useHerbdex(): HerbdexContextValue {
  const context = useContext(HerbdexContext);
  if (!context) throw new Error('useHerbdex must be used inside <HerbdexProvider>');
  return context;
}
