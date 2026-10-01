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
 *
 * #31 WAS WIDENED ONCE THE CARD'S SCOPE WAS AUDITED, because it addressed the wrong half of
 * the genus. It named Leaf and Shoot — correct, and the card's printed error — while saying
 * "the flowers and cooked ripe berries are the parts traditionally used", which reads as a
 * clearance for the berries. It is not one. The seeds of EVERY *Sambucus* carry a nauseant
 * resin destroyed by cooking, and the card prints `Cold soak` among its preparations, which
 * is uncooked. *S. racemosa* is the sharpest case — raw berries, leaves, twigs and seeds
 * cause nausea, vomiting and diarrhoea — and it is a legitimate find on this card, so the
 * caution carries it rather than the scope excluding it. (*S. ebulus* is excluded instead;
 * see `CONTENT_EXCLUSIONS`.)
 *
 * #41 PINE IS THE FIRST CAUTION HERE RESTING ON ANIMAL TOXICOLOGY, AND ITS WORDING IS BUILT
 * AROUND THAT. The controlled evidence is bovine: *Pinus ponderosa* is the only *Pinus* known
 * to cause abortion in cattle in the US and Canada, and isocupressic acid is the only
 * compound isolated and shown to do it. THERE IS NO HUMAN CLINICAL DATASET. What exists on
 * the human side is a consistent traditional prohibition — indigenous peoples used the inner
 * bark and seeds but held that pregnant women should not chew the buds or needles — pointing
 * at the same outcome as the animal data.
 *
 * So the text says "avoid", names pregnancy, and does NOT assert a human toxicity that
 * nobody has established. Writing "ponderosa pine needles cause miscarriage" would be
 * inventing a human claim out of a cattle study, which is the same class of error as
 * inventing botany. It clears the bar because the card prints the exact exposure the
 * caution is about: Needle, prepared as Tea.
 */
export const SITE_CAUTIONS: Record<string, string> = {
  '31':
    'Beware: elder leaves and green shoots are not safe to use, despite this card listing ' +
    'them. Use the flowers, and cook the ripe berries — raw berries and their seeds can ' +
    'cause nausea, vomiting and stomach upset in any elder, and a cold soak does not make ' +
    'them safe. Red elderberry (Sambucus racemosa) is the strongest example: cook it well ' +
    'and strain the seeds out.',
  '32': 'Beware: interacts with many prescription medicines.',
  '41':
    'Beware: avoid ponderosa pine (Pinus ponderosa) needles in pregnancy. Its needles are ' +
    'known to cause abortion in cattle; this has not been established in people, but ' +
    'traditional guidance has long cautioned pregnant women against chewing the needles or ' +
    'buds. Other pines are not implicated.',
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
