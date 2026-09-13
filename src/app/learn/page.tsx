import type { Metadata } from 'next';
import Link from 'next/link';
import { PlantdexIcon, type IconName } from '@/components/icons/PlantdexIcon';
import { SafetyNotice } from '@/components/SafetyNotice';

export const metadata: Metadata = {
  title: 'Learn',
  description:
    'Background reading for the Plantdex deck — a glossary of herbal terminology and general guides to traditional preparation methods.',
};

const SECTIONS: { href: string; icon: IconName; title: string; body: string }[] = [
  {
    href: '/learn/glossary',
    icon: 'learn',
    title: 'Glossary',
    body: 'What the words mean. Infusion, decoction, tincture, poultice, mucilage, menstruum and the rest — including every term that turns up on the cards.',
  },
  {
    href: '/learn/preparations',
    icon: 'infusion',
    title: 'Preparation guides',
    body: 'How traditional preparations are made, in general terms: teas and infusions, decoctions, infused oils and salves, and drying and storing plant material.',
  },
  {
    href: '/safety',
    icon: 'safety',
    title: 'Herbal safety',
    body: 'The deck’s own disclaimer in full, how to treat identification, every warning printed in this deck, and where the plant information on this site comes from.',
  },
];

export default function LearnPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-gold-plate">Learn</h1>
      {/*
        WHAT "LEARN" MEANS HERE, WHICH IS NARROWER THAN THE WORD.

        "Background for the deck" describes a category, not a use. A first-time visitor
        reading a nav label called Learn reasonably expects to be taught plants — and this
        section teaches VOCABULARY: the words printed on the cards, the methods those words
        name, and the safety language the rest of the site is written in. Saying so is what
        stops the page being opened for the wrong reason and closed disappointed.

        IT MAY NOT OPEN WITH THE GLOSSARY'S OWN WORDS. The first draft read "What the words
        on the cards mean", and the Glossary card two lines below begins "What the words
        mean" — the same sentence twice within one screen, which reads as a stutter and makes
        the intro look like a caption for the first card rather than for all three. The nav
        label and the three destinations are unchanged; only this sentence is.
      */}
      <p className="mt-1 text-sm leading-relaxed text-violet-300">
        The vocabulary behind the deck — the terminology printed on the cards, the
        preparation methods those words name, and the safety language used across this site.
      </p>

      <ul className="mt-6 space-y-3">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link href={section.href} className="panel block p-5 transition-colors hover:bg-plum-600/50">
              <h2 className="font-display flex items-center gap-2.5 text-xl font-bold text-gold-300">
                <PlantdexIcon name={section.icon} className="shrink-0 text-2xl text-violet-300" />
                {section.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-violet-200">{section.body}</p>
            </Link>
          </li>
        ))}
      </ul>

      {/* An index page: the warning belongs on the page that actually describes methods,
          and /safety is listed above as a destination in its own right. */}
      <div className="mt-8">
        <SafetyNotice variant="brief" />
      </div>
    </main>
  );
}
