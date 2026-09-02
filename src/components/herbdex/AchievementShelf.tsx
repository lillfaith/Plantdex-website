'use client';

import { ACHIEVEMENTS } from '@/lib/achievements';
import { achievementShade } from '@/lib/achievement-shade';
import { ACCENTS } from '@/components/ui/accents';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { achievementIcon } from '../icons/achievement-icons';

/**
 * Sixteen achievements, folded.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY IT MOVES.
 *
 * Expanded, this is sixteen pills — on a 390px screen, several hundred pixels of mostly
 * things you have not done, sitting between a player and the collection they came for. It
 * was already behind a `<details>` for that reason, but a folded section shows only its own
 * heading: the achievements stopped existing until someone thought to look.
 *
 * So the collapsed state is a rail rather than a title. It carries EARNED AND UNEARNED
 * TOGETHER, deliberately: a shelf with gaps in it reads as a set you are partway through,
 * where a list of locked pills reads as a list of failures. Movement is what lets a strip
 * narrower than the content still show all of it.
 *
 * COLOUR SAYS WHICH, GOLD SAYS WHETHER. Each achievement wears one of seven shades from the
 * deck's own back-of-card ramp, keyed by id so it never shuffles. That is identity. Whether
 * it is earned stays gold, per CLAUDE.md — so the two facts never have to be read off each
 * other, and nothing has to shout to be told apart.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ACCESSIBILITY. The rail holds the same children twice so the loop can be seamless; the
 * second copy is `aria-hidden`, or every achievement would be announced twice. The rail
 * pauses on hover and on keyboard focus, freezes entirely under `prefers-reduced-motion`,
 * and the expanded list below is the complete, static, ordered set either way.
 */
export function AchievementShelf({
  unlocked,
  ready,
}: {
  /** Ids the player has earned. */
  unlocked: Record<string, string | undefined>;
  ready: boolean;
}) {
  const isUnlocked = (id: string) => ready && Boolean(unlocked[id]);
  const unlockedCount = ready
    ? ACHIEVEMENTS.filter((achievement) => Boolean(unlocked[achievement.id])).length
    : 0;

  const pill = (achievement: (typeof ACHIEVEMENTS)[number], earned: boolean) => {
    const tone = ACCENTS[achievementShade(achievement.id)];
    return (
      <span
        title={`${achievement.name} — ${achievement.description}`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold whitespace-nowrap ${tone.border} ${tone.wash} ${
          earned ? 'text-gold-300' : 'text-violet-400'
        }`}
      >
        <PlantdexIcon
          name={achievementIcon(achievement.id)}
          className={`text-sm ${tone.icon} ${earned ? '' : 'opacity-40'}`}
        />
        {achievement.name}
      </span>
    );
  };

  return (
    <details className="group mt-4" open={false}>
      <summary className="cursor-pointer list-none">
        <span className="tap-44 flex items-center justify-between gap-2 text-[0.72rem] font-bold tracking-[0.1em] text-violet-300 uppercase">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="text-base leading-none transition-transform group-open:rotate-90 motion-reduce:transition-none"
          >
            &rsaquo;
          </span>
          Achievements
        </span>
        <span className={unlockedCount > 0 ? 'text-gold-400' : 'text-violet-400'}>
          {unlockedCount} / {ACHIEVEMENTS.length}
        </span>
        </span>

        {/*
          THE RAIL LIVES IN THE SUMMARY, AND THAT IS NOT A DETAIL.

          A `<details>` hides its content when closed — so a preview placed in the body is
          visible only once the section is already open, which is precisely when it is no
          longer a preview. Written that way first, it rendered nothing at all in the state
          it exists for. Summary content is always shown, so this belongs here.

          Tapping it toggles the section, which is the behaviour you want anyway: the rail
          is the affordance.
        */}
        <div className="rail-mask mt-2 overflow-hidden group-open:hidden">
          <div className="achievement-rail flex w-max gap-2">
            {[0, 1].map((copy) => (
              <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-2">
                {ACHIEVEMENTS.map((achievement) => (
                  <li key={achievement.id}>{pill(achievement, isUnlocked(achievement.id))}</li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      </summary>

      <ul className="mt-2 hidden flex-wrap gap-2 group-open:flex">
        {ACHIEVEMENTS.map((achievement) => {
          const earned = isUnlocked(achievement.id);
          return (
            <li key={achievement.id}>
              {pill(achievement, earned)}
              <span className="sr-only">
                {earned ? ' — unlocked' : ' — locked'}. {achievement.description}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
