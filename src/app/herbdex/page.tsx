import type { Metadata } from 'next';
import Link from 'next/link';
import { printedCardsInDeckOrder } from '@/lib/deck';
import { FIELD_CARDS } from '@/lib/field-cards';
import { HerbGrid } from '@/components/herbdex/HerbGrid';
import { CollectionHeader } from '@/components/herbdex/CollectionHeader';
import { FirstQuestCard } from '@/components/herbdex/FirstQuestCard';
import { ResearchTeaser } from '@/components/research/ResearchTeaser';
import { RecentFindsStrip } from '@/components/herbdex/RecentFindsStrip';
import { EncounterRateNote, SafetyNotice } from '@/components/SafetyNotice';
import { BeyondCollection } from '@/components/collection/BeyondCollection';
import { LocalProgressNotice } from '@/components/auth/LocalProgressNotice';
import { TrackView } from '@/components/analytics/TrackView';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { PlantdexIcon } from '@/components/icons/PlantdexIcon';
import { DeckCta } from '@/components/shop/DeckCta';
import { CURRENT_COLLECTION } from '@/lib/collection';

export const metadata: Metadata = {
  title: 'My Collection',
  description:
    'Track the wild plants you have found in real life, earn XP, and complete your Plantdex collection.',
};

function QuickLink({
  href,
  icon,
  label,
  note,
}: {
  href: string;
  icon: 'revealed' | 'seed' | 'research';
  label: string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="pixel-tile flex min-h-[4.5rem] flex-col items-center justify-center gap-1 px-1 py-2 text-center"
    >
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500/15 text-base text-gold-300"
      >
        <PlantdexIcon name={icon} />
      </span>
      <span className="text-xs leading-tight font-bold text-violet-50">{label}</span>
      <span className="sr-only">{note}</span>
    </Link>
  );
}

export default function HerbdexPage() {
  const herbs = printedCardsInDeckOrder();
  /*
   * Sorted by the number printed on the artwork (#48-51), which is what puts them after
   * #45 rather than anywhere else. `cardNumberInCollection` is their position WITHIN Field
   * Cards (#01-04) and is the wrong key here: the grid is ordered by the deck-wide number
   * a player reads off the card in front of them.
   */
  const fieldCards = [...FIELD_CARDS].sort((a, b) => a.cardNumber - b.cardNumber);

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-8">
      <PageAtmosphere theme="collection" />
      <TrackView event="herbdex_opened" />
      {/* Above the header, because it is about that progress, and inline in the page flow
          rather than a modal so it never interrupts anyone. It renders nothing until a
          signed-out player has enough collection to be worth protecting. */}
      <LocalProgressNotice />
      <CollectionHeader />

      {/* The three places this page leads. Identify is first: it is the one action that works
          on the first visit. The descriptions stay for screen readers. */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <QuickLink
          href="/scan"
          icon="revealed"
          label="Identify a plant"
          note="Photograph something growing and see what Plantdex thinks it might be"
        />
        <QuickLink
          href="/seed-shelf"
          icon="seed"
          label="Seed Shelf"
          note="Species you have found that this collection has no card for"
        />
        <QuickLink
          href="/herbdex/research"
          icon="research"
          label="Field Research"
          note="Daily tasks, seasonal ladders and challenges, and what your XP unlocks"
        />
      </div>

      {/* Renders only while the collection is genuinely empty, without a button of its own:
          the scanner is directly beneath it. */}
      <FirstQuestCard cta={false} />

      <div className="mt-3">
        <RecentFindsStrip />
      </div>

      <div className="mt-3">
        <ResearchTeaser />
      </div>

      <div className="mt-8 flex items-center gap-3">
        <span aria-hidden="true" className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-gold-500/80" />
        <h1 className="font-display text-3xl font-extrabold text-gold-plate">My Collection</h1>
        <span aria-hidden="true" className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-gold-500/80" />
      </div>
      {/* Collection identity, stated once. The deck is complete as it stands: this names it
          rather than implying anything is missing from it. */}
      <p className="mt-2 text-center text-xs font-semibold tracking-wide text-violet-400 uppercase">
        {CURRENT_COLLECTION.size} cards · {CURRENT_COLLECTION.shortName}
      </p>
      <p className="mt-1 text-center text-xs text-violet-400">
        {CURRENT_COLLECTION.shortName} is the {CURRENT_COLLECTION.size}-card physical Plantdex
        deck. Found a plant in the wild? Open its card and log it.
      </p>

      <div className="mt-4">
        <HerbGrid herbs={herbs} fieldCards={fieldCards} />
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
