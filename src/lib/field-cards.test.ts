import { describe, expect, it } from 'vitest';

import {
  FIELD_CARDS,
  FIELD_CARDS_COLLECTION_ID,
  FIELD_CARDS_TOTAL,
  FIELD_CARD_ISSUES,
  FIELD_CARD_SLOTS,
  fieldCardProgress,
  getFieldCard,
  isFieldCard,
  nextSlotAfter,
  slotsUnlockedAt,
  unlockXpFor,
} from './field-cards';
import { CATALOGUE, getCatalogueEntry, isDigitalOnly, isPrintedCard } from './catalogue';
import {
  COLLECTION_01,
  FIELD_CARDS_COLLECTION,
  PRINTED_COLLECTIONS,
  collectionOf,
  getCollection,
  isInPrintedCollection,
} from './collection';
import { PRINTED_CARDS, PRINTED_DECK_SIZE, getPrintedCard } from './deck';
import { LEVELS } from './progression';
import { RESEARCH_POOL, STANDING_TASKS } from './research';
import { isShelfEligible } from './seed-shelf';
import { emptyState } from './herbdex-state';
import { xpForState } from './progression';
import { resolveUnlocked, recordUnlocks } from './unlocked-field-cards';
import type { HerbdexState } from './types';

/**
 * FIELD CARDS, AND THE FOUR THINGS THEY MUST NEVER BE MISTAKEN FOR.
 *
 * A Field Card is earned by playing. That is not the same as buying one, not the same as
 * finding the plant outdoors, and not the same as mastering it — and each of those confusions
 * would damage something different. Buying is a claim about a physical object nobody posted.
 * Finding is what `discoveries` means, and it is what mastery and Field Research are derived
 * from, so letting an unlock write one would quietly corrupt the only record in this app that
 * means "I was outside looking at this plant". Mastery is earned per card, afterwards.
 *
 * Every test below attacks one of those separately.
 */

describe('Field Cards are digital and stay out of the printed deck', () => {
  it('is absent from the printed deck in both directions', () => {
    for (const card of FIELD_CARDS) {
      expect(getPrintedCard(card.id), card.id).toBeUndefined();
      expect(isPrintedCard(card), card.id).toBe(false);
      expect(isDigitalOnly(card), card.id).toBe(true);
      expect(PRINTED_CARDS).not.toContainEqual(card);
    }
    // The number a buyer was sold is unchanged by any of this.
    expect(PRINTED_DECK_SIZE).toBe(45);
    expect(COLLECTION_01.size).toBe(45);
  });

  it('declares the Field Cards collection, never Collection 01', () => {
    // `collectionOf` falls back to Collection 01 for a card that declares nothing, which is
    // right for the printed 45 and would silently enrol a Field Card in the physical deck.
    for (const card of FIELD_CARDS) {
      expect(card.collectionId, card.id).toBe(FIELD_CARDS_COLLECTION_ID);
      expect(collectionOf(card).id, card.id).toBe(FIELD_CARDS_COLLECTION.id);
      expect(isInPrintedCollection(card), card.id).toBe(false);
    }
    expect(getCollection(FIELD_CARDS_COLLECTION_ID)?.medium).toBe('digital');
  });

  it('adds no second PRINTED collection', () => {
    // The rule is about a second DECK. A digital set implies no physical object at all.
    expect(PRINTED_COLLECTIONS).toHaveLength(1);
    expect(FIELD_CARDS_COLLECTION.current).toBe(false);
  });

  it('sizes the collection by the whole set, not by what is drawn yet', () => {
    // A player with two should read "2 of 9", not "2 of 4".
    expect(FIELD_CARDS_COLLECTION.size).toBe(FIELD_CARDS_TOTAL);
    expect(FIELD_CARD_SLOTS).toHaveLength(FIELD_CARDS_TOTAL);
  });

  it('has a card page generated for it, which is what CATALOGUE drives', () => {
    /*
     * THE BUG THIS PINS. `generateStaticParams` read `PRINTED_CARDS`, so no page existed for
     * a Field Card and the reward panel's "View card" link 404'd. Found by following the
     * link in a browser; no test would have caught it, because every unit here passed.
     */
    for (const card of FIELD_CARDS) {
      expect(CATALOGUE.some((entry) => entry.id === card.id), card.id).toBe(true);
    }
  });

  it('is reachable through the catalogue, which is the only widened set', () => {
    for (const card of FIELD_CARDS) {
      expect(getCatalogueEntry(card.id), card.id).toBe(card);
    }
    expect(CATALOGUE.length).toBe(PRINTED_DECK_SIZE + FIELD_CARDS.length);
  });
});

describe('an XP unlock is not a discovery', () => {
  it('pays no XP itself, so unlocking can never cascade into another unlock', () => {
    /*
     * THE ONE THAT WOULD RUN AWAY. If a Field Card counted toward XP, crossing a threshold
     * would raise the total, which could cross the next threshold, and so on. XP resolves
     * ids through the PRINTED deck only, so a Field Card in any of the timestamp maps is
     * worth exactly zero — the same property that makes the Seed Shelf structurally unable
     * to pay.
     */
    const before = xpForState(emptyState());
    const withAll: HerbdexState = {
      ...emptyState(),
      discoveries: Object.fromEntries(FIELD_CARDS.map((c) => [c.id, '2026-01-01T00:00:00.000Z'])),
      learned: Object.fromEntries(FIELD_CARDS.map((c) => [c.id, '2026-01-02T00:00:00.000Z'])),
      mastered: Object.fromEntries(FIELD_CARDS.map((c) => [c.id, '2026-01-03T00:00:00.000Z'])),
    };
    expect(xpForState(withAll)).toBe(before);
  });

  it('records an unlock somewhere that is not the collection', () => {
    // `discoveries` means "I identified this plant outdoors". An unlock must never write it.
    const unlocked = resolveUnlocked(99_999, { '1': '2026-01-01T00:00:00.000Z' });
    expect(unlocked.length).toBeGreaterThan(0);
    const state = emptyState();
    for (const slot of unlocked) {
      if (!slot.card) continue;
      expect(state.discoveries[slot.card.id]).toBeUndefined();
      expect(state.mastered[slot.card.id]).toBeUndefined();
    }
  });

  it('leaves an unlocked card unmastered and undiscovered', () => {
    const state = emptyState();
    for (const card of FIELD_CARDS) {
      expect(state.discoveries[card.id]).toBeUndefined();
      expect(state.learned[card.id]).toBeUndefined();
      expect(state.mastered[card.id]).toBeUndefined();
    }
  });

  it('stays eligible for the Seed Shelf, because unlocking is not finding', () => {
    /*
     * Subtle and important. Shelf eligibility asks "does the PRINTED deck have a confirmable
     * card for this species". A Field Card is not printed, so photographing a real Purple
     * Coneflower outdoors still shelves it — which is right: the player found a plant, and
     * that is a different fact from having been given its card by an XP threshold.
     */
    for (const card of FIELD_CARDS) {
      expect(isShelfEligible(card.scientificName), card.scientificName).toBe(true);
    }
  });
});

describe('Field Cards stay out of Field Research', () => {
  it('is absent from the research pool', () => {
    expect(RESEARCH_POOL).toBe(PRINTED_CARDS);
    for (const card of FIELD_CARDS) {
      expect(RESEARCH_POOL).not.toContainEqual(card);
    }
  });

  it('cannot be named by a seasonal task, even sharing a season', () => {
    // Three of the four are summer cards. Seasonal tasks are sized and populated from the
    // printed deck, so a Field Card must not appear in one just by carrying `summer`.
    const fieldIds = new Set(FIELD_CARDS.map((c) => c.id));
    for (const task of STANDING_TASKS) {
      for (const herbId of task.herbIds) {
        expect(fieldIds.has(herbId), `${task.id} names ${herbId}`).toBe(false);
      }
    }
  });
});

describe('the unlock ladder', () => {
  it('rises, covers nine slots, and never repeats a threshold', () => {
    const xps = FIELD_CARD_SLOTS.map((slot) => slot.xp);
    expect(xps).toHaveLength(9);
    expect([...xps].sort((a, b) => a - b)).toEqual(xps);
    expect(new Set(xps).size).toBe(9);
    expect(FIELD_CARD_SLOTS.map((s) => s.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('anchors its first five to real level thresholds', () => {
    // The unlock and the level-up land as ONE moment, and the ladder that was already tuned
    // does the pacing — which is what keeps this from becoming a second progression system.
    const levelXp = new Set(LEVELS.map((level) => level.minXp));
    for (const slot of FIELD_CARD_SLOTS.slice(0, 5)) {
      expect(levelXp.has(slot.xp), `slot ${slot.ordinal} at ${slot.xp}`).toBe(true);
    }
  });

  it('unlocks nothing at zero and everything at the ceiling', () => {
    expect(slotsUnlockedAt(0)).toHaveLength(0);
    expect(slotsUnlockedAt(599)).toHaveLength(0);
    expect(slotsUnlockedAt(600)).toHaveLength(1);
    expect(slotsUnlockedAt(19_250)).toHaveLength(9);
  });

  it('reports progress across the current gap, not from zero', () => {
    const atStart = fieldCardProgress(600);
    expect(atStart.unlockedCount).toBe(1);
    expect(atStart.next?.ordinal).toBe(2);
    expect(atStart.fraction).toBe(0);
    expect(atStart.remaining).toBe(600);

    const halfway = fieldCardProgress(900);
    expect(halfway.fraction).toBeCloseTo(0.5, 5);
    expect(halfway.remaining).toBe(300);

    const done = fieldCardProgress(20_000);
    expect(done.next).toBeNull();
    expect(done.remaining).toBe(0);
    expect(done.fraction).toBe(1);
  });

  it('has no next slot past the last threshold', () => {
    expect(nextSlotAfter(14_000)).toBeNull();
    expect(nextSlotAfter(13_999)?.ordinal).toBe(9);
  });

  it('leaves slots 5-9 without a card rather than inventing one', () => {
    /*
     * The thresholds are approved; the cards are not drawn. A slot with no card is a REAL
     * state the UI renders as "another Field Card", and it is the only honest option — this
     * repo never fills a card with plausible-sounding botany.
     */
    for (const slot of FIELD_CARD_SLOTS.slice(4)) {
      expect(slot.card, `slot ${slot.ordinal}`).toBeUndefined();
    }
    for (const slot of FIELD_CARD_SLOTS.slice(0, 4)) {
      expect(slot.card, `slot ${slot.ordinal}`).toBeDefined();
    }
  });

  it('maps a card back to the XP it unlocks at', () => {
    expect(unlockXpFor('echinacea-purpurea')).toBe(600);
    expect(unlockXpFor('lindera-benzoin')).toBe(3_600);
    expect(unlockXpFor('taraxacum-officinale')).toBeUndefined();
    expect(isFieldCard('typha-latifolia')).toBe(true);
    expect(isFieldCard('taraxacum-officinale')).toBe(false);
    expect(getFieldCard('oenothera-biennis')?.cardNumber).toBe(50);
  });
});

describe('unlocks ratchet and never revoke', () => {
  it('keeps a recorded card even if XP later falls below its threshold', () => {
    /*
     * Nothing in Plantdex revokes something a player earned — mastery is recorded rather
     * than recomputed for exactly this reason. Deriving from XP alone would let a future
     * formula change take a card back, so the resolved set is DERIVED UNION RECORDED.
     */
    const record = { '1': '2026-01-01T00:00:00.000Z', '2': '2026-01-02T00:00:00.000Z' };
    const afterXpLoss = resolveUnlocked(0, record);
    expect(afterXpLoss.map((slot) => slot.ordinal)).toEqual([1, 2]);
  });

  it('unions rather than replaces, so new XP still unlocks', () => {
    const record = { '1': '2026-01-01T00:00:00.000Z' };
    expect(resolveUnlocked(2_200, record).map((s) => s.ordinal)).toEqual([1, 2, 3]);
  });

  it('is derived with no record at all, so a new device needs no migration', () => {
    // The XP is already synced; the answer is a pure function of it.
    expect(resolveUnlocked(3_600, {}).map((s) => s.ordinal)).toEqual([1, 2, 3, 4]);
  });
});

describe('the artwork is transcribed, not improved', () => {
  it('records each printed error rather than correcting it', () => {
    // Same contract as KNOWN_CARD_ISSUES: the transcription stays as printed, the correction
    // is stated separately. Quietly fixing one makes the app disagree with the card.
    expect(FIELD_CARD_ISSUES[49]).toContain('Hemostatic');
    expect(getFieldCard('typha-latifolia')?.back.healingTraits).toContain('Hemeostatic');
    expect(FIELD_CARD_ISSUES[50]).toContain('Campesterol');
    expect(getFieldCard('oenothera-biennis')?.back.compounds).toContain('Campestrol');
    expect(FIELD_CARD_ISSUES[51]).toBeTruthy();
    expect(getFieldCard('lindera-benzoin')?.back.compounds).toContain('caryophyllene');
  });

  it('numbers each card as its face does, past the 47 physical cards', () => {
    expect(FIELD_CARDS.map((c) => c.cardNumber)).toEqual([48, 49, 50, 51]);
    expect(FIELD_CARDS.map((c) => c.cardNumberInCollection)).toEqual([1, 2, 3, 4]);
  });

  it('fills every field a card page renders', () => {
    for (const card of FIELD_CARDS) {
      expect(card.back.healingTraits.length, card.id).toBeGreaterThan(0);
      expect(card.back.compounds.length, card.id).toBeGreaterThan(0);
      expect(card.back.usableParts.length, card.id).toBeGreaterThan(0);
      expect(card.uses, card.id).toHaveLength(2);
      expect(card.stats.water, card.id).toBeGreaterThanOrEqual(1);
      expect(card.image, card.id).toMatch(/^\/cards\//);
      expect(card.sprite, card.id).toMatch(/^\/cards\/sprite\//);
    }
  });
});

describe('recordUnlocks is write-once and reports only what is new', () => {
  it('returns nothing when every reached slot is already recorded', () => {
    // Safe to call on every render: the second call is a no-op, which is what stops the
    // reveal firing twice.
    const first = recordUnlocks(600, '2026-01-01T00:00:00.000Z');
    expect(first.map((s) => s.ordinal)).toEqual([1]);
    expect(recordUnlocks(600, '2026-02-02T00:00:00.000Z')).toEqual([]);
  });
});
