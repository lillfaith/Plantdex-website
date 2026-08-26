'use client';

import { useRef } from 'react';
import type { DiscoveryResult, Herb } from '@/lib/types';
import { revealHerb } from '@/lib/reveals';
import { siteCautionFor } from '@/lib/card-cautions';
import { DiscoverPanel } from './DiscoverPanel';
import { CardWarning, SiteCaution } from '../SafetyNotice';
import { MysteryCard } from './MysteryCard';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * A herb the player has not discovered yet.
 *
 * Shows the card number and the same blurred silhouette as the grid, and nothing that
 * would spoil the reveal — no name, no artwork, no card-back content.
 *
 * The escape hatch is deliberately quiet: someone playing normally should feel pulled
 * outdoors, while someone who bought the deck to read about plants (or who arrived from
 * a search engine) is not stonewalled. Revealing is explicitly *not* discovering — it
 * awards nothing and leaves this card locked in the Herbdex grid.
 */
export function LockedHerb({
  herb,
  onDiscovered,
}: {
  herb: Herb;
  onDiscovered?: (result: DiscoveryResult) => void;
}) {
  const confirmRef = useRef<HTMLDialogElement>(null);
  const number = `#${String(herb.cardNumber).padStart(2, '0')}`;
  const siteCaution = siteCautionFor(herb);

  return (
    <div className="mx-auto max-w-sm text-center">
      <p className="flex items-center justify-center gap-1.5 text-xs font-bold tracking-[0.2em] text-violet-300 uppercase">
        <PlantdexIcon name="locked" className="text-sm" />
        {number} — Undiscovered
      </p>

      {/*
        The card, face down. Same treatment as the grid — the printed back's own pink to
        periwinkle ramp, with the plant present only as a shadow. Larger here, so the
        silhouette is worth looking at rather than merely worth noticing.
      */}
      <div className="relative mx-auto mt-4 aspect-[356/576] w-52 overflow-hidden rounded-[var(--radius-card)] shadow-card-lift">
        <MysteryCard herb={herb} size="detail" />
      </div>

      <h1 className="font-display mt-5 text-2xl font-bold text-violet-100">
        You haven&apos;t discovered this plant yet
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-violet-300">
        Find it outdoors to reveal its Plantdex card and earn{' '}
        <strong className="text-gold-300">+{herb.xp} XP</strong>.
      </p>

      {/*
        A warning printed on the physical card shows even while the plant is locked.
        AGENTS.md requires card warnings never to sit behind an interaction, and that
        outranks preserving the surprise — it names a real risk of misidentification.
      */}
      {herb.warning && (
        <div className="mt-4 text-left">
          <CardWarning warning={herb.warning} />
        </div>
      )}

      {/*
        Same reasoning for a caution the site adds: the risk is real whether or not the
        card prints it, and it names no plant, so showing it costs nothing of the reveal.
      */}
      {siteCaution && (
        <div className="mt-4 text-left">
          <SiteCaution caution={siteCaution} />
        </div>
      )}

      <div className="mt-5">
        <DiscoverPanel herb={herb} label="Log a Discovery" spoilerFree onDiscovered={onDiscovered} />
      </div>

      <p className="mt-5 text-xs text-violet-400">
        Just here to learn?{' '}
        <button
          type="button"
          onClick={() => confirmRef.current?.showModal()}
          className="font-semibold text-violet-300 underline underline-offset-2 hover:text-gold-400"
        >
          Reveal plant <span aria-hidden="true">→</span>
        </button>
      </p>

      <dialog
        ref={confirmRef}
        aria-labelledby="reveal-title"
        className="panel m-auto w-[min(24rem,calc(100vw-2rem))] p-5 text-left text-violet-100 backdrop:bg-plum-950/80 backdrop:backdrop-blur-sm"
      >
        <h2 id="reveal-title" className="font-display text-lg font-bold text-gold-plate">
          Reveal this plant?
        </h2>
        <p className="mt-2 text-sm text-violet-200">
          This will show its identity and card, but it won&apos;t count toward your Herbdex
          collection. It stays locked until you log a real discovery.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => confirmRef.current?.close()}
            className="min-h-11 rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-plum-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              revealHerb(herb.id);
              confirmRef.current?.close();
            }}
            className="min-h-11 rounded-full bg-violet-600 px-5 text-sm font-bold text-violet-100 hover:bg-violet-500"
          >
            Reveal Anyway
          </button>
        </div>
      </dialog>
    </div>
  );
}
