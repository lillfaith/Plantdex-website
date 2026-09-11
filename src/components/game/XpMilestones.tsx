import type { Progress } from '@/lib/progression';
import { milestonesInLevel } from '@/lib/progression-track';

/**
 * Field Card thresholds, drawn ON the level bar rather than beside it.
 *
 * Levels and Field Cards are funded by the same XP, and the UI used to show them as two
 * stacked meters — which says "two systems" to a player for whom exactly one number is going
 * up. The rewards are markers on the one track now, and the standalone panel is gone.
 *
 * A SIBLING OF THE BAR, NEVER A CHILD. The bars clip their fill with `overflow-hidden`, so a
 * marker nested inside would be cut in half by the very rounding that makes the bar look like
 * a bar — and the first five Field Cards sit EXACTLY on a level-up, which puts them at the
 * far right edge where the clipping is worst. This layer sits above the bar at the same
 * bounds and is never clipped.
 *
 * A DIAMOND, DELIBERATELY NOT A TICK. A checkmark means "task complete"; these are reward
 * thresholds on a road, and a crossed one should read as a milestone passed rather than a
 * chore done. Earned is solid gold, unearned is a hollow socket in the same shape — the same
 * object in two states, so the eye reads a row of stops rather than two kinds of thing.
 *
 * `aria-hidden`, because the line under the bar already says in words what these say in
 * shapes, and a screen reader hearing "diamond, diamond" learns nothing. There is at most one
 * of them per level band on today's ladders anyway (see `progression-track.ts`).
 */
export function XpMilestones({ progress }: { progress: Progress }) {
  const milestones = milestonesInLevel(progress);
  if (milestones.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {milestones.map((milestone) => (
        <span
          key={milestone.ordinal}
          className="absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{ left: `${milestone.fraction * 100}%` }}
        >
          <span
            className={`block h-1.5 w-1.5 rotate-45 rounded-[1px] ring-1 ${
              milestone.earned
                ? 'bg-gold-300 ring-plum-950'
                : 'bg-plum-900 ring-violet-300'
            }`}
          />
        </span>
      ))}
    </div>
  );
}
