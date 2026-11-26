import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createHerbdexStore } from '@/state/herbdex-store';
import { PRINTED_CARDS } from './deck';
import { resolveFrame } from './field-frames';
import { stageForState } from './garden';
import { progressFromState } from './progression';
import { buildWorld, STANDING_TASKS } from './research';
import { createLocalStorageAdapter, STORAGE_KEY, STORAGE_VERSION, UNREADABLE_SUFFIX } from './storage';

/**
 * SIGNED-OUT PERSISTENCE, THROUGH THE REAL STORE AND THE REAL LOCAL ADAPTER, OVER A STUBBED
 * `localStorage`. "Reload" is a second store built on the same storage and nothing else.
 *
 * V1 QA (coord/v1-qa) item 1: XP, mastery, First Find, Amber Ring, achievements and Garden
 * stage survive a reload. The Garden has no placement action — a plant's stage is derived
 * from mastery (`garden.ts`, no clock) — so "placement" means the derived stage reading back
 * the same after a reload.
 */

function installStorage(): Map<string, string> {
  const data = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
  });
  return data;
}

async function open() {
  const store = createHerbdexStore(createLocalStorageAdapter());
  await new Promise<void>((resolve) => store.subscribe(resolve));
  return store;
}

const herb = PRINTED_CARDS[0]!;
const second = PRINTED_CARDS[1]!;

let data: Map<string, string>;
beforeEach(() => {
  data = installStorage();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('signed-out persistence across a reload', () => {
  it('keeps a first find: XP, First Find, Amber Ring and a sprout in the garden', async () => {
    const first = await open();
    const result = first.discover(herb);
    expect(result.awarded).toBe(true);
    expect(result.newAchievementIds).toContain('first-find');
    const xpBefore = progressFromState(first.getSnapshot().state).xp;
    expect(xpBefore).toBe(herb.xp);

    const reloaded = (await open()).getSnapshot().state;
    expect(progressFromState(reloaded).xp).toBe(xpBefore);
    expect(reloaded.achievements['first-find']).toBeTruthy();
    // The Amber Ring is derived from the stored achievement: unlocked means it resolves to itself.
    expect(resolveFrame('amber-ring', reloaded).id).toBe('amber-ring');
    expect(stageForState(reloaded, herb.id)).toBe('sprout');
  });

  it('does not grant the Amber Ring before a first find', async () => {
    const state = (await open()).getSnapshot().state;
    expect(resolveFrame('amber-ring', state).id).not.toBe('amber-ring');
  });

  it('a reload never pays twice: rediscovering after a reload awards nothing', async () => {
    (await open()).discover(herb);
    const again = await open();
    const xp = progressFromState(again.getSnapshot().state).xp;
    expect(again.discover(herb).awarded).toBe(false);
    expect(progressFromState(again.getSnapshot().state).xp).toBe(xp);
  });

  it('carries learned -> mastered through a reload and moves the garden plant forward only', async () => {
    const store = await open();
    store.discover(herb);
    store.markLearned(herb);
    const outcome = await store.reconcile(buildWorld(store.getSnapshot().state, { [herb.id]: 1 }), STANDING_TASKS);
    expect(outcome.masteredIds).toEqual([herb.id]);
    const stageAfter = stageForState(store.getSnapshot().state, herb.id);
    expect(stageAfter).toBe('flowering');

    const reloaded = (await open()).getSnapshot().state;
    expect(reloaded.mastered[herb.id]).toBeTruthy();
    expect(stageForState(reloaded, herb.id)).toBe(stageAfter);
    expect(progressFromState(reloaded).xp).toBe(progressFromState(store.getSnapshot().state).xp);
  });

  it('mastery earned stays earned when the sighting that earned it is gone', async () => {
    const store = await open();
    store.discover(herb);
    store.markLearned(herb);
    await store.reconcile(buildWorld(store.getSnapshot().state, { [herb.id]: 1 }), STANDING_TASKS);

    // The sighting is deleted: the world now reports zero sightings. Reload and reconcile.
    const reloaded = await open();
    await reloaded.reconcile(buildWorld(reloaded.getSnapshot().state, {}), STANDING_TASKS);
    expect(reloaded.getSnapshot().state.mastered[herb.id]).toBeTruthy();
    expect(stageForState(reloaded.getSnapshot().state, herb.id)).toBe('flowering');
  });

  it('keeps two plants independent', async () => {
    const store = await open();
    store.discover(herb);
    store.discover(second);
    store.markLearned(second);
    const reloaded = (await open()).getSnapshot().state;
    expect(stageForState(reloaded, herb.id)).toBe('sprout');
    expect(stageForState(reloaded, second.id)).toBe('growing');
  });

  it('a corrupted or unknown-version save degrades to an empty collection, not a crash', async () => {
    data.set(STORAGE_KEY, '{not json');
    expect(progressFromState((await open()).getSnapshot().state).xp).toBe(0);
    data.set(STORAGE_KEY, JSON.stringify({ version: 999, discoveries: { [herb.id]: 'x' } }));
    expect(progressFromState((await open()).getSnapshot().state).xp).toBe(0);
  });

  it('survives storage that throws on write (Safari private mode) without losing the in-memory state', async () => {
    const store = await open();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => {},
      },
    });
    expect(store.discover(herb).awarded).toBe(true);
    expect(store.getSnapshot().state.discoveries[herb.id]).toBeTruthy();
  });

  it('KEEPS a save this build cannot read (rollback after a version bump) instead of erasing it', async () => {
    // A newer build wrote this; the build now running does not know its version.
    const future = JSON.stringify({
      version: STORAGE_VERSION + 1,
      discoveries: { [herb.id]: '2026-01-01T00:00:00.000Z' },
      learned: {},
      mastered: {},
      research: {},
      achievements: {},
    });
    data.set(STORAGE_KEY, future);
    const state = (await open()).getSnapshot().state;
    expect(state.discoveries, 'an unreadable save must not be guessed at').toEqual({});
    // Hydration rewrote the live key with an empty collection, as it always has...
    expect(JSON.parse(data.get(STORAGE_KEY)!).discoveries).toEqual({});
    // ...but the original bytes are still on the device, recoverable.
    expect(data.get(STORAGE_KEY + UNREADABLE_SUFFIX)).toBe(future);
  });

  it('keeps corrupt JSON aside too, and never replaces a backup it already holds', async () => {
    data.set(STORAGE_KEY, '{not json');
    await open();
    expect(data.get(STORAGE_KEY + UNREADABLE_SUFFIX)).toBe('{not json');
    data.set(STORAGE_KEY, JSON.stringify({ version: 999 }));
    await open();
    expect(data.get(STORAGE_KEY + UNREADABLE_SUFFIX), 'a later unreadable save replaced the first backup').toBe('{not json');
  });

  it('writes no backup for a readable save, including the older versions it migrates', async () => {
    data.set(STORAGE_KEY, JSON.stringify({ version: 1, discoveries: { [herb.id]: '2026-01-01T00:00:00.000Z' } }));
    const state = (await open()).getSnapshot().state;
    expect(state.discoveries[herb.id]).toBeTruthy();
    expect(data.has(STORAGE_KEY + UNREADABLE_SUFFIX)).toBe(false);
  });
});
