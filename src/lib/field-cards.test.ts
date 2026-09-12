import { xpForDiscoveries } from './progression';
import { applyDiscovery, applyLearned } from './herbdex-reducer';
import { readFileSync, readdirSync } from 'node:fs';
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
import { HABITATS, matchesHabitatFilter } from './habitat';
import { hasSprite, hasStageArt } from './plant-sprites';
import { GROWTH_STAGES } from './garden';
import { emptyState } from './herbdex-state';
import { qualifiesForMastery, tracksMastery } from './mastery';
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
    const first = recordUnlocks(600, 'scope-a', '2026-01-01T00:00:00.000Z');
    expect(first.map((s) => s.ordinal)).toEqual([1]);
    expect(recordUnlocks(600, 'scope-a', '2026-02-02T00:00:00.000Z')).toEqual([]);
  });
});

/**
 * THE THREE FACTS A FIELD CARD PAGE MUST KEEP APART.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * XP UNLOCK grants READING. DISCOVERY means the species was found outdoors. MASTERY is a
 * later state still. The card page had been collapsing the first into the second: a Field
 * Card fell into the printed deck's undiscovered branch, so a player who had EARNED the card
 * was told they had not discovered the plant and should go and find it — the collection's
 * promise inverted, with the reward they worked for hidden behind a card back.
 *
 * These read the component source rather than rendering it: there is no DOM harness in this
 * suite, and the failure was never subtle enough to need one — it was a missing branch. What
 * is asserted is the SHAPE of the gate, which is what was wrong.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe('XP unlock, discovery and mastery stay three separate facts', () => {
  const detail = readFileSync('src/components/herbdex/HerbDetail.tsx', 'utf8');

  it('lets an XP unlock open the card without a discovery or a reveal', () => {
    // The locked branch must not fire when the card is XP-unlocked.
    expect(detail).toMatch(/!discovered && !revealed && !xpUnlocked/);
    // And `xpUnlocked` must be derived from the unlock set, not from the collection.
    expect(detail).toMatch(/resolveUnlocked\(progress\.xp, record\)/);
  });

  it('keeps a Field Card below its threshold locked, and reveal cannot open it', () => {
    const lockedAt = detail.indexOf('fieldCardOrdinal !== undefined && !xpUnlocked');
    const revealedAt = detail.indexOf('!discovered && !revealed && !xpUnlocked');
    expect(lockedAt, 'the Field Card lock branch is missing').toBeGreaterThan(-1);
    // Ordering is the assertion: the threshold is checked BEFORE the reading escape hatch,
    // so `revealHerb` cannot hand over a card the player has not earned.
    expect(lockedAt).toBeLessThan(revealedAt);
  });

  it('writes no discovery and no mastery from an unlock', () => {
    /*
     * `recordUnlocks` is the only thing an unlock writes. It must never touch the stores
     * discovery and mastery live in — checked against the real module rather than the page,
     * because this is the invariant that makes the collection worth anything.
     */
    const store = readFileSync('src/lib/unlocked-field-cards.ts', 'utf8');
    for (const forbidden of ['applyDiscovery', 'reconcileMastery', 'discover(']) {
      expect(store, `the unlock store reaches for ${forbidden}`).not.toContain(forbidden);
    }
    // And it imports neither the reducer nor the collection's own storage module, so it
    // could not write a discovery even by accident. (Its own key legitimately ends in
    // STORAGE_KEY, so the check is on the imports rather than on the substring.)
    for (const mod of ["from './herbdex-reducer'", "from './storage'", "from './mastery'"]) {
      expect(store, `the unlock store imports ${mod}`).not.toContain(mod);
    }
    const empty = emptyState();
    recordUnlocks(FIELD_CARD_SLOTS[0]!.xp, 'scope-three-facts');
    expect(empty.discoveries, 'an unlock wrote a discovery').toEqual({});
    expect(empty.mastered, 'an unlock wrote mastery').toEqual({});
  });

  it('records a later physical discovery normally, and it still pays no XP', () => {
    /*
     * Unlocking and finding are independent in BOTH directions, so a find after an unlock is
     * an ordinary discovery: the id lands in `discoveries` exactly as any other would. It
     * credits zero because XP resolves through the printed deck — which is what stops a
     * threshold crossing from funding the next one.
     */
    const card = FIELD_CARD_SLOTS[0]!.card!;
    const { state: after, result } = applyDiscovery(
      emptyState(),
      card.id,
      '2026-01-01T00:00:00.000Z',
    );
    expect(after.discoveries[card.id], 'a Field Card discovery was refused').toBeTruthy();
    expect(result.awarded, 'the find was not recorded as a real discovery').toBe(true);
    expect(after.mastered[card.id], 'discovering it also mastered it').toBeUndefined();
    expect(result.xpAwarded, 'the reducer credited XP for a Field Card').toBe(0);
    expect(xpForDiscoveries([card.id]), 'a Field Card discovery paid XP').toBe(0);
  });

  it('never prints an XP figure the ledger will not pay', () => {
    /*
     * THE BUTTON IS A PROMISE. `DiscoverPanel` read `herb.xp` — the value printed on the
     * artwork — and so offered "+250 XP" for a find that credits zero. It asks the ledger now.
     */
    const panel = readFileSync('src/components/herbdex/DiscoverPanel.tsx', 'utf8');
    expect(panel).toContain('xpForDiscoveries([herb.id])');
    expect(panel, 'the discover button is back to printing the card face value').not.toMatch(
      /\{herb\.xp\}\s*XP/,
    );
  });
});

/**
 * THE FOURTH FACT: a card can be DISCOVERED and still be outside the mastery track.
 *
 * `applyDiscovery` resolves through the CATALOGUE so a Field Card found outdoors is a real
 * find; learning and mastery resolve through the PRINTED deck, because that is what
 * `masteryTotals`, `KNOWLEDGE_CHECK_POOL`, the achievements, the garden and Field Research
 * all already count. Those two scopes are both correct and they do not meet, which leaves a
 * card parked at stage 1 of 3 forever.
 *
 * That gap shipped as a UI that offered the stage anyway. Discovering a Field Card drew the
 * full three-stage track, promised "+250 XP" from the artwork for a find that pays nothing,
 * put "Learn this card" as the loudest button on the celebration, and served a card check
 * that could be passed — after which `applyLearned` returned the SAME STATE OBJECT, the
 * dialog said "Card learned", and nothing had been recorded. The check could then be taken
 * again forever.
 *
 * Every test below fails if any one of those surfaces stops asking `tracksMastery`.
 */
describe('a discovered Field Card is never offered a stage it cannot reach', () => {
  const card = FIELD_CARD_SLOTS[0]!.card!;
  const printed = PRINTED_CARDS[0]!;

  it('states the scope once, and the reducer reads that same predicate', () => {
    expect(tracksMastery(printed.id), 'a printed card left the mastery track').toBe(true);
    expect(tracksMastery(card.id), 'a Field Card was admitted to the mastery track').toBe(false);

    // The guard exists ONCE. A second `getPrintedCard` call here is how the reducer and the
    // UI came to disagree in the first place.
    const reducer = readFileSync('src/lib/herbdex-reducer.ts', 'utf8');
    const learned = reducer.slice(reducer.indexOf('export function applyLearned'));
    expect(learned, 'applyLearned re-derives the scope instead of asking mastery.ts').toContain(
      'tracksMastery(herbId)',
    );
  });

  it('refuses the learn, and says so by returning the very same object', () => {
    const { state: discovered } = applyDiscovery(emptyState(), card.id);
    const after = applyLearned(discovered, card.id);
    expect(after.state, 'applyLearned mutated state for a card it refuses').toBe(discovered);
    expect(after.state.learned[card.id]).toBeUndefined();
    expect(after.result.awarded).toBe(false);
  });

  it('can never qualify for mastery, at any sighting count', () => {
    const { state } = applyDiscovery(emptyState(), card.id);
    expect(qualifiesForMastery(state, card.id, Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  it('draws no track for it, which is also what withholds the card check', () => {
    const track = readFileSync('src/components/herbdex/MasteryTrack.tsx', 'utf8');
    expect(track, 'the mastery track no longer checks its own scope').toContain(
      'if (!tracksMastery(herb.id)) return null;',
    );

    /*
     * AND THAT GATE IS THE WHOLE MECHANISM, so it is pinned rather than assumed: the track
     * is the ONLY thing that mounts `KnowledgeCheck`. Drawing no track is therefore what
     * makes the unpassable check unreachable — if a second caller ever appears, the check
     * comes back on a card that cannot be learned and this fails.
     */
    const mounters = readdirSync('src/components/herbdex')
      .filter((file) => file.endsWith('.tsx') && file !== 'KnowledgeCheck.tsx')
      .filter((file) =>
        readFileSync(`src/components/herbdex/${file}`, 'utf8').includes('<KnowledgeCheck'),
      );
    expect(mounters, 'KnowledgeCheck gained a second mounter').toEqual(['MasteryTrack.tsx']);
  });

  it('does not print the artwork face value on the track either', () => {
    /*
     * The same bug `DiscoverPanel` had, in a second place the first fix did not reach:
     * `XP_FOR_STAGE.discovered` read `herb.xp`. #48 prints 250 and the ledger pays 0.
     */
    const track = readFileSync('src/components/herbdex/MasteryTrack.tsx', 'utf8');
    expect(track).toContain('discovered: (herb) => xpForDiscoveries([herb.id])');
    expect(track, 'the track is back to printing the card face value').not.toContain(
      'discovered: (herb) => herb.xp',
    );
    expect(card.xp, 'the fixture stopped being able to catch this').toBeGreaterThan(0);
    expect(xpForDiscoveries([card.id])).toBe(0);
  });

  it('does not offer "Learn this card" from the discovery celebration', () => {
    const celebration = readFileSync('src/components/herbdex/DiscoveryCelebration.tsx', 'utf8');
    const cta = celebration.indexOf('Learn this card');
    expect(cta, 'the celebration lost its learn CTA entirely').toBeGreaterThan(-1);
    // The gate must sit ABOVE the button, so the scroll target cannot be promised for a
    // card whose mastery panel deliberately does not render.
    const gate = celebration.indexOf('{tracksMastery(herb.id) && (');
    expect(gate, 'the celebration offers the learn CTA unconditionally').toBeGreaterThan(-1);
    expect(gate).toBeLessThan(cta);
  });
});

/*
 * ── THE FIELD CARDS IN THE HERBDEX GRID ───────────────────────────────────────
 *
 * They were absent from /herbdex entirely: the page rendered `printedCardsInDeckOrder()`,
 * so a player's own collection page never showed the four cards they had earned. Putting
 * them in is mostly layout — except for one thing that is not layout at all.
 *
 * `HerbCard` was BINARY, and correct while the grid held only printed cards, where the one
 * question is "have you found this plant". A Field Card asks two questions with different
 * answers. Dropping them into the undiscovered branch would have reproduced, tile for tile,
 * the bug this file already guards on the card page: a player who had EARNED a card shown a
 * silhouette captioned "Not discovered".
 */
describe('the Field Card band in the Herbdex grid', () => {
  const grid = readFileSync('src/components/herbdex/HerbGrid.tsx', 'utf8');
  const tile = readFileSync('src/components/herbdex/HerbCard.tsx', 'utf8');
  const page = readFileSync('src/app/herbdex/page.tsx', 'utf8');

  it('shows the card face for an EARNED Field Card, not only a discovered one', () => {
    /*
     * The regression guard. `showFace` is what draws the artwork, the name and the card
     * number; collapsing it back to `discovered` is the exact mistake, and it would look
     * entirely reasonable in a diff.
     */
    expect(tile).toContain('const showFace = discovered || earned;');
    expect(tile, 'the artwork is gated on discovery again').not.toContain('{discovered ? (\n            <Image');
    expect(tile, 'an earned card is not told it was found').toContain('Earned &middot; not yet found');
  });

  it('keeps the stage marker and rarity badge for a FOUND card only', () => {
    // Earning grants reading. The stage marker is a record of a real find and must not
    // appear on a card nobody has been outdoors for.
    const marker = tile.indexOf('{discovered && (\n            <span\n              className={`absolute top-1.5 right-1.5');
    expect(marker, 'the mastery marker is no longer gated on discovery').toBeGreaterThan(-1);
  });

  it('names the XP that actually opens a locked Field Card', () => {
    // "Not discovered" is right for a printed card and wrong here: going outdoors does
    // nothing for a Field Card until the threshold is crossed.
    expect(tile).toContain("XP to unlock");
    expect(tile).toContain("locked ? `${locked.xp.toLocaleString()} XP to unlock` : 'Not discovered'");
  });

  it('orders them by the number printed on the artwork, so they land after #45', () => {
    expect(page).toContain('a.cardNumber - b.cardNumber');
    const numbers = FIELD_CARDS.map((card) => card.cardNumber);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    expect(Math.min(...numbers), 'a Field Card would sort among the printed deck')
      .toBeGreaterThan(PRINTED_DECK_SIZE);
  });

  it('does not let four digital cards read as part of the printed collection', () => {
    // The page header still says "45 cards · Collection 01" while the grid holds 49 tiles.
    // The band's own heading and line are what keep that true.
    expect(grid).toContain('field-cards-heading');
    expect(grid).toContain('Field Cards');
    expect(grid).toMatch(/not part of \{CURRENT_COLLECTION\.shortName\}/);
    for (const card of FIELD_CARDS) {
      expect(collectionOf(card).id, `${card.id} joined the printed collection`).toBe(
        FIELD_CARDS_COLLECTION_ID,
      );
    }
  });

  it('draws something on a locked tile for a card with no sprite', () => {
    /*
     * FOUND BY LOOKING, NOT BY A TEST. `MysteryCard` composes the face-down back from the
     * plant's own sprite, and all 45 printed cards have one — so an empty back was
     * unreachable until the Field Cards joined the grid. `sprites.json` holds 45 entries
     * and no sheet exists on disk for #48-51, so the four locked tiles rendered as blank
     * gradients: not a card face down, a broken tile.
     *
     * The fallback is a keyhole rather than a generic plant, deliberately. A shape standing
     * in for an unknown species is the same mistake the Seed Shelf's pots rule forbids.
     */
    const mystery = readFileSync('src/components/herbdex/MysteryCard.tsx', 'utf8');
    expect(mystery, 'a card without a sprite renders an empty back again').toContain(
      'hasSprite(herb.id) ?',
    );
  });

  /*
   * SPRITES ARE BEING DRAWN ONE SPECIES AT A TIME, and this tracks that honestly rather than
   * pretending the set is finished. The earlier version of the guard above asserted all four
   * had NO sprite, which was true when it was written and is the reason it failed the moment
   * #48 was drawn — it carried the remedy in its own message. That half now lives here.
   *
   * What it does NOT do is demand all four. Slots 5-9 have thresholds and no art at all, the
   * keyhole above is the honest answer for anything undrawn, and a test insisting on
   * coverage would only invite somebody to satisfy it with a placeholder — which is the one
   * thing the sprite rules forbid outright.
   *
   * What it DOES pin: a species that has a sprite is STAGED. A half-staged sprite renders an
   * adult where a seedling belongs, and `stageForState` would silently show the wrong age
   * rather than fail.
   *
   * `flowering` is deliberately not checked, and that is not an omission. `hasStageArt` reads
   * the `stages` map, which holds only the two YOUNG sheets — the adult is the base sprite
   * itself, so every printed card in the deck reports `flowering: false` too. Asserting it
   * would fail all 45.
   */
  it('gives every Field Card that has a sprite its young stages too', () => {
    const drawn = FIELD_CARDS.filter((card) => hasSprite(card.id));
    expect(drawn.length, 'no Field Card has a sprite yet — has the build run?').toBeGreaterThan(0);

    const young = GROWTH_STAGES.filter((stage) => stage !== 'flowering');
    for (const card of drawn) {
      for (const stage of young) {
        expect(
          hasStageArt(card.id, stage),
          `${card.id} has no ${stage} art — a half-staged sprite shows the wrong age`,
        ).toBe(true);
      }
      // The base sheet IS the adult, so this is what "has a flowering sprite" means here.
      expect(hasSprite(card.id)).toBe(true);
    }
  });

  it('hides the band under a habitat filter rather than showing an empty one', () => {
    /*
     * `HABITAT_ASSIGNMENTS` is a curated map over the printed 45 and `habitat.test.ts` pins
     * it as a partition of them. Adding Field Cards to it would change what the habitat
     * achievement and research task count — a progression change wearing a filter's
     * clothes — so the band steps aside instead.
     */
    expect(grid).toContain("if (habitat !== 'all') return [];");
    for (const card of FIELD_CARDS) {
      for (const habitat of HABITATS) {
        expect(matchesHabitatFilter(card.id, habitat), `${card.id} gained a habitat class`)
          .toBe(false);
      }
    }
  });
});
