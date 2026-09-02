import { getHerb } from '@/lib/deck';
import type { ProfileStats } from '@/lib/profile-stats';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';
import { RarityBadge } from '../herbdex/RarityBadge';
import { Panel } from '../ui/Panel';
import { SectionHeader } from '../ui/SectionHeader';
import { MICRO_LABEL } from '../ui/accents';

/**
 * The field record: six figures, none of them stored.
 *
 * Every value arrives already derived by `profileStats()` from the discovery, learned,
 * mastered, research and achievement records — there is no cached count anywhere behind
 * this, on the client or on the server, for the same reason XP has never been stored.
 *
 * NOT A TABLE. Each figure gets an icon, a large numeral and, where a denominator genuinely
 * exists, a meter — so the section reads at a glance rather than being parsed. Field
 * Research deliberately has no meter: tasks keep coming, so there is no total to be a
 * fraction of, and drawing one would invent a finish line.
 */

interface Tile {
  label: string;
  icon: IconName;
  value: number;
  /** Absent where there is genuinely no total — see above. */
  total?: number;
  /** Whole Tailwind classes for the meter fill. */
  fill: string;
  suffix?: string;
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
    },
    {
      label: 'Learned',
      icon: 'learned',
      value: stats.learned,
      total: stats.deckSize,
      fill: 'bg-mystery-lilac',
    },
    {
      label: 'Mastered',
      icon: 'mastered',
      value: stats.mastered,
      total: stats.deckSize,
      fill: 'bg-gold-500',
    },
    {
      label: 'Achievements',
      icon: 'laurel',
      value: stats.achievementsEarned,
      total: stats.achievementsTotal,
      fill: 'bg-mystery-pink',
    },
    {
      label: 'Field Research',
      icon: 'research',
      value: stats.researchCompleted,
      fill: 'bg-mystery-orchid',
    },
    {
      label: 'Collection',
      icon: 'herbdex',
      value: stats.completionPct,
      total: 100,
      suffix: '%',
      fill: 'bg-pink-accent',
    },
  ];

  return (
    <Panel aria-labelledby="profile-record" pad="md">
      <SectionHeader
        id="profile-record"
        eyebrow="Field record"
        title="What you have done"
        accent="violet"
        icon="journal"
        right={
          rarest ? (
            <span className="flex items-center gap-2">
              <span className={`${MICRO_LABEL} text-violet-400`}>Rarest held</span>
              <RarityBadge rarity={rarest.rarity} />
            </span>
          ) : undefined
        }
      />

      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {tiles.map((tile) => {
          const pct = tile.total ? Math.round((tile.value / tile.total) * 100) : 0;
          return (
            <li
              key={tile.label}
              className="rounded-2xl border border-violet-700/60 bg-plum-800/60 p-3"
            >
              <p className={`${MICRO_LABEL} flex items-center gap-1.5 text-violet-300`}>
                <PlantdexIcon name={tile.icon} className="text-sm text-violet-400" aria-hidden="true" />
                {tile.label}
              </p>
              <p className="mt-1 text-2xl leading-none font-extrabold text-gold-plate tabular-nums">
                {tile.value.toLocaleString()}
                {tile.suffix}
                {tile.total !== undefined && tile.suffix === undefined && (
                  <span className="ml-1 text-sm font-semibold text-violet-400">
                    / {tile.total}
                  </span>
                )}
              </p>
              {tile.total !== undefined && (
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-plum-950/70"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${tile.label}: ${tile.value} of ${tile.total}`}
                >
                  <div className={`h-full rounded-full ${tile.fill}`} style={{ width: `${pct}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {rarest && (
        <p className="mt-3 text-xs text-violet-400">
          Rarest card in your collection: <span className="text-violet-200">{rarest.commonName}</span>.
        </p>
      )}
    </Panel>
  );
}
