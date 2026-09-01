import type { Metadata } from 'next';
import Link from 'next/link';
import { herbsInDeckOrder } from '@/lib/deck';
import { HerbGrid } from '@/components/herbdex/HerbGrid';
import { ProgressHeader } from '@/components/herbdex/ProgressHeader';
import { ResearchTeaser } from '@/components/research/ResearchTeaser';
import { EncounterRateNote, SafetyNotice } from '@/components/SafetyNotice';
import { BeyondCollection } from '@/components/collection/BeyondCollection';
import { LocalProgressNotice } from '@/components/auth/LocalProgressNotice';
import { TrackView } from '@/components/analytics/TrackView';
import { PlantdexIcon } from '@/components/icons/PlantdexIcon';
import { DeckCta } from '@/components/shop/DeckCta';
import { CURRENT_COLLECTION } from '@/lib/collection';

export const metadata: Metadata = {
  title: 'My Herbdex',
  description:
    'Track the wild plants you have found in real life, earn XP, and complete your Plantdex collection.',
};

export default function HerbdexPage() {
  const herbs = herbsInDeckOrder();

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-8">
      <TrackView event="herbdex_opened" />
      <nav aria-label="Breadcrumb" className="mb-2">
        <Link href="/" className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-violet-300 hover:text-gold-400">
          ← Plantdex
        </Link>
      </nav>

      <h1 className="font-display text-3xl font-extrabold text-gold-plate">My Herbdex</h1>
      <p className="mt-1 text-sm text-violet-300">
        Found a plant in the wild? Open its card and log it.
      </p>
      {/* Collection identity, stated once. The deck is complete as it stands — this names
          it rather than implying anything is missing from it. */}
      <p className="mt-1.5 text-xs font-semibold tracking-wide text-violet-400 uppercase">
        {CURRENT_COLLECTION.size} cards · {CURRENT_COLLECTION.shortName}
      </p>

      {/*
        FIRST THING AFTER THE TITLE, BECAUSE IT ANSWERS THE TITLE.

        The subtitle above says "Found a plant in the wild?" — and until now the only reply
        to that was a grid of 45 silhouettes to hunt through. This entry point has moved
        twice: it shipped below the collection footer, then above the grid but under the
        progress cluster, where it measured y=563 on a 390x720 phone against a nav floor of
        662. Visible, technically; a strip at the very bottom of the screen, in practice, and
        the report was still "I cannot find it".

        Progress and research now follow it. Reading how far along you are is something you
        do sitting down; naming the plant in front of you is not, and the page opens on the
        one you cannot postpone.
      */}
      <div className="mt-5">
        <Link
          href="/scan"
          className="panel flex items-center gap-3 p-4 transition-colors hover:bg-plum-600/50"
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-500/15 text-lg text-gold-300"
          >
            <PlantdexIcon name="revealed" />
          </span>
          <span className="min-w-0">
            <span className="block font-bold text-violet-100">Identify a plant</span>
            <span className="block text-xs text-violet-300">
              Photograph something growing and see which cards it might be
            </span>
          </span>
        </Link>
      </div>

      {/* Above the progress header, because it is about that progress — and inline in the
          page flow rather than a modal, so it never interrupts anyone. It renders nothing
          until a signed-out player has enough collection to be worth protecting. */}
      <div className="mt-5">
        <LocalProgressNotice />
        <ProgressHeader />
      </div>

      <div className="mt-3">
        <ResearchTeaser />
      </div>

      <div className="mt-6">
        <HerbGrid herbs={herbs} />
      </div>

      {/* The deck's own explanation of Encounter Rate, so the game term is not read as a
          statement about how safe or potent a plant is. Behind a disclosure because it is
          reference text: available to anyone who wonders, not occupying the page for
          everyone who doesn't. The wording is the card's and must not be paraphrased. */}
      <details className="panel mt-8 p-4">
        <summary className="cursor-pointer text-xs font-bold tracking-wide text-violet-300 uppercase">
          About encounter rate
        </summary>
        <div className="mt-2">
          <EncounterRateNote />
        </div>
      </details>

      <div className="mt-8">
        <BeyondCollection />
      </div>

      <div className="mt-10">
        <DeckCta placement="herbdex" />
      </div>

      <div className="mt-10">
        <SafetyNotice variant="brief" />
      </div>
    </main>
  );
}
