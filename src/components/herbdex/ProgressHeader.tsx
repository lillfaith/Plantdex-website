'use client';

import { useHerbdex } from '@/state/HerbdexProvider';
import { ACHIEVEMENTS } from '@/lib/achievements';

/**
 * Level, XP bar and collection progress.
 *
 * Every number here comes from progressFromState() — this component contains no XP or
 * level thresholds of its own.
 */
export function ProgressHeader() {
  const { progress, discoveredCount, deckSize, state, ready } = useHerbdex();

  const pct = Math.round(progress.fraction * 100);
  const collectionPct = deckSize > 0 ? Math.round((discoveredCount / deckSize) * 100) : 0;

  return (
    <section aria-labelledby="progress-heading" className="panel p-4 sm:p-5">
      <h2 id="progress-heading" className="sr-only">
        Your progress
      </h2>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-display text-lg font-bold text-gold-plate sm:text-xl">
          Level {progress.level} — {progress.levelName}
        </p>
        <p className="text-sm font-semibold text-violet-200 tabular-nums">
          {progress.xp.toLocaleString()}
          {progress.nextLevelXp !== null && (
            <span className="text-violet-400"> / {progress.nextLevelXp.toLocaleString()}</span>
          )}{' '}
          XP
        </p>
      </div>

      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-violet-900"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          progress.nextLevelXp === null
            ? 'Maximum level reached'
            : `${pct}% of the way to level ${progress.level + 1}`
        }
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-500 to-pink-accent transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(pct, discoveredCount > 0 ? 2 : 0)}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-violet-300">
        {progress.nextLevelXp === null
          ? 'Highest level reached.'
          : `${(progress.nextLevelXp - progress.xp).toLocaleString()} XP to level ${progress.level + 1}`}
      </p>

      <hr className="my-4 border-violet-700/50" />

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-bold tracking-wide text-violet-200 uppercase">
          Herbs discovered
        </p>
        <p className="text-sm font-semibold text-violet-200 tabular-nums">
          {discoveredCount} <span className="text-violet-400">/ {deckSize}</span>
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-violet-900"
        role="progressbar"
        aria-valuenow={collectionPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${discoveredCount} of ${deckSize} herbs discovered`}
      >
        <div
          className="h-full rounded-full bg-cyan-accent transition-[width] duration-500 ease-out"
          style={{ width: `${collectionPct}%` }}
        />
      </div>

      <h3 className="mt-4 text-xs font-bold tracking-wide text-violet-300 uppercase">
        Achievements
      </h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = ready && Boolean(state.achievements[achievement.id]);
          return (
            <li key={achievement.id}>
              <span
                title={`${achievement.name} — ${achievement.description}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  unlocked
                    ? 'border-gold-500/60 bg-gold-500/15 text-gold-300'
                    : 'border-violet-700 bg-violet-900/60 text-violet-500'
                }`}
              >
                <span aria-hidden="true" className={unlocked ? '' : 'grayscale opacity-50'}>
                  {achievement.icon}
                </span>
                {achievement.name}
                <span className="sr-only">
                  {unlocked ? ' — unlocked' : ' — locked'}. {achievement.description}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
