import type { Metadata } from 'next';
import { SeedShelfView } from '@/components/seedshelf/SeedShelfView';

export const metadata: Metadata = {
  title: 'Seed Shelf',
  description:
    'Plants you have identified that are not Plantdex cards yet — kept as seed packets until a future collection catches up with them.',
};

export default function SeedShelfPage() {
  return <SeedShelfView />;
}
