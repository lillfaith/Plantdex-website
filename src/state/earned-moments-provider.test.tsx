// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));
const remote = vi.hoisted(() => ({ byUser: new Map<string, unknown>() }));

vi.mock('@/state/AuthProvider', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('./AuthProvider', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('@/lib/remote-herbdex-storage', () => ({
  createRemoteHerbdexStorage: (id: string) => remote.byUser.get(id),
}));
vi.mock('@/lib/remote-sightings', () => ({
  addRemoteSighting: vi.fn(),
  removeRemoteSighting: vi.fn(),
  useRemoteSightingCounts: () => ({}),
  useRemoteSightings: () => [],
}));

import { HerbdexProvider, useHerbdex } from './HerbdexProvider';
import { PRINTED_CARDS } from '@/lib/deck';
import { applyDiscovery, applyLearned } from '@/lib/herbdex-reducer';
import { progressFromState } from '@/lib/progression';
import { STANDING_TASKS } from '@/lib/research';
import { addSighting, getAllSightings, removeSighting } from '@/lib/sightings';
import { clearBoard } from '@/lib/research-board';
import { createMemoryAdapter, emptyState, type HerbdexStorage, type ReconcileOutcome } from '@/lib/storage';
import { levelUpId } from '@/lib/earned-moments';
import { markAnnounced, resetEarnedMoments } from '@/lib/earned-moments-store';
import type { HerbdexState } from '@/lib/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Ctx = ReturnType<typeof useHerbdex>;
let ctx: Ctx;
let root: Root | null = null;
let container: HTMLElement | null = null;

function Probe(): ReactNode {
  // Test harness only: hands the live context to the assertions.
  // eslint-disable-next-line react-hooks/globals
  ctx = useHerbdex();
  return null;
}

async function flush(times = 8) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

async function mount(storage?: HerbdexStorage) {
  container = document.createElement('div');
  root = createRoot(container);
  await act(async () => {
    root!.render(<HerbdexProvider storage={storage}><Probe /></HerbdexProvider>);
  });
  await flush();
}

async function unmount() {
  await act(async () => root?.unmount());
  root = null;
}

const ids = () => ctx.earnedMoments.map((m) => m.id);

/** Discover cards with the real reducer until one MORE would cross into level 2. */
function nearLevelTwo(learnFirst = false): { state: HerbdexState; next: (typeof PRINTED_CARDS)[number] } {
  let state = emptyState();
  if (learnFirst) {
    state = applyLearned(applyDiscovery(state, PRINTED_CARDS[0]!.id).state, PRINTED_CARDS[0]!.id).state;
  }
  for (let i = 0; i < PRINTED_CARDS.length - 1; i++) {
    const card = PRINTED_CARDS[i]!;
    const next = PRINTED_CARDS[i + 1]!;
    const after = applyDiscovery(state, next.id).state;
    if (progressFromState(after).level > progressFromState(state).level) return { state, next };
    state = applyDiscovery(state, card.id).state;
  }
  throw new Error('no level crossing found');
}

/** An adapter whose load() and reconcile() answers the test controls. */
function controllable(initial: HerbdexState) {
  let current = initial;
  let armed: ReconcileOutcome | null = null;
  const adapter: HerbdexStorage = {
    load: () => Promise.resolve(structuredClone(current)),
    save: () => {},
    clear: () => {},
    reconcile: () => {
      const out = armed;
      armed = null;
      return Promise.resolve(out);
    },
  };
  return {
    adapter,
    /** The next reconcile reports `outcome` and the next load() returns `state`. */
    arm(state: HerbdexState, outcome: ReconcileOutcome) {
      current = state;
      armed = outcome;
    },
  };
}

/** Changes the world so the provider's reconcile effect runs again. */
const poke = () => act(async () => void addSighting({ herbId: 'poke', date: '2026-01-01', note: '' } as never));

beforeEach(async () => {
  // Module-level caches outlive localStorage.clear(): empty them so tests do not leak.
  for (const sighting of getAllSightings()) await removeSighting(sighting.id);
  clearBoard();
  window.localStorage.clear();
  auth.user = null;
  remote.byUser.clear();
  resetEarnedMoments();
});
afterEach(async () => {
  await unmount();
});

describe('earned moments through the mounted HerbdexProvider', () => {
  it('(a) hydrating a stored collection is the baseline and queues nothing', async () => {
    const { state } = nearLevelTwo();
    state.mastered[PRINTED_CARDS[0]!.id] = '2026-01-01T00:00:00.000Z';
    state.research[STANDING_TASKS[0]!.id] = '2026-01-01T00:00:00.000Z';
    await mount(createMemoryAdapter(state));
    expect(ctx.ready).toBe(true);
    expect(ctx.earnedMoments).toEqual([]);
  });

  it('(b) a discovery that crosses a level is pre-announced; a following mastery queues once', async () => {
    const { state: learned, next } = nearLevelTwo(true);
    await mount(createMemoryAdapter(learned));
    const levelBefore = ctx.progress.level;

    await act(async () => void ctx.discover(next));
    await flush();
    expect(ctx.progress.level).toBeGreaterThan(levelBefore);
    expect(ctx.earnedMoments.filter((m) => m.kind === 'level-up')).toEqual([]);

    const researchBefore = new Set(Object.keys(ctx.state.research));
    const herbId = PRINTED_CARDS[0]!.id;
    await act(async () => void addSighting({ herbId, date: '2026-01-02', note: '' } as never));
    await flush();
    expect(ctx.state.mastered[herbId]).toBeTruthy();
    expect(ids().filter((id) => id === `mastery:${herbId}`)).toHaveLength(1);
    const researchNow = Object.keys(ctx.state.research).filter((id) => !researchBefore.has(id));
    expect(ids().filter((id) => id.startsWith('research:')).sort()).toEqual(
      researchNow.map((id) => `research:${id}`).sort(),
    );
  });

  it('(c) switching accounts resets baseline and ledger and replays nothing from the other account', async () => {
    const { state: big } = nearLevelTwo();
    big.mastered[PRINTED_CARDS[0]!.id] = '2026-01-01T00:00:00.000Z';
    remote.byUser.set('alice', createMemoryAdapter(big));
    remote.byUser.set('bob', createMemoryAdapter(emptyState()));
    auth.user = { id: 'alice' };
    await mount();
    expect(ctx.earnedMoments).toEqual([]);

    markAnnounced([levelUpId(9)]);
    auth.user = { id: 'bob' };
    await act(async () => root!.render(<HerbdexProvider><Probe /></HerbdexProvider>));
    await flush();
    expect(ctx.progress.level).toBe(1);
    expect(ctx.earnedMoments).toEqual([]);

    auth.user = null; // sign out: local device scope, empty
    await act(async () => root!.render(<HerbdexProvider><Probe /></HerbdexProvider>));
    await flush();
    expect(ctx.earnedMoments).toEqual([]);
  });

  it('(d) a reload (remount on the same storage) queues nothing and does not replay', async () => {
    const { state, next } = nearLevelTwo();
    const adapter = createMemoryAdapter(state);
    await mount(adapter);
    await act(async () => void ctx.discover(next));
    await flush();
    await unmount();
    resetEarnedMoments(); // a reload is a new JS session: the store is memory only
    await mount(adapter);
    expect(ctx.progress.level).toBeGreaterThan(1);
    expect(ctx.earnedMoments).toEqual([]);
    await flush();
    expect(ctx.earnedMoments).toEqual([]);
  });

  it('(e) duplicate events queue nothing new', async () => {
    const { state, next } = nearLevelTwo();
    await mount(createMemoryAdapter(state));
    await act(async () => void ctx.discover(next));
    await act(async () => void ctx.discover(next));
    await poke();
    await poke();
    await flush();
    expect(ctx.earnedMoments.filter((m) => m.kind === 'level-up')).toEqual([]);
    expect(new Set(ids()).size).toBe(ids().length);
  });

  it('(f) a stale response with a lower level and fewer ids fires nothing and keeps the baseline', async () => {
    const { state } = nearLevelTwo();
    const high = structuredClone(state);
    const m = PRINTED_CARDS[0]!.id;
    high.mastered[m] = '2026-01-01T00:00:00.000Z';
    const c = controllable(high);
    await mount(c.adapter);
    expect(ctx.earnedMoments).toEqual([]);

    // Stale answer: reconcile claims a mastery, but the reload returns an OLDER, smaller state.
    c.arm(emptyState(), { masteredIds: ['x'], completedResearchIds: [], newAchievementIds: [] });
    await poke();
    await flush();
    expect(ctx.progress.level).toBe(1);
    expect(ctx.earnedMoments).toEqual([]);

    // Back to the real state: still the baseline's own contents, so still not news.
    c.arm(high, { masteredIds: ['x'], completedResearchIds: [], newAchievementIds: [] });
    await poke();
    await flush();
    expect(ctx.earnedMoments).toEqual([]);
  });

  it('(g) simultaneous reward changes give one coherent set, and a displayed level removes its moment', async () => {
    const { state } = nearLevelTwo();
    const c = controllable(state);
    await mount(c.adapter);
    expect(ctx.earnedMoments).toEqual([]);

    const bigger = emptyState();
    for (const card of PRINTED_CARDS.slice(0, 12)) bigger.discoveries[card.id] = '2026-01-01T00:00:00.000Z';
    const mastered = PRINTED_CARDS[0]!.id;
    bigger.mastered[mastered] = '2026-01-02T00:00:00.000Z';
    const task = STANDING_TASKS[0]!.id;
    bigger.research[task] = '2026-01-02T00:00:00.000Z';
    const finalLevel = progressFromState(bigger).level;
    expect(finalLevel).toBeGreaterThan(progressFromState(state).level);

    c.arm(bigger, { masteredIds: [mastered], completedResearchIds: [task], newAchievementIds: [] });
    await poke();
    await flush();
    expect(ids().sort()).toEqual([levelUpId(finalLevel), `mastery:${mastered}`, `research:${task}`].sort());
    const levelUps = ctx.earnedMoments.filter((x) => x.kind === 'level-up');
    expect(levelUps).toHaveLength(1);

    act(() => markAnnounced([levelUpId(finalLevel)]));
    expect(ids().some((id) => id.startsWith('level-up:'))).toBe(false);
    expect(ids()).toHaveLength(2);
  });

  it('(h) acknowledging a moment removes it and it never returns', async () => {
    const { state } = nearLevelTwo();
    const c = controllable(state);
    await mount(c.adapter);
    const bigger = structuredClone(state);
    const mastered = PRINTED_CARDS[0]!.id;
    bigger.mastered[mastered] = '2026-01-02T00:00:00.000Z';
    c.arm(bigger, { masteredIds: [mastered], completedResearchIds: [], newAchievementIds: [] });
    await poke();
    await flush();
    // Mastery itself pays XP, so the real level-up arrives beside it.
    expect(ids()).toContain(`mastery:${mastered}`);

    act(() => ctx.acknowledgeMoment(`mastery:${mastered}`));
    expect(ids()).not.toContain(`mastery:${mastered}`);
    for (const id of ids()) act(() => ctx.acknowledgeMoment(id));
    expect(ctx.earnedMoments).toEqual([]);

    c.arm(bigger, { masteredIds: [mastered], completedResearchIds: [], newAchievementIds: [] });
    await poke();
    await flush();
    expect(ctx.earnedMoments).toEqual([]);
  });
});
