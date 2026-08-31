import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, newlyUnlocked } from './achievements';
import { HERBS } from './deck';
import { HABITATS, HABITAT_LABEL, habitatOf } from './habitat';
import { STANDING_TASKS, buildWorld, type ResearchWorld } from './research';
import { reconcileResearch } from './herbdex-reducer';
import { emptyState } from './herbdex-state';
import { RESEARCH_XP, xpForState } from './progression';
import type { HerbdexState } from './types';

const habitatAchievements = ACHIEVEMENTS.filter((a) => a.id.startsWith('habitat-'));
const habitatTasks = STANDING_TASKS.filter((t) => t.id.startsWith('collection:habitat-'));

function withDiscoveries(ids: string[]): HerbdexState {
  const state = emptyState();
  for (const id of ids) state.discoveries[id] = '2026-01-01T00:00:00.000Z';
  return state;
}
const world = (state: HerbdexState): ResearchWorld => buildWorld(state, {});

describe('habitat achievements', () => {
  it('adds exactly one per class plus a sweep, and no more', () => {
    // Deliberately a small first set — a wall of habitat badges would drown the nine that
    // already exist. This test is what stops the set quietly growing.
    expect(habitatAchievements).toHaveLength(HABITATS.length + 1);
    expect(habitatAchievements.map((a) => a.id).sort()).toEqual(
      [...HABITATS.map((h) => `habitat-${h}`), 'habitat-sweep'].sort(),
    );
  });

  it('unlocks a class achievement on the first species with that PRIMARY habitat', () => {
    for (const habitat of HABITATS) {
      const first = HERBS.find((herb) => habitatOf(herb.id)?.primary === habitat)!;
      const unlocked = newlyUnlocked(withDiscoveries([first.id]));
      expect(unlocked, `${HABITAT_LABEL[habitat]}`).toContain(`habitat-${habitat}`);
    }
  });

  it('does NOT unlock on a species whose habitat is only secondary', () => {
    // A "first Woodland species" satisfied by a wayside plant would not mean what it says.
    const herb = HERBS.find((h) => {
      const a = habitatOf(h.id);
      return a?.secondary && a.secondary !== a.primary;
    })!;
    const secondary = habitatOf(herb.id)!.secondary!;
    expect(newlyUnlocked(withDiscoveries([herb.id]))).not.toContain(`habitat-${secondary}`);
  });

  it('unlocks the sweep only when all five classes are covered', () => {
    const oneEach = HABITATS.map(
      (habitat) => HERBS.find((herb) => habitatOf(herb.id)?.primary === habitat)!.id,
    );
    expect(newlyUnlocked(withDiscoveries(oneEach.slice(0, 4)))).not.toContain('habitat-sweep');
    expect(newlyUnlocked(withDiscoveries(oneEach))).toContain('habitat-sweep');
  });

  it('cannot award XP twice for the same habitat achievement', () => {
    /*
     * The structural guarantee, restated for the new achievements: XP is derived from
     * records, never stored, and an achievement already recorded is not returned again.
     */
    const oneEach = HABITATS.map(
      (habitat) => HERBS.find((herb) => habitatOf(herb.id)?.primary === habitat)!.id,
    );
    const state = withDiscoveries(oneEach);
    const first = newlyUnlocked(state);
    for (const id of first) state.achievements[id] = '2026-01-01T00:00:00.000Z';
    expect(newlyUnlocked(state)).toEqual([]);
    const xpOnce = xpForState(state);
    // Re-recording the same unlocks changes nothing, because XP reads the record set.
    for (const id of first) state.achievements[id] = '2026-02-02T00:00:00.000Z';
    expect(xpForState(state)).toBe(xpOnce);
  });
});

describe('habitat research tasks', () => {
  it('adds exactly one standing task per class', () => {
    expect(habitatTasks).toHaveLength(HABITATS.length);
    expect(habitatTasks.map((t) => t.id).sort()).toEqual(
      HABITATS.map((h) => `collection:habitat-${h}`).sort(),
    );
  });

  it('sizes every target against real deck supply', () => {
    // A target the deck cannot meet reads as the app being broken. Wetland holds only six
    // primaries against Woodland's ten.
    for (const habitat of HABITATS) {
      const supply = HERBS.filter((herb) => habitatOf(herb.id)?.primary === habitat).length;
      const task = habitatTasks.find((t) => t.id === `collection:habitat-${habitat}`)!;
      expect(task.herbIds).toHaveLength(supply);
      for (const step of task.steps) {
        expect(step.target, `${habitat}/${step.id}`).toBeGreaterThan(0);
        expect(step.target, `${habitat}/${step.id}`).toBeLessThanOrEqual(supply);
      }
    }
  });

  it('is completable — every task reports done once the deck is mastered', () => {
    const state = emptyState();
    for (const herb of HERBS) {
      state.discoveries[herb.id] = '2026-01-01T00:00:00.000Z';
      state.learned[herb.id] = '2026-01-01T00:00:00.000Z';
    }
    const w = world(state);
    for (const task of habitatTasks) {
      for (const step of task.steps) {
        expect(step.measure(w), `${task.id}/${step.id}`).toBeGreaterThanOrEqual(step.target);
      }
    }
  });

  it('records completion once and stays idempotent', () => {
    const state = emptyState();
    for (const herb of HERBS) {
      state.discoveries[herb.id] = '2026-01-01T00:00:00.000Z';
      state.learned[herb.id] = '2026-01-01T00:00:00.000Z';
    }
    const first = reconcileResearch(state, world(state), [...STANDING_TASKS]);
    for (const id of habitatTasks.map((t) => t.id)) {
      expect(first.state.research[id], `${id} not recorded`).toBeDefined();
    }
    const xpOnce = xpForState(first.state);
    // Reconciling again returns the SAME STATE OBJECT when there is nothing new to record —
    // the idempotence contract, not merely an equal-value check.
    const second = reconcileResearch(first.state, world(first.state), [...STANDING_TASKS]);
    expect(second.state).toBe(first.state);
    expect(second.completedIds).toEqual([]);
    expect(second.xpAwarded).toBe(0);
    expect(xpForState(second.state)).toBe(xpOnce);
  });

  it('pays the collection rate, from the table and not from the task', () => {
    for (const task of habitatTasks) expect(task.kind).toBe('collection');
    expect(RESEARCH_XP.collection).toBeGreaterThan(0);
  });
});
