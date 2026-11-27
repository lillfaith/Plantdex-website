import type { Metadata } from 'next';
import Link from 'next/link';
import { printedCardsInDeckOrder } from '@/lib/deck';
import { FIELD_CARDS } from '@/lib/field-cards';
import { HerbGrid } from '@/components/herbdex/HerbGrid';
import { CollectionHeader } from '@/components/herbdex/CollectionHeader';
import { FirstQuestCard } from '@/components/herbdex/FirstQuestCard';
import { ResearchTeaser } from '@/components/research/ResearchTeaser';
import { FieldBoardCard } from '@/components/leaderboard/FieldBoardCard';
import { RecentFindsStrip } from '@/components/herbdex/RecentFindsStrip';
import { EncounterRateNote, SafetyNotice } from '@/components/SafetyNotice';
import { BeyondCollection } from '@/components/collection/BeyondCollection';
import { LocalProgressNotice } from '@/components/auth/LocalProgressNotice';
import { TrackView } from '@/components/analytics/TrackView';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { DeckCta } from '@/components/shop/DeckCta';
import { CURRENT_COLLECTION } from '@/lib/collection';

export const metadata: Metadata = {
  title: 'My Collection',
  description:
    'Track the wild plants you have found in real life, earn XP, and complete your Plantdex collection.',
};

/** STYLE LAB (owner review): 'a' or 'b' at build time shows an experimental look on this page only; unset (the default) is the shipped look. */
const COLLECTION_STYLE =
  process.env.NEXT_PUBLIC_COLLECTION_STYLE === 'a' || process.env.NEXT_PUBLIC_COLLECTION_STYLE === 'b'
    ? process.env.NEXT_PUBLIC_COLLECTION_STYLE
    : undefined;

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
    <main id="main" data-ground="lavender" data-collection-style={COLLECTION_STYLE} className="mx-auto max-w-6xl px-4 py-8">
      <PageAtmosphere theme="collection" />
      <TrackView event="herbdex_opened" />
      {/* Above the header, because it is about that progress, and inline in the page flow
          rather than a modal so it never interrupts anyone. It renders nothing until a
          signed-out player has enough collection to be worth protecting. */}
      <LocalProgressNotice />
      <CollectionHeader />

      {/* The Field Board's door, directly beneath your progress. */}
      <div className="mt-3" data-part="board">
        <FieldBoardCard />
      </div>

      {/* Renders only while the collection is genuinely empty, and carries its own scan button:
          the page no longer has a row of shortcuts for a first-time player to find it in. */}
      <FirstQuestCard />

      <div className="mt-3" data-part="recent">
        <RecentFindsStrip />
      </div>

      <div className="mt-3" data-part="research">
        <ResearchTeaser />
      </div>

      {/* TWO PLAIN LINES WHERE THREE SHORTCUT TILES WERE. Plant ID has to stay reachable from
          the Collection in words a person would look for (`plant-id-safety.test.ts`), and the
          Seed Shelf is a kept thing that is effectively lost if nothing here points at it
          (`launch-loop.test.ts`). Text, not rectangles: the primary nav carries Scan too. */}
      <nav aria-label="More ways to explore" className="ground-ink mt-4 space-y-1 text-center text-sm font-semibold">
        <p>
          Spotted something growing?{' '}
          <Link
            href="/scan"
            className="tap-44 inline-flex items-center font-extrabold text-violet-800 underline decoration-pink-accent decoration-2 underline-offset-4 hover:text-violet-900"
          >
            Identify a plant
          </Link>
        </p>
        <p>
          Found a plant with no card?{' '}
          <Link
            href="/seed-shelf"
            className="tap-44 inline-flex items-center font-extrabold text-violet-800 underline decoration-pink-accent decoration-2 underline-offset-4 hover:text-violet-900"
          >
            Open your Seed Shelf
          </Link>
        </p>
      </nav>

      <div className="mt-8 flex items-center gap-3" data-part="title">
        <span aria-hidden="true" className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-gold-500" />
        <h1 className="font-display flex items-center gap-3 px-1 text-3xl font-extrabold text-violet-50"><span aria-hidden="true" className="pixel-diamond" />My Collection<span aria-hidden="true" className="pixel-diamond" /></h1>
        <span aria-hidden="true" className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-gold-500" />
      </div>
      {/* Collection identity, stated once. The deck is complete as it stands: this names it
          rather than implying anything is missing from it. */}
      <p className="ground-ink mt-2 text-center text-xs font-bold tracking-wide uppercase">
        {CURRENT_COLLECTION.size} cards · {CURRENT_COLLECTION.shortName}
      </p>
      <p className="ground-ink mt-1 text-center text-xs">
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

      <div className="panel mt-10 p-4">
        <DeckCta placement="herbdex" />
      </div>

      <div className="mt-10">
        <SafetyNotice variant="brief" />
      </div>
    </main>
  );
}
