import { supabase } from './supabase-client';
import { prepareImage } from './image-prepare';
import {
  matchScientificName,
  outcomeFor,
  type ScanCandidate,
  type ScanOutcome,
} from './plant-match';

/**
 * PLANT ID, CLIENT SIDE.
 *
 * Sends a photograph to the `identify-plant` edge function, maps what comes back onto the
 * deck, and — separately, and only when the player says so — records the outcome.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IDENTIFYING AND CONFIRMING ARE TWO DIFFERENT CALLS, ON PURPOSE.
 *
 * `identifyPlant()` never writes anything and never awards anything. `recordScan()` writes
 * the history row. `confirmScan()` is what the UI calls after an explicit tap, and even that
 * does not award the discovery — the existing `discover()` in HerbdexProvider does, through
 * the same reducer as every other entry point, so a repeat scan of a plant already found
 * awards nothing exactly as a repeat tap does.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE PHOTOGRAPH IS PREPARED BEFORE IT LEAVES. `prepareImage` is the same pipeline sightings
 * use: a 1280px JPEG with EXIF — and therefore GPS — dropped in the re-encode. Nothing here
 * may bypass it; a raw phone photo carries the coordinates of the plant and of the person.
 */

export interface ScanResult {
  outcome: ScanOutcome;
  candidates: ScanCandidate[];
  /** Identifications left today, as the server counted them. */
  remaining?: number;
  limit?: number;
  signedIn?: boolean;
}

export type ScanFailure =
  | { kind: 'rateLimited'; message: string; signedIn: boolean }
  | { kind: 'unconfigured'; message: string }
  | { kind: 'error'; message: string };

export interface ScanRecord {
  id: string;
  createdAt: string;
  photoPath?: string;
  topScientificName?: string;
  topHerbId?: string;
  confidence?: number;
  confirmedHerbId?: string;
  outcome: ScanOutcome;
}

/** Same shape as a sighting id, for the same reason: the client owns it. */
function newScanId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Identify a photograph. Writes nothing.
 *
 * Works signed out — anonymous scanning is supported, with a smaller daily allowance the
 * server enforces. A rate-limit answer is a normal outcome, not an exception, so it comes
 * back as a typed failure the UI can explain rather than a thrown error.
 */
export async function identifyPlant(file: File): Promise<ScanResult | ScanFailure> {
  if (!supabase) {
    return { kind: 'unconfigured', message: 'Plant identification is not available here yet.' };
  }

  let prepared;
  try {
    prepared = await prepareImage(file);
  } catch {
    return { kind: 'error', message: 'That image could not be read. Try another photograph.' };
  }

  const form = new FormData();
  // `prepared.blob` is the downscaled, re-encoded image — EXIF and its GPS are gone with the
  // re-encode. The original File is deliberately never sent.
  form.append('image', new File([prepared.blob], `scan.${prepared.extension}`, {
    type: prepared.contentType,
  }));

  const { data, error } = await supabase.functions.invoke('identify-plant', { body: form });

  if (error) {
    // The function's own sentence is better than a generic one, so re-read the body.
    let payload: { error?: string; code?: string; signedIn?: boolean } = {};
    try {
      const context = (error as { context?: Response }).context;
      if (context) payload = await context.clone().json();
    } catch {
      /* fall through to the generic message */
    }
    if (payload.code === 'rateLimited' || payload.code === 'globalLimit') {
      return {
        kind: 'rateLimited',
        message: payload.error ?? 'You have used your identifications for today.',
        signedIn: Boolean(payload.signedIn),
      };
    }
    if (payload.code === 'unconfigured') {
      return {
        kind: 'unconfigured',
        message: payload.error ?? 'Plant identification is not set up on this deployment yet.',
      };
    }
    return {
      kind: 'error',
      message: payload.error ?? 'The identification service could not be reached.',
    };
  }

  const raw = (data ?? {}) as {
    candidates?: {
      scientificName: string;
      commonName?: string;
      score: number;
      gbifId?: string;
      powoId?: string;
    }[];
    remaining?: number;
    limit?: number;
    signedIn?: boolean;
  };

  const candidates: ScanCandidate[] = (raw.candidates ?? []).map((candidate) => ({
    ...candidate,
    match: matchScientificName(candidate.scientificName),
  }));

  return {
    outcome: outcomeFor(candidates),
    candidates,
    remaining: raw.remaining,
    limit: raw.limit,
    signedIn: raw.signedIn,
  };
}

export function isScanFailure(value: ScanResult | ScanFailure): value is ScanFailure {
  return 'kind' in value;
}

/**
 * Write the history row, for a signed-in player.
 *
 * Signed out there is nowhere to put it — scan history is account data — and that is stated
 * in the UI rather than silently dropped. Failure here never blocks the result: somebody who
 * has just identified a plant should not lose the answer because a history write failed.
 */
export async function recordScan(
  userId: string,
  result: ScanResult,
  photoPath?: string,
): Promise<string | null> {
  if (!supabase) return null;
  const top = result.candidates[0];
  const id = newScanId();
  const { error } = await supabase.from('scans').insert({
    id,
    user_id: userId,
    photo_path: photoPath ?? null,
    top_scientific_name: top?.scientificName ?? null,
    top_herb_id: top?.match.confirmable ? (top.match.herbId ?? null) : null,
    confidence: top?.score ?? null,
    outcome: result.outcome,
  });
  return error ? null : id;
}

/**
 * Record which card the player confirmed.
 *
 * Deliberately a DELETE-then-INSERT rather than an update: there is no update policy on
 * `scans`, by design, so a confirmation replaces the row rather than editing it. Awarding
 * the discovery is not done here — `discover()` owns that, and owns idempotency with it.
 */
export async function confirmScan(
  userId: string,
  scanId: string,
  herbId: string,
): Promise<boolean> {
  if (!supabase) return false;
  const { data: existing } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .eq('id', scanId)
    .maybeSingle();
  if (!existing) return false;
  await supabase.from('scans').delete().eq('user_id', userId).eq('id', scanId);
  const { error } = await supabase
    .from('scans')
    .insert({ ...existing, confirmed_herb_id: herbId });
  return !error;
}

export async function listScans(userId: string): Promise<ScanRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: String(row.id),
    createdAt: String(row.created_at),
    photoPath: typeof row.photo_path === 'string' ? row.photo_path : undefined,
    topScientificName:
      typeof row.top_scientific_name === 'string' ? row.top_scientific_name : undefined,
    topHerbId: typeof row.top_herb_id === 'string' ? row.top_herb_id : undefined,
    confidence: typeof row.confidence === 'number' ? row.confidence : undefined,
    confirmedHerbId: typeof row.confirmed_herb_id === 'string' ? row.confirmed_herb_id : undefined,
    outcome: row.outcome as ScanOutcome,
  }));
}

export async function deleteScan(userId: string, scanId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from('scans').delete().eq('user_id', userId).eq('id', scanId);
  return !error;
}
