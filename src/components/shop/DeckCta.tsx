'use client';

import Link from 'next/link';
import { deckCtaEvent, track, type CtaPlacement } from '@/lib/analytics';
import { isShopConfigured } from '@/lib/shop';

/**
 * The link from the educational site into the shop. Its label follows the sale state; see
 * `ctaLabel` below.
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

const COPY: Record<CtaPlacement, { line: string }> = {
  home: { line: 'The collectible field companion this world is built around.' },
  herbdex: { line: 'Take the collection outside — printed, illustrated, pocket-sized.' },
  plant: { line: 'This card, in your hand, where the plant is.' },
  footer: { line: '' },
};

/**
 * The label, RESOLVED FROM THE SALE STATE rather than typed once and forgotten.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * "GET THE DECK" IS A PROMISE THE PAGE BEHIND IT CANNOT KEEP WHILE THE SHOP IS OFF.
 *
 * All four placements said it unconditionally, and `/shop` resolves its own state from
 * `isShopConfigured()` — so with the Stripe variables unset, four buttons across the site
 * offered to sell a deck and every one of them landed on a page reading "Not on sale yet".
 * That is the shape this repository has now shipped three times in the other direction:
 * `/terms` denying a shop that existed, `/privacy` denying analytics that were wired in,
 * the landing page denying a sale configuration could switch on. A CTA asserting a sale
 * that is switched OFF is the same bug facing the other way, and it greets a buyer from a
 * vendor table on the first tap.
 *
 * So it is derived from the same predicate the destination reads, and it therefore REVERTS
 * BY ITSELF: set the Payment Link and the price and every placement says "Get the deck"
 * again with no edit here. Nothing about the four placements, their analytics events or the
 * rule that a CTA never displaces a safety notice changes.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The footer is shorter than the rest on purpose: it is a row of wayfinding links, and a
 * verb there would make it the only instruction in a list of destinations.
 */
function ctaLabel(placement: CtaPlacement): string {
  if (isShopConfigured()) return 'Get the deck';
  return placement === 'footer' ? 'The deck' : 'See the deck';
}

export function DeckCta({
  placement,
  className = '',
}: {
  placement: CtaPlacement;
  className?: string;
}) {
  const { line } = COPY[placement];
  const label = ctaLabel(placement);

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
