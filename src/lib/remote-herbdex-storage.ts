import { supabase } from './supabase-client';
import { emptyState } from './herbdex-state';
import type { HerbdexState } from './types';
import type { HerbdexStorage, ReconcileOutcome } from './storage';
import type { ResearchTask, ResearchWorld } from './research';

/**
 * The signed-in `HerbdexStorage` adapter: reads and writes Supabase instead of
 * localStorage. See the block comment atop `storage.ts` for what this does and does not
 * trust the client with.
 *
 * `discoveries`, `learned` and `unlocked_achievements` are plain RLS-scoped upserts —
 * Postgres derives `user_id` from the caller's own session via Row Level Security
 * (`supabase/migrations/0001_accounts.sql`), and the (user_id, entity_id) primary key on
 * each table makes a retried insert a no-op rather than a double-award. There is nothing
 * for a server function to recompute here: the client already derived the transition with
 * the same pure reducer that governs local play, and RLS is what actually stops one user
 * from writing another's rows regardless of what this file does or doesn't check.
 *
 * `mastered` and `research_completions` are different — see `reconcile()` below.
 */
export function createRemoteHerbdexStorage(userId: string): HerbdexStorage {
  // What this adapter last saw written, so `save()` can tell which ids are genuinely new
  // rather than re-inserting everything it already knows about.
  let lastKnown: HerbdexState = emptyState();

  async function fetchRecord(
    table: string,
    idColumn: string,
    atColumn: string,
  ): Promise<Record<string, string>> {
    if (!supabase) return {};
    const { data, error } = await supabase
      .from(table)
      .select(`${idColumn}, ${atColumn}`)
      .eq('user_id', userId);
    const out: Record<string, string> = {};
    if (error || !data) return out;
    for (const row of data as unknown as Record<string, unknown>[]) {
      const id = row[idColumn];
      const at = row[atColumn];
      if (typeof id === 'string' && typeof at === 'string') out[id] = at;
    }
    return out;
  }

  /** Insert only the ids in `record` that were not already in `previous`. */
  async function upsertNew(
    table: string,
    idColumn: string,
    atColumn: string,
    record: Record<string, string>,
    previous: Record<string, string>,
  ): Promise<void> {
    if (!supabase) return;
    const rows = Object.entries(record)
      .filter(([id]) => !(id in previous))
      .map(([id, at]) => ({ user_id: userId, [idColumn]: id, [atColumn]: at }));
    if (rows.length === 0) return;
    const { error } = await supabase
      .from(table)
      .upsert(rows, { onConflict: `user_id,${idColumn}`, ignoreDuplicates: true });
    if (error) console.warn(`[plantdex] failed to sync ${table}`, error);
  }

  return {
    async load(): Promise<HerbdexState> {
      if (!supabase) return emptyState();
      const [discoveries, learned, mastered, research, achievements] = await Promise.all([
        fetchRecord('discoveries', 'herb_id', 'discovered_at'),
        fetchRecord('learned', 'herb_id', 'learned_at'),
        fetchRecord('mastered', 'herb_id', 'mastered_at'),
        fetchRecord('research_completions', 'task_id', 'completed_at'),
        fetchRecord('unlocked_achievements', 'achievement_id', 'unlocked_at'),
      ]);
      const state: HerbdexState = {
        ...emptyState(),
        discoveries,
        learned,
        mastered,
        research,
        achievements,
      };
      lastKnown = state;
      return state;
    },

    save(state: HerbdexState): void {
      const previous = lastKnown;
      lastKnown = state;
      // Fire-and-forget, the same contract `createLocalStorageAdapter.save` has. Only
      // discoveries/learned/achievements are ever set this way — mastered/research are
      // written exclusively by `reconcile()` below, which persists them itself.
      void upsertNew('discoveries', 'herb_id', 'discovered_at', state.discoveries, previous.discoveries);
      void upsertNew('learned', 'herb_id', 'learned_at', state.learned, previous.learned);
      void upsertNew(
        'unlocked_achievements',
        'achievement_id',
        'unlocked_at',
        state.achievements,
        previous.achievements,
      );
    },

    clear(): void {
      // Deliberately local-only: `reset()` is not currently exposed anywhere in the UI,
      // and a client-triggered mass-delete of a signed-in user's permanent records is a
      // much bigger, more sensitive operation than anything else this adapter does. If a
      // real "delete my account" feature is ever built, it belongs in its own reviewed
      // path, not as a side effect of this method.
      lastKnown = emptyState();
    },

    async reconcile(
      world: ResearchWorld,
      activeTasks: readonly ResearchTask[],
    ): Promise<ReconcileOutcome | null> {
      if (!supabase) return null;
      const dailyTaskIds = activeTasks
        .filter((task) => task.kind === 'daily')
        .map((task) => task.id);

      const { data, error } = await supabase.functions.invoke('herbdex-action', {
        body: { dailyTaskIds },
      });
      if (error) {
        console.warn('[plantdex] mastery/research reconciliation failed', error);
        return null;
      }
      return data as ReconcileOutcome;
    },
  };
}
