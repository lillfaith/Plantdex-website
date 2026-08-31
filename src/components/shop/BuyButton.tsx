'use client';

import { useRef } from 'react';
import { track } from '@/lib/analytics';

/**
 * The one control that leaves the site for money.
 *
 * WHY IT IS A PLAIN LINK. It navigates to a Stripe-hosted page and nothing else. There is no
 * Stripe SDK on this site, no publishable key, no `<script>` from stripe.com, and therefore
 * no path by which a card number could reach Plantdex even in principle — the buyer types it
 * on Stripe's own origin. That property is the reason Payment Links were chosen, so it is
 * worth stating where somebody might otherwise be tempted to "upgrade" this to Stripe.js.
 *
 * Card details, wallet tokens, addresses and tax are all Stripe's side of that boundary.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE EVENT FIRES ON pointerdown AS WELL AS click.
 *
 * REGRESSION, caught in a browser rather than by reading this file. `checkout_started` is an
 * OUTBOUND navigation, unlike every other event in the app: the four `deck_cta_*` links are
 * client-side route changes that never unload the page, so their request always completes.
 * This one leaves the origin immediately, and a beacon fired in the click handler races the
 * unload — the single most important number in the funnel, lost some fraction of the time.
 *
 * Firing on `pointerdown` gives the request the whole press-and-release of a real click,
 * which is tens to hundreds of milliseconds, before navigation begins. `click` is kept as
 * well because pointerdown never fires for a keyboard activation, and `sent` makes sure the
 * two can only produce one event between them.
 *
 * DELIBERATELY NOT `preventDefault()` plus a callback. Plausible supports that, and it would
 * be strictly more reliable — but if the script is blocked (an ad blocker, an offline
 * moment, a corporate proxy) the callback never arrives and the buyer is stranded on the
 * product page with a button that does nothing. Losing a measurement is an acceptable
 * failure; trapping somebody who is trying to pay is not.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function BuyButton({ href, price }: { href: string; price: string }) {
  const sent = useRef(false);

  const record = () => {
    if (sent.current) return;
    sent.current = true;
    track('checkout_started');
  };

  return (
    <a
      href={href}
      rel="noopener"
      onPointerDown={record}
      onClick={record}
      className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-gold-400 px-8 text-base font-bold text-plum-900 transition hover:bg-gold-300 focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-plum-900 focus-visible:outline-none sm:w-auto"
    >
      <span>Buy the deck</span>
      <span aria-hidden className="text-plum-800/70">
        &middot;
      </span>
      <span className="tabular-nums">{price}</span>
    </a>
  );
}
