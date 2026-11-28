import type { Metadata } from 'next';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { SeasonsGuide } from '@/components/quests/SeasonsGuide';

export const metadata: Metadata = {
  title: 'Seasons',
  description:
    'When the plants in the Plantdex deck are typically easiest to find, by season, as printed on the cards.',
};

/**
 * The seasonal guide: grouped strictly by the season icon printed on each card (the deck's own judgement of when a plant is typically
 * easiest to find), now read against the player's own collection in `SeasonsGuide`. Deliberately NOT a phenology calendar: the cards
 * carry no emerging/flowering/fruiting dates, and inventing per-month stages would be fabricating botanical information.
 */
export default function SeasonsPage() {
  return (
    <main id="main" data-ground="lavender" data-palette="card" className="mx-auto max-w-3xl px-4 py-8">
      <PageAtmosphere theme="collection" />
      <h1 className="font-display text-3xl font-extrabold text-gold-plate">Seasons</h1>
      <p className="mt-1 text-sm text-violet-300">A field guide to when each plant in the deck is typically easiest to find, and which of them you have collected.</p>
      <SeasonsGuide />
    </main>
  );
}
