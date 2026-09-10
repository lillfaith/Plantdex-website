import type { Metadata } from 'next';
import { SafetyNotice } from '@/components/SafetyNotice';
import { TrackView } from '@/components/analytics/TrackView';
import { EntryPaths } from '@/components/start/EntryPaths';
import { CURRENT_COLLECTION } from '@/lib/collection';
import { PRINTED_DECK_SIZE } from '@/lib/deck';

export const metadata: Metadata = {
  title: 'Start here',
  description:
    'You have the cards. Now find them growing. Scan a plant, explore the collection, or see how Plantdex works.',
};

/**
 * `/start` — the address printed on the box.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHO IS HERE. Somebody standing at a vendor table, or opening a deck at their kitchen
 * table, who has just pointed a camera at a QR code. They have thirty seconds of patience and
 * no idea what this is. They may never have heard of Plantdex before today.
 *
 * So the page answers one question — what is this for — and then gets out of the way. It is
 * deliberately NOT a landing page: no feature grid, no carousel, no testimonials, no second
 * scroll of persuasion. The person is already holding the product. Selling to them again
 * would be the wrong instinct, and there is no `DeckCta` here for exactly that reason (the
 * four CTA placements are a fixed, tested set, and this would be a fifth aimed at somebody
 * who has already bought).
 *
 * NO ACCOUNT WALL. Every path below works signed out. An account earns its keep later, when
 * there is progress worth carrying between devices — asking for one before a stranger has
 * seen a single plant is asking them to pay for something they have not been shown.
 *
 * WHAT THIS PAGE CANNOT DO. Arriving here grants nothing: not ownership, not a sighting, not
 * XP, not a card. A printed QR is a public string — it can be read off a photograph of the
 * box — so it establishes that somebody saw a code and nothing more. `entry-point.ts` sets
 * out the five trust levels this keeps apart, and the page is a server component of links so
 * that "grants nothing" is structural rather than promised: there is no store, no reducer and
 * no progression module in this file's imports, so no code path from here can write anything.
 * `entry-point.test.ts` reads this file and fails if one appears.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function StartPage() {
  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-10">
      <TrackView event="start_opened" />

      <p className="text-xs font-bold tracking-[0.25em] text-violet-300 uppercase">
        {CURRENT_COLLECTION.name}
      </p>

      {/*
        THE PROPOSITION, IN ONE LINE.
        Second person and present tense, because it is describing something the reader is
        currently doing: they are holding the cards. The turn is in the second sentence — the
        deck is not the whole of it, the plants are outside.
      */}
      <h1 className="font-display mt-3 text-3xl leading-tight font-extrabold text-gold-plate sm:text-4xl">
        You have the cards.
        <br />
        Now find them growing.
      </h1>
      <div aria-hidden="true" className="pixel-rule mt-4 w-28" />

      <p className="mt-4 text-base leading-relaxed text-violet-200">
        Plantdex turns the deck in your hands into a field guide. Every one of the{' '}
        {PRINTED_DECK_SIZE} species is a plant you can go and find — and when you find one, the
        card becomes yours.
      </p>

      <div className="mt-8">
        <EntryPaths />
      </div>

      {/*
        THE OTHER HALF OF THE LOOP, SAID ONCE.

        A first-time scanner will very often photograph something the deck has no card for —
        45 species out of a world of them, so that is the ORDINARY outcome, not the sad one.
        Meeting it unwarned reads as failure, and this is the sentence that stops it doing so.

        It is here rather than only on the result screen because somebody deciding whether to
        bother scanning at all is deciding it right now, on this page.
      */}
      <section aria-labelledby="what-happens" className="panel mt-8 p-5">
        <h2 id="what-happens" className="text-sm font-bold tracking-wide text-gold-400 uppercase">
          What happens to what you find
        </h2>
        <div aria-hidden="true" className="pixel-rule mt-2 w-16" />
        <dl className="mt-3 space-y-3 text-sm leading-relaxed">
          <div>
            <dt className="font-bold text-violet-100">If it is one of the {PRINTED_DECK_SIZE}</dt>
            <dd className="mt-0.5 text-violet-300">
              You unlock its card and it joins your collection.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-violet-100">If it is not</dt>
            <dd className="mt-0.5 text-violet-300">
              It becomes a seed packet on your Seed Shelf and waits there. Nothing you find is
              thrown away for being outside this collection.
            </dd>
          </div>
        </dl>
      </section>

      {/*
        `standard`, not `brief`. This page sends people to a camera and tells them to identify
        living plants, which is precisely the risk the standard weight exists to carry — and
        CLAUDE.md is explicit that choosing `brief` on such a page is a safety regression
        rather than a design tweak. The context names THIS page's risk instead of repeating
        the general disclaimer, which lives in one place at /safety.
      */}
      <div className="mt-10">
        <SafetyNotice
          variant="standard"
          context="Plantdex helps you look, not decide. Nothing here confirms a plant is safe to touch, pick or eat."
        />
      </div>
    </main>
  );
}
