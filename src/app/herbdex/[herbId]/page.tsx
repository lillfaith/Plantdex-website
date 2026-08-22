import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getHerb, HERBS, SEASON_LABEL } from '@/lib/deck';
import { HerbDetail } from '@/components/herbdex/HerbDetail';

/** Every herb page is statically generated — 45 small, fast, indexable pages. */
export function generateStaticParams() {
  return HERBS.map((herb) => ({ herbId: herb.id }));
}

/**
 * Metadata still names the plant even though the page body is gated on discovery.
 *
 * The two serve different purposes: the deck's contents are not a secret and the site
 * needs to be findable, while the *collection experience* is what stays protected. Anyone
 * arriving from a search result lands on the locked view with the quiet "Reveal plant"
 * escape hatch, so nothing is spoiled without an explicit choice.
 */
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

  return <HerbDetail herb={herb} />;
}
