import type { Metadata } from 'next';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { TrackView } from '@/components/analytics/TrackView';
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
  // The page joins the lavender ground like Collection (its parent) and Garden: same atmosphere, same token remap. A wrapper rather than an
  // attribute on <main>, because <main> lives in ResearchView (the quests lane's file).
  return (
    <div data-ground="lavender" data-shade="collection" data-palette="card">
      <PageAtmosphere theme="collection" />
      <TrackView event="research_viewed" />
      <ResearchView />
    </div>
  );
}
