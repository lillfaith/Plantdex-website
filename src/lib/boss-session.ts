/**
 * WHAT THIS BROWSER SESSION HAS ALREADY SEEN PASSED, so leaving the challenge and coming back does
 * not make a finished round look unfinished.
 *
 * SESSION-ONLY AND NEVER A RECORD. This is memory, not storage: nothing is written to disk, a
 * reload clears it, and it grants nothing. The authoritative record of a completed round is the
 * server's (`challenge_completions`), which a later step reads. Until then this only keeps the
 * screen consistent within one visit.
 *
 * IT IS FILLED ONLY FROM A VERDICT. In `on` mode a verdict is the server's answer, so a round is
 * never shown as done unless the server said so. In `preview` (development only, nothing
 * recorded) the verdict is the local one, and the two modes are kept apart by key so a simulated
 * pass can never be mistaken for a real one.
 */
import type { ActivityId } from './boss-form';

const passed = new Map<string, Set<ActivityId>>();

function key(mode: 'preview' | 'on', herbId: string): string {
  return `${mode}:${herbId}`;
}

export function passedThisSession(mode: 'preview' | 'on', herbId: string): ReadonlySet<ActivityId> {
  return new Set(passed.get(key(mode, herbId)) ?? []);
}

export function notePassed(mode: 'preview' | 'on', herbId: string, activity: ActivityId): void {
  const k = key(mode, herbId);
  const set = passed.get(k) ?? new Set<ActivityId>();
  set.add(activity);
  passed.set(k, set);
}

/** For tests, and for signing out: forget everything. */
export function clearPassedThisSession(): void {
  passed.clear();
}
