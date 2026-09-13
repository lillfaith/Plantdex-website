import { supabase } from './supabase-client';
import { IDENTIFY_PROFILE, UnprocessableImageError, prepareImage } from './image-prepare';
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
 * use, with EXIF — and therefore GPS — dropped in the re-encode. Nothing here may bypass it;
 * a raw phone photo carries the coordinates of the plant and of the person.
 *
 * IT ASKS FOR `IDENTIFY_PROFILE` RATHER THAN THE STORED-PHOTO ONE, because this image is
 * transmitted once and then dropped: nothing displays it, no row keeps it, and its only reader
 * is a model. Every byte above what that model needs is a byte somebody standing in a field
 * pushes up a mobile uplink before they are told what they are looking at — which is usually
 * the largest single term in the wait. A sighting photo is a different object with a different
 * job, and keeps its own fidelity.
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
 *
 * @param onPrepared Called once the photograph has been decoded, downscaled and re-encoded,
 *   which is the one boundary inside this call that a screen can HONESTLY report. The UI
 *   cannot see it from outside — preparation and the request are one await from there — and
 *   without it a status line either shows a single undifferentiated "working" for the whole
 *   wait, or invents a transition on a timer. There is deliberately no second callback for
 *   "upload finished": `fetch` does not expose it, so nothing here could report it truthfully.
 */
export async function identifyPlant(
  file: File,
  onPrepared?: () => void,
): Promise<ScanResult | ScanFailure> {
  if (!supabase) {
    return { kind: 'unconfigured', message: 'Plant identification is not available here yet.' };
  }

  let prepared;
  try {
    prepared = await prepareImage(file, IDENTIFY_PROFILE);
  } catch (error) {
    /*
     * WHAT WE COULD NOT RE-ENCODE, WE DO NOT SEND — and since `prepareImage` no longer has a
     * raw-bytes path at all, this is now the only outcome rather than a guard somebody has to
     * remember. Measured with a HEIC carrying real coordinates, back when the fallback still
     * existed: 75,838 raw bytes went out with the GPS tags intact (48 deg 51' N, 2 deg 17' E,
     * read straight out of the request body), the screen said location data had been removed,
     * one of five daily identifications was spent, and PlantNet refused the file anyway —
     * HTTP 400, "Unsupported file type for image[0] (jpeg or png)". Nothing was gained by
     * sending it, which is why refusing costs nothing.
     */
    if (error instanceof UnprocessableImageError) {
      return {
        kind: 'error',
        message:
          'Your browser cannot read that photo\u2019s format, so its location data cannot be ' +
          'removed before sending \u2014 and the identifier only accepts JPEG or PNG anyway. ' +
          'Take a photo with your camera, or choose a JPEG or PNG.',
      };
    }
    return { kind: 'error', message: 'That image could not be read. Try another photograph.' };
  }

  onPrepared?.();

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
      /** The signed candidate, when the deployment has an attestation secret set. */
      attestation?: string;
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
