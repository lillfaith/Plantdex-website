import type { Metadata } from 'next';
import Link from 'next/link';
import { CATALOGUE } from '@/lib/catalogue';
import { SafetyNotice } from '@/components/SafetyNotice';

export const metadata: Metadata = {
  title: 'Plant library',
  description:
    'Every plant Plantdex covers, with a link to its field identification guide, lookalikes, habitat and safety information.',
};

/**
 * THE BOTANICAL LIBRARY: AN INDEX, NOT A SECOND DATABASE.
 *
 * It lists names and links, and nothing else. Every row opens the one expanded profile at
 * `/herbdex/[herbId]`, on its Field Identification tab, so the library can never drift from
 * the profile or become a competing source of botanical information. It reads only the
 * catalogue's names: no traits, no lookalikes, no uses. Pinned by `learn-plants.test.ts`.
 *
 * Open to everybody, found or not: identification and safety information is never behind
 * collection progress. Collecting (art, card back, rewards, progression) still is.
 */
export default function PlantLibraryPage() {
  const plants = [...CATALOGUE].sort((a, b) => a.commonName.localeCompare(b.commonName));

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-2">
        <Link
          href="/learn"
          className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-violet-300 hover:text-gold-400"
        >
          &larr; Learn
        </Link>
      </nav>
      <h1 className="font-display text-3xl font-extrabold text-gold-plate">Plant library</h1>
      <p className="mt-1 text-sm leading-relaxed text-violet-300">
        {plants.length} plants. Each opens its field identification guide first: how to
        recognise it, what it is confused with, and where it grows.
      </p>

      <ul className="mt-6 divide-y divide-violet-800/70 rounded-xl border border-violet-700 bg-plum-900/40">
        {plants.map((plant) => (
          <li key={plant.id}>
            <Link
              href={`/herbdex/${plant.id}/#field-identification`}
              className="flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-plum-600/50"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-violet-100">
                  {plant.commonName}
                </span>
                <span className="font-botanical block truncate text-xs text-violet-300 italic">
                  {plant.scientificName}
                </span>
              </span>
              <span aria-hidden="true" className="shrink-0 text-violet-400">
                &rarr;
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10">
        <SafetyNotice context="A field guide is an aid, not proof. Finding a plant is not identifying it, and traditional use is not evidence. Never eat, drink or apply one you are not certain of." />
      </div>
    </main>
  );
}
