/**
 * Core domain types for the Plantdex Herbdex.
 *
 * These shapes are intentionally the same ones a server would return in V0.3, so the
 * UI does not need to change when local storage is replaced by a real database.
 */

export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic'] as const;
export type Rarity = (typeof RARITIES)[number];

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

/**
 * Traditional-use categories, taken from the icons printed on each card face.
 *
 * These are categories of *traditional and historical* use only. They are not medical
 * claims and must never be presented as treatment advice — see SafetyNotice.
 */
export const USE_KEYS = [
  'tea',
  'digestive',
  'respiratory',
  'kidney',
  'skin',
  'wound',
  'heart',
  'immune',
  'joint',
  'calm',
  'energy',
  'edible',
] as const;
export type UseKey = (typeof USE_KEYS)[number];

export interface HerbStats {
  /** Number of water droplets printed on the card (1-5). */
  water: number;
  /** Number of suns printed on the card (1-5). */
  sun: number;
  /** Number of thermometers printed on the card (1-5). */
  temperature: number;
}

export interface Herb {
  /** Stable id derived from the scientific name — never the common name. */
  id: string;
  /** Position in the physical deck, as printed (#01-#45). */
  cardNumber: number;
  commonName: string;
  scientificName: string;
  rarity: Rarity;
  xp: number;
  season: Season;
  uses: UseKey[];
  stats: HerbStats;
  image: string;
  thumb: string;
}

export interface Deck {
  deckName: string;
  deckSize: number;
  nonHerbCards: { cardNumber: number; title: string }[];
  herbs: Herb[];
}

/** ISO-8601 timestamp. */
export type Timestamp = string;

/**
 * Everything we persist about a player.
 *
 * Deliberately minimal: XP, level and progress are *derived* from `discoveries` rather
 * than stored, so they cannot drift out of sync and cannot be inflated by replaying a
 * discovery. See src/lib/progression.ts.
 */
export interface HerbdexState {
  version: number;
  discoveries: Record<string, Timestamp>;
  achievements: Record<string, Timestamp>;
}

export interface DiscoveryResult {
  /** False when the herb was already discovered — no XP was awarded. */
  awarded: boolean;
  xpAwarded: number;
  newAchievementIds: string[];
}
