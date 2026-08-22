import { describe, expect, it, vi } from 'vitest';
import { createHerbdexStore } from './herbdex-store';
import { createMemoryAdapter, emptyState, type HerbdexStorage, type ReconcileOutcome } from '@/lib/storage';
import { HERBS } from '@/lib/deck';
import { xpForState } from '@/lib/progression';
import { buildWorld, STANDING_TASKS } from '@/lib/research';
import type { HerbdexState } from '@/lib/types';

const herb = HERBS[0]!;
const other = HERBS[1]!;

function seeded(ids: string[]): HerbdexState {
  const state = emptyState();
  for (const id of ids) state.discoveries[id] = '2026-01-01T00:00:00.000Z';
  return state;
}

describe('createHerbdexStore', () => {
  it('serves a stable empty server snapshot', () => {
    const store = createHerbdexStore(createMemoryAdapter());
    // React loops forever if this reference changes between calls.
    expect(store.getServerSnapshot()).toBe(store.getServerSnapshot());
    expect(store.getServerSnapshot().ready).toBe(false);
    expect(store.getServerSnapshot().state.discoveries).toEqual({});
  });

  it('does not read storage until something subscribes', async () => {
    const adapter = createMemoryAdapter(seeded([herb.id]));
    const load = vi.spyOn(adapter, 'load');
    const store = createHerbdexStore(adapter);

    expect(store.getSnapshot().ready).toBe(false);
    expect(load).not.toHaveBeenCalled();

    await new Promise<void>((resolve) => store.subscribe(resolve));
    expect(load).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().ready).toBe(true);
    expect(store.getSnapshot().state.discoveries[herb.id]).toBeTruthy();
  });

  it('hydrates only once no matter how many subscribers attach', async () => {
    const adapter = createMemoryAdapter(seeded([herb.id]));
    const load = vi.spyOn(adapter, 'load');
    const store = createHerbdexStore(adapter);

    const hydrated = new Promise<void>((resolve) => store.subscribe(resolve));
    store.subscribe(() => {});
    store.subscribe(() => {});
    await hydrated;
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on hydration and on discovery', async () => {
    const store = createHerbdexStore(createMemoryAdapter());
    const listener = vi.fn();
    await new Promise<void>((resolve) => {
      store.subscribe(() => {
        listener();
        resolve();
      });
    });

    expect(listener).toHaveBeenCalledTimes(1); // hydration
    store.discover(herb);
    expect(listener).toHaveBeenCalledTimes(2); // discovery
  });

  it('stops notifying after unsubscribe', async () => {
    const store = createHerbdexStore(createMemoryAdapter());
    const listener = vi.fn();
    const unsubscribe = await new Promise<() => void>((resolve) => {
      const unsub = store.subscribe(() => resolve(unsub));
    });
    listener.mockClear();

    unsubscribe();
    store.discover(herb);
    expect(listener).not.toHaveBeenCalled();
  });

  it('returns a new snapshot reference only when state actually changes', async () => {
    const store = createHerbdexStore(createMemoryAdapter());
    await new Promise<void>((resolve) => store.subscribe(resolve));

    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);

    store.discover(herb);
    const after = store.getSnapshot();
    expect(after).not.toBe(before);

    // A repeated discovery must not churn the reference either.
    store.discover(herb);
    expect(store.getSnapshot()).toBe(after);
  });

  it('awards XP once and never again for the same herb', async () => {
    const adapter = createMemoryAdapter();
    const store = createHerbdexStore(adapter);
    await new Promise<void>((resolve) => store.subscribe(resolve));

    const first = store.discover(herb);
    expect(first.awarded).toBe(true);
    expect(first.xpAwarded).toBe(herb.xp);

    for (let i = 0; i < 20; i += 1) {
      const repeat = store.discover(herb);
      expect(repeat.awarded).toBe(false);
      expect(repeat.xpAwarded).toBe(0);
    }

    expect(xpForState(store.getSnapshot().state)).toBe(herb.xp);
    expect(Object.keys((await adapter.load()).discoveries)).toHaveLength(1);
  });

  it('persists each new discovery through the adapter', async () => {
    const adapter = createMemoryAdapter();
    const store = createHerbdexStore(adapter);
    await new Promise<void>((resolve) => store.subscribe(resolve));

    store.discover(herb);
    store.discover(other);
    expect(Object.keys((await adapter.load()).discoveries)).toHaveLength(2);
  });

  it('unlocks achievements retroactively when hydrating an older collection', async () => {
    // A saved collection with discoveries but no recorded achievements.
    const adapter = createMemoryAdapter(seeded(HERBS.slice(0, 10).map((h) => h.id)));
    const store = createHerbdexStore(adapter);
    await new Promise<void>((resolve) => store.subscribe(resolve));

    const { achievements } = store.getSnapshot().state;
    expect(achievements['first-find']).toBeTruthy();
    expect(achievements['forager-10']).toBeTruthy();
    // ...and writes the reconciliation back so it is not recomputed every visit.
    expect((await adapter.load()).achievements['forager-10']).toBeTruthy();
  });

  it('resets to an empty collection', async () => {
    const adapter = createMemoryAdapter();
    const store = createHerbdexStore(adapter);
    await new Promise<void>((resolve) => store.subscribe(resolve));
    store.discover(herb);

    store.reset();
    expect(store.getSnapshot().state.discoveries).toEqual({});
    expect((await adapter.load()).discoveries).toEqual({});
  });

  describe('reconcile', () => {
    it('does nothing before hydration', async () => {
      const store = createHerbdexStore(createMemoryAdapter());
      const world = buildWorld(emptyState(), {});
      await expect(store.reconcile(world, STANDING_TASKS)).resolves.toEqual({
        masteredIds: [],
        completedResearchIds: [],
        newAchievementIds: [],
      });
    });

    it('masters a card locally once learned and sighted again, with no adapter opinion', async () => {
      const state = seeded([herb.id]);
      state.learned[herb.id] = '2026-01-02T00:00:00.000Z';
      const adapter = createMemoryAdapter(state);
      const store = createHerbdexStore(adapter);
      await new Promise<void>((resolve) => store.subscribe(resolve));

      const world = buildWorld(store.getSnapshot().state, { [herb.id]: 1 });
      const outcome = await store.reconcile(world, STANDING_TASKS);

      expect(outcome.masteredIds).toEqual([herb.id]);
      expect(store.getSnapshot().state.mastered[herb.id]).toBeTruthy();
      expect((await adapter.load()).mastered[herb.id]).toBeTruthy();
    });

    it('returns the same empty outcome, and does not churn the snapshot, when nothing qualifies', async () => {
      const adapter = createMemoryAdapter();
      const store = createHerbdexStore(adapter);
      await new Promise<void>((resolve) => store.subscribe(resolve));

      const before = store.getSnapshot();
      const world = buildWorld(before.state, {});
      const outcome = await store.reconcile(world, STANDING_TASKS);

      expect(outcome).toEqual({ masteredIds: [], completedResearchIds: [], newAchievementIds: [] });
      expect(store.getSnapshot()).toBe(before);
    });

    it('defers to the adapter when it has a server opinion, and reloads the authoritative state', async () => {
      const state = seeded([herb.id]);
      const served: ReconcileOutcome = {
        masteredIds: [herb.id],
        completedResearchIds: [],
        newAchievementIds: [],
      };
      const afterServerWrite: HerbdexState = {
        ...state,
        mastered: { [herb.id]: '2026-03-01T00:00:00.000Z' },
      };
      let loadCount = 0;
      const adapter: HerbdexStorage = {
        load: () => {
          loadCount += 1;
          return Promise.resolve(loadCount === 1 ? state : afterServerWrite);
        },
        save: () => {},
        clear: () => {},
        reconcile: vi.fn().mockResolvedValue(served),
      };
      const store = createHerbdexStore(adapter);
      await new Promise<void>((resolve) => store.subscribe(resolve));

      const world = buildWorld(store.getSnapshot().state, { [herb.id]: 1 });
      const outcome = await store.reconcile(world, STANDING_TASKS);

      expect(adapter.reconcile).toHaveBeenCalledWith(world, STANDING_TASKS);
      expect(outcome).toBe(served);
      // Reloaded from the adapter rather than guessed at locally.
      expect(store.getSnapshot().state.mastered[herb.id]).toBe('2026-03-01T00:00:00.000Z');
    });
  });
});
