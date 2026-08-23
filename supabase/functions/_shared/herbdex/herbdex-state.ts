import type { HerbdexState } from './types.ts';

/**
 * The pure shape and defaults of Herbdex progress: no browser API, no React, no Deno-unsafe
 * types. Split out of `storage.ts` (which also holds the browser-only adapters) so this
 * half can be imported unmodified by the Supabase edge function that recomputes mastery and
 * research server-side — see `scripts/sync-edge-shared.mjs`.
 */

export const STORAGE_VERSION = 3;

export function emptyState(): HerbdexState {
  return {
    version: STORAGE_VERSION,
    discoveries: {},
    learned: {},
    mastered: {},
    research: {},
    achievements: {},
  };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Keep only string→string entries; drop anything malformed rather than throwing. */
export function sanitizeTimestamps(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' && entry.length > 0) out[key] = entry;
  }
  return out;
}

/**
 * Every stored version this code can still read.
 *
 *   v1 → discoveries + achievements
 *   v2 → adds learned + mastered   (three-stage card mastery)
 *   v3 → adds research             (Field Research)
 *
 * Migrating is a single pass rather than one branch per version because EVERY schema
 * change so far has been purely ADDITIVE: each new version only introduced maps that
 * `sanitizeTimestamps` already turns into `{}` when absent. The moment a future version
 * renames, reshapes or drops a field, that stops being true — at which point this needs a
 * real per-version branch, not another entry in this array.
 */
const MIGRATABLE_VERSIONS: readonly number[] = [1, 2, STORAGE_VERSION];

/**
 * Coerce arbitrary parsed JSON into a valid state.
 *
 * Storage is attacker-adjacent (any script or the user can edit localStorage, and a server
 * row-fold goes through the same function), so nothing here trusts its input. Anything
 * unrecognised degrades to an empty collection instead of crashing.
 */
export function parseState(raw: unknown): HerbdexState {
  if (!isPlainObject(raw)) return emptyState();

  // An unrecognised version — from the future, or nonsense — is unreadable rather than
  // misinterpreted. Note what that means for anything NOT listed above: falling through
  // here silently wipes a real collection, which is the worst possible failure mode for
  // data someone spent a season building. Never bump STORAGE_VERSION without adding it.
  if (!MIGRATABLE_VERSIONS.includes(raw.version as number)) return emptyState();

  return {
    version: STORAGE_VERSION,
    discoveries: sanitizeTimestamps(raw.discoveries),
    learned: sanitizeTimestamps(raw.learned),
    mastered: sanitizeTimestamps(raw.mastered),
    research: sanitizeTimestamps(raw.research),
    achievements: sanitizeTimestamps(raw.achievements),
  };
}
