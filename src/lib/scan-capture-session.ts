/**
 * The network half of the discovery receipt contract (docs/discoveries/discovery-receipt-contract.md,
 * lane: discoveries, branch agent/discoveries/d5-server-eligibility). Three Supabase RPCs and
 * nothing else; it stores nothing and reads no clock.
 *
 * CODED TO A DRAFT. The contract's migration (0016) is TEST-only and nothing is enabled. A database
 * that has not run it answers PGRST202 / 42883 ("function not found"), which this module reports as
 * `not-deployed`, never as an error and never as permission. The client treats the server as the
 * authority whenever it answers, and as ABSENT (labelled MOCK on screen) when it does not exist.
 *
 * The session nonce is a bearer secret: held in memory by the caller, never logged, never stored.
 */
import { supabase } from './supabase-client';
import { isCameraCaptureEnabled } from './scan-capture';

export interface CaptureSession {
  readonly sessionId: string;
  readonly nonce: string;
  readonly minCaptureMs: number;
  /** Local monotonic reading, only to decide when the 2 s minimum has certainly passed. */
  readonly openedAtMs: number;
}

export type OpenSessionResult =
  | { ok: true; session: CaptureSession }
  | { ok: false; code: 'not_signed_in' | 'too_many_open_sessions' | 'daily_session_limit' | 'not-deployed' | 'network' };

export interface CandidateReceipt {
  readonly id: string;
  readonly rankPosition: 'top' | 'listed';
  readonly expiresAt: string;
}

export type ClaimResult =
  | { ok: true; status: 'claimed' | 'already_claimed' | 'already_held' }
  | { ok: false; code: 'not_signed_in' | 'receipt_unknown' | 'receipt_expired' | 'receipt_ineligible' | 'not-deployed' | 'network' };

export type RulesResult = { kind: 'known'; enforcing: boolean } | { kind: 'not-deployed' } | { kind: 'unknown' };

function missingFunction(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST202' || error?.code === '42883';
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

export async function openCaptureSession(): Promise<OpenSessionResult> {
  if (!isCameraCaptureEnabled() || !supabase) return { ok: false, code: 'not-deployed' };
  try {
    const { data, error } = await supabase.rpc('open_capture_session');
    if (error) return { ok: false, code: missingFunction(error) ? 'not-deployed' : 'network' };
    if (!isObject(data)) return { ok: false, code: 'network' };
    if (data.ok === true && typeof data.session_id === 'string' && typeof data.nonce === 'string') {
      return {
        ok: true,
        session: {
          sessionId: data.session_id,
          nonce: data.nonce,
          minCaptureMs: typeof data.min_capture_ms === 'number' ? data.min_capture_ms : 0,
          openedAtMs: Date.now(),
        },
      };
    }
    const code = data.code;
    if (code === 'not_signed_in' || code === 'too_many_open_sessions' || code === 'daily_session_limit') {
      return { ok: false, code };
    }
    return { ok: false, code: 'network' };
  } catch {
    return { ok: false, code: 'network' };
  }
}

export async function claimDiscovery(receiptId: string): Promise<ClaimResult> {
  if (!isCameraCaptureEnabled() || !supabase) return { ok: false, code: 'not-deployed' };
  try {
    const { data, error } = await supabase.rpc('claim_discovery', { p_receipt_id: receiptId });
    if (error) return { ok: false, code: missingFunction(error) ? 'not-deployed' : 'network' };
    if (!isObject(data)) return { ok: false, code: 'network' };
    if (data.ok === true) {
      const s = data.status;
      if (s === 'claimed' || s === 'already_claimed' || s === 'already_held') return { ok: true, status: s };
      return { ok: false, code: 'network' };
    }
    const code = data.code;
    if (code === 'not_signed_in' || code === 'receipt_unknown' || code === 'receipt_expired' || code === 'receipt_ineligible') {
      return { ok: false, code };
    }
    return { ok: false, code: 'network' };
  } catch {
    return { ok: false, code: 'network' };
  }
}

/** For wording and routing only, never authorisation: the database decides regardless. */
export async function fetchDiscoveryRules(): Promise<RulesResult> {
  if (!isCameraCaptureEnabled() || !supabase) return { kind: 'not-deployed' };
  try {
    const { data, error } = await supabase.rpc('discovery_rules');
    if (error) return missingFunction(error) ? { kind: 'not-deployed' } : { kind: 'unknown' };
    if (isObject(data) && typeof data.enforcing === 'boolean') return { kind: 'known', enforcing: data.enforcing };
    return { kind: 'unknown' };
  } catch {
    return { kind: 'unknown' };
  }
}
