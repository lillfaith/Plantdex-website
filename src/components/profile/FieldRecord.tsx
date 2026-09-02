import Link from 'next/link';
import { getHerb } from '@/lib/deck';
import type { ProfileStats } from '@/lib/profile-stats';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';
import { RarityBadge } from '../herbdex/RarityBadge';
import { MICRO_LABEL } from '../ui/accents';

/**
 * The field record: five figures, none of them stored.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * SUNKEN TILES, NOT BORDERED CARDS. The first version was six outlined boxes inside an
 * outlined panel — rectangles inside rectangles, which is most of why the page read as
 * repetitive. `.sunken` is darker than the panel it sits in with a hairline of light along
 * its top edge, so a tile reads as a recess rather than as another card, and needs no
 * outline at all.
 *
 * COLOUR IS AN ACCENT, NEVER A SURFACE. Each stat owns a hue, and it appears in exactly two
 * places: the meter fill and the icon. A tile tinted with its own colour would set six
 * competing surfaces against the panel and against each other; the meters carry it fine.
 *
 * COMPLETION IS NOT HERE. It moved to the hero's ring. Printing it a third time — bar, ring,
 * tile — is how a number stops being read.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every value arrives already derived by `profileStats()` from the discovery, learned,
 * mastered, research and achievement records. There is no cached count behind any of it.
 */

interface Tile {
  label: string;
  icon: IconName;
  value: number;
  /** Absent where there is genuinely no total — Field Research keeps producing tasks. */
  total?: number;
  /** Whole Tailwind classes. The stat's colour lives here and on its icon, nowhere else. */
  fill: string;
  tint: string;
}

export function FieldRecord({ stats }: { stats: ProfileStats }) {
  const rarest = stats.rarestHerbId ? getHerb(stats.rarestHerbId) : undefined;

  const tiles: Tile[] = [
    {
      label: 'Discovered',
      icon: 'discovered',
      value: stats.discovered,
      total: stats.deckSize,
      fill: 'bg-cyan-accent',
      tint: 'text-cyan-accent',
    },
    {
      label: 'Learned',
      icon: 'learned',
      value: stats.learned,
      total: stats.deckSize,
      fill: 'bg-mystery-lilac',
      tint: 'text-mystery-lilac',
    },
    {
      label: 'Mastered',
      icon: 'mastered',
      value: stats.mastered,
      total: stats.deckSize,
      fill: 'bg-gold-500',
      tint: 'text-gold-400',
    },
    {
      label: 'Achievements',
      icon: 'laurel',
      value: stats.achievementsEarned,
      total: stats.achievementsTotal,
      fill: 'bg-mystery-pink',
      tint: 'text-mystery-pink',
    },
    {
      label: 'Field Research',
      icon: 'research',
      value: stats.researchCompleted,
      fill: 'bg-mystery-orchid',
      tint: 'text-mystery-orchid',
    },
  ];

  return (
    <section aria-labelledby="profile-record" className="panel p-4 sm:p-5">
      <h2
        id="profile-record"
        className="font-display text-lg font-extrabold text-gold-plate sm:text-xl"
      >
        Field record
      </h2>

      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        {tiles.map((tile, index) => {
          const pct = tile.total ? Math.round((tile.value / tile.total) * 100) : 0;
          // Five tiles into a two-column grid leaves an odd one out; the last spans the row
          // rather than sitting beside a hole.
          const span = index === tiles.length - 1 ? 'col-span-2 sm:col-span-1' : '';
          return (
            <li key={tile.label} className={`sunken p-3 ${span}`}>
              <p className={`${MICRO_LABEL} flex items-center gap-1.5 text-violet-300`}>
                <PlantdexIcon name={tile.icon} className={`text-sm ${tile.tint}`} aria-hidden="true" />
                {tile.label}
              </p>
              <p className="mt-1.5 text-3xl leading-none font-extrabold text-violet-100 tabular-nums sm:text-4xl">
                {tile.value.toLocaleString()}
                {tile.total !== undefined && (
                  <span className="ml-1 align-baseline text-sm font-bold text-violet-400">
                    / {tile.total}
                  </span>
                )}
              </p>
              {tile.total !== undefined ? (
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-plum-950"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${tile.label}: ${tile.value} of ${tile.total}`}
                >
                  <div className={`path-fill h-full rounded-full ${tile.fill}`} style={{ '--fill': `${pct}%` } as React.CSSProperties} />
                </div>
              ) : (
                // No meter, deliberately: research tasks keep coming, so there is no total to
                // be a fraction of and a bar here would invent a finish line.
                <p className="mt-2 text-xs text-violet-400">tasks completed</p>
              )}
            </li>
          );
        })}
      </ul>

      {rarest && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-violet-300">
          <span className={`${MICRO_LABEL} text-violet-400`}>Rarest held</span>
          <Link href={`/herbdex/${rarest.id}`} className="tap-44 font-bold text-violet-100 hover:text-gold-300">
            {rarest.commonName}
          </Link>
          <RarityBadge rarity={rarest.rarity} />
        </p>
      )}
    </section>
  );
}
