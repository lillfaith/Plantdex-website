import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LegalTable, OwnerGap } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Returns and refunds',
  description: 'How to return a Plantdex deck, and how refunds are handled.',
};

/**
 * RETURNS AND REFUNDS.
 *
 * The mechanics of a refund are known — Stripe reverses it to the original payment method,
 * and no card details are held here to do that with — so those are stated. The terms of a
 * return are not known, and every one of them is a legal decision that depends on where the
 * seller is established: a UK or EU seller cannot offer less than the statutory cancellation
 * right, and a policy that quietly did so would be void as well as unfair.
 *
 * So this page states the process and marks the terms, rather than drafting a generic
 * "30 days, unopened, buyer pays postage" that nobody agreed to and that might be unlawful.
 */
export default function ReturnsPage() {
  return (
    <LegalPage
      title="Returns and refunds"
      intro="What happens if you change your mind, or if a deck arrives damaged. The process is settled; the terms are still to be confirmed and are marked as such."
    >
      <LegalSection id="rights" heading="Your statutory rights come first">
        <p>
          Nothing on this page reduces the rights you have by law. Depending on where you and
          the seller are, you may have a legal right to cancel an order within a set period and
          receive a refund regardless of any policy stated here. Which regime applies is{' '}
          <OwnerGap id="audience-scope" />, and the policy terms themselves are{' '}
          <OwnerGap id="returns-policy" />.
        </p>
        <p className="text-sm text-violet-300">
          Where the policy below and the law disagree, the law wins. That is not generosity;
          it is how consumer law works.
        </p>
      </LegalSection>

      <LegalSection id="terms" heading="The terms">
        <LegalTable
          rows={[
            { term: 'How long you have', detail: <OwnerGap id="returns-policy" /> },
            { term: 'Condition it must be in', detail: <OwnerGap id="returns-policy" /> },
            { term: 'Who pays return postage', detail: <OwnerGap id="returns-policy" /> },
            {
              term: 'Damaged or faulty on arrival',
              detail: (
                <>
                  Always covered, and never at your cost. Photograph the damage and contact{' '}
                  <OwnerGap id="contact-email" /> &mdash; a deck that arrives damaged is our
                  problem, not yours, whatever the return window turns out to be.
                </>
              ),
            },
            {
              term: 'Wrong item, or never arrived',
              detail: (
                <>
                  Same &mdash; contact <OwnerGap id="contact-email" />. See also{' '}
                  <Link
                    href="/shipping"
                    className="underline underline-offset-2 hover:text-gold-400"
                  >
                    shipping
                  </Link>
                  .
                </>
              ),
            },
          ]}
        />
      </LegalSection>

      <LegalSection id="how" heading="How a refund is actually paid">
        <p>
          Refunds are issued through Stripe, back to the original payment method. That is the
          only route available, and it is a consequence of how checkout is built rather than a
          policy choice: Plantdex never receives your card details, so there is nothing here to
          refund <em>from</em> and no way to send money anywhere else.
        </p>
        <p>
          How long the money takes to appear is set by your bank or card issuer, not by us or
          by Stripe.
        </p>
      </LegalSection>

      <LegalSection id="digital" heading="The digital Plantdex is not part of any refund">
        <p>
          There is nothing to refund on the digital side, because nothing on this site is paid
          for. Returning a deck does not remove your collection, close your account or revoke
          anything &mdash; the{' '}
          <Link href="/herbdex" className="underline underline-offset-2 hover:text-gold-400">
            Herbdex
          </Link>{' '}
          is free to everyone, buyer or not.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="Starting a return">
        <p>
          Reply to the receipt Stripe emailed you, or write to <OwnerGap id="contact-email" />.
          Include the order reference from that receipt &mdash; it is the only record that
          connects a payment to a delivery, since orders are not stored on this site.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
