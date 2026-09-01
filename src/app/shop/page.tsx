import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { BuyButton } from '@/components/shop/BuyButton';
import { SafetyNotice } from '@/components/SafetyNotice';
import { assetPath } from '@/lib/asset-path';
import { CURRENT_COLLECTION } from '@/lib/collection';
import { getHerb } from '@/lib/deck';
import {
  DECK_CARD_COUNT,
  INCLUDED,
  NOT_INCLUDED,
  PHYSICAL_CARD_COUNT,
  SHOWCASE_HERB_IDS,
  displayPrice,
  isShopConfigured,
  paymentLink,
} from '@/lib/shop';

export const metadata: Metadata = {
  title: 'Get the deck',
  description: `The physical ${CURRENT_COLLECTION.name} deck — ${PHYSICAL_CARD_COUNT} illustrated cards of the common wild plants growing around you.`,
};

/**
 * THE PRODUCT PAGE.
 *
 * Written as a page about a deck of cards, not as a storefront template. There is no
 * star-rating row, no "customers also bought", no urgency banner and no stock counter —
 * partly because those are the generic pattern the brief rules out, and partly because
 * every one of them would be a claim this project cannot support. A scarcity line about a
 * deck nobody has ordered yet is a fabricated inventory claim, which AGENTS.md prohibits
 * outright.
 *
 * WHAT IS SHOWN IS WHAT IS TRUE. The card count comes from the deck data. The images are
 * the actual card fronts and backs in this repository. The "what's included" list is
 * checkable line by line against `src/lib/shop.ts`. Shipping, returns and the price come
 * from the owner and Stripe; until they exist this page says so rather than guessing.
 */
export default function ShopPage() {
  const link = paymentLink();
  const price = displayPrice();
  const configured = isShopConfigured();

  // The ids live in shop.ts so a test can assert they still resolve — see SHOWCASE_HERB_IDS.
  const showcase = SHOWCASE_HERB_IDS.map((id) => getHerb(id)).filter(
    (herb): herb is NonNullable<typeof herb> => Boolean(herb),
  );
  // The back shown is the first card's own back, so the two always describe the same species.
  const backCard = showcase[0];

  return (
    <main id="main" className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <header className="text-center">
        <p className="text-xs font-bold tracking-[0.25em] text-violet-300 uppercase">
          {CURRENT_COLLECTION.name}
        </p>
        <h1 className="font-display mt-3 text-3xl leading-tight font-extrabold text-gold-plate sm:text-5xl">
          The Plantdex deck
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-violet-200">
          {DECK_CARD_COUNT} illustrated species cards — plus an icon guide and a disclaimer
          card, {PHYSICAL_CARD_COUNT} in all — covering the common wild plants of waysides,
          lawns, hedges and waste ground. The ones you walk past, not the ones you have to
          travel to find.
        </p>
      </header>

      {/* ── The cards themselves ─────────────────────────────────────────────── */}
      <section className="mt-10" aria-labelledby="cards-heading">
        <h2 id="cards-heading" className="sr-only">
          Cards from the deck
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {showcase.map((herb) => (
            <li key={herb.id} className="contents">
              <figure className="col-span-1">
                <Image
                  src={assetPath(`/cards/${herb.id}.webp`)}
                  alt={`The front of the ${herb.commonName} card`}
                  width={420}
                  height={620}
                  className="w-full rounded-xl border border-violet-800/60"
                />
                <figcaption className="mt-2 text-center text-xs text-violet-400">
                  {herb.commonName} &middot; front
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
        {backCard && (
        <figure className="mt-4">
          <Image
            src={assetPath(`/cards/back/${backCard.id}.webp`)}
            alt={`The back of the ${backCard.commonName} card, showing its written entry`}
            width={420}
            height={620}
            className="mx-auto w-1/2 max-w-[220px] rounded-xl border border-violet-800/60"
          />
          <figcaption className="mt-2 text-center text-xs text-violet-400">
            Every card is printed both sides — the back carries the written entry.
          </figcaption>
        </figure>
        )}
      </section>

      {/* ── Physical ↔ digital ───────────────────────────────────────────────── */}
      <section className="panel mt-10 p-5 sm:p-6" aria-labelledby="digital-heading">
        <h2
          id="digital-heading"
          className="text-sm font-bold tracking-wide text-gold-400 uppercase"
        >
          How the deck and this site fit together
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-violet-200">
          <strong className="text-violet-100">The deck is your field companion; Plantdex is
          the world it connects to.</strong> Every one of the {DECK_CARD_COUNT} species pages
          is transcribed from the physical card of the same number, and where a card contains
          an error the site reproduces it faithfully and says so rather than quietly
          correcting it.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-violet-200">
          The cards are what you carry. The site is what you keep: find a plant outdoors, log
          it here, and its card joins your collection — discovered, then learned, then
          mastered.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-violet-300">
          The digital Plantdex is <strong className="text-violet-100">free and open to
          everyone</strong>, with or without the cards, with or without an account. Buying the
          deck unlocks nothing here, because nothing here is locked.{' '}
          <Link href="/herbdex" className="underline underline-offset-2 hover:text-gold-400">
            Try it first
          </Link>{' '}
          — it costs nothing to find out whether you like it.
        </p>
      </section>

      {/* ── What's included ──────────────────────────────────────────────────── */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-labelledby="included-heading">
        <div className="panel p-5">
          <h2
            id="included-heading"
            className="text-sm font-bold tracking-wide text-gold-400 uppercase"
          >
            What you get
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-violet-200">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-gold-400">
                  &#43;
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-5">
          <h2 className="text-sm font-bold tracking-wide text-violet-300 uppercase">
            What there isn&rsquo;t
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-violet-300">
            {NOT_INCLUDED.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden className="text-violet-500">
                  &minus;
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Buying ───────────────────────────────────────────────────────────── */}
      <section className="panel mt-8 p-5 sm:p-6" aria-labelledby="buy-heading">
        <h2 id="buy-heading" className="text-sm font-bold tracking-wide text-gold-400 uppercase">
          {configured ? 'Order' : 'Not on sale yet'}
        </h2>

        {configured ? (
          <>
            <div className="mt-4">
              <BuyButton href={link!} price={price!} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-violet-400">
              Payment is taken by Stripe on their own secure page. Plantdex never sees or
              stores your card details. Apple Pay and Google Pay appear there when your
              device and browser support them.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-violet-400">
              Your delivery address, the countries this deck can be sent to, quantity, and any
              tax are all confirmed on that page before you pay.
            </p>
            <p className="mt-3 text-xs text-violet-400">
              <Link
                href="/shipping"
                className="underline underline-offset-2 hover:text-gold-400"
              >
                Shipping
              </Link>
              {' · '}
              <Link href="/returns" className="underline underline-offset-2 hover:text-gold-400">
                Returns and refunds
              </Link>
              {' · '}
              <Link
                href="/terms-of-sale"
                className="underline underline-offset-2 hover:text-gold-400"
              >
                Terms of sale
              </Link>
            </p>
          </>
        ) : (
          /*
           * THE HONEST UNCONFIGURED STATE.
           *
           * No price, no button, no "coming soon — join the waitlist" box. There is no
           * waitlist, and inventing one would be exactly the fabricated scarcity claim the
           * project rules out. The page is still worth reading: everything above it is true
           * today.
           */
          <>
            <p className="mt-3 text-sm leading-relaxed text-violet-200">
              The printed deck isn&rsquo;t for sale yet. When it is, this page is where it will
              be, with the price, the countries it ships to and the return terms all stated
              before you pay.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-violet-300">
              In the meantime the whole collection is free to use.{' '}
              <Link
                href="/herbdex"
                className="font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
              >
                Open the Herbdex
              </Link>
              .
            </p>
          </>
        )}
      </section>

      {/* Standard weight, not brief: this page discusses a deck about identifying and
          preparing wild plants, which is precisely the risk the full notice exists for. */}
      <div className="mt-8">
        <SafetyNotice
          variant="standard"
          context="This deck describes wild plants, including how they have traditionally been prepared and eaten."
        />
      </div>
    </main>
  );
}
