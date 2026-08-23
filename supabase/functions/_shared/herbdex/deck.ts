import deckJson from './herbs.json' with { type: 'json' };
import type { Deck, Herb, Rarity, Season, UseKey } from './types.ts';

/**
 * The deck, loaded from generated data.
 *
 * `src/data/herbs.json` is produced by scripts/build_deck.py from the per-card print
 * PDFs. Its shape is asserted here once; `src/lib/deck.test.ts` validates the real file
 * against the type contract so a bad regeneration fails CI rather than the browser.
 */
export const DECK = deckJson as unknown as Deck;

export const HERBS: Herb[] = DECK.herbs;

/** Total number of herbs in the physical deck. Never hard-code this in a component. */
export const DECK_SIZE = HERBS.length;

/** Maximum XP obtainable from a complete collection. */
export const MAX_DECK_XP = HERBS.reduce((sum, herb) => sum + herb.xp, 0);

/** The deck's own disclaimer text, printed on card #47. */
export const DISCLAIMER = DECK.disclaimer;

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
// Sourced from the generated data, which takes them from the deck's own Icon Cheat
// Sheet (card 46). Do not restate them here — a change to the card should flow through
// the build script, not through a second copy in the app.

export const USE_LABEL: Record<UseKey, string> = DECK.useLabels;
export const SEASON_LABEL: Record<Season, string> = DECK.seasonLabels;

export const RARITY_LABEL: Record<Rarity, string> = {
  Common: 'Common',
  Uncommon: 'Uncommon',
  Rare: 'Rare',
  Epic: 'Epic',
};

/** Labels for the 1-5 pip stat rows printed on each card. */
export const STAT_LABEL = {
  water: 'Water',
  sun: 'Sun',
  temperature: 'Temperature',
} as const;

/** Headings for the back-of-card sections, matching the print exactly. */
export const BACK_SECTION_LABEL = {
  healingTraits: 'Healing Traits',
  compounds: 'Signature Compounds',
  taste: 'Taste Profile',
  aromatic: 'Aromatic Profile',
  preparations: 'Preparations',
  usableParts: 'Usable Parts',
} as const;
