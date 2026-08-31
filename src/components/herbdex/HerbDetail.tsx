'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { DiscoveryResult, Herb } from '@/lib/types';
import { knownIssueFor } from '@/lib/card-issues';
import { siteCautionFor } from '@/lib/card-cautions';
import { GARDEN_STAGE_BY_MASTERY, type GardenStage } from '@/lib/garden';
import { XP_FOR_MASTERY } from '@/lib/progression';
import { usePrevious } from '@/lib/use-previous';
import { useHerbdex } from '@/state/HerbdexProvider';
import { useRevealed } from '@/lib/reveals';
import { DiscoverPanel } from './DiscoverPanel';
import {
  HealingTraitsSection,
  PreparationsSection,
  TasteAromaSection,
  UsablePartsSection,
} from './CardBackDetails';
import {
  HabitatSection,
  IdentificationSection,
  LookalikeSection,
} from './FieldNotesSections';
import { FieldDataStrip } from './FieldDataStrip';
import { SignatureCompounds } from '../chemistry/SignatureCompounds';
import { LockedHerb } from './LockedHerb';
import { GrowthPlaceholder } from '../GrowthLoader';
import { DiscoveryCelebration } from './DiscoveryCelebration';
import { MasteryTrack } from './MasteryTrack';
import { SourcesSection } from './SourcesSection';
import { MySightings } from '../journal/MySightings';
import { CardIssueNote, CardWarning, SafetyNotice, SiteCaution } from '../SafetyNotice';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { SpeciesHero } from '../game/SpeciesHero';

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
  const cardIssue = knownIssueFor(herb);
  const siteCaution = siteCautionFor(herb);

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
      // `aria-label`, not `aria-labelledby`. The heading this used to point at lives inside
      // DiscoveryCelebration, which only mounts once there is a celebration to show — so on
      // every one of the 45 pages the reference dangled at nothing while the dialog sat
      // closed. A static label cannot dangle.
      aria-label={`${herb.commonName} discovered`}
      className="panel m-auto max-h-[90dvh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto p-5 text-violet-100 backdrop:bg-plum-950/88 backdrop:backdrop-blur-sm"
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
      className="panel m-auto max-h-[90dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto p-5 text-center text-violet-100 backdrop:bg-plum-950/88 backdrop:backdrop-blur-sm"
    >
      <p
        aria-hidden="true"
        className="flex justify-center text-4xl text-gold-400 drop-shadow-[0_0_14px_rgba(240,193,90,0.5)]"
      >
        <PlantdexIcon name="mastered" />
      </p>
      <h2 id="mastered-title" className="font-display mt-2 text-xl font-extrabold text-gold-plate">
        Card mastered
      </h2>
      <p className="mt-2 text-sm text-violet-200">
        Found, learned, found again. <strong className="text-gold-300">{herb.commonName}</strong> is
        flowering in your garden.
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

  /*
   * Which creature the portrait shows. `stage` above is the mastery stage this page
   * already tracks, and `GARDEN_STAGE_BY_MASTERY` is the single mapping the Garden uses —
   * read from there rather than restated here, so the card page and the Garden can never
   * disagree about what a player has grown.
   */
  const portraitStage: GardenStage = stage ? GARDEN_STAGE_BY_MASTERY[stage] : 'flowering';

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="mb-2">
      <Link href="/herbdex" className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-violet-300 hover:text-gold-400">
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
      <GrowthPlaceholder className="mx-auto h-96 w-52" label="Loading your card" />
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
          <PlantdexIcon name="revealed" className="text-sm" /> Revealed for reading — still
          undiscovered until you find it outdoors.
        </p>
      )}

      <SpeciesHero
        herb={herb}
        progress={progress}
        stage={stage}
        portraitStage={portraitStage}
        discovered={discovered}
      />

      {/* Warnings sit directly under the hero and above everything else, exactly as before:
          a printed warning must never be reached by scrolling past a game panel. */}
      {(herb.warning || siteCaution || cardIssue) && (
        <div className="mt-6 space-y-3">
          {herb.warning && <CardWarning warning={herb.warning} />}
          {siteCaution && <SiteCaution caution={siteCaution} />}
          {cardIssue && <CardIssueNote issue={cardIssue} />}
        </div>
      )}

      <div className="mt-6">
        <DiscoverPanel herb={herb} onDiscovered={onDiscovered} />
      </div>

      <div className="mt-6">
        <FieldDataStrip herb={herb} />
      </div>

      <div className="mt-6">
      </div>

      {/* Mastery only exists for a card the player actually found; a revealed-only card
          shows nothing here, because there is no stage to be at yet. */}
      {discovered && (
        <div className="mt-6">
          <MasteryTrack herb={herb} />
        </div>
      )}

      {/*
        THE BANDS BELOW. Each chooses its own measure inside the 6xl canvas, and that
        variation is where the rhythm comes from — the page this replaced was eight
        identical full-width rectangles, which is why nothing on it read as more important
        than anything else. Vertical spacing varies with it: a band that starts a new idea
        gets more air than one continuing the last.
      */}
      <div className="mt-12 space-y-12">
        <IdentificationSection herb={herb} />

        {/* Immediately after identification: a discriminating character is only useful
            beside the thing it discriminates from. */}
        <LookalikeSection herb={herb} />

        <HabitatSection herb={herb} />

        {/* Working with the plant: what you can use, and how it has been prepared. */}
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <UsablePartsSection herb={herb} />
          <PreparationsSection herb={herb} />
        </div>

        {/* Reading measure, deliberately narrow and deliberately surrounded by space. */}
        <div className="max-w-2xl">
          <HealingTraitsSection herb={herb} />
        </div>

        {/* The widest thing on the page. */}
        <SignatureCompounds herb={herb} />

        <div className="max-w-3xl">
          <TasteAromaSection herb={herb} />
        </div>

        {/* Sightings are a record of finding a plant, so they only apply once it is found. */}
        {discovered && <MySightings herb={herb} />}

        <div className="max-w-3xl">
          <SourcesSection herb={herb} />
        </div>
      </div>

        {/* Healing Traits and Traditional Preparation are both on this page, so this
            carries the `standard` weight — named to the risk a plant page actually raises.
            Downgrading it to `brief` would be a safety regression dressed as a tweak. */}
        <div className="mt-10 max-w-3xl">
          <SafetyNotice context="Traditional use is not evidence, and finding a plant is not identifying it. Never eat, drink or apply one you are not certain of." />
        </div>
      </>
    );
  }

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-8">
      {breadcrumb}
      {body}
      {celebrationDialog}
      {masteryDialog}
    </main>
  );
}
