import type { Metadata } from 'next';
import Link from 'next/link';
import { herbsInDeckOrder } from '@/lib/deck';
import { HerbGrid } from '@/components/herbdex/HerbGrid';
import { ProgressHeader } from '@/components/herbdex/ProgressHeader';
import { EncounterRateNote, SafetyNotice } from '@/components/SafetyNotice';

export const metadata: Metadata = {
  title: 'My Herbdex',
  description:
    'Track the wild plants you have found in real life, earn XP, and complete your Plantdex collection.',
};

export default function HerbdexPage() {
  const herbs = herbsInDeckOrder();

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link href="/" className="text-xs font-semibold text-violet-300 hover:text-gold-400">
          ← Plantdex
        </Link>
      </nav>

      <h1 className="font-display text-3xl font-extrabold text-gold-plate">My Herbdex</h1>
      <p className="mt-1 text-sm text-violet-300">
        Found a plant in the wild? Open its card and log it.
      </p>

      <div className="mt-5">
        <ProgressHeader />
      </div>

      <div className="mt-6">
        <HerbGrid herbs={herbs} />
      </div>

      {/* The deck's own explanation of Encounter Rate, so the game term is not read as a
          statement about how safe or potent a plant is. */}
      <div className="panel mt-8 p-4">
        <h2 className="text-xs font-bold tracking-wide text-violet-300 uppercase">
          About encounter rate
        </h2>
        <div className="mt-1.5">
          <EncounterRateNote />
        </div>
      </div>

      <div className="mt-10">
        <SafetyNotice />
      </div>
    </main>
  );
}
