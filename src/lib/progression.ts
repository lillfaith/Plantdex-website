import type { Herb, HerbdexState, Rarity } from './types';
import { getHerb, MAX_DECK_XP } from './deck';

/**
 * THE SINGLE SOURCE OF TRUTH FOR XP AND LEVELS.
 *
 * AGENTS.md: "Do not hard-code level thresholds throughout UI components. Use a
 * centralized configuration or calculation system." Every component reads XP and level
 * through the functions below and never through a literal number. Tuning the game
 * economy should mean editing this file and nothing else.
 */

/**
 * XP awarded for discovering a herb of each rarity.
 * Must stay in sync with XP_BY_RARITY in scripts/build_deck.py, which stamps the value
 * onto each herb at build time. `src/lib/progression.test.ts` enforces that.
 */
export const XP_BY_RARITY: Record<Rarity, number> = {
  Common: 100,
  Uncommon: 175,
  Rare: 300,
  Epic: 500,
};

export interface LevelDefinition {
  level: number;
  name: string;
  /** Total XP at which this level begins. */
  minXp: number;
}

/**
 * Level ladder. Add entries to extend — nothing else needs to change.
 * The top level is reachable just before a complete collection (deck total: 8,750 XP).
 */
export const LEVELS: readonly LevelDefinition[] = [
  { level: 1, name: 'Seedling', minXp: 0 },
  { level: 2, name: 'Sprout', minXp: 250 },
  { level: 3, name: 'Backyard Forager', minXp: 600 },
  { level: 4, name: 'Field Explorer', minXp: 1200 },
  { level: 5, name: 'Plant Collector', minXp: 2200 },
  { level: 6, name: 'Field Botanist', minXp: 3600 },
  { level: 7, name: 'Master Herbalist', minXp: 5500 },
  { level: 8, name: 'Grand Herbalist', minXp: 8000 },
] as const;

export const MAX_LEVEL = LEVELS[LEVELS.length - 1]!.level;

export interface Progress {
  xp: number;
  level: number;
  levelName: string;
  /** XP at which the current level began. */
  levelFloor: number;
  /** Total XP needed to reach the next level, or null at max level. */
  nextLevelXp: number | null;
  /** XP earned inside the current level band. */
  xpIntoLevel: number;
  /** XP the current level band spans, or null at max level. */
  xpForLevel: number | null;
  /** 0-1 progress through the current level. 1 when max level is reached. */
  fraction: number;
}

/** Total XP for a set of discovered herb ids. Unknown ids contribute nothing. */
export function xpForDiscoveries(discoveredIds: Iterable<string>): number {
  let total = 0;
  for (const id of discoveredIds) {
    total += getHerb(id)?.xp ?? 0;
  }
  return total;
}

/** Total XP for a persisted state. XP is always derived, never read from storage. */
export function xpForState(state: HerbdexState): number {
  return xpForDiscoveries(Object.keys(state.discoveries));
}

export function levelFromXp(xp: number): LevelDefinition {
  const safeXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  let current = LEVELS[0]!;
  for (const definition of LEVELS) {
    if (safeXp >= definition.minXp) current = definition;
    else break;
  }
  return current;
}

/** Full progress breakdown for a given XP total. The only thing the UI should call. */
export function progressFromXp(xp: number): Progress {
  const safeXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const definition = levelFromXp(safeXp);
  const next = LEVELS.find((entry) => entry.level === definition.level + 1) ?? null;

  const xpIntoLevel = safeXp - definition.minXp;
  const xpForLevel = next ? next.minXp - definition.minXp : null;

  return {
    xp: safeXp,
    level: definition.level,
    levelName: definition.name,
    levelFloor: definition.minXp,
    nextLevelXp: next?.minXp ?? null,
    xpIntoLevel,
    xpForLevel,
    fraction: xpForLevel === null ? 1 : Math.min(1, Math.max(0, xpIntoLevel / xpForLevel)),
  };
}

export function progressFromState(state: HerbdexState): Progress {
  return progressFromXp(xpForState(state));
}

/** XP a herb is worth. Reads the value stamped on the herb at deck build time. */
export function xpForHerb(herb: Herb): number {
  return herb.xp;
}

/** Highest XP obtainable — a complete collection. */
export const MAX_XP = MAX_DECK_XP;
