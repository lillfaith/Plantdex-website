'use client';

import Link from 'next/link';
import { useState } from 'react';
import { GrowthSprite } from '../garden/GrowthSprite';
import { HerbCard } from '../herbdex/HerbCard';
import { PlantCoreWindow } from './PlantCoreWindow';
import { PRINTED_DECK_SIZE, getPrintedCard, printedCardsInDeckOrder } from '@/lib/deck';
import { buildGarden } from '@/lib/garden';
import { useHerbdex } from '@/state/HerbdexProvider';

/** PROTOTYPE host: the real Garden tiles (variant garden) or real Collection cards (variant quick) with the window opened over them. Owner review only. */
export function PlantCoreProtoHost({ variant }: { variant: 'garden' | 'quick' }) {
  const { state, ready } = useHerbdex();
  const [open, setOpen] = useState(true);
  const [pick, setPick] = useState(0);
  if (!ready) return <p className="p-6">Loading</p>;
  const order = printedCardsInDeckOrder().map((h) => h.id);
  const plants = buildGarden(state, order);
  void PRINTED_DECK_SIZE;
  return (
    <main id="main" data-ground="lavender" data-shade="home" className="mx-auto max-w-md px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-gold-plate">{variant === 'garden' ? 'My Garden' : 'My Collection'}</h1>
      <p className="mt-1 text-sm text-violet-300">
        {variant === 'garden' ? 'Tap a plant to open its window.' : 'Tap a collected card for a quick view.'}
      </p>
      <div className="panel mt-4 p-4">
        {variant === 'garden' ? (
          <ul className="grid grid-cols-3 gap-3">
            {plants.map((p, i) => {
              const herb = getPrintedCard(p.herbId);
              if (!herb) return null;
              return (
                <li key={p.herbId}>
                  <button type="button" onClick={() => { setPick(i); setOpen(true); }} className="tap-44 flex w-full flex-col items-center rounded-xl p-2" aria-label={`Open ${herb.commonName}`}>
                    <span className="sprite-glow relative flex h-20 w-full items-end justify-center" data-glow="violet">
                      <GrowthSprite herb={herb} stage={p.stage} className="w-full" />
                    </span>
                    <span className="mt-1 text-xs font-semibold">{herb.commonName}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {plants.map((p, i) => {
              const herb = getPrintedCard(p.herbId);
              if (!herb) return null;
              return (
                <li key={p.herbId} onClickCapture={(e) => { e.preventDefault(); setPick(i); setOpen(true); }}>
                  <HerbCard herb={herb} discovered stage="discovered" priority={false} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-4 text-center text-xs">
        <Link href="/herbdex" className="underline">Back to the real {variant === 'garden' ? 'Garden' : 'Collection'}</Link>
      </p>
      {open && plants.length > 0 && (
        <div className="fixed inset-x-0 top-[18%] z-[60] px-4">
          <div className="pc-backdrop fixed inset-0 -z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <PlantCoreWindow key={pick} plants={plants} startIndex={pick} variant={variant} onClose={() => setOpen(false)} />
        </div>
      )}
    </main>
  );
}
