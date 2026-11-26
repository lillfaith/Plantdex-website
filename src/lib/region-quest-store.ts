/**
 * The completion record for a regional quest: written once, never revoked.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SAME SPLIT `research.ts` USES — PROGRESS IS DERIVED, COMPLETION IS RECORDED — AT THE
 * ONLY SCOPE THIS LANE MAY WRITE.
 *
 * Whether the trail is complete is always derivable from `discoveries` (`trailProgress`),
 * and discoveries are write-once and synced for a signed-in player, so "complete" is
 * already the same answer on every device and after every reload, signed in or out. What
 * this record adds is the DATE it was first seen complete and a ratchet: once written, a
 * later read can never un-complete it, whatever the collection looks like then.
 *
 * IT IS DEVICE-LOCAL, KEYED BY ACCOUNT. Recording it server-side, or paying anything for
 * it, goes through the research engine and the schema, which this lane does not own; that
 * request is `agents/requests/quests-q4-georgia-completion-record.md`. Until then a second
 * device shows the trail complete (derived) with no date.
 *
 * KEYED BY ACCOUNT SCOPE, not browser — the shape of bug this repository has shipped three
 * times — and under `plantdex.` so account deletion's prefix sweep takes every scope.
 * The stored value is `{ questId: ISO-timestamp }`: no region choice, no coordinates, no
 * herb ids.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const QUEST_COMPLETION_KEY = 'plantdex.region-quest.v1';

export type QuestCompletions = Readonly<Record<string, string>>;

export const NO_COMPLETIONS: QuestCompletions = Object.freeze({});

export type CompletionStorage = Pick<Storage, 'getItem' | 'setItem'>;

function key(scope: string): string {
  return `${QUEST_COMPLETION_KEY}:${scope}`;
}

function defaultStorage(): CompletionStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Validate on read: keep only string-to-ISO-string entries, drop everything else. */
export function parseCompletions(raw: unknown): QuestCompletions {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return NO_COMPLETIONS;
  const out: Record<string, string> = {};
  for (const [id, at] of Object.entries(raw as Record<string, unknown>)) {
    if (/^[a-z0-9:-]{1,80}$/.test(id) && typeof at === 'string' && !Number.isNaN(Date.parse(at))) {
      out[id] = at;
    }
  }
  return Object.keys(out).length === 0 ? NO_COMPLETIONS : out;
}

export function readCompletions(
  scope: string,
  storage: CompletionStorage | null = defaultStorage(),
): QuestCompletions {
  if (!storage) return NO_COMPLETIONS;
  try {
    const raw = storage.getItem(key(scope));
    return raw === null ? NO_COMPLETIONS : parseCompletions(JSON.parse(raw));
  } catch {
    return NO_COMPLETIONS;
  }
}

/**
 * Record a completion. Returns the SAME OBJECT when nothing is new — not complete, or
 * already recorded — like every stage transition in this app. It never overwrites a date
 * and has no way to remove one.
 */
export function recordCompletion(
  current: QuestCompletions,
  questId: string,
  complete: boolean,
  at: string,
): QuestCompletions {
  if (!complete || current[questId] !== undefined) return current;
  return { ...current, [questId]: at };
}

export function writeCompletions(
  scope: string,
  next: QuestCompletions,
  storage: CompletionStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(key(scope), JSON.stringify(next));
  } catch {
    // A record that cannot be saved must not break the page that derived it: the trail is
    // still complete, derived from the collection, and simply carries no date.
  }
}

// --- Subscription, for the React hook that lives with the component --------------

const listeners = new Set<() => void>();

export function subscribeCompletions(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key.startsWith(QUEST_COMPLETION_KEY)) listener();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

export function emitCompletions(): void {
  for (const listener of listeners) listener();
}
