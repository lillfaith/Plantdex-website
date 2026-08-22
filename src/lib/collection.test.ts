import { describe, expect, it } from 'vitest';
import {
  cardLabel,
  cardNumberInCollection,
  collectionOf,
  COLLECTIONS,
  CURRENT_COLLECTION,
  getCollection,
} from './collection';
import { DECK_SIZE, HERBS } from './deck';
import type { Herb } from './types';

describe('collections', () => {
  it('describes the printed deck as one complete collection', () => {
    expect(CURRENT_COLLECTION.size).toBe(DECK_SIZE);
    expect(CURRENT_COLLECTION.current).toBe(true);
    expect(getCollection(CURRENT_COLLECTION.id)).toBe(CURRENT_COLLECTION);
  });

  /**
   * The whole point of this module. Copy elsewhere may say more collections are *planned*;
   * claiming one EXISTS — with a name, a size, a date or a price — would be advertising a
   * product that has not been made. Nothing may be added here until it is real.
   */
  it('claims no collection that does not exist', () => {
    expect(COLLECTIONS).toHaveLength(1);
    expect(COLLECTIONS[0]).toBe(CURRENT_COLLECTION);
  });

  it('places every card in the deck in the current collection', () => {
    for (const herb of HERBS) {
      expect(collectionOf(herb)).toBe(CURRENT_COLLECTION);
    }
  });

  it('falls back to the current collection for a card that names none', () => {
    const herb = HERBS[0]!;
    expect(herb.collectionId).toBeUndefined();
    expect(collectionOf(herb).id).toBe(CURRENT_COLLECTION.id);
  });

  it('falls back rather than breaking on a collection id it does not know', () => {
    const stranger = { ...HERBS[0]!, collectionId: 'collection-99' } as Herb;
    expect(collectionOf(stranger)).toBe(CURRENT_COLLECTION);
  });

  it('numbers cards within their own collection, defaulting to the printed number', () => {
    for (const herb of HERBS) {
      expect(cardNumberInCollection(herb)).toBe(herb.cardNumber);
    }
    const future = { ...HERBS[0]!, cardNumberInCollection: 7 } as Herb;
    expect(cardNumberInCollection(future)).toBe(7);
  });

  it('labels a card with its collection and zero-padded number', () => {
    const first = HERBS.find((herb) => herb.cardNumber === 1)!;
    expect(cardLabel(first)).toBe('Collection 01 · Card #01');
  });
});
