import deckJson from '@/data/herbs.json';
import type { Deck, Herb, Rarity, Season, UseKey } from './types';

/**
 * The deck, loaded from generated data.
 *
 * `src/data/herbs.json` is produced by scripts/build_deck.py from the print package.
 * Its shape is asserted here once; `src/lib/deck.test.ts` validates the real file
 * against the type contract so a bad regeneration fails CI rather than the browser.
 */
export const DECK = deckJson as unknown as Deck;

export const HERBS: Herb[] = DECK.herbs;

/** Total number of herbs in the physical deck. Never hard-code this in a component. */
export const DECK_SIZE = HERBS.length;

/** Maximum XP obtainable from a complete collection. */
export const MAX_DECK_XP = HERBS.reduce((sum, herb) => sum + herb.xp, 0);

const BY_ID = new Map(HERBS.map((herb) => [herb.id, herb]));

export function getHerb(id: string): Herb | undefined {
  return BY_ID.get(id);
}

export function isHerbId(id: string): boolean {
  return BY_ID.has(id);
}

/** Card-number order, matching the printed deck. */
export function herbsInDeckOrder(): Herb[] {
  return [...HERBS].sort((a, b) => a.cardNumber - b.cardNumber);
}

// --- Display labels ----------------------------------------------------------
// Single source of truth for how deck vocabulary is worded in the UI.

export const RARITY_LABEL: Record<Rarity, string> = {
  Common: 'Common',
  Uncommon: 'Uncommon',
  Rare: 'Rare',
  Epic: 'Epic',
};

export const SEASON_LABEL: Record<Season, string> = {
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  winter: 'Winter',
};

/**
 * Labels for the traditional-use icons printed on the cards.
 *
 * Wording is deliberately hedged ("traditionally associated with") because the site is
 * educational: these describe historical and folk use, not medical effect. The deck's
 * own Icon Guide card should be used to confirm this legend before public launch.
 */
export const USE_LABEL: Record<UseKey, string> = {
  tea: 'Tea / infusion',
  digestive: 'Digestion',
  respiratory: 'Lungs & breathing',
  kidney: 'Kidneys & urinary',
  skin: 'Skin',
  wound: 'Wound & first aid',
  heart: 'Circulation',
  immune: 'Immune support',
  joint: 'Aches & joints',
  calm: 'Rest & calm',
  energy: 'Energy & vitality',
  edible: 'Edible / culinary',
};

export const USE_DESCRIPTION: Record<UseKey, string> = {
  tea: 'Traditionally prepared as a tea or infusion.',
  digestive: 'Traditionally associated with digestion.',
  respiratory: 'Traditionally associated with the lungs and breathing.',
  kidney: 'Traditionally associated with the kidneys and urinary system.',
  skin: 'Traditionally applied to the skin.',
  wound: 'Traditionally used in wound and first-aid care.',
  heart: 'Traditionally associated with circulation.',
  immune: 'Traditionally associated with immune support.',
  joint: 'Traditionally associated with aches and joints.',
  calm: 'Traditionally associated with rest and calm.',
  energy: 'Traditionally associated with energy and vitality.',
  edible: 'Has traditional culinary use.',
};

/** Labels for the 1-5 pip stat rows printed on each card. */
export const STAT_LABEL = {
  water: 'Water',
  sun: 'Sun',
  temperature: 'Temperature',
} as const;
