import { describe, expect, it } from 'vitest';
import {
  LEVELS,
  MAX_LEVEL,
  XP_BY_RARITY,
  levelFromXp,
  progressFromXp,
  xpForDiscoveries,
} from './progression';
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

  it('keeps the top level reachable before a complete collection', () => {
    expect(LEVELS[LEVELS.length - 1]!.minXp).toBeLessThanOrEqual(MAX_DECK_XP);
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
