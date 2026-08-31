'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { DiscoveryResult, Herb, HerbdexState } from '@/lib/types';
import { createLocalStorageAdapter, type HerbdexStorage } from '@/lib/storage';
import { createRemoteHerbdexStorage } from '@/lib/remote-herbdex-storage';
import { useAuth } from './AuthProvider';
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
import { useSightingCounts } from '@/lib/sightings-store';
import { DECK_SIZE } from '@/lib/deck';
import { discoveryEvent, researchEvent, track } from '@/lib/analytics';
import { researchKindFromId } from '@/lib/progression';
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
  const { user } = useAuth();
  const userId = user?.id;

  /*
   * A fresh store per (storage prop, signed-in user id). Signing in or out swaps which
   * adapter backs the collection, which is exactly the kind of change `useSyncExternalStore`
   * expects to react to: a new `store.subscribe` reference makes React tear down the old
   * subscription and hydrate the new one. `storage` stays the test-only escape hatch it
   * always was — passing it opts out of the auth-based adapter choice entirely.
   *
   * Known limitation: on first paint, before Supabase's own session check resolves,
   * `userId` reads as signed-out and this briefly mounts the local adapter even for
   * someone who turns out to be signed in — it swaps to the remote adapter the moment
   * `useAuth()` reports the real session. A short loading flash on load, not a data bug.
   */
  const store = useMemo(
    () =>
      createHerbdexStore(
        storage ?? (userId ? createRemoteHerbdexStorage(userId) : createLocalStorageAdapter()),
      ),
    [storage, userId],
  );

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
   * Mastery and Field Research completion both depend on state outside `state` itself
   * (sighting counts, and — when signed in — a server that re-derives both from its own
   * rows), so they are reconciled here rather than awarded at a click. Sightings can be
   * added from the journal, from a card page, or from another signed-in device, and this
   * runs after any of them without each of those sites having to remember to award
   * anything.
   *
   * The board is topped up first so a task offered today can complete today.
   * `store.reconcile` writes only when something actually changed (or, signed in, when
   * the server says something did), which is what stops this from looping — and
   * `localDateKey()` is read here, inside an effect, so the static export never bakes in a
   * date and the server and first client render always agree.
   */
  useEffect(() => {
    if (!ready) return;
    refreshBoard(world, localDateKey());
    void store.reconcile(world, [...STANDING_TASKS, ...dailyTasks]).then((outcome) => {
      /*
       * Research completes by reconciliation rather than by a click, so this is the only
       * place it can be observed. Only the KIND travels — daily, collection or seasonal —
       * because which specific task somebody finished is not a launch question, and the id
       * would name the card in a daily.
       */
      for (const taskId of outcome.completedResearchIds) {
        const kind = researchKindFromId(taskId);
        if (kind) track(researchEvent(kind));
      }
    });
  }, [store, ready, world, dailyTasks]);

  /*
   * ANALYTICS HANGS OFF THE PROVIDER, not off buttons.
   *
   * Every discovery in the app goes through this one function, so measuring here catches
   * the locked page, the revealed page and any future entry point without each of them
   * having to remember. It also means a component can never send a discovery event for a
   * discovery that did not actually happen: `awarded` is false on a repeat, and a repeat
   * pays nothing.
   */
  const discover = useCallback(
    (herb: Herb) => {
      const result = store.discover(herb);
      if (result.awarded) {
        // First-ever discovery is the activation moment, and the only split worth a
        // separate goal. Which plant it was comes from the page the discovery happened on.
        track(discoveryEvent(Object.keys(store.getSnapshot().state.discoveries).length === 1));
      }
      return result;
    },
    [store],
  );
  const markLearned = useCallback(
    (herb: Herb) => {
      const result = store.markLearned(herb);
      if (result.awarded) track('knowledge_check_passed');
      return result;
    },
    [store],
  );
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
