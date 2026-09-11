'use client';

import Link from 'next/link';
import { useHerbdex } from '@/state/HerbdexProvider';
import { getAchievement } from '@/lib/achievements';
import { progressForTask, researchTaskById, xpForTask, type ResearchTask } from '@/lib/research';
import { track } from '@/lib/analytics';

/**
 * WHAT THIS FIND DID TO YOUR FIELD RESEARCH.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT RECOMPUTES NOTHING. Reconciliation is the authority on what completed — and signed in,
 * that authority is the server, which re-derives mastery and research from its own rows. So
 * this reads `lastResearch` off the provider, which is the outcome that reconciliation
 * actually recorded. A second implementation of "did this complete" would be free to
 * disagree with the first, and the one on screen would be the wrong one.
 *
 * PROGRESS is different and is safe to derive: `progressForTask(task, world)` is the same
 * pure function the Field Research page renders from, reading the same world. There is no
 * second rule here, only a second reader of the first.
 *
 * WHICH TASKS ARE "THIS FIND'S". A task is shown as advanced only if it NAMES the herb that
 * was just confirmed. That is what stops the panel listing every challenge in the app: a
 * Meadow Survey that happens to sit at 2/3 is not news unless the plant you just logged is
 * one of its ten.
 *
 * NOTHING WHEN NOTHING HAPPENED. The component returns null rather than rendering an empty
 * state — a "no research advanced" line on every scan is the notification spam this is meant
 * to avoid, and it would push the onward link further down the screen for no reason.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** At most this many rows, completions first. Beyond it the page is a changelog. */
const MAX_ROWS = 3;

export function ScanResearchFeedback({
  herbId,
  since,
}: {
  /** The card just confirmed. Only tasks naming it are treated as this find's. */
  herbId: string;
  /**
   * When the player acted. An outcome stamped before this belongs to something else — a
   * sync, another tab, a sighting added earlier — and claiming it here would be a lie.
   */
  since: number;
}) {
  const { world, dailyTasks, standingTasks, lastResearch, ready } = useHerbdex();
  if (!ready) return null;

  const fresh = lastResearch && lastResearch.at >= since ? lastResearch : null;

  const completed: ResearchTask[] = (fresh?.completedResearchIds ?? [])
    .map((id) => researchTaskById(id))
    .filter((task): task is ResearchTask => task !== undefined);

  /*
   * Advanced-but-not-finished, and only for tasks this plant belongs to. Completions are
   * excluded so a task never appears twice, and a task already done before today is skipped
   * because "3/3" on a challenge you finished last week is not news either.
   */
  const completedIds = new Set(completed.map((task) => task.id));
  const advanced = [...dailyTasks, ...standingTasks]
    .filter((task) => !completedIds.has(task.id))
    .filter((task) => task.herbIds.includes(herbId))
    .map((task) => ({ task, progress: progressForTask(task, world) }))
    .filter(({ progress }) => !progress.done && progress.current > 0)
    // Nearest to finishing first: the one a player is most likely to go and complete.
    .sort((a, b) => b.progress.current / b.progress.target - a.progress.current / a.progress.target);

  const achievements = (fresh?.newAchievementIds ?? [])
    .map((id) => getAchievement(id))
    .filter((achievement): achievement is NonNullable<typeof achievement> => Boolean(achievement));

  if (completed.length === 0 && advanced.length === 0 && achievements.length === 0) return null;

  const rows = [
    ...completed.map((task) => ({
      key: `done:${task.id}`,
      kicker: `${KIND_LABEL[task.kind]} complete`,
      title: task.title,
      detail: `+${xpForTask(task)} XP`,
      strong: true,
    })),
    ...achievements.map((achievement) => ({
      key: `ach:${achievement.id}`,
      kicker: 'Achievement unlocked',
      title: achievement.name,
      detail: null,
      strong: true,
    })),
    ...advanced.map(({ task, progress }) => ({
      key: `prog:${task.id}`,
      kicker: 'Field Research',
      title: task.title,
      detail: `${progress.current} / ${progress.target}`,
      strong: false,
    })),
  ].slice(0, MAX_ROWS);

  return (
    <div className="mt-3 border-t border-violet-800/70 pt-3">
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li key={row.key} className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0">
              <span
                className={`block text-[0.72rem] font-bold tracking-[0.12em] uppercase ${
                  row.strong ? 'text-gold-400' : 'text-violet-400'
                }`}
              >
                {row.kicker}
              </span>
              <span className="block font-semibold text-violet-100">{row.title}</span>
            </span>
            {row.detail && (
              <span
                className={`shrink-0 tabular-nums ${
                  row.strong ? 'font-bold text-gold-300' : 'text-violet-300'
                }`}
              >
                {row.detail}
              </span>
            )}
          </li>
        ))}
      </ul>

      {/*
        One link, and only when there is more to see than fitted. `/herbdex/research` is not
        in the navigation, so for many players this is the first time they learn the page
        exists — which is half the reason this panel is here at all.
      */}
      <Link
        href="/herbdex/research"
        onClick={() => track('research_opened_from_scan')}
        className="mt-2 inline-flex min-h-11 items-center text-xs font-bold text-gold-400 underline underline-offset-2 hover:text-gold-300"
      >
        View Field Research &rarr;
      </Link>
    </div>
  );
}

const KIND_LABEL: Record<ResearchTask['kind'], string> = {
  daily: 'Daily research',
  seasonal: 'Seasonal research',
  collection: 'Collection challenge',
};
