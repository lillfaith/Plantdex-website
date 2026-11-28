import { supabase } from './supabase-client';
import { IDENTIFY_PROFILE, UnprocessableImageError, prepareImage } from './image-prepare';
import {
  matchScientificName,
  outcomeFor,
  speciesConfidenceFor,
  type ScanCandidate,
  type ScanOutcome,
} from './plant-match';
import type { NewSighting } from './sightings';
import { ANONYMOUS_CONSENT_SCOPE, browserConsentStorage, mayTransmit } from './scan-consent';

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
  /**
   * Which service answered — `plantnet` or `plantid`. A deployment setting, not a fact about
   * the caller. Recorded on the history row because otherwise switching providers would make
   * every scan ever taken look as though the new one had answered it.
   */
  provider?: string;
  /** Server-minted uuid for this set of photographs. See `identification_observation_id`. */
  observationId?: string;
  /**
   * The provider answered that this is not a plant. An ANSWER, and different from "no card":
   * the candidate list is empty either way, so without this flag the two were the same result.
   */
  notAPlant?: boolean;
  /** The provider answered successfully and had no suggestion at all. Also not "no card". */
  providerFoundNothing?: boolean;
  /**
   * Capture outcome from the discovery receipt contract, present only when the request declared
   * `purpose=collect` and the server implements it. Absent means "no receipt, nothing to claim".
   */
  capture?: { accepted: boolean; code?: string; replay?: boolean };
  /** The server's receipt for each eligible candidate, keyed by the provider's scientific name. */
  receipts?: Record<string, { id: string; rankPosition: 'top' | 'listed'; expiresAt: string }>;
}

export const CAPTURE_STORE_UNAVAILABLE = 'Collecting is unavailable right now. Open the camera and take the photo again in a moment, or add another photo of the same plant to look it up.';

const UNREACHABLE = 'The identifier could not be reached.';

/**
 * The four honest outcomes of a provider-side failure. `released` = the capture session was handed
 * back (same photos may be resent); `refunded` = the backend CONFIRMED the player's own daily scan
 * was restored. Nothing here may claim a restore the backend did not confirm.
 */
export function providerFailureMessage(released: boolean, refunded: boolean, isCapture: boolean): string {
  if (released && refunded) {
    return `${UNREACHABLE} You can try again with the same photos, and this attempt was not counted against your daily scans.`;
  }
  if (released) {
    return `${UNREACHABLE} You can try again with the same photos. We could not confirm your daily scan count was restored.`;
  }
  if (refunded) {
    return isCapture
      ? `${UNREACHABLE} This attempt was not counted against your daily scans. Please take your photos again.`
      : `${UNREACHABLE} This attempt was not counted against your daily scans. Please try again.`;
  }
  return `${UNREACHABLE} Please try again in a little while.`;
}

export type ScanFailure =
  | { kind: 'rateLimited'; message: string; signedIn: boolean }
  | { kind: 'unconfigured'; message: string }
  | { kind: 'error'; message: string; /** The same photographs may be sent again; nothing was spent. */ retryable?: boolean; /** The backend consumed the camera session and did not hand it back: it cannot be sent again. */ captureSpent?: boolean };

export interface ScanRecord {
  id: string;
  createdAt: string;
  photoPath?: string;
  topScientificName?: string;
  topHerbId?: string;
  confidence?: number;
  confirmedHerbId?: string;
  provider?: string;
  observationId?: string;
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
/**
 * ONE OBSERVATION: two or three photographs of the SAME individual plant.
 *
 * The organ tag travels with each photograph because PlantNet asks for one per image and
 * requires the counts to match; plant.id has no organ vocabulary and simply ignores them.
 * That asymmetry is the seam working — the observation is provider-neutral and each adapter
 * uses what its provider understands.
 */
export interface ObservationPhoto {
  readonly file: File;
  readonly organ: 'habit' | 'leaf' | 'auto';
  /**
   * Where the photograph came from, when the capture pilot is on: the live in-app camera or a
   * file the player imported. Read only to decide whether the observation may unlock a NEW card
   * (`scan-flow.ts`); it is never sent to the provider and never stored.
   */
  readonly source?: 'camera' | 'import';
}

/** Two required, three allowed. The server enforces the same bounds. */
export const MIN_OBSERVATION_PHOTOS = 2;
export const MAX_OBSERVATION_PHOTOS = 3;
/**
 * A COLLECT observation (in-app camera) needs ONE photograph; more angles are optional and help
 * the identifier's accuracy only. They are never evidence that somebody was there. The server
 * applies the same floor independently, for `purpose=collect` only.
 */
export const MIN_CAPTURE_PHOTOS = 1;

/** The minimum for a channel: collect = 1, anything else keeps the lookup floor of two. */
export function minPhotosFor(channel: 'collect' | 'lookup' | 'unspecified'): number {
  return channel === 'collect' ? MIN_CAPTURE_PHOTOS : MIN_OBSERVATION_PHOTOS;
}

export async function identifyPlant(
  photos: readonly ObservationPhoto[],
  onPrepared?: () => void,
  options: {
    consentScope?: string;
    /** An open capture session, for a `collect` observation only (discovery receipt contract). */
    capture?: { sessionId: string; nonce: string };
  } = {},
): Promise<ScanResult | ScanFailure> {
  /*
   * NOTHING LEAVES THE DEVICE BEFORE THE PLAYER HAS ACKNOWLEDGED WHERE IT GOES. Enforced here as
   * well as in the screen, because the screen is not the only possible caller. Inert unless the
   * consent flag or the camera pilot is on (`isConsentEnforced`), so today's behaviour is
   * unchanged by default.
   */
  if (!mayTransmit(browserConsentStorage(), options.consentScope ?? ANONYMOUS_CONSENT_SCOPE)) {
    return {
      kind: 'error',
      message: 'Review where your photos are sent before identifying a plant. Nothing was sent.',
    };
  }
  /*
   * ARGUMENTS BEFORE ENVIRONMENT, AND THE ORDER IS THE MESSAGE.
   *
   * The configured check used to come first, so a caller passing one photograph to an
   * unconfigured deployment was told identification is unavailable — true, and not the
   * problem they had. The count is a property of the request; whether a backend exists is
   * not. Validate what you were handed, then where you are.
   *
   * REFUSED HERE AS WELL AS IN THE BUTTON AND ON THE SERVER, and not for its own sake: both
   * providers treat the set as ONE individual, so the count is the basis of the answer. A
   * single photograph would still produce a confident-looking result — just a worse one —
   * which is the failure mode this whole change exists to reduce.
   */
  const minimum = options.capture ? MIN_CAPTURE_PHOTOS : MIN_OBSERVATION_PHOTOS;
  if (photos.length < minimum) {
    return {
      kind: 'error',
      message:
        minimum === 1
          ? 'Add a photograph of the plant before identifying.'
          : `Add ${minimum} photographs of the same plant before identifying.`,
    };
  }
  if (photos.length > MAX_OBSERVATION_PHOTOS) {
    return { kind: 'error', message: `At most ${MAX_OBSERVATION_PHOTOS} photographs.` };
  }

  if (!supabase) {
    return { kind: 'unconfigured', message: 'Plant identification is not available here yet.' };
  }

  let prepared: Awaited<ReturnType<typeof prepareImage>>[];
  try {
    prepared = await Promise.all(
      photos.map((photo) => prepareImage(photo.file, IDENTIFY_PROFILE)),
    );
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
  /*
   * Each `prepared.blob` is the downscaled, re-encoded image — EXIF and its GPS are gone with
   * the re-encode. The original Files are deliberately never sent, and that now holds for
   * every photograph in the observation rather than for the only one: `prepareImage` runs per
   * photo, so adding images added no path that skips the re-encode.
   *
   * `image` and `organ` are appended in matching order, repeated. The server reads them with
   * `getAll`.
   */
  prepared.forEach((one, index) => {
    form.append(
      'image',
      new File([one.blob], `scan-${index}.${one.extension}`, { type: one.contentType }),
    );
    form.append('organ', photos[index]!.organ);
  });

  /*
   * THE RECEIPT CONTRACT'S THREE FIELDS, only for a collect observation that holds an open
   * session. A lookup sends nothing extra, so its request is byte-identical to today's.
   */
  if (options.capture) {
    form.append('purpose', 'collect');
    form.append('capture_session_id', options.capture.sessionId);
    form.append('capture_nonce', options.capture.nonce);
  }

  const { data, error } = await supabase.functions.invoke('identify-plant', { body: form });

  if (error) {
    // The function's own sentence is better than a generic one, so re-read the body.
    let payload: { error?: string; code?: string; signedIn?: boolean; capture?: { retryable?: unknown; code?: unknown }; allowance?: unknown } = {};
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
    // The server refused THIS capture (session used, expired, unknown, wrong nonce...). It spoke about the
    // session, so it can never be sent again, and its own sentence says what to do. Without this branch the
    // refusal read as a dropped connection and the same dead session was resent on every retry.
    if (payload.code === 'captureRefused' && options.capture) {
      // The client treats a refused session as spent (it is never resent), so the server's "try again in a
      // moment" for an unavailable store would promise a retry of THIS photo that cannot happen.
      if (payload.capture?.code === 'capture_unavailable') {
        return { kind: 'error', message: CAPTURE_STORE_UNAVAILABLE, captureSpent: true };
      }
      return {
        kind: 'error',
        message: payload.error ?? 'This photo could not be matched to a camera capture. Please take the photo again.',
        captureSpent: true,
      };
    }
    if (payload.allowance === 'refunded' || payload.allowance === 'not_refunded' || payload.capture?.retryable === true) {
      const released = payload.capture?.retryable === true;
      return {
        kind: 'error',
        message: providerFailureMessage(released, payload.allowance === 'refunded', Boolean(options.capture)),
        ...(released ? { retryable: true } : options.capture ? { captureSpent: true } : {}),
      };
    }
    return {
      kind: 'error',
      // No answer at all (the connection dropped, or the function was unreachable). The photographs are
      // still on screen and nothing the player did is lost, so say that; a retry uses the same
      // capture session, and if the server turns out to have spent it the retry says so.
      message: payload.error ?? 'The identification service could not be reached. Your photos are still here: check your connection and try again.',
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
      captureReceipt?: { id?: unknown; rankPosition?: unknown; expiresAt?: unknown };
    }[];
    capture?: { accepted?: unknown; code?: unknown; replay?: unknown };
    remaining?: number;
    limit?: number;
    signedIn?: boolean;
    provider?: string;
    observationId?: string;
    notAPlant?: boolean;
    providerFoundNothing?: boolean;
  };

  /*
   * A SUCCESS THAT DOES NOT HAVE THE SHAPE OF ONE IS A FAILURE. `data ?? {}` turned a null
   * body, an `{ error }` body or a cached error page into an empty candidate list, which
   * `outcomeFor` reports as `noMatch` — "not one of the 45 cards" — a confident-sounding
   * answer the identifier never gave. Every real answer carries a `candidates` array, an
   * empty one included, so its absence is the app failing to understand the response.
   */
  const rawCandidates = (data as { candidates?: unknown } | null)?.candidates;
  if (!Array.isArray(rawCandidates)) {
    return {
      kind: 'error',
      message: 'The identification service answered in a way this app did not recognise.',
    };
  }
  // An entry with no name or no usable score cannot be matched or ranked; keep the rest.
  const usable = (raw.candidates ?? []).filter(
    (candidate) =>
      typeof candidate?.scientificName === 'string' &&
      candidate.scientificName.trim() !== '' &&
      typeof candidate.score === 'number' &&
      Number.isFinite(candidate.score),
  );
  // Suggestions arrived and none could be read: that is not "nothing recognised".
  if (rawCandidates.length > 0 && usable.length === 0) {
    return {
      kind: 'error',
      message: 'The identification service answered in a way this app did not recognise.',
    };
  }

  const candidates: ScanCandidate[] = usable.map((candidate) => ({
    ...candidate,
    match: matchScientificName(candidate.scientificName),
  }));

  const receipts: NonNullable<ScanResult['receipts']> = {};
  for (const candidate of usable) {
    const r = candidate.captureReceipt;
    if (
      r &&
      typeof r.id === 'string' &&
      (r.rankPosition === 'top' || r.rankPosition === 'listed') &&
      typeof r.expiresAt === 'string'
    ) {
      receipts[candidate.scientificName] = { id: r.id, rankPosition: r.rankPosition, expiresAt: r.expiresAt };
    }
  }
  const cap = raw.capture;

  return {
    outcome: outcomeFor(candidates),
    candidates,
    capture:
      cap && typeof cap.accepted === 'boolean'
        ? {
            accepted: cap.accepted,
            code: typeof cap.code === 'string' ? cap.code : undefined,
            replay: cap.replay === true ? true : undefined,
          }
        : undefined,
    receipts: Object.keys(receipts).length > 0 ? receipts : undefined,
    remaining: raw.remaining,
    limit: raw.limit,
    signedIn: raw.signedIn,
    provider: raw.provider,
    observationId: raw.observationId,
    // Strict `=== true`: only an explicit statement from the server counts.
    notAPlant: raw.notAPlant === true ? true : undefined,
    providerFoundNothing: raw.providerFoundNothing === true ? true : undefined,
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
    // Both come from the server's own answer, never from anything chosen here. Null on a
    // deployment that has not redeployed the function yet, which is a row that simply does
    // not say — not a row claiming a provider it cannot know.
    provider: result.provider ?? null,
    identification_observation_id: result.observationId ?? null,
  });
  return error ? null : id;
}

/**
 * The taxon a confirmed candidate records, as the journal stores it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE MAPPING, SHARED, BECAUSE THE FIELDS ONLY MEAN ANYTHING TOGETHER.
 *
 * `herbId` is the CARD and every other field here is the PLANT, and the two are routinely
 * different: an observation of `Solidago altissima` qualifies for the Goldenrod card, whose
 * binomial is `Solidago canadensis`. A caller that filled in some of these and not others
 * would write a row that is half a record — the commonest way for the distinction to be lost
 * is not a wrong value but a missing one.
 *
 * `providerName` is what came back, untouched. `name` is the identity — authorship dropped,
 * hybrid sign and infraspecific rank kept. `key` is how the card was FOUND and is never shown
 * as a name. `eligibility` is why it qualified. `speciesConfidence` is how settled the species
 * is, which is not the provider's score: a section named at 0.99 is still `unresolved`.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function observedTaxonFields(
  candidate: ScanCandidate,
  provider?: string,
): Pick<
  NewSighting,
  | 'observedTaxonProviderName'
  | 'observedTaxonName'
  | 'observedTaxonKey'
  | 'observedTaxonRank'
  | 'eligibility'
  | 'speciesConfidence'
  | 'identificationProvider'
> {
  const taxon = candidate.match.observedTaxon;
  return {
    observedTaxonProviderName: candidate.scientificName,
    observedTaxonName: taxon?.name,
    observedTaxonKey: taxon?.key,
    observedTaxonRank: taxon?.rank,
    eligibility: candidate.match.eligibility,
    speciesConfidence: taxon ? speciesConfidenceFor(taxon.rank, candidate.score) : undefined,
    identificationProvider: provider,
  };
}

/**
 * Record which card the player confirmed, AND WHICH CANDIDATE THEY CHOSE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE TOP CANDIDATE AND THE CHOSEN ONE ARE DIFFERENT FACTS, AND ONLY ONE WAS STORED.
 *
 * `top_scientific_name` and `confidence` are the provider's leading answer; they are written
 * by `recordScan` before anybody has decided anything. This used to add only
 * `confirmed_herb_id`, so a player who scrolled past the leading answer and confirmed a lower
 * one left a row reading:
 *
 *     top_scientific_name = Oxalis dillenii   0.41
 *     confirmed_herb_id   = oxalis-stricta            (from a 0.09 candidate)
 *
 * Nothing in that said `Oxalis dillenii` had been REJECTED. Anything reading the row back —
 * the export, an accuracy evaluation, a person — would attribute a taxon to the player that
 * they explicitly declined. The whole chosen candidate is written alongside now, and the
 * provider's leading answer is left exactly as it was.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Deliberately a DELETE-then-INSERT rather than an update: there is no update policy on
 * `scans`, by design, so a confirmation replaces the row rather than editing it. Awarding
 * the discovery is not done here — `discover()` owns that, and owns idempotency with it.
 */
export async function confirmScan(
  userId: string,
  scanId: string,
  herbId: string,
  candidate: ScanCandidate,
): Promise<boolean> {
  if (!supabase) return false;
  /*
   * ATOMIC PATH (migration 0014, `confirm_scan`). OFF BY DEFAULT: the literal comparison below is
   * resolved at build time (`NEXT_PUBLIC_CONFIRM_SCAN_RPC`, 'off' unless the owner sets it), so with
   * the flag off this block is not in the bundle and the mitigation underneath is unchanged.
   *
   * `true`  = the scan is now confirmed for THIS card (first time, or an idempotent retry).
   * `false` = it is already confirmed for a different card, or is not this caller's: never success.
   * ANY error is a failure, not "already confirmed" — we do not know what happened, so we claim
   * nothing. Only a MISSING function (PostgREST PGRST202, Postgres 42883: a database that has not
   * run 0014) falls through to the mitigation, so a deployment ahead of its migration still works.
   */
  if (process.env.NEXT_PUBLIC_CONFIRM_SCAN_RPC === 'on') {
    const chosen = candidate.match.observedTaxon;
    try {
      const { data, error: rpcError } = await supabase.rpc('confirm_scan', {
        p_scan_id: scanId,
        p_herb_id: herbId,
        p_scientific_name: candidate.scientificName,
        p_probability: candidate.score,
        p_taxon_rank: chosen?.rank ?? null,
        p_eligibility: candidate.match.eligibility,
        p_species_confidence: chosen
          ? speciesConfidenceFor(chosen.rank, candidate.score)
          : null,
      });
      if (!rpcError) return data === true;
      if (rpcError.code !== 'PGRST202' && rpcError.code !== '42883') {
        console.error(`confirmScan: rpc failed for scan ${scanId}`);
        return false;
      }
      // Function missing on this database: fall through to the mitigation below.
    } catch {
      console.error(`confirmScan: rpc failed for scan ${scanId}`);
      return false;
    }
  }
  const { data: existing, error: readError } = await supabase
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .eq('id', scanId)
    .maybeSingle();
  // A failed read is not "no row": say so, and write nothing.
  if (readError) {
    console.error(`confirmScan: read failed for scan ${scanId}`);
    return false;
  }
  if (!existing) return false;
  // Already confirmed (perhaps by a concurrent tap): the same card is a success, anything else
  // is refused. Either way nothing is written, so a confirmation is never overwritten.
  if (existing.confirmed_herb_id != null) {
    return existing.confirmed_herb_id === herbId;
  }
  const taxon = candidate.match.observedTaxon;
  /*
   * MITIGATION, NOT THE FIX. The proper fix is an atomic server-side `confirm_scan` function
   * (one transaction, no window in which the row is absent). `scans` deliberately has no update
   * policy, so the client can only DELETE then INSERT; this guards the window rather than
   * closing it. The delete matches only a row that is still unconfirmed, so it cannot remove a
   * confirmation another call has just written, and `.select()` tells us whether a row was
   * really removed.
   */
  const { data: removed, error: deleteError } = await supabase
    .from('scans')
    .delete()
    .eq('user_id', userId)
    .eq('id', scanId)
    .is('confirmed_herb_id', null)
    .select('id');
  // Nothing was removed (error, or the row changed under us), so there is nothing to replace;
  // inserting would only collide with the row that is still there.
  if (deleteError || !removed || removed.length === 0) return false;
  const { error } = await supabase.from('scans').insert({
    ...existing,
    confirmed_herb_id: herbId,
    // The provider's own string for the candidate that was chosen — never the top one, and
    // never rewritten to the card's binomial.
    confirmed_scientific_name: candidate.scientificName,
    confirmed_probability: candidate.score,
    confirmed_taxon_rank: taxon?.rank ?? null,
    confirmed_eligibility: candidate.match.eligibility,
    confirmed_species_confidence: taxon
      ? speciesConfidenceFor(taxon.rank, candidate.score)
      : null,
  });
  if (error) {
    /*
     * THE DELETE HAS ALREADY HAPPENED, SO A FAILED INSERT WOULD OTHERWISE LOSE THE SCAN.
     * Put back exactly what was read. One attempt, no retry loop: a dropped connection can
     * fail this too, so its result is checked and reported (id only, no personal data).
     */
    const { error: restoreError } = await supabase.from('scans').insert(existing);
    if (restoreError) console.error(`confirmScan: restore failed for scan ${scanId}`);
    return false;
  }
  return true;
}
