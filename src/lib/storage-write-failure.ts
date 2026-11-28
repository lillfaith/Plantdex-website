import {
  REASON_COLLECTION_LIMIT,
  REASON_NEEDS_CAPTURE,
  REASON_NEEDS_DISCOVERY,
} from './collection-refusal';

/**
 * Sorts a PostgREST write error into PERMANENT (the database will refuse this row every time,
 * so retrying is a loop) and TRANSIENT (network, 5xx, timeouts: try again on the next save).
 *
 * Anything not positively recognised as permanent is transient, which is the safe direction:
 * a dropped request must never discard a legitimate row.
 */
export interface WriteErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

export type WriteFailure =
  | { permanent: true; reason: string }
  | { permanent: false };

export function classifyWriteError(error: WriteErrorLike | null | undefined): WriteFailure {
  if (!error) return { permanent: false };
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`;
  if (text.includes(REASON_NEEDS_CAPTURE)) return { permanent: true, reason: REASON_NEEDS_CAPTURE };
  if (text.includes(REASON_NEEDS_DISCOVERY)) return { permanent: true, reason: REASON_NEEDS_DISCOVERY };
  if (text.includes(REASON_COLLECTION_LIMIT)) return { permanent: true, reason: REASON_COLLECTION_LIMIT };
  // insufficient_privilege: an RLS or trigger refusal. Never transient.
  if (error.code === '42501') return { permanent: true, reason: '42501' };
  return { permanent: false };
}
