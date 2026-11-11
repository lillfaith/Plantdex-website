import { describe, expect, it } from 'vitest';

import {
  CARD_SOURCES,
  cardsNeedingReview,
  citationsFor,
  citedCardCount,
  evidenceLabelFor,
  type CardEvidence,
} from './card-sources';
import { siteCautionFor } from './card-cautions';
import { cardCorrectionFor } from './card-corrections';
import { PRINTED_CARDS } from './deck';
import { getSource, resolveRefs } from './sources';

/**
 * The curated citation layer.
 *
 * These tests exist because the failure mode here is silent and expensive: a citation
 * attached to the wrong plant reads exactly like a correct one, and it is worse than no
 * citation at all — it lends a real journal's credibility to a claim that journal never
 * examined. That is not hypothetical. The source audit mapped card #38 to Cinquefoil
 * (*Potentilla*) while the deck prints Willow (*Salix*), and the three references were only
 * caught because someone compared the two by hand.
 */

const BY_NUMBER = new Map(PRINTED_CARDS.map((herb) => [herb.cardNumber, herb]));

describe('CARD_SOURCES', () => {
  it('keys only real cards in this deck', () => {
    for (const number of Object.keys(CARD_SOURCES)) {
      expect(BY_NUMBER.has(Number(number)), `card #${number} is not in the deck`).toBe(true);
    }
  });

  it('cites only sources that exist in the registry and are verified', () => {
    for (const [number, entry] of Object.entries(CARD_SOURCES)) {
      for (const id of entry.sourceIds) {
        const source = getSource(id);
        expect(source, `card #${number} cites unknown source ${id}`).toBeDefined();
        // The one rule the whole system rests on: an unopened source never reaches a reader.
        expect(source!.verified, `card #${number} cites unverified ${id}`).toBe(true);
        expect(source!.title.trim().length).toBeGreaterThan(0);
      }
    }
  });

  /**
   * The #38 failure, turned into something that cannot recur silently. Every reference in
   * the audit was researched for one specific plant; reusing one on a second card would
   * mean asserting it covers a species nobody checked it against.
   */
  it('never lets two cards cite the same source', () => {
    const owner = new Map<string, string>();
    for (const [number, entry] of Object.entries(CARD_SOURCES)) {
      for (const id of entry.sourceIds) {
        const first = owner.get(id);
        expect(first, `${id} is cited by cards #${first} and #${number}`).toBeUndefined();
        owner.set(id, number);
      }
    }
  });

  it('gives a sourced card exactly the three references the audit found', () => {
    for (const [number, entry] of Object.entries(CARD_SOURCES)) {
      if (entry.sourceIds.length === 0) continue;
      expect(entry.sourceIds, `card #${number}`).toHaveLength(3);
      expect(new Set(entry.sourceIds).size).toBe(3);
    }
  });

  it('records why every card is graded the way it is', () => {
    for (const [number, entry] of Object.entries(CARD_SOURCES)) {
      expect(entry.auditNote.trim().length, `card #${number} has no audit note`).toBeGreaterThan(20);
    }
  });

  /** `hold` and `exclude` mean "do not source this yet", so they must carry nothing. */
  it('leaves held and excluded cards uncited', () => {
    const withheld: CardEvidence[] = ['hold', 'exclude'];
    for (const [number, entry] of Object.entries(CARD_SOURCES)) {
      if (!withheld.includes(entry.evidence)) continue;
      expect(entry.sourceIds, `card #${number} is ${entry.evidence} but cites sources`).toEqual([]);
    }
  });

  it('holds back exactly the three cards that are uncited by decision', () => {
    const uncited = PRINTED_CARDS.filter((herb) => (CARD_SOURCES[String(herb.cardNumber)]?.sourceIds.length ?? 0) === 0)
      .map((herb) => herb.cardNumber)
      .sort((a, b) => a - b);
    // #11 wrong printed back; #19 and #21 held pending verification of theirs.
    expect(uncited).toEqual([11, 19, 21]);
    expect(citedCardCount()).toBe(PRINTED_CARDS.length - uncited.length);
  });

  /**
   * #38 is the card the audit got wrong, so it is pinned by name: Willow's references, not
   * the Cinquefoil ones that were mapped to it and discarded.
   */
  it('cites Willow, not the Cinquefoil the audit mis-mapped to #38', () => {
    const willow = BY_NUMBER.get(38)!;
    expect(willow.scientificName).toContain('Salix');
    const titles = CARD_SOURCES['38']!.sourceIds.map((id) => getSource(id)!.title.toLowerCase());
    expect(titles.every((title) => title.includes('willow') || title.includes('salic'))).toBe(true);
    expect(titles.some((title) => title.includes('potentilla'))).toBe(false);
  });
});

describe('citationsFor', () => {
  it('keeps the deck first for every plant', () => {
    for (const herb of PRINTED_CARDS) {
      const resolved = resolveRefs(citationsFor(herb));
      expect(resolved.length, `herb ${herb.id} has no verified source`).toBeGreaterThan(0);
      expect(resolved[0]!.source.id, `herb ${herb.id}`).toBe('plantdex-deck');
      expect(resolved[0]!.detail).toContain(String(herb.cardNumber).padStart(2, '0'));
    }
  });

  it('adds the curated references after it, in order', () => {
    const wort = BY_NUMBER.get(32)!;
    const ids = resolveRefs(citationsFor(wort)).map((entry) => entry.source.id);
    expect(ids.slice(1)).toEqual(CARD_SOURCES['32']!.sourceIds);
  });

  it('gives an uncited card the deck alone', () => {
    const deadNettle = BY_NUMBER.get(11)!;
    expect(resolveRefs(citationsFor(deadNettle)).map((e) => e.source.id)).toEqual([
      'plantdex-deck',
    ]);
  });
});

describe('evidenceLabelFor', () => {
  it('labels a well-sourced card and one the audit wants revisited', () => {
    expect(CARD_SOURCES['32']!.evidence).toBe('strong');
    expect(evidenceLabelFor(BY_NUMBER.get(32)!)).toBe('Well sourced');

    // #04 Ragweed: the audit found the card's own claims outrun their evidence. The card
    // is printed and transcribed by rule, so saying so is the only correction available.
    expect(CARD_SOURCES['4']!.evidence).toBe('revise');
    // `revise` IS NOT SHOWN TO A READER. It is an internal audit state; printed beside a
    // card's references it reads as a disclaimer about the plant rather than a note about
    // our backlog. The state itself is still there and `cardsNeedingReview()` lists it.
    expect(evidenceLabelFor(BY_NUMBER.get(4)!)).toBeNull();
  });

  /**
   * Silence rather than a grade. A held card has references nobody has decided about, and
   * a label like "Evidence varies" would be an assessment the audit explicitly declined to
   * make.
   */
  it('says nothing about a card that carries no references', () => {
    for (const number of [11, 19, 21]) {
      expect(evidenceLabelFor(BY_NUMBER.get(number)!), `card #${number}`).toBeNull();
    }
  });

  /**
   * NO CARD IN THE DECK MAY PRINT EDITORIAL STATUS AT A PLAYER.
   *
   * The single `revise` assertion above covers one card. This sweeps all 45 and bans the
   * vocabulary rather than one string, because the regression is not "the old label came
   * back" — it is somebody adding a `revise: 'Under review'` entry, or a sixth verdict with
   * a label of its own, and both would read to a reader as a disclaimer about the plant.
   *
   * `EVIDENCE_LABEL` is deliberately `Partial`, so a verdict with no entry is a legitimate
   * and silent state. That is what makes this enforceable at the accessor.
   */
  it('never grades a card with an internal editorial word', () => {
    const EDITORIAL = /review|revise|pending|unverified|provisional|backlog|audit|draft/i;
    for (const herb of PRINTED_CARDS) {
      const label = evidenceLabelFor(herb);
      if (label === null) continue;
      expect(label, `card #${herb.cardNumber} prints an editorial label`).not.toMatch(EDITORIAL);
    }
  });

  /**
   * AND REMOVING THE LABEL TOOK NO SAFETY INFORMATION WITH IT.
   *
   * The whole argument for dropping `revise` from the page is that it said nothing a reader
   * needed — the hazards and the printing errors are carried by three other layers, each
   * answering a different question (CLAUDE.md: "BOTH layers fire and neither substitutes for
   * the other"). If one of those had quietly gone with it, the page would now be both
   * quieter AND less safe, which is the one outcome this change must not produce.
   *
   * Card #04 Ragweed is the card the `revise` verdict was about, and #31 Elder is the one
   * whose reprinted back lists parts that are not safely usable. Both must still speak.
   */
  it('leaves the cautions and corrections that do reach a reader', () => {
    const ragweed = BY_NUMBER.get(4)!;
    expect(evidenceLabelFor(ragweed)).toBeNull();
    // Its audit note is still recorded, and still internal.
    expect(CARD_SOURCES['4']!.auditNote.length).toBeGreaterThan(0);
    expect(cardsNeedingReview().map((card) => card.cardNumber)).toContain('4');

    const elder = BY_NUMBER.get(31)!;
    expect(siteCautionFor(elder), 'elder lost its hazard caution').toBeTruthy();
    expect(cardCorrectionFor(elder), 'elder lost its printed-card correction').toBeTruthy();
  });
});
