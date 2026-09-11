import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SEASON_LABEL } from '@/lib/deck';
import { CATALOGUE, getCatalogueEntry } from '@/lib/catalogue';
import { HerbDetail } from '@/components/herbdex/HerbDetail';

/**
 * Every species page is statically generated — small, fast, indexable.
 *
 * THE CATALOGUE, NOT THE PRINTED DECK. This read `PRINTED_CARDS`, which was right while the
 * only cards were the printed 45 and wrong the moment Field Cards existed: the reward panel
 * offered "View card" and the link 404'd, because no page had been generated for a card that
 * is not in the deck. Caught by following the link in a browser, not by any test — so
 * `field-cards.test.ts` now asserts every Field Card is in `CATALOGUE`, which is what this
 * generates from.
 */
export function generateStaticParams() {
  return CATALOGUE.map((herb) => ({ herbId: herb.id }));
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
  const herb = getCatalogueEntry(herbId);
  if (!herb) return { title: 'Card not found' };

  return {
    title: `${herb.commonName} (${herb.scientificName})`,
    description: `Plantdex card #${herb.cardNumber}: ${herb.commonName}, ${herb.scientificName}. Encounter rate ${herb.rarity}. Best spotted in ${SEASON_LABEL[herb.season]}.`,
    openGraph: { images: [{ url: herb.image }] },
  };
}

export default async function HerbPage({ params }: { params: Promise<{ herbId: string }> }) {
  const { herbId } = await params;
  const herb = getCatalogueEntry(herbId);
  if (!herb) notFound();

  return <HerbDetail herb={herb} />;
}
