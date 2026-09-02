import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, LegalSection, LegalTable, OwnerGap } from '@/components/legal/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What Plantdex stores, where it goes, and what it does not do. Written from the application itself.',
};

/**
 * WRITTEN FROM THE CODE, NOT FROM A TEMPLATE.
 *
 * Every factual claim below was checked against this repository on the date the page
 * states. The specific evidence, so a reviewer can re-check it rather than trust it:
 *
 *   • Tables and columns — supabase/migrations/0001_accounts.sql
 *   • Row Level Security, and the absence of any update policy — same file
 *   • Local storage keys — src/lib/{storage,sightings,reveals,research-board,player-profile}.ts
 *   • Photos — src/lib/photo-store.ts (IndexedDB) and src/lib/remote-sightings.ts (bucket)
 *   • Auth calls — src/state/AuthProvider.tsx
 *   • No cookies — `document.cookie` appears nowhere in src/
 *   • Analytics — src/lib/analytics.ts (the complete event list, and a `track()` that takes
 *     an event name and no second parameter, which is what makes "nothing attached" true),
 *     src/components/analytics/PlausibleScript.tsx (the only third-party script in the app)
 *   • Fonts are self-hosted by next/font at build time, so no font provider is contacted
 *
 * Anything that could not be established that way is an <OwnerGap>, not a sentence.
 *
 * `legal.test.ts` fails the build if the application gains a cookie, or if its analytics
 * provider stops matching the one this page names. The point of that test is that this page
 * cannot quietly go stale: the sentences below are load-bearing, not decoration.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      intro="What Plantdex stores, where it goes, and — just as importantly — what it does not do. This page was written from the application's own code rather than from a template, so it describes the software as it actually behaves."
    >
      <LegalSection id="who" heading="Who is responsible">
        <p>
          Plantdex is operated by <OwnerGap id="legal-entity" />. Questions about anything on
          this page, or a request about your own data, go to <OwnerGap id="contact-email" />.
        </p>
        <p>
          Which privacy laws apply to you depends on where you and the operator are, which is{' '}
          <OwnerGap id="audience-scope" />.
        </p>
      </LegalSection>

      <LegalSection id="without-account" heading="Using Plantdex without an account">
        <p>
          Most of Plantdex works signed out, and when you use it that way{' '}
          <strong className="text-violet-100">nothing you do leaves your device</strong>. There
          is no server call to record it, because for a signed-out visitor there is no server
          involved at all — the site is a set of static files.
        </p>
        <p>Your progress is kept in your own browser, under these keys:</p>
        <LegalTable
          rows={[
            {
              term: 'Local storage',
              detail:
                'Which plants you have discovered, learned and mastered; Field Research completions and achievements; your sightings; which cards you have revealed for reading; the current research board; your Seed Shelf — species you identified that have no card yet, with the dates you found them; and your profile settings — a display name you choose, and which plants, frame, title and achievements you have picked for it.',
            },
            {
              term: 'IndexedDB',
              detail:
                'Photographs you attach to a sighting. They are held in the browser database because a single phone photo is far larger than local storage can hold.',
            },
          ]}
        />
        <p>
          Because this is browser storage, clearing your site data deletes it, and nobody —
          including us — can recover it. That is the trade-off for a version that asks you for
          nothing.
        </p>
      </LegalSection>

      <LegalSection id="with-account" heading="If you create an account">
        <p>
          An account exists so your collection follows you between devices. Creating one asks
          for an <strong className="text-violet-100">email address and a password</strong>, and
          nothing else. There is no username and no date of birth, because the application has
          no such fields. You may give yourself a display name and pick an avatar on your
          profile, but both are optional, neither is asked for at sign-up, and your profile is
          visible only to you — there are no public profiles, followers or leaderboards here.
        </p>
        <p>Signed in, these things are stored on our behalf by Supabase:</p>
        <LegalTable
          rows={[
            {
              term: 'Your email address',
              detail:
                'Held by Supabase Auth so you can sign in and reset your password. Your password is never stored in a readable form.',
            },
            {
              term: 'Collection progress',
              detail:
                'One row per fact: which plants you discovered, learned and mastered, which Field Research tasks you completed, and which achievements you unlocked — each with the date it happened.',
            },
            {
              term: 'Sightings',
              detail:
                'The date, an optional free-text region you type yourself, optional notes, an optional growth stage, and whether it was a return visit.',
            },
            {
              term: 'Sighting photographs',
              detail:
                'Stored in a private bucket, in a folder belonging to your account. They are not public, and are not readable by other signed-in users.',
            },
            {
              term: 'Your Seed Shelf',
              detail:
                'One row per save: the scientific name an identifier suggested, its common name and taxonomy ids where the provider gave them, the date, the score, and a reference to the scan it came from. A shelf entry records a plant you photographed that has no Plantdex card. It is not a discovery, earns nothing, and says nothing about whether a plant is safe.',
            },
            {
              term: 'Profile settings',
              detail:
                'Only the choices you make: an optional display name, and the ids of the plants, frame, title and achievements you have picked. It holds no level, XP or counts — those are recalculated from the rows above, the same as everywhere else.',
            },
          ]}
        />
        <p>
          Your XP and level are <em>not</em> stored. They are recalculated from the rows above
          every time they are shown, which is why there is no score in the database to lose,
          leak or dispute.
        </p>
      </LegalSection>

      <LegalSection id="location" heading="Location">
        <p>
          Plantdex does not use your device&rsquo;s location. It never requests location
          permission, and it stores no coordinates.
        </p>
        <p>
          A sighting has a <strong className="text-violet-100">region</strong> field, but it is
          free text you type — &ldquo;the woods behind the school&rdquo;, &ldquo;north
          field&rdquo; — and the application neither interprets it nor checks it. Whatever you
          write there is what is stored, so write it as loosely as you like.
        </p>
      </LegalSection>

      <LegalSection id="not-doing" heading="What Plantdex does not do">
        <p>These are properties of the current build, not intentions:</p>
        <LegalTable
          rows={[
            {
              term: 'No cookies',
              detail:
                'The site sets none at all. Your signed-in session is kept in your browser’s local storage, not a cookie.',
            },
            {
              term: 'No advertising or session recording',
              detail:
                'No tag manager, no advertising pixel, no session recorder, no heatmap and no mouse tracking. Nothing watches what you do on a page; see “Measurement” below for the small amount that is counted.',
            },
            {
              term: 'Almost no third-party requests',
              detail:
                'Loading a page contacts our own host, the analytics script described below, and — only once you sign in — Supabase. Even the fonts are served from our own site rather than fetched from a font provider.',
            },
            {
              term: 'No selling or sharing',
              detail:
                'Your data is not sold, rented, shared with advertisers, or used to train anything.',
            },
            {
              term: 'No profiling',
              detail:
                'Nothing you do is used to build a profile of you, and no automated decisions are made about you.',
            },
          ]}
        />
        <p className="text-sm text-violet-300">
          Links to external references — the journals and university pages cited on plant pages
          — are ordinary links. Nothing is requested from those sites unless you click through.
        </p>
      </LegalSection>

      <LegalSection id="measurement" heading="Measurement">
        <p>
          We count how the site is used, so we can tell which parts of it work. That counting
          is done by <strong className="text-violet-100">Plausible Analytics</strong>, which is
          the only third-party script the site loads.
        </p>
        <p>
          Plausible <strong className="text-violet-100">sets no cookies and stores no
          identifier</strong> on your device. That is why you have never been asked to accept
          cookies here: there are none to accept. It is also why nothing below can be tied back
          to you, or to your previous visits.
        </p>
        <p>What is counted:</p>
        <LegalTable
          rows={[
            {
              term: 'Page views',
              detail:
                'Which page was opened, plus the coarse information any web request carries anyway — a rough country, a browser, a device type, and which site linked here.',
            },
            {
              term: 'A short list of actions',
              detail:
                'Opening the Herbdex, the garden or your profile; viewing, revealing, discovering or mastering a card; passing a knowledge check; finishing a Field Research task; starting or completing a sign-up; signing in; and importing local progress into an account.',
            },
            {
              term: 'Nothing attached to them',
              detail:
                'Each action is counted by name and carries no attached data whatsoever. The function that records them accepts an event name and nothing else, so there is no field an address, an identifier or anything you typed could travel in — not by mistake and not by a later edit. A test fails the build if that ever stops being true.',
            },
          ]}
        />
        <p>What is deliberately never sent:</p>
        <LegalTable
          rows={[
            {
              term: 'Nothing that identifies you',
              detail:
                'No email address, no account id, no session id, no persistent identifier of any kind. A signed-in visitor and a signed-out one are indistinguishable in the analytics.',
            },
            {
              term: 'Nothing about which plant',
              detail:
                'The actions above are counted as bare totals. Where a page view already records which plant page was open, that is the ordinary page address — the same thing every web server sees — and not a record of what you personally collected.',
            },
            {
              term: 'Nothing you wrote or photographed',
              detail:
                'Sighting notes, region text and photographs are never sent to the analytics service, in whole or in part.',
            },
            {
              term: 'No location',
              detail:
                'No coordinates, and nothing derived from your device location — the site never asks for it in the first place.',
            },
          ]}
        />
        <p className="text-sm text-violet-300">
          Measurement is switched on by a single build-time setting. When it is off, the script
          is not loaded and nothing is sent at all — which is the state of any local copy of the
          site and of any fork.
        </p>
      </LegalSection>

      <LegalSection id="processors" heading="Who else is involved">
        <p>
          <strong className="text-violet-100">Supabase</strong> provides the database,
          authentication and file storage that accounts depend on. They hold the data described
          above on our behalf. The project region, and whether a data processing agreement is in
          place, is <OwnerGap id="data-region" />.
        </p>
        <p>
          <strong className="text-violet-100">GitHub Pages</strong> serves the site&rsquo;s
          files. Like any web host it necessarily sees the network requests that fetch those
          files.
        </p>
        <p>
          <strong className="text-violet-100">Plausible Analytics</strong> receives the counts
          described above, and nothing else.
        </p>
        <p>
          <strong className="text-violet-100">PlantNet</strong> identifies plants from
          photographs you choose to submit, and receives nothing else.
        </p>
        <p>
          <strong className="text-violet-100">Stripe</strong> handles payment if you buy the
          printed deck. They receive your name, delivery address, email and payment details
          directly — none of it passes through this site. Stripe is contacted only when you
          click through to checkout; browsing Plantdex, including the shop page, contacts them
          not at all.
        </p>
        <p>Signed out and not buying anything, only GitHub Pages and Plausible are involved.</p>
      </LegalSection>

      <LegalSection id="plant-id" heading="If you identify a plant from a photo">
        <p>
          Plant identification sends your photograph to{' '}
          <strong className="text-violet-100">PlantNet</strong>, an identification service, and
          shows you what came back. It happens only when you choose to identify something.
        </p>
        <LegalTable
          rows={[
            {
              term: 'The photograph, resized and stripped',
              detail:
                'Before it leaves your device it is re-encoded to 1280px, which drops its EXIF metadata — including any GPS coordinates your camera recorded. The original file is never sent.',
            },
            {
              term: 'Nothing that identifies you',
              detail:
                'No account id, no email and no name is sent to the identification service. It receives an image and returns names; it is not told whose image it is.',
            },
            {
              term: 'A daily count, so one device cannot use up the allowance',
              detail:
                'Signed in, the counter is keyed to your account. Signed out, it is keyed to a one-way hash of your network address combined with a secret and the current date — that value cannot be turned back into an address, cannot be linked to yesterday, and is deleted within days. The address itself is never stored.',
            },
            {
              term: 'Your scan history, only if you have an account',
              detail:
                'What you photographed, what was suggested and what you confirmed. You can delete any of it, it is in your data export, and it is erased with your account. Signed out, no history is kept anywhere.',
            },
          ]}
        />
        <p className="text-sm text-violet-300">
          An identification is a suggestion from an image. It is never a statement that a plant
          is safe to eat, drink or apply.
        </p>
      </LegalSection>

      <LegalSection id="orders" heading="If you buy a deck">
        <p>
          Checkout happens on Stripe&rsquo;s own pages, not on this site. Your card number never
          reaches Plantdex — there is no payment form here, no Stripe script on these pages and
          no key that could collect one. What we receive from Stripe afterwards is what is
          needed to pack and post an order.
        </p>
        <p>
          An order is <strong className="text-violet-100">not connected to a Plantdex
          account</strong>. Buying a deck does not create one, does not unlock anything, and
          leaves no trace in your collection — Stripe holds the order, this site holds the
          collection, and nothing joins the two. That is also why deleting your account has no
          effect on an order, and why a refund has no effect on your collection.
        </p>
        <p className="text-sm text-violet-300">
          Stripe&rsquo;s own privacy terms cover what they do with payment data, which is
          outside what this repository can describe.
        </p>
      </LegalSection>

      <LegalSection id="access" heading="Who can see your data">
        <p>
          Every table is protected by database rules that allow a signed-in person to read and
          write only their own rows, checked by the database itself on every query rather than
          by the app asking politely. Photographs are scoped the same way, to a folder named
          after your account.
        </p>
        <p>
          There is deliberately <strong className="text-violet-100">no update permission</strong>{' '}
          anywhere: rows can be created and deleted, never edited. It means a record of when you
          found something cannot be quietly rewritten afterwards — including by us.
        </p>
      </LegalSection>

      <LegalSection id="your-choices" heading="Your choices">
        <LegalTable
          rows={[
            {
              term: 'Use it without an account',
              detail:
                'The whole collection, garden, journal and research system works signed out, with nothing sent anywhere.',
            },
            {
              term: 'Delete a sighting',
              detail:
                'Any sighting can be deleted from the journal, signed in or out. Deleting one never removes progress it previously earned.',
            },
            {
              term: 'Delete your account',
              detail: (
                <>
                  On your profile page, under &ldquo;Your data&rdquo;. It removes every row
                  described above, <strong className="text-violet-100">every photograph you
                  have uploaded</strong>, and the account and email address themselves. It is
                  immediate and permanent: we keep no copy and cannot restore any of it, so you
                  are asked to type the word DELETE first.
                </>
              ),
            },
            {
              term: 'Download your data',
              detail:
                'On the same page. It produces a single JSON file containing your collection, research, achievements, every sighting and every photograph — signed out, it exports what this browser holds instead. If a very long journal of photographs exceeds what a browser can assemble into one file, the file lists by name which photographs were left out and why; nothing is dropped silently.',
            },
          ]}
        />
        <p className="text-sm text-violet-300">
          XP and level are not in the export, because they are not stored anywhere: they are
          recalculated from the records above every time they are shown.
        </p>
      </LegalSection>

      <LegalSection id="retention" heading="How long it is kept">
        <p>
          Your data stays until you delete it. Deleting your account removes it immediately —
          the rows and the photographs both, in that order, and the account itself last, so a
          failure part-way through can never leave photographs behind with no owner.
        </p>
        <p>
          Whether anything is retained in backups after that, and for how long, is{' '}
          <OwnerGap id="retention" />.
        </p>
      </LegalSection>

      <LegalSection id="children" heading="Children">
        <p>
          Plantdex is a plant identification deck, and children plausibly use it. The
          application does not ask for or verify age. The minimum age for holding an account is{' '}
          <OwnerGap id="minimum-age" />.
        </p>
      </LegalSection>

      <LegalSection id="changes" heading="Changes to this page">
        <p>
          The date at the top is the day this description was last checked against the
          application. When what Plantdex does with data changes, this page is updated in the
          same change &mdash; not afterwards.
        </p>
        <p className="text-sm text-violet-300">
          See also the <Link href="/terms" className="underline underline-offset-2 hover:text-gold-400">Terms of Use</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
