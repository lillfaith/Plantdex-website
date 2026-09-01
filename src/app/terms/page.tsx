import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LegalTable, OwnerGap } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description:
    'The terms for using Plantdex: what it is, what it is not, and what each side is responsible for.',
};

/**
 * Describes the site AS IT IS: a free, static, educational companion to a printed deck, with
 * optional accounts and — since the shop was built — a link out to a Stripe-hosted checkout.
 *
 * TERMS OF USE AND TERMS OF SALE ARE SEPARATE DOCUMENTS. This page governs using a free
 * website; /terms-of-sale governs buying a physical object. Merging them would bury the sale
 * terms inside a document most readers meet long before they consider buying anything.
 *
 * THIS SECTION HAS ALREADY GONE STALE ONCE. It used to say "there is no shop, no checkout and
 * no payment processing anywhere in the application", which stopped being true the moment
 * /shop shipped — the same way the privacy page's "no analytics" sentences stopped being true
 * when Plausible landed. `legal.test.ts` now fails the build if a /shop route exists while
 * this page still denies it, so the next person cannot repeat it.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro="The agreement between you and whoever operates Plantdex. It is deliberately short, and describes the site as it currently is rather than as it might become."
    >
      <LegalSection id="who" heading="Who these terms are with">
        <p>
          Plantdex is operated by <OwnerGap id="legal-entity" />. Using the site means accepting
          what is on this page. If you do not, please do not use it.
        </p>
      </LegalSection>

      <LegalSection id="what" heading="What Plantdex is">
        <p>
          Plantdex is an <strong className="text-violet-100">educational companion</strong> to a
          printed card deck: a digital collection where you record the plants you have found,
          read about them, and track what you have learned.
        </p>
        <p>
          It is not a field guide you should rely on to decide whether a plant is safe, not a
          medical or herbal advice service, and not a plant identification tool &mdash; it does
          not look at photographs and tell you what a plant is. You tell it what you found.
        </p>
      </LegalSection>

      <LegalSection id="safety" heading="Plants, and the limits of this site">
        <p>
          This is the term that matters most. Wild plants can be poisonous, can be confused with
          plants that are, and can affect people differently. Information here &mdash; including
          anything reproduced from the printed cards &mdash; is{' '}
          <strong className="text-violet-100">for education only</strong>. It describes
          traditional and historical use. It is not a claim that any plant treats, prevents or
          cures anything, and it is not a substitute for advice from a qualified professional.
        </p>
        <p>
          <strong className="text-violet-100">
            Never eat, drink, apply or otherwise use a wild plant on the strength of this site.
          </strong>{' '}
          Confirm identification independently, with an expert or a reliable regional guide,
          before any plant goes anywhere near you.
        </p>
        <p>
          The{' '}
          <Link href="/safety" className="underline underline-offset-2 hover:text-gold-400">
            herbal safety page
          </Link>{' '}
          sets this out properly, and these terms do not replace it.
        </p>
      </LegalSection>

      <LegalSection id="account" heading="Your account">
        <p>
          An account is optional; the site works without one. If you create one, keep your
          password to yourself and tell us if you think somebody else has it.
        </p>
        <p>
          You can stop using Plantdex whenever you like. Deleting an account is not yet
          something the app can do on its own &mdash; see the{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-gold-400">
            privacy page
          </Link>{' '}
          for how it currently works.
        </p>
        <p>
          Accounts may be suspended where they are used to break these terms, to attack the
          service, or to harm other people.
        </p>
      </LegalSection>

      <LegalSection id="your-content" heading="What you write and photograph">
        <p>
          Your sightings, notes and photographs are <strong className="text-violet-100">yours</strong>.
          Nothing here transfers ownership of them.
        </p>
        <p>
          To run the service at all we need permission to store and display them back to you
          &mdash; that is the whole extent of it. Nothing you record is published, shown to other
          users, or used to promote anything. Plantdex has no sharing or social features today,
          and if one is ever added it will be something you opt into.
        </p>
        <p>
          Do not upload anything you do not have the right to, or anything unlawful.
        </p>
      </LegalSection>

      <LegalSection id="our-content" heading="The deck, the artwork and the site">
        <p>
          The card artwork, the pixel-art creatures, the deck&rsquo;s text and the design of this
          site belong to the operator or are used with permission. Enjoy them, screenshot them,
          show people &mdash; but do not reproduce the artwork commercially, resell it, or
          present it as your own.
        </p>
        <p className="text-sm text-violet-300">
          Scientific and botanical facts are nobody&rsquo;s property. Citations on plant pages
          point at their original sources, which have their own terms.
        </p>
      </LegalSection>

      <LegalSection id="acceptable" heading="Fair use of the service">
        <p>Please do not:</p>
        <LegalTable
          rows={[
            {
              term: 'Attack or overload it',
              detail:
                'No attempts to break, probe, or flood the service, or to reach data belonging to anyone else.',
            },
            {
              term: 'Scrape it wholesale',
              detail:
                'Reading the site is fine. Bulk-copying the deck data or artwork to republish it is not.',
            },
            {
              term: 'Misrepresent it',
              detail:
                'Do not present Plantdex as medical advice, or as confirmation that something is safe to eat.',
            },
          ]}
        />
      </LegalSection>

      <LegalSection id="availability" heading="Availability">
        <p>
          Plantdex is provided as it is, free of charge, with no promise that it will be
          available, uninterrupted, or free of errors. Features may change or be removed.
        </p>
        <p>
          Keep your own record of anything that matters to you. Signed out, your progress lives
          only in your browser and clearing site data will destroy it &mdash; the app says so
          where it is relevant, and the privacy page explains it.
        </p>
      </LegalSection>

      <LegalSection id="liability" heading="Responsibility">
        <p>
          Nothing in these terms limits liability for anything that cannot lawfully be limited.
          Beyond that, the warranty disclaimer and limitation of liability are{' '}
          <OwnerGap id="liability" />.
        </p>
        <p className="text-sm text-violet-300">
          This section is deliberately left open rather than filled with standard wording. It is
          the clause most likely to matter on a site about plants people may eat, and it is a
          decision for a lawyer, not for a draft.
        </p>
      </LegalSection>

      <LegalSection id="shop" heading="Buying the deck">
        <p>
          Using Plantdex is free, signed in or out: the collection, garden, journal and
          research system are not behind a paywall. Buying the printed deck is a separate
          thing entirely &mdash; it is a physical object you take outdoors, not a key to
          anything on this site.
        </p>
        <p>
          The printed deck is sold through{' '}
          <Link href="/shop" className="underline underline-offset-2 hover:text-gold-400">
            our shop page
          </Link>
          , and buying it is governed by a separate document:{' '}
          <Link
            href="/terms-of-sale"
            className="underline underline-offset-2 hover:text-gold-400"
          >
            terms of sale
          </Link>
          , with{' '}
          <Link href="/shipping" className="underline underline-offset-2 hover:text-gold-400">
            shipping
          </Link>{' '}
          and{' '}
          <Link href="/returns" className="underline underline-offset-2 hover:text-gold-400">
            returns
          </Link>{' '}
          alongside it. Those terms cover the goods; this page covers the website.
        </p>
        <p>
          Payment is taken by Stripe on their own pages. This site never receives or stores card
          details, and an order is not connected to a Plantdex account &mdash; buying a deck does
          not create one.
        </p>
        <p className="text-sm text-violet-300">
          The price itself is <OwnerGap id="commerce-terms" />, and until it is set the shop
          page says the deck is not on sale rather than showing a figure nobody has decided.
        </p>
      </LegalSection>

      <LegalSection id="law" heading="Governing law">
        <p>
          Which law applies to these terms, and where a dispute would be heard, is{' '}
          <OwnerGap id="governing-law" />.
        </p>
      </LegalSection>

      <LegalSection id="changes" heading="Changes">
        <p>
          These terms change when the site does. The date at the top is the day this page was
          last checked against the application. Continuing to use Plantdex after a change means
          accepting the updated terms.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
