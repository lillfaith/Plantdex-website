import type { Metadata } from 'next';
import { GardenView } from '@/components/garden/GardenView';
import { TrackView } from '@/components/analytics/TrackView';
import { ResearchTeaser } from '@/components/research/ResearchTeaser';

export const metadata: Metadata = {
  title: 'My Garden',
  description:
    'A living picture of your Plantdex collection — every species you have discovered, growing as you record more sightings.',
};

export default function GardenPage() {
  return (
    <>
      <TrackView event="garden_opened" />
      <GardenView />
      {/*
        Field Research reaches the Garden too. It was on the Herbdex index and nowhere else,
        so a player who went Home -> Garden never met it at all — and the Garden is exactly
        where somebody is looking at what they have and wondering what to do next.
      */}
      <div className="mx-auto mt-8 max-w-4xl px-4">
        <ResearchTeaser />
      </div>
    </>
  );
}
