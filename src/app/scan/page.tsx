import type { Metadata } from 'next';
import { ScanPanel } from '@/components/scan/ScanPanel';
import { SafetyNotice } from '@/components/SafetyNotice';
import { CURRENT_COLLECTION } from '@/lib/collection';

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
      <h1 className="font-display text-2xl font-bold text-gold-plate">Identify a plant</h1>
      {/*
        WHAT THIS SCANNER ACTUALLY ACCEPTS, WHICH IS NOT WHAT IT SAID.

        "see which cards it might be" describes the deck, and the deck is 45 species out of a
        world of them — so the line quietly told a first-time visitor that photographing
        anything else was pointless, which is the opposite of true. Both outcomes are real and
        the second is the ORDINARY one; the page that invites the photograph is where that
        belongs, not only in the answer after somebody has already risked a tap.

        THREE SENTENCES IN THREE PARAGRAPHS, NOT ONE RUN-ON. At 390px the combined version
        wrapped to five lines and the safety clause landed mid-block, reading as the tail of a
        feature description rather than as a caution. Splitting them costs no vertical space
        worth having and keeps the last line visually its own statement — brighter, on its own
        line, immediately above `ScanCaution`. Its wording is unchanged.
      */}
      <p className="mt-2 text-sm leading-relaxed text-violet-300">
        Photograph something growing and see what Plantdex thinks it might be.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-violet-300">
        If it is one of the {CURRENT_COLLECTION.size} {CURRENT_COLLECTION.shortName} plants,
        you can add it to your collection. Anything else can go on your Seed Shelf.
      </p>
      <p className="mt-2 text-sm leading-relaxed font-semibold text-violet-200">
        The answer is a suggestion to check, not a verdict.
      </p>

      <div className="mt-6">
        <ScanPanel />
      </div>

      <div className="mt-8">
        <SafetyNotice
          variant="standard"
          context="An identification from a photograph is a starting point, not proof. Never eat, drink or apply a wild plant on one."
        />
      </div>
    </main>
  );
}
