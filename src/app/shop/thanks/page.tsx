import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Thank you',
  description: 'Your Plantdex deck order is confirmed by Stripe. Here is what happens next.',
  // Nothing here should ever be indexed or shared onward — it is a page one person sees once.
  robots: { index: false, follow: false },
};

/**
 * WHERE STRIPE RETURNS A BUYER AFTER A SUCCESSFUL PAYMENT.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS PAGE PRINTS NO ORDER DATA, AND THAT IS DELIBERATE.
 *
 * A Stripe Payment Link can append `?session_id=...` to this URL, and it is tempting to read
 * it and render "Order #1234 · $24.99 · 2 decks". This site is a static export with no
 * server and no Stripe secret key, so it could not verify any of it. Everything it printed
 * would be whatever the URL said — which means a fabricated confirmation for anyone who
 * edits the query string, and a page that would state an order exists when it may not.
 *
 * So the page confirms the *event* ("Stripe has taken your payment") without asserting any
 * *detail* it cannot check, and points at the receipt Stripe itself sends, which is the
 * authoritative record. The brief's rule — no fake order data if Stripe does not pass it
 * safely to a static return page — is satisfied by printing none at all.
 *
 * It also does not claim a delivery date. Nobody has set one.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `checkout_started` is recorded on the way out, not a purchase event on the way back: this
 * page can be opened, bookmarked and refreshed by anyone, so counting arrivals here as sales
 * would inflate the only number that would matter. Stripe's own dashboard is the source of
 * truth for completed orders, and it does not need this site's help to count them.
 */
export default function ShopThanksPage() {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-14 sm:py-20">
      <p className="text-xs font-bold tracking-[0.25em] text-gold-400 uppercase">Order placed</p>
      <h1 className="font-display mt-3 text-3xl leading-tight font-extrabold text-gold-plate sm:text-4xl">
        Thank you — your deck is on its way to being packed.
      </h1>

      <section className="panel mt-8 p-5" aria-labelledby="next-heading">
        <h2 id="next-heading" className="text-sm font-bold tracking-wide text-gold-400 uppercase">
          What happens next
        </h2>
        <ol className="mt-3 space-y-3 text-sm leading-relaxed text-violet-200">
          <li className="flex gap-3">
            <span aria-hidden className="font-bold text-gold-400 tabular-nums">
              1
            </span>
            <span>
              <strong className="text-violet-100">Stripe emails your receipt</strong> to the
              address you entered at checkout. That receipt, not this page, is your record of
              the order — keep it.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="font-bold text-gold-400 tabular-nums">
              2
            </span>
            <span>
              <strong className="text-violet-100">Your deck is packed and posted</strong> to the
              address you gave Stripe. You&rsquo;ll hear from us when it goes out.
            </span>
          </li>
          <li className="flex gap-3">
            <span aria-hidden className="font-bold text-gold-400 tabular-nums">
              3
            </span>
            <span>
              <strong className="text-violet-100">Nothing to set up.</strong> There is nothing
              in the box to type in here — the digital Plantdex is already open to you, and always was.
            </span>
          </li>
        </ol>
        <p className="mt-4 text-xs leading-relaxed text-violet-400">
          Something wrong with the order, or need to change the delivery address? Reply to the
          Stripe receipt, or see our{' '}
          <Link href="/returns" className="underline underline-offset-2 hover:text-gold-400">
            returns and refunds
          </Link>{' '}
          page.
        </p>
      </section>

      <section className="panel mt-6 p-5" aria-labelledby="meanwhile-heading">
        <h2
          id="meanwhile-heading"
          className="text-sm font-bold tracking-wide text-gold-400 uppercase"
        >
          While you wait
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-violet-200">
          Most of the plants in the deck are within a short walk of wherever you are reading
          this. You don&rsquo;t need the cards to start.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/herbdex"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-gold-400 px-6 text-sm font-bold text-plum-900 transition hover:bg-gold-300"
          >
            Open the Herbdex
          </Link>
          <Link
            href="/account"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-violet-500 px-6 text-sm font-semibold text-violet-200 transition hover:bg-plum-600"
          >
            Create an account
          </Link>
        </div>
        {/*
          The account is offered, never required, and the reason it exists is stated plainly.
          An order does not create an account and is not linked to one: Stripe holds the
          order, Supabase holds the collection, and nothing joins them — which is also why
          buying a deck cannot pre-fill anything here.
        */}
        <p className="mt-3 text-xs leading-relaxed text-violet-400">
          An account is optional. It exists only so your collection follows you between
          devices — your order isn&rsquo;t connected to one, and signing up gives you nothing
          extra beyond that.
        </p>
      </section>
    </main>
  );
}
