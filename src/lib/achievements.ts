import type { HerbdexState } from './types';
import { DECK_SIZE, getHerb } from './deck';

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
