import type { HerbStats } from '@/lib/types';

const MAX_PIPS = 5;

const ROWS = [
  { key: 'water', label: 'Water', symbol: '💧', color: 'bg-stat-water' },
  { key: 'sun', label: 'Sun', symbol: '☀', color: 'bg-stat-sun' },
  { key: 'temperature', label: 'Temperature', symbol: '🌡', color: 'bg-stat-temp' },
] as const;

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
            <dt className="flex w-32 shrink-0 items-center gap-1.5 text-xs font-medium text-violet-300">
              <span aria-hidden="true">{row.symbol}</span>
              {row.label}
            </dt>
            <dd className="flex items-center gap-2">
              <span className="flex gap-1" aria-hidden="true">
                {Array.from({ length: MAX_PIPS }, (_, index) => (
                  <span
                    key={index}
                    className={`h-2.5 w-2.5 rounded-full ${
                      index < value ? row.color : 'bg-violet-700'
                    }`}
                  />
                ))}
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
