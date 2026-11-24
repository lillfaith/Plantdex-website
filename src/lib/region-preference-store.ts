import { parsePreference, serializePreference, EMPTY_PREFERENCE, type IsKnownRegion, type RegionPreference } from './region-preference';

/**
 * Storage for `RegionPreference`, keyed per account scope like `region-store.ts` and under
 * `plantdex.` so account deletion's prefix sweep takes every scope.
 *
 * Deliberately a DIFFERENT key from `plantdex.region.v1`: that one holds a bare region id read by
 * today's `/quests`, which must not see this. Storage is injectable, no React, no event bus.
 * Reads validate; a missing, unreadable or corrupt entry is the empty preference. Writes contain
 * only what `serializePreference` emits: ids and enum strings.
 */
export const REGION_PREFERENCE_KEY = 'plantdex.region-pref.v1';

export type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function key(scope: string): string {
  return `${REGION_PREFERENCE_KEY}:${scope}`;
}

function defaultStorage(): PreferenceStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readPreference(
  scope: string,
  isKnown: IsKnownRegion,
  storage: PreferenceStorage | null = defaultStorage(),
): RegionPreference {
  if (!storage) return EMPTY_PREFERENCE;
  try {
    const raw = storage.getItem(key(scope));
    return raw === null ? EMPTY_PREFERENCE : parsePreference(JSON.parse(raw), isKnown);
  } catch {
    return EMPTY_PREFERENCE;
  }
}

export function writePreference(
  scope: string,
  pref: RegionPreference,
  storage: PreferenceStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    if (pref.home === null && pref.extras.length === 0 && pref.neighbours.length === 0 && pref.locationAsk === 'never') {
      storage.removeItem(key(scope));
    } else {
      storage.setItem(key(scope), serializePreference(pref));
    }
  } catch {
    // A preference that cannot be saved must not break the page that set it.
  }
}
