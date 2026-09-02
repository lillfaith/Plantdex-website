import { FIELD_FRAMES } from '@/lib/field-frames';
import { FIELD_TITLES, titleLabel } from '@/lib/field-titles';
import { HABITAT_LABEL } from '@/lib/habitat';
import type { Cosmetic } from '@/lib/cosmetics';
import type { ProfileStats } from '@/lib/profile-stats';
import type { HerbdexState } from '@/lib/types';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { EYEBROW, MICRO_LABEL } from '../ui/accents';

/**
 * The cosmetic cabinet — an inventory, not a settings list.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FRAMES ARE SLOTS THAT WEAR THEMSELVES. Each slot draws the actual frame it holds, so the
 * cabinet shows you the thing rather than naming it; a locked slot draws the same frame
 * dimmed with a lock over it, and keeps its condition in words underneath. Hiding a locked
 * item entirely would turn a list of things to go and do into an empty shelf, and showing it
 * with no condition would turn it into a tease.
 *
 * Titles are ribbons rather than slots, because a title has no shape to display — the thing
 * itself is the words, so the words are what the row shows, at the size they will be worn.
 *
 * FOLDED BY DEFAULT. Fourteen cosmetics is several hundred pixels on a phone and the least
 * urgent thing on the page, so it sits behind a `<details>` whose summary carries the counts.
 * Same argument `AchievementShelf` makes for its own rail.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The conditions are `Cosmetic.condition`, the human wording that lives beside each
 * predicate. Restating a threshold here would let the cabinet promise one thing while the
 * code checked another.
 */
export function Cabinet({ state, stats }: { state: HerbdexState; stats: ProfileStats }) {
  const earned = (items: readonly Cosmetic[]) =>
    items.filter((item) => item.isUnlocked(state)).length;
  const habitatName = stats.topHabitat ? HABITAT_LABEL[stats.topHabitat.habitat] : undefined;

  return (
    <details className="science-panel group p-4 sm:p-5">
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
          <span className={`${MICRO_LABEL} text-violet-300`}>
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

      <div className="mt-4 space-y-5">
        <div>
          <p className={`${MICRO_LABEL} text-violet-300`}>Avatar frames</p>
          <ul className="mt-2.5 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
            {FIELD_FRAMES.map((frame) => {
              const unlocked = frame.isUnlocked(state);
              return (
                <li key={frame.id} className="sunken p-2 text-center">
                  {/* The slot wears the frame it holds — dimmed and locked when it is not
                      yours yet, but never hidden and never a generic swatch. */}
                  <span
                    aria-hidden="true"
                    className={`relative mx-auto flex h-11 w-11 items-center justify-center rounded-xl ${frame.ring} ${
                      unlocked ? '' : 'opacity-35 grayscale'
                    }`}
                  >
                    <PlantdexIcon name={frame.icon} className="text-base text-violet-100" />
                    {!unlocked && (
                      <PlantdexIcon
                        name="locked"
                        className="absolute -right-1 -bottom-1 rounded-full bg-plum-950 p-0.5 text-xs text-violet-300"
                      />
                    )}
                  </span>
                  <p
                    className={`mt-1.5 text-[0.72rem] leading-tight font-bold ${
                      unlocked ? 'text-gold-300' : 'text-violet-300'
                    }`}
                  >
                    {frame.name}
                    {!unlocked && <span className="sr-only"> — locked</span>}
                  </p>
                  <p className="mt-0.5 text-[0.72rem] leading-tight text-violet-400">
                    {frame.condition}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className={`${MICRO_LABEL} text-violet-300`}>Field titles</p>
          <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
            {FIELD_TITLES.map((title) => {
              const unlocked = title.isUnlocked(state);
              return (
                <li
                  key={title.id}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 ${
                    unlocked ? 'bg-gold-500/[0.07] ring-1 ring-gold-500/30' : 'sunken'
                  }`}
                >
                  <PlantdexIcon
                    name={unlocked ? 'check' : 'locked'}
                    aria-hidden="true"
                    className={`shrink-0 text-sm ${unlocked ? 'text-gold-400' : 'text-violet-400'}`}
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-bold ${unlocked ? 'text-gold-300' : 'text-violet-300'}`}
                    >
                      {unlocked ? titleLabel(title, state, habitatName) : title.name}
                      {!unlocked && <span className="sr-only"> — locked</span>}
                    </span>
                    <span className="block text-xs text-violet-400">{title.condition}</span>
                  </span>
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
