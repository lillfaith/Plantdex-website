import Link from 'next/link';
import { HABITAT_BLURB, HABITAT_LABEL, herbIdsInHabitat } from '@/lib/habitat';
import type { ProfileStats } from '@/lib/profile-stats';
import { HABITAT_ICON, HABITAT_TONE } from '../game/HabitatChip';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { MICRO_LABEL } from '../ui/accents';

/**
 * Which ground this player actually works — as a chart rather than as a list.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BARS ARE THE SECTION. They shipped 2px tall at 45% opacity, which is a rule with a
 * tint on it, not a reading. At 10px and full token strength the five habitats become
 * genuinely comparable at a glance — which is the only reason to draw them rather than
 * print five numbers.
 *
 * EACH BAR IS MEASURED AGAINST ITS OWN HABITAT'S SUPPLY. The classes are very different
 * sizes (6 wetland cards, 29 wayside), so a shared denominator would make the big grounds
 * look neglected by a player who has worked them hardest.
 *
 * THE LEADER IS LIFTED, NOT JUST FIRST. Its row takes the habitat's own tint and a bolder
 * label, and it is repeated as a medallion above the chart. Colour is never the only signal:
 * every habitat is spelled out beside its bar, and the leader is named in words.
 *
 * IT NAMES NOTHING WHEN THERE IS NOTHING TO NAME. `topHabitat` is null on an empty
 * collection rather than the first habitat at zero — "Most explored: Woodland" under a count
 * of 0 is a lie dressed as a statistic.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Bar fills, as whole classes.
 *
 * Separate from `HABITAT_TONE` because that string sets text, border and background together
 * for a chip; a bar needs the background alone, and slicing a class out of a shared string at
 * runtime produces a class that exists in the DOM and in no stylesheet.
 */
const HABITAT_BAR = {
  woodland: 'bg-habitat-woodland',
  meadow: 'bg-habitat-meadow',
  wetland: 'bg-habitat-wetland',
  wayside: 'bg-habitat-wayside',
  garden: 'bg-habitat-garden',
} as const;

export function HabitatIdentity({ stats }: { stats: ProfileStats }) {
  const top = stats.topHabitat;

  return (
    <section aria-labelledby="profile-habitat" className="panel p-4 sm:p-5">
      <h2 id="profile-habitat" className="sr-only">
        Habitat identity
      </h2>

      {top ? (
        <div className="flex items-center gap-3.5">
          <span
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border text-3xl ${HABITAT_TONE[top.habitat]}`}
          >
            <PlantdexIcon name={HABITAT_ICON[top.habitat]} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className={`${MICRO_LABEL} text-violet-300`}>Most explored</p>
            <p className="font-display mt-0.5 text-2xl leading-none font-extrabold text-gold-plate">
              {HABITAT_LABEL[top.habitat]}
            </p>
            <p className="mt-1 text-xs text-violet-400">
              {top.count} plant{top.count === 1 ? '' : 's'} found here
            </p>
          </div>
        </div>
      ) : (
        <div>
          <p className={`${MICRO_LABEL} text-violet-300`}>Most explored</p>
          <p className="font-display mt-0.5 text-xl font-extrabold text-gold-plate">Nowhere yet</p>
          <p className="mt-1 text-sm text-violet-300">
            Find a plant and the ground you walk starts showing up here.
          </p>
        </div>
      )}

      {top && <p className="mt-2.5 text-xs text-violet-300">{HABITAT_BLURB[top.habitat]}</p>}

      <ul className="mt-4 space-y-2.5">
        {stats.habitats.map((standing) => {
          const total = herbIdsInHabitat(standing.habitat).length;
          const pct = total > 0 ? Math.round((standing.count / total) * 100) : 0;
          const leading = top?.habitat === standing.habitat;
          return (
            <li key={standing.habitat} className="flex items-center gap-2.5">
              <PlantdexIcon
                name={HABITAT_ICON[standing.habitat]}
                className={`shrink-0 text-sm ${leading ? 'text-violet-100' : 'text-violet-400'}`}
                aria-hidden="true"
              />
              <span
                className={`w-[4.5rem] shrink-0 text-[0.72rem] tracking-[0.06em] uppercase sm:w-24 ${
                  leading ? 'font-extrabold text-violet-100' : 'font-bold text-violet-300'
                }`}
              >
                {HABITAT_LABEL[standing.habitat]}
              </span>
              <span
                className="h-2.5 flex-1 overflow-hidden rounded-full bg-plum-950"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${HABITAT_LABEL[standing.habitat]}: ${standing.count} of ${total} found${leading ? ', your most explored' : ''}`}
              >
                <span
                  className={`path-fill block h-full rounded-full ${HABITAT_BAR[standing.habitat]} ${leading ? '' : 'opacity-70'}`}
                  style={{ '--fill': `${pct}%` } as React.CSSProperties}
                />
              </span>
              <span
                className={`w-11 shrink-0 text-right text-xs tabular-nums ${
                  leading ? 'font-extrabold text-violet-100' : 'font-semibold text-violet-300'
                }`}
              >
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
    </section>
  );
}
