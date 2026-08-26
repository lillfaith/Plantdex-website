import { describe, expect, it } from 'vitest';

import {
  CARD_SOURCES,
  citationsFor,
  citedCardCount,
  evidenceLabelFor,
  type CardEvidence,
} from './card-sources';
import { HERBS } from './deck';
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

const BY_NUMBER = new Map(HERBS.map((herb) => [herb.cardNumber, herb]));

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
    const uncited = HERBS.filter((herb) => (CARD_SOURCES[String(herb.cardNumber)]?.sourceIds.length ?? 0) === 0)
      .map((herb) => herb.cardNumber)
      .sort((a, b) => a - b);
    // #11 wrong printed back; #19 and #21 held pending verification of theirs.
    expect(uncited).toEqual([11, 19, 21]);
    expect(citedCardCount()).toBe(HERBS.length - uncited.length);
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
    for (const herb of HERBS) {
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
    expect(evidenceLabelFor(BY_NUMBER.get(4)!)).toBe('Card needs review');
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
});
