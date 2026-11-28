import { supabase } from './supabase-client';
import { emptyState } from './herbdex-state';
import type { HerbdexState } from './types';
import type { HerbdexStorage, ReconcileOutcome, RefusedWrite } from './storage';
import { classifyWriteError } from './storage-write-failure';
import { reconcileAchievements } from './herbdex-reducer';
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

  // Saves that have been issued and have not settled. `save()` is fire-and-forget by contract,
  // but `reconcile()` asks a server function to derive mastery and research from the rows IN
  // THE DATABASE, so it must not run ahead of a write it depends on: a player who finishes the
  // knowledge check and triggers a reconcile in the same tick otherwise sends the function a
  // world in which the card is not yet learned, and is told nothing was mastered.
  const inFlight = new Set<Promise<void>>();

  // Rows the server has permanently refused THIS session, per table. Never retried: a refusal
  // is a rule, not a hiccup. Cleared only by a successful `load()` (the store's rollback), after
  // which the row is gone from local state and a later proper capture may write it normally.
  const rejected: Record<string, Set<string>> = {};
  const rejectedIn = (table: string): Set<string> => (rejected[table] ??= new Set<string>());
  // Refusals found during the current save, reported once it has fully settled.
  let pendingRefusals: RefusedWrite[] = [];
  const upsertRows = (table: string, idColumn: string, rows: Record<string, unknown>[]) =>
    supabase!
      .from(table)
      .upsert(rows, { onConflict: `user_id,${idColumn}`, ignoreDuplicates: true });

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
    // THROW rather than return {}. An empty record and a failed request are indistinguishable
    // downstream, and the empty one is a lie with the worst possible reading: a signed-in
    // player is shown a collection of zero. The store keeps its loading state instead and
    // retries — nothing is written from an empty state, so nothing is lost either way, but
    // "still loading" is true and "you have found nothing" is not.
    if (error) throw new Error(`Could not load ${table}: ${error.message}`);
    if (!data) return out;
    for (const row of data as unknown as Record<string, unknown>[]) {
      const id = row[idColumn];
      const at = row[atColumn];
      if (typeof id === 'string' && typeof at === 'string') out[id] = at;
    }
    return out;
  }

  /**
   * Insert only the ids in `record` that were not already in `previous`, and report what is
   * now genuinely known to be on the server.
   *
   * The return value is the point. `lastKnown` used to be set to the new state before the
   * write was even attempted, so a failed upsert marked those ids as written: the next
   * `save()` filtered them out as "already known" and never tried again. One dropped
   * request and a discovery was gone until the player happened to re-discover it. Returning
   * `previous` on failure leaves them unknown, so the very next save retries them — and
   * because every write is `on conflict do nothing`, retrying costs nothing when the first
   * attempt did land after all.
   */
  async function upsertNew(
    table: string,
    idColumn: string,
    atColumn: string,
    record: Record<string, string>,
    previous: Record<string, string>,
  ): Promise<Record<string, string>> {
    if (!supabase) return previous;
    const refused = rejectedIn(table);
    const rows = Object.entries(record)
      .filter(([id]) => !(id in previous) && !refused.has(id))
      .map(([id, at]) => ({ user_id: userId, [idColumn]: id, [atColumn]: at }));
    if (rows.length === 0) return previous;
    const { error } = await upsertRows(table, idColumn, rows);
    if (!error) return { ...previous, ...Object.fromEntries(rows.map((r) => [r[idColumn] as string, record[r[idColumn] as string]!])) };
    if (!classifyWriteError(error).permanent) {
      console.warn(`[plantdex] failed to sync ${table}, will retry on the next save`, error);
      return previous;
    }
    // One refused row poisons a batch, so write the rest one at a time: valid rows still land.
    const landed: Record<string, string> = { ...previous };
    const newlyRefused = new Map<string, string>();
    for (const row of rows) {
      const id = row[idColumn] as string;
      const res = await upsertRows(table, idColumn, [row]);
      if (!res.error) {
        landed[id] = record[id]!;
        continue;
      }
      const failure = classifyWriteError(res.error);
      if (failure.permanent) {
        refused.add(id);
        newlyRefused.set(id, failure.reason);
      } else {
        console.warn(`[plantdex] failed to sync ${table}, will retry on the next save`, res.error);
      }
    }
    const byReason = new Map<string, string[]>();
    for (const [id, reason] of newlyRefused) byReason.set(reason, [...(byReason.get(reason) ?? []), id]);
    for (const [code, ids] of byReason) pendingRefusals.push({ table, ids, code });
    return landed;
  }

  const adapter: HerbdexStorage = {
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
      // The authoritative state is back: whatever was refused is no longer held locally, so a
      // later, properly captured write of the same row must not be blocked by an old refusal.
      for (const key of Object.keys(rejected)) delete rejected[key];
      return state;
    },

    save(state: HerbdexState): void {
      const withoutRefused = (s: HerbdexState, prev: HerbdexState): Record<string, string> => {
        const dropD = rejectedIn('discoveries');
        const dropL = rejectedIn('learned');
        if (dropD.size === 0 && dropL.size === 0) return s.achievements;
        const clean: HerbdexState = {
          ...s,
          discoveries: Object.fromEntries(Object.entries(s.discoveries).filter(([id]) => !dropD.has(id))),
          learned: Object.fromEntries(Object.entries(s.learned).filter(([id]) => !dropD.has(id) && !dropL.has(id))),
          mastered: Object.fromEntries(Object.entries(s.mastered).filter(([id]) => !dropD.has(id))),
          achievements: prev.achievements,
        };
        const allowed = reconcileAchievements(clean).achievements;
        return Object.fromEntries(Object.entries(s.achievements).filter(([id]) => id in allowed));
      };
      const previous = lastKnown;
      // Fire-and-forget, the same contract `createLocalStorageAdapter.save` has. Only
      // discoveries/learned/achievements are ever set this way — mastered/research are
      // written exclusively by `reconcile()` below, which persists them itself.
      //
      // `lastKnown` is updated per table AFTER each write settles, and only to what
      // actually landed, so a failure leaves those ids unwritten and the next save picks
      // them up again.
      const write = (async () => {
        // DISCOVERIES FIRST, THEN THE REST. Written in parallel, a `learned` row could land before
        // the `discoveries` row it depends on. That was harmless while nothing checked it, but
        // migration 0016 (draft, switch OFF) refuses a `learned`/`mastered` row for a card with no
        // `discoveries` row once enforcement is ON, so the order must be a property of the adapter
        // and not luck. With enforcement OFF this changes nothing a player can observe.
        pendingRefusals = [];
        const discoveries = await upsertNew(
          'discoveries',
          'herb_id',
          'discovered_at',
          state.discoveries,
          previous.discoveries,
        );
        // Achievements are pure predicates of state, so one earned by a refused discovery would
        // otherwise be written beside it. Only write those that still hold without the refused rows.
        const achievementsToWrite = withoutRefused(state, previous);
        const [learned, achievements] = await Promise.all([
          upsertNew('learned', 'herb_id', 'learned_at', state.learned, previous.learned),
          upsertNew(
            'unlocked_achievements',
            'achievement_id',
            'unlocked_at',
            achievementsToWrite,
            previous.achievements,
          ),
        ]);
        lastKnown = { ...lastKnown, discoveries, learned, achievements };
        const refusals = pendingRefusals;
        pendingRefusals = [];
        for (const info of refusals) adapter.onRefused?.(info);
      })();
      inFlight.add(write);
      void write.finally(() => inFlight.delete(write));
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
      // Never rejects: a failed save is retried by the next save, and is no reason to refuse
      // to reconcile what DID land.
      await Promise.allSettled([...inFlight]);
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
  return adapter;
}
