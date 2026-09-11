'use client';

import { useEffect } from 'react';

import Link from 'next/link';
import { PRINTED_DECK_SIZE, getPrintedCard, printedCardsInDeckOrder } from '@/lib/deck';
import { useHerbdex } from '@/state/HerbdexProvider';
import { buildGarden, nextStageHint, MASTERY_BY_GARDEN_STAGE } from '@/lib/garden';
import { MASTERY_STAGE_LABEL } from '@/lib/mastery';
import { clearAdvanced, recordStages, useGardenMoments } from '@/lib/garden-moments';
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

  const order = printedCardsInDeckOrder().map((herb) => herb.id);
  const garden = ready ? buildGarden(state, order) : [];

  /*
   * WHICH PLANTS GREW SINCE THIS SESSION LAST SHOWED THEM — see `garden-moments.ts` for why
   * that question, and not "did this render", is the one worth asking.
   *
   * Recorded in an effect because it writes to a module-level store: doing it during render
   * makes the component impure and fires twice under StrictMode. The cleanup clears the batch
   * after 1.2s, the same beat `MasteryTrack` uses to retire its own earned flag, so the
   * announcement ends by itself rather than sitting on the page until you navigate away.
   */
  const justAdvanced = useGardenMoments();
  const stageSignature = garden.map((entry) => `${entry.herbId}:${entry.stage}`).join(',');

  useEffect(() => {
    if (!ready) return;
    if (recordStages(garden).length === 0) return;
    const timer = setTimeout(clearAdvanced, 1200);
    return () => clearTimeout(timer);
    // `stageSignature` rather than `garden`: the array is rebuilt every render and would
    // re-run this on renders where not one plant changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, stageSignature]);

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-gold-plate">My Garden</h1>
      <p className="mt-1 text-sm text-violet-300">
        Every plant you&apos;ve found, growing as you get to know it.
      </p>

      <p aria-live="polite" className="mt-4 text-xs font-semibold text-violet-200">
        {garden.length} of {PRINTED_DECK_SIZE} species planted
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
              const herb = getPrintedCard(herbId);
              if (!herb) return null;
              const action = nextStageHint(stage);
              const flowering = stage === 'flowering';
              const advanced = justAdvanced.includes(herbId);
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
                      <GrowthSprite herb={herb} stage={stage} advanced={advanced} />
                    </span>

                    {/*
                      THE FINISHED STATE, AND IT IS STATIC. A mature plant is rooted, so it
                      stands on a lit strip of soil while the younger two do not. `soil-line`
                      already exists and is used by the profile's garden strip; nothing here
                      glows, pulses or loops, because the one thing that would cheapen
                      "finished" is making it flicker for as long as you look at it.
                    */}
                    {flowering && (
                      <span aria-hidden="true" className="soil-line mt-0.5 h-0.5 w-10 rounded-full" />
                    )}

                    <span className="mt-1 w-full truncate text-center text-xs font-semibold text-violet-100">
                      {herb.commonName}
                    </span>

                    {/*
                      TWO LINES, ANSWERING TWO QUESTIONS. The first says why this plant is at
                      this stage — the mastery word, not the growth word, because the drawing
                      already shows a sprout and repeating it teaches nothing. The second says
                      what moves it next, and is simply absent on a mastered card, which is
                      what makes a shorter tile read as a finished one.

                      NOT ALSO `sr-only`. The hint used to be screen-reader-only and invisible
                      to everyone else; duplicating it now that it is visible would just make a
                      screen reader say it twice. This IS the accessible text.
                    */}
                    <span
                      className={`text-center text-[0.72rem] ${
                        flowering ? 'font-bold text-gold-300' : 'text-violet-300'
                      }`}
                    >
                      {MASTERY_STAGE_LABEL[MASTERY_BY_GARDEN_STAGE[stage]]}
                    </span>
                    {action && (
                      <span className="text-center text-[0.72rem] text-violet-400">{action}</span>
                    )}
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

      {/*
        The Garden's sibling, and the reason it belongs here rather than in the nav: this bed
        holds the 45 species that HAVE cards, and the obvious next question — "what about
        everything else I found?" — is asked standing in front of it. Six destinations
        already crowd a 390px bottom bar.
      */}
      <Link
        href="/seed-shelf"
        className="mt-4 flex min-h-14 items-center justify-between gap-3 rounded-xl border border-violet-700/60 bg-plum-800/50 p-4 transition-colors hover:border-violet-600 hover:bg-plum-600/40"
      >
        <span>
          <span className="block text-sm font-bold text-violet-100">Your Seed Shelf</span>
          <span className="block text-xs text-violet-300">
            Plants you&apos;ve found that aren&apos;t cards yet, kept as seed packets
          </span>
        </span>
        <span aria-hidden="true" className="text-gold-400">
          &rarr;
        </span>
      </Link>
    </main>
  );
}
