import type { Metadata } from 'next';
import Image from 'next/image';
import { SafetyNotice } from '@/components/SafetyNotice';
import { TrackView } from '@/components/analytics/TrackView';
import { EntryPaths } from '@/components/start/EntryPaths';
import { SeedPacket } from '@/components/seedshelf/SeedPacket';
import { CURRENT_COLLECTION } from '@/lib/collection';
import { PRINTED_DECK_SIZE, getPrintedCard } from '@/lib/deck';
import { packetRecipe } from '@/lib/seed-packet';
import { assetPath } from '@/lib/asset-path';

export const metadata: Metadata = {
  title: 'Start here',
  description:
    'You have the cards. Now find them growing. Confirm what you find to unlock your digital collection.',
};

/**
 * `/start` — the address on the box.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHO IS HERE. Somebody at a vendor table, or opening a deck at their kitchen table, who has
 * just pointed a camera at a QR code. Thirty seconds of patience, no idea what this is, and —
 * crucially — THE CARDS ALREADY IN THEIR HAND. They do not need selling to and they do not
 * need the systems explained. They need to be told what to do next.
 *
 * So the page answers one question — what is this for — and gets out of the way. Not a landing
 * page: no feature grid, no carousel, no second scroll of persuasion, and no `DeckCta`, which
 * would be a fifth CTA placement aimed at somebody who has already bought.
 *
 * NO ACCOUNT WALL. Every path works signed out. An account earns its keep later, when there is
 * progress worth carrying between devices.
 *
 * WHAT THIS PAGE CANNOT DO. Arriving here grants nothing — not ownership, not a sighting, not
 * XP, not a card. A printed QR is a public string readable off a photograph of the box, so it
 * establishes that somebody saw a code and nothing more. `entry-point.ts` sets out the five
 * trust levels this keeps apart, and the page is a server component of links so that "grants
 * nothing" is structural: no store, no reducer, no progression module in these imports.
 * `entry-point.test.ts` reads this file and fails if one appears.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** A real card, for the left half of the bridge. Its artwork IS the physical object. */
const BRIDGE_CARD_ID = 'taraxacum-officinale';

/**
 * A real packet, for the right half.
 *
 * `packetRecipe` is the same pure generator the shelf and the mint use, seeded from a species
 * the deck genuinely has no card for — so this is not a mock-up of a packet, it is the packet
 * that species would actually get. It is drawn unnamed: the point here is the OBJECT, and
 * naming a species would read as a claim about that species on a page that is not about it.
 */
const BRIDGE_PACKET = packetRecipe({
  speciesKey: 'bellis perennis',
  scientificName: 'Bellis perennis',
});

export default function StartPage() {
  const card = getPrintedCard(BRIDGE_CARD_ID);

  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-10">
      <TrackView event="start_opened" />

      <p className="text-xs font-bold tracking-[0.25em] text-violet-300 uppercase">
        {CURRENT_COLLECTION.name}
      </p>

      {/*
        THE PROPOSITION, IN FOUR WORDS AND FOUR MORE.

        Second person, present tense, because it describes what the reader is doing right now:
        holding the cards. The turn is the second line — the deck is not the whole of it.

        "Now find them growing" over "now take it outside": both were set in this layout and
        read at 390px. "Take it outside" is an instruction about the OBJECT and lands closer to
        "go for a walk"; "find them growing" names the thing you are looking for and carries the
        collectible promise — *them* are the species on the cards, and *growing* is where they
        are. It also rhymes with the loop the rest of the page describes, so the headline and
        the outcomes below are saying one thing rather than two.
      */}
      <h1 className="font-display mt-3 text-[2rem] leading-[1.1] font-extrabold text-gold-plate sm:text-4xl">
        You have the cards.
        <br />
        Now find them growing.
      </h1>
      <div aria-hidden="true" className="pixel-rule mt-4 w-28" />

      {/*
        ONE SENTENCE, AND TWO CORRECTIONS IN IT.

        It used to say "every one of the 45 species is a plant you can go and find", which is
        not true: what grows near somebody depends entirely on where they are, and a deck sold
        anywhere will reach people for whom several of these are simply absent. Promising a
        find the world may not supply is the same class of claim as an invented delivery date.

        And it used to say "when you find one, the card becomes yours" — to a reader who is
        holding that card. The card is already theirs. What a find unlocks is the DIGITAL
        entry, and those two things are now named separately in the same sentence, because
        conflating them is what would make the rest of the product confusing later.

        TWO MORE, BOTH ABOUT NOT OVERSTATING WHAT THE SCANNER DOES.

        "SCAN ONE AND ITS ENTRY UNLOCKS" made the scanner sound like the thing that decides.
        It is not, and the entire scan screen is built on it not being: the identifier
        proposes, the player taps to confirm, and `discover()` runs on that tap and nowhere
        else. A suggestion from a photograph is not a discovery — that separation is what
        keeps the collection meaning "plants I actually identified" rather than "things a
        model guessed at" — so the copy now says CONFIRM A MATCH, which is what really
        unlocks an entry.

        "ANYTHING YOU FIND OUTSIDE THESE 45 IS KEPT" promised more than the shelf does.
        A photograph that resolves to nothing, or to a bare genus, or to something above
        species rank, is not shelved and cannot be: `isShelfEligible` requires a valid
        species-level name the deck has no confirmable card for. "Recognised species" is the
        honest subset, and it is a smaller promise that the product actually keeps.
      */}
      <p className="mt-4 text-base leading-relaxed text-violet-200">
        Find the plants from your cards growing near you. Confirm a match and its Plantdex entry
        unlocks &mdash; and recognised species outside these {PRINTED_DECK_SIZE} are kept on
        your Seed Shelf.
      </p>

      {/* ONE dominant action, two quiet links. See `EntryPaths` for why. */}
      <div className="mt-8">
        <EntryPaths />
      </div>

      {/*
        THE BRIDGE AND THE OUTCOMES ARE THE SAME THING.

        A separate "how it works" diagram plus a separate "what happens" panel would be two
        blocks explaining one idea, and the second would be read as a repeat of the first. So
        the two outcomes ARE the picture: a real card and a real packet, side by side, each
        with the one line that says what it means. Read down the page it is already a sequence —
        the SCAN key above is the middle step, and these are the two things it can produce.

        UNBOXED, deliberately. The old version wrapped this in a `panel`, which made five
        bordered containers on a page carrying one idea. The heading and the artwork carry the
        structure; a border round them would only be saying "this is a section", which the
        heading already says.
      */}
      <section aria-labelledby="what-happens" className="mt-10">
        <h2
          id="what-happens"
          className="text-xs font-bold tracking-[0.18em] text-gold-400 uppercase"
        >
          What happens when you find something
        </h2>
        <div aria-hidden="true" className="pixel-rule mt-2 w-16" />

        <ul className="mt-4 grid grid-cols-2 gap-4">
          {/*
            BOTH COLUMNS SHARE ONE ART ROW OF FIXED HEIGHT, and the objects stand on its floor.

            The first version let the taller column set the row and asked the packet's own span
            to grow into it with `flex-1`. It did not, and the result was two captions at
            different heights either side of a gap — which reads as a rendering fault rather
            than as two objects on a shelf. A fixed row with `items-end` is the same trick the
            Seed Shelf's planks use, and it makes the alignment a property of the container
            instead of something inferred from whichever child happened to be tallest.

            The packet is deliberately SMALLER than the card. It is the smaller object in the
            world, and matching their sizes would make a seed packet read as an alternative
            card — the one thing it must never be mistaken for.
          */}
          <li className="flex flex-col items-center text-center">
            <span className="flex h-40 w-full items-end justify-center">
              <span className="w-full max-w-[5.75rem] overflow-hidden rounded-[var(--radius-card)] shadow-card">
                {card && (
                  <Image
                    src={assetPath(card.thumb)}
                    alt={`A Plantdex card: ${card.commonName}`}
                    width={178}
                    height={288}
                    className="w-full"
                  />
                )}
              </span>
            </span>
            <span className="mt-3 text-sm font-bold text-violet-100">
              One of the {PRINTED_DECK_SIZE}
            </span>
            <span className="mt-0.5 text-xs leading-relaxed text-violet-300">
              Confirm the match and its Plantdex entry unlocks.
            </span>
          </li>

          <li className="flex flex-col items-center text-center">
            <span className="flex h-40 w-full items-end justify-center">
              <span className="w-full max-w-[4.5rem]">
                <SeedPacket
                  recipe={BRIDGE_PACKET}
                  alt="A Plantdex seed packet"
                  className="drop-shadow-[0_4px_8px_rgba(23,16,28,0.5)]"
                />
              </span>
            </span>
            <span className="mt-3 text-sm font-bold text-violet-100">Something else</span>
            <span className="mt-0.5 text-xs leading-relaxed text-violet-300">
              If we recognise it, its seed packet waits on your Seed Shelf until a collection
              catches up.
            </span>
          </li>
        </ul>
      </section>

      {/*
        `standard`, not `brief`. This page sends people to a camera and tells them to identify
        living plants, which is precisely the risk the standard weight carries — CLAUDE.md is
        explicit that choosing `brief` here would be a safety regression rather than a design
        tweak. The context names THIS page's risk rather than repeating the general disclaimer,
        which lives in one place at /safety and is linked from every notice.

        It sits last and it is the only bordered block left on the page, which is the right way
        round: visible without the onboarding page reading as a legal notice with links on top.
      */}
      <div className="mt-10">
        <SafetyNotice
          variant="standard"
          context="Plantdex helps you look, not decide. A suggestion from a photograph is not proof of what a plant is, and never proof that it is safe to touch, pick or eat."
        />
      </div>
    </main>
  );
}
