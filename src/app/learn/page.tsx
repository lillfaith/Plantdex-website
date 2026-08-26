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
      <p className="mt-1 text-sm text-violet-300">
        Background for the deck — terminology and traditional methods.
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
