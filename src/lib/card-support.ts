import type { ConfidenceBand } from './plant-match';
import { confidenceBand } from './plant-match';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW MUCH OF THE IDENTIFIER'S ANSWER POINTS AT ONE CARD.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * THE NUMBER ON SCREEN WAS ANSWERING A DIFFERENT QUESTION FROM THE ONE PEOPLE READ.
 *
 * A provider divides its probability mass across CANDIDATE NAMES. Several of those names
 * routinely denote the SAME plant and resolve to the same Plantdex card — a conserved name
 * and a section name, a synonym and its accepted binomial. The deck's own stored response
 * for a real dandelion is exactly this shape:
 *
 *     Taraxacum campylodes     .454   -> card #01
 *     Taraxacum sect. Taraxacum .221  -> card #01
 *     Taraxacum pubescens      .023
 *     ...
 *
 * So the screen said "Match score: 45%" and a reader took that as "45% sure this is a
 * dandelion". It never meant that. It meant "this NAME holds 45% of the ranking", while
 * 68% of the ranking pointed at that one card. Correct identifications therefore looked
 * unreliable, and the fix is not to inflate a number but to stop reporting the share of a
 * name as though it were the standing of a plant.
 *
 * SUMMING IS LEGITIMATE HERE AND IT IS WORTH SAYING WHY, because `plant-match.ts` rightly
 * warns against "quietly normalising them into a shape they were never in". This does not
 * rescale anything, invent a denominator, or move a number between candidates. It adds
 * shares that already sit in one ranking and already denote one card. The caveat survives
 * intact and is still printed: these are not calibrated probabilities, and the combined
 * figure is no more calibrated than its parts.
 * ───────────────────────────────────────────────────────────────────────────────
 *
 * IT CHANGES NO RANKING AND NO OUTCOME. `outcomeFor` reads RANK and must keep doing so —
 * a deck species below a higher-scored non-deck one still leaves the scan `uncertain`.
 * This is a description of the list, computed for display, and nothing branches on it.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** The part of a candidate this needs. Structural, so the tests need no fixtures. */
export interface SupportCandidate {
  readonly scientificName: string;
  readonly score: number;
  readonly match: {
    readonly confirmable?: boolean;
    readonly herbId?: string | null;
  };
}

export interface CardSupport {
  readonly herbId: string;
  /** Combined share of the ranking held by every name resolving to this card. */
  readonly share: number;
  /** Those names, in the order the provider gave them. */
  readonly names: readonly string[];
  /** The band the COMBINED share falls in, by the same thresholds a single score uses. */
  readonly band: ConfidenceBand;
}

/**
 * Every card the suggestions point at, strongest first.
 *
 * Only `confirmable` matches count. A `sameGenus` relative is explicitly NOT the card — it
 * is a different species — so folding its share in would be the exact overclaim this whole
 * module exists to remove.
 *
 * A non-finite or negative score contributes nothing rather than poisoning a total: a
 * provider that sends rubbish should cost one row, not the whole summary.
 */
export function cardSupport(candidates: readonly SupportCandidate[]): readonly CardSupport[] {
  const byCard = new Map<string, { share: number; names: string[] }>();

  for (const candidate of candidates) {
    const herbId = candidate.match.herbId;
    if (!candidate.match.confirmable || !herbId) continue;
    const score = Number.isFinite(candidate.score) && candidate.score > 0 ? candidate.score : 0;
    const entry = byCard.get(herbId) ?? { share: 0, names: [] };
    entry.share += score;
    entry.names.push(candidate.scientificName);
    byCard.set(herbId, entry);
  }

  return [...byCard.entries()]
    .map(([herbId, { share, names }]) => ({
      // A sum of shares cannot exceed the whole ranking; clamp so a provider that overshoots
      // cannot print "112%".
      share: Math.min(1, share),
      herbId,
      names,
      band: confidenceBand(Math.min(1, share)),
    }))
    .sort((left, right) => right.share - left.share);
}

/**
 * The card worth naming above the list, if any.
 *
 * Only when MORE THAN ONE name points at it — with a single name the combined figure is
 * just that row's own score repeated, and a line restating a number already on screen is
 * noise rather than reassurance.
 */
export function combinedSupport(candidates: readonly SupportCandidate[]): CardSupport | null {
  const top = cardSupport(candidates)[0];
  if (!top || top.names.length < 2) return null;
  return top;
}
