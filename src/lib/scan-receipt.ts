/**
 * What the confirm tap does with a scan receipt. Pure decision logic; the network half is
 * `scan-capture-session.ts`.
 *
 * OWNER DECISION (security): a NEW card unlocks only from the in-app camera, signed in, with a
 * server-issued receipt for the CHOSEN candidate that `claim_discovery` accepted. Nothing else
 * unlocks one: not a library photo, not a signed-out scan, not a scan with the camera feature
 * off, and not a camera scan the server did not receipt (including where the functions are not
 * deployed or rules are not enforcing). There is no local fallback and no mock: the database
 * trigger is the real gate, and the client must not offer or create what it forbids.
 * A card already held stays allowed and idempotent (grandfathered).
 *
 * Words: a card unlocked this way was "captured in the app". Never verified, never found outdoors.
 */
import type { ObservationChannel } from './scan-flow';
import type { CandidateReceipt, ClaimResult } from './scan-capture-session';

export type ConfirmKind = 'claimed' | 'held' | 'blocked';

export interface ConfirmDecision {
  /** May the caller go on to the ordinary idempotent `discover()`? */
  allow: boolean;
  kind: ConfirmKind;
  line: string | null;
}

export interface ConfirmInput {
  channel: ObservationChannel;
  signedIn: boolean;
  wasHeld: boolean;
  /** The chosen candidate's receipt from the identify response, when the server issued one. */
  receipt: CandidateReceipt | undefined;
  /** Result of `claim_discovery`, or null when no claim was attempted. */
  claim: ClaimResult | null;
}

export const LINE_LOOKUP =
  'Identification only. A scan with a library photo cannot unlock a new card.';
export const LINE_CAMERA_OFF =
  'Identification only. Collecting a card needs the in-app camera, which is not available here, so this scan cannot unlock a new card.';
export const LINE_SIGNED_OUT =
  'Sign in to collect this card. Scanning and identifying work without an account, but collecting a card needs an account and photos taken with the in-app camera.';
export const LINE_NO_RECEIPT =
  'This scan was not recorded for collecting, so it cannot unlock a new card. Take new photos with the camera and try again.';

const CLAIM_BLOCK: Record<string, string> = {
  receipt_unknown: 'That scan could not be matched to a receipt, so it cannot unlock a new card. Take new photos with the camera.',
  receipt_expired: 'That scan\u2019s receipt has expired, so it cannot unlock a new card. Take new photos with the camera.',
  receipt_ineligible: 'That scan is not eligible to unlock this card.',
  not_signed_in: 'Sign in to unlock a new card from a scan.',
  'not-deployed': LINE_NO_RECEIPT,
  network: 'Could not reach the server to record this scan. Nothing was unlocked; try again.',
};

/** True when a claim is worth attempting at all. */
export function shouldClaim(input: Pick<ConfirmInput, 'channel' | 'signedIn' | 'wasHeld' | 'receipt'>): boolean {
  return input.channel === 'collect' && input.signedIn && !input.wasHeld && !!input.receipt;
}

function blocked(line: string): ConfirmDecision {
  return { allow: false, kind: 'blocked', line };
}

export function decideConfirm(input: ConfirmInput): ConfirmDecision {
  // A held card is never blocked and never re-awarded: `discover()` is idempotent (grandfathered).
  if (input.wasHeld) return { allow: true, kind: 'held', line: null };
  if (input.channel === 'lookup') return blocked(LINE_LOOKUP);
  if (input.channel === 'unspecified') return blocked(LINE_CAMERA_OFF);
  if (!input.signedIn) return blocked(LINE_SIGNED_OUT);
  if (!input.receipt) return blocked(LINE_NO_RECEIPT);
  const claim = input.claim;
  if (claim?.ok) return { allow: true, kind: 'claimed', line: 'Captured in the app. Your scan receipt was recorded.' };
  const code = claim && !claim.ok ? claim.code : 'network';
  return blocked(CLAIM_BLOCK[code] ?? CLAIM_BLOCK.network!);
}
