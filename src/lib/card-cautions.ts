import type { Herb } from './types';

/**
 * Safety cautions the SITE adds, for a risk the printed card does not carry.
 *
 * WHY THIS EXISTS SEPARATELY FROM `herb.warning`. That field is defined in
 * `scripts/build_deck.py` as "warnings printed on the card itself", and `deck.test.ts`
 * pins it to Yarrow alone — the one card that prints one. Adding a caution there would
 * mean inventing a printed warning that no card carries, which breaks the guarantee that
 * makes the whole transcription trustworthy: that screen and card never disagree.
 *
 * The deck is in production, so the plates cannot answer this any more. That leaves the
 * site as the only correction channel, and a curated layer over generated data as the only
 * honest way to use it — the same seam as `card-issues.ts` and `card-sources.ts`.
 *
 * THE BAR FOR ADDING ONE. High, deliberately. A site-added caution must name a specific,
 * well-documented risk that a reader of that card would not otherwise anticipate, and the
 * card must be one whose own text points at the situation where the risk applies. It is
 * not a place for general herbal caveats — /safety carries those, once.
 *
 * #32 St. John's Wort meets it. It is the deck's only card whose plant has a large,
 * well-documented interaction profile with prescription medicines (it induces CYP3A4 and
 * P-glycoprotein, which is why it reaches antidepressants, hormonal contraceptives,
 * anticoagulants, immunosuppressants and antiretrovirals), and the card recommends internal
 * preparations for a use case where the reader is disproportionately likely to already be
 * taking one of them. The audit graded #32's evidence `strong` and flagged the interaction
 * risk in the same breath.
 */
export const SITE_CAUTIONS: Record<string, string> = {
  '32': 'Beware: interacts with many prescription medicines.',
};

/**
 * The site-added caution for a card, if it has one.
 *
 * Rendered with `SiteCaution`, which is prefixed "Not printed on the card." — a reader
 * comparing screen to deck must never be left thinking their card says something it does
 * not.
 */
export function siteCautionFor(herb: Herb): string | undefined {
  return SITE_CAUTIONS[String(herb.cardNumber)];
}
