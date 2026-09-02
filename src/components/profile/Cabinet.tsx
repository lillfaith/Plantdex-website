import { FIELD_FRAMES } from '@/lib/field-frames';
import { FIELD_TITLES, titleLabel } from '@/lib/field-titles';
import { HABITAT_LABEL } from '@/lib/habitat';
import type { Cosmetic } from '@/lib/cosmetics';
import type { ProfileStats } from '@/lib/profile-stats';
import type { HerbdexState } from '@/lib/types';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { EYEBROW, MICRO_LABEL } from '../ui/accents';

/**
 * The cosmetic cabinet: every frame and title, earned and not.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LOCKED ENTRIES ARE SHOWN, NOT HIDDEN — with the condition spelled out beside each one, so
 * the cabinet is a list of things to go and do rather than a list of things you lack. Same
 * argument `AchievementShelf` makes: a set with gaps in it reads as something you are
 * partway through; a set that hides what you have not earned reads as empty.
 *
 * IT IS FOLDED BY DEFAULT. Fourteen cosmetics is several hundred pixels on a phone, and it
 * is the least urgent thing on the page — so it sits behind a `<details>` whose summary
 * carries the counts, rather than between a player and the sections above it.
 *
 * The conditions are `Cosmetic.condition`, the human wording that lives beside each
 * predicate. Restating a threshold here would let the cabinet promise one thing while the
 * code checked another.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Cabinet({ state, stats }: { state: HerbdexState; stats: ProfileStats }) {
  const earned = (items: readonly Cosmetic[]) => items.filter((item) => item.isUnlocked(state)).length;
  const habitatName = stats.topHabitat ? HABITAT_LABEL[stats.topHabitat.habitat] : undefined;

  return (
    <details className="panel group p-4">
      <summary className="cursor-pointer list-none">
        <span className="flex min-h-11 items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="text-base leading-none text-violet-300 transition-transform group-open:rotate-90 motion-reduce:transition-none"
            >
              &rsaquo;
            </span>
            <span className={`${EYEBROW} text-mystery-mauve`}>Cabinet</span>
          </span>
          <span className="text-[0.72rem] font-bold text-violet-300 tabular-nums">
            <span className={earned(FIELD_FRAMES) > 1 ? 'text-gold-400' : ''}>
              {earned(FIELD_FRAMES)}/{FIELD_FRAMES.length}
            </span>{' '}
            frames ·{' '}
            <span className={earned(FIELD_TITLES) > 1 ? 'text-gold-400' : ''}>
              {earned(FIELD_TITLES)}/{FIELD_TITLES.length}
            </span>{' '}
            titles
          </span>
        </span>
      </summary>

      <h2 className="sr-only">Frames and titles</h2>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <p className={`${MICRO_LABEL} text-violet-300`}>Avatar frames</p>
          <ul className="mt-2 space-y-1.5">
            {FIELD_FRAMES.map((frame) => {
              const unlocked = frame.isUnlocked(state);
              return (
                <li
                  key={frame.id}
                  className={`flex items-start gap-2.5 rounded-xl border p-2.5 ${
                    unlocked ? 'border-gold-500/35 bg-gold-500/[0.05]' : 'border-violet-700/60'
                  }`}
                >
                  {/* A miniature of the frame itself, so the name is not the only clue. */}
                  <span
                    aria-hidden="true"
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${frame.ring} ${
                      unlocked ? '' : 'opacity-40'
                    }`}
                  >
                    <PlantdexIcon name={frame.icon} className="text-sm text-violet-200" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-bold ${unlocked ? 'text-gold-300' : 'text-violet-300'}`}
                    >
                      {frame.name}
                      {!unlocked && <span className="sr-only"> — locked</span>}
                    </span>
                    <span className="block text-xs text-violet-400">{frame.condition}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className={`${MICRO_LABEL} text-violet-300`}>Field titles</p>
          <ul className="mt-2 space-y-1.5">
            {FIELD_TITLES.map((title) => {
              const unlocked = title.isUnlocked(state);
              return (
                <li
                  key={title.id}
                  className={`rounded-xl border p-2.5 ${
                    unlocked ? 'border-gold-500/35 bg-gold-500/[0.05]' : 'border-violet-700/60'
                  }`}
                >
                  <span
                    className={`block text-sm font-bold ${unlocked ? 'text-gold-300' : 'text-violet-300'}`}
                  >
                    {unlocked ? titleLabel(title, state, habitatName) : title.name}
                    {!unlocked && <span className="sr-only"> — locked</span>}
                  </span>
                  <span className="block text-xs text-violet-400">{title.condition}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="mt-4 text-xs text-violet-400">
        Frames and titles are worked out from your collection every time this page loads, so
        anything you have already earned is here whether or not it existed when you earned it.
      </p>
    </details>
  );
}
