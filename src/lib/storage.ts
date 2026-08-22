import type { HerbdexState } from './types';
import { emptyState, parseState, STORAGE_VERSION } from './herbdex-state';
import type { ResearchTask, ResearchWorld } from './research';

export { emptyState, parseState, STORAGE_VERSION };

/**
 * Browser-only persistence for Herbdex progress.
 *
 * The pure schema and defaults live in `herbdex-state.ts` so they can also be imported by
 * the Supabase edge function that recomputes mastery and research server-side (V0.3) —
 * that file has no DOM types in it, unlike this one.
 *
 * `HerbdexStorage.load()` is async because V0.3 added a real signed-in adapter
 * (`src/lib/remote-herbdex-storage.ts`) that reads from Supabase over the network.
 * `createLocalStorageAdapter` below still reads synchronously under the hood; it just
 * wraps the result in a resolved promise so both adapters share one interface.
 *
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ V0.3 SERVER ADAPTER — WHAT IT ACTUALLY ENFORCES                            │
 * │                                                                            │
 * │ `remote-herbdex-storage.ts` writes discoveries/learned/achievements as     │
 * │ direct RLS-scoped inserts (Postgres itself derives the user from the       │
 * │ caller's session — see `supabase/migrations/0001_accounts.sql` — never     │
 * │ from a userId in the request body). Mastery and research completion are    │
 * │ the one place a client claim can't be taken on faith, because they depend  │
 * │ on sighting counts a client could otherwise just assert; those two are     │
 * │ recomputed by `supabase/functions/herbdex-action`, which imports the exact │
 * │ same `reconcileMastery`/`reconcileResearch` from `herbdex-reducer.ts` that │
 * │ governs local play. Every table has a uniqueness constraint on             │
 * │ (user_id, entity_id) so a replayed request cannot award XP twice, and XP   │
 * │ itself is never stored anywhere — it stays derived, now from Postgres      │
 * │ rows fetched under RLS instead of a JSON blob.                             │
 * └────────────────────────────────────────────────────────────────────────────┘
 */

export const STORAGE_KEY = 'plantdex.herbdex.v1';

export interface ReconcileOutcome {
  masteredIds: string[];
  completedResearchIds: string[];
  newAchievementIds: string[];
}

export interface HerbdexStorage {
  load(): Promise<HerbdexState>;
  save(state: HerbdexState): void;
  clear(): void;
  /**
   * Server-verified mastery/research reconciliation. Returns `null` to mean "no server
   * opinion — compute it locally," which is what the local-storage adapter always does by
   * simply not implementing this method at all. The remote adapter implements it by
   * calling the `herbdex-action` edge function, which is the one place mastery and
   * research completion are re-derived from the caller's own rows rather than trusted
   * from the client — see the block comment above.
   */
  reconcile?(
    world: ResearchWorld,
    activeTasks: readonly ResearchTask[],
  ): Promise<ReconcileOutcome | null>;
}

let warned = false;
function warnOnce(error: unknown): void {
  if (warned) return;
  warned = true;
  console.warn('[plantdex] Progress could not be saved to this browser.', error);
}

/**
 * localStorage-backed storage.
 *
 * Every access is wrapped: Safari private mode, disabled site data, and quota
 * exhaustion all throw on plain property access, and none of them should break the app.
 */
export function createLocalStorageAdapter(key: string = STORAGE_KEY): HerbdexStorage {
  function backing(): Storage | null {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage;
    } catch (error) {
      warnOnce(error);
      return null;
    }
  }

  return {
    async load(): Promise<HerbdexState> {
      const store = backing();
      if (!store) return emptyState();
      try {
        const raw = store.getItem(key);
        if (!raw) return emptyState();
        return parseState(JSON.parse(raw));
      } catch (error) {
        warnOnce(error);
        return emptyState();
      }
    },

    save(state: HerbdexState): void {
      const store = backing();
      if (!store) return;
      try {
        store.setItem(key, JSON.stringify(state));
      } catch (error) {
        warnOnce(error);
      }
    },

    clear(): void {
      const store = backing();
      if (!store) return;
      try {
        store.removeItem(key);
      } catch (error) {
        warnOnce(error);
      }
    },
  };
}

/** In-memory storage, used on the server and in tests. */
export function createMemoryAdapter(initial: HerbdexState = emptyState()): HerbdexStorage {
  let state = initial;
  return {
    load: () => Promise.resolve(state),
    save: (next) => {
      state = next;
    },
    clear: () => {
      state = emptyState();
    },
  };
}
