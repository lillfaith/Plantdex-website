import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getHerb, HERBS, SEASON_LABEL, USE_LABEL } from '@/lib/deck';
import { StatPips } from '@/components/herbdex/StatPips';
import { RarityBadge } from '@/components/herbdex/RarityBadge';
import { DiscoverPanel } from '@/components/herbdex/DiscoverPanel';
import { CardFlip } from '@/components/herbdex/CardFlip';
import { CardBackDetails } from '@/components/herbdex/CardBackDetails';
import { CardWarning, SafetyNotice } from '@/components/SafetyNotice';

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
        <div className="shrink-0">
          <CardFlip herb={herb} />
        </div>

        <div className="mt-6 sm:mt-0 sm:flex-1">
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

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {herb.uses.map((use) => (
              <li
                key={use}
                className="rounded-full border border-gold-500/45 bg-gold-500/12 px-2.5 py-1 text-xs font-semibold text-gold-300"
              >
                {USE_LABEL[use]}
              </li>
            ))}
          </ul>

          {/* A warning printed on the card itself sits above the discovery CTA, never below it. */}
          {herb.warning && (
            <div className="mt-4">
              <CardWarning warning={herb.warning} />
            </div>
          )}

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

      <div className="mt-4">
        <CardBackDetails herb={herb} />
      </div>

      <div className="mt-8">
        <SafetyNotice />
      </div>
    </main>
  );
}
