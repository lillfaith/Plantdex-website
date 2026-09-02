import type { IconName } from '@/components/icons/PlantdexIcon';
import { getAchievement } from './achievements';
import { getHerb } from './deck';
import type { Cosmetic } from './cosmetics';
import type { HerbdexState } from './types';

/**
 * The six borders a player can put around their profile avatar.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHOLE TAILWIND CLASSES, NEVER INTERPOLATED. Tailwind compiles only the utilities it can
 * find as literal text in source, so a built string like `border-${tone}-500` produces a
 * class that exists in the DOM and in no stylesheet. This codebase has shipped that twice.
 *
 * AND NO `ring-*`, NO ARBITRARY `shadow-[…]`. Both compose into `box-shadow`, which the
 * card surfaces already own — the avatar's own shadow silently won and the frame painted
 * nothing at all, visible only by reading computed style. Every layer here is either a
 * plain `border` on its own element or a blurred background, which compose with nothing.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE LADDER IS FRONT-LOADED ON PURPOSE. Two of the six are reachable in a first session,
 * so a brand-new player opens the cabinet and finds things already in it rather than a wall
 * of locks. One is endgame. `AchievementShelf` makes the same argument for showing earned
 * and unearned together: a set with gaps reads as something you are partway through, where
 * a list of locked entries reads as a list of failures.
 */
export interface FieldFrame extends Cosmetic {
  /** Border and fill on the avatar's own frame. */
  ring: string;
  /** A second border on an inset element behind it, for the richer frames. */
  outer?: string;
  /** A blurred wash behind both, for the two brightest frames only. */
  bloom?: string;
  /** Shown beside the name in the cabinet. Decorative — the name is always printed. */
  icon: IconName;
}

/** How many cards this state has recorded as mastered, ignoring ids that are not real. */
function masteredCount(state: HerbdexState): number {
  return Object.keys(state.mastered).filter((id) => getHerb(id)).length;
}

/**
 * Re-uses the achievement's OWN predicate rather than restating its threshold.
 *
 * "Discover 10 herbs" written twice is two numbers that can disagree, and the cabinet
 * printing a condition the code does not check is the specific failure this avoids. An
 * unknown id is false, so a renamed achievement locks its frame rather than crashing a page.
 */
function achievement(id: string) {
  return (state: HerbdexState) => Boolean(getAchievement(id)?.isUnlocked(state));
}

export const MASTERED_FOR_BLOOM = 10;

export const FIELD_FRAMES: readonly FieldFrame[] = [
  {
    id: 'field-notes',
    name: 'Field Notes',
    condition: 'Yours from the start.',
    isUnlocked: () => true,
    ring: 'border border-violet-600 bg-plum-800/70',
    icon: 'journal',
  },
  {
    id: 'amber-ring',
    name: 'Amber Ring',
    condition: 'Discover your first plant.',
    isUnlocked: achievement('first-find'),
    ring: 'border-2 border-gold-500/70 bg-gold-500/[0.07]',
    icon: 'sprout',
  },
  {
    id: 'laurel',
    name: 'Laurel',
    condition: 'Discover 10 plants.',
    isUnlocked: achievement('forager-10'),
    ring: 'border-2 border-gold-400 bg-gold-500/[0.1]',
    outer: 'border border-gold-500/40',
    icon: 'laurel',
  },
  {
    id: 'compass-rose',
    name: 'Compass Rose',
    condition: 'Discover a plant from every habitat.',
    isUnlocked: achievement('habitat-sweep'),
    ring: 'border-2 border-cyan-accent/75 bg-cyan-accent/[0.09]',
    outer: 'border border-cyan-accent/35',
    icon: 'compass',
  },
  {
    id: 'bloom',
    name: 'Bloom',
    condition: `Master ${MASTERED_FOR_BLOOM} cards.`,
    isUnlocked: (state) => masteredCount(state) >= MASTERED_FOR_BLOOM,
    ring: 'border-2 border-pink-accent/80 bg-pink-accent/[0.1]',
    outer: 'border border-pink-accent/35',
    bloom: 'bg-pink-accent/15 blur-md',
    icon: 'bloom',
  },
  {
    id: 'starlight',
    name: 'Starlight',
    condition: 'Discover every plant in the deck.',
    isUnlocked: achievement('complete-collection'),
    ring: 'border-2 border-gold-300 bg-gold-500/[0.12]',
    outer: 'border border-mystery-lilac/55',
    bloom: 'bg-gold-500/20 blur-md',
    icon: 'crystal',
  },
] as const;

/** The frame everyone has. Also what an unearned or unknown selection falls back to. */
export const DEFAULT_FRAME_ID = 'field-notes';

export function getFrame(id: string | null | undefined): FieldFrame | undefined {
  return FIELD_FRAMES.find((frame) => frame.id === id);
}

/** The chosen frame if it is real and earned, otherwise the default. Never throws. */
export function resolveFrame(id: string | null | undefined, state: HerbdexState): FieldFrame {
  const chosen = getFrame(id);
  if (chosen?.isUnlocked(state)) return chosen;
  return getFrame(DEFAULT_FRAME_ID)!;
}
