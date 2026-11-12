'use client';

import type { Progress } from '@/lib/progression';
import type { ScanAllowance } from '@/lib/scan-allowance';
import { XpMilestones } from '../game/XpMilestones';

/**
 * Two small encouragements above the capture area: how close the next level is, and how much of
 * today's scan goal is left. Both are reads of existing numbers. The XP figures come from
 * `progress` (this file holds no threshold) and the scan count from the allowance mirror of the
 * server's daily limit. Nothing here awards anything.
 */
export function ScanGoal({
  progress,
  ready,
  allowance,
}: {
  progress: Progress;
  ready: boolean;
  allowance: ScanAllowance;
}) {
  const pct = Math.round(progress.fraction * 100);
  const toNext = progress.nextLevelXp === null ? null : Math.max(0, progress.nextLevelXp - progress.xp);

  return (
    <section
      aria-label="Your progress today"
      className="holo-border space-y-2 rounded-2xl px-3 py-2.5"
    >
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-violet-50">
            Level {progress.level}{' '}
            <span className="font-semibold text-gold-300">{progress.levelName}</span>
          </p>
          <p className="text-xs font-semibold text-violet-300 tabular-nums">
            {ready ? progress.xp.toLocaleString() : 0}
            {progress.nextLevelXp !== null && ` / ${progress.nextLevelXp.toLocaleString()}`} XP
          </p>
        </div>
        <div className="relative mt-1">
          <div
            className="h-3 overflow-hidden rounded-full bg-plum-950/80 ring-2 ring-violet-400/50"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={
              toNext === null
                ? 'Maximum level reached'
                : `${toNext} XP to level ${progress.level + 1}`
            }
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-500 to-pink-accent transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(pct, progress.xp > 0 ? 3 : 0)}%` }}
            />
          </div>
          <XpMilestones progress={progress} />
        </div>
        <p className="mt-1 text-xs leading-snug text-balance text-violet-300">
          {toNext === null
            ? 'Top level reached.'
            : `${toNext.toLocaleString()} XP to Level ${progress.level + 1}. Every plant in the deck you find earns you XP.`}
        </p>
      </div>

      <div className="border-t border-violet-500/30 pt-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-bold text-violet-50">Daily scan goal</p>
          <p className="text-xs font-semibold text-violet-200 tabular-nums">
            <span className="text-gold-300">{allowance.left}</span> of {allowance.limit} left today
          </p>
        </div>
        <ul
          aria-hidden="true"
          className="mt-1.5 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${allowance.limit}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: allowance.limit }, (_, index) => (
            <li
              key={index}
              className={`h-2.5 rounded-[2px] ${
                index < allowance.used ? 'bg-gold-400' : 'bg-plum-950/80 ring-1 ring-violet-400/40'
              }`}
            />
          ))}
        </ul>
        {allowance.left === 0 && (
          <p className="mt-1 text-xs text-violet-300">
            That is today&rsquo;s goal. Your scans reset at midnight UTC.
          </p>
        )}
      </div>
    </section>
  );
}
