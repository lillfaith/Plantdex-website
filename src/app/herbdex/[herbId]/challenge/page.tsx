import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BOSS_PILOT } from '@/lib/boss-form';
import { getCatalogueEntry } from '@/lib/catalogue';
import { ChallengeGate } from '@/components/challenges/ChallengeGate';

/**
 * The Boss Form challenges for a pilot plant. Only pilot species get a page, and even there the
 * page renders a single sentence unless `NEXT_PUBLIC_BOSS_FORMS` is set at build time, which it
 * is not in production. It carries no SafetyNotice: it asks nothing about ingestion,
 * identification outdoors or medicine (the result screen says so in one fixed sentence), and a
 * notice repeated onto a page that raises no such risk is how the notices on pages that do stop
 * being read.
 */
export function generateStaticParams() {
  return BOSS_PILOT.map((herbId) => ({ herbId }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ herbId: string }>;
}): Promise<Metadata> {
  const { herbId } = await params;
  const herb = getCatalogueEntry(herbId);
  return { title: herb ? `Evolve ${herb.commonName}` : 'Challenges', robots: { index: false } };
}

export default async function ChallengePage({ params }: { params: Promise<{ herbId: string }> }) {
  const { herbId } = await params;
  const herb = getCatalogueEntry(herbId);
  if (!herb || !(BOSS_PILOT as readonly string[]).includes(herbId)) notFound();
  return (
    <main id="main" className="relative z-10 mx-auto max-w-md px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <ChallengeGate herbId={herb.id} name={herb.commonName} />
    </main>
  );
}
