import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getHerb, HERBS, SEASON_LABEL, USE_DESCRIPTION, USE_LABEL } from '@/lib/deck';
import { StatPips } from '@/components/herbdex/StatPips';
import { RarityBadge } from '@/components/herbdex/RarityBadge';
import { DiscoverPanel } from '@/components/herbdex/DiscoverPanel';
import { SafetyNotice } from '@/components/SafetyNotice';

/** Every herb page is statically generated — 45 small, fast, indexable pages. */
export function generateStaticParams() {
  return HERBS.map((herb) => ({ herbId: herb.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ herbId: string }>;
}): Promise<Metadata> {
  const { herbId } = await params;
  const herb = getHerb(herbId);
  if (!herb) return { title: 'Card not found' };

  return {
    title: `${herb.commonName} (${herb.scientificName})`,
    description: `Plantdex card #${herb.cardNumber}: ${herb.commonName}, ${herb.scientificName}. Encounter rate ${herb.rarity}. Best spotted in ${SEASON_LABEL[herb.season]}.`,
    openGraph: { images: [{ url: herb.image }] },
  };
}

export default async function HerbPage({ params }: { params: Promise<{ herbId: string }> }) {
  const { herbId } = await params;
  const herb = getHerb(herbId);
  if (!herb) notFound();

  const number = `#${String(herb.cardNumber).padStart(2, '0')}`;

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link
          href="/herbdex"
          className="text-xs font-semibold text-violet-300 hover:text-gold-400"
        >
          ← My Herbdex
        </Link>
      </nav>

      <div className="sm:flex sm:items-start sm:gap-6">
        <div className="mx-auto w-56 shrink-0 overflow-hidden rounded-[var(--radius-card)] shadow-card-lift sm:mx-0 sm:w-64">
          <Image
            src={herb.image}
            alt={`Plantdex card ${number}: ${herb.commonName} (${herb.scientificName})`}
            width={356}
            height={576}
            priority
            className="w-full"
          />
        </div>

        <div className="mt-5 sm:mt-0 sm:flex-1">
          <p className="text-xs font-bold text-violet-300 tabular-nums">Card {number}</p>
          <h1 className="font-display mt-1 text-3xl leading-tight font-extrabold text-gold-plate">
            {herb.commonName}
          </h1>
          <p className="font-botanical mt-1 text-lg text-violet-200 italic">
            {herb.scientificName}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RarityBadge rarity={herb.rarity} />
            <span className="inline-flex items-center rounded-full border border-violet-600 bg-violet-900/60 px-2 py-0.5 text-[0.68rem] font-bold tracking-wide text-violet-200 uppercase">
              Best in {SEASON_LABEL[herb.season]}
            </span>
            <span className="inline-flex items-center rounded-full border border-violet-600 bg-violet-900/60 px-2 py-0.5 text-[0.68rem] font-bold tracking-wide text-violet-200 uppercase">
              {herb.xp} XP
            </span>
          </div>

          <div className="mt-5">
            <DiscoverPanel herb={herb} />
          </div>
        </div>
      </div>

      <section aria-labelledby="conditions-heading" className="panel mt-8 p-5">
        <h2
          id="conditions-heading"
          className="text-sm font-bold tracking-wide text-gold-400 uppercase"
        >
          Growing conditions
        </h2>
        <p className="mt-1 mb-4 text-xs text-violet-400">
          As printed on the card, rated out of five.
        </p>
        <StatPips stats={herb.stats} />
      </section>

      <section aria-labelledby="uses-heading" className="panel mt-4 p-5">
        <h2 id="uses-heading" className="text-sm font-bold tracking-wide text-gold-400 uppercase">
          Traditional uses
        </h2>
        <p className="mt-1 text-xs text-violet-400">
          The icons printed on this card. These describe historical and folk use only — they
          are not medical claims or instructions.
        </p>
        <ul className="mt-4 space-y-2">
          {herb.uses.map((use) => (
            <li key={use} className="flex gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-violet-100">{USE_LABEL[use]}</p>
                <p className="text-xs text-violet-300">{USE_DESCRIPTION[use]}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/*
        Identification notes, habitat, range and preparation belong here. That content is
        printed on the card BACKS, which are not in the reference package, so the section
        is omitted entirely rather than filled with invented botany.
      */}

      <div className="mt-8">
        <SafetyNotice />
      </div>
    </main>
  );
}
