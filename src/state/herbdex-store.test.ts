import { describe, expect, it, vi } from 'vitest';
import { createHerbdexStore } from './herbdex-store';
import { createMemoryAdapter, emptyState } from '@/lib/storage';
import { HERBS } from '@/lib/deck';
import { xpForState } from '@/lib/progression';
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

  it('does not read storage until something subscribes', () => {
    const adapter = createMemoryAdapter(seeded([herb.id]));
    const load = vi.spyOn(adapter, 'load');
    const store = createHerbdexStore(adapter);

    expect(store.getSnapshot().ready).toBe(false);
    expect(load).not.toHaveBeenCalled();

    store.subscribe(() => {});
    expect(load).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().ready).toBe(true);
    expect(store.getSnapshot().state.discoveries[herb.id]).toBeTruthy();
  });

  it('hydrates only once no matter how many subscribers attach', () => {
    const adapter = createMemoryAdapter(seeded([herb.id]));
    const load = vi.spyOn(adapter, 'load');
    const store = createHerbdexStore(adapter);

    store.subscribe(() => {});
    store.subscribe(() => {});
    store.subscribe(() => {});
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on hydration and on discovery', () => {
    const store = createHerbdexStore(createMemoryAdapter());
    const listener = vi.fn();
    store.subscribe(listener);

    expect(listener).toHaveBeenCalledTimes(1); // hydration
    store.discover(herb);
    expect(listener).toHaveBeenCalledTimes(2); // discovery
  });

  it('stops notifying after unsubscribe', () => {
    const store = createHerbdexStore(createMemoryAdapter());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    listener.mockClear();

    unsubscribe();
    store.discover(herb);
    expect(listener).not.toHaveBeenCalled();
  });

  it('returns a new snapshot reference only when state actually changes', () => {
    const store = createHerbdexStore(createMemoryAdapter());
    store.subscribe(() => {});

    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);

    store.discover(herb);
    const after = store.getSnapshot();
    expect(after).not.toBe(before);

    // A repeated discovery must not churn the reference either.
    store.discover(herb);
    expect(store.getSnapshot()).toBe(after);
  });

  it('awards XP once and never again for the same herb', () => {
    const adapter = createMemoryAdapter();
    const store = createHerbdexStore(adapter);
    store.subscribe(() => {});

    const first = store.discover(herb);
    expect(first.awarded).toBe(true);
    expect(first.xpAwarded).toBe(herb.xp);

    for (let i = 0; i < 20; i += 1) {
      const repeat = store.discover(herb);
      expect(repeat.awarded).toBe(false);
      expect(repeat.xpAwarded).toBe(0);
    }

    expect(xpForState(store.getSnapshot().state)).toBe(herb.xp);
    expect(Object.keys(adapter.load().discoveries)).toHaveLength(1);
  });

  it('persists each new discovery through the adapter', () => {
    const adapter = createMemoryAdapter();
    const store = createHerbdexStore(adapter);
    store.subscribe(() => {});

    store.discover(herb);
    store.discover(other);
    expect(Object.keys(adapter.load().discoveries)).toHaveLength(2);
  });

  it('unlocks achievements retroactively when hydrating an older collection', () => {
    // A saved collection with discoveries but no recorded achievements.
    const adapter = createMemoryAdapter(seeded(HERBS.slice(0, 10).map((h) => h.id)));
    const store = createHerbdexStore(adapter);
    store.subscribe(() => {});

    const { achievements } = store.getSnapshot().state;
    expect(achievements['first-find']).toBeTruthy();
    expect(achievements['forager-10']).toBeTruthy();
    // ...and writes the reconciliation back so it is not recomputed every visit.
    expect(adapter.load().achievements['forager-10']).toBeTruthy();
  });

  it('resets to an empty collection', () => {
    const adapter = createMemoryAdapter();
    const store = createHerbdexStore(adapter);
    store.subscribe(() => {});
    store.discover(herb);

    store.reset();
    expect(store.getSnapshot().state.discoveries).toEqual({});
    expect(adapter.load().discoveries).toEqual({});
  });
});
