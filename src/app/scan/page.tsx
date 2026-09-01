import type { Metadata } from 'next';
import { ScanPanel } from '@/components/scan/ScanPanel';
import { SafetyNotice } from '@/components/SafetyNotice';

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
      <p className="mt-2 text-sm leading-relaxed text-violet-300">
        Photograph something growing and see which cards it might be. The answer is a
        suggestion to check, not a verdict.
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
