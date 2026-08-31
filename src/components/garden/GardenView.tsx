'use client';

import Link from 'next/link';
import { DECK_SIZE, getHerb, herbsInDeckOrder } from '@/lib/deck';
import { useHerbdex } from '@/state/HerbdexProvider';
import { buildGarden, nextStageHint, STAGE_LABEL } from '@/lib/garden';
import { GrowthSprite } from './GrowthSprite';
import { GrowthPlaceholder } from '../GrowthLoader';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * My Garden — every species the player has discovered, growing as they engage with it.
 *
 * Each plant is its own CREATURE at the stage that player has grown it to: a shy green
 * rosette while it is only discovered, a bud once its card is learned, the full character
 * once it is mastered. The card page draws the same creature from the same lookup, so a
 * player's dandelion is the same age in both places. Stages are authored one species at a
 * time (see `docs/creature-stages.md`); a species without them yet shows its adult, which
 * is what every portrait on the site did before staging existed.
 *
 * The stage is also written under every sprite, because AGENTS.md does not allow the
 * artwork to be the only thing carrying it.
 */
export function GardenView() {
  const { state, ready, masteredCount } = useHerbdex();

  const order = herbsInDeckOrder().map((herb) => herb.id);
  const garden = ready ? buildGarden(state, order) : [];

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-gold-plate">My Garden</h1>
      <p className="mt-1 text-sm text-violet-300">
        Every plant you&apos;ve found, growing as you get to know it.
      </p>

      <p aria-live="polite" className="mt-4 text-xs font-semibold text-violet-200">
        {garden.length} of {DECK_SIZE} species planted
        {masteredCount > 0 && (
          <span className="text-violet-400"> · {masteredCount} flowering</span>
        )}
      </p>

      {/* The bed: fuller as the collection grows. */}
      <div className="panel mt-4 min-h-64 overflow-hidden p-4">
        {!ready ? (
          <GrowthPlaceholder className="h-48" label="Loading your garden" />
        ) : garden.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-4xl" aria-hidden="true">
              <PlantdexIcon name="garden" />
            </p>
            <p className="mt-3 text-sm text-violet-200">Your garden is empty ground.</p>
            <p className="mt-1 text-sm text-violet-300">
              Every plant you discover takes root here.
            </p>
            <Link
              href="/herbdex"
              className="mt-4 inline-flex min-h-11 items-center rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400"
            >
              Open my Herbdex
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {garden.map(({ herbId, stage }) => {
              const herb = getHerb(herbId);
              if (!herb) return null;
              const hint = nextStageHint(stage);
              return (
                <li key={herbId}>
                  <Link
                    href={`/herbdex/${herb.id}`}
                    className="group flex flex-col items-center rounded-xl p-2 transition-colors hover:bg-plum-600/50"
                  >
                    {/* Every sprite gets the same box and stands on its bottom edge, so a
                        pine and a dandelion share one ground line and the bed reads as a
                        planting rather than a row of stickers. Growth is carried by the
                        DRAWING now, not by scaling one image up and down. */}
                    <span className="flex h-20 w-full items-end justify-center">
                      <GrowthSprite herb={herb} stage={stage} />
                    </span>
                    <span className="mt-1 w-full truncate text-center text-xs font-semibold text-violet-100">
                      {herb.commonName}
                    </span>
                    <span
                      className={`text-center text-[0.72rem] ${
                        stage === 'flowering' ? 'font-bold text-gold-300' : 'text-violet-400'
                      }`}
                    >
                      {STAGE_LABEL[stage]}
                    </span>
                    {hint && <span className="sr-only">{hint}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* The three stages are already labelled under every sprite, so this says what the
          labels cannot: what moves a plant along, and that waiting never does. */}
      <div className="panel mt-4 p-4">
        <h2 className="text-xs font-bold tracking-wide text-violet-300 uppercase">
          How plants grow
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-violet-200">
          Find it — <strong className="text-gold-300">sprout</strong>. Learn its card —{' '}
          <strong className="text-gold-300">growing</strong>. Find it again —{' '}
          <strong className="text-gold-300">flowering</strong>.
        </p>
        <p className="mt-2 text-xs text-violet-400">
          Nothing grows by waiting. No watering, no timers. Your garden grows with every
          Plantdex collection.
        </p>
      </div>
    </main>
  );
}
