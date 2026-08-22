import Link from 'next/link';
import Image from 'next/image';
import { DECK_SIZE, herbsInDeckOrder } from '@/lib/deck';
import { SafetyNotice } from '@/components/SafetyNotice';
import { assetPath } from '@/lib/asset-path';

/**
 * Landing page.
 *
 * Deliberately NOT the full Phase 1 storefront yet. Real pricing, product photography,
 * shipping terms and a return policy do not exist for this project yet, and AGENTS.md is
 * explicit that the site must contain no placeholder text and no fabricated shipping or
 * inventory claims. So this page introduces the deck honestly and routes to the Herbdex;
 * the commerce build lands in V0.4 once the owner supplies those details.
 */
export default function HomePage() {
  // A few real cards as a preview strip.
  const showcase = herbsInDeckOrder().filter((herb) =>
    ['taraxacum-officinale', 'achillea-millefolium', 'urtica-dioica', 'quercus-spp'].includes(
      herb.id,
    ),
  );

  return (
    <main id="main" className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <section className="text-center">
        <p className="text-xs font-bold tracking-[0.25em] text-violet-300 uppercase">
          A {DECK_SIZE}-card illustrated deck
        </p>
        <h1 className="font-display mt-3 text-4xl leading-tight font-extrabold text-gold-plate sm:text-6xl">
          Plantdex
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-violet-200 sm:text-lg">
          The common wild plants growing around you, as a collectible deck. Learn what they
          are, go find them, and build your Herbdex as you go.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/herbdex"
            className="flex min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-gradient-to-r from-gold-500 to-pink-accent px-8 text-base font-bold text-violet-deep shadow-card transition-transform hover:scale-[1.03] motion-reduce:hover:scale-100 sm:w-auto"
          >
            Explore the Herbdex
          </Link>
        </div>
        <p className="mt-3 text-xs text-violet-400">
          The physical deck is not on sale yet — the store opens once printing is confirmed.
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
          The first Plantdex collection begins with {DECK_SIZE} plants — with room for the
          world to grow.
        </p>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {showcase.map((herb) => (
            <li key={herb.id}>
              <Link
                href={`/herbdex/${herb.id}`}
                className="block overflow-hidden rounded-[var(--radius-card)] shadow-card transition-transform hover:-translate-y-1 motion-reduce:hover:translate-y-0"
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

      <section aria-labelledby="how-heading" className="mt-14">
        <h2
          id="how-heading"
          className="font-display text-center text-2xl font-bold text-gold-plate"
        >
          How it works
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Learn the card',
              body: `Each of the ${DECK_SIZE} cards covers one common wild plant, with its botanical name, growing conditions and the season it is easiest to spot.`,
            },
            {
              step: '2',
              title: 'Find it outside',
              body: 'Take the deck into a garden, a park or a hedgerow and match what you see against the card.',
            },
            {
              step: '3',
              title: 'Log the find',
              body: 'Mark it found in your Herbdex to reveal the card, earn XP and work through the collection.',
            },
          ].map((item) => (
            <li key={item.step} className="panel p-5">
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
        <SafetyNotice variant="brief" />
      </div>
    </main>
  );
}
