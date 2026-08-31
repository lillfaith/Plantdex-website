import type { IconName } from './PlantdexIcon';

/**
 * Which mark each achievement wears.
 *
 * WHY THIS IS NOT IN `achievements.ts`. That module carries an `icon` field today holding
 * an emoji (🌱 🌿 🌼 ✨ 💎 🏆 …), and it is one of the nine pure modules copied verbatim into
 * the Supabase edge function by `npm run sync:edge-shared`. The server evaluates
 * achievement PREDICATES; it has no interest in what an achievement looks like, and putting
 * presentation there means a redeploy every time a drawing changes. So the data module
 * keeps the rules and this file keeps the pictures — the same seam that already separates
 * `card-issues.ts` and `card-sources.ts` from the deck data they annotate.
 *
 * The set reads as one arc rather than a shelf of trophies: sprout → leaves → flower →
 * bloom → crystal for the collecting ladder, and lens → compass → fallen leaf → plot for
 * the ways of looking. A laurel, not a cup, for finishing the deck.
 */
const ACHIEVEMENT_ICONS: Record<string, IconName> = {
  'first-find': 'sprout',
  'forager-10': 'leaves',
  'explorer-25': 'flower',
  'rare-finder': 'bloom',
  'epic-finder': 'crystal',
  'complete-collection': 'laurel',
  'first-research': 'research',
  'research-10': 'compass',
  'seasonal-sweep': 'fallen-leaf',
  'backyard-collection': 'plot',
  // The habitat set wears its own class mark, so a badge and the chip on the card are
  // recognisably the same thing.
  'habitat-woodland': 'woodland',
  'habitat-meadow': 'meadow',
  'habitat-wetland': 'wetland',
  'habitat-wayside': 'wayside',
  'habitat-garden': 'garden-habitat',
  'habitat-sweep': 'compass',
};

/**
 * The mark for an achievement id, falling back to a sprout.
 *
 * A fallback rather than a throw: an achievement added to the data module without a drawing
 * should still render, and an unlock the player earned must never be the thing that breaks
 * the page announcing it.
 */
export function achievementIcon(id: string): IconName {
  return ACHIEVEMENT_ICONS[id] ?? 'sprout';
}
