import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  MAX_LEVEL,
  MAX_XP,
  XP_BY_RARITY,
  XP_FOR_LEARNING,
  XP_FOR_MASTERY,
  levelFromXp,
  progressFromXp,
  xpForDiscoveries,
  xpForState,
} from './progression';
import { emptyState } from './storage';
import { HERBS, MAX_DECK_XP } from './deck';

describe('level ladder', () => {
  it('starts at zero and increases monotonically', () => {
    expect(LEVELS[0]!.minXp).toBe(0);
    for (let i = 1; i < LEVELS.length; i += 1) {
      expect(LEVELS[i]!.minXp).toBeGreaterThan(LEVELS[i - 1]!.minXp);
      expect(LEVELS[i]!.level).toBe(LEVELS[i - 1]!.level + 1);
    }
  });

  it('lands on the new level exactly at each threshold, and not one XP before', () => {
    for (const definition of LEVELS) {
      expect(levelFromXp(definition.minXp).level).toBe(definition.level);
      if (definition.minXp > 0) {
        expect(levelFromXp(definition.minXp - 1).level).toBe(definition.level - 1);
      }
    }
  });

  it('clamps nonsense XP to level 1 rather than throwing', () => {
    expect(levelFromXp(-500).level).toBe(1);
    expect(levelFromXp(Number.NaN).level).toBe(1);
    expect(progressFromXp(-10).xp).toBe(0);
  });

  it('reports a complete band at max level', () => {
    const top = LEVELS[LEVELS.length - 1]!;
    const progress = progressFromXp(top.minXp + 10_000);
    expect(progress.level).toBe(MAX_LEVEL);
    expect(progress.nextLevelXp).toBeNull();
    expect(progress.xpForLevel).toBeNull();
    expect(progress.fraction).toBe(1);
  });

  it('reports fractional progress inside a band', () => {
    const first = LEVELS[0]!;
    const second = LEVELS[1]!;
    const midpoint = (second.minXp - first.minXp) / 2;
    const progress = progressFromXp(midpoint);
    expect(progress.level).toBe(1);
    expect(progress.fraction).toBeCloseTo(0.5, 5);
    expect(progress.xpIntoLevel).toBe(midpoint);
  });

  it('keeps the top level reachable before a fully mastered deck', () => {
    expect(LEVELS[LEVELS.length - 1]!.minXp).toBeLessThanOrEqual(MAX_XP);
  });

  /**
   * Levels 1-8 predate learning and mastery XP. Raising one of their thresholds would
   * demote players whose XP had not changed, so they are pinned here on purpose: extend
   * the ladder upwards, never re-tune it underneath someone.
   */
  it('leaves the original discovery-only ladder untouched', () => {
    expect(LEVELS.slice(0, 8).map((entry) => entry.minXp)).toEqual([
      0, 250, 600, 1200, 2200, 3600, 5500, 8000,
    ]);
    expect(LEVELS[7]!.minXp).toBeLessThanOrEqual(MAX_DECK_XP);
  });
});

describe('xpForDiscoveries', () => {
  it('sums the XP of known herbs', () => {
    const [a, b] = HERBS;
    expect(xpForDiscoveries([a!.id, b!.id])).toBe(a!.xp + b!.xp);
  });

  it('ignores unknown ids instead of trusting them', () => {
    expect(xpForDiscoveries(['not-a-real-herb'])).toBe(0);
  });

  it('matches the XP stamped onto each herb at deck build time', () => {
    for (const herb of HERBS) {
      expect(herb.xp).toBe(XP_BY_RARITY[herb.rarity]);
    }
  });
});

describe('xpForState across the three mastery stages', () => {
  const herb = HERBS[0]!;
  const at = '2026-01-01T00:00:00.000Z';

  it('pays for discovery, learning and mastery, and only for real cards', () => {
    expect(xpForState(emptyState())).toBe(0);

    expect(xpForState({ ...emptyState(), discoveries: { [herb.id]: at } })).toBe(herb.xp);

    expect(
      xpForState({
        ...emptyState(),
        discoveries: { [herb.id]: at },
        learned: { [herb.id]: at },
      }),
    ).toBe(herb.xp + XP_FOR_LEARNING);

    expect(
      xpForState({
        ...emptyState(),
        discoveries: { [herb.id]: at },
        learned: { [herb.id]: at },
        mastered: { [herb.id]: at },
      }),
    ).toBe(herb.xp + XP_FOR_LEARNING + XP_FOR_MASTERY);
  });

  it('ignores ids that are not in the deck at every stage', () => {
    expect(
      xpForState({
        ...emptyState(),
        discoveries: { ghost: at },
        learned: { ghost: at },
        mastered: { ghost: at },
      }),
    ).toBe(0);
  });

  it('keeps the derived total stable when the same state is scored twice', () => {
    const state = {
      ...emptyState(),
      discoveries: { [herb.id]: at },
      learned: { [herb.id]: at },
      mastered: { [herb.id]: at },
    };
    expect(xpForState(state)).toBe(xpForState(state));
  });

  it('caps out at MAX_XP when every card is fully mastered', () => {
    const every = (): Record<string, string> =>
      Object.fromEntries(HERBS.map((entry) => [entry.id, at]));
    const complete = {
      ...emptyState(),
      discoveries: every(),
      learned: every(),
      mastered: every(),
    };
    expect(xpForState(complete)).toBe(MAX_XP);
  });
});
