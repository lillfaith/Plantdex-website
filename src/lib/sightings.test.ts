import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Sighting } from './sightings';

/**
 * The field journal's read path.
 *
 * THE BUG THIS EXISTS FOR: `isSighting` validated `id`, `herbId` and `date` but not
 * `createdAt`, while the journal's sort does
 * `b.createdAt.localeCompare(a.createdAt)` as its tiebreak. A stored record missing that
 * field therefore passed the guard, reached the sort, and threw — which does not degrade
 * the sightings list, it blanks the WHOLE plant page, because the throw happens during
 * render. Storage is the one input the app does not control: legacy records, a hand-edited
 * localStorage, or any import path that forgets the field all produce it.
 *
 * `read()` already treats malformed storage as "start empty rather than break the journal".
 * These tests hold it to that.
 */

const STORAGE_KEY = 'plantdex.sightings.v1';

/** A minimal localStorage, because the suite runs in `node` with no window. */
function stubStorage(seed: unknown): void {
  const store = new Map<string, string>();
  if (seed !== undefined) store.set(STORAGE_KEY, JSON.stringify(seed));
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  });
}

/** Fresh module state each time — the store memoises into a module-level cache. */
async function loadWith(seed: unknown) {
  vi.resetModules();
  stubStorage(seed);
  return import('./sightings');
}

const wellFormed = {
  id: 'sighting_1',
  herbId: 'taraxacum-officinale',
  date: '2026-08-30',
  createdAt: '2026-08-30T10:00:00.000Z',
};

describe('reading stored sightings', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps a well-formed record', async () => {
    const { getAllSightings } = await loadWith([wellFormed]);
    expect(getAllSightings()).toHaveLength(1);
  });

  it('drops a record with no createdAt instead of letting it reach the sort', async () => {
    const noCreatedAt: Record<string, unknown> = { ...wellFormed };
    delete noCreatedAt.createdAt;
    const { getAllSightings } = await loadWith([wellFormed, noCreatedAt]);
    const kept = getAllSightings();
    expect(kept).toHaveLength(1);
    expect(kept[0]!.id).toBe('sighting_1');
  });

  it('guarantees every record it returns can be sorted', async () => {
    // This is the property the page actually depends on. Sorting the way the journal does
    // must not be able to throw on anything the store hands back.
    const bad = [
      wellFormed,
      { ...wellFormed, id: 'no-created' , createdAt: undefined },
      { ...wellFormed, id: 'null-created', createdAt: null },
      { ...wellFormed, id: 'num-created', createdAt: 20260830 },
      { ...wellFormed, id: 'no-date', date: undefined },
      { id: 'not-a-sighting' },
      null,
      'nonsense',
    ];
    const { getAllSightings } = await loadWith(bad);
    const kept: Sighting[] = getAllSightings();
    expect(() =>
      [...kept].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    ).not.toThrow();
    expect(kept.map((s) => s.id)).toEqual(['sighting_1']);
  });

  it('still starts empty on junk rather than throwing', async () => {
    const { getAllSightings } = await loadWith('not an array');
    expect(getAllSightings()).toEqual([]);
  });
});
