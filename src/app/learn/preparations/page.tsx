import type { Metadata } from 'next';
import Link from 'next/link';
import { GlossaryTermLink } from '@/components/learn/GlossaryTermLink';

export const metadata: Metadata = {
  title: 'Preparation guides',
  description:
    'General explanations of traditional herbal preparation methods — infusions, decoctions, infused oils, salves, and drying and storing plant material.',
};

/**
 * The preparation library.
 *
 * These describe METHODS, not recipes for particular species. A method appearing here is
 * not a statement that any plant in the deck is suitable for it — the product brief is
 * explicit that plant-specific preparation guidance may only appear where curated,
 * cited information supports it, and none exists yet.
 */

interface Guide {
  id: string;
  icon: string;
  title: string;
  summary: string;
  steps: string[];
  notes?: string[];
}

const GUIDES: Guide[] = [
  {
    id: 'infusion',
    icon: '🫖',
    title: 'Infusions',
    summary:
      'Steeping soft plant material — leaves, flowers, delicate aerial parts — in water that has just boiled.',
    steps: [
      'Bring water to the boil and take it off the heat.',
      'Pour it over the plant material in a vessel you can cover.',
      'Cover while it steeps. Aromatic compounds are volatile, and an uncovered cup loses much of what you were steeping for to the steam.',
      'Steep for the time the material calls for, then strain.',
    ],
    notes: [
      'Covering matters more than people expect: it is the difference between an aromatic infusion and hot water that smells like the room.',
    ],
  },
  {
    id: 'decoction',
    icon: '🔥',
    title: 'Decoctions',
    summary:
      'Simmering dense material — roots, bark, seeds — for long enough to draw out what a short steep would leave behind.',
    steps: [
      'Break the material up so more surface is exposed.',
      'Start it in cold water rather than dropping it into boiling water.',
      'Bring to a gentle simmer, covered, and hold it there — commonly twenty minutes or more for roots and bark.',
      'Strain while hot.',
    ],
    notes: [
      'Decoction is the standard approach for material an infusion cannot penetrate. The two are not interchangeable.',
    ],
  },
  {
    id: 'infused-oil',
    icon: '🫙',
    title: 'Infused oils',
    summary:
      'Steeping plant material in a carrier oil so oil-soluble constituents transfer into it.',
    steps: [
      'Use thoroughly dried material. Water left in the plant is the usual cause of spoilage.',
      'Cover it completely with oil in a clean jar — material above the oil line is where mould starts.',
      'Leave it to infuse, then strain the material out completely.',
      'Store somewhere cool and dark, and label it with the date.',
    ],
    notes: [
      'Discard any oil that smells rancid or off, or that shows growth of any kind. Infused oils are a common point of failure precisely because the spoilage is easy to miss.',
    ],
  },
  {
    id: 'salve',
    icon: '🧴',
    title: 'Salves',
    summary: 'An infused oil thickened with wax so it stays where it is put.',
    steps: [
      'Start from a finished, strained infused oil.',
      'Warm it gently with beeswax or a similar thickener until the wax melts.',
      'Test the set by cooling a little on a cold spoon, and adjust the wax before pouring.',
      'Pour into clean containers and let it set undisturbed.',
    ],
  },
  {
    id: 'drying',
    icon: '🌾',
    title: 'Drying plant material',
    summary: 'Removing moisture so material keeps rather than moulds.',
    steps: [
      'Dry out of direct sun, somewhere with moving air.',
      'Keep layers thin and turn them, so nothing stays damp underneath.',
      'Dry until material is properly brittle — leaves should crumble and stems snap rather than bend.',
      'Cool completely before storing. Warm material sweats inside a jar.',
    ],
    notes: [
      'Anything that still bends is not dry. Stored slightly damp, it will mould.',
    ],
  },
  {
    id: 'storing',
    icon: '🏺',
    title: 'Storing dried material',
    summary: 'Keeping dried material usable, and knowing when it is not.',
    steps: [
      'Store in airtight containers away from light and heat.',
      'Label with what it is and when it was dried — unlabelled jars become unusable within a season.',
      'Check occasionally for condensation, which means it was not dry enough.',
      'Discard anything musty, discoloured or showing any growth.',
    ],
  },
];

export default function PreparationsPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link href="/learn" className="text-xs font-semibold text-violet-300 hover:text-gold-400">
          ← Learn
        </Link>
      </nav>

      <h1 className="font-display text-3xl font-extrabold text-gold-plate">
        Preparation guides
      </h1>
      <p className="mt-1 text-sm text-violet-300">
        How these preparations are made, in general terms.
      </p>

      <aside className="panel mt-5 border-stat-temp/50 p-4">
        <h2 className="text-sm font-bold tracking-wide text-gold-400 uppercase">
          <span aria-hidden="true">⚠</span> These are methods, not recipes
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-violet-200">
          A method described here is <strong>not</strong> a statement that any plant in the
          deck is suitable for it. Suitability is species-specific and sometimes
          part-specific, and getting it wrong can cause real harm.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-violet-200">
          Never prepare a wild plant on the strength of an identification you are not certain
          of. Confirm with reliable botanical references and qualified local expertise, and
          check with a healthcare professional before using any plant medicinally —
          particularly if you are pregnant, nursing, taking medication, or preparing
          something for a child.
        </p>
      </aside>

      <div className="mt-8 space-y-5">
        {GUIDES.map((guide) => (
          <section key={guide.id} id={guide.id} aria-labelledby={`${guide.id}-heading`} className="panel p-5">
            <h2 id={`${guide.id}-heading`} className="font-display text-xl font-bold text-gold-300">
              <span aria-hidden="true">{guide.icon}</span> {guide.title}
              <GlossaryTermLink word={guide.title.replace(/s$/, '')} />
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-violet-200">{guide.summary}</p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-violet-200 marker:text-violet-400">
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {guide.notes?.map((note) => (
              <p key={note} className="mt-3 border-l-2 border-gold-500/50 pl-3 text-xs leading-relaxed text-violet-300">
                {note}
              </p>
            ))}
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-violet-400">
        Plant-specific preparation instructions are deliberately absent. They will only
        appear where curated, cited information supports them for that species — not
        inferred from the fact that a method exists.
      </p>
    </main>
  );
}
