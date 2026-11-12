/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW OFTEN THE RIGHT PLANT IS NEAR THE TOP — measured, not asserted.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * A CORRECT ANSWER READING "16%" LOOKS LIKE A BROKEN PRODUCT, AND THE NUMBER IS NOT THE
 * THING TO CHANGE.
 *
 * A provider's score is one name's share of a ranking whose tail it does not even send, so
 * in a large genus a confident identification still prints a small number. Raising it would
 * be inventing confidence, which is the one thing a plant identifier must never do.
 *
 * What CAN be said truthfully is how often the list is right, because this repo has the
 * evidence: `plant-match.live.test.ts` holds the real provider response for a photograph of
 * every one of the 45 printed cards, with the correct answer known for each. The position of
 * the right card in those 45 rankings is a fact that can be counted:
 *
 *     1st  38      2nd  5      3rd  1      4th  1
 *
 * So the correct card was in the top three 44 times out of 45, and in the top four every
 * single time. That is a statement about reliability the product has earned and can show,
 * standing beside a percentage that measures something else entirely.
 * ───────────────────────────────────────────────────────────────────────────────
 *
 * THESE NUMBERS ARE RECOMPUTED FROM THE SURVEY BY `identification-reliability.test.ts`,
 * which walks the same fixtures and fails if a constant here stops matching what the data
 * says. A reliability claim that drifts from its evidence is worse than none, and the only
 * way to keep a hand-written figure honest is to make the data recompute it.
 *
 * WHAT IT DOES NOT CLAIM. The survey is photographs of THIS deck's 45 species, taken to be
 * identifiable. It is not a claim about every plant on earth, about a bad photograph, or
 * about a species with no card — and the wording below says "the deck's species" for that
 * reason. It also says nothing about which of the three is right, which is exactly why the
 * player is still asked to check the plant against the card.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** Cards photographed and sent to the live identifier. */
export const SURVEY_SIZE = 45;

/** Of those, how many had the correct card among the first three suggestions. */
export const SURVEY_TOP_THREE = 44;

/** And among the first four — every one. */
export const SURVEY_TOP_FOUR = 45;

/**
 * The sentence shown above the suggestions.
 *
 * Deliberately a COUNT rather than a percentage: "44 out of 45" is checkable and reads as
 * evidence, where "98%" reads as another score on a screen that already has too many, and
 * would sit a line above numbers like 16% saying something apparently contradictory.
 */
export function topThreeStatement(): string {
  return `Across ${SURVEY_SIZE} test photographs of the deck's species, the correct card was among the top three suggestions ${SURVEY_TOP_THREE} times.`;
}
