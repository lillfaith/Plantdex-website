import type { Metadata } from 'next';
import { GardenView } from '@/components/garden/GardenView';

export const metadata: Metadata = {
  title: 'My Garden',
  description:
    'A living picture of your Plantdex collection — every species you have discovered, growing as you record more sightings.',
};

export default function GardenPage() {
  return <GardenView />;
}
