'use client';

import { usePrevious } from '@/lib/use-previous';
import { useHerbdex } from '@/state/HerbdexProvider';
import { CURRENT_COLLECTION } from '@/lib/collection';
import { CountUp } from './CountUp';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { AchievementShelf } from './AchievementShelf';

/**
 * Level, XP bar and collection progress.
 *
 * Every number here comes from progressFromState() — this component contains no XP or
 * level thresholds of its own.
 */
export function ProgressHeader() {
  const { progress, discoveredCount, learnedCount, masteredCount, deckSize, state, ready } =
    useHerbdex();

  // Animate the total from wherever it was, so returning from a discovery shows the
  // number climbing rather than snapping. On first load previous === current, so it
  // simply renders the value.
  const previousXp = usePrevious(progress.xp);

  const pct = Math.round(progress.fraction * 100);
  const asPct = (count: number) => (deckSize > 0 ? Math.round((count / deckSize) * 100) : 0);
  const collectionPct = asPct(discoveredCount);
  const masteredPct = asPct(masteredCount);
  const collectionComplete = ready && deckSize > 0 && discoveredCount >= deckSize;

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
          <CountUp from={previousXp} to={progress.xp} durationMs={900} />
          {progress.nextLevelXp !== null && (
            <span className="text-violet-400"> / {progress.nextLevelXp.toLocaleString()}</span>
          )}{' '}
          XP
        </p>
      </div>

      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-plum-950/70 ring-1 ring-violet-700/60"
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
        className="mt-2 h-2 overflow-hidden rounded-full bg-plum-950/70 ring-1 ring-violet-700/60"
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

      {/*
        The completion moment. It celebrates THIS collection as a finished thing — someone
        who has found all 45 has completed the product they bought, and the copy says so
        before it says anything else. The forward-looking line is one sentence, has no
        CTA, and promises no date, because there is nothing real to link to yet.
      */}
      {collectionComplete && (
        <div className="mt-3 rounded-xl border border-gold-500/60 bg-gold-500/[0.1] p-4 text-center">
          {/* A laurel, not a cup: the deck rewards having looked, not having won. */}
          <p aria-hidden="true" className="flex justify-center text-3xl text-gold-400">
            <PlantdexIcon name="laurel" />
          </p>
          <p className="font-display mt-1 text-base font-extrabold text-gold-plate">
            {CURRENT_COLLECTION.shortName} complete
          </p>
          <p className="mt-1 text-sm text-violet-200">
            All {deckSize} plants in the original deck, found in the real world.
          </p>
          <p className="mt-2 text-xs text-violet-400">
            More pages to fill someday.
          </p>
        </div>
      )}

      {/* Mastery is tracked separately from discovery, and stated as its own number: a
          collection of 45 found cards and a collection of 45 mastered cards are very
          different achievements, and one bar cannot say both. */}
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-bold tracking-wide text-violet-200 uppercase">Cards mastered</p>
        <p className="text-sm font-semibold text-violet-200 tabular-nums">
          {masteredCount} <span className="text-violet-400">/ {deckSize}</span>
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-plum-950/70 ring-1 ring-violet-700/60"
        role="progressbar"
        aria-valuenow={masteredPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${masteredCount} of ${deckSize} cards mastered`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300 transition-[width] duration-500 ease-out"
          style={{ width: `${masteredPct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-violet-400">
        {learnedCount} card{learnedCount === 1 ? '' : 's'} learned. Found → learned → found
        again.
      </p>

      <AchievementShelf unlocked={state.achievements} ready={ready} />
    </section>
  );
}
