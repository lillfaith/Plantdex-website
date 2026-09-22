import { confidenceBand, type SpeciesConfidence } from './plant-match';
import type { ProviderId } from './identification-types';
import type { TaxonRank } from './card-coverage';

/**
 * How a probability becomes a confidence band — PER PROVIDER, because the number means
 * different things.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PlantNet's thresholds are the ones already in `confidenceBand` (0.70 / 0.35), unchanged and
 * re-exported rather than restated, because they are tuned against real scans and this work
 * has no business moving them.
 *
 * plant.id gets its OWN constants, starting at the same values, for one reason: we have no
 * field data for it yet. Copying PlantNet's numbers and calling them tuned would be the kind
 * of borrowed certainty this repo keeps finding in its own comments. They are overridable so
 * the owner can move them from real comparisons without a deploy of new logic.
 *
 * RANK IS CHECKED BEFORE THE NUMBER, ALWAYS. A supra-specific answer is `unresolved` at any
 * probability: a provider can be entirely certain it is looking at a section and still have
 * said nothing about which species within it. That rule lives in `speciesConfidenceFor` and
 * is reused here rather than reimplemented.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ConfidenceThresholds {
  /** At or above: `high`. */
  readonly high: number;
  /** At or above: `moderate`. Below: `low`. */
  readonly moderate: number;
}

/** PlantNet's live-tuned values, matching `confidenceBand`. */
export const PLANTNET_THRESHOLDS: ConfidenceThresholds = { high: 0.7, moderate: 0.35 };

/**
 * plant.id's starting values. UNTUNED — identical numbers, different justification, and the
 * comment is the difference. Revisit from comparison data before trusting them.
 */
export const PLANT_ID_THRESHOLDS: ConfidenceThresholds = { high: 0.7, moderate: 0.35 };

const BY_PROVIDER: Record<ProviderId, ConfidenceThresholds> = {
  plantnet: PLANTNET_THRESHOLDS,
  plantid: PLANT_ID_THRESHOLDS,
};

export function thresholdsFor(provider: ProviderId): ConfidenceThresholds {
  return BY_PROVIDER[provider];
}

/**
 * The species-level confidence for one candidate.
 *
 * Rank first: above species, `unresolved`, whatever the score. Then the provider's own band.
 */
export function speciesConfidenceForProvider(
  provider: ProviderId,
  rank: TaxonRank,
  probability: number,
): SpeciesConfidence {
  if (rank !== 'species') return 'unresolved';
  const { high, moderate } = thresholdsFor(provider);
  if (probability >= high) return 'high';
  if (probability >= moderate) return 'moderate';
  return 'low';
}

/**
 * PlantNet's band, for the places that already render one.
 *
 * Kept as a thin pass-through so `confidenceBand` stays the single definition of those
 * thresholds and the scan UI cannot drift from the ledger.
 */
export { confidenceBand };
