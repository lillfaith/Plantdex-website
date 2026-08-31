import type { HerbdexState } from './types';
import { DECK_SIZE, getHerb } from './deck';
import { HABITATS, habitatOf, type HabitatClass } from './habitat';

/**
 * Achievement registry.
 *
 * AGENTS.md: "Store achievement identifiers rather than relying only on display names."
 * Persisted state records only `id`s, so labels can be reworded freely without
 * invalidating anyone's collection. Adding an achievement means appending one entry
 * here — nothing else in the app needs to change.
 *
 * Predicates are pure functions of state so they can be re-evaluated from scratch on
 * every change. That makes unlocks self-healing: if the registry grows, existing
 * players retroactively unlock anything they already qualify for.
 */

/**
 * An achievement's rule, and nothing about how it looks.
 *
 * There used to be an `icon` field here holding an emoji. It has moved to
 * `src/components/icons/achievement-icons.ts`, keyed by id: this module is copied verbatim
 * into the Supabase edge function by `npm run sync:edge-shared`, and the server evaluates
 * predicates — it has no use for a drawing, and shipping presentation into it means a
 * redeploy every time the art changes.
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  isUnlocked: (state: HerbdexState) => boolean;
}

function discoveredCount(state: HerbdexState): number {
  return Object.keys(state.discoveries).length;
}

function researchCount(
  state: HerbdexState,
  predicate: (taskId: string) => boolean = () => true,
): number {
  return Object.keys(state.research).filter(predicate).length;
}

function countWhere(state: HerbdexState, predicate: (rarity: string) => boolean): number {
  let n = 0;
  for (const id of Object.keys(state.discoveries)) {
    const herb = getHerb(id);
    if (herb && predicate(herb.rarity)) n += 1;
  }
  return n;
}

/**
 * How many discovered species have a given PRIMARY habitat.
 *
 * Primary only, matching the filter and the chip. A "first Woodland species" that could be
 * satisfied by a wayside plant whose secondary happens to be Woodland would not mean what
 * it says.
 */
function discoveredInHabitat(state: HerbdexState, habitat: HabitatClass): number {
  let n = 0;
  for (const id of Object.keys(state.discoveries)) {
    if (habitatOf(id)?.primary === habitat) n += 1;
  }
  return n;
}

/** Habitats where the player has discovered at least one species, by primary. */
function habitatsDiscovered(state: HerbdexState): number {
  return HABITATS.filter((habitat) => discoveredInHabitat(state, habitat) > 0).length;
}

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: 'first-find',
    name: 'First Find',
    description: 'Discover your first herb.',
    isUnlocked: (state) => discoveredCount(state) >= 1,
  },
  {
    id: 'forager-10',
    name: 'Backyard Forager',
    description: 'Discover 10 herbs.',
    isUnlocked: (state) => discoveredCount(state) >= 10,
  },
  {
    id: 'explorer-25',
    name: 'Field Explorer',
    description: 'Discover 25 herbs.',
    isUnlocked: (state) => discoveredCount(state) >= 25,
  },
  {
    id: 'rare-finder',
    name: 'Rare Finder',
    description: 'Discover 5 Rare herbs.',
    isUnlocked: (state) => countWhere(state, (rarity) => rarity === 'Rare') >= 5,
  },
  {
    id: 'epic-finder',
    name: 'Epic Finder',
    description: 'Discover every Epic herb in the deck.',
    isUnlocked: (state) => countWhere(state, (rarity) => rarity === 'Epic') >= 3,
  },
  {
    id: 'complete-collection',
    name: 'Complete Collection',
    description: 'Discover every herb in the deck.',
    isUnlocked: (state) => discoveredCount(state) >= DECK_SIZE,
  },
  // Field Research badges. Deliberately achievements rather than a parallel "badge"
  // system: they get stable ids, pure predicates and retroactive unlocking for free, and
  // there is one place to look for everything a player has earned.
  {
    id: 'first-research',
    name: 'Field Researcher',
    description: 'Complete your first Field Research task.',
    isUnlocked: (state) => researchCount(state) >= 1,
  },
  {
    id: 'research-10',
    name: 'Dedicated Researcher',
    description: 'Complete 10 Field Research tasks.',
    isUnlocked: (state) => researchCount(state) >= 10,
  },
  {
    id: 'seasonal-sweep',
    name: 'Four Seasons',
    description: 'Complete the Field Research for every season.',
    isUnlocked: (state) => researchCount(state, (id) => id.startsWith('seasonal:')) >= 4,
  },
  {
    id: 'backyard-collection',
    name: 'Backyard Collection',
    description: 'Complete the Backyard Collection challenge.',
    isUnlocked: (state) => Boolean(state.research['collection:backyard']),
  },

  /*
   * HABITAT ACHIEVEMENTS.
   *
   * One per class for the first find, plus one for covering all five. Deliberately a SMALL
   * first set: five classes could carry dozens of tiers, and a wall of habitat badges would
   * drown the nine that already exist rather than add to them.
   *
   * Pure predicates over discoveries like every achievement here, so they re-evaluate from
   * scratch and unlock retroactively for players who found the species before these existed.
   */
  {
    id: 'habitat-woodland',
    name: 'Into the Woods',
    description: 'Discover your first Woodland species.',
    isUnlocked: (state) => discoveredInHabitat(state, 'woodland') >= 1,
  },
  {
    id: 'habitat-meadow',
    name: 'Open Ground',
    description: 'Discover your first Meadow species.',
    isUnlocked: (state) => discoveredInHabitat(state, 'meadow') >= 1,
  },
  {
    id: 'habitat-wetland',
    name: 'Wet Feet',
    description: 'Discover your first Wetland species.',
    isUnlocked: (state) => discoveredInHabitat(state, 'wetland') >= 1,
  },
  {
    id: 'habitat-wayside',
    name: 'Roadside Botanist',
    description: 'Discover your first Wayside species.',
    isUnlocked: (state) => discoveredInHabitat(state, 'wayside') >= 1,
  },
  {
    id: 'habitat-garden',
    name: 'Close to Home',
    description: 'Discover your first Garden species.',
    isUnlocked: (state) => discoveredInHabitat(state, 'garden') >= 1,
  },
  {
    id: 'habitat-sweep',
    name: 'Five Grounds',
    description: 'Discover at least one species from every habitat.',
    isUnlocked: (state) => habitatsDiscovered(state) === HABITATS.length,
  },
] as const;

const BY_ID = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));

export function getAchievement(id: string): Achievement | undefined {
  return BY_ID.get(id);
}

/**
 * Re-evaluate every achievement against `state` and return the ids that should now be
 * unlocked but are not yet recorded. Callers persist them with an unlock timestamp.
 */
export function newlyUnlocked(state: HerbdexState): string[] {
  return ACHIEVEMENTS.filter(
    (achievement) => !state.achievements[achievement.id] && achievement.isUnlocked(state),
  ).map((achievement) => achievement.id);
}
