'use client';

import Link from 'next/link';
import { deckCtaEvent, track, type CtaPlacement } from '@/lib/analytics';

/**
 * "Get the deck" — the link from the educational site into the shop.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FOUR PLACEMENTS, AND DELIBERATELY NOT MORE.
 *
 * Home, Herbdex, plant profile and footer. The temptation on a site with 45 plant pages is
 * to put a buy prompt on every panel, and the result is a field guide that reads as an
 * advertisement — which is the opposite of what makes somebody trust it enough to buy. Each
 * placement appears ONCE per page, below the content it interrupts rather than above it.
 *
 * Nothing educational is gated, moved or shortened to make room for one. A plant page still
 * opens with the plant.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Each placement is its own analytics goal (`deck_cta_home` and friends) because "which
 * placement earns a click" is the whole question a CTA asks, and Plausible's Starter plan
 * has no custom properties to answer it with. See `src/lib/analytics.ts`.
 */

const COPY: Record<CtaPlacement, { label: string; line: string }> = {
  home: {
    label: 'Get the deck',
    line: 'The collectible field companion this world is built around.',
  },
  herbdex: {
    label: 'Get the deck',
    line: 'Take the collection outside — printed, illustrated, pocket-sized.',
  },
  plant: { label: 'Get the deck', line: 'This card, in your hand, where the plant is.' },
  footer: { label: 'Get the deck', line: '' },
};

export function DeckCta({
  placement,
  className = '',
}: {
  placement: CtaPlacement;
  className?: string;
}) {
  const { label, line } = COPY[placement];

  // The footer's is a quiet text link — a footer is wayfinding, and a button there would be
  // the loudest thing on every page of the site.
  if (placement === 'footer') {
    return (
      <Link
        href="/shop"
        onClick={() => track(deckCtaEvent(placement))}
        className={`inline-flex min-h-11 items-center font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300 ${className}`}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
      <Link
        href="/shop"
        onClick={() => track(deckCtaEvent(placement))}
        className="inline-flex min-h-12 items-center justify-center rounded-full border border-gold-400/70 px-6 text-sm font-bold text-gold-300 transition hover:bg-gold-400 hover:text-plum-900 focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:outline-none"
      >
        {label}
      </Link>
      {line && <p className="text-xs text-violet-400">{line}</p>}
    </div>
  );
}
