import { fieldCardProgress, FIELD_CARD_SLOTS } from './field-cards';
import type { Progress } from './progression';

/**
 * ONE TRACK, NOT TWO METERS.
 *
 * Levels and Field Cards are both funded by the same XP total, and the UI used to draw them
 * as two separate bars stacked on top of each other — which says "two systems" to a player
 * for whom there is only ever one number going up. This module is the arithmetic that lets a
 * single bar carry both: where a reward falls inside the current level band, and what the one
 * line under the bar should say.
 *
 * IT COMPOSES; IT DOES NOT RESTATE. `field-cards.ts` owns the nine thresholds and
 * `progression.ts` owns the eleven level bands, and neither imports the other. That is worth
 * keeping — so this is a third module that reads both rather than a number copied into
 * either. Nothing here knows a threshold, and changing a ladder changes this for free.
 *
 * MEASURED, BECAUSE IT DECIDES THE DESIGN: at most ONE Field Card threshold falls inside any
 * single level band. Levels sit at 0/250/600/1200/2200/3600/5500/8000/10000/12500/15000 and
 * cards at 600/1200/2200/3600/5500/7000/8750/11000/14000, so the first five cards land
 * EXACTLY on a level-up and the last four sit alone mid-band. Crowding the bar is therefore
 * not a risk to design around today — but `milestonesInLevel` still returns a list rather
 * than an optional single marker, because that is a property of two ladders that are free to
 * move, not a guarantee either one makes.
 */

export interface XpMilestone {
  /** Which of the nine Field Card slots this threshold belongs to. */
  ordinal: number;
  /** The absolute XP total at which it unlocks. */
  xp: number;
  /** Where it sits along the CURRENT level band, 0-1, for positioning on the bar. */
  fraction: number;
  /** Whether the player's XP has already reached it. */
  earned: boolean;
  /** True when this threshold is also exactly where the next level begins. */
  atLevelUp: boolean;
}

/**
 * Field Card thresholds that fall inside the level band the player is currently in.
 *
 * The range is EXCLUSIVE at the floor and INCLUSIVE at the ceiling, and that asymmetry is the
 * whole placement rule. A threshold sitting exactly on the floor was crossed to get here — it
 * belongs to the band the player just left, and drawing it pinned to the left edge of a fresh
 * bar would re-announce a reward already collected. A threshold sitting exactly on the ceiling
 * is reached by the same XP that levels the player up, which is true of the first five cards,
 * and it belongs at the far right where the level-up is.
 *
 * Empty at max level: there is no band to position anything inside, and the ladder tops out
 * above the last card, so a player there holds all nine anyway.
 */
export function milestonesInLevel(progress: Progress): XpMilestone[] {
  if (progress.nextLevelXp === null || progress.xpForLevel === null) return [];
  const span = progress.xpForLevel;
  if (span <= 0) return [];

  return FIELD_CARD_SLOTS.filter(
    (slot) => slot.xp > progress.levelFloor && slot.xp <= progress.nextLevelXp!,
  ).map((slot) => ({
    ordinal: slot.ordinal,
    xp: slot.xp,
    fraction: (slot.xp - progress.levelFloor) / span,
    earned: progress.xp >= slot.xp,
    atLevelUp: slot.xp === progress.nextLevelXp,
  }));
}

/** Digits as the rest of the app prints them. */
const n = (value: number): string => value.toLocaleString();

/**
 * The one line under the XP bar, naming whichever rewards are actually ahead.
 *
 * Four shapes, and which one appears is decided by the two ladders rather than by a flag:
 *
 *   both at once   "1,625 XP to Level 7 + your next Field Card"
 *   card first     "425 XP to next Field Card · 1,625 XP to Level 7"
 *   level first    "300 XP to Level 7 · 1,100 XP to next Field Card"
 *   cards finished "1,625 XP to Level 7"
 *
 * Nearest first in the two-part forms, because the line is read as "what happens next".
 *
 * ALL FOUR ARE LIVE, and I got this wrong once in a way worth recording. Checking only
 * whether a card threshold falls INSIDE the current band, I concluded "level first" was
 * unreachable — every card either coincides with a level-up or precedes one. That reasoning
 * missed the ordinary case where the band's card is already EARNED and the next one is a band
 * or two away: past 8,750 the next card is 11,000 while the next level is 10,000, so the
 * level arrives first. Sweeping every XP total from 0 to 15,000 in 25s finds 160 that produce
 * it — and 0 XP is one of them, because a new player is 250 from Level 2 and 600 from their
 * first Field Card. It is the first line anyone ever reads. A claim about which states are
 * reachable is a measurement, not a deduction from the thresholds.
 */
export function progressionSubtext(progress: Progress): string {
  const toLevel = progress.nextLevelXp === null ? null : progress.nextLevelXp - progress.xp;
  const { next, remaining } = fieldCardProgress(progress.xp);

  // Max level, which on the current ladder also means every card is held.
  if (toLevel === null) {
    return next ? `${n(remaining)} XP to next Field Card` : 'Highest level reached.';
  }

  const levelPart = `${n(toLevel)} XP to Level ${progress.level + 1}`;
  if (!next) return levelPart;

  // The same XP buys both, so it is one event and reads as one clause.
  if (remaining === toLevel) return `${levelPart} + your next Field Card`;

  const cardPart = `${n(remaining)} XP to next Field Card`;
  return remaining < toLevel ? `${cardPart} · ${levelPart}` : `${levelPart} · ${cardPart}`;
}
