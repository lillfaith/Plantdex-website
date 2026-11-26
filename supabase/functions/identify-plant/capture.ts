/**
 * THE EDGE HALF OF THE DISCOVERY RECEIPT CONTRACT (docs/discoveries/discovery-receipt-contract.md,
 * sections 3.2 and 3.3). Draft, TEST only, nothing enabled.
 *
 * ZERO IMPORTS, ON PURPOSE. Everything this module touches (the database, the hasher, the matcher's
 * verdicts) is handed to it, so the same file runs under Deno inside `identify-plant` and under
 * vitest against a fake or a throw-away local PostgreSQL. A second copy written for the tests would
 * be free to disagree with the one that deploys.
 *
 * WHAT THIS CAN AND CANNOT SAY. A receipt means: this account opened a server-issued, single-use
 * capture session, submitted two or three never-before-seen images through it, and the identifier
 * named a taxon that maps to this card. That is "captured in the app". It does not prove the plant
 * was outdoors, alive, present or photographed by this person, and nothing here says it does.
 *
 * WHAT IT NEVER DOES.
 *  - It never fails an identification. Every function here returns a value; none throws. A refused
 *    capture is a `code` on an otherwise normal response (contract section 3.2).
 *  - It reads no EXIF, no coordinates, no device identifier. The only thing taken from an image is
 *    a SHA-256 of the bytes the client already re-encoded (`prepareImage` strips metadata), and no
 *    pixel is decoded.
 *  - It uses no credential of its own. The caller passes in a database handle; the service role
 *    lives in `index.ts` and goes no further than this function's `rpc`.
 *  - It never runs for a request that did not say `purpose=collect`, so a request with no purpose
 *    and no session is handled by exactly the code it was before this file existed.
 */

export const CAPTURE_CODES = [
  'capture_not_signed_in',
  'capture_purpose_missing',
  'capture_session_unknown',
  'capture_session_nonce',
  'capture_session_expired',
  'capture_session_used',
  'capture_too_fast',
  'capture_images_invalid',
  'capture_duplicate_image',
  'capture_unavailable',
  'no_eligible_candidate',
] as const;
export type CaptureCode = (typeof CAPTURE_CODES)[number];

/** The five bases that may unlock a card. `legacyGenus` is deliberately absent (decision D2). */
export const RECEIPT_ELIGIBILITIES = [
  'exact',
  'synonym',
  'acceptedGroup',
  'curatedEquivalent',
  'genusCard',
] as const;

export type RankPosition = 'top' | 'listed';

/** The slice of the server's own match that a receipt is built from. Structural: no imports. */
export interface MatchLike {
  confirmable: boolean;
  herbId?: string;
  eligibility: string;
  observedTaxon?: { key: string; rank: string };
}

export interface CaptureCandidate {
  match: MatchLike;
  rankPosition: RankPosition;
  /** A band, never the raw score. */
  speciesConfidence: string;
}

/** One element of `issue_capture_receipts(p_items)`. snake_case: it is a database payload. */
export interface ReceiptItem {
  herb_id: string;
  observed_taxon_key: string;
  observed_taxon_rank: string;
  eligibility: string;
  rank_position: RankPosition;
  species_confidence: string;
}

/**
 * The candidates that earn a receipt, and nothing else. Behaviourally identical to
 * `receiptItemsFor` in `src/lib/observation-capture-receipt.ts`; `scan-capture-edge.test.ts` runs
 * both over the same inputs and fails if they ever disagree. `index` says which candidate an item
 * came from, so the response can attach the receipt to the right row.
 */
export function receiptItems(
  candidates: readonly CaptureCandidate[],
): Array<{ index: number; item: ReceiptItem }> {
  const seen = new Set<string>();
  const out: Array<{ index: number; item: ReceiptItem }> = [];
  candidates.forEach(({ match, rankPosition, speciesConfidence }, index) => {
    if (!match.confirmable || !match.herbId || !match.observedTaxon) return;
    if (!(RECEIPT_ELIGIBILITIES as readonly string[]).includes(match.eligibility)) return;
    if (seen.has(match.herbId)) return; // one receipt per card per observation
    seen.add(match.herbId);
    out.push({
      index,
      item: {
        herb_id: match.herbId,
        observed_taxon_key: match.observedTaxon.key,
        observed_taxon_rank: match.observedTaxon.rank,
        eligibility: match.eligibility,
        rank_position: rankPosition,
        species_confidence: speciesConfidence,
      },
    });
  });
  return out;
}

// ─── The request ────────────────────────────────────────────────────────────

export type CaptureIntent =
  | { mode: 'none' }
  | { mode: 'collect'; sessionId: string | null; nonce: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `purpose` absent or `lookup` means NO capture, whatever else was sent: only `collect` can produce
 * a receipt, and a request that never said so is served by the unchanged code path.
 */
export function parseCaptureIntent(form: { get(name: string): unknown }): CaptureIntent {
  const purpose = form.get('purpose');
  if (typeof purpose !== 'string' || purpose.trim() !== 'collect') return { mode: 'none' };
  const id = form.get('capture_session_id');
  const nonce = form.get('capture_nonce');
  return {
    mode: 'collect',
    sessionId: typeof id === 'string' && UUID.test(id.trim()) ? id.trim().toLowerCase() : null,
    nonce: typeof nonce === 'string' && /^[0-9a-f]{64}$/.test(nonce.trim()) ? nonce.trim() : null,
  };
}

/** Lower-case hex SHA-256 of an image part's bytes. No decode, no metadata read. */
export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── The database seam ──────────────────────────────────────────────────────

export interface RpcResult {
  data: unknown;
  error: { message?: string } | null;
}

export interface ReceiptRow {
  id: string;
  herbId: string;
  rankPosition: RankPosition;
  expiresAt: string;
}

export interface CaptureDeps {
  /** `admin.rpc` in the function; a fake or a psql adapter in tests. Service role only. */
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
  /** This account's receipts for one observation. Used for replay and for `expiresAt`. */
  receiptsFor(userId: string, observationId: string): PromiseLike<ReceiptRow[]>;
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

const REFUSAL_CODES = new Set<string>([
  'capture_session_unknown',
  'capture_session_nonce',
  'capture_session_expired',
  'capture_session_used',
  'capture_too_fast',
  'capture_images_invalid',
  'capture_duplicate_image',
]);

// ─── Step 1: before the provider ────────────────────────────────────────────

export type CaptureStart =
  | { kind: 'none' }
  | { kind: 'refused'; code: CaptureCode }
  | { kind: 'replay'; observationId: string; receipts: ReceiptRow[] }
  | { kind: 'accepted'; sessionId: string };

/**
 * Digests in, verdict out. Never throws: any failure to ask the database is `capture_unavailable`,
 * and identification carries on as an education lookup.
 */
export async function beginCapture(
  deps: CaptureDeps,
  input: { userId: string | null; intent: CaptureIntent; digests: string[]; observationId: string },
): Promise<CaptureStart> {
  const { intent } = input;
  if (intent.mode === 'none') return { kind: 'none' };
  if (!input.userId) return { kind: 'refused', code: 'capture_not_signed_in' };
  if (!intent.sessionId || !intent.nonce) return { kind: 'refused', code: 'capture_purpose_missing' };

  let result: RpcResult;
  try {
    result = await deps.rpc('consume_capture_session', {
      p_user: input.userId,
      p_session: intent.sessionId,
      p_nonce: intent.nonce,
      p_observation_id: input.observationId,
      p_image_digests: input.digests,
    });
  } catch {
    return { kind: 'refused', code: 'capture_unavailable' };
  }
  // A database that has not run 0016 answers "function not found": the capture is simply unavailable.
  if (result.error || !isObject(result.data)) return { kind: 'refused', code: 'capture_unavailable' };

  const data = result.data;
  if (data.ok === true) {
    if (data.replay === true) {
      const observationId = typeof data.observation_id === 'string' ? data.observation_id : '';
      let receipts: ReceiptRow[] = [];
      try {
        receipts = observationId ? [...(await deps.receiptsFor(input.userId, observationId))] : [];
      } catch {
        receipts = [];
      }
      return { kind: 'replay', observationId, receipts };
    }
    return { kind: 'accepted', sessionId: intent.sessionId };
  }
  const code = typeof data.code === 'string' ? data.code : '';
  return { kind: 'refused', code: REFUSAL_CODES.has(code) ? (code as CaptureCode) : 'capture_unavailable' };
}

// ─── Step 2: after the provider and the matcher ─────────────────────────────

export interface IssuedReceipt {
  /** Index into the candidate list the receipt belongs to. */
  index: number;
  id: string;
  rankPosition: RankPosition;
  expiresAt: string;
}

export interface CaptureFinish {
  receipts: IssuedReceipt[];
  code?: 'no_eligible_candidate' | 'capture_unavailable';
}

/** Issues one receipt per eligible candidate. Never throws; a failure is a code and no receipt. */
export async function finishCapture(
  deps: CaptureDeps,
  input: { userId: string; sessionId: string; observationId: string; candidates: readonly CaptureCandidate[] },
): Promise<CaptureFinish> {
  const eligible = receiptItems(input.candidates);
  if (eligible.length === 0) return { receipts: [], code: 'no_eligible_candidate' };
  try {
    const issued = await deps.rpc('issue_capture_receipts', {
      p_user: input.userId,
      p_session: input.sessionId,
      p_items: eligible.map((e) => e.item),
    });
    if (issued.error || !Array.isArray(issued.data)) return { receipts: [], code: 'capture_unavailable' };
    const byHerb = new Map<string, string>();
    for (const row of issued.data) {
      if (isObject(row) && typeof row.id === 'string' && typeof row.herb_id === 'string') {
        byHerb.set(row.herb_id, row.id);
      }
    }
    // The table is the source of truth for `expires_at`; the function's own answer omits it.
    let stored: ReceiptRow[] = [];
    try {
      stored = [...(await deps.receiptsFor(input.userId, input.observationId))];
    } catch {
      stored = [];
    }
    const expiry = new Map(stored.map((r) => [r.id, r.expiresAt]));
    const receipts: IssuedReceipt[] = [];
    for (const { index, item } of eligible) {
      const id = byHerb.get(item.herb_id);
      const expiresAt = id ? expiry.get(id) : undefined;
      // A receipt whose expiry cannot be read is not shown: the client requires the field.
      if (id && expiresAt) receipts.push({ index, id, rankPosition: item.rank_position, expiresAt });
    }
    return receipts.length > 0 ? { receipts } : { receipts: [], code: 'capture_unavailable' };
  } catch {
    return { receipts: [], code: 'capture_unavailable' };
  }
}

// ─── The response additions (contract 3.3) ──────────────────────────────────

export interface CaptureBlock {
  accepted: boolean;
  code?: CaptureCode;
  replay?: boolean;
  receipts?: Array<{ id: string; herbId: string; rankPosition: RankPosition }>;
  minCaptureMs?: number;
}

export function refusedBlock(code: CaptureCode): CaptureBlock {
  return { accepted: false, code };
}

export function replayBlock(receipts: readonly ReceiptRow[]): CaptureBlock {
  return {
    accepted: true,
    replay: true,
    receipts: receipts.map((r) => ({ id: r.id, herbId: r.herbId, rankPosition: r.rankPosition })),
  };
}

export function acceptedBlock(finish: CaptureFinish): CaptureBlock {
  return finish.code ? { accepted: true, code: finish.code } : { accepted: true };
}

/**
 * Attaches `captureReceipt` to the candidates that earned one. Everything else on each candidate is
 * left exactly as it was; candidates without a receipt come back as the same object.
 */
export function withReceipts<T extends object>(
  candidates: readonly T[],
  receipts: readonly IssuedReceipt[],
): Array<T | (T & { captureReceipt: { id: string; rankPosition: RankPosition; expiresAt: string } })> {
  const byIndex = new Map(receipts.map((r) => [r.index, r]));
  return candidates.map((candidate, index) => {
    const r = byIndex.get(index);
    return r
      ? { ...candidate, captureReceipt: { id: r.id, rankPosition: r.rankPosition, expiresAt: r.expiresAt } }
      : candidate;
  });
}
