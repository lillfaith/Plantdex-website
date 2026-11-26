import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emptyState } from './herbdex-state';
import type { HerbdexState } from './types';

/**
 * SIGNED-IN PERSISTENCE, AGAINST A FAKE SUPABASE.
 *
 * `createRemoteHerbdexStorage` is bound to the app's singleton client, so the client is
 * replaced here by an in-memory "server" with the one behaviour the real one has that
 * matters: a write is not visible until its request has LANDED, and a request takes time.
 *
 * What this pins (V1 QA, coord/v1-qa):
 *   1. A save that is still in flight is not lost, and a re-save does not duplicate it.
 *   2. RECONCILE MUST NOT RUN AHEAD OF THE SAVE IT DEPENDS ON. `herbdex-action` derives
 *      mastery from the `learned` and `sightings` rows it READS FROM THE DATABASE. `save()` is
 *      fire-and-forget, so before this fix a player who finished the knowledge check and
 *      triggered a reconcile in the same tick sent the function a world in which the card was
 *      not yet learned: nothing was mastered, the store believed that answer, and mastery
 *      appeared only after some LATER state change or a reload.
 *   3. A failed save is retried by the next one (the original contract) and does not make
 *      reconcile throw.
 */

type Row = Record<string, string>;

const server = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, string>[]>,
  /** Every `upsert` waits on this before landing, so a test can hold a write in flight. */
  gate: null as Promise<void> | null,
  failNextUpsert: false,
  /** What the edge function would have SEEN at the moment it was invoked. */
  seenAtInvoke: [] as { learned: string[]; discoveries: string[] }[],
  invokeResult: { masteredIds: [] as string[], completedResearchIds: [] as string[], newAchievementIds: [] as string[] },
}));

vi.mock('./supabase-client', () => {
  const idColumn: Record<string, string> = {
    discoveries: 'herb_id',
    learned: 'herb_id',
    mastered: 'herb_id',
    research_completions: 'task_id',
    unlocked_achievements: 'achievement_id',
  };
  const from = (table: string) => ({
    select: () => ({
      eq: async () => ({ data: server.tables[table] ?? [], error: null }),
    }),
    upsert: async (rows: Row[]) => {
      if (server.gate) await server.gate;
      if (server.failNextUpsert) {
        server.failNextUpsert = false;
        return { error: { message: 'network' } };
      }
      const held = (server.tables[table] ??= []);
      for (const row of rows) {
        const col = idColumn[table]!;
        const id = row[col];
        // on conflict do nothing
        if (!held.some((r) => r[col] === id)) held.push({ ...row });
      }
      return { error: null };
    },
  });
  return {
    supabase: {
      from,
      functions: {
        invoke: async () => {
          server.seenAtInvoke.push({
            learned: (server.tables.learned ?? []).map((r) => r.herb_id ?? ''),
            discoveries: (server.tables.discoveries ?? []).map((r) => r.herb_id ?? ''),
          });
          return { data: server.invokeResult, error: null };
        },
      },
    },
  };
});

import { createRemoteHerbdexStorage } from './remote-herbdex-storage';

const NOW = '2026-11-26T10:00:00.000Z';

function stateWith(partial: Partial<HerbdexState>): HerbdexState {
  return { ...emptyState(), ...partial };
}

beforeEach(() => {
  server.tables = {};
  server.gate = null;
  server.failNextUpsert = false;
  server.seenAtInvoke = [];
  server.invokeResult = { masteredIds: [], completedResearchIds: [], newAchievementIds: [] };
});

describe('signed-in persistence round trip', () => {
  it('writes discoveries, learned and achievements and reads them back as the same state', async () => {
    const storage = createRemoteHerbdexStorage('user-1');
    await storage.load();
    const saved = stateWith({
      discoveries: { 'taraxacum-officinale': NOW },
      learned: { 'taraxacum-officinale': NOW },
      achievements: { 'first-find': NOW },
    });
    storage.save(saved);
    await vi.waitFor(async () => {
      expect(server.tables.discoveries?.length).toBe(1);
      expect(server.tables.learned?.length).toBe(1);
      expect(server.tables.unlocked_achievements?.length).toBe(1);
    });

    // A fresh adapter is a new device / a reload: nothing but the server to go on.
    const reloaded = await createRemoteHerbdexStorage('user-1').load();
    expect(reloaded.discoveries).toEqual(saved.discoveries);
    expect(reloaded.learned).toEqual(saved.learned);
    expect(reloaded.achievements).toEqual(saved.achievements);
  });

  it('saving the same state twice writes each row once', async () => {
    const storage = createRemoteHerbdexStorage('user-1');
    await storage.load();
    const saved = stateWith({ discoveries: { 'plantago-major': NOW } });
    storage.save(saved);
    await vi.waitFor(() => expect(server.tables.discoveries?.length).toBe(1));
    storage.save(saved);
    storage.save(saved);
    await new Promise((r) => setTimeout(r, 5));
    expect(server.tables.discoveries?.length).toBe(1);
  });

  it('reconcile waits for a save that is still in flight, so the server derives from what the player just did', async () => {
    let release!: () => void;
    server.gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const storage = createRemoteHerbdexStorage('user-1');
    await storage.load();

    // The player passes the knowledge check: `learned` is committed and saved...
    storage.save(
      stateWith({
        discoveries: { 'taraxacum-officinale': NOW },
        learned: { 'taraxacum-officinale': NOW },
      }),
    );
    // ...and, in the same tick, the provider's reconcile effect fires.
    const reconciling = storage.reconcile!(
      { state: emptyState(), sightingCounts: {} } as never,
      [],
    );

    // The request has not landed, so the function must not have been called yet.
    await new Promise((r) => setTimeout(r, 5));
    expect(server.seenAtInvoke, 'reconcile ran ahead of the write it depends on').toHaveLength(0);

    release();
    await reconciling;
    expect(server.seenAtInvoke).toHaveLength(1);
    expect(server.seenAtInvoke[0]!.learned).toEqual(['taraxacum-officinale']);
    expect(server.seenAtInvoke[0]!.discoveries).toEqual(['taraxacum-officinale']);
  });

  it('a failed save does not make reconcile throw, and the next save retries the row', async () => {
    const storage = createRemoteHerbdexStorage('user-1');
    await storage.load();
    server.failNextUpsert = true;
    const saved = stateWith({ discoveries: { 'plantago-major': NOW } });
    storage.save(saved);

    await expect(storage.reconcile!({ state: emptyState(), sightingCounts: {} } as never, [])).resolves.toBeTruthy();
    expect(server.tables.discoveries ?? []).toHaveLength(0);

    storage.save(saved);
    await vi.waitFor(() => expect(server.tables.discoveries?.length).toBe(1));
  });
});
