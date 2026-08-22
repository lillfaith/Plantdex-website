import type { Metadata } from 'next';
import Link from 'next/link';
import { DISCLAIMER, HERBS } from '@/lib/deck';

export const metadata: Metadata = {
  title: 'Herbal safety',
  description:
    'The full safety information for Plantdex — the deck’s own disclaimer, how to treat identification, and where the plant information on this site comes from.',
};

/**
 * The full safety page.
 *
 * This exists so the short "Herbal Safety" notice elsewhere can be short. The brief asks
 * for LESS VISUAL DOMINANCE, NOT LESS SAFETY — so every word the deck prints is here in
 * full, and the notices that link here still carry the substance rather than reducing to
 * a bare link.
 *
 * Everything on this page is either (a) the deck's own disclaimer, verbatim, or (b)
 * general practice about how to treat wild plants — never a claim about a particular
 * species, which the cards do not support and this project does not invent.
 */

const CARDS_WITH_WARNINGS = HERBS.filter((herb) => herb.warning);

/** General practice, deliberately species-agnostic. */
const PRACTICE = [
  {
    title: 'Identification comes before everything else',
    body: 'A card, an app, or a photograph is not an identification. Confirm any wild plant against reliable regional references and, where you can, qualified local expertise. If you are not certain, you have not identified it — and “fairly sure” is not certain.',
  },
  {
    title: 'Look-alikes are the real risk',
    body: 'Several common plants have look-alikes that range from unpleasant to deadly, and the resemblance is often closest at exactly the growth stage people go looking. Where a card in this deck prints a warning about a look-alike, that warning is shown on the plant’s page before anything else.',
  },
  {
    title: 'Finding is not the same as using',
    body: 'This site is built around recording plants you have found. Logging a discovery is a note that you saw something; it is not a confirmation that you identified it correctly, and it never makes a plant safe to eat, drink, or apply to skin.',
  },
  {
    title: 'Traditional use is history, not evidence',
    body: 'The cards describe how plants have been used traditionally and historically. That a practice is old does not mean it works, and does not mean it is safe. Where a plant has been studied, that research is a separate matter and is cited separately.',
  },
  {
    title: 'Some people need to be more careful than others',
    body: 'Plants interact with medications and with existing conditions. The deck’s own disclaimer singles out pregnancy, nursing, taking medication, and having a medical condition — speak to a healthcare professional first in any of those cases.',
  },
  {
    title: 'Allergies do not announce themselves',
    body: 'A plant that is fine for most people can still cause a reaction in you, including on skin contact alone. Reactions can also appear on a later exposure after an uneventful first one.',
  },
  {
    title: 'Where you pick matters as much as what',
    body: 'Roadsides, treated lawns, industrial edges and waterways downstream of them can leave residues on a plant that identification tells you nothing about. Foraging on land also carries rules that vary by country, state and site — check them, and leave enough that the patch is still there next year.',
  },
];

export default function SafetyPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link href="/" className="text-xs font-semibold text-violet-300 hover:text-gold-400">
          ← Plantdex
        </Link>
      </nav>

      <h1 className="font-display text-3xl font-extrabold text-gold-plate">
        <span aria-hidden="true">⚠</span> Herbal safety
      </h1>
      <p className="mt-1 text-sm text-violet-300">
        The full version of the notice you see around the site.
      </p>

      {/* The deck's own words, first and unedited. */}
      <section
        aria-labelledby="deck-disclaimer"
        className="panel mt-6 border-gold-500/40 bg-gold-500/[0.06] p-5"
      >
        <h2
          id="deck-disclaimer"
          className="text-sm font-bold tracking-wide text-gold-400 uppercase"
        >
          The deck’s disclaimer
        </h2>
        <p className="mt-1 text-xs text-violet-400">
          Printed on card #47, reproduced here word for word.
        </p>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-violet-100">
          <p>{DISCLAIMER.main}</p>
          <p>{DISCLAIMER.availability}</p>
        </div>
      </section>

      <section aria-labelledby="practice-heading" className="mt-8">
        <h2 id="practice-heading" className="font-display text-xl font-bold text-gold-plate">
          How to treat a wild plant
        </h2>
        <p className="mt-1 text-sm text-violet-300">
          General practice, not advice about any particular species.
        </p>
        <div className="mt-4 space-y-3">
          {PRACTICE.map((item) => (
            <article key={item.title} className="panel p-5">
              <h3 className="text-sm font-bold text-gold-300">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-violet-200">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {CARDS_WITH_WARNINGS.length > 0 && (
        <section aria-labelledby="warnings-heading" className="mt-8">
          <h2 id="warnings-heading" className="font-display text-xl font-bold text-gold-plate">
            Warnings printed in this deck
          </h2>
          <p className="mt-1 text-sm text-violet-300">
            {CARDS_WITH_WARNINGS.length === 1
              ? 'One card in the deck carries a printed warning.'
              : `${CARDS_WITH_WARNINGS.length} cards in the deck carry a printed warning.`}{' '}
            Each is shown on that plant’s page above anything else, and is never hidden
            behind a tap — including while the card is still undiscovered.
          </p>
          <ul className="mt-4 space-y-2">
            {CARDS_WITH_WARNINGS.map((herb) => (
              <li key={herb.id}>
                <Link
                  href={`/herbdex/${herb.id}`}
                  className="panel flex items-start gap-3 p-4 transition-colors hover:bg-violet-800/50"
                >
                  <span aria-hidden="true" className="shrink-0 text-stat-temp">
                    ⚠
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-violet-100">
                      {herb.commonName}{' '}
                      <span className="font-normal text-violet-400 tabular-nums">
                        · Card #{String(herb.cardNumber).padStart(2, '0')}
                      </span>
                    </span>
                    <span className="block text-sm text-violet-200">{herb.warning}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Where the information comes from — part of Update 3's citation work, and the
          honest answer to "how do you know this?" for a product about plants. */}
      <section aria-labelledby="sources-heading" className="mt-8">
        <h2 id="sources-heading" className="font-display text-xl font-bold text-gold-plate">
          Where the plant information comes from
        </h2>
        <div className="panel mt-4 space-y-3 p-5 text-sm leading-relaxed text-violet-200">
          <p>
            Every plant field on this site — traits, compounds, taste, preparations, usable
            parts, season, encounter rate — is transcribed directly from the physical card,
            including the card’s own wording. Nothing has been added, expanded or
            paraphrased from elsewhere.
          </p>
          <p>
            Where a card contains an error, it is transcribed as printed and recorded
            separately rather than quietly corrected, so the site and the deck in your hands
            never disagree.
          </p>
          <p>
            A citation only appears on this site once a person has opened the source and
            confirmed it supports what it is attached to. Unverified references are held
            outside the site entirely rather than shown with a caveat — a half-shown citation
            still borrows the credibility of a real one.
          </p>
          <p className="text-violet-300">
            This is why most sections currently cite only the deck: independent references
            for them have not been checked yet. They will appear here as that work is done,
            not before.
          </p>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-violet-400">
        Plantdex is an educational product. It does not diagnose, treat, or prescribe, and
        nothing on this site is a substitute for professional medical advice.
      </p>
    </main>
  );
}
