import type { Metadata } from 'next';
import { JournalView } from '@/components/journal/JournalView';

export const metadata: Metadata = {
  title: 'Field Journal',
  description:
    'Your own record of the wild plants you have found — dates, places, photos and notes, building into a personal field guide.',
};

export default function JournalPage() {
  return <JournalView />;
}
