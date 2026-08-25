import { describe, expect, it } from 'vitest';

import { SITE_CAUTIONS, siteCautionFor } from './card-cautions';
import { HERBS } from './deck';

/**
 * The site-added caution layer.
 *
 * The thing being protected here is the promise that screen and card never disagree. A
 * caution the site adds is genuinely useful; a caution the site adds while looking like
 * something the card prints would quietly make every other transcription less trustworthy.
 * So this file pins both halves: the caution exists, and it did NOT get into card data.
 */

const BY_NUMBER = new Map(HERBS.map((herb) => [herb.cardNumber, herb]));

describe('site cautions', () => {
  it('are attached to real cards', () => {
    for (const number of Object.keys(SITE_CAUTIONS)) {
      expect(BY_NUMBER.has(Number(number)), `card #${number} is not in the deck`).toBe(true);
      expect(SITE_CAUTIONS[number]!.trim().length).toBeGreaterThan(10);
    }
  });

  it('cover St. John’s Wort and nothing else', () => {
    // Deliberately exact. This is a high bar by design (see card-cautions.ts): a general
    // herbal caveat belongs on /safety, said once, not repeated onto card pages until
    // nobody reads any of them.
    expect(Object.keys(SITE_CAUTIONS)).toEqual(['32']);
    const wort = BY_NUMBER.get(32)!;
    expect(wort.commonName).toBe("St. John's Wort");
    expect(siteCautionFor(wort)).toContain('prescription medicines');
  });

  it('leaves every other plant without one', () => {
    const withCaution = HERBS.filter((herb) => siteCautionFor(herb)).map((h) => h.cardNumber);
    expect(withCaution).toEqual([32]);
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
    expect(HERBS.filter((herb) => herb.warning).map((h) => h.cardNumber)).toEqual([33]);
  });
});
