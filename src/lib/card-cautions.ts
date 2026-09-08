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
 *
 * #31 ELDERBERRY MEETS IT FOR A DIFFERENT REASON, AND IS THE STRONGER CASE. The other
 * cautions here would apply to a correctly printed card; this one exists because the card
 * is WRONG. Its reprinted back lists "Leaf" and "Shoot" among usable parts, and elder's
 * leaves, green stems and unripe berries carry cyanogenic glycosides — the flowers and
 * cooked ripe berries are the parts the plant is actually used for. So the card does not
 * merely fail to warn: it points a reader at the two parts to leave alone, under a heading
 * that says "usable". That is the one situation where staying silent is the active choice.
 *
 * It is deliberately paired with the `KNOWN_CARD_ISSUES` entry for 31 rather than replacing
 * it. The two answer different questions — "is my card wrong?" and "what is the risk?" —
 * and a reader holding the deck needs both. Neither may be folded into the transcription
 * itself: the usable-parts list still reads exactly as printed.
 */
export const SITE_CAUTIONS: Record<string, string> = {
  '31':
    'Beware: elder leaves and green shoots are not safe to use, despite this card listing ' +
    'them. The flowers and cooked ripe berries are the parts traditionally used.',
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
