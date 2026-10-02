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
 * clearance for the berries. It is not one: the card prints `Cold soak` among its
 * preparations, which is uncooked, and *S. racemosa* raw causes nausea, vomiting and
 * diarrhoea. It is a legitimate find on this card, so the caution carries it rather than the
 * scope excluding it. (*S. ebulus* is excluded instead; see `CONTENT_EXCLUSIONS`.)
 *
 * AND THEN THE WIDENED TEXT WAS ITSELF TOO BROAD. It said raw berries and seeds cause upset
 * "in any elder", which the measurements do not support: cyanogenic glycosides in *Sambucus*
 * vary by TISSUE (ripe berries lowest, stems and green berries highest), by CULTIVAR, and by
 * POPULATION — some *S. canadensis* populations are essentially acyanogenic — and the
 * American-elderberry survey concluded levels in all tissues were low enough to pose no
 * threat to consumers of fresh and processed products. So the risk is real and it is NOT
 * uniform across the genus. The text now warns about the PARTS and the PREPARATION, which is
 * what a reader can act on, and says elderberries "can" cause upset rather than asserting
 * that every species does.
 *
 * #3 GOLDENROD IS THE FIRST CAUTION ADDED BECAUSE A CARD'S OWN TRAIT POINTS AT ITS OWN
 * CONTRAINDICATION. The card prints "Allergy support", and goldenrod carries an
 * Asteraceae-hypersensitivity contraindication — so the reader most likely to act on that
 * trait, a hay-fever sufferer, is disproportionately likely to be ragweed-sensitised, and
 * ragweed is an Asteraceae. The trait is not false: traditional use for sinus and catarrhal
 * complaints is real, and quercetin (which the card prints) has antihistamine activity in
 * non-clinical work. But the approved indication — Commission E, ESCOP, Ph. Eur. — is
 * URINARY, not allergic, so "Allergy support" printed beside the other three traits reads as
 * though all four carry the same weight. They do not.
 *
 * It clears the bar on exactly the stated terms: a specific, well-documented risk the reader
 * would not anticipate, on a card whose OWN TEXT points at the situation where it applies.
 * The audit verdict was REWORD, and the transcription cannot be reworded — `healingTraits` is
 * generated from the print master and must read as printed — so the reframing is delivered
 * here, where it can say both halves: who must avoid it, and that the allergy use is
 * traditional rather than approved.
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
 *
 * IT ALSO USED TO END "Other pines are not implicated", WHICH WAS FALSE. That sentence was
 * written from a USDA framing about naturally-occurring field cases, and it reads as a
 * clearance for the other eight species this card covers. Isocupressic acid is present
 * across a range of North American gymnosperms, and lodgepole pine (*Pinus contorta*) has
 * caused abortion in CONTROLLED feeding trials — cows dosed at 62-78 mg/kg aborted after 8
 * and 10 days — as has common juniper. Ponderosa remains the species with the strongest and
 * best-known evidence; it is not the only one. The caution now says so, because a reassurance
 * is the most dangerous kind of sentence to get wrong: nobody acts on a warning they were
 * told did not apply to them.
 */
export const SITE_CAUTIONS: Record<string, string> = {
  '3':
    'Beware: goldenrod is in the daisy family, so avoid it if you react to ragweed, daisies ' +
    'or chrysanthemums — which is the same group of people most likely to read "Allergy ' +
    'support" and try it. Its traditional allergy use is for catarrh and sinus complaints ' +
    'and is not an approved indication; the approved use is urinary. Not for use in ' +
    'pregnancy, or where fluid is retained because of heart or kidney problems.',
  '31':
    'Beware: elder leaves, green shoots and unripe fruit are not safe to use, despite this ' +
    'card listing leaf and shoot as usable parts. Use only properly identified and prepared ' +
    'parts — the flowers, and ripe fruit that has been cooked. Raw or insufficiently ' +
    'prepared elderberries can cause nausea, vomiting or stomach upset; a cold soak is not ' +
    'an adequate preparation. Red elderberry (Sambucus racemosa) especially needs cooking, ' +
    'with the seeds strained out.',
  '32': 'Beware: interacts with many prescription medicines.',
  '41':
    'Pregnancy caution: avoid ponderosa pine (Pinus ponderosa) needles. They contain ' +
    'diterpene acids well established to cause abortion in cattle. Human pregnancy risk ' +
    'has not been established, though traditional guidance has long cautioned pregnant ' +
    'women against chewing the needles or buds. The same compounds occur in other conifers ' +
    '— lodgepole pine has caused abortion in cattle too — so do not assume other pine ' +
    'needles are safe in pregnancy.',
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
