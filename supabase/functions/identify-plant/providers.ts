import { parsePlantNetResponse } from '../_shared/herbdex/plantnet-normalize.ts';
import {
  PLANT_ID_DETAILS,
  parsePlantIdResponse,
} from '../_shared/herbdex/plantid-normalize.ts';
import type {
  IdentificationResult,
  ProviderId,
} from '../_shared/herbdex/identification-types.ts';

/**
 * THE I/O HALF OF THE PROVIDER SEAM. The mapping half is in `_shared/herbdex/*-normalize.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * The split is deliberate: everything here touches the network and a secret, so it cannot be
 * unit-tested without either mocking `fetch` or spending credits. Everything on the other
 * side is a pure function of a response body, so vitest exercises the exact code that runs
 * in production against hand-written mocks, and `npm test` spends nothing.
 *
 * NEITHER KEY LEAVES THIS FILE. Both are read from the environment inside the function that
 * uses them and are never returned, logged, or attached to an error — a provider failure
 * carries its status and its stated reason, never the request that caused it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** One photograph of the observation, with the organ it shows. */
export interface ObservationImage {
  readonly file: File;
  /** PlantNet's vocabulary: `habit`, `leaf`, `flower`, `fruit`, `bark`, or `auto`. */
  readonly organ: string;
}

const TIMEOUT_MS = 20_000;

/** A fetch that gives up rather than holding an isolate open until the platform kills it. */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function failure(
  provider: ProviderId,
  kind: IdentificationResult extends { kind: infer K } ? K : never,
  message: string,
  status?: number,
): IdentificationResult {
  return { provider, kind, message, status } as IdentificationResult;
}

/* ── PlantNet ─────────────────────────────────────────────────────────────────
 *
 * Multipart, one `images` part and one `organs` part PER PHOTOGRAPH, in the same order —
 * PlantNet requires the counts to match and treats the set as one individual plant, which is
 * exactly what the observation UI collects. Up to five are allowed; Plantdex sends two or
 * three.
 */
export async function identifyWithPlantNet(
  images: readonly ObservationImage[],
  apiKey: string,
): Promise<IdentificationResult> {
  if (!apiKey) {
    return failure('plantnet', 'unconfigured', 'PLANTNET_API_KEY is not set.');
  }
  const body = new FormData();
  for (const [index, image] of images.entries()) {
    body.append('images', image.file, `scan-${index}.jpg`);
    body.append('organs', image.organ);
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(apiKey)}`,
      { method: 'POST', body },
    );
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return failure(
      'plantnet',
      aborted ? 'timeout' : 'network',
      aborted ? 'PlantNet did not answer in time.' : 'PlantNet could not be reached.',
    );
  }

  // 404 is PlantNet's "I recognised nothing", which is a real answer rather than a fault.
  if (response.status === 404) {
    return { provider: 'plantnet', isPlant: null, candidates: [], timestamp: new Date().toISOString() };
  }
  if (response.status === 401 || response.status === 403) {
    return failure('plantnet', 'auth', 'PlantNet rejected this deployment’s key.', response.status);
  }
  if (response.status === 429) {
    return failure('plantnet', 'rateLimited', 'PlantNet is rate limiting this deployment.', 429);
  }
  if (!response.ok) {
    return failure('plantnet', 'provider', `PlantNet returned ${response.status}.`, response.status);
  }

  try {
    return parsePlantNetResponse(await response.json());
  } catch {
    return failure('plantnet', 'schema', 'PlantNet returned a body that is not JSON.');
  }
}

/* ── Kindwise plant.id v3 ─────────────────────────────────────────────────────
 *
 * JSON, with the images base64-encoded in one array. plant.id takes multiple images of one
 * plant in a single identification and has no organ vocabulary, so the organ tags collected
 * by the UI are simply unused here — the observation model is provider-neutral and each
 * adapter uses what its provider understands.
 */
export async function identifyWithPlantId(
  images: readonly ObservationImage[],
  apiKey: string,
): Promise<IdentificationResult> {
  if (!apiKey) {
    return failure(
      'plantid',
      'unconfigured',
      'PLANT_ID_API_KEY is not set, so plant.id cannot be used.',
    );
  }

  let encoded: string[];
  try {
    encoded = await Promise.all(images.map((image) => toBase64(image.file)));
  } catch {
    return failure('plantid', 'provider', 'A photograph could not be encoded for plant.id.');
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `https://api.plant.id/v3/identification?details=${encodeURIComponent(PLANT_ID_DETAILS)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Api-Key': apiKey },
        body: JSON.stringify({ images: encoded }),
      },
    );
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === 'AbortError';
    return failure(
      'plantid',
      aborted ? 'timeout' : 'network',
      aborted ? 'plant.id did not answer in time.' : 'plant.id could not be reached.',
    );
  }

  if (response.status === 401 || response.status === 403) {
    return failure('plantid', 'auth', 'plant.id rejected this deployment’s key.', response.status);
  }
  if (response.status === 429) {
    return failure('plantid', 'rateLimited', 'plant.id is rate limiting this deployment.', 429);
  }
  if (response.status === 402) {
    // Credit-based: out of credits is a distinct, actionable state, not a generic failure.
    return failure('plantid', 'rateLimited', 'This deployment is out of plant.id credits.', 402);
  }
  if (!response.ok) {
    return failure('plantid', 'provider', `plant.id returned ${response.status}.`, response.status);
  }

  try {
    return parsePlantIdResponse(await response.json());
  } catch {
    return failure('plantid', 'schema', 'plant.id returned a body that is not JSON.');
  }
}

/** Base64 without a data: prefix, which is what the API expects. */
async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  // Chunked: spreading a multi-megabyte array into `fromCharCode` blows the call stack.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
