import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LegalTable, OwnerGap } from '@/components/legal/LegalPage';
import { PHYSICAL_CARD_COUNT, DECK_CARD_COUNT } from '@/lib/shop';

export const metadata: Metadata = {
  title: 'Terms of sale',
  description: 'The terms on which the printed Plantdex deck is sold.',
};

/**
 * TERMS OF SALE — separate from the Terms of Use, because they govern different things.
 *
 * /terms covers using a free website. This covers buying a physical object: who the seller
 * is, when a contract is formed, what is actually promised about the goods. Merging them
 * would bury the sale terms inside a document most readers meet before they ever consider
 * buying anything.
 *
 * The mechanics below are all checkable from the implementation — Stripe is the merchant
 * surface, the contract forms on payment, nothing is stored here. The commercial terms are
 * owner inputs and render as gaps.
 */
export default function TermsOfSalePage() {
  return (
    <LegalPage
      title="Terms of sale"
      intro="The terms on which the printed deck is sold. These cover buying a physical object; the Terms of Use cover using this website, which is free."
    >
      <LegalSection id="seller" heading="Who you are buying from">
        <p>
          The seller is <OwnerGap id="legal-entity" />, contactable at{' '}
          <OwnerGap id="contact-email" />.
        </p>
        <p>
          Payment is processed by Stripe, who are the payment processor rather than the seller.
          Your contract for the goods is with the seller named above.
        </p>
      </LegalSection>

      <LegalSection id="product" heading="What is being sold">
        <p>
          One printed deck: {PHYSICAL_CARD_COUNT} cards, being {DECK_CARD_COUNT} illustrated
          species cards plus an icon guide card and a disclaimer card. Each card is printed on
          both sides.
        </p>
        <p>
          The deck is an <strong className="text-violet-100">educational and illustrative
          product</strong>. It is not an identification key, not a foraging licence and not
          medical, nutritional or safety advice. See{' '}
          <Link href="/safety" className="underline underline-offset-2 hover:text-gold-400">
            herbal safety
          </Link>{' '}
          &mdash; that page is part of what you are agreeing to when you buy.
        </p>
        <p className="text-sm text-violet-300">
          Printed colours vary slightly between production runs, and card artwork shown online
          is a photograph or a render rather than a colour-matched proof.
        </p>
      </LegalSection>

      <LegalSection id="price" heading="Price and payment">
        <LegalTable
          rows={[
            { term: 'Price', detail: <OwnerGap id="commerce-terms" /> },
            {
              term: 'Where the price is authoritative',
              detail:
                'The Stripe checkout page. If the amount there ever differs from the amount shown on this site, the checkout is correct and you should not complete the purchase — tell us instead.',
            },
            { term: 'Tax', detail: <OwnerGap id="tax-registration" /> },
            {
              term: 'Postage',
              detail: (
                <>
                  <OwnerGap id="shipping-policy" /> Shown at checkout before payment.
                </>
              ),
            },
            {
              term: 'Payment methods',
              detail:
                'Whatever Stripe offers your device and country at checkout, which normally includes cards and may include Apple Pay or Google Pay. We do not choose these individually and cannot guarantee a particular one is available to you.',
            },
          ]}
        />
      </LegalSection>

      <LegalSection id="contract" heading="When the contract is formed">
        <p>
          Placing an order is an offer to buy. The contract is formed when Stripe confirms your
          payment and you receive the receipt Stripe sends. The thank-you page on this site is
          not the confirmation &mdash; it is a static page anyone can open, which is precisely
          why it states no order details.
        </p>
        <p>
          If a deck cannot be supplied after payment &mdash; stock, a pricing error, an address
          that cannot be served &mdash; the order is refunded in full. Nothing obliges us to
          fulfil an order at an incorrectly displayed price.
        </p>
      </LegalSection>

      <LegalSection id="delivery" heading="Delivery and returns">
        <p>
          Delivery destinations and times are on the{' '}
          <Link href="/shipping" className="underline underline-offset-2 hover:text-gold-400">
            shipping
          </Link>{' '}
          page; cancellation and refunds are on the{' '}
          <Link href="/returns" className="underline underline-offset-2 hover:text-gold-400">
            returns
          </Link>{' '}
          page. Both form part of these terms.
        </p>
        <p>
          Risk in the goods passes to you on delivery. Nothing in these terms affects your
          statutory rights.
        </p>
      </LegalSection>

      <LegalSection id="liability" heading="Liability">
        <p>
          The warranty and liability position is <OwnerGap id="liability" />.
        </p>
        <p>
          One thing is stated plainly regardless, because it is the risk this particular product
          carries: the deck describes wild plants, and identifying a plant from any book, card
          or website is your own responsibility. Never eat, drink or apply a wild plant on an
          uncertain identification.
        </p>
      </LegalSection>

      <LegalSection id="data" heading="What we learn about your order">
        <p>
          Your name, address and payment details are given to Stripe and are held by Stripe. The
          seller sees what is needed to pack and post an order. None of it is written into your
          Plantdex account, and buying a deck does not create one &mdash; see the{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-gold-400">
            privacy page
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="law" heading="Governing law">
        <p>
          These terms are governed by <OwnerGap id="governing-law" />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
