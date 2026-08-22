import { CURRENT_COLLECTION } from '@/lib/collection';

/**
 * "Beyond Collection 01" — the future-collection teaser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * No release date. No name. No card count. No price. No preorder, no waitlist, no
 * countdown, no "only N left", no locked card slots implying the deck in someone's hands
 * is missing something. None of those exist, and inventing any of them would be
 * advertising a product that is not real.
 *
 * What is left is the true statement — more collections are planned — said once, quietly,
 * below a collection that is complete on its own terms. If a real waitlist is ever built,
 * a single CTA belongs here and nowhere else.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function BeyondCollection() {
  return (
    <aside
      aria-labelledby="beyond-heading"
      className="panel relative overflow-hidden border-violet-600/70 p-6 text-center"
    >
      {/* A faint horizon rather than an ad banner. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-16 h-32 bg-[radial-gradient(ellipse_at_center,rgba(240,193,90,0.16),transparent_70%)]"
      />

      <p aria-hidden="true" className="text-lg text-violet-400">
        · · ·
      </p>

      <h2
        id="beyond-heading"
        className="font-display mt-2 text-lg font-bold text-gold-plate sm:text-xl"
      >
        Beyond {CURRENT_COLLECTION.shortName}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-violet-200">
        A complete {CURRENT_COLLECTION.size}-card deck — this Herbdex fills up without
        anything else. More collections are planned.
      </p>

      {/* Closes the loop for anyone who reads the line above and thinks "so when?".
          The honest answer is the only one available, and it is better said than left
          hanging as an implied soon. */}
      <p className="mt-4 text-xs font-semibold tracking-wide text-violet-400 uppercase">
        Nothing to announce yet
      </p>
    </aside>
  );
}
