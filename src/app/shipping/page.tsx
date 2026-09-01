import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LegalTable, OwnerGap } from '@/components/legal/LegalPage';
import { PHYSICAL_CARD_COUNT, isShopConfigured } from '@/lib/shop';

export const metadata: Metadata = {
  title: 'Shipping',
  description: 'Where the Plantdex deck ships, how it is sent, and how long it takes.',
};

/**
 * SHIPPING POLICY.
 *
 * Everything here that is stated as fact comes from how the checkout is actually built —
 * that Stripe collects the address, that it decides the shippable countries, that no order
 * is created before payment. Everything a buyer most wants to know — where it ships, how
 * long it takes, what postage costs — is an owner input and is rendered as a visible gap.
 *
 * That asymmetry is deliberate and is the whole reason this page can exist before launch: a
 * shipping page whose delivery estimate was invented would be a fabricated shipping claim,
 * and AGENTS.md prohibits those outright. An empty-looking page is the honest state.
 */
export default function ShippingPage() {
  return (
    <LegalPage
      title="Shipping"
      intro="How the printed deck is sent, and what is known about where and when. Anything not yet decided is marked rather than guessed."
    >
      <LegalSection id="status" heading="Current status">
        {isShopConfigured() ? (
          <p>
            The deck is on sale. The countries it can be sent to are set on the checkout page
            itself — if yours cannot be selected there, it is not one we can post to yet.
          </p>
        ) : (
          <p>
            <strong className="text-violet-100">The deck is not on sale yet</strong>, so
            nothing ships today. This page describes how it will work, and is published early
            so the terms are readable before anyone is asked to pay rather than after.
          </p>
        )}
      </LegalSection>

      <LegalSection id="where" heading="Where it ships">
        <p>
          The list of destinations is <OwnerGap id="shipping-policy" />.
        </p>
        <p>
          Whatever that list turns out to be, it is enforced by the checkout rather than by
          this page: Stripe only offers the countries the deck is configured for, so an order
          cannot be placed to an address that cannot be served. There is no situation in which
          a payment is taken and the destination then turns out to be unsupported.
        </p>
      </LegalSection>

      <LegalSection id="address" heading="Your delivery address">
        <p>
          Your address is entered on Stripe&rsquo;s checkout page and held by Stripe. It is not
          stored in your Plantdex account, and it is not connected to your collection — the
          order and the account are separate systems with nothing joining them.
        </p>
        <p>
          Address changes therefore have to go through the order, not the site. Reply to the
          receipt Stripe emails you as soon as you can; once a deck has been posted the address
          on it cannot be changed.
        </p>
      </LegalSection>

      <LegalSection id="times" heading="Dispatch and delivery times">
        <LegalTable
          rows={[
            {
              term: 'Time to dispatch',
              detail: <OwnerGap id="shipping-policy" />,
            },
            {
              term: 'Delivery estimate',
              detail: <OwnerGap id="shipping-policy" />,
            },
            {
              term: 'Postage cost',
              detail: (
                <>
                  <OwnerGap id="shipping-policy" /> Whatever it is, it is shown on the checkout
                  page and added before you pay — never after.
                </>
              ),
            },
            {
              term: 'Tracking',
              detail: <OwnerGap id="shipping-policy" />,
            },
          ]}
        />
        <p className="text-sm text-violet-300">
          No estimate appears above because none has been set. A delivery time is a promise,
          and an invented one is worse than an absent one.
        </p>
      </LegalSection>

      <LegalSection id="what" heading="What arrives">
        <p>
          One boxed deck of {PHYSICAL_CARD_COUNT} cards, ready to take outside. There is no
          code in the box, because there is nothing to unlock &mdash; log what you find in the{' '}
          <Link href="/herbdex" className="underline underline-offset-2 hover:text-gold-400">
            Herbdex
          </Link>{' '}
          whenever you get back.
        </p>
      </LegalSection>

      <LegalSection id="problems" heading="If it does not arrive">
        <p>
          A deck that is lost, delayed beyond the stated estimate, or arrives damaged is covered
          by the{' '}
          <Link href="/returns" className="underline underline-offset-2 hover:text-gold-400">
            returns and refunds
          </Link>{' '}
          page. Contact <OwnerGap id="contact-email" />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
