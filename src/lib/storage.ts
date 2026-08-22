import type { HerbdexState } from './types';

/**
 * Persistence for Herbdex progress.
 *
 * V0.2 stores progress in the browser only. The `HerbdexStorage` interface is the seam
 * that V0.3 replaces with a server-backed adapter.
 *
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ V0.3 IMPLEMENTORS — READ THIS                                              │
 * │                                                                            │
 * │ The server adapter must:                                                   │
 * │  • derive the user from the authenticated session, NEVER from a userId     │
 * │    sent by the browser (AGENTS.md: "do not trust userId values supplied    │
 * │    by the browser without authorization");                                 │
 * │  • enforce row ownership in the database layer, not by filtering in        │
 * │    client code, so one user can never read another's collection;           │
 * │  • recompute XP server-side from its own discovery rows and ignore any XP  │
 * │    total the client reports;                                               │
 * │  • enforce one discovery row per (user, herb) with a uniqueness            │
 * │    constraint so a replayed request cannot award XP twice.                 │
 * └────────────────────────────────────────────────────────────────────────────┘
 */

export const STORAGE_VERSION = 2;
export const STORAGE_KEY = 'plantdex.herbdex.v1';

export interface HerbdexStorage {
  load(): HerbdexState;
  save(state: HerbdexState): void;
  clear(): void;
}

export function emptyState(): HerbdexState {
  return {
    version: STORAGE_VERSION,
    discoveries: {},
    learned: {},
    mastered: {},
    achievements: {},
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Keep only string→string entries; drop anything malformed rather than throwing. */
function sanitizeTimestamps(value: unknown): Record<string, string> {
  if (!isPlainObject(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' && entry.length > 0) out[key] = entry;
  }
  return out;
}

/**
 * Coerce arbitrary parsed JSON into a valid state.
 *
 * Storage is attacker-adjacent (any script or the user can edit localStorage), and old
 * versions may linger, so nothing here trusts its input. Anything unrecognised degrades
 * to an empty collection instead of crashing the page.
 */
export function parseState(raw: unknown): HerbdexState {
  if (!isPlainObject(raw)) return emptyState();
  // Version 1 had no `learned` or `mastered`. Migrate it rather than discarding it:
  // falling through to emptyState() here would silently wipe a real collection, which is
  // the worst possible failure mode for data the player spent a season building.
  if (raw.version === 1) {
    return {
      version: STORAGE_VERSION,
      discoveries: sanitizeTimestamps(raw.discoveries),
      learned: {},
      mastered: {},
      achievements: sanitizeTimestamps(raw.achievements),
    };
  }

  if (raw.version !== STORAGE_VERSION) {
    // A version from the future, or nonsense. Unreadable rather than misinterpreted.
    return emptyState();
  }

  return {
    version: STORAGE_VERSION,
    discoveries: sanitizeTimestamps(raw.discoveries),
    learned: sanitizeTimestamps(raw.learned),
    mastered: sanitizeTimestamps(raw.mastered),
    achievements: sanitizeTimestamps(raw.achievements),
  };
}

let warned = false;
function warnOnce(error: unknown): void {
  if (warned) return;
  warned = true;
  console.warn('[plantdex] Progress could not be saved to this browser.', error);
}

/**
 * localStorage-backed storage.
 *
 * Every access is wrapped: Safari private mode, disabled site data, and quota
 * exhaustion all throw on plain property access, and none of them should break the app.
 */
export function createLocalStorageAdapter(key: string = STORAGE_KEY): HerbdexStorage {
  function backing(): Storage | null {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage;
    } catch (error) {
      warnOnce(error);
      return null;
    }
  }

  return {
    load(): HerbdexState {
      const store = backing();
      if (!store) return emptyState();
      try {
        const raw = store.getItem(key);
        if (!raw) return emptyState();
        return parseState(JSON.parse(raw));
      } catch (error) {
        warnOnce(error);
        return emptyState();
      }
    },

    save(state: HerbdexState): void {
      const store = backing();
      if (!store) return;
      try {
        store.setItem(key, JSON.stringify(state));
      } catch (error) {
        warnOnce(error);
      }
    },

    clear(): void {
      const store = backing();
      if (!store) return;
      try {
        store.removeItem(key);
      } catch (error) {
        warnOnce(error);
      }
    },
  };
}

/** In-memory storage, used on the server and in tests. */
export function createMemoryAdapter(initial: HerbdexState = emptyState()): HerbdexStorage {
  let state = initial;
  return {
    load: () => state,
    save: (next) => {
      state = next;
    },
    clear: () => {
      state = emptyState();
    },
  };
}
