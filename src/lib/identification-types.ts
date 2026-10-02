import type { TaxonRank } from './card-coverage';

/**
 * THE PROVIDER-NEUTRAL SHAPE OF AN IDENTIFICATION.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Everything downstream of identification reads this and never a provider's own JSON, so
 * adding or swapping a provider is a new normalizer rather than a change to the matcher, the
 * scan UI, the Seed Shelf or the reducer.
 *
 * WHAT IT DELIBERATELY DOES NOT CARRY: a card id, an eligibility, or a discovery. This is
 * what a PROVIDER said about a photograph. Whether any of it corresponds to a Plantdex card
 * is a separate question answered by `plant-match.ts`, against curated data — and keeping the
 * two apart is what stops a provider's confidence being read as permission to unlock.
 *
 * `rawProviderResult` is kept for the comparison work and for diagnosing a bad answer, and
 * it is the ONLY place a provider's own vocabulary survives.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Which provider produced an answer. Stored, so comparison data can be grouped by it. */
export type ProviderId = 'plantnet' | 'plantid';

/** One ranked candidate, normalised. */
export interface IdentificationCandidate {
  /**
   * The provider's own name string, UNTOUCHED — authorship, rank words and all.
   *
   * The historical record. `plant-match.ts` normalises a copy for lookup; this is never that
   * copy, because normalisation rules are free to change and would silently rewrite the past.
   */
  readonly scientificName: string;
  /** Vernacular names the provider supplied, in its order. Empty when it gave none. */
  readonly commonNames: readonly string[];
  /** 0–1. Semantics differ between providers — see `identification-confidence.ts`. */
  readonly probability: number;
  /** Rank the name claims, read from the name itself rather than assumed to be species. */
  readonly rank: TaxonRank;
  readonly genus: string | null;
  readonly family: string | null;
  /**
   * The provider's taxonomy block, PRESERVED AS OPAQUE METADATA.
   *
   * Deliberately not destructured into typed fields: only `genus` and `family` above are read
   * anywhere, and inventing a shape for the rest would be asserting a schema we have not
   * verified. Anything that needs more can read it here and say so.
   */
  readonly taxonomy: unknown;
  /** Present only where a provider supplies them. plant.id's documented details do not. */
  readonly gbifId: string | null;
  readonly powoId: string | null;
}

/** A successful identification. */
export interface NormalizedIdentification {
  readonly provider: ProviderId;
  /**
   * FALSE MEANS THE PROVIDER SAID THIS IS NOT A PLANT, and nothing may be matched or minted
   * from it. `null` means the provider does not answer that question — PlantNet has no
   * equivalent — which is NOT the same as "yes", and must not be treated as one.
   */
  readonly isPlant: boolean | null;
  /** Ranked, best first, as the provider ordered them. */
  readonly candidates: readonly IdentificationCandidate[];
  /** When this deployment received the answer. */
  readonly timestamp: string;
  readonly rawProviderResult?: unknown;
}

/**
 * A failure, as a VALUE rather than a thrown error.
 *
 * Every one of these is a different thing to tell somebody standing in front of a plant, and
 * a thrown `Error` flattens them into one. `schema` in particular must never be confused with
 * "no match": it means the provider answered in a shape we do not recognise, and the honest
 * response is to refuse rather than to guess at the fields.
 */
export type IdentificationFailureKind =
  | 'auth'
  | 'rateLimited'
  | 'timeout'
  | 'network'
  | 'schema'
  | 'unconfigured'
  | 'provider';

export interface IdentificationFailure {
  readonly provider: ProviderId;
  readonly kind: IdentificationFailureKind;
  /** Safe to show. Never contains a key, a token or a request body. */
  readonly message: string;
  /** Provider's HTTP status, where there was one. */
  readonly status?: number;
}

export type IdentificationResult = NormalizedIdentification | IdentificationFailure;

export function isIdentificationFailure(
  value: IdentificationResult,
): value is IdentificationFailure {
  return 'kind' in value;
}
