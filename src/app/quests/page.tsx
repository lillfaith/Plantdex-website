import type { Metadata } from 'next';
import Link from 'next/link';
import { TrackView } from '@/components/analytics/TrackView';
import { QuestBoardPanel } from '@/components/quests/QuestBoardPanel';
import { RegionPicker } from '@/components/quests/RegionPicker';
import { SafetyNotice } from '@/components/SafetyNotice';

export const metadata: Metadata = {
  title: 'Plants near you',
  description:
    'Choose your region and see which Plantdex plants are recorded growing there, with a board of ones to look for first.',
};

/**
 * The regional board.
 *
 * A SEPARATE ROUTE RATHER THAN A NAV ITEM. Seven nav labels is the measured ceiling — at
 * 390px each is 53px wide and an eighth truncates — so this is reached from the Herbdex
 * and from here, not from the bar. That is also the right hierarchy while one region is
 * launched: a Georgia board is not yet a peer of the collection itself.
 *
 * `standard`, not `brief`: the page sends somebody outside to look at plants, which is
 * exactly the risk the fuller notice exists for.
 */
export default function QuestsPage() {
  return (
    <main id="main" className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <TrackView event="quest_board_opened" />

      <header>
        <h1 className="font-display text-3xl leading-tight font-extrabold text-gold-plate sm:text-4xl">
          Plants near you
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-violet-200">
          Plantdex knows where its plants have actually been recorded. Pick a region and it
          will show you which ones you could realistically meet, and which to try first.
        </p>
      </header>

      <div className="panel mt-8 p-5">
        <RegionPicker />
      </div>

      <div className="mt-8">
        <QuestBoardPanel />
      </div>

      <p className="mt-8 text-sm text-violet-300">
        Everything in the deck stays available wherever you are.{' '}
        <Link href="/herbdex" className="underline underline-offset-2 hover:text-gold-400">
          Open the full collection
        </Link>
        .
      </p>

      <div className="mt-8">
        <SafetyNotice
          variant="standard"
          context="This page sends you outdoors to look for wild plants, some of which have poisonous lookalikes."
        />
      </div>
    </main>
  );
}
