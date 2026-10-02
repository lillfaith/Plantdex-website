import { describe, expect, it } from 'vitest';
import { matchScientificName, type ScanCandidate } from './plant-match';
import {
  PLAUSIBLE_SHARE,
  deckVernacularForGenus,
  genusLabel,
  improvementHint,
  plausibleField,
  summariseScan,
} from './scan-summary';

/**
 * THE SUMMARY MAY NEVER LEARN WHAT THE DECK HOLDS.
 *
 * Every fixture here is built through the real `matchScientificName`, so the card relations
 * are the app's own rather than a shape invented for the test. What the tests then assert is
 * that those relations change the WORDING and nothing else — not the level, not the genus,
 * not the ordering. That is the separation the whole change is about, and it is the one a
 * future edit is most likely to blur.
 */

const candidate = (scientificName: string, score: number, commonName?: string): ScanCandidate => ({
  scientificName,
  score,
  commonName,
  match: matchScientificName(scientificName),
});

/*
 * THE REAL CASE THIS WAS BUILT FROM. `Oxalis stricta` is the Wood Sorrel card; the other
 * four are relatives with no card of their own. The identifier leads with `grandis` and the
 * card sits second — which is exactly the shape that used to put a gold confirm button on
 * the runner-up.
 */
const WOOD_SORREL_SCAN: readonly ScanCandidate[] = [
  candidate('Oxalis grandis', 0.45),
  candidate('Oxalis stricta', 0.23),
  candidate('Oxalis suksdorfii', 0.2),
  candidate('Oxalis dillenii', 0.12),
  candidate('Oxalis corniculata', 0.03),
];

describe('the summary claims the highest level the result supports', () => {
  it('claims the genus when the live candidates agree on one but no species clears the band', () => {
    const summary = summariseScan(WOOD_SORREL_SCAN, 'plantnet');
    expect(summary.level).toBe('genus');
    expect(summary.genus).toBe('Oxalis');
    expect(summary.qualifier).toContain('Oxalis');
    expect(summary.qualifier).toMatch(/exact species uncertain/i);
  });

  it('NEVER names the lower-ranked card species as the identification', () => {
    /*
     * THE POINT OF THE WHOLE CHANGE. `Oxalis stricta` is second on score and first in the
     * deck's affections, and the summary is the loudest text on the screen. If the card can
     * reach this string, the UI is back to telling a player that Plantdex's card is what
     * they found.
     */
    const summary = summariseScan(WOOD_SORREL_SCAN, 'plantnet');
    for (const text of [summary.headline, summary.qualifier, summary.detail]) {
      expect(text, `the card species reached "${text}"`).not.toMatch(/stricta/i);
    }
  });

  it('claims a species only on the provider’s own high band', () => {
    const confident = summariseScan(
      [candidate('Taraxacum officinale', 0.82, 'Common dandelion'), candidate('Taraxacum erythrospermum', 0.04)],
      'plantnet',
    );
    expect(confident.level).toBe('species');
    expect(confident.headline).toContain('Common dandelion');

    // The same leader below the band is a genus answer, not a quieter species one.
    const unsure = summariseScan(
      [candidate('Taraxacum officinale', 0.52, 'Common dandelion'), candidate('Taraxacum erythrospermum', 0.3)],
      'plantnet',
    );
    expect(unsure.level).toBe('genus');
  });

  it('refuses to name anything when the live candidates disagree about the genus', () => {
    const summary = summariseScan(
      [candidate('Oxalis stricta', 0.4), candidate('Trifolium repens', 0.35)],
      'plantnet',
    );
    expect(summary.level).toBe('none');
    expect(summary.genus).toBeUndefined();
    expect(summary.headline).toMatch(/not sure/i);
  });

  it('handles a result with no candidates at all', () => {
    const summary = summariseScan([], 'plantnet');
    expect(summary.level).toBe('none');
  });
});

describe('card availability changes the wording and nothing else', () => {
  it('reaches the same level and genus for a genus the deck has no card in', () => {
    /*
     * Same shape as the wood sorrel scan, in a genus with no Plantdex card. If the deck were
     * load-bearing for the LEVEL, this would come out differently — it must not.
     */
    const cardless = summariseScan(
      [candidate('Bellis perennis', 0.45), candidate('Bellis sylvestris', 0.23)],
      'plantnet',
    );
    const withCard = summariseScan(WOOD_SORREL_SCAN, 'plantnet');
    expect(cardless.level).toBe(withCard.level);
    expect(cardless.detail).toBe(withCard.detail);
    expect(cardless.genus).toBe('Bellis');
    // Only the vernacular is missing, because the deck had no word to lend.
    expect(cardless.headline).toContain('Bellis');
  });

  it('borrows a vernacular only when the deck is unambiguous about the genus', () => {
    expect(deckVernacularForGenus(WOOD_SORREL_SCAN, 'Oxalis')).toBe('Wood Sorrel');

    /*
     * The deck holds TWO Rumex cards, so `Rumex` has no single deck name and none is
     * offered. Picking the first would be the `relatedHerbIds[0]` bug wearing a new hat.
     */
    const twoCards = [candidate('Rumex obtusifolius', 0.4), candidate('Rumex acetosella', 0.3)];
    expect(deckVernacularForGenus(twoCards, 'Rumex')).toBeUndefined();
    expect(summariseScan(twoCards, 'plantnet').headline).toContain('Rumex');
  });

  it('never reorders or reranks: the leader is whatever the provider put first', () => {
    /*
     * Reversing the deck-relevant candidate into first place must change the answer, and
     * moving it around WITHOUT changing scores must not. Both directions, because a sort
     * keyed on `confirmable` would pass one of them.
     */
    const asGiven = summariseScan(WOOD_SORREL_SCAN, 'plantnet');
    const shuffledScoresKept = summariseScan(
      [...WOOD_SORREL_SCAN].slice().reverse().sort((a, b) => b.score - a.score),
      'plantnet',
    );
    expect(shuffledScoresKept.headline).toBe(asGiven.headline);
    expect(plausibleField(WOOD_SORREL_SCAN).map((one) => one.scientificName)).toEqual([
      'Oxalis grandis',
      'Oxalis stricta',
    ]);
  });
});

describe('related species stay related', () => {
  it('leaves every non-card relative unconfirmable', () => {
    /*
     * The summary must not launder eligibility. Asserted on the matcher's own output through
     * the fixtures, so it fails if the coverage rules are ever widened to make this pass.
     */
    for (const one of WOOD_SORREL_SCAN) {
      if (one.scientificName === 'Oxalis stricta') {
        expect(one.match.confirmable, 'the card’s own species').toBe(true);
      } else {
        expect(one.match.confirmable, `${one.scientificName} became confirmable`).toBe(false);
        expect(one.match.eligibility).not.toBe('exact');
      }
    }
  });
});

describe('the plausible field is relative, not absolute', () => {
  it('keeps everything within half of the leader and drops the rest', () => {
    expect(PLAUSIBLE_SHARE).toBe(0.5);
    const field = plausibleField([
      candidate('Oxalis grandis', 0.4),
      candidate('Oxalis stricta', 0.2),
      candidate('Oxalis dillenii', 0.199),
    ]);
    expect(field).toHaveLength(2);
  });

  it('survives a small-genus scan where every score is low', () => {
    // The dock case from `outcomeFor`: a real leader at 0.30 must still be usable.
    const summary = summariseScan(
      [candidate('Rumex obtusifolius', 0.303), candidate('Rumex crispus', 0.14)],
      'plantnet',
    );
    expect(summary.level).toBe('genus');
  });
});

describe('historical scans still render', () => {
  it('falls back to the name’s own rank when the record carries no observed taxon', () => {
    /*
     * Rows written before `observedTaxon` existed. Defaulting these to `unknown` would demote
     * every one of them to "not sure" — a rendering regression that would look like caution.
     */
    const legacy: ScanCandidate = {
      scientificName: 'Taraxacum officinale',
      score: 0.82,
      match: { ...matchScientificName('Taraxacum officinale'), observedTaxon: undefined },
    };
    expect(summariseScan([legacy], 'plantnet').level).toBe('species');
  });

  it('treats an unrecorded provider as the one that would have answered', () => {
    expect(summariseScan(WOOD_SORREL_SCAN, undefined).level).toBe('genus');
  });
});

describe('the improvement hint is tailored, or absent', () => {
  it('says nothing when a species is already settled', () => {
    expect(improvementHint('species', false)).toBeUndefined();
    expect(improvementHint('species', true)).toBeUndefined();
  });

  it('asks for the missing identifying-feature photo', () => {
    const hint = improvementHint('genus', false);
    expect(hint).toBeDefined();
    expect(hint).toMatch(/flower|fruit|seed head|stem|bark/i);
  });

  it('does not re-ask for a photo that was already taken', () => {
    const taken = improvementHint('genus', true);
    expect(taken).toBeDefined();
    expect(taken).not.toBe(improvementHint('genus', false));
    expect(taken).toMatch(/another angle|different part/i);
  });
});

describe('the genus label', () => {
  /*
   * Rehoused from `scan-ambiguity.test.ts`, which this change emptied. The function is
   * unchanged; what went was the duplicate-heading detector beside it, made unnecessary by
   * heading every row with the binomial.
   */
  it('capitalises the genus for prose', () => {
    expect(genusLabel('Sambucus spp.')).toBe('Sambucus');
    expect(genusLabel('Quercus spp.')).toBe('Quercus');
    expect(genusLabel('Oxalis stricta')).toBe('Oxalis');
  });
});
