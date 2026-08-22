import type { DiscoveryResult, Herb, HerbdexState } from '@/lib/types';
import {
  applyDiscovery,
  applyLearned,
  reconcileAchievements,
  reconcileMastery,
  reconcileResearch,
} from '@/lib/herbdex-reducer';
import { buildWorld, type ResearchTask, type ResearchWorld } from '@/lib/research';
import { emptyState, type HerbdexStorage, type ReconcileOutcome } from '@/lib/storage';

/**
 * An external store wrapping the storage adapter, shaped for `useSyncExternalStore`.
 *
 * Browser storage genuinely *is* an external system, so this is the primitive React
 * provides for it: no effect, no setState-during-effect, and no hydration mismatch —
 * `getServerSnapshot` returns the empty state that the server rendered, and the store
 * swaps in the real collection when the first subscriber attaches on the client.
 *
 * Hydration is async (`adapter.load()` returns a `Promise`) because V0.3 added a
 * network-backed adapter alongside the local one. Every mutating method below still runs
 * synchronously against the in-memory snapshot and requires `ready` first — before
 * hydration resolves there is nothing real to mutate, and acting on the placeholder empty
 * state would be silently discarded the instant hydration's own load resolves and replaces
 * it. Persisting is still fire-and-forget (`adapter.save`), same as before V0.3.
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
   * Award mastery and Field Research completions together — stage 3 and every active
   * task. Safe to call whenever the world changes; it writes nothing when nothing
   * qualifies. When the adapter has a server to defer to (`adapter.reconcile`), the
   * server's answer is authoritative and this reloads it rather than trusting a locally
   * computed guess; otherwise it runs the same reducer locally, exactly as before V0.3.
   */
  reconcile: (world: ResearchWorld, activeTasks: readonly ResearchTask[]) => Promise<ReconcileOutcome>;
  reset: () => void;
}

const NO_DISCOVERY: DiscoveryResult = {
  awarded: false,
  xpAwarded: 0,
  newAchievementIds: [],
};

const NO_RECONCILE: ReconcileOutcome = {
  masteredIds: [],
  completedResearchIds: [],
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
  let hydrating = false;
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
      if (!hydrating) {
        hydrating = true;
        void adapter.load().then((loaded) => {
          const reconciled = reconcileAchievements(loaded);
          snapshot = { state: reconciled, ready: true };
          adapter.save(reconciled);
          emit();
        });
      }

      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot: () => snapshot,
    getServerSnapshot: () => emptySnapshot,

    discover(herb) {
      // Before hydration resolves there is nothing real to mutate: acting on the
      // placeholder empty state would be silently overwritten the instant hydration's own
      // load resolves and replaces the snapshot wholesale.
      if (!snapshot.ready) return NO_DISCOVERY;
      const outcome = applyDiscovery(snapshot.state, herb.id);
      // Already discovered, or an unknown id: nothing is written and nothing is awarded.
      if (!outcome.result.awarded) return NO_DISCOVERY;
      commit(outcome.state);
      return outcome.result;
    },

    markLearned(herb) {
      if (!snapshot.ready) return NO_DISCOVERY;
      const outcome = applyLearned(snapshot.state, herb.id);
      // Already learned, not yet discovered, or an unknown id: nothing is awarded.
      if (!outcome.result.awarded) return NO_DISCOVERY;
      commit(outcome.state);
      return outcome.result;
    },

    async reconcile(world, activeTasks) {
      if (!snapshot.ready) return NO_RECONCILE;

      if (adapter.reconcile) {
        const outcome = await adapter.reconcile(world, activeTasks);
        if (!outcome) return NO_RECONCILE;
        const changed =
          outcome.masteredIds.length > 0 || outcome.completedResearchIds.length > 0;
        if (changed) {
          // The server just wrote the authoritative rows (real timestamps included) —
          // reload rather than guess at them locally.
          const reloaded = await adapter.load();
          snapshot = { state: reloaded, ready: true };
          emit();
        }
        return outcome;
      }

      const mastery = reconcileMastery(snapshot.state, world.sightingCounts);
      // Rebuilt so a card mastered THIS pass is already visible to research steps that
      // read `world.state.mastered` in the same pass, rather than catching up a tick late.
      const rebuiltWorld = buildWorld(mastery.state, world.sightingCounts);
      const research = reconcileResearch(mastery.state, rebuiltWorld, activeTasks);

      if (mastery.masteredIds.length === 0 && research.completedIds.length === 0) {
        return NO_RECONCILE;
      }

      commit(research.state);
      return {
        masteredIds: mastery.masteredIds,
        completedResearchIds: research.completedIds,
        newAchievementIds: [...mastery.newAchievementIds, ...research.newAchievementIds],
      };
    },

    reset() {
      commit(emptyState());
    },
  };
}
