import { supabase } from './supabase-client';
import { STORAGE_KEY } from './storage';
import { emptyState, parseState } from './herbdex-state';
import { getAllSightings, type Sighting } from './sightings';
import { REVEALS_STORAGE_KEY } from './reveals';
import type { HerbdexState } from './types';

/**
 * "DOWNLOAD MY DATA" — everything Plantdex holds about one person, as one JSON file.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT ONLY EVER READS THE CALLER'S OWN DATA, and it has no parameter that could point it
 * anywhere else. Signed in, every query goes through the ordinary anon-key client, so Row
 * Level Security scopes it to the caller's rows exactly as it does everywhere else in the
 * app — there is no service-role path here and no user id accepted from anywhere. Signed
 * out, it reads this browser's own storage, which is all there is.
 *
 * WHY XP AND LEVEL ARE COMPUTED, NOT COPIED. They are derived values and are not stored
 * anywhere (CLAUDE.md: "XP is derived, never stored"). Writing them into the export as if
 * they were records would put a number in a document people reasonably read as a copy of
 * the database. They are omitted, and the export says so.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PHOTOGRAPHS. Embedded as data URIs, because an export that leaves out the pictures is
 * not an export of a nature journal. There is a size ceiling — a browser has to hold the
 * whole thing in memory to build the file, and a very long journal of 1280px JPEGs can
 * exceed what it will do — so photos are embedded until the budget runs out and the rest
 * are listed by name under `photos.omitted`, with the reason. Never silently dropped.
 */

/** The most photo data to embed. Past this, remaining photos are listed rather than included. */
export const PHOTO_BUDGET_BYTES = 40 * 1024 * 1024;

export const EXPORT_FORMAT_VERSION = 1;

export interface ExportedPhoto {
  sightingId: string;
  /** Storage path (signed in) or IndexedDB key (signed out). */
  reference: string;
  /** `data:image/jpeg;base64,...`, absent when the photo was omitted. */
  dataUri?: string;
  bytes?: number;
}

export interface AccountExport {
  format: 'plantdex-export';
  formatVersion: number;
  exportedAt: string;
  source: 'account' | 'this-device';
  /** Present only for a signed-in export — the caller's own address, from their own session. */
  email?: string;
  notes: string[];
  collection: HerbdexState;
  reveals: string[];
  sightings: Sighting[];
  photos: {
    included: ExportedPhoto[];
    omitted: { sightingId: string; reference: string; reason: string }[];
  };
}

const NOTES = [
  'This file is everything Plantdex holds for this account or device. It is not a backup format: importing it is not supported.',
  'XP and level are deliberately absent. They are recalculated from the records below every time they are shown and are never stored, so there is no stored value to export.',
  'Dates are ISO 8601, in UTC.',
];

/**
 * A blob as a `data:` URI.
 *
 * Built from `arrayBuffer()` and `btoa` rather than `FileReader`, which exists only in a
 * browser — the live e2e suite drives this exact function from Node, and a `FileReader`
 * version passed in the browser while failing there with "FileReader is not defined". The
 * bytes are encoded in chunks because `String.fromCharCode(...bytes)` overflows the call
 * stack on anything the size of a real photograph.
 */
/**
 * The MIME type to label a photograph with.
 *
 * `blob.type` is empty for a Storage download outside a browser, which labelled every
 * exported photograph `application/octet-stream` — a data URI no viewer will render, in the
 * one file somebody keeps after deleting their account. The path always carries the real
 * extension because the uploader chose it (`{userId}/{sightingId}.{extension}`), so it is
 * the reliable half.
 */
function photoMimeType(blob: Blob, reference: string): string {
  const extension = reference.split('.').pop()?.toLowerCase() ?? '';
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  // The extension is checked FIRST, not as a fallback: a Storage download reports
  // `application/octet-stream`, which is non-empty and therefore wins any `blob.type ||`
  // arrangement while still being useless to a viewer.
  return blob.type && blob.type !== 'application/octet-stream'
    ? blob.type
    : 'application/octet-stream';
}

async function blobToDataUri(blob: Blob, mimeType: string): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function readLocalCollection(): HerbdexState {
  try {
    return parseState(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyState();
  }
}

function readLocalReveals(): string[] {
  try {
    const raw = window.localStorage.getItem(REVEALS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Collects photos into the export, newest sighting first, until the budget is spent.
 *
 * Ordering matters: if something has to be left out it should be the oldest, not whichever
 * the loop happened to reach last.
 */
async function collectPhotos(
  sightings: Sighting[],
  fetchBlob: (reference: string) => Promise<Blob | null>,
): Promise<AccountExport['photos']> {
  const included: ExportedPhoto[] = [];
  const omitted: AccountExport['photos']['omitted'] = [];
  let spent = 0;

  for (const sighting of sightings) {
    const reference = sighting.photoId;
    if (!reference) continue;

    if (spent >= PHOTO_BUDGET_BYTES) {
      omitted.push({
        sightingId: sighting.id,
        reference,
        reason: `The export reached its ${Math.round(PHOTO_BUDGET_BYTES / 1024 / 1024)} MB photo limit. This photo is still in your account and was not deleted.`,
      });
      continue;
    }

    let blob: Blob | null = null;
    try {
      blob = await fetchBlob(reference);
    } catch {
      blob = null;
    }
    if (!blob) {
      omitted.push({
        sightingId: sighting.id,
        reference,
        reason: 'This photo could not be read. It may have been removed, or the download failed.',
      });
      continue;
    }

    spent += blob.size;
    included.push({
      sightingId: sighting.id,
      reference,
      dataUri: await blobToDataUri(blob, photoMimeType(blob, reference)),
      bytes: blob.size,
    });
  }

  return { included, omitted };
}

/** Everything stored on this device, for a signed-out player. */
export async function exportLocalData(): Promise<AccountExport> {
  const { getPhotoBlob } = await import('./photo-store');
  const sightings = [...getAllSightings()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    format: 'plantdex-export',
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    source: 'this-device',
    notes: [
      ...NOTES,
      'This export came from this browser’s own storage. Nothing here has ever been sent to a server.',
    ],
    collection: readLocalCollection(),
    reveals: readLocalReveals(),
    sightings,
    photos: await collectPhotos(sightings, (reference) => getPhotoBlob(reference)),
  };
}

/**
 * Everything the account holds, for a signed-in player.
 *
 * `userId` is used only to filter the queries readably. It is NOT what makes the export
 * safe — RLS is, and it would refuse another user's rows even if a different id were passed
 * here. `supabase.test.ts` proves that with a real second signed-in user.
 */
export async function exportAccountData(userId: string, email?: string): Promise<AccountExport> {
  if (!supabase) throw new Error('Accounts are not configured on this deployment.');
  const client = supabase;

  const [discoveries, learned, mastered, research, achievements, sightingRows] =
    await Promise.all([
      client.from('discoveries').select('herb_id, discovered_at').eq('user_id', userId),
      client.from('learned').select('herb_id, learned_at').eq('user_id', userId),
      client.from('mastered').select('herb_id, mastered_at').eq('user_id', userId),
      client.from('research_completions').select('task_id, completed_at').eq('user_id', userId),
      client
        .from('unlocked_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId),
      client
        .from('sightings')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);

  for (const [name, result] of Object.entries({
    discoveries,
    learned,
    mastered,
    research,
    achievements,
    sightings: sightingRows,
  })) {
    // A partial export presented as complete is worse than a failed one: somebody deleting
    // their account afterwards would believe they had kept a copy.
    if (result.error) throw new Error(`Could not read your ${name}: ${result.error.message}`);
  }

  const record = (
    rows: Record<string, unknown>[] | null,
    idKey: string,
    atKey: string,
  ): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const row of rows ?? []) {
      const id = row[idKey];
      const at = row[atKey];
      if (typeof id === 'string' && typeof at === 'string') out[id] = at;
    }
    return out;
  };

  const collection: HerbdexState = {
    ...emptyState(),
    discoveries: record(discoveries.data, 'herb_id', 'discovered_at'),
    learned: record(learned.data, 'herb_id', 'learned_at'),
    mastered: record(mastered.data, 'herb_id', 'mastered_at'),
    research: record(research.data, 'task_id', 'completed_at'),
    achievements: record(achievements.data, 'achievement_id', 'unlocked_at'),
  };

  const sightings: Sighting[] = (sightingRows.data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    herbId: String(row.herb_id),
    date: String(row.date),
    region: typeof row.region === 'string' ? row.region : undefined,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    growthStage: (typeof row.growth_stage === 'string' ? row.growth_stage : undefined) as
      | Sighting['growthStage']
      | undefined,
    foundAgain: row.found_again === true,
    photoId: typeof row.photo_path === 'string' ? row.photo_path : undefined,
    createdAt: String(row.created_at),
  }));

  return {
    format: 'plantdex-export',
    formatVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    source: 'account',
    email,
    notes: [
      ...NOTES,
      'Reveals and the daily research board are not part of an account. They live only in the browser you used, so they are not in this file.',
    ],
    collection,
    // Reveals are deliberately never sent to the server (CLAUDE.md: "Reveal is not
    // discovery"), so an account export genuinely has none to give.
    reveals: [],
    sightings,
    photos: await collectPhotos(sightings, async (path) => {
      const { data, error } = await client.storage.from('sighting-photos').download(path);
      if (error) return null;
      return data;
    }),
  };
}

/** Hands the file to the browser. Split out so the export itself stays testable in Node. */
export function downloadExport(data: AccountExport): void {
  const stamp = data.exportedAt.slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `plantdex-data-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
