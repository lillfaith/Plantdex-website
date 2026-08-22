'use client';

import Link from 'next/link';
import Image from 'next/image';
import { DECK_SIZE, getHerb, herbsInDeckOrder } from '@/lib/deck';
import { assetPath } from '@/lib/asset-path';
import { useHerbdex } from '@/state/HerbdexProvider';
import { buildGarden, nextStageHint, STAGE_LABEL, STAGE_SCALE } from '@/lib/garden';
import { GrowthPlaceholder } from '../GrowthLoader';

/**
 * My Garden — every species the player has discovered, growing as they engage with it.
 *
 * The sprites are the deck's own pixel art, cropped from the card fronts, so the garden
 * is visibly made of the same plants as the physical cards rather than stand-in clip art.
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
              🌱
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
                    className="group flex flex-col items-center rounded-xl p-2 transition-colors hover:bg-violet-800/50"
                  >
                    {/* Sprites sit on a shared baseline so the bed reads as one planting.
                        Size is the growth language: a sprout is small and pale, a mastered
                        plant is full size and lit. Both stages also say their name, so the
                        difference is never carried by the visual alone. */}
                    <span className="flex h-20 w-full items-end justify-center">
                      <Image
                        src={assetPath(herb.sprite)}
                        alt=""
                        aria-hidden="true"
                        width={276}
                        height={276}
                        style={{ width: `${STAGE_SCALE[stage] * 100}%` }}
                        className={`max-h-20 origin-bottom object-contain transition-all duration-700 ease-out motion-reduce:transition-none ${
                          stage === 'sprout'
                            ? 'opacity-70 saturate-[0.7]'
                            : stage === 'growing'
                              ? 'opacity-90'
                              : 'drop-shadow-[0_0_10px_rgba(240,193,90,0.45)]'
                        }`}
                      />
                    </span>
                    <span className="mt-1 w-full truncate text-center text-[0.68rem] font-semibold text-violet-100">
                      {herb.commonName}
                    </span>
                    <span
                      className={`text-center text-[0.6rem] ${
                        stage === 'flowering' ? 'font-bold text-gold-300' : 'text-violet-400'
                      }`}
                    >
                      {stage === 'flowering' ? '★ ' : ''}
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
