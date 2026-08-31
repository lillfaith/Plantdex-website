import type { HerbStats } from '@/lib/types';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';

const MAX_PIPS = 5;

const ROWS: {
  key: keyof HerbStats;
  label: string;
  icon: IconName;
  color: string;
  glow: string;
}[] = [
  // Each pip's own colour is what it blooms with, so a lit water pip reads as water and
  // not as generic UI glow. These three are the page's only sanctioned use of cyan.
  {
    key: 'water',
    label: 'Water',
    icon: 'water',
    color: 'bg-stat-water',
    glow: 'shadow-[0_0_6px_var(--color-stat-water)]',
  },
  {
    key: 'sun',
    label: 'Sun',
    icon: 'sun',
    color: 'bg-stat-sun',
    glow: 'shadow-[0_0_6px_var(--color-stat-sun)]',
  },
  {
    key: 'temperature',
    label: 'Temperature',
    icon: 'temperature',
    color: 'bg-stat-temp',
    glow: 'shadow-[0_0_6px_var(--color-stat-temp)]',
  },
];

/**
 * The 1-5 pip rows printed on each card face.
 *
 * The numeric value is rendered as text alongside the pips, not conveyed by colour or
 * count alone, so the rating is available to screen readers and to anyone who cannot
 * distinguish the pip colours.
 */
export function StatPips({ stats }: { stats: HerbStats }) {
  return (
    <dl className="space-y-2">
      {ROWS.map((row) => {
        const value = stats[row.key];
        return (
          <div key={row.key} className="flex items-center gap-3">
            <dt className="flex w-32 shrink-0 items-center gap-1.5 text-xs font-medium text-violet-200">
              <PlantdexIcon name={row.icon} className="text-sm" />
              {row.label}
            </dt>
            <dd className="flex items-center gap-2">
              <span className="flex gap-1.5" aria-hidden="true">
                {Array.from({ length: MAX_PIPS }, (_, index) => {
                  const filled = index < value;
                  return (
                    <span
                      key={index}
                      /*
                       * Filled pips are lit and staggered in; empty ones are a recessed
                       * socket rather than a dim dot, so the read is "two of five" at a
                       * glance instead of "five dots, some darker". The delay is per pip
                       * and runs once — under reduced motion `.pip-fill` is pinned to its
                       * resting state rather than merely sped up.
                       */
                      className={
                        filled
                          ? `pip-fill h-2.5 w-2.5 rounded-full ${row.color} ${row.glow}`
                          : 'h-2.5 w-2.5 rounded-full border border-violet-700 bg-plum-950/70'
                      }
                      style={filled ? { animationDelay: `${index * 70}ms` } : undefined}
                    />
                  );
                })}
              </span>
              <span className="text-xs font-semibold text-violet-200">
                {value}
                <span className="sr-only"> out of {MAX_PIPS}</span>
                <span aria-hidden="true" className="text-violet-400">
                  /{MAX_PIPS}
                </span>
              </span>
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
