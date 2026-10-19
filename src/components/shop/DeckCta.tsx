'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { deckCtaEvent, track, type CtaPlacement } from '@/lib/analytics';
import { checkoutLink, displayPrice, isCommerceLive } from '@/lib/shop';

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
 * `isCommerceLive()` — so with the Stripe variables unset, four buttons across the site
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
  // THE HOME BUTTON NAMES THE PRODUCT, the others name the object. It is the one placement a
  // stranger meets before they know what any of this is, and it replaced a sentence rather
  // than a button — so it says what tapping it does. The rest keep "Get the deck", which is
  // the right words on a page that has already shown somebody a card.
  if (isCommerceLive()) return placement === 'home' ? 'Buy the Plantdex' : 'Get the deck';
  // OFF, NOTHING SAYS BUY. Identical to before: a label asserting a sale the checkout refuses
  // is the bug this file documents three times, and it greets a buyer on the first tap.
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
  const sent = useRef(false);

  /*
   * THE HOME BUTTON GOES STRAIGHT TO STRIPE; THE OTHER THREE STILL GO TO `/shop`.
   *
   * A stranger on the landing page who taps a button saying "Buy the Plantdex" has made a
   * decision, and `/shop` was a second page asking them to make it again. The other three
   * placements interrupt content somebody came to read, so for them the product page is the
   * right next step rather than a checkout they did not ask for.
   *
   * `null` WHENEVER COMMERCE IS OFF, which is what keeps this from becoming a fourth
   * instance of the bug this file documents three times: `checkoutLink()` is already the
   * predicate `/shop` resolves its own state from, so an unset Payment Link leaves the home
   * button an ordinary internal link to a page that honestly says the deck is not on sale.
   * Nothing here can offer a checkout the configuration has not switched on.
   */
  const direct = placement === 'home' ? checkoutLink() : null;
  const price = displayPrice();

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

  /*
   * LAVENDER ON HOME, GOLD EVERYWHERE ELSE, and the split is why it is per-placement rather
   * than a change to the component.
   *
   * Home is the one placement that LEADS its page — it sits above the two free actions, where
   * an outlined button would read as the quietest of three. The other three interrupt content
   * somebody is already reading, and a filled button there would be the loudest thing on a
   * plant page, which is the rule about never displacing what a reader came for.
   *
   * `violet-300` is the deck's existing lavender; no colour was added. Measured at 9.12:1
   * against `violet-deep`, comfortably past AA, which is the whole reason the text goes dark
   * on it rather than staying light — contrast is a property of the token, so a filled light
   * button takes dark type or it takes a different token.
   */
  // SIZE IS PER-PLACEMENT FOR THE SAME REASON THE COLOUR IS. Home leads its page and takes the
  // wider padding and the larger type; the other three interrupt content somebody is already
  // reading, and growing them there would make a buy prompt the biggest thing on a plant page.
  //
  // `min-h-12` is shared and unchanged, so the button's HEIGHT is identical at both sizes —
  // which is what keeps the landing page's 40px-either-side centring true after this change
  // rather than needing to be measured again.
  //
  // WIDTH AND HEIGHT ARE PART OF IT. The home button sat at 188px beside two 320px buttons,
  // all three the same height — so the landing page offered three actions at three different
  // widths, and the one meant to lead was the smallest.
  //
  // 256 WIDE AGAINST THEIR 320, AND 56 TALL AGAINST THEIR 48. Narrower and taller, which is a
  // different thing from simply bigger: a button that matched their width and beat their
  // height was the largest object in the hero and started to read as a banner. Pulling the
  // width in makes it a distinct SHAPE rather than a bigger version of its neighbours, and
  // the height is what keeps it first.
  //
  // 256 is exactly four fifths of 320 rather than a number that looked right. A proportion
  // that can be stated is the difference between a deliberate relationship and an arbitrary
  // one, and 188 was arbitrary — it was whatever the text happened to measure.
  const button =
    placement === 'home'
      ? 'min-h-14 w-full max-w-[16rem] px-8 text-base bg-violet-300 text-violet-deep shadow-card hover:bg-violet-200 focus-visible:ring-violet-200'
      : 'min-h-12 px-6 text-sm border border-gold-400/70 text-gold-300 hover:bg-gold-400 hover:text-plum-900 focus-visible:ring-gold-300';

  const shared = `inline-flex items-center justify-center rounded-full font-bold transition focus-visible:ring-2 focus-visible:outline-none ${button}`;

  if (direct) {
    /*
     * AN OUTBOUND NAVIGATION NOW, SO IT TAKES `BuyButton`'S EVENT HANDLING AND NOT A PLAIN
     * `onClick`. Read that component's note before changing this: a beacon fired in the
     * click handler races the unload, and this is the most important number in the funnel.
     * `pointerdown` buys the whole press-and-release before navigation starts; `click` is
     * kept because pointerdown never fires for a keyboard activation; `sent` makes sure the
     * two produce one event between them. Deliberately NOT `preventDefault` plus a callback
     * — a blocked script would then strand somebody who is trying to pay.
     *
     * BOTH EVENTS FIRE, and that is correct rather than double-counting. They answer
     * different questions and always did: `deck_cta_home` is "this placement earned a
     * click", `checkout_started` is "somebody left for Stripe". Before this change the home
     * path produced both, one per page; now it produces both on one tap. Dropping either
     * would quietly break a funnel — without the first, the placement comparison loses its
     * busiest entry; without the second, every sale that starts on the landing page becomes
     * invisible.
     */
    const record = () => {
      if (sent.current) return;
      sent.current = true;
      track(deckCtaEvent(placement));
      track('checkout_started');
    };

    return (
      <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
        <a href={direct} rel="noopener" onPointerDown={record} onClick={record} className={shared}>
          {/*
           * THE PRICE IS ON THE BUTTON NOW, because the page it used to lead to is where a
           * buyer saw the amount. A control that goes straight to a checkout and does not
           * name what it costs is a worse thing than a slower funnel — so if the price is
           * somehow absent the label stands alone rather than the button inventing one.
           */}
          <span>{label}</span>
          {price && (
            <>
              <span aria-hidden className="px-2 text-violet-deep/60">
                &middot;
              </span>
              <span className="tabular-nums">{price}</span>
            </>
          )}
        </a>
        {line && <p className="text-xs text-violet-400">{line}</p>}
        {/*
         * AND THE PRODUCT PAGE STAYS ONE TAP AWAY. Skipping `/shop` skips where shipping,
         * returns and what is actually in the box are stated, and a buyer who wants to read
         * that before paying must not have to find it. Quiet, underneath, and it carries no
         * CTA event: it is a request for information, not a step toward a purchase, and
         * counting it as one would inflate the very number this change exists to measure.
         */}
        <Link
          href="/shop"
          className="text-xs text-violet-400 underline underline-offset-2 hover:text-violet-300"
        >
          What&rsquo;s in the deck, shipping and returns
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 text-center ${className}`}>
      <Link href="/shop" onClick={() => track(deckCtaEvent(placement))} className={shared}>
        {label}
      </Link>
      {line && <p className="text-xs text-violet-400">{line}</p>}
    </div>
  );
}
