import type { Metadata } from 'next';
import { ResearchView } from '@/components/research/ResearchView';

export const metadata: Metadata = {
  title: 'Field Research',
  description:
    'Daily, seasonal and collection challenges built from the Plantdex deck — small reasons to take your cards outside and find the plants on them.',
};

/**
 * Lives under /herbdex rather than at the top level: Field Research supports the Herbdex
 * instead of standing beside it, and the primary nav is already full at phone width.
 *
 * This static segment sits alongside the [herbId] dynamic route. Next resolves static
 * segments first, and no herb id can collide — ids are derived from scientific names — but
 * the export is checked for herbdex/research/index.html rather than assumed.
 */
export default function ResearchPage() {
  return <ResearchView />;
}
