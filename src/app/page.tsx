import Link from 'next/link';
import Image from 'next/image';
import { PRINTED_DECK_SIZE, getPrintedCard, printedCardsInDeckOrder } from '@/lib/deck';
import { SafetyNotice } from '@/components/SafetyNotice';
import { DeckCta } from '@/components/shop/DeckCta';
import { isShopConfigured } from '@/lib/shop';
import { PlantSprite } from '@/components/PlantSprite';
import { RarityAura } from '@/components/game/RarityAura';
import { assetPath } from '@/lib/asset-path';

/**
 * The four species whose creatures lead the landing page.
 *
 * They are also the four with authored growth stages, which is not a coincidence: these
 * are the characters the project is furthest along with, so they are the ones worth
 * putting first. Kept as a named list rather than "the first four in deck order" so that
 * adding a card can never silently change what the front page shows.
 */
const HERO_CREATURES = [
  'taraxacum-officinale',
  'trifolium-pratense',
  'achillea-millefolium',
  'viola-sororia',
] as const;

/**
 * Landing page.
 *
 * Deliberately NOT a storefront, even now that /shop exists. The front page introduces the
 * deck and routes into the Herbdex; selling happens on its own page, reached by one restrained
 * CTA below the explainer. AGENTS.md forbids placeholder text and fabricated shipping or
 * inventory claims, which is why nothing here quotes a price or a delivery time — /shop reads
 * both from configuration and says the deck is not on sale when they are unset.
 */
export default function HomePage() {
  // A few real cards as a preview strip.
  const showcase = printedCardsInDeckOrder().filter((herb) =>
    ['taraxacum-officinale', 'achillea-millefolium', 'urtica-dioica', 'quercus-spp'].includes(
      herb.id,
    ),
  );

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <section className="text-center">
        {/* Species count, not card count: the printed deck is 47 cards because it also
            carries an icon guide and a disclaimer. /shop states both; saying "45-card deck"
            here and "47 in all" there is the kind of small inconsistency a buyer notices. */}
        <p className="text-xs font-bold tracking-[0.25em] text-violet-300 uppercase">
          {PRINTED_DECK_SIZE} illustrated species
        </p>
        <h1 className="font-display mt-3 text-4xl leading-tight font-extrabold text-gold-plate sm:text-6xl">
          Plantdex
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-violet-200 sm:text-lg">
          Common wild medicinal plants around you, as a collectible deck.
        </p>

        {/*
          The creatures, at full size and full growth.

          These are the deck's own characters and they are the most distinctive thing the
          project has, so they lead — a row of them animating is what a visitor should meet
          first. Deliberately the FLOWERING stage of each: the front page is the invitation,
          and a seedling would be advertising the least of what is here.

          Four species with four different colours — gold, rose, cream, violet — chosen so
          the row reads as a set rather than as four of the same plant.

          ONE ROW AT EVERY WIDTH, never wrapping. Wrapping was the first attempt and on a
          390px phone it stacked them one per line: a full screen of creatures that pushed
          the call to action below the fold and left the last one behind the bottom nav.
          Each sits in an equal flex column and scales to it, which `PlantSprite`'s `fit`
          now supports while still animating.
        */}
        <ul
          aria-label="Plant characters from the deck"
          className="mx-auto mt-8 flex w-full max-w-2xl items-end justify-center gap-2 sm:gap-4"
        >
          {HERO_CREATURES.map((herbId) => {
            const herb = getPrintedCard(herbId);
            if (!herb) return null;
            return (
              <li key={herbId} className="min-w-0 flex-1">
                <Link
                  href={`/herbdex/${herb.id}`}
                  className="flex flex-col items-center rounded-2xl px-1 py-1 transition-transform hover:-translate-y-1 motion-reduce:hover:translate-y-0"
                >
                  <PlantSprite
                    herbId={herb.id}
                    alt={`Pixel-art character for ${herb.commonName}`}
                    fit
                    className="w-full drop-shadow-[0_6px_16px_rgba(23,16,28,0.6)]"
                  />
                  <span className="mt-1 truncate text-center text-[0.72rem] font-semibold text-violet-300 sm:text-xs">
                    {herb.commonName}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/*
          TWO WAYS IN, BECAUSE THERE ARE TWO PEOPLE HERE.

          "Explore the Herbdex" is for somebody at a table with the deck. "Identify a plant"
          is for somebody standing in front of something they cannot name, which is the whole
          reason this is a field guide and not a website. That second person had no route in
          from the front page at all, and the one entry point that existed sat near the bottom
          of the Herbdex — measured at y=563 on a 390x720 phone with the nav floor at 662, so
          barely a strip of it cleared the bar.

          The Herbdex keeps the primary gradient: the collection is still what this is. Scan
          is an outlined peer rather than a third-tier link.
        */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/herbdex"
            className="flex min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-gradient-to-r from-gold-500 to-pink-accent px-8 text-base font-bold text-violet-deep shadow-card transition-transform hover:scale-[1.03] motion-reduce:hover:scale-100 sm:w-auto"
          >
            Explore the Herbdex
          </Link>
          <Link
            href="/scan"
            className="flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full border border-gold-500/70 bg-plum-800/60 px-8 text-base font-bold text-gold-300 transition-colors hover:bg-plum-700 sm:w-auto"
          >
            Identify a plant
          </Link>
        </div>
        {/*
          THE SALE STATE IS DERIVED, NOT TYPED.

          This line used to be an unconditional sentence reading "the physical deck is not on
          sale yet", while `/shop` has always resolved the same fact from configuration. So the
          day the owner sets the Payment Link and the price, the deck goes on sale, `/shop`
          renders an Order panel — and the LANDING PAGE goes on telling every visitor it is not
          for sale. The first page a buyer from a vendor table sees, contradicting the checkout.

          This repository has been bitten by exactly this shape twice already: `/terms` claiming
          "there is no shop, no checkout and no payment processing anywhere in the application"
          after `/shop` shipped, and `/privacy` denying analytics after Plausible was wired in.
          `legal.test.ts` guards both. A hard-coded denial of something configuration can turn on
          is a lie with a timer on it, so this one reads the configuration too.
        */}
        <p className="mt-3 text-xs text-violet-400">
          {isShopConfigured()
            ? 'A physical deck of real cards, printed front and back.'
            : 'The physical deck is not on sale yet — the store opens once printing is confirmed.'}
        </p>
      </section>

      <section aria-labelledby="cards-heading" className="mt-14">
        <h2
          id="cards-heading"
          className="text-center text-xs font-bold tracking-[0.2em] text-violet-300 uppercase"
        >
          Cards from the deck
        </h2>
        {/* One quiet line, well below the hero. The primary action on this page is still
            getting the deck; this only says the world could get bigger. */}
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-violet-400">
          The first Plantdex collection begins with {PRINTED_DECK_SIZE} plants — with room for the
          world to grow.
        </p>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {showcase.map((herb) => (
            <li key={herb.id} className="relative">
              <RarityAura rarity={herb.rarity} />
              <Link
                href={`/herbdex/${herb.id}`}
                className="relative z-10 block overflow-hidden rounded-[var(--radius-card)] shadow-card transition-transform hover:-translate-y-1 motion-reduce:hover:translate-y-0"
              >
                <Image
                  src={assetPath(herb.thumb)}
                  alt={`Plantdex card ${herb.cardNumber}: ${herb.commonName} (${herb.scientificName})`}
                  width={178}
                  height={288}
                  className="w-full"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/*
        HOW TO USE THE SITE — which is not the same thing this section used to say.

        It read "Learn the card / Find it outside / Log the find", and every word of that
        assumed a deck already in your hands. The deck is not on sale yet, so step one was
        something almost nobody arriving here could do, and the scanner — the one thing any
        visitor can use immediately, and now the second item in the nav — went unmentioned
        on the page that is supposed to explain the product.

        So it describes the loop a stranger can actually start: photograph something, see
        what Plantdex makes of it, keep the result. The deck is still the destination (the
        showcase sits above and the CTA below); it is no longer the PREREQUISITE.

        AND IT IS NOT THREE PANELS ANY MORE. It was three identical bordered boxes, which is
        the same thing the mastery track was criticised for — it says "here are three boxes"
        rather than "here is a route". The numbered nodes survive because this genuinely is a
        sequence, which is the only thing that earns numbering; the boxes do not.

        STEP 2 IS WORDED THE WAY IT IS ON PURPOSE. "It suggests a species. You decide whether
        it looks right" is the honest description of a photographic identifier, and putting
        that in the hook rather than only in a notice is what keeps the invitation and the
        caution from contradicting each other.
      */}
      <section aria-labelledby="how-heading" className="mt-14">
        <h2
          id="how-heading"
          className="font-display text-center text-2xl font-bold text-gold-plate"
        >
          Point your phone at a weed
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm text-violet-300">
          That is the whole game.
        </p>
        <ol className="mx-auto mt-7 grid max-w-3xl gap-7 sm:grid-cols-3 sm:gap-5">
          {[
            {
              step: '1',
              title: 'Snap it',
              body: 'A leaf, a flower, or the whole plant. Anything growing.',
            },
            {
              step: '2',
              title: 'Plantdex has a go',
              body: 'It suggests a species. You decide whether it looks right.',
            },
            {
              step: '3',
              title: 'Keep it either way',
              body: `${PRINTED_DECK_SIZE} species have a card. Everything else becomes a seed packet.`,
            },
          ].map((item) => (
            <li key={item.step} className="text-center sm:text-left">
              <span className="font-display inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-sm font-bold text-violet-deep">
                {item.step}
              </span>
              <h3 className="mt-3 font-bold text-violet-100">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-violet-300">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-14">
        <DeckCta placement="home" />
      </div>

      <div className="mt-14">
        <SafetyNotice variant="brief" />
      </div>
    </main>
  );
}
