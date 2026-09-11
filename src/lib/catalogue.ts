import { PRINTED_CARDS, PRINTED_DECK_SIZE } from './deck';
import { FIELD_CARDS } from './field-cards';
import type { Herb } from './types';

/**
 * THE DIGITAL CATALOGUE — every species Plantdex knows, printed or not.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO KINDS OF MEMBERSHIP, AND THEY ARE NOT THE SAME QUESTION.
 *
 *   PRINTED COLLECTION MEMBERSHIP — this species is a card in a physical curated
 *   collection, today Collection 01: Backyard Herbalism. `deck.ts` owns that set, it
 *   comes from `herbs.json`, and `herbs.json` is generated from the actual print PDFs.
 *   So the printed set cannot drift by accident: a card is in it because it was printed.
 *
 *   DIGITAL CATALOGUE MEMBERSHIP — Plantdex knows this species exists and can show a page
 *   for it. Every printed card is also in the catalogue. The reverse is not true, and that
 *   asymmetry is the entire point of this file.
 *
 * WHY THIS EXISTS BEFORE ANY DIGITAL CARD DOES. Until now the two sets were the same list,
 * and a dozen call sites relied on that without saying so — Field Research sized its tasks
 * against it, the knowledge check drew distractors from it, the Seed Shelf decided a
 * species "has no card" from it, and every "of 45" count read its length. Each of those
 * would have absorbed the first digital-only entry in silence, and one of them would have
 * quietly emptied players' Seed Shelves. Introducing the seam while `DIGITAL_ONLY_ENTRIES`
 * is still empty means the whole change is provably a no-op today: every existing test
 * passes unmodified, and there is no data to migrate.
 *
 * THE SAFE DEFAULT IS "PRINTED". A feature that forgets this distinction exists keeps
 * operating on the 45, which is the correct direction to be wrong in. Reaching the wider
 * set requires importing `CATALOGUE` from here and therefore deciding to.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Species that exist digitally and were never printed on a card.
 *
 * NOW THE FIELD CARDS, and this seam is why that was a four-line change. It was built and
 * tested while this array was empty, precisely so the first digital entry could not slip
 * into the deck's counts, Field Research's supply, the knowledge check's distractors or Seed
 * Shelf eligibility — every one of which read "the deck" from a single list before. Adding
 * nine cards moved none of those numbers, and `catalogue.test.ts` proves it against the real
 * entries rather than against the fixture it used to need.
 *
 * PREVIOUSLY EMPTY, AND THE REASONING IS KEPT: The cards that will fill it are being designed elsewhere;
 * inventing placeholder species here to prove the plumbing works would put fabricated
 * botany into the app, which is the one thing this codebase never does. The seam is proven
 * by `catalogue.test.ts` instead, which builds a hypothetical entry as a fixture and checks
 * it stays out of everything it should.
 *
 * A future entry MUST carry an explicit `collectionId` naming a digital collection.
 * `collectionOf()` falls back to Collection 01 for cards that declare nothing — which is
 * right for the printed 45, and would silently make a digital card a member of the physical
 * deck. `catalogue.test.ts` fails on any entry here that omits it.
 */
export const DIGITAL_ONLY_ENTRIES: readonly Herb[] = FIELD_CARDS;

/**
 * Every species Plantdex knows: the printed deck plus digital-only entries.
 *
 * Ask for this only when you genuinely mean "anything Plantdex has a page for". If you mean
 * the deck someone bought, use `PRINTED_CARDS`.
 */
export const CATALOGUE: readonly Herb[] = [...PRINTED_CARDS, ...DIGITAL_ONLY_ENTRIES];

/** How many species Plantdex knows in total. Not the same number as the printed deck. */
export const CATALOGUE_SIZE = CATALOGUE.length;

/** How many species Plantdex knows that were never printed. */
export const DIGITAL_ONLY_SIZE = DIGITAL_ONLY_ENTRIES.length;

const PRINTED_IDS = new Set(PRINTED_CARDS.map((herb) => herb.id));
const BY_ID = new Map(CATALOGUE.map((herb) => [herb.id, herb]));

/** Any species Plantdex knows, printed or digital. Prefer `getPrintedCard` when you mean the deck. */
export function getCatalogueEntry(id: string): Herb | undefined {
  return BY_ID.get(id);
}

/** True when this species is a card in a physical collection. */
export function isPrintedCard(herb: Herb): boolean {
  return PRINTED_IDS.has(herb.id);
}

/** True when Plantdex knows this species but it was never printed on a card. */
export function isDigitalOnly(herb: Herb): boolean {
  return !PRINTED_IDS.has(herb.id) && BY_ID.has(herb.id);
}

/**
 * The printed-deck size, re-exported so a caller comparing the two sets reads both from
 * one place and cannot mistake one for the other.
 */
export { PRINTED_DECK_SIZE };
