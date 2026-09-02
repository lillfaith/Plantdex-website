import { getAchievement } from '@/lib/achievements';
import { achievementShade } from '@/lib/achievement-shade';
import { MAX_PINNED } from '@/lib/player-profile';
import { ACCENTS, EYEBROW } from '../ui/accents';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { achievementIcon } from '../icons/achievement-icons';

/**
 * Up to three earned achievements, as trophies.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS SECTION HAS NO PANEL, AND THAT IS THE POINT. Everything else on the profile sits in a
 * rounded rectangle; three medallions floating on the page ground is the single biggest
 * break in that rhythm, and it costs nothing — a medal does not need a box to be read as a
 * medal.
 *
 * DELIBERATELY BIGGER THAN THE SHELF PILLS. On the Herdbex the job is to fit sixteen
 * achievements into a strip; here the job is the opposite — three chosen things, given room.
 * Same `achievementShade()` keyed by id, so an achievement wears the same colour in both
 * places, and gold still means earned. `trophy-medal` puts the gold ring inside and the
 * achievement's own shade outside, so the two facts never have to be read off each other.
 *
 * The shine sweeps on hover only. A medal that shines by itself, three times over, on a page
 * you are trying to read, is a fairground.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every id has already been checked against the player's own achievement records by
 * `resolveProfile`, so nothing unearned can reach this component.
 */
export function PinnedAchievements({ ids }: { ids: string[] }) {
  return (
    <section aria-labelledby="profile-pinned" className="px-1 py-2">
      <h2 id="profile-pinned" className={`${EYEBROW} text-center text-gold-400`}>
        Your proudest three
      </h2>

      {ids.length === 0 ? (
        <p className="mt-2 text-center text-sm text-violet-300">
          Earn an achievement and pin up to {MAX_PINNED} of them here.
        </p>
      ) : (
        <ul className="mt-4 flex items-start justify-center gap-3 sm:gap-8">
          {ids.map((id) => {
            const achievement = getAchievement(id);
            if (!achievement) return null;
            const tone = ACCENTS[achievementShade(id)];
            return (
              <li key={id} className="min-w-0 flex-1 text-center sm:max-w-[12rem]">
                <span
                  className={`trophy-medal group lift relative mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center overflow-hidden rounded-full sm:h-24 sm:w-24 ${tone.wash}`}
                >
                  <PlantdexIcon
                    name={achievementIcon(id)}
                    aria-hidden="true"
                    className={`text-3xl sm:text-4xl ${tone.icon}`}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:animate-sheen group-hover:opacity-100 motion-reduce:group-hover:animate-none"
                  />
                </span>
                <p className="mt-2.5 text-[0.72rem] leading-tight font-extrabold text-gold-300 sm:text-sm">
                  {achievement.name}
                </p>
                <p className="mt-1 hidden text-xs text-violet-300 sm:block">
                  {achievement.description}
                </p>
                {/* The description is the achievement's meaning, and a phone should not lose
                    it just because the medal got smaller. */}
                <span className="sr-only sm:hidden">{achievement.description}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
