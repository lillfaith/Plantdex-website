import type { Eligibility, PlantMatch, SpeciesConfidence } from './plant-match.ts';
import type { RankPosition } from './observation-qualification.ts';
import { QUALIFYING_ELIGIBILITIES } from './observation-qualification.ts';

/*
 * THE CLIENT-SIDE MIRROR OF THE SERVER'S CAPTURE-RECEIPT CONTRACT.
 *
 * `docs/discoveries/discovery-receipt-contract.md` is the contract; migration 0016 (a draft, TEST only,
 * `docs/discoveries/sql/`) is the AUTHORITY. This module is what the Scan lane and the edge function
 * share so neither has to restate a constant or an error string. It decides nothing about who may
 * unlock a card, and could not if it tried: the database refuses a direct insert when enforcement
 * is on, whatever any client believes. `observation-capture-receipt.test.ts` reads the SQL and the
 * contract back and fails if any number, enumeration or code here drifts from them.
 *
 * It imports neither the reducer nor progression, so it structurally cannot pay (the same argument
 * that keeps the Seed Shelf and the qualification classifier from paying), and it reads no clock and
 * no randomness.
 *
 * WHAT A RECEIPT MEANS, SAID ONCE. The account opened a server-issued capture session, submitted one
 * to three images through it (one is enough; extra angles are optional), and the identifier named a taxon that maps to this
 * card. That is "captured in the app". It is not proof the plant was outdoors, alive, present or
 * photographed by this person, and no word in this module may say it is.
 */

/** Mirrors `public.capture_config()` in 0016. */
export const CAPTURE_CONFIG = {
  ttlSeconds: 600,
  minCaptureMs: 0, // owner decision 2026-11-26: no mandatory capture delay (the rule stays configurable)
  receiptTtlDays: 30,
  maxOpenSessions: 3,
  maxSessionsPerDay: 60,
  minImages: 1, // owner decision 2026-11-26: one in-app photograph is mandatory; extra angles are optional
  maxImages: 3,
} as const;

/** `identify-plant` capture outcomes. Stable strings: a client switches on these, never on prose. */
export const CAPTURE_CODES = [
  'capture_not_signed_in',
  'capture_purpose_missing',
  'capture_session_unknown',
  'capture_session_nonce',
  'capture_session_expired',
  'capture_session_used',
  'capture_too_fast',
  'capture_images_invalid',
  'capture_unavailable',
  'no_eligible_candidate',
] as const;
export type CaptureCode = (typeof CAPTURE_CODES)[number];

/** `open_capture_session` failures. */
export const SESSION_CODES = ['not_signed_in', 'too_many_open_sessions', 'daily_session_limit'] as const;
export type SessionCode = (typeof SESSION_CODES)[number];

/** `claim_discovery` failures. `collection_limit_reached` is 0008's free-tier limit, surfaced. */
export const CLAIM_CODES = [
  'not_signed_in',
  'receipt_unknown',
  'receipt_expired',
  'receipt_ineligible',
  'collection_limit_reached',
] as const;
export type ClaimCode = (typeof CLAIM_CODES)[number];

/** What `claim_discovery` reports on success. */
export const CLAIM_STATUSES = ['claimed', 'already_claimed', 'already_held'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/** The error a refused direct write raises (SQLSTATE 42501). Matched by message, never by wording. */
export const DIRECT_WRITE_REFUSALS = {
  discovery: 'discovery_requires_capture_receipt',
  progress: 'discovery_required_first',
} as const;

/** The bases a receipt may be issued for. One list with the matcher's qualification set (D2). */
export const RECEIPT_ELIGIBILITIES = QUALIFYING_ELIGIBILITIES;

export function isReceiptEligibility(value: string): value is (typeof RECEIPT_ELIGIBILITIES)[number] {
  return (RECEIPT_ELIGIBILITIES as readonly string[]).includes(value);
}

/** One element of `issue_capture_receipts(p_items)`. snake_case because it is a database payload. */
export interface ReceiptItem {
  herb_id: string;
  observed_taxon_key: string;
  observed_taxon_rank: NonNullable<PlantMatch['observedTaxon']>['rank'];
  eligibility: Eligibility;
  rank_position: RankPosition;
  species_confidence: SpeciesConfidence;
}

export interface CaptureCandidate {
  match: PlantMatch;
  rankPosition: RankPosition;
  speciesConfidence: SpeciesConfidence;
}

/**
 * The candidates that earn a receipt, and nothing else.
 *
 * Re-derived from the SERVER'S own match for each candidate; nothing in it comes from the client. A
 * candidate qualifies only when it is `confirmable` for a card AND its basis is one of the five
 * allowed. `legacyGenus` (a temporary compatibility state), `ambiguous`, `related` and `none` never
 * do, and `sameGenus` is a relative rather than this plant. Card membership never promotes a
 * candidate: a listed (non-leading) candidate qualifies on its own match, and the receipt records
 * `listed` so it stays distinguishable from a leading answer.
 */
export function receiptItemsFor(candidates: readonly CaptureCandidate[]): ReceiptItem[] {
  const seen = new Set<string>();
  const items: ReceiptItem[] = [];
  for (const { match, rankPosition, speciesConfidence } of candidates) {
    if (!match.confirmable || !match.herbId || !match.observedTaxon) continue;
    if (!isReceiptEligibility(match.eligibility)) continue;
    if (seen.has(match.herbId)) continue; // one receipt per card per observation (the table is unique on it)
    seen.add(match.herbId);
    items.push({
      herb_id: match.herbId,
      observed_taxon_key: match.observedTaxon.key,
      observed_taxon_rank: match.observedTaxon.rank,
      eligibility: match.eligibility,
      rank_position: rankPosition,
      species_confidence: speciesConfidence,
    });
  }
  return items;
}

/** The ways a new card might be asked for. Only a camera capture can unlock one once enforcement is on. */
export type UnlockChannel = 'camera' | 'manualDiscover' | 'importedProgress' | 'journal' | 'seedShelfClaim' | 'lookup';

export type UnlockRoute = 'claimReceipt' | 'sendToCamera' | 'recordAsToday' | 'noUnlock';

/**
 * WORDING AND ROUTING ONLY. This is what a screen does with `discovery_rules().enforcing`; it is not a
 * gate and it grants nothing. With `enforcing` true the DATABASE refuses every channel but a claimed
 * receipt whatever a client does; with it false nothing changes. An unknown answer (the call failed) is
 * treated as enforcing, so the worst a wrong guess costs is a trip to the camera.
 *
 * A lookup and a journal entry never unlock a card in either state: they are education and the
 * player's own record, and say so.
 */
export function routeNewCard(channel: UnlockChannel, enforcing: boolean | undefined): UnlockRoute {
  if (channel === 'camera') return 'claimReceipt';
  if (channel === 'lookup' || channel === 'journal') return 'noUnlock';
  return enforcing === false ? 'recordAsToday' : 'sendToCamera';
}

/**
 * The only words a capture may be described with. "Captured in the app" says what happened; it does
 * not say where the plant was. `CAPTURE_WORDS_FORBIDDEN` lists what no screen, string or contract
 * sentence may claim, and the test sweeps this module and the contract for them.
 */
export const CAPTURE_WORDS = {
  recorded: 'Captured in the app',
  scanRecorded: 'Scan-recorded',
  notProof:
    'A capture records that you scanned in the app. It does not prove where the plant was, and it does not say the plant is safe to use.',
} as const;

export const CAPTURE_WORDS_FORBIDDEN = [
  'verified outdoors',
  'verified in the wild',
  'proven outdoors',
  'found in the wild',
  'confirmed outdoors',
  'verified sighting',
] as const;
