import { describe, expect, it } from 'vitest';

import { SITE_CAUTIONS, siteCautionFor } from './card-cautions';
import { KNOWN_CARD_ISSUES } from './card-issues';
import { PRINTED_CARDS } from './deck';

/**
 * The site-added caution layer.
 *
 * The thing being protected here is the promise that screen and card never disagree. A
 * caution the site adds is genuinely useful; a caution the site adds while looking like
 * something the card prints would quietly make every other transcription less trustworthy.
 * So this file pins both halves: the caution exists, and it did NOT get into card data.
 */

const BY_NUMBER = new Map(PRINTED_CARDS.map((herb) => [herb.cardNumber, herb]));

describe('site cautions', () => {
  it('are attached to real cards', () => {
    for (const number of Object.keys(SITE_CAUTIONS)) {
      expect(BY_NUMBER.has(Number(number)), `card #${number} is not in the deck`).toBe(true);
      expect(SITE_CAUTIONS[number]!.trim().length).toBeGreaterThan(10);
    }
  });

  it('cover Elderberry and St. John’s Wort, and nothing else', () => {
    // Deliberately exact. This is a high bar by design (see card-cautions.ts): a general
    // herbal caveat belongs on /safety, said once, not repeated onto card pages until
    // nobody reads any of them.
    expect(Object.keys(SITE_CAUTIONS).sort()).toEqual(['31', '32']);

    const wort = BY_NUMBER.get(32)!;
    expect(wort.commonName).toBe("St. John's Wort");
    expect(siteCautionFor(wort)).toContain('prescription medicines');

    const elder = BY_NUMBER.get(31)!;
    expect(elder.commonName).toBe('Elderberry');
    expect(siteCautionFor(elder)).toMatch(/leaves and green shoots are not safe/i);
  });

  it('leaves every other plant without one', () => {
    const withCaution = PRINTED_CARDS.filter((herb) => siteCautionFor(herb)).map((h) => h.cardNumber);
    expect(withCaution).toEqual([31, 32]);
  });

  /**
   * ELDERBERRY IS THE ONE CARD WHERE THE TWO LAYERS MUST BOTH FIRE, and the pairing is the
   * point rather than a duplication to tidy away. The card lists "Leaf" and "Shoot" as
   * usable parts, so a reader needs two different answers: the card is wrong (the printing
   * error note) and here is the risk (this caution). Drop either and the page is worse —
   * the note alone leaves somebody wondering how much it matters, and the caution alone
   * leaves them thinking their deck is fine.
   *
   * And neither may leak into the transcription: the usable-parts list still reads exactly
   * as the card prints it, which is what `deck.test.ts` guards from the other side.
   */
  it('pairs the elderberry caution with a recorded printing error, both layers intact', () => {
    const elder = BY_NUMBER.get(31)!;
    expect(siteCautionFor(elder), 'the risk itself').toBeDefined();
    expect(KNOWN_CARD_ISSUES['31'], 'the note saying the card is wrong').toMatch(/Leaf.*Shoot/);
    // The transcription is untouched — the card says these are usable, so the page does.
    expect(elder.back?.usableParts).toEqual(['Berry', 'Flower', 'Leaf', 'Shoot']);
    expect(elder.warning, 'must not become a printed card warning').toBeUndefined();
  });

  /**
   * The invariant that proves the caution stayed OUT of the generated deck data.
   * `deck.test.ts` asserts the same thing from the other side; both matter, because the
   * tempting shortcut was to add a `CARD_WARNINGS` entry in `build_deck.py` and let the
   * existing component render it — which would have printed a warning on screen that the
   * physical card does not carry.
   */
  it('never becomes a printed card warning', () => {
    const wort = BY_NUMBER.get(32)!;
    expect(wort.warning).toBeUndefined();
    expect(PRINTED_CARDS.filter((herb) => herb.warning).map((h) => h.cardNumber)).toEqual([33]);
  });
});
