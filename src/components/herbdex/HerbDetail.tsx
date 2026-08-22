'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { DiscoveryResult, Herb } from '@/lib/types';
import { SEASON_LABEL, USE_LABEL } from '@/lib/deck';
import { XP_FOR_MASTERY } from '@/lib/progression';
import { cardLabel } from '@/lib/collection';
import { usePrevious } from '@/lib/use-previous';
import { useHerbdex } from '@/state/HerbdexProvider';
import { useRevealed } from '@/lib/reveals';
import { StatPips } from './StatPips';
import { RarityBadge } from './RarityBadge';
import { DiscoverPanel } from './DiscoverPanel';
import { CardFlip } from './CardFlip';
import { CardBackDetails } from './CardBackDetails';
import { LockedHerb } from './LockedHerb';
import { DiscoveryCelebration } from './DiscoveryCelebration';
import { MasteryTrack } from './MasteryTrack';
import { SourcesSection } from './SourcesSection';
import { MySightings } from '../journal/MySightings';
import { CardWarning, SafetyNotice } from '../SafetyNotice';

/**
 * A herb page, gated on discovery.
 *
 * Undiscovered and unrevealed → the locked view, which shows nothing that would spoil
 * the card. Discovered *or* explicitly revealed → the full entry.
 *
 * The gate is client-side because discovery lives in the browser, which means the static
 * HTML never contains the plant's content. The page's <title> and description still name
 * the plant so the deck remains findable in search; the body is what stays hidden.
 */
export function HerbDetail({ herb }: { herb: Herb }) {
  const { isDiscovered, ready, progress, stageOf } = useHerbdex();
  const revealed = useRevealed(herb.id);

  /*
   * The celebration lives here rather than inside DiscoverPanel because discovering
   * swaps the locked view for the full one, unmounting whichever panel triggered it.
   * This component re-renders through that swap instead of unmounting, so the dialog
   * survives long enough to be seen.
   */
  const celebrateRef = useRef<HTMLDialogElement>(null);
  const [celebration, setCelebration] = useState<DiscoveryResult | null>(null);

  const onDiscovered = useCallback((result: DiscoveryResult) => {
    setCelebration(result);
    celebrateRef.current?.showModal();
  }, []);

  // Keep state in sync when the dialog is closed with Escape or a backdrop click.
  useEffect(() => {
    const node = celebrateRef.current;
    if (!node) return;
    const handleClose = () => setCelebration(null);
    node.addEventListener('close', handleClose);
    return () => node.removeEventListener('close', handleClose);
  }, []);

  const celebrationDialog = (
    <dialog
      ref={celebrateRef}
      aria-labelledby="celebrate-title"
      className="panel m-auto max-h-[90dvh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto p-5 text-violet-100 backdrop:bg-violet-deep/85 backdrop:backdrop-blur-sm"
    >
      {celebration && (
        <DiscoveryCelebration
          herb={herb}
          result={celebration}
          xpAfter={progress.xp}
          onClose={() => celebrateRef.current?.close()}
        />
      )}
    </dialog>
  );

  /*
   * Mastery is not awarded by a button here — it is reconciled from sightings the moment
   * they qualify (see HerbdexProvider). So the moment worth marking is the *transition*,
   * which this watches for. `previousStage` is null on first render of a freshly loaded
   * page, so arriving at an already-mastered card never fires a stale celebration.
   */
  const stage = ready ? stageOf(herb.id) : null;
  const previousStage = usePrevious(stage);
  const masteryRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (stage === 'mastered' && previousStage !== null && previousStage !== 'mastered') {
      masteryRef.current?.showModal();
    }
  }, [stage, previousStage]);

  const masteryDialog = (
    <dialog
      ref={masteryRef}
      aria-labelledby="mastered-title"
      className="panel m-auto max-h-[90dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-5 text-center text-violet-100 backdrop:bg-violet-deep/85 backdrop:backdrop-blur-sm"
    >
      <p aria-hidden="true" className="text-4xl text-gold-400 drop-shadow-[0_0_14px_rgba(240,193,90,0.5)]">
        ★
      </p>
      <h2 id="mastered-title" className="font-display mt-2 text-xl font-extrabold text-gold-plate">
        Card mastered
      </h2>
      <p className="mt-2 text-sm text-violet-200">
        You found <strong className="text-gold-300">{herb.commonName}</strong>, learned its card,
        and found it again. It&apos;s flowering in your garden.
      </p>
      <p className="font-display mt-3 text-2xl font-extrabold text-gold-plate tabular-nums">
        +{XP_FOR_MASTERY} XP
      </p>
      <button
        type="button"
        onClick={() => masteryRef.current?.close()}
        className="mt-4 min-h-11 w-full rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400"
      >
        Continue
      </button>
    </dialog>
  );

  const discovered = ready && isDiscovered(herb.id);

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="mb-4">
      <Link href="/herbdex" className="text-xs font-semibold text-violet-300 hover:text-gold-400">
        ← My Herbdex
      </Link>
    </nav>
  );

  // Until storage has been read we cannot know the state, and guessing would either
  // flash the locked view at someone who owns the card or spoil it for someone who
  // does not. Hold the layout instead.
  // The body varies; the dialog must not. Building the body as a value and rendering a
  // single <main> keeps the celebration <dialog> at a stable position in the tree, so it
  // survives the locked -> discovered swap instead of being recreated underneath itself.
  let body: React.ReactNode;

  if (!ready) {
    body = (
      <div className="mx-auto h-96 w-52 animate-pulse rounded-[var(--radius-card)] bg-violet-900/50" />
    );
  } else if (!discovered && !revealed) {
    body = (
      <>
        <LockedHerb herb={herb} onDiscovered={onDiscovered} />
        {/* Nothing about traditional use is on screen yet — but a warning printed on the
            card is, shown by LockedHerb above, which is the part that matters here. */}
        <div className="mt-10">
          <SafetyNotice variant="brief" />
        </div>
      </>
    );
  } else {
    body = (
      <>

      {/* Revealed for reading but not actually found: say so plainly, so the collection
          state is never ambiguous. */}
      {!discovered && revealed && (
        <p className="panel mb-4 p-3 text-xs text-violet-300">
          <span aria-hidden="true">👁</span> You revealed this plant to read about it. It
          still counts as undiscovered in your Herbdex until you find it outdoors.
        </p>
      )}

      <div className="sm:flex sm:items-start sm:gap-6">
        <div className="shrink-0">
          <CardFlip herb={herb} />
        </div>

        <div className="mt-6 sm:mt-0 sm:flex-1">
          {/* Collection · card number, so a card reads as part of a collectible set
              rather than a loose number. */}
          <p className="text-xs font-bold text-violet-300 tabular-nums">{cardLabel(herb)}</p>
          <h1 className="font-display mt-1 text-3xl leading-tight font-extrabold text-gold-plate">
            {herb.commonName}
          </h1>
          <p className="font-botanical mt-1 text-lg text-violet-200 italic">
            {herb.scientificName}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RarityBadge rarity={herb.rarity} />
            <span className="inline-flex items-center rounded-full border border-violet-600 bg-violet-900/60 px-2 py-0.5 text-[0.68rem] font-bold tracking-wide text-violet-200 uppercase">
              Best in {SEASON_LABEL[herb.season]}
            </span>
            <span className="inline-flex items-center rounded-full border border-violet-600 bg-violet-900/60 px-2 py-0.5 text-[0.68rem] font-bold tracking-wide text-violet-200 uppercase">
              {herb.xp} XP
            </span>
          </div>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {herb.uses.map((use) => (
              <li
                key={use}
                className="rounded-full border border-gold-500/45 bg-gold-500/12 px-2.5 py-1 text-xs font-semibold text-gold-300"
              >
                {USE_LABEL[use]}
              </li>
            ))}
          </ul>

          {/* A warning printed on the card sits above the discovery CTA, never below it. */}
          {herb.warning && (
            <div className="mt-4">
              <CardWarning warning={herb.warning} />
            </div>
          )}

          <div className="mt-5">
            <DiscoverPanel herb={herb} onDiscovered={onDiscovered} />
          </div>
        </div>
      </div>

      {/* Mastery only exists for a card the player actually found; a revealed-only card
          shows nothing here, because there is no stage to be at yet. */}
      {discovered && <MasteryTrack herb={herb} />}

      <section aria-labelledby="conditions-heading" className="panel mt-8 p-5">
        <h2
          id="conditions-heading"
          className="text-sm font-bold tracking-wide text-gold-400 uppercase"
        >
          Growing conditions
        </h2>
        <p className="mt-1 mb-4 text-xs text-violet-400">
          As printed on the card, rated out of five.
        </p>
        <StatPips stats={herb.stats} />
      </section>

        <div className="mt-4">
          <CardBackDetails herb={herb} />
        </div>

        {/* Sightings are a record of finding a plant, so they only apply once it is found. */}
        {discovered && (
          <div className="mt-4">
            <MySightings herb={herb} />
          </div>
        )}

        <div className="mt-4">
          <SourcesSection herb={herb} />
        </div>

        {/* Healing Traits and Traditional Preparation are both on this page, so the full
            disclaimer stays visible here. Downgrading this to `brief` would be a safety
            regression dressed as a design tweak. */}
        <div className="mt-8 border-t border-violet-700/40 pt-6">
          <SafetyNotice />
        </div>
      </>
    );
  }

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      {breadcrumb}
      {body}
      {celebrationDialog}
      {masteryDialog}
    </main>
  );
}
