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
import {
  buildWorld,
  localDateKey,
  researchTaskById,
  STANDING_TASKS,
  type ResearchTask,
  type ResearchWorld,
} from '@/lib/research';
import { clearBoard, refreshBoard, useResearchBoard } from '@/lib/research-board';
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
  /** The snapshot every research task measures itself against. */
  world: ResearchWorld;
  /** Today's open daily board, already resolved to tasks. */
  dailyTasks: ResearchTask[];
  /** Seasonal and collection challenges. Always available; none of them expire. */
  standingTasks: readonly ResearchTask[];
  completedResearchCount: number;
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
  const boardIds = useResearchBoard();

  const world = useMemo(() => buildWorld(state, sightingCounts), [state, sightingCounts]);

  const dailyTasks = useMemo(
    () =>
      boardIds
        .map((id) => researchTaskById(id))
        .filter((task): task is ResearchTask => task !== undefined),
    [boardIds],
  );

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

  /*
   * Field Research, same pattern and for the same reason.
   *
   * The board is topped up first so a task offered today can complete today. Both calls
   * write only when something actually changed, which is what stops this from looping —
   * and `localDateKey()` is read here, inside an effect, so the static export never bakes
   * in a date and the server and first client render always agree.
   */
  useEffect(() => {
    if (!ready) return;
    refreshBoard(world, localDateKey());
    store.syncResearch(world, [...STANDING_TASKS, ...dailyTasks]);
  }, [store, ready, world, dailyTasks]);

  const discover = useCallback((herb: Herb) => store.discover(herb), [store]);
  const markLearned = useCallback((herb: Herb) => store.markLearned(herb), [store]);
  const reset = useCallback(() => {
    store.reset();
    // The board is a separate store, so resetting progress has to clear it too — otherwise
    // yesterday's tasks survive a reset and instantly re-complete.
    clearBoard();
  }, [store]);

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
      world,
      dailyTasks,
      standingTasks: STANDING_TASKS,
      // Counts only ids that resolve to real tasks — the same guard XP applies, so a
      // stale id from a removed task is not counted as an achievement either.
      completedResearchCount: Object.keys(state.research).filter((id) =>
        Boolean(researchTaskById(id)),
      ).length,
      discover,
      markLearned,
      reset,
    };
  }, [state, ready, sightingCounts, world, dailyTasks, discover, markLearned, reset]);

  return <HerbdexContext.Provider value={value}>{children}</HerbdexContext.Provider>;
}

export function useHerbdex(): HerbdexContextValue {
  const context = useContext(HerbdexContext);
  if (!context) throw new Error('useHerbdex must be used inside <HerbdexProvider>');
  return context;
}
