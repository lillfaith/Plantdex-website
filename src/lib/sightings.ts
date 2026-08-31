'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { deletePhoto } from './photo-store';

/**
 * The field journal: repeated observations of a species the player has discovered.
 *
 * A sighting is a *record*, not a discovery. Logging a tenth sighting of yarrow awards no
 * XP and changes no collection state — discovery happens once, sightings accumulate.
 * Kept in its own store for the same reason reveals are: the V0.3 server owns discoveries
 * and nothing here should be able to disturb them.
 *
 * PRIVACY: location is a free-text region ("North Georgia"), optional, and never a
 * coordinate. There is no geolocation call anywhere in this file, and nothing is shared
 * off-device. Precise locations of wild medicinal plants are exactly what should not be
 * collected by default.
 */

const STORAGE_KEY = 'plantdex.sightings.v1';

export const GROWTH_STAGES = [
  'emerging',
  'leafing',
  'budding',
  'flowering',
  'fruiting',
  'seeding',
  'dormant',
] as const;
export type GrowthStage = (typeof GROWTH_STAGES)[number];

export const GROWTH_STAGE_LABEL: Record<GrowthStage, string> = {
  emerging: 'Just emerging',
  leafing: 'Leafing out',
  budding: 'Budding',
  flowering: 'Flowering',
  fruiting: 'Fruiting',
  seeding: 'Going to seed',
  dormant: 'Dormant / died back',
};

export interface Sighting {
  id: string;
  herbId: string;
  /** ISO date (YYYY-MM-DD) of the observation. */
  date: string;
  /** Coarse, free-text region. Never coordinates. */
  region?: string;
  notes?: string;
  growthStage?: GrowthStage;
  /** Marks a return visit to a patch the player has seen before. */
  foundAgain?: boolean;
  /** Key into the IndexedDB photo store. */
  photoId?: string;
  createdAt: string;
}

export type NewSighting = Omit<Sighting, 'id' | 'createdAt'>;

let cache: Sighting[] | null = null;
const listeners = new Set<() => void>();

/**
 * Every field the journal will later DEREFERENCE, not just the ones that identify a record.
 *
 * `createdAt` is in this list because `byDateDesc` uses it as its tiebreak. Leaving it out
 * meant a stored record missing that field passed the guard, reached the sort, and threw —
 * and because the sort runs during render, that did not degrade the sightings list, it
 * blanked the entire plant page. Storage is the one input this app does not control:
 * legacy records, a hand-edited localStorage, or an import path that forgets a field all
 * produce it. Anything added to `Sighting` and then dereferenced belongs here too.
 */
function isSighting(value: unknown): value is Sighting {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.herbId === 'string' &&
    typeof s.date === 'string' &&
    typeof s.createdAt === 'string'
  );
}

function read(): Sighting[] {
  if (cache) return cache;
  cache = [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) cache = parsed.filter(isSighting);
    }
  } catch {
    // Blocked storage or malformed JSON: start empty rather than break the journal.
  }
  return cache;
}

function commit(next: Sighting[]): void {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal; the change still applies for this session.
  }
  for (const listener of listeners) listener();
}

export function addSighting(input: NewSighting): Sighting {
  const sighting: Sighting = {
    ...input,
    id: `sighting_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  commit([...read(), sighting]);
  return sighting;
}

export async function removeSighting(id: string): Promise<void> {
  const existing = read().find((s) => s.id === id);
  commit(read().filter((s) => s.id !== id));
  if (existing?.photoId) await deletePhoto(existing.photoId);
}

/** Newest first — a journal reads better most-recent-first. */
function byDateDesc(a: Sighting, b: Sighting): number {
  return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const EMPTY: Sighting[] = [];

// getSnapshot must return a stable reference or useSyncExternalStore loops, so the sorted
// per-herb and full lists are memoised against the array identity they were derived from.
let allCacheKey: Sighting[] | null = null;
let allCacheValue: Sighting[] = EMPTY;
function allSorted(): Sighting[] {
  const current = read();
  if (allCacheKey !== current) {
    allCacheKey = current;
    allCacheValue = [...current].sort(byDateDesc);
  }
  return allCacheValue;
}

const perHerbCache = new Map<string, { key: Sighting[]; value: Sighting[] }>();
function herbSorted(herbId: string): Sighting[] {
  const current = read();
  const hit = perHerbCache.get(herbId);
  if (hit && hit.key === current) return hit.value;
  const value = current.filter((s) => s.herbId === herbId).sort(byDateDesc);
  perHerbCache.set(herbId, { key: current, value });
  return value;
}

/** A one-off snapshot for the local-progress import flow — not reactive, unlike the hooks below. */
export function getAllSightings(): Sighting[] {
  return [...read()];
}

export function useSightings(herbId?: string): Sighting[] {
  return useSyncExternalStore(
    subscribe,
    () => (herbId ? herbSorted(herbId) : allSorted()),
    () => EMPTY,
  );
}

/**
 * Sightings logged per species, keyed by herb id. Drives card mastery and My Garden.
 *
 * Memoised against the list it is derived from: `useSightings` already returns a stable
 * array reference, so these counts only become a new object when a sighting is actually
 * added or removed. Anything that reacts to a change in them — the mastery reconciliation
 * in HerbdexProvider — would otherwise re-run on every single render.
 */
export function useSightingCounts(): Record<string, number> {
  const all = useSightings();
  return useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sighting of all) counts[sighting.herbId] = (counts[sighting.herbId] ?? 0) + 1;
    return counts;
  }, [all]);
}
