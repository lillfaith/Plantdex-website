import type { HerbdexState } from './types';

/**
 * The shape shared by the two cosmetic sets a player can choose from — avatar frames
 * (`field-frames.ts`) and field titles (`field-titles.ts`).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNLOCK STATE IS NEVER STORED. `isUnlocked` is a PURE FUNCTION OF `HerbdexState`, exactly
 * like `achievements.ts`, and for the same three reasons:
 *
 *   - it can be re-evaluated from scratch, so a cosmetic added later unlocks RETROACTIVELY
 *     for players who already met its condition;
 *   - there is no unlock record to fall out of step with the collection it describes;
 *   - the profile row therefore holds only CHOICES and no numbers, which is the rule the
 *     whole profile is built on (CLAUDE.md: "XP is derived, never stored").
 *
 * A predicate here must not read a clock, a random source or anything outside `state`. Two
 * calls with the same state must agree — the cabinet, the picker and the resolver all ask
 * the same question and must get the same answer.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `condition` is the sentence shown beside a locked entry. It is the human wording of the
 * predicate directly above it; a cabinet that says "Discover 10 herbs" while the code checks
 * for 25 is worse than one that says nothing.
 */
export interface Cosmetic {
  id: string;
  name: string;
  /** How it is earned, in words. Shown on locked entries. */
  condition: string;
  isUnlocked: (state: HerbdexState) => boolean;
}

/** The ids from `all` this state has earned, in registry order. */
export function unlockedIds(all: readonly Cosmetic[], state: HerbdexState): string[] {
  return all.filter((item) => item.isUnlocked(state)).map((item) => item.id);
}

/**
 * True when `id` names a real cosmetic in `all` AND this state has earned it.
 *
 * An unknown id is false rather than an error: the profile row is written by the client, so
 * a stale id from an older build must degrade to "not chosen" rather than throw on a page
 * somebody is trying to read.
 */
export function isUnlocked(all: readonly Cosmetic[], id: string | null, state: HerbdexState): boolean {
  if (!id) return false;
  const item = all.find((candidate) => candidate.id === id);
  return Boolean(item?.isUnlocked(state));
}
