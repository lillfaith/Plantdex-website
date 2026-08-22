import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { DISCLAIMER, herbsInDeckOrder, SEASON_LABEL } from '@/lib/deck';
import { assetPath } from '@/lib/asset-path';
import { SEASONS, type Season } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Seasons',
  description:
    'When the plants in the Plantdex deck are typically easiest to find, by season, as printed on the cards.',
};

const SEASON_ICON: Record<Season, string> = {
  spring: '🌸',
  summer: '☀️',
  autumn: '🍁',
  winter: '❄️',
};

/**
 * The seasonal guide.
 *
 * Grouped strictly by the season icon printed on each card — the deck's own judgement of
 * when a plant is typically easiest to find. Deliberately NOT a phenology calendar: the
 * cards do not carry emerging/flowering/fruiting/seeding dates, and inventing per-month
 * stages would be fabricating botanical information. When curated, cited phenology exists
 * it can slot in underneath this without changing the structure.
 */
export default function SeasonsPage() {
  const herbs = herbsInDeckOrder();

  return (
    <main id="main" className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-gold-plate">Seasons</h1>
      <p className="mt-1 text-sm text-violet-300">
        When each plant in the deck is typically easiest to find.
      </p>

      <aside className="panel mt-5 p-4">
        <h2 className="text-xs font-bold tracking-wide text-gold-400 uppercase">
          Typical, not exact
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-violet-200">
          These are the seasons printed on the cards. Real timing shifts with region,
          weather, elevation, microclimate and the individual plant — a species flowering in
          June in one place may not do so until August an hour north, or may sit out a year
          entirely. Treat this as a rough guide to when to start looking, never as a harvesting
          schedule.
        </p>
        <p className="mt-2 text-xs text-violet-400">{DISCLAIMER.availability}</p>
      </aside>

      <div className="mt-8 space-y-8">
        {SEASONS.map((season) => {
          const inSeason = herbs.filter((herb) => herb.season === season);
          return (
            <section key={season} aria-labelledby={`season-${season}`}>
              <div className="flex items-baseline gap-2">
                <h2
                  id={`season-${season}`}
                  className="font-display text-2xl font-bold text-gold-plate"
                >
                  <span aria-hidden="true">{SEASON_ICON[season]}</span> {SEASON_LABEL[season]}
                </h2>
                <span className="text-xs text-violet-400">
                  {inSeason.length} {inSeason.length === 1 ? 'plant' : 'plants'}
                </span>
              </div>

              {inSeason.length === 0 ? (
                <p className="mt-2 text-sm text-violet-400">
                  No cards in the deck are marked for this season.
                </p>
              ) : (
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {inSeason.map((herb) => (
                    <li key={herb.id}>
                      <Link
                        href={`/herbdex/${herb.id}`}
                        className="panel flex items-center gap-3 p-2.5 transition-colors hover:bg-violet-800/50"
                      >
                        <Image
                          src={assetPath(herb.sprite)}
                          alt=""
                          aria-hidden="true"
                          width={276}
                          height={276}
                          className="h-10 w-10 shrink-0 object-contain"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-violet-100">
                            {herb.commonName}
                          </span>
                          <span className="font-botanical block truncate text-xs text-violet-300 italic">
                            {herb.scientificName}
                          </span>
                        </span>
                        <span className="shrink-0 text-[0.6rem] font-bold text-violet-400 tabular-nums">
                          #{String(herb.cardNumber).padStart(2, '0')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-10 text-xs leading-relaxed text-violet-400">
        Region selection and month-by-month phenology are not built yet. They need curated,
        cited data per region — inventing it here would be guessing at something people
        might act on outdoors.
      </p>
    </main>
  );
}
