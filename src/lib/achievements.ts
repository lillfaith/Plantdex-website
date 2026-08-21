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

export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** Presentational only — never the identifier. */
  icon: string;
  isUnlocked: (state: HerbdexState) => boolean;
}

function discoveredCount(state: HerbdexState): number {
  return Object.keys(state.discoveries).length;
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
    icon: '🌱',
    isUnlocked: (state) => discoveredCount(state) >= 1,
  },
  {
    id: 'forager-10',
    name: 'Backyard Forager',
    description: 'Discover 10 herbs.',
    icon: '🌿',
    isUnlocked: (state) => discoveredCount(state) >= 10,
  },
  {
    id: 'explorer-25',
    name: 'Field Explorer',
    description: 'Discover 25 herbs.',
    icon: '🌼',
    isUnlocked: (state) => discoveredCount(state) >= 25,
  },
  {
    id: 'rare-finder',
    name: 'Rare Finder',
    description: 'Discover 5 Rare herbs.',
    icon: '✨',
    isUnlocked: (state) => countWhere(state, (rarity) => rarity === 'Rare') >= 5,
  },
  {
    id: 'epic-finder',
    name: 'Epic Finder',
    description: 'Discover every Epic herb in the deck.',
    icon: '💎',
    isUnlocked: (state) => countWhere(state, (rarity) => rarity === 'Epic') >= 3,
  },
  {
    id: 'complete-collection',
    name: 'Complete Collection',
    description: 'Discover every herb in the deck.',
    icon: '🏆',
    isUnlocked: (state) => discoveredCount(state) >= DECK_SIZE,
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
