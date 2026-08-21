import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, newlyUnlocked } from './achievements';
import { DECK_SIZE, HERBS } from './deck';
import { emptyState } from './storage';
import type { HerbdexState } from './types';

function stateWith(ids: string[]): HerbdexState {
  const state = emptyState();
  for (const id of ids) state.discoveries[id] = '2026-01-01T00:00:00.000Z';
  return state;
}

const idsByRarity = (rarity: string) =>
  HERBS.filter((herb) => herb.rarity === rarity).map((herb) => herb.id);

describe('achievement registry', () => {
  it('has unique, stable ids', () => {
    const ids = ACHIEVEMENTS.map((achievement) => achievement.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('unlocks nothing on an empty collection', () => {
    expect(newlyUnlocked(emptyState())).toEqual([]);
  });
});

describe('count thresholds', () => {
  const cases: { id: string; needed: number }[] = [
    { id: 'first-find', needed: 1 },
    { id: 'forager-10', needed: 10 },
    { id: 'explorer-25', needed: 25 },
  ];

  for (const { id, needed } of cases) {
    it(`${id} fires at exactly ${needed} discoveries and not before`, () => {
      const ids = HERBS.map((herb) => herb.id);
      expect(newlyUnlocked(stateWith(ids.slice(0, needed - 1)))).not.toContain(id);
      expect(newlyUnlocked(stateWith(ids.slice(0, needed)))).toContain(id);
    });
  }
});

describe('rarity thresholds', () => {
  it('rare-finder needs five Rare herbs', () => {
    const rares = idsByRarity('Rare');
    expect(newlyUnlocked(stateWith(rares.slice(0, 4)))).not.toContain('rare-finder');
    expect(newlyUnlocked(stateWith(rares.slice(0, 5)))).toContain('rare-finder');
  });

  it('epic-finder needs every Epic herb', () => {
    const epics = idsByRarity('Epic');
    expect(epics.length).toBeGreaterThan(0);
    expect(newlyUnlocked(stateWith(epics.slice(0, -1)))).not.toContain('epic-finder');
    expect(newlyUnlocked(stateWith(epics))).toContain('epic-finder');
  });
});

describe('complete-collection', () => {
  it('fires only when the whole deck is discovered', () => {
    const all = HERBS.map((herb) => herb.id);
    expect(all.length).toBe(DECK_SIZE);
    expect(newlyUnlocked(stateWith(all.slice(0, -1)))).not.toContain('complete-collection');
    expect(newlyUnlocked(stateWith(all))).toContain('complete-collection');
  });

  it('does not re-report an achievement that is already recorded', () => {
    const state = stateWith(HERBS.map((herb) => herb.id));
    for (const id of newlyUnlocked(state)) state.achievements[id] = '2026-01-01T00:00:00.000Z';
    expect(newlyUnlocked(state)).toEqual([]);
  });
});
