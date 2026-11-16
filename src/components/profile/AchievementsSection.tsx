"use client";

import { ACHIEVEMENTS } from "@/lib/achievements";
import { useHerbdex } from "@/state/HerbdexProvider";
import { illustration } from "@/lib/pixel-icons";
import { PlantdexIcon } from "../icons/PlantdexIcon";
import { achievementIcon } from "../icons/achievement-icons";
import { PixelIcon } from "../herbdex/HerbalVisuals";

/**
 * ACHIEVEMENTS, ON THE PROFILE.
 *
 * They used to sit at the foot of the Collection page's progress header, with a link to the
 * profile on the count. The profile is the collectible identity page and already holds the
 * pinned trophies, frames and titles, so the full list lives with them and the Collection page
 * stays about the collection. Same data and same rule as ever: each achievement is a pure
 * predicate over the saved state (`achievements.ts`), so nothing is stored here and a badge
 * added later unlocks retroactively. Four are shown, earned first, and the rest sit behind the
 * disclosure.
 */
export function AchievementsSection() {
  const { state, ready } = useHerbdex();

  // Four badges: earned ones first (in the achievements' own order), then the next locked ones.
  const earned = ACHIEVEMENTS.filter(
    (a) => ready && Boolean(state.achievements[a.id]),
  );
  const locked = ACHIEVEMENTS.filter(
    (a) => !(ready && state.achievements[a.id]),
  );
  const shown = [...earned, ...locked].slice(0, 4);

  return (
    <section aria-labelledby="achievements-heading" className="panel p-4">
      <div>
        <div className="flex items-center justify-between">
          <h2
            id="achievements-heading"
            className="flex items-center gap-2 font-display text-lg font-bold text-violet-100"
          >
            <PixelIcon uri={illustration('trophy')} size={30} />
            Achievements
          </h2>
          <p className="inline-flex min-h-11 items-center text-sm font-bold text-violet-300 tabular-nums">
            {earned.length} / {ACHIEVEMENTS.length}
            <span className="sr-only"> achievements earned</span>
          </p>
        </div>
        <ul className="mt-1 grid grid-cols-4 gap-2 text-center">
          {shown.map((achievement) => {
            const isEarned = Boolean(ready && state.achievements[achievement.id]);
            return (
              <li key={achievement.id} className="flex flex-col items-center gap-1">
                <span
                  className={`relative flex h-14 w-14 items-center justify-center rounded-xl border-2 text-2xl ${
                    isEarned
                      ? 'border-gold-400 bg-plum-800/70 text-gold-300 shadow-[0_0_10px_rgb(255_212_92/0.35)]'
                      : 'border-violet-600/60 bg-plum-900/50 text-violet-400/70'
                  }`}
                >
                  <PlantdexIcon
                    name={achievementIcon(achievement.id)}
                    aria-hidden="true"
                    className={isEarned ? '' : 'opacity-60'}
                  />
                  {!isEarned && (
                    <PlantdexIcon
                      name="locked"
                      aria-hidden="true"
                      className="absolute -top-1.5 -right-1.5 text-sm text-violet-300"
                    />
                  )}
                </span>
                <span
                  className={`text-xs leading-tight font-semibold ${
                    isEarned ? 'text-violet-100' : 'text-violet-300'
                  }`}
                >
                  {achievement.name}
                </span>
              </li>
            );
          })}
        </ul>
        <details className="mt-1">
          <summary className="group flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-xs font-bold tracking-wide text-violet-300 uppercase">
            <span
              aria-hidden="true"
              className="text-base leading-none transition-transform group-open:rotate-90 motion-reduce:transition-none"
            >
              &rsaquo;
            </span>
            All achievements
          </summary>
          <ul className="space-y-1.5 pb-2">
            {ACHIEVEMENTS.map((achievement) => {
              const isEarned = Boolean(ready && state.achievements[achievement.id]);
              return (
                <li key={achievement.id} className="flex items-start gap-2 text-xs">
                  <PlantdexIcon
                    name={achievementIcon(achievement.id)}
                    aria-hidden="true"
                    className={`mt-0.5 shrink-0 text-base ${isEarned ? 'text-gold-300' : 'text-violet-500'}`}
                  />
                  <span className={isEarned ? 'text-violet-100' : 'text-violet-300'}>
                    <span className="font-bold">{achievement.name}</span>
                    {isEarned ? ' (unlocked)' : ' (locked)'} &mdash; {achievement.description}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      </div>
    </section>
  );
}
