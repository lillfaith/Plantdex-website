import { describe, expect, it } from 'vitest';

import {
  CATALOGUE,
  CATALOGUE_SIZE,
  DIGITAL_ONLY_ENTRIES,
  DIGITAL_ONLY_SIZE,
  getCatalogueEntry,
  isDigitalOnly,
  isPrintedCard,
} from './catalogue';
import { COLLECTION_01, collectionOf, getCollection, isInPrintedCollection } from './collection';
import { getPrintedCard, PRINTED_CARDS, PRINTED_DECK_SIZE } from './deck';
import { buildKnowledgeCheck, KNOWLEDGE_CHECK_POOL } from './knowledge-check';
import { matchScientificName } from './plant-match';
import { emptyState } from './herbdex-state';
import { xpForState } from './progression';
import { deckSupply, RESEARCH_POOL } from './research';
import { isShelfEligible } from './seed-shelf';
import type { Herb, HerbdexState } from './types';

/**
 * THE SEAM BETWEEN THE PRINTED DECK AND THE DIGITAL CATALOGUE.
 *
 * Every test here is about one question: if Plantdex learns about a species that was never
 * printed, what quietly changes? Before this seam existed the answer was "Field Research
 * supply, the knowledge-check distractor pool, every card count, and — worst — Seed Shelf
 * eligibility, which would have removed species from shelves players had already filled".
 *
 * The hypothetical entry below is a FIXTURE and never leaves this file. There is no
 * placeholder card in production data: inventing a species to prove the plumbing works
 * would put fabricated botany in the app, and the nine real digital cards are being
 * designed elsewhere. A fixture proves the same property and claims nothing.
 */

/** A species Plantdex might one day know digitally. Deliberately not a real plant. */
const HYPOTHETICAL: Herb = {
  ...(PRINTED_CARDS[0] as Herb),
  id: 'test-digital-only-species',
  cardNumber: 9001,
  commonName: 'Test Digital Species',
  scientificName: 'Testus digitalis',
  collectionId: 'test-digital-collection',
};

describe('the catalogue is a superset of the printed deck', () => {
  it('contains every printed card', () => {
    for (const card of PRINTED_CARDS) {
      expect(getCatalogueEntry(card.id), card.id).toBeDefined();
      expect(isPrintedCard(card), card.id).toBe(true);
      expect(isDigitalOnly(card), card.id).toBe(false);
    }
  });

  it('holds no digital-only entries yet, and says so rather than pretending', () => {
    // The nine hidden cards are designed elsewhere. This staying empty is the correct
    // state, not an unfinished one — and it is what makes this whole change a no-op today.
    expect(DIGITAL_ONLY_ENTRIES).toEqual([]);
    expect(DIGITAL_ONLY_SIZE).toBe(0);
    expect(CATALOGUE_SIZE).toBe(PRINTED_DECK_SIZE);
  });

  it('requires any future digital entry to name its collection', () => {
    // `collectionOf` falls back to Collection 01 for a card that declares nothing, which is
    // right for the printed 45 and would silently enrol a digital card in the physical deck.
    for (const entry of DIGITAL_ONLY_ENTRIES) {
      expect(entry.collectionId, entry.id).toBeTruthy();
      expect(getCollection(entry.collectionId as string), entry.id).toBeDefined();
      expect(isInPrintedCollection(entry), entry.id).toBe(false);
    }
  });
});

describe('a hypothetical digital-only species stays out of the printed deck', () => {
  it('does not increase Collection 01 card count', () => {
    expect(PRINTED_DECK_SIZE).toBe(45);
    expect(COLLECTION_01.size).toBe(45);
    expect(PRINTED_CARDS).not.toContainEqual(HYPOTHETICAL);
    // Even handed the entry directly, the printed lookup refuses it.
    expect(getPrintedCard(HYPOTHETICAL.id)).toBeUndefined();
  });

  it('is not a member of Collection 01 just by existing', () => {
    // It names a collection that does not exist, so `collectionOf` falls back — and the
    // fallback is exactly the trap. The guard is that a real digital entry must name a
    // registered digital collection, which the previous block enforces.
    expect(HYPOTHETICAL.collectionId).not.toBe(COLLECTION_01.id);
    expect(isPrintedCard(HYPOTHETICAL)).toBe(false);
  });

  it('changes no XP, because XP resolves ids through the printed deck only', () => {
    const before = xpForState(emptyState());
    const withDigital: HerbdexState = {
      ...emptyState(),
      discoveries: { [HYPOTHETICAL.id]: '2026-01-01T00:00:00.000Z' },
      learned: { [HYPOTHETICAL.id]: '2026-01-02T00:00:00.000Z' },
      mastered: { [HYPOTHETICAL.id]: '2026-01-03T00:00:00.000Z' },
    };
    // Discovered, learned AND mastered, and still worth nothing. This is what makes
    // "collecting a digital card awards zero XP" structural rather than a promise.
    expect(xpForState(withDigital)).toBe(before);
  });

  it('does not enter Collection 01 Field Research merely by existing', () => {
    expect(RESEARCH_POOL).toBe(PRINTED_CARDS);
    expect(RESEARCH_POOL).not.toContainEqual(HYPOTHETICAL);
    // Supply is counted over the research pool, so a catalogue entry cannot inflate it.
    const everything = deckSupply(() => true);
    expect(everything).toBe(PRINTED_DECK_SIZE);
  });

  it('does not enter a printed-deck knowledge pool unless passed explicitly', () => {
    expect(KNOWLEDGE_CHECK_POOL).toBe(PRINTED_CARDS);
    const card = PRINTED_CARDS[0] as Herb;
    const questions = buildKnowledgeCheck(card);
    const printedNames = new Set(PRINTED_CARDS.map((entry) => entry.commonName));
    for (const question of questions) {
      for (const option of question.options) {
        expect(option.includes(HYPOTHETICAL.commonName)).toBe(false);
      }
    }
    expect(printedNames.has(HYPOTHETICAL.commonName)).toBe(false);
  });

  it('does not become Seed Shelf-ineligible merely because Plantdex recognises it', () => {
    // THE ONE THAT WOULD HAVE HURT PLAYERS. Shelf eligibility is "the printed deck has no
    // card for this". A species gaining a digital entry must not quietly leave a shelf
    // somebody has already collected it onto.
    expect(isShelfEligible(HYPOTHETICAL.scientificName)).toBe(true);
    expect(matchScientificName(HYPOTHETICAL.scientificName).confirmable).toBe(false);
  });

  it('cannot create a sighting or mastery from catalogue or collection status', () => {
    // There is no path from "is in the catalogue" to either record: both are plain
    // timestamp maps written by explicit actions, and nothing here writes them.
    const state = emptyState();
    expect(state.discoveries[HYPOTHETICAL.id]).toBeUndefined();
    expect(state.mastered[HYPOTHETICAL.id]).toBeUndefined();
    expect(isPrintedCard(HYPOTHETICAL)).toBe(false);
    // And the reverse direction: membership functions are pure predicates over identity,
    // with no access to player state at all.
    expect(isPrintedCard.length).toBe(1);
    expect(isDigitalOnly.length).toBe(1);
  });
});

describe('printed-deck counts stay printed-deck counts', () => {
  it('keeps Collection 01 at exactly 45 printed cards', () => {
    expect(COLLECTION_01.medium).toBe('printed');
    expect(PRINTED_CARDS.every((herb) => isInPrintedCollection(herb))).toBe(true);
    expect(PRINTED_CARDS.every((herb) => collectionOf(herb).id === COLLECTION_01.id)).toBe(true);
  });

  it('derives the catalogue count separately from the deck count', () => {
    // Today they are equal. The point is that they are two expressions, so the day they
    // diverge nothing has to be found and changed.
    expect(CATALOGUE.length).toBe(PRINTED_DECK_SIZE + DIGITAL_ONLY_SIZE);
  });
});
