import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TrackView } from '@/components/analytics/TrackView';
import { GeorgiaQuestGate } from '@/components/quests/GeorgiaQuestGate';
import { SafetyNotice } from '@/components/SafetyNotice';
import { georgiaQuestPreviewEnabled } from '@/lib/region-quest';
import { PageAtmosphere } from '@/components/PageAtmosphere';

export const metadata: Metadata = {
  title: 'Georgia Habitat Trail (preview)',
  description: 'A preview of the Georgia habitat quest, for owner review.',
  robots: { index: false, follow: false },
};

/**
 * A SUPERVISED PREVIEW ROUTE, OFF UNLESS `NEXT_PUBLIC_GEORGIA_QUEST_PREVIEW=on`.
 *
 * Off, the route is a 404 and its screen is not bundled. It is a child of `/quests` and is
 * linked from there only while the flag is on, so the main navigation (seven labels is the
 * ceiling) is untouched. `standard` safety notice: the page sends somebody outdoors.
 */
export default function GeorgiaTrailPage() {
  if (!georgiaQuestPreviewEnabled()) notFound();
  return (
    <main id="main" data-ground="lavender" data-shade="quests" className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <PageAtmosphere theme="quests" />
      <TrackView event="quest_board_opened" />
      <header>
        <h1 className="font-display text-3xl leading-tight font-extrabold text-gold-plate sm:text-4xl">
          Georgia Habitat Trail
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-violet-200">
          One plant from each kind of habitat Georgia&apos;s records cover. Every plant on it is
          a card from the original deck.
        </p>
      </header>
      <div className="mt-8">
        <GeorgiaQuestGate />
      </div>
      <p className="mt-8 text-sm text-violet-300">
        <Link href="/quests" className="underline underline-offset-2 hover:text-gold-400">
          Back to plants in Georgia
        </Link>
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
