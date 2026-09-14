import { getPrintedCard } from "./deck";
import { genusOf, type ScanCandidate } from "./plant-match";

/**
 * Which card names a scan result would print more than once, and how to say the genus.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY TWO ROWS CAN BOTH SAY "ELDERBERRY" AND MEAN DIFFERENT PLANTS.
 *
 * Nine of the 45 cards are GENUS cards — `Sambucus spp.`, `Acer spp.`, `Quercus spp.` and
 * six more — and `matchScientificName` maps every species in such a genus onto that one
 * card, confirmably. A provider handed a photograph of an elder routinely returns several
 * Sambucus species at once, so the scan list drew two rows both headed with the CARD's name
 * and both offering "Yes, I found Elderberry". The binomial was on screen and settled the
 * question, but it sat under the score in the dimmest shade on the row, so the two rows read
 * as a duplicate rather than as a choice.
 *
 * The same shape reaches `sameGenus` rows, which resolve to `relatedHerbIds[0]`: two Rumex
 * species both head themselves "Broadleaf Dock". Those carry no confirm button, so only the
 * naming half of the problem applies to them.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THIS LIVES HERE RATHER THAN IN `plant-match.ts` because that module is copied into the
 * edge function by `sync:edge-shared`, and how a list presents itself is not something the
 * server has any business carrying. It resolves cards, which is a UI concern here and
 * nowhere else.
 */

/**
 * Card common names that MORE THAN ONE visible row would print.
 *
 * COUNTED OVER THE ROWS THAT RENDER. A candidate with no card is dropped by the list's own
 * `!herb` guard, so counting raw candidates would call a name ambiguous on the strength of a
 * row nobody can see — and then promote a binomial on the one row that is left, which is the
 * ordinary case wearing the ambiguous treatment.
 *
 * ONLY WHEN NEEDED: a result whose names are already distinct returns an empty set, and
 * every branch keyed on it is a no-op. That is what keeps an ordinary scan compact.
 */
export function ambiguousCardNames(
  candidates: readonly ScanCandidate[],
): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    const herb = candidate.match.herbId
      ? getPrintedCard(candidate.match.herbId)
      : undefined;
    if (!herb) continue;
    counts.set(herb.commonName, (counts.get(herb.commonName) ?? 0) + 1);
  }
  return new Set(
    [...counts]
      .filter(([, seen]) => seen > 1)
      .map(([commonName]) => commonName),
  );
}

/** `Sambucus spp.` -> `Sambucus`, for prose naming the genus a card covers. */
export function genusLabel(scientificName: string): string {
  return genusOf(scientificName).replace(/^./, (letter) =>
    letter.toUpperCase(),
  );
}
