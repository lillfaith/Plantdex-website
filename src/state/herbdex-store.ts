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

  /**
   * Read the stored collection, retrying a failed read rather than declaring the player
   * has nothing.
   *
   * The local adapter cannot fail; the remote one can, and `ready` is what every screen
   * gates its "you have found N of 45" on. Becoming ready with an empty state after a
   * dropped request would tell a signed-in player their collection is gone — and worse,
   * every later mutation would then be computed against that empty state. Staying
   * un-ready is honest, and the retries make a transient failure self-heal.
   */
  const RETRY_DELAYS_MS = [1_000, 3_000, 8_000];

  async function hydrate(attempt = 0): Promise<void> {
    try {
      const loaded = await adapter.load();
      const reconciled = reconcileAchievements(loaded);
      snapshot = { state: reconciled, ready: true };
      adapter.save(reconciled);
      emit();
    } catch (error) {
      const delay = RETRY_DELAYS_MS[attempt];
      if (delay === undefined) {
        // Out of retries. Still not ready, still not claiming an empty collection: the
        // screens keep their loading state and a reload is the way back.
        console.error('[plantdex] could not load your collection', error);
        return;
      }
      console.warn(`[plantdex] loading your collection failed, retrying in ${delay}ms`, error);
      setTimeout(() => void hydrate(attempt + 1), delay);
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);

      // First subscription happens on the client after mount, which is where reading
      // storage belongs. Reconciling on load retroactively unlocks achievements added
      // since the player's last visit.
      if (!hydrating) {
        hydrating = true;
        void hydrate();
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
          // reload rather than guess at them locally. A failed reload keeps the snapshot
          // it already has: the rows are written either way, so the only cost is that they
          // appear on the next load instead of this one.
          try {
            const reloaded = await adapter.load();
            snapshot = { state: reloaded, ready: true };
            emit();
          } catch (error) {
            console.warn('[plantdex] could not reload after reconciling', error);
          }
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
