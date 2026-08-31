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
