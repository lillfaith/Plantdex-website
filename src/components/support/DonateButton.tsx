'use client';

import { useRef } from 'react';
import { track } from '@/lib/analytics';
import { donationDestination } from '@/lib/support';

/**
 * A donation prompt, under the creator's note and nowhere else.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE PLACEMENT, AND QUIETER THAN THE BUY BUTTON ABOVE IT.
 *
 * The landing page already leads with a filled lavender "Buy the Plantdex", and two filled
 * buttons asking for money on one page makes the page an appeal rather than a field guide —
 * the same reasoning `DeckCta` gives for allowing four placements and not forty. So this is
 * an OUTLINE in the same lavender: visibly subordinate to the hero button, and distinct from
 * the gold outline the deck CTAs use elsewhere, so the two prompts are never read as one.
 *
 * It sits under a personal note rather than beside the product, which is the only place on
 * the site where asking is not interrupting something somebody came for.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * IT RENDERS NOTHING WHEN UNCONFIGURED. `donationDestination()` is the whole gate; see
 * `src/lib/support.ts` for why the host is validated rather than trusted.
 *
 * `pointerdown` AS WELL AS `click`, for exactly the reason `BuyButton` documents: this is an
 * outbound navigation, not a client-side route change, so an event fired in the click
 * handler races the unload. `sent` keeps the two from producing two events, and `click`
 * stays because pointerdown never fires for a keyboard activation. Deliberately not
 * `preventDefault` plus a callback — a blocked analytics script would then strand somebody
 * who was trying to give money.
 */
export function DonateButton() {
  const sent = useRef(false);
  const destination = donationDestination();
  if (!destination) return null;

  // A ref and not a local: a re-render between the press and the release would reset a
  // plain variable and send the event twice. Same mechanism as `BuyButton`.
  const record = () => {
    if (sent.current) return;
    sent.current = true;
    track('donate_clicked');
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-2 text-center">
      <a
        href={destination.url}
        rel="noopener"
        onPointerDown={record}
        onClick={record}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-violet-300/60 px-5 text-sm font-bold text-violet-300 transition hover:bg-violet-300 hover:text-violet-deep focus-visible:ring-2 focus-visible:ring-violet-200 focus-visible:outline-none"
      >
        Donate
      </a>
      {/*
        BOTH HALVES ARE CHECKABLE FROM THIS REPOSITORY, which is the only reason they are
        printed. Nothing here promises what a donation funds, how much is needed or what
        happens without it — AGENTS.md's prohibition on invented commercial claims does not
        stop at prices.

        It also states, for the first time on this page, that the digital half is free. That
        fact lived only on /shop (`NOT_INCLUDED` says it in as many words) while the front
        page led with a buy button, which read as a paywall to anybody who did not scroll.
      */}
      <p className="text-xs text-violet-400">
        Plantdex online is free. A donation is optional.
      </p>
    </div>
  );
}
