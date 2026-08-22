import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Learn',
  description:
    'Background reading for the Plantdex deck — a glossary of herbal terminology and general guides to traditional preparation methods.',
};

const SECTIONS = [
  {
    href: '/learn/glossary',
    icon: '📖',
    title: 'Glossary',
    body: 'What the words mean. Infusion, decoction, tincture, poultice, mucilage, menstruum and the rest — including every term that turns up on the cards.',
  },
  {
    href: '/learn/preparations',
    icon: '🫖',
    title: 'Preparation guides',
    body: 'How traditional preparations are made, in general terms: teas and infusions, decoctions, infused oils and salves, and drying and storing plant material.',
  },
];

export default function LearnPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-gold-plate">Learn</h1>
      <p className="mt-1 text-sm text-violet-300">
        Background for the deck — terminology and traditional methods.
      </p>

      <ul className="mt-6 space-y-3">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link href={section.href} className="panel block p-5 transition-colors hover:bg-violet-800/50">
              <h2 className="font-display text-xl font-bold text-gold-300">
                <span aria-hidden="true">{section.icon}</span> {section.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-violet-200">{section.body}</p>
            </Link>
          </li>
        ))}
      </ul>

      <aside className="panel mt-8 p-4">
        <h2 className="text-xs font-bold tracking-wide text-gold-400 uppercase">
          <span aria-hidden="true">⚠</span> Read this first
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-violet-200">
          These guides describe methods in general — how a decoction is made, not what to
          make one from. They are not instructions to use any particular plant, and a method
          being described here does not mean it is appropriate for a given species. Several
          plants in this deck have dangerous look-alikes.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-violet-200">
          Confirm any identification with reliable references and qualified local expertise
          before preparing a wild plant at all, and speak to a healthcare professional before
          using any plant medicinally.
        </p>
      </aside>
    </main>
  );
}
