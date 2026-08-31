'use client';

import { useEffect, useState } from 'react';
import type { Progress } from '@/lib/progression';

/**
 * The player's level and progress through it.
 *
 * EVERY NUMBER HERE IS REAL. `Progress` is derived by `progressFromState`, which sums XP
 * from the records actually stored — there is no per-plant level in this data model, and
 * inventing one would put a fabricated figure next to genuine botany.
 *
 * Gold is the reward colour and this is where most of the page's gold lives. The bar
 * animates its width only when the XP figure actually changes, so arriving on a page is
 * not treated as an achievement.
 */
export function XpBar({ progress }: { progress: Progress }) {
  const atMax = progress.nextLevelXp === null;
  const pct = Math.round(progress.fraction * 100);

  /*
   * Animate only on a real change, never on mount: a bar that fills every time you open a
   * page turns the reward signal into wallpaper. Compared during render rather than in an
   * effect — a synchronous setState in an effect body cascades an extra render, and this
   * is exactly the "adjust state when a value changes" case React documents.
   */
  const [seenXp, setSeenXp] = useState(progress.xp);
  const [earned, setEarned] = useState(0);
  if (progress.xp !== seenXp) {
    if (progress.xp > seenXp) setEarned(progress.xp - seenXp);
    setSeenXp(progress.xp);
  }
  useEffect(() => {
    if (earned === 0) return;
    const timer = setTimeout(() => setEarned(0), 1200);
    return () => clearTimeout(timer);
  }, [earned]);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[0.72rem] font-bold tracking-[0.1em] text-violet-300 uppercase">
          Level {progress.level}
          <span className="ml-2 text-violet-400 normal-case">{progress.levelName}</span>
        </p>
        <p className="relative text-[0.72rem] font-bold text-gold-300 tabular-nums">
          {atMax ? (
            <>{progress.xp.toLocaleString()} XP</>
          ) : (
            <>
              {progress.xpIntoLevel.toLocaleString()}
              <span className="text-violet-400"> / {progress.xpForLevel?.toLocaleString()} XP</span>
            </>
          )}
          {earned > 0 && (
            <span
              aria-hidden="true"
              className="xp-rise glow-gold absolute -top-4 right-0 text-sm font-extrabold text-gold-400"
            >
              +{earned}
            </span>
          )}
        </p>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full border border-violet-700/70 bg-plum-950/70"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          atMax
            ? `Level ${progress.level}, the highest level`
            : `Level ${progress.level}, ${pct}% toward level ${progress.level + 1}`
        }
      >
        <div
          className="path-fill h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
          style={{ ['--fill' as string]: `${pct}%` }}
        />
      </div>
    </div>
  );
}
