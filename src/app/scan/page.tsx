import type { Metadata } from 'next';
import { ScanPanel } from '@/components/scan/ScanPanel';
import { ScanScout } from '@/components/scan/ScanScout';
import { PlantdexIcon } from '@/components/icons/PlantdexIcon';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { ContaminationNote, SafetyNotice } from '@/components/SafetyNotice';

export const metadata: Metadata = {
  title: 'Identify a plant',
  description:
    'Photograph a wild plant and see which Plantdex cards it might be. A suggestion from an image, never a confirmation that a plant is safe.',
};

/**
 * Plant ID.
 *
 * The page is deliberately thin: everything that matters is in `ScanPanel`, and the safety
 * framing is in `ScanCaution`, which that panel renders above every result and never gates
 * on confidence.
 *
 * `standard` weight on the notice below, not `brief`: this page is where somebody points a
 * camera at a plant they do not recognise, which is precisely the moment the full caution
 * exists for.
 */
export default function ScanPage() {
  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-8">
      <PageAtmosphere theme="scan" />
      {/*
        THE SCOUT SITS BESIDE THE HEADING, AND ON ITS LEFT.

        Above the heading it would be the first thing on the page and would push the title, the
        three explanatory lines and the caution down a whole creature's height on a 390px
        screen — buying personality with the words that tell somebody what this page does.

        LEFT rather than right because `AccountBadge` is `fixed top-2 right-2` on every page,
        44px of tap target in exactly the corner a right-aligned scout reaches into. Nothing on
        this page could have told me that; it took a screenshot. The heading is one line at
        390px and the scout takes 64px of the 358px available, so neither wraps.

        `shrink-0` because a flex sibling with an intrinsic aspect ratio gives up its width
        first and squashes to a sliver the moment the heading wants more room.
      */}
      <div className="relative flex flex-col items-center text-center">
        <span
          aria-hidden="true"
          className="absolute top-3 left-2 h-1.5 w-28 -rotate-[28deg] rounded-full bg-gradient-to-r from-transparent via-pink-accent/70 to-cyan-accent/80"
        />
        <ScanScout className="w-20 shrink-0" />
        <h1 className="font-display mt-1 flex items-center gap-3 text-3xl font-extrabold text-gold-plate">
          <span aria-hidden="true" className="h-2 w-2 rotate-45 bg-gold-300" />
          Identify a Plant
          <span aria-hidden="true" className="h-2 w-2 rotate-45 bg-gold-300" />
        </h1>
        <div aria-hidden="true" className="mt-2 flex w-full max-w-xs items-center gap-3">
          <span className="h-px flex-1 bg-violet-500/60" />
          <PlantdexIcon name="leaves" className="text-lg text-violet-300" />
          <span className="h-px flex-1 bg-violet-500/60" />
        </div>
      </div>
      {/*
        WHAT THIS SCANNER ACTUALLY ACCEPTS, WHICH IS NOT WHAT IT SAID. "see which cards it might
        be" described the deck, and the deck is a few dozen species out of a world of them, so the
        line quietly told a first-time visitor that photographing anything else was pointless.
        Both outcomes are real and the second is the ORDINARY one. It names no count: the matcher
        indexes the whole catalogue and a number here goes stale the moment either list moves.

        THE LAST SENTENCE STAYS ITS OWN LINE, brighter than the rest and directly above the
        caution, so the safety framing reads as a statement and not as the tail of a feature
        description. Its wording is unchanged.
      */}
      <p className="mx-auto mt-3 max-w-sm text-center text-base leading-relaxed text-violet-100">
        Photograph something growing and see what Plantdex thinks it might be.
      </p>
      <p className="mx-auto mt-2 max-w-sm text-center text-xs leading-relaxed text-violet-300">
        If it is a plant we have a card for, you can add it to your collection. Anything else
        can go on your Seed Shelf.
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-center text-xs leading-relaxed font-semibold text-violet-100">
        The answer is a suggestion to check, not a verdict.
      </p>

      <div className="mt-6">
        <ScanPanel />
      </div>

      <div className="mt-8 space-y-3">
        <SafetyNotice
          variant="standard"
          context="An identification from a photograph is a starting point, not proof. Never eat, drink or apply a wild plant on one."
        />
        {/*
          THE TWO NOTES ANSWER DIFFERENT QUESTIONS, which is why this is not one longer block.
          Above: the photograph might be wrong. Here: the photograph might be right and the
          plant still not safe to eat, because of where it was growing. A scan cannot see
          either, and this is the one screen in the app that is about where somebody is
          standing — so it is the one screen where the ground is the live question.
        */}
        <ContaminationNote />
      </div>
    </main>
  );
}
