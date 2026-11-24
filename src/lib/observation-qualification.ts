import type { Eligibility, PlantMatch } from './plant-match';

/*
 * WOULD THIS DISCOVERY QUALIFY? A MEASUREMENT, NOT A RULE.
 *
 * Stage 3 ("shadow mode") of docs/discovery-trust-design.md. Given what one scan produced,
 * this says whether a future scan-required rule WOULD have let it unlock a card. It is
 * called by nothing that changes behaviour: it grants nothing, denies nothing, stores
 * nothing and reads no clock. It imports neither the reducer nor progression, so it cannot
 * pay (pinned by observation-qualification.test.ts) — the same structural argument that
 * keeps the Seed Shelf from paying.
 *
 * Owner decisions encoded (2026-11-24):
 *   D1  only the Collect entry point is a candidate scan; a lookup never qualifies.
 *   D2  a confirmable match qualifies, with explicit confirmation where the answer is not a
 *       plain top-ranked exact or synonym — EXCEPT the provisional `legacyGenus`. Exact,
 *       synonym, genus-level and uncertain stay distinct. No score appears in the input, so
 *       no certainty threshold can be invented here.
 *   D3  one eligible scan per card is enough; a re-scan of a held card never qualifies again.
 *   D4  signed out never qualifies for an account collection (local progress is private).
 *
 * WHAT A "WOULD QUALIFY" MEANS: this account took part in Plantdex's capture flow and the
 * identifier named a taxon that maps to this card. It is NOT proof the plant was outdoors,
 * present or found, and a photograph of a screen is indistinguishable from a plant. The
 * product's word for it is "scan-recorded".
 */

export type CaptureChannel = 'collect' | 'lookup' | 'unspecified';
export type RankPosition = 'top' | 'listed';

/** Bases that may unlock a card. `legacyGenus` is deliberately absent: it is temporary. */
export const QUALIFYING_ELIGIBILITIES = [
  'exact',
  'synonym',
  'acceptedGroup',
  'curatedEquivalent',
  'genusCard',
] as const satisfies readonly Eligibility[];

export type QualificationReason =
  | 'qualifies'
  | 'lookup'
  | 'signedOut'
  | 'notConfirmable'
  | 'legacyGenusExcluded'
  | 'alreadyHeld';

export type MatchClass = 'exact' | 'synonym' | 'genusLevel' | 'curatedGroup' | 'uncertain' | 'other';

export interface QualificationInput {
  channel: CaptureChannel;
  signedIn: boolean;
  /** The match for the candidate the player CHOSE, never the leading one. */
  match: PlantMatch;
  /** Whether the chosen candidate was the identifier's leading answer. */
  rankPosition: RankPosition;
  /** The card is already in the account's collection (a re-scan). */
  alreadyHeld: boolean;
}

export interface QualificationVerdict {
  wouldQualify: boolean;
  reason: QualificationReason;
  matchClass: MatchClass;
  needsExplicitConfirmation: boolean;
}

function matchClassOf(match: PlantMatch, rankPosition: RankPosition): MatchClass {
  if (!match.confirmable) return 'other';
  if (rankPosition === 'listed') return 'uncertain';
  switch (match.eligibility) {
    case 'exact':
      return 'exact';
    case 'synonym':
      return 'synonym';
    case 'genusCard':
      return 'genusLevel';
    case 'acceptedGroup':
    case 'curatedEquivalent':
      return 'curatedGroup';
    default:
      return 'other';
  }
}

function qualifies(eligibility: Eligibility): boolean {
  return (QUALIFYING_ELIGIBILITIES as readonly Eligibility[]).includes(eligibility);
}

export function classifyQualification(input: QualificationInput): QualificationVerdict {
  const { match, rankPosition } = input;
  const matchClass = matchClassOf(match, rankPosition);
  const plain = matchClass === 'exact' || matchClass === 'synonym';
  const verdict = (wouldQualify: boolean, reason: QualificationReason): QualificationVerdict => ({
    wouldQualify,
    reason,
    matchClass,
    needsExplicitConfirmation: wouldQualify && !plain,
  });

  if (input.channel !== 'collect') return verdict(false, 'lookup');
  if (!input.signedIn) return verdict(false, 'signedOut');
  if (!match.confirmable || !match.herbId) return verdict(false, 'notConfirmable');
  if (match.eligibility === 'legacyGenus') return verdict(false, 'legacyGenusExcluded');
  if (!qualifies(match.eligibility)) return verdict(false, 'notConfirmable');
  if (input.alreadyHeld) return verdict(false, 'alreadyHeld');
  return verdict(true, 'qualifies');
}

export interface QualificationTally {
  total: number;
  wouldQualify: number;
  byReason: Partial<Record<QualificationReason, number>>;
  byMatchClass: Partial<Record<MatchClass, number>>;
}

/**
 * Aggregate counts only. The tally has no field that could hold a person, a card, a taxon, a
 * score or a photograph, so a diagnostic built from it cannot leak one.
 */
export function tallyQualifications(verdicts: readonly QualificationVerdict[]): QualificationTally {
  const tally: QualificationTally = { total: 0, wouldQualify: 0, byReason: {}, byMatchClass: {} };
  for (const v of verdicts) {
    tally.total += 1;
    if (v.wouldQualify) tally.wouldQualify += 1;
    tally.byReason[v.reason] = (tally.byReason[v.reason] ?? 0) + 1;
    tally.byMatchClass[v.matchClass] = (tally.byMatchClass[v.matchClass] ?? 0) + 1;
  }
  return tally;
}

/** Only the exact string `on` enables shadow measurement. Unset, malformed or anything else is off. */
export function qualificationShadowEnabled(raw: string | undefined): boolean {
  return raw === 'on';
}
