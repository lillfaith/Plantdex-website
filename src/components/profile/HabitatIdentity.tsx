import Link from 'next/link';
import { HABITAT_BLURB, HABITAT_LABEL, herbIdsInHabitat } from '@/lib/habitat';
import type { ProfileStats } from '@/lib/profile-stats';
import { HABITAT_ICON, HABITAT_TONE } from '../game/HabitatChip';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { Panel } from '../ui/Panel';
import { EYEBROW, MICRO_LABEL } from '../ui/accents';

/**
 * Which ground this player actually works.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT NAMES NOTHING WHEN THERE IS NOTHING TO NAME. `topHabitat` is null on an empty
 * collection rather than the first habitat at zero — "Most explored: Woodland" under a count
 * of 0 is a lie dressed as a statistic, and it is exactly what a plain descending sort
 * would have produced.
 *
 * ONE SEGMENT PER HABITAT, ALWAYS ALL FIVE, so the strip has the same shape for everybody
 * and a gap reads as ground not yet walked rather than as missing data. Each segment is
 * measured against how many species that habitat actually holds — the habitats are very
 * different sizes, so a shared denominator would make the big ones look neglected.
 *
 * Colour is never the only signal: every habitat is spelled out beside its bar.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function HabitatIdentity({ stats }: { stats: ProfileStats }) {
  const top = stats.topHabitat;

  return (
    <Panel aria-labelledby="profile-habitat" pad="md">
      <h2 id="profile-habitat" className="sr-only">
        Habitat identity
      </h2>

      {top ? (
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-xl ${HABITAT_TONE[top.habitat]}`}
          >
            <PlantdexIcon name={HABITAT_ICON[top.habitat]} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={`${EYEBROW} text-violet-300`}>Most explored</p>
            <p className="font-display mt-0.5 text-lg font-extrabold text-gold-plate">
              {HABITAT_LABEL[top.habitat]}
            </p>
            <p className="mt-0.5 text-xs text-violet-400">
              {top.count} plant{top.count === 1 ? '' : 's'} found here
            </p>
          </div>
        </div>
      ) : (
        <div>
          <p className={`${EYEBROW} text-violet-300`}>Most explored</p>
          <p className="mt-1 text-sm text-violet-300">
            Nowhere yet. Find a plant and the ground you walk starts showing up here.
          </p>
        </div>
      )}

      {top && <p className="mt-2 text-xs text-violet-300">{HABITAT_BLURB[top.habitat]}</p>}

      <ul className="mt-4 space-y-2">
        {stats.habitats.map((standing) => {
          const total = herbIdsInHabitat(standing.habitat).length;
          const pct = total > 0 ? Math.round((standing.count / total) * 100) : 0;
          return (
            <li key={standing.habitat} className="flex items-center gap-3">
              <PlantdexIcon
                name={HABITAT_ICON[standing.habitat]}
                className="shrink-0 text-sm text-violet-400"
                aria-hidden="true"
              />
              <span className={`${MICRO_LABEL} w-20 shrink-0 text-violet-300`}>
                {HABITAT_LABEL[standing.habitat]}
              </span>
              <span
                className="h-2 flex-1 overflow-hidden rounded-full bg-plum-950/70"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${HABITAT_LABEL[standing.habitat]}: ${standing.count} of ${total} found`}
              >
                <span
                  className={`block h-full rounded-full ${HABITAT_BAR[standing.habitat]}`}
                  style={{ width: `${pct}%` }}
                />
              </span>
              <span className="w-12 shrink-0 text-right text-xs font-semibold text-violet-300 tabular-nums">
                {standing.count}/{total}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-violet-400">
        Counted by each card&rsquo;s primary habitat.{' '}
        <Link href="/herbdex" className="tap-44 font-semibold text-violet-300 hover:text-gold-400">
          Browse by habitat
        </Link>
      </p>
    </Panel>
  );
}

/**
 * Bar fills, as whole classes.
 *
 * Separate from `HABITAT_TONE` because that string sets text, border and background
 * together for a chip; a bar needs the background alone, and slicing a class out of a
 * shared string at runtime is exactly how a class ends up in the DOM and in no stylesheet.
 */
const HABITAT_BAR = {
  woodland: 'bg-habitat-woodland',
  meadow: 'bg-habitat-meadow',
  wetland: 'bg-habitat-wetland',
  wayside: 'bg-habitat-wayside',
  garden: 'bg-habitat-garden',
} as const;
