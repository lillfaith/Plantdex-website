import deckJson from '@/data/herbs.json';
import type { Deck, Herb, Rarity, Season, UseKey } from './types';

/**
 * THE PRINTED DECK, loaded from generated data.
 *
 * `src/data/herbs.json` is produced by scripts/build_deck.py from the per-card print
 * PDFs. Its shape is asserted here once; `src/lib/deck.test.ts` validates the real file
 * against the type contract so a bad regeneration fails CI rather than the browser.
 *
 * EVERYTHING THIS MODULE EXPORTS IS THE PHYSICAL DECK, AND THE NAMES SAY SO.
 *
 * Plantdex is going to know about species that were never printed on a card. Until now
 * "the deck" and "every plant Plantdex knows" were the same list, and a dozen call sites
 * quietly relied on that — Field Research sizing its tasks, the knowledge check drawing
 * distractors, the Seed Shelf deciding a species has no card, every "of 45" count. The
 * moment a digital-only entry existed, all of them would have absorbed it silently.
 *
 * So this file is now, by name and by content, ONLY what was printed: it reads herbs.json,
 * which by construction contains exactly the cards that went to print. The wider set lives
 * in `catalogue.ts`, and a caller has to ask for it deliberately. Defaulting to the printed
 * deck is the safe direction to be wrong in — a feature that forgets to think about this
 * keeps working on the 45 rather than silently growing.
 */
export const DECK = deckJson as unknown as Deck;

/**
 * The cards of the physical Collection 01 deck.
 *
 * Was `HERBS`, renamed so no call site can mean "every plant" by accident. If you want the
 * digital catalogue too, `catalogue.ts` exports `CATALOGUE` and says what that includes.
 */
export const PRINTED_CARDS: Herb[] = DECK.herbs;

/** Number of plant cards in the PHYSICAL deck. Never hard-code this in a component. */
export const PRINTED_DECK_SIZE = PRINTED_CARDS.length;

/** Maximum XP obtainable from completing the printed deck. */
export const MAX_PRINTED_DECK_XP = PRINTED_CARDS.reduce((sum, herb) => sum + herb.xp, 0);

/** The deck's own disclaimer text, printed on card #47. */
export const DISCLAIMER = DECK.disclaimer;

const BY_ID = new Map(PRINTED_CARDS.map((herb) => [herb.id, herb]));

/**
 * A card from the PRINTED deck, by id.
 *
 * Deliberately not catalogue-wide. XP, achievements and completion all resolve ids through
 * here, so keeping it printed-only is what makes "a digital card cannot change your XP" a
 * property of the code rather than a promise. `catalogue.ts` has the wider lookup.
 */
export function getPrintedCard(id: string): Herb | undefined {
  return BY_ID.get(id);
}

export function isPrintedCardId(id: string): boolean {
  return BY_ID.has(id);
}

/** Card-number order, matching the printed deck. */
export function printedCardsInDeckOrder(): Herb[] {
  return [...PRINTED_CARDS].sort((a, b) => a.cardNumber - b.cardNumber);
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
