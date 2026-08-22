'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { SEASON_LABEL } from '@/lib/deck';
import { currentSeason, progressForTask, type ResearchTask } from '@/lib/research';
import { RESEARCH_XP } from '@/lib/progression';
import { useHerbdex } from '@/state/HerbdexProvider';
import { SafetyNotice } from '../SafetyNotice';
import { TaskCard } from './TaskCard';

/**
 * Field Research.
 *
 * Three bands: today's small nudges, the seasonal challenges, and the collection
 * challenges. Every one of them is a reason to pick the physical deck up or go outside —
 * nothing here can be completed by clicking around this page.
 */
/** The clock does not push updates, so there is nothing to subscribe to. */
const NEVER_CHANGES = () => () => {};

export function ResearchView() {
  const { ready, world, dailyTasks, standingTasks, completedResearchCount } = useHerbdex();

  /*
   * The current season only ever *orders* the seasonal list — all four stay open, because
   * the deck holds a single winter card and a winter-only view would be a dead end.
   *
   * The clock is an external system, so it is read the same way every other external
   * system here is: `getServerSnapshot` returns null so the static export bakes in no
   * season and hydration cannot mismatch, and the real value arrives on the client. It
   * never changes while the page is open, so subscribe is a no-op — nobody needs the list
   * to reorder itself under them at midnight.
   */
  const season = useSyncExternalStore(
    NEVER_CHANGES,
    () => currentSeason(),
    () => null,
  );

  const seasonal = standingTasks.filter((task) => task.id.startsWith('seasonal:'));
  const collections = standingTasks.filter((task) => task.id.startsWith('collection:'));

  const orderedSeasonal = season
    ? [...seasonal].sort((a, b) => rank(a, season) - rank(b, season))
    : seasonal;

  /*
   * From the recorded completions, NOT from the tasks currently on screen. Yesterday's
   * finished dailies have rotated off the board, and a tally that could only see what is
   * visible would keep resetting to nothing — which is the opposite of what a running
   * total is for.
   */
  const completedCount = ready ? completedResearchCount : 0;

  return (
    <main id="main" className="mx-auto max-w-4xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link href="/herbdex" className="text-xs font-semibold text-violet-300 hover:text-gold-400">
          ← My Herbdex
        </Link>
      </nav>

      <h1 className="font-display text-3xl font-extrabold text-gold-plate">Field Research</h1>
      <p className="mt-1 text-sm text-violet-300">
        Small reasons to take the deck outside.
      </p>

      <p className="mt-4 text-xs text-violet-400">
        Nothing here expires. A task you have been offered stays until you finish it, and
        skipping a week costs you nothing.
      </p>

      {!ready ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[var(--radius-card)] bg-violet-900/50" />
          ))}
        </div>
      ) : (
        <>
          <section aria-labelledby="today-heading" className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="today-heading" className="font-display text-xl font-bold text-gold-plate">
                Today
              </h2>
              <span className="text-xs text-violet-400">
                {RESEARCH_XP.daily} XP each · refreshes daily
              </span>
            </div>

            {dailyTasks.length === 0 ? (
              <p className="panel mt-3 p-5 text-center text-sm text-violet-300">
                Nothing left to suggest — you have done everything the deck can ask of you
                right now. Come back tomorrow.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {dailyTasks.map((task) => (
                  <TaskCard key={task.id} progress={progressForTask(task, world)} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="seasonal-heading" className="mt-10">
            <h2 id="seasonal-heading" className="font-display text-xl font-bold text-gold-plate">
              Seasonal Research
            </h2>
            <p className="mt-1 text-xs text-violet-400">
              {season
                ? `All four stay open — ${SEASON_LABEL[season].toLowerCase()} is listed first because that is where the calendar is now.`
                : 'All four stay open, whatever the calendar says.'}
            </p>
            <ul className="mt-3 space-y-3">
              {orderedSeasonal.map((task) => (
                <TaskCard key={task.id} progress={progressForTask(task, world)} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="collections-heading" className="mt-10">
            <h2 id="collections-heading" className="font-display text-xl font-bold text-gold-plate">
              Collection Challenges
            </h2>
            <p className="mt-1 text-xs text-violet-400">
              Groups of cards from the physical deck, built from what the cards themselves say.
            </p>
            <ul className="mt-3 space-y-3">
              {collections.map((task) => (
                <TaskCard key={task.id} progress={progressForTask(task, world)} />
              ))}
            </ul>
          </section>

          <p aria-live="polite" className="mt-8 text-center text-xs text-violet-400">
            {completedCount} research{' '}
            {completedCount === 1 ? 'task complete' : 'tasks complete'}
          </p>
        </>
      )}

      <div className="mt-10">
        <SafetyNotice variant="brief" />
      </div>
    </main>
  );
}

/** Current season first, then the rest of the year in order. */
function rank(task: ResearchTask, now: ReturnType<typeof currentSeason>): number {
  const order = ['spring', 'summer', 'autumn', 'winter'];
  const season = task.id.split(':')[1] ?? '';
  const offset = order.indexOf(season) - order.indexOf(now);
  return (offset + order.length) % order.length;
}
