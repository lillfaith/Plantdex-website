import type { Herb, HerbdexState, Rarity } from './types.ts';
import { DECK_SIZE, getHerb, MAX_DECK_XP } from './deck.ts';

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

/**
 * XP for the second and third stages of card mastery (see src/lib/mastery.ts).
 *
 * Deliberately much smaller than a discovery. Finding a plant in the real world is the
 * thing this product is for; learning and mastering a card are worth rewarding, but they
 * must never out-earn going outside, or the incentive points at the screen instead of at
 * the field. A flat rate rather than a per-rarity one, because the effort is the same for
 * every card — rarity describes how hard the plant is to *find*, which discovery already
 * pays for.
 */
export const XP_FOR_LEARNING = 50;
export const XP_FOR_MASTERY = 100;

/**
 * XP for completing a Field Research task, by kind.
 *
 * A table rather than a number on each task, so the reward scale stays comparable across
 * the whole system and cannot drift task by task. `src/lib/research.ts` reads these and
 * contains no XP literal of its own — same rule every component follows.
 *
 * Sized against the rest of the economy: a daily is worth a quarter of the cheapest
 * discovery, because a daily is a nudge, not an achievement. A seasonal challenge asks for
 * several real finds over months and is paid accordingly.
 */
export const RESEARCH_XP = {
  daily: 25,
  collection: 250,
  seasonal: 500,
} as const;

export type ResearchKind = keyof typeof RESEARCH_XP;

export interface LevelDefinition {
  level: number;
  name: string;
  /** Total XP at which this level begins. */
  minXp: number;
}

/**
 * Level ladder. Add entries to extend — nothing else needs to change.
 *
 * Levels 1-8 span what discovery alone can earn (8,750 XP for a complete collection).
 * Levels 9-11 were APPENDED, not re-tuned, when learning and mastery began awarding XP:
 * raising an existing threshold would have demoted players whose XP had not changed,
 * which is the one thing a progression system must never do to someone.
 *
 * The top level is reachable just short of a fully mastered deck (15,500 XP).
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
  { level: 9, name: 'Herbarium Keeper', minXp: 10_000 },
  { level: 10, name: 'Deck Sage', minXp: 12_500 },
  { level: 11, name: 'Plantdex Grandmaster', minXp: 15_000 },
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

/** How many recorded ids belong to real deck cards. Tampered ids are worth nothing. */
function countRealHerbs(record: Record<string, string>): number {
  let n = 0;
  for (const id of Object.keys(record)) if (getHerb(id)) n += 1;
  return n;
}

/**
 * Total XP for a persisted state. XP is always derived, never read from storage.
 *
 * All three mastery stages pay, and all three are summed from the same records the UI
 * displays — so there is still no XP counter anywhere that a replayed action could
 * increment twice. Re-running any award recomputes the identical total.
 */
export function xpForState(state: HerbdexState): number {
  return (
    xpForDiscoveries(Object.keys(state.discoveries)) +
    countRealHerbs(state.learned) * XP_FOR_LEARNING +
    countRealHerbs(state.mastered) * XP_FOR_MASTERY +
    xpForResearch(state)
  );
}

/**
 * The kind of research task an id refers to, read from its prefix.
 *
 * Task ids are namespaced by kind at construction (`daily:…`, `seasonal:…`,
 * `collection:…`), so the reward is derivable from the id alone. That keeps this file free
 * of any dependency on the task registry — which reads the XP table above, and would
 * otherwise form an import cycle just to answer "how much is this worth".
 *
 * An unrecognised prefix is worth nothing. The guard that actually matters lives at the
 * other end: `reconcileResearch` only ever records ids belonging to real, active tasks, so
 * an id for a task that does not exist never gets written in the first place.
 */
export function researchKindFromId(id: string): ResearchKind | null {
  const prefix = id.split(':')[0];
  return prefix && prefix in RESEARCH_XP ? (prefix as ResearchKind) : null;
}

function xpForResearch(state: HerbdexState): number {
  let total = 0;
  for (const id of Object.keys(state.research)) {
    const kind = researchKindFromId(id);
    if (kind) total += RESEARCH_XP[kind];
  }
  return total;
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

/**
 * Highest XP obtainable from the collection alone — every card discovered, learned and
 * mastered.
 *
 * This is no longer the maximum XP a player can hold: Field Research keeps paying out as
 * long as there are tasks to do, so there is no ceiling any more. It is still the number
 * the level ladder is anchored to, because the ladder should be climbable by collecting,
 * without research being mandatory.
 */
export const MAX_COLLECTION_XP = MAX_DECK_XP + DECK_SIZE * (XP_FOR_LEARNING + XP_FOR_MASTERY);
