/**
 * What a refused collection write means to the player.
 *
 * Pure and dependency-free so the UI can import the strings without pulling in the adapter.
 * The server (migration 0016) refuses a `discoveries` row with no claimed capture receipt and
 * a `learned`/`mastered` row for a card with no discovery. The client applies changes
 * optimistically, so a refusal is surfaced as a rollback plus one of these kinds.
 *
 * Never offer a retry for `needs-capture`: nothing the player taps on the same screen can
 * make the row acceptable. Only scanning the plant with the in-app camera, signed in, can.
 */
export type RefusalKind = 'needs-capture' | 'needs-discovery' | 'other';

export const REFUSAL_COPY: Readonly<Record<RefusalKind, string>> = {
  'needs-capture':
    'This card can only be unlocked by scanning it with the in-app camera while signed in. Nothing was saved.',
  'needs-discovery':
    'This card has to be unlocked by scanning it with the in-app camera before it can be learned. Nothing was saved.',
  other: 'Your account could not accept this change. Nothing was saved.',
};

export interface CollectionRefusal {
  at: number;
  kind: RefusalKind;
  herbIds: string[];
}

/** Stable reason strings the adapter reports as `code`. */
export const REASON_NEEDS_CAPTURE = 'discovery_requires_capture_receipt';
export const REASON_NEEDS_DISCOVERY = 'discovery_required_first';
export const REASON_COLLECTION_LIMIT = 'collection_limit_reached';

export function refusalKind(table: string, code: string): RefusalKind {
  if (code === REASON_NEEDS_DISCOVERY) return 'needs-discovery';
  if (code === REASON_NEEDS_CAPTURE) return 'needs-capture';
  // A bare 42501 on discoveries is the receipt rule even if the message was not surfaced.
  if (table === 'discoveries' && code === '42501') return 'needs-capture';
  return 'other';
}
