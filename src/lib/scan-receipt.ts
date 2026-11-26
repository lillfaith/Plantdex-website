/**
 * The client side of the discovery receipt, behind a narrow interface.
 *
 * STATUS: MOCK. The Discoveries lane's contract (docs/agent-workflow/discovery-receipt-contract.md)
 * had not been published on origin when this was written. Everything real - the signed token,
 * the `scan_receipts` table, server acceptance - is theirs and the coordinator's. This file is
 * the seam: `ReceiptClient` is what the confirm step calls, and `mockReceiptClient` is the only
 * implementation. Swapping in the real one is a change to `getReceiptClient()` and nothing else.
 *
 * The mock records NOTHING (no storage, no network), never produces a token, and its outcome
 * says `mock: true` so no caller can mistake it for a server record. It never gates a card:
 * the collect rule that is live in this preview is the channel rule in `scan-flow.ts`.
 */
import { isCameraCaptureEnabled } from './scan-capture';
import { classifyQualification, type QualificationReason } from './observation-qualification';
import type { PlantMatch } from './plant-match';
import type { ObservationChannel } from './scan-flow';

export interface ReceiptRequest {
  channel: ObservationChannel;
  signedIn: boolean;
  /** The chosen candidate's match, never the leading one. */
  match: PlantMatch;
  rankPosition: 'top' | 'listed';
  /** The card was already held before this confirm. */
  alreadyHeld: boolean;
}

export type ReceiptOutcome =
  /** Real, signed, server-issued. Not produced by anything in this branch. */
  | { status: 'issued'; token: string }
  /** MOCK. Records nothing; says what a real receipt would have been asked for. */
  | { status: 'mock'; mock: true }
  /** A receipt does not apply, and why. Never an error: the card is unaffected. */
  | { status: 'not-applicable'; reason: QualificationReason }
  | { status: 'unavailable'; reason: 'flag-off' | 'contract-pending' };

export interface ReceiptClient {
  issue(request: ReceiptRequest): Promise<ReceiptOutcome>;
}

export const mockReceiptClient: ReceiptClient = {
  async issue(request) {
    const verdict = classifyQualification({
      channel: request.channel === 'collect' ? 'collect' : request.channel === 'lookup' ? 'lookup' : 'unspecified',
      signedIn: request.signedIn,
      match: request.match,
      rankPosition: request.rankPosition,
      alreadyHeld: request.alreadyHeld,
    });
    if (!verdict.wouldQualify) return { status: 'not-applicable', reason: verdict.reason };
    return { status: 'mock', mock: true };
  },
};

const offClient: ReceiptClient = {
  async issue() {
    return { status: 'unavailable', reason: 'flag-off' };
  },
};

export function getReceiptClient(): ReceiptClient {
  return isCameraCaptureEnabled() ? mockReceiptClient : offClient;
}

/** Plain-language line for the outcome panel. Never says verified, never says where. */
export function receiptLine(outcome: ReceiptOutcome): string | null {
  switch (outcome.status) {
    case 'mock':
      return 'Scan receipt: MOCK. This preview does not record a receipt on a server, and nothing was unlocked by it.';
    case 'issued':
      return 'Scan receipt recorded for this find.';
    case 'not-applicable':
      switch (outcome.reason) {
        case 'signedOut':
          return 'Signed out: this find is saved on this device only, with no scan receipt. Sign in to have future scans recorded.';
        case 'alreadyHeld':
          return 'You already held this card, so nothing new was recorded.';
        default:
          return null;
      }
    case 'unavailable':
      return null;
  }
}
