import type { DiscoveryResult, Herb, HerbdexState } from '@/lib/types';
import {
  applyDiscovery,
  applyLearned,
  reconcileAchievements,
  reconcileMastery,
} from '@/lib/herbdex-reducer';
import { emptyState, type HerbdexStorage } from '@/lib/storage';

/**
 * An external store wrapping the storage adapter, shaped for `useSyncExternalStore`.
 *
 * Browser storage genuinely *is* an external system, so this is the primitive React
 * provides for it: no effect, no setState-during-effect, and no hydration mismatch —
 * `getServerSnapshot` returns the empty state that the server rendered, and the store
 * swaps in the real collection when the first subscriber attaches on the client.
 *
 * Kept free of React so it can be unit-tested directly.
 */

export interface HerbdexSnapshot {
  state: HerbdexState;
  /** False until the browser's stored collection has been read. */
  ready: boolean;
}

export interface HerbdexStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => HerbdexSnapshot;
  getServerSnapshot: () => HerbdexSnapshot;
  discover: (herb: Herb) => DiscoveryResult;
  /** Stage 2: record that the card's knowledge check was passed. */
  markLearned: (herb: Herb) => DiscoveryResult;
  /**
   * Stage 3: award mastery to every card that now qualifies, given current sighting
   * counts. Safe to call on every render — it writes nothing when nothing changed.
   * Returns the ids that were newly mastered so the caller can celebrate them.
   */
  syncMastery: (sightingCounts: Record<string, number>) => string[];
  reset: () => void;
}

const NO_DISCOVERY: DiscoveryResult = {
  awarded: false,
  xpAwarded: 0,
  newAchievementIds: [],
};

export function createHerbdexStore(adapter: HerbdexStorage): HerbdexStore {
  // Frozen constant: `getServerSnapshot` must return a stable reference every call or
  // React will loop.
  const emptySnapshot: HerbdexSnapshot = Object.freeze({
    state: emptyState(),
    ready: false,
  });

  let snapshot: HerbdexSnapshot = emptySnapshot;
  let hydrated = false;
  const listeners = new Set<() => void>();

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function commit(state: HerbdexState): void {
    snapshot = { state, ready: true };
    adapter.save(state);
    emit();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);

      // First subscription happens on the client after mount, which is where reading
      // storage belongs. Reconciling on load retroactively unlocks achievements added
      // since the player's last visit.
      if (!hydrated) {
        hydrated = true;
        const loaded = reconcileAchievements(adapter.load());
        snapshot = { state: loaded, ready: true };
        adapter.save(loaded);
        emit();
      }

      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot: () => snapshot,
    getServerSnapshot: () => emptySnapshot,

    discover(herb) {
      const outcome = applyDiscovery(snapshot.state, herb.id);
      // Already discovered, or an unknown id: nothing is written and nothing is awarded.
      if (!outcome.result.awarded) return NO_DISCOVERY;
      commit(outcome.state);
      return outcome.result;
    },

    markLearned(herb) {
      const outcome = applyLearned(snapshot.state, herb.id);
      // Already learned, not yet discovered, or an unknown id: nothing is awarded.
      if (!outcome.result.awarded) return NO_DISCOVERY;
      commit(outcome.state);
      return outcome.result;
    },

    syncMastery(sightingCounts) {
      // Before hydration the snapshot is the empty state, and committing it would
      // overwrite the player's stored collection with nothing.
      if (!snapshot.ready) return [];
      const outcome = reconcileMastery(snapshot.state, sightingCounts);
      if (outcome.masteredIds.length === 0) return [];
      commit(outcome.state);
      return outcome.masteredIds;
    },

    reset() {
      commit(emptyState());
    },
  };
}
