import { describe, expect, it } from 'vitest';
import {
  cardLabel,
  cardNumberInCollection,
  collectionOf,
  PRINTED_COLLECTIONS,
  CURRENT_COLLECTION,
  getCollection,
} from './collection';
import { PRINTED_DECK_SIZE, PRINTED_CARDS } from './deck';
import type { Herb } from './types';

describe('collections', () => {
  it('describes the printed deck as one complete collection', () => {
    expect(CURRENT_COLLECTION.size).toBe(PRINTED_DECK_SIZE);
    expect(CURRENT_COLLECTION.current).toBe(true);
    expect(getCollection(CURRENT_COLLECTION.id)).toBe(CURRENT_COLLECTION);
  });

  /**
   * The whole point of this module. Copy elsewhere may say more collections are *planned*;
   * claiming one EXISTS — with a name, a size, a date or a price — would be advertising a
   * product that has not been made. Nothing may be added here until it is real.
   */
  it('claims no collection that does not exist', () => {
    /*
     * THE RULE IS ABOUT PRINTED DECKS, and that is now stated as what it always meant.
     * This asserted `COLLECTIONS` had exactly one entry, which was the same thing while the
     * only collection was a printed one. Field Cards are digital, were never pressed, and
     * imply no physical object — so the set that must stay at one is the PRINTED set.
     * `catalogue.test.ts` separately proves a digital entry changes no deck count.
     */
    expect(PRINTED_COLLECTIONS).toHaveLength(1);
    expect(PRINTED_COLLECTIONS[0]).toBe(CURRENT_COLLECTION);
    expect(CURRENT_COLLECTION.medium).toBe('printed');
  });

  it('places every card in the deck in the current collection', () => {
    for (const herb of PRINTED_CARDS) {
      expect(collectionOf(herb)).toBe(CURRENT_COLLECTION);
    }
  });

  it('falls back to the current collection for a card that names none', () => {
    const herb = PRINTED_CARDS[0]!;
    expect(herb.collectionId).toBeUndefined();
    expect(collectionOf(herb).id).toBe(CURRENT_COLLECTION.id);
  });

  it('falls back rather than breaking on a collection id it does not know', () => {
    const stranger = { ...PRINTED_CARDS[0]!, collectionId: 'collection-99' } as Herb;
    expect(collectionOf(stranger)).toBe(CURRENT_COLLECTION);
  });

  it('numbers cards within their own collection, defaulting to the printed number', () => {
    for (const herb of PRINTED_CARDS) {
      expect(cardNumberInCollection(herb)).toBe(herb.cardNumber);
    }
    const future = { ...PRINTED_CARDS[0]!, cardNumberInCollection: 7 } as Herb;
    expect(cardNumberInCollection(future)).toBe(7);
  });

  it('labels a card with its collection and zero-padded number', () => {
    const first = PRINTED_CARDS.find((herb) => herb.cardNumber === 1)!;
    expect(cardLabel(first)).toBe('Collection 01 · Card #01');
  });
});
