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

  it('cover Goldenrod, Elderberry, St. John’s Wort and Pine, and nothing else', () => {
    // Deliberately exact. This is a high bar by design (see card-cautions.ts): a general
    // herbal caveat belongs on /safety, said once, not repeated onto card pages until
    // nobody reads any of them.
    expect(Object.keys(SITE_CAUTIONS).sort()).toEqual(['3', '31', '32', '41']);

    const wort = BY_NUMBER.get(32)!;
    expect(wort.commonName).toBe("St. John's Wort");
    expect(siteCautionFor(wort)).toContain('prescription medicines');

    const elder = BY_NUMBER.get(31)!;
    expect(elder.commonName).toBe('Elderberry');
    /*
     * THIS CAUTION IS NOW ABOUT PREPARATION ONLY. The card's printing error — Leaf and Shoot
     * listed as usable — is stated once by `CARD_CORRECTIONS`, which names the mistake and
     * forbids the use. Repeating it here was the third telling of one fact.
     */
    expect(siteCautionFor(elder)).toMatch(/cold soak is not an adequate preparation/i);
    expect(siteCautionFor(elder)).toMatch(/sambucus racemosa/i);
    expect(siteCautionFor(elder)).toMatch(/unripe fruit/i);
    expect(siteCautionFor(elder), 'the leaf/shoot error belongs to the card correction').not.toMatch(
      /green shoots/i,
    );

    const pine = BY_NUMBER.get(41)!;
    expect(pine.commonName).toBe('Pine');
    expect(siteCautionFor(pine)).toMatch(/pregnan/i);
    expect(siteCautionFor(pine)).toMatch(/ponderosa/i);
  });

  /*
   * THE PINE CAUTION RESTS ON CATTLE DATA AND MUST NOT READ AS A HUMAN FINDING.
   *
   * Isocupressic acid is established as an abortifacient in cattle; there is no human
   * clinical dataset, and the human-side signal is a traditional prohibition. The sentence
   * that does the work is therefore the one disclaiming the human claim — if a future edit
   * tightens the text for brevity, that is exactly the clause that would go first, and
   * losing it turns a sourced animal result into an invented human one.
   */
  it('keeps the Pine caution honest about whose evidence it is', () => {
    const pine = siteCautionFor(BY_NUMBER.get(41)!)!;
    expect(pine).toMatch(/cattle/i);
    expect(pine).toMatch(/not been established/i);
    // It must not state a human effect as fact.
    expect(pine).not.toMatch(/causes? (a )?miscarriage in (people|humans)/i);
    expect(pine).not.toMatch(/toxic to (people|humans)/i);
  });

  /*
   * THE GOLDENROD CAUTION EXISTS BECAUSE THE CARD'S OWN TRAIT POINTS AT ITS OWN
   * CONTRAINDICATION — "Allergy support" printed on a plant contraindicated in Asteraceae
   * hypersensitivity. The audit verdict was REWORD, and `healingTraits` is generated from the
   * print master and must read as printed, so the reframing lives here. Both halves are
   * pinned: WHO must avoid it, and that the allergy use is traditional rather than approved.
   */
  it('reframes the Goldenrod allergy trait rather than denying it', () => {
    const goldenrod = siteCautionFor(BY_NUMBER.get(3)!)!;
    expect(goldenrod).toMatch(/ragweed/i);
    expect(goldenrod).toMatch(/not an approved indication/i);
    expect(goldenrod).toMatch(/urinary/i);
    // It must not claim the trait is false — traditional use for catarrh is real, and the
    // transcription stays as printed either way.
    expect(goldenrod).not.toMatch(/does not (help|treat|work)/i);
  });

  /*
   * AND IT MUST NOT REASSURE ABOUT THE REST OF THE GENUS, which this caution originally did.
   * It ended "Other pines are not implicated" — written from a framing about naturally
   * occurring field cases, and false as a general statement: isocupressic acid occurs across
   * a range of North American gymnosperms, and lodgepole pine has caused abortion in
   * CONTROLLED feeding trials. The card covers nine species, so that sentence cleared eight
   * of them on evidence that does not exist.
   *
   * A wrong reassurance is worse than a missing warning: nobody acts on a caution they have
   * been told does not apply to them. Pinned in the negative as well as the positive, because
   * the failure mode is a sentence being ADDED back for reassurance, not one going missing.
   */
  it('does not clear the other species the Pine card covers', () => {
    const pine = siteCautionFor(BY_NUMBER.get(41)!)!;
    expect(pine).toMatch(/do not assume other pine needles are safe/i);
    expect(pine).not.toMatch(/other pines are (not implicated|safe|fine|unaffected)/i);
    expect(pine).not.toMatch(/only pine/i);
  });

  it('leaves every other plant without one', () => {
    const withCaution = PRINTED_CARDS.filter((herb) => siteCautionFor(herb)).map((h) => h.cardNumber);
    expect(withCaution).toEqual([3, 31, 32, 41]);
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
