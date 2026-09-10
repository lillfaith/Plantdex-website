import type { Herb } from './types';
import { PRINTED_DECK_SIZE } from './deck';

/**
 * COLLECTIONS.
 *
 * The 45-card deck is Plantdex **Collection 01** — a complete product in its own right,
 * not a partial one. This module exists so that stays true if a second collection is ever
 * printed: nothing else in the codebase should assume Plantdex is forever exactly one deck
 * of exactly 45 cards.
 *
 * Two things it is careful NOT to do:
 *
 *  • It does not claim a second collection exists. There is no future collection here with
 *    a name, a size, a date or a price, because none of those things are real yet, and
 *    inventing them would be selling something that does not exist.
 *
 *  • It does not hand-edit generated data. `src/data/herbs.json` comes from
 *    scripts/build_deck.py; every card in the printed deck belongs to Collection 01 by
 *    definition, so membership is resolved here rather than stamped 45 times. A future
 *    deck can carry an explicit `collectionId` per card and `collectionOf()` will prefer
 *    it — which is the whole point of the fallback.
 */

/**
 * Whether a collection was physically printed or exists only in the app.
 *
 * This is what lets a future digital collection declare itself rather than being inferred.
 * `collectionOf()` falls back to Collection 01 for a card that names no collection, which
 * is correct for the printed 45 — they predate collections existing — and would silently
 * make a digital card a member of the physical deck. So a digital entry must name its
 * collection, and `catalogue.test.ts` fails if one does not.
 */
export type CollectionMedium = 'printed' | 'digital';

export interface Collection {
  id: string;
  /** Full name, e.g. "Plantdex Collection 01". */
  name: string;
  /** Short form for inline use, e.g. "Collection 01". */
  shortName: string;
  /** Number of plant cards. */
  size: number;
  /** True for the collection currently in print and tracked by this Herbdex. */
  current: boolean;
  /**
   * Printed collections are physical products someone bought; digital ones never went to
   * press. Card counts, Field Research supply and Seed Shelf eligibility are all about the
   * printed sets, and this is how they say so.
   */
  medium: CollectionMedium;
}

export const COLLECTION_01: Collection = {
  id: 'collection-01',
  name: 'Plantdex Collection 01',
  shortName: 'Collection 01',
  size: PRINTED_DECK_SIZE,
  current: true,
  medium: 'printed',
};

/**
 * Every collection this app knows about.
 *
 * One entry today. A second gets added here when a second deck actually exists — with real
 * values, after it is printed, not before.
 */
export const COLLECTIONS: readonly Collection[] = [COLLECTION_01];

const BY_ID = new Map(COLLECTIONS.map((collection) => [collection.id, collection]));

export function getCollection(id: string): Collection | undefined {
  return BY_ID.get(id);
}

/** The collection currently in print. */
export const CURRENT_COLLECTION = COLLECTION_01;

/** True when this card belongs to a collection that was physically printed. */
export function isInPrintedCollection(herb: Herb): boolean {
  return collectionOf(herb).medium === 'printed';
}

/**
 * Which collection a card belongs to.
 *
 * Prefers an explicit `collectionId` on the card and falls back to the current collection,
 * so cards generated before collections existed keep working and cards from a future deck
 * can simply declare themselves.
 */
export function collectionOf(herb: Herb): Collection {
  return (herb.collectionId ? getCollection(herb.collectionId) : undefined) ?? CURRENT_COLLECTION;
}

/**
 * A card's number within its own collection.
 *
 * Identical to `cardNumber` today. It exists as its own function because a second
 * collection would number its cards from #01 again, and every "Card #12" in the UI should
 * be reading a within-collection number even while the two happen to be the same.
 */
export function cardNumberInCollection(herb: Herb): number {
  return herb.cardNumberInCollection ?? herb.cardNumber;
}

/** "Collection 01 · Card #12" — the standard way to identify a physical card. */
export function cardLabel(herb: Herb): string {
  return `${collectionOf(herb).shortName} · Card #${String(cardNumberInCollection(herb)).padStart(2, '0')}`;
}
