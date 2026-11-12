import type { Metadata } from 'next';
import Link from 'next/link';
import { SafetyNotice } from '@/components/SafetyNotice';
import { pixelObject } from '@/lib/pixel-art';

export const metadata: Metadata = {
  title: 'Learn',
  description:
    'Background reading for the Plantdex deck — a glossary of herbal terminology and general guides to traditional preparation methods.',
};

const SECTIONS: {
  href: string;
  object: 'book' | 'magnifier' | 'mortar' | 'emblem';
  accent: string;
  title: string;
  body: string;
}[] = [
  { href: '/learn/plants', object: 'book', accent: '#6fcf7e', title: 'Plant library', body: 'Every plant, field guide first.' },
  { href: '/learn/glossary', object: 'magnifier', accent: '#c9a4ff', title: 'Glossary', body: 'What the words mean.' },
  { href: '/learn/preparations', object: 'mortar', accent: '#f0a95a', title: 'Preparations', body: 'How teas, tinctures and salves are made.' },
  { href: '/safety', object: 'emblem', accent: '#ffd45c', title: 'Herbal safety', body: 'Warnings and how to stay careful.' },
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
      <p className="mt-1 text-sm leading-relaxed text-violet-300">Guides and reference for the deck.</p>

      <ul className="mt-5 grid grid-cols-2 gap-3.5">
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              style={{ ['--accent' as string]: section.accent }}
              className="learn-tile flex h-full min-h-40 flex-col items-center gap-1.5 px-3 pt-3 pb-3.5 text-center"
            >
              <span
                aria-hidden="true"
                className="learn-art block h-[72px] w-[72px]"
                style={{ backgroundImage: pixelObject(section.object) }}
              />
              <h2 className="font-display text-lg leading-tight font-bold text-gold-300">
                {section.title}
              </h2>
              <p className="text-xs leading-snug text-violet-200">{section.body}</p>
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
