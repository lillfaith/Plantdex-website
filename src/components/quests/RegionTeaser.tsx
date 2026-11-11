'use client';

import Link from 'next/link';
import { occurrenceCounts, regionalCollection } from '@/lib/quest-board';
import { useRegionScope } from '@/lib/region-scope';
import { useRegion } from '@/lib/region-store';
import { speciesForRegion } from '@/lib/region-species';
import { useHerbdex } from '@/state/HerbdexProvider';

/**
 * The way into the regional board from the Herbdex.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * A SIGNPOST, NOT AN EIGHTH NAV ITEM.
 *
 * Seven nav labels is the measured ceiling — at 390px each is 53px wide and an eighth
 * truncates — and the board is not yet a peer of the collection itself while one region is
 * launched. So it sits on the page a returning player already lands on, in the same shape
 * as `ResearchTeaser` and `RecentFindsStrip`: one line, one link, no card, no icon row.
 *
 * IT SAYS SOMETHING DIFFERENT DEPENDING ON WHAT IT KNOWS, because a signpost that says the
 * same thing to everybody is an advertisement. With no region it offers the idea; with a
 * region it reports progress, which is the only version worth coming back to.
 *
 * CONFIRMED AND LIKELY ARE NEVER ADDED TOGETHER HERE EITHER. The board learned that lesson
 * once already — "35 recorded" was 31 confirmed plus 4 at the edge of their range — and a
 * teaser is exactly where the shorter, rounder, wronger number would reappear.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function RegionTeaser() {
  const { region, ready: regionReady } = useRegion(useRegionScope());
  const { state, ready } = useHerbdex();

  // Nothing at all until both are known: a flash of "pick a region" at somebody who picked
  // one months ago is worse than a moment of empty space.
  if (!regionReady || !ready) return null;

  const species = speciesForRegion(region?.id);
  const counts = occurrenceCounts(species);
  const collection = regionalCollection(species);
  const found = collection.filter((card) => state.discoveries[card.id]).length;

  return (
    <Link
      href="/quests"
      className="panel flex min-h-11 items-center justify-between gap-3 p-4 transition hover:border-gold-400/50"
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold tracking-[0.2em] text-violet-300 uppercase">
          Plants near you
        </span>
        {region ? (
          <span className="mt-1 block text-sm leading-relaxed text-violet-200">
            {/*
              The two figures stay separate. `likely` means recorded and not reliably met,
              and rolling it into one total is the defect this component must not repeat.
            */}
            <strong className="text-violet-100">
              {found} of {counts.confirmed}
            </strong>{' '}
            confirmed {region.name} plants found
            {counts.likely > 0 && (
              <span className="text-violet-400">
                {' '}
                &middot; {counts.likely} more recorded occasionally
              </span>
            )}
          </span>
        ) : (
          <span className="mt-1 block text-sm leading-relaxed text-violet-200">
            See which of these plants actually grow where you are.
          </span>
        )}
      </span>
      <span aria-hidden className="shrink-0 text-gold-400">
        &rarr;
      </span>
    </Link>
  );
}
