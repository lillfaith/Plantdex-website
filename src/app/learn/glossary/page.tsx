import type { Metadata } from 'next';
import { GlossaryView } from '@/components/learn/GlossaryView';

export const metadata: Metadata = {
  title: 'Glossary',
  description:
    'Plain definitions of herbal terminology — infusion, decoction, tincture, poultice, mucilage and more.',
};

export default function GlossaryPage() {
  return <GlossaryView />;
}
