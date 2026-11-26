/**
 * THE EDGE HALF OF THE DISCOVERY RECEIPT CONTRACT (docs/discoveries/discovery-receipt-contract.md,
 * sections 3.2 and 3.3), kept out of `index.ts` so it can be executed by vitest and by the local
 * PostgreSQL end-to-end run, neither of which can start a Deno server.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT A RECEIPT MEANS, SAID ONCE. The account opened a server-issued capture session, submitted two
 * or three never-before-seen images through it, and the identifier named a taxon that maps to a card.
 * That is "captured in the app". It is NOT proof the plant was outdoors, alive, present, or
 * photographed by this person, and nothing here may say it is.
 *
 * WHAT THIS MODULE MAY NEVER DO.
 *   - Fail an identification. Every capture step is swallowed into a `capture.code`.
 *   - Read or store EXIF, coordinates or any device identifier. The only thing taken from an image is
 *     the SHA-256 of the bytes the client already re-encoded (`prepareImage` strips metadata); no
 *     image is decoded, parsed or kept here.
 *   - Hold a credential. It is handed a `CapturePort`; `index.ts` builds that port from the
 *     service-role client, which therefore never leaves the function.
 *   - Issue a receipt for a lookup, an anonymous call, a failed capture, or anything the matcher did
 *     not itself call `confirmable` on this server.
 *
 * `receiptItemsFor` below is a LOCAL COPY of `src/lib/observation-capture-receipt.ts`. The real one
 * cannot be imported until the coordinator adds it (and `observation-qualification.ts`) to
 * `PURE_MODULES` — see agents/requests/scan-s6-sync-capture-modules.md. Until then
 * `src/lib/scan-edge-receipts.test.ts` runs both over the whole catalogue and fails on any
 * difference, so the copy cannot drift quietly.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import {
  matchScientificName,
  speciesConfidenceFor,
  type Eligibility,
  type PlantMatch,
  type SpeciesConfidence,
} from '../_shared/herbdex/plant-match.ts';

/** Stable strings a client switches on (contract section 5). */
export type CaptureCode =
  | 'capture_not_signed_in'
  | 'capture_purpose_missing'
  | 'capture_session_unknown'
  | 'capture_session_nonce'
  | 'capture_session_expired'
  | 'capture_session_used'
  | 'capture_too_fast'
  | 'capture_images_invalid'
  | 'capture_unavailable'
  | 'no_eligible_candidate';

const KNOWN_CODES: ReadonlySet<string> = new Set<CaptureCode>([
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
]);

/** Mirrors `capture_config()`; used only to compute an expiry when the database cannot be re-read. */
export const RECEIPT_TTL_DAYS = 30;
export const MIN_CAPTURE_MS = 0; // owner decision 2026-11-26: no mandatory capture delay (mirrors 0016's min_capture_ms)

export type RankPosition = 'top' | 'listed';

// ── The request ──────────────────────────────────────────────────────────────

export interface CaptureAsk {
  readonly sessionId: string;
  readonly nonce: string;
  /** False when `purpose=collect` arrived without a usable session or nonce. */
  readonly complete: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NONCE = /^[0-9a-f]{64}$/;

/**
 * Only an explicit `purpose=collect` asks for a capture. Absent, `lookup` or anything else is a
 * lookup: `null` here means "behave exactly as before this module existed".
 */
export function readCaptureAsk(form: FormData): CaptureAsk | null {
  const purpose = form.get('purpose');
  if (typeof purpose !== 'string' || purpose.trim() !== 'collect') return null;
  const id = form.get('capture_session_id');
  const nonce = form.get('capture_nonce');
  const sessionId = typeof id === 'string' ? id.trim() : '';
  const secret = typeof nonce === 'string' ? nonce.trim() : '';
  return { sessionId, nonce: secret, complete: UUID.test(sessionId) && NONCE.test(secret) };
}

const hex = (bytes: ArrayBuffer): string =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** SHA-256 of each received part, in request order. Nothing is decoded; the bytes are only hashed. */
export async function imageDigests(files: readonly Blob[]): Promise<string[]> {
  return Promise.all(
    files.map(async (file) => hex(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()))),
  );
}

// ── The database port ────────────────────────────────────────────────────────

export interface ConsumeAnswer {
  ok: boolean;
  replay?: boolean;
  code?: string;
  observationId?: string;
}
export interface IssuedReceipt {
  id: string;
  herbId: string;
  rankPosition: RankPosition;
}
export interface ReceiptRow extends IssuedReceipt {
  expiresAt?: string;
}

/**
 * The four things this function asks of the database. Every method may throw; callers swallow.
 * The Supabase implementation is `supabasePort`; tests supply fakes and a psql-backed shim.
 */
export interface CapturePort {
  /** Has this session already been consumed? `null` = no such session for this account. */
  sessionConsumed(userId: string, sessionId: string): Promise<boolean | null>;
  consume(args: {
    userId: string;
    sessionId: string;
    nonce: string;
    observationId: string;
    digests: string[];
  }): Promise<ConsumeAnswer>;
  issue(args: { userId: string; sessionId: string; items: ReceiptItem[] }): Promise<IssuedReceipt[]>;
  receiptsForSession(userId: string, sessionId: string): Promise<ReceiptRow[]>;
}

type Reply = PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>;
/** The slice of a supabase-js client this module touches. */
export interface AdminLike {
  rpc(fn: string, args: Record<string, unknown>): Reply;
  from(table: string): {
    select(columns: string): { eq(column: string, value: unknown): { eq(column: string, value: unknown): Reply } };
  };
}

const obj = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

export function supabasePort(admin: AdminLike): CapturePort {
  return {
    async sessionConsumed(userId, sessionId) {
      const { data, error } = await admin
        .from('capture_sessions')
        .select('id,consumed_at')
        .eq('id', sessionId)
        .eq('user_id', userId);
      if (error || !Array.isArray(data)) throw new Error('capture_sessions read failed');
      const row = obj(data[0]);
      return row ? row.consumed_at != null : null;
    },
    async consume({ userId, sessionId, nonce, observationId, digests }) {
      const { data, error } = await admin.rpc('consume_capture_session', {
        p_user: userId,
        p_session: sessionId,
        p_nonce: nonce,
        p_observation_id: observationId,
        p_image_digests: digests,
      });
      const body = obj(data);
      if (error || !body) throw new Error('consume_capture_session failed');
      return {
        ok: body.ok === true,
        replay: body.replay === true,
        code: typeof body.code === 'string' ? body.code : undefined,
        observationId: typeof body.observation_id === 'string' ? body.observation_id : undefined,
      };
    },
    async issue({ userId, sessionId, items }) {
      const { data, error } = await admin.rpc('issue_capture_receipts', {
        p_user: userId,
        p_session: sessionId,
        p_items: items,
      });
      if (error || !Array.isArray(data)) throw new Error('issue_capture_receipts failed');
      return data.flatMap((raw) => {
        const row = obj(raw);
        if (!row || typeof row.id !== 'string' || typeof row.herb_id !== 'string') return [];
        return [{ id: row.id, herbId: row.herb_id, rankPosition: row.rank_position === 'listed' ? 'listed' : 'top' } as IssuedReceipt];
      });
    },
    async receiptsForSession(userId, sessionId) {
      const { data, error } = await admin
        .from('capture_receipts')
        .select('id,herb_id,rank_position,expires_at')
        .eq('session_id', sessionId)
        .eq('user_id', userId);
      if (error || !Array.isArray(data)) throw new Error('capture_receipts read failed');
      return data.flatMap((raw) => {
        const row = obj(raw);
        if (!row || typeof row.id !== 'string' || typeof row.herb_id !== 'string') return [];
        return [
          {
            id: row.id,
            herbId: row.herb_id,
            rankPosition: row.rank_position === 'listed' ? 'listed' : 'top',
            expiresAt: typeof row.expires_at === 'string' ? row.expires_at : undefined,
          } as ReceiptRow,
        ];
      });
    },
  };
}

// ── Which candidates earn a receipt (local copy; see the header) ─────────────

const RECEIPT_ELIGIBILITIES: readonly Eligibility[] = [
  'exact',
  'synonym',
  'acceptedGroup',
  'curatedEquivalent',
  'genusCard',
];

export interface ReceiptItem {
  herb_id: string;
  observed_taxon_key: string;
  observed_taxon_rank: string;
  eligibility: string;
  rank_position: RankPosition;
  species_confidence: SpeciesConfidence;
}

export interface CaptureCandidate {
  match: PlantMatch;
  rankPosition: RankPosition;
  speciesConfidence: SpeciesConfidence;
}

export function receiptItemsFor(candidates: readonly CaptureCandidate[]): ReceiptItem[] {
  const seen = new Set<string>();
  const items: ReceiptItem[] = [];
  for (const { match, rankPosition, speciesConfidence } of candidates) {
    if (!match.confirmable || !match.herbId || !match.observedTaxon) continue;
    if (!RECEIPT_ELIGIBILITIES.includes(match.eligibility)) continue;
    if (seen.has(match.herbId)) continue;
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

// ── Orchestration ────────────────────────────────────────────────────────────

/** What a capture request resolved to before the provider call. */
export type CaptureState =
  | { kind: 'open'; sessionId: string; userId: string }
  | { kind: 'failed'; code: CaptureCode };

const asCode = (code: unknown): CaptureCode =>
  typeof code === 'string' && KNOWN_CODES.has(code) ? (code as CaptureCode) : 'capture_unavailable';

/**
 * Step 1+2 of contract 3.2. Never throws: any fault becomes `capture_unavailable`, because a capture
 * that cannot be recorded must leave the identification itself untouched.
 */
export async function beginCapture(
  port: CapturePort,
  ask: CaptureAsk,
  userId: string | null,
  observationId: string,
  files: readonly Blob[],
): Promise<CaptureState> {
  if (!userId) return { kind: 'failed', code: 'capture_not_signed_in' };
  if (!ask.complete) {
    // A malformed or absent session is "not a session of yours"; a missing field is the caller's omission.
    return {
      kind: 'failed',
      code: ask.sessionId === '' || ask.nonce === '' ? 'capture_purpose_missing' : 'capture_session_unknown',
    };
  }
  try {
    const digests = await imageDigests(files);
    const answer = await port.consume({ userId, sessionId: ask.sessionId, nonce: ask.nonce, observationId, digests });
    if (!answer.ok) return { kind: 'failed', code: asCode(answer.code) };
    // A replay that reached here found no receipts to hand back (the earlier request recorded none,
    // typically because its provider call failed). The session cannot be spent twice, so this one is
    // served as an ordinary identification with an honest code.
    if (answer.replay) return { kind: 'failed', code: 'capture_session_used' };
    return { kind: 'open', sessionId: ask.sessionId, userId };
  } catch {
    return { kind: 'failed', code: 'capture_unavailable' };
  }
}

export interface ReplayAnswer {
  receipts: Array<{ id: string; herbId: string; rankPosition: RankPosition }>;
}

/**
 * The pre-quota replay check (contract 3.2, "retry idempotence"). Runs BEFORE the quota claim so that
 * re-sending an identical request after a lost response spends no second unit and calls no provider.
 *
 * Returns an answer only when the session is already consumed, the identical request is presented
 * again, AND there are receipts to return; every other case returns `null` and the request proceeds as
 * a first presentation (which asks the database again and reports `capture_session_used` where due).
 * The comparison itself is the database's: this only asks `consume_capture_session`, which is
 * side-effect free for a consumed session.
 */
export async function checkReplay(
  port: CapturePort,
  ask: CaptureAsk,
  userId: string | null,
  files: readonly Blob[],
): Promise<ReplayAnswer | null> {
  if (!userId || !ask.complete) return null;
  try {
    const consumed = await port.sessionConsumed(userId, ask.sessionId);
    if (consumed !== true) return null;
    const digests = await imageDigests(files);
    const answer = await port.consume({
      userId,
      sessionId: ask.sessionId,
      nonce: ask.nonce,
      observationId: '',
      digests,
    });
    if (!answer.ok || !answer.replay) return null;
    const rows = await port.receiptsForSession(userId, ask.sessionId);
    if (rows.length === 0) return null;
    return { receipts: rows.map(({ id, herbId, rankPosition }) => ({ id, herbId, rankPosition })) };
  } catch {
    return null;
  }
}

/** The `capture` field for an answer with no candidates at all (not a plant, or nothing found). */
export function captureWithoutCandidates(state: CaptureState): { accepted: boolean; code?: CaptureCode } {
  return state.kind === 'failed'
    ? { accepted: false, code: state.code }
    : { accepted: true, code: 'no_eligible_candidate' };
}

export interface ResponseCandidate {
  scientificName: string;
  score: number;
  [key: string]: unknown;
}

export interface CaptureOutcome<C> {
  candidates: Array<C & { captureReceipt?: { id: string; rankPosition: RankPosition; expiresAt: string } }>;
  capture: { accepted: boolean; code?: CaptureCode };
}

/**
 * Step 4 of contract 3.2: after the unchanged provider call and the matcher, one receipt per eligible
 * candidate, from THIS SERVER'S OWN match of the provider's own string. Nothing the client sent
 * (other than the session) influences which card a receipt names.
 */
export async function issueForCandidates<C extends ResponseCandidate>(
  port: CapturePort,
  state: CaptureState,
  candidates: readonly C[],
  now: () => number = Date.now,
): Promise<CaptureOutcome<C>> {
  if (state.kind === 'failed') return { candidates: [...candidates], capture: { accepted: false, code: state.code } };

  const scored = candidates.map((candidate, index) => {
    const match = matchScientificName(candidate.scientificName);
    return {
      candidate,
      key: { match, rankPosition: (index === 0 ? 'top' : 'listed') as RankPosition } as const,
      speciesConfidence: (match.observedTaxon
        ? speciesConfidenceFor(match.observedTaxon.rank, candidate.score)
        : 'unresolved') as SpeciesConfidence,
    };
  });
  const items = receiptItemsFor(scored.map((s) => ({ ...s.key, speciesConfidence: s.speciesConfidence })));
  if (items.length === 0) {
    return { candidates: [...candidates], capture: { accepted: true, code: 'no_eligible_candidate' } };
  }

  let issued: IssuedReceipt[];
  try {
    issued = await port.issue({ userId: state.userId, sessionId: state.sessionId, items });
  } catch {
    return { candidates: [...candidates], capture: { accepted: false, code: 'capture_unavailable' } };
  }
  if (issued.length === 0) {
    return { candidates: [...candidates], capture: { accepted: false, code: 'capture_unavailable' } };
  }

  // Exact expiry comes from the row; if that read fails the receipt is still good, so fall back to the
  // contracted TTL rather than dropping it.
  const expiries = new Map<string, string>();
  try {
    for (const row of await port.receiptsForSession(state.userId, state.sessionId)) {
      if (row.expiresAt) expiries.set(row.id, row.expiresAt);
    }
  } catch {
    /* computed below */
  }
  const fallback = new Date(now() + RECEIPT_TTL_DAYS * 86_400_000).toISOString();

  const byHerb = new Map(issued.map((r) => [r.herbId, r]));
  const taken = new Set<string>();
  const out = scored.map(({ candidate, key }) => {
    const herbId = key.match.confirmable ? key.match.herbId : undefined;
    const receipt = herbId && !taken.has(herbId) ? byHerb.get(herbId) : undefined;
    if (!receipt) return candidate as CaptureOutcome<C>['candidates'][number];
    taken.add(herbId!);
    return {
      ...candidate,
      captureReceipt: {
        id: receipt.id,
        rankPosition: receipt.rankPosition,
        expiresAt: expiries.get(receipt.id) ?? fallback,
      },
    };
  });
  return { candidates: out, capture: { accepted: true } };
}
