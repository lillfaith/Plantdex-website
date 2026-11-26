/**
 * What the confirm tap does with a scan receipt. Pure decision logic; the network half is
 * `scan-capture-session.ts`.
 *
 * STATUS: coded to the DRAFT contract in docs/discoveries/discovery-receipt-contract.md. Nothing
 * on the server is enabled. Where the server functions do not exist (`not-deployed`) the preview
 * falls back to the camera-channel rule on this device and SAYS SO ("MOCK"), so a receipt that
 * was never issued can never be presented as one.
 *
 * Words: a card unlocked this way was "captured in the app". Never verified, never found outdoors.
 */
import type { ObservationChannel } from './scan-flow';
import type { CandidateReceipt, ClaimResult, RulesResult } from './scan-capture-session';

export type ConfirmKind = 'claimed' | 'held' | 'local-only' | 'mock' | 'blocked' | 'unrestricted';

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
  rules: RulesResult | null;
}

const CLAIM_BLOCK: Record<string, string> = {
  receipt_unknown: 'That scan could not be matched to a receipt, so it cannot unlock a new card. Take new photos with the camera.',
  receipt_expired: 'That scan\u2019s receipt has expired, so it cannot unlock a new card. Take new photos with the camera.',
  receipt_ineligible: 'That scan is not eligible to unlock this card.',
  not_signed_in: 'Sign in to unlock a new card from a scan.',
  network: 'Could not reach the server to record this scan. Nothing was unlocked; try again.',
};

/** True when a claim is worth attempting at all. */
export function shouldClaim(input: Pick<ConfirmInput, 'channel' | 'signedIn' | 'wasHeld' | 'receipt'>): boolean {
  return input.channel === 'collect' && input.signedIn && !input.wasHeld && !!input.receipt;
}

/** True when the rules are worth fetching: a collect with no receipt to claim. */
export function shouldFetchRules(input: Pick<ConfirmInput, 'channel' | 'signedIn' | 'wasHeld' | 'receipt'>): boolean {
  return input.channel === 'collect' && input.signedIn && !input.wasHeld && !input.receipt;
}

export function decideConfirm(input: ConfirmInput): ConfirmDecision {
  // A held card is never blocked and never re-awarded: `discover()` is idempotent (grandfathered).
  if (input.wasHeld) return { allow: true, kind: 'held', line: null };
  if (input.channel === 'unspecified') return { allow: true, kind: 'unrestricted', line: null };
  if (input.channel === 'lookup') {
    return { allow: false, kind: 'blocked', line: 'Identification only. A scan with a library photo cannot unlock a new card.' };
  }
  if (!input.signedIn) {
    return {
      allow: true,
      kind: 'local-only',
      line: 'Signed out: this find is saved on this device only, with no scan receipt. Sign in to have future scans recorded.',
    };
  }
  if (input.receipt) {
    const claim = input.claim;
    if (claim?.ok) return { allow: true, kind: 'claimed', line: 'Captured in the app. Your scan receipt was recorded.' };
    if (claim && claim.code === 'not-deployed') return mock();
    const code = claim && !claim.ok ? claim.code : 'network';
    return { allow: false, kind: 'blocked', line: CLAIM_BLOCK[code] ?? CLAIM_BLOCK.network! };
  }
  // Camera observation, signed in, no receipt from the server.
  const rules = input.rules;
  if (rules?.kind === 'not-deployed' || (rules?.kind === 'known' && !rules.enforcing)) return mock();
  return {
    allow: false,
    kind: 'blocked',
    line: 'This scan was not recorded for collecting, so it cannot unlock a new card yet. Take new photos with the camera and try again.',
  };
}

function mock(): ConfirmDecision {
  return {
    allow: true,
    kind: 'mock',
    line: 'Scan receipt: MOCK. The server did not issue a receipt for this preview, so this unlock rests on the camera rule on this device only.',
  };
}
