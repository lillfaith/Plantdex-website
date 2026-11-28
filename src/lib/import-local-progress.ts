import { supabase } from './supabase-client';
import { createLocalStorageAdapter } from './storage';
import { getAllSightings } from './sightings';
import { getLocalFinds } from './local-seed-shelf';
import { findToRow } from './remote-seed-shelf';
import { ensureCanonicalPackets } from './species-packets';
import type { HerbdexState } from './types';

/**
 * One-time merge of this browser's local JOURNAL into a freshly signed-in account.
 *
 * OWNER'S DECISION (security blocker): every new collectible unlock comes from the in-app
 * camera and a server receipt. A signed-out device's `discoveries`, `learned`, `mastered`,
 * `research` and the achievements derived from them are self-declared, so they are NEVER
 * written to the server by this module. They stay on the device as local-only legacy progress
 * (nothing is deleted, nothing is stranded) and are only COUNTED here, so the dialog can say
 * truthfully what stayed. See docs/release/import-and-grandfathering-policy.md.
 *
 * What still travels: sightings (the player's own journal, with photos) and the Seed Shelf.
 * Every record is written on its own, so one refused row never blocks valid ones, and a
 * permanent refusal (PostgREST 42501) is told apart from a transient failure. Only transient
 * failures keep the offer open. Idempotent: re-importing is a no-op via ignoreDuplicates.
 */

/**
 * Keyed by account, not just by device: "offered once per account" is the actual contract,
 * and a single global flag broke it — importing into one account on a shared device
 * silently denied the offer to every other account that ever signed in on that browser.
 */
function offeredKey(userId: string): string {
  return `plantdex.local-import-offered.v1:${userId}`;
}

/** Whether the import dialog has already been shown to THIS account (accepted, or nothing to import). */
export function hasImportBeenOffered(userId: string): boolean {
  try {
    return window.localStorage.getItem(offeredKey(userId)) === 'true';
  } catch {
    return true; // Fail closed: never nag if storage is blocked.
  }
}

export function markImportOffered(userId: string): void {
  try {
    window.localStorage.setItem(offeredKey(userId), 'true');
  } catch {
    // Non-fatal — worst case the dialog is offered again next sign-in.
  }
}

export async function hasLocalProgressToImport(): Promise<boolean> {
  // Local discoveries alone are NOT importable (see the header), so they do not earn the offer.
  if (getAllSightings().length > 0) return true;
  // A shelf on its own is worth the offer: somebody can scan a dozen plants the deck does
  // not carry before they ever discover a card, and that is exactly the person whose finds
  // would otherwise be stranded on one device.
  return getLocalFinds().length > 0;
}

/** PostgREST 42501 / HTTP 403: the database refused this row for good; retrying cannot help. */
function isPermanentRefusal(error: { code?: string; status?: number } | null | undefined): boolean {
  return !!error && (error.code === '42501' || error.status === 403);
}

/** What happened to one part of the import. `imported` counts rows written or already present. */
export interface PartResult {
  total: number;
  imported: number;
  /** Permanently refused (42501): kept on the device, not a failure. */
  refused: number;
  /** Transient failures: the offer stays open so a retry can finish them. */
  failed: number;
}

const emptyPart = (): PartResult => ({ total: 0, imported: 0, refused: 0, failed: 0 });

async function importSightingPhoto(userId: string, sightingId: string, photoId: string): Promise<string | undefined> {
  if (!supabase) return undefined;
  try {
    const { getPhotoUrl } = await import('./photo-store');
    const objectUrl = await getPhotoUrl(photoId);
    if (!objectUrl) return undefined;
    const blob = await (await fetch(objectUrl)).blob();
    URL.revokeObjectURL(objectUrl);
    const path = `${userId}/${sightingId}.jpg`;
    const { error } = await supabase.storage
      .from('sighting-photos')
      .upload(path, blob, { contentType: blob.type || 'image/jpeg' });
    return error ? undefined : path;
  } catch {
    // Losing a photo on import must not lose the sighting's date and notes.
    return undefined;
  }
}

async function importSightings(userId: string): Promise<PartResult> {
  const result = emptyPart();
  if (!supabase) return result;
  // Sequential, not parallel: each may move a photo out of IndexedDB, and a personal
  // journal is small enough that there is no real benefit to racing N uploads at once.
  for (const sighting of getAllSightings()) {
    result.total += 1;
    const photoPath = sighting.photoId
      ? await importSightingPhoto(userId, sighting.id, sighting.photoId)
      : undefined;

    const { error } = await supabase.from('sightings').upsert(
      {
        id: sighting.id,
        user_id: userId,
        herb_id: sighting.herbId,
        date: sighting.date,
        region: sighting.region ?? null,
        notes: sighting.notes ?? null,
        growth_stage: sighting.growthStage ?? null,
        found_again: sighting.foundAgain ?? null,
        photo_path: photoPath ?? null,
        created_at: sighting.createdAt,
        /*
         * THE OBSERVED TAXON TRAVELS, AND THIS IS THE PATH IT WAS NEAREST TO BEING LOST ON.
         *
         * A signed-out player scans plants for weeks and then makes an account; the import is
         * the ONLY thing that carries those observations across. This object is built by hand
         * rather than spread from the sighting, so every field added to `Sighting` has to be
         * added here too — and a field left out is not an error, it is a successful upsert
         * that stores null. That is the exact failure this whole pass is about: the card
         * survives, the plant does not.
         *
         * `sightings-import.test.ts` compares this object's keys against `Sighting`'s own
         * fields, so the next one cannot be forgotten quietly.
         */
        observed_taxon_provider_name: sighting.observedTaxonProviderName ?? null,
        observed_taxon_name: sighting.observedTaxonName ?? null,
        observed_taxon_key: sighting.observedTaxonKey ?? null,
        observed_taxon_rank: sighting.observedTaxonRank ?? null,
        eligibility: sighting.eligibility ?? null,
        species_confidence: sighting.speciesConfidence ?? null,
        identification_provider: sighting.identificationProvider ?? null,
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (!error) result.imported += 1;
    else if (isPermanentRefusal(error)) result.refused += 1;
    else {
      console.warn('[plantdex] import failed for a sighting', error);
      result.failed += 1;
    }
  }
  return result;
}

/**
 * The device's Seed Shelf, row for row.
 *
 * `ignoreDuplicates` on the find's own id, so re-running the import writes nothing twice —
 * and because the shelf is derived by grouping finds, a duplicate would have been visible as
 * an inflated encounter count rather than as a second packet.
 */
async function importSeedShelf(userId: string): Promise<PartResult> {
  const result = emptyPart();
  if (!supabase) return result;
  const finds = getLocalFinds();
  result.total = finds.length;
  if (finds.length === 0) return result;
  const upsert = (rows: ReturnType<typeof findToRow>[]) =>
    supabase!.from('seed_shelf').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  const batch = await upsert(finds.map((find) => findToRow(userId, find)));
  const landed: typeof finds = [];
  if (!batch.error) {
    result.imported = finds.length;
    landed.push(...finds);
  } else {
    // One bad row must not strand the rest: fall back to row by row.
    for (const find of finds) {
      const { error } = await upsert([findToRow(userId, find)]);
      if (!error) {
        result.imported += 1;
        landed.push(find);
      } else if (isPermanentRefusal(error)) result.refused += 1;
      else {
        console.warn('[plantdex] import failed for a seed shelf find', error);
        result.failed += 1;
      }
    }
  }
  if (landed.length === 0) return result;

  /*
   * Introduce anything Plantdex has never seen to the canonical registry.
   *
   * This is where a signed-out shelf stops being local: the packets that device derived for
   * itself are superseded by the canonical ones, which for a species minted under the same
   * generator version are identical, and for one minted earlier are the artwork everybody
   * else already sees. One call for the whole shelf; species already registered are left
   * exactly as they are.
   *
   * A failure here does not fail the import. The rows — the player's actual finds, with
   * their dates — are already safely across, and the registry fills in on the next save.
   */
  /*
   * The token from each find's own scan rides along. THIS is why the attestation is stored on
   * the local find rather than only held in memory: a signed-out player scans a plant, shelves
   * it, and signs in days or weeks later, and this import is the moment that species gets a
   * chance to enter the canon. Preferring the earliest find per species keeps the token that
   * actually accompanied the first sighting.
   */
  const bySpecies = new Map<string, (typeof finds)[number]>();
  for (const find of landed) {
    const held = bySpecies.get(find.speciesKey);
    if (!held || find.foundAt < held.foundAt || (!held.attestation && find.attestation)) {
      bySpecies.set(find.speciesKey, find);
    }
  }
  await ensureCanonicalPackets(
    [...bySpecies.values()].map((find) => ({
      scientificName: find.scientificName,
      commonName: find.commonName,
      gbifId: find.gbifId,
      powoId: find.powoId,
      attestation: find.attestation,
    })),
  );
  return result;
}

/**
 * `ok` is false only when something failed TRANSIENTLY, so the dialog keeps the offer open for a
 * retry. A permanent refusal or a record deliberately left on the device is not a failure.
 */
export interface ImportOutcome {
  ok: boolean;
  /** Names of the parts with transient failures. Empty when `ok`. */
  failed: string[];
  /** Parts with at least one permanent (42501) refusal. Informational; never reopens the offer. */
  refused: string[];
  /** Per-part account of what was attempted. */
  parts: { sightings: PartResult; 'seed shelf': PartResult };
  /**
   * Local records deliberately NOT imported: collecting requires the in-app camera, so these stay on
   * this device as local-only legacy progress. Not a failure.
   */
  leftOnDevice: LeftOnDevice;
}

export interface LeftOnDevice {
  discoveries: number;
  learned: number;
  mastered: number;
  research: number;
}

export function countLeftOnDevice(state: HerbdexState): LeftOnDevice {
  return {
    discoveries: Object.keys(state.discoveries).length,
    learned: Object.keys(state.learned).length,
    mastered: Object.keys(state.mastered).length,
    research: Object.keys(state.research).length,
  };
}

export async function importLocalProgress(userId: string): Promise<ImportOutcome> {
  const state: HerbdexState = await createLocalStorageAdapter().load();
  const leftOnDevice = countLeftOnDevice(state);
  const none = { sightings: emptyPart(), 'seed shelf': emptyPart() };
  if (!supabase) {
    return { ok: false, failed: ['accounts are not configured'], refused: [], parts: none, leftOnDevice };
  }

  const parts = {
    sightings: await importSightings(userId),
    'seed shelf': await importSeedShelf(userId),
  };
  const names = Object.keys(parts) as (keyof typeof parts)[];
  const failed = names.filter((n) => parts[n].failed > 0);
  const refused = names.filter((n) => parts[n].refused > 0);
  return { ok: failed.length === 0, failed, refused, parts, leftOnDevice };
}
