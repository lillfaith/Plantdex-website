'use client';

import Link from 'next/link';
import { occurrenceCounts, regionalCollection } from '@/lib/quest-board';
import { useRegionScope } from '@/lib/region-scope';
import { useRegion } from '@/lib/region-store';
import { speciesForRegion } from '@/lib/region-species';
import { useHerbdex } from '@/state/HerbdexProvider';

/**
 * The regional quest entry on Home (owner decision 2026-11-27: a prominent way into Quests from the front page).
 *
 * Says something different depending on what it knows, like `RegionTeaser`: with no region it invites; with a region it
 * reports progress. Confirmed and "recorded occasionally" are never added together here either. It writes nothing, pays
 * nothing and reads no location: the region is the one the player picked, remembered on this device.
 */
export function HomeQuestEntry() {
  const { region, ready: regionReady } = useRegion(useRegionScope());
  const { state, ready } = useHerbdex();
  const species = speciesForRegion(region?.id);
  const counts = occurrenceCounts(species);
  const found = regionalCollection(species).filter((card) => state.discoveries[card.id]).length;
  // Until both are known, render the invitation rather than a flash of the wrong state.
  const known = regionReady && ready && region;

  return (
    <Link
      href="/quests"
      className="panel-raised holo-border flex min-h-16 items-center justify-between gap-3 rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold tracking-[0.2em] text-gold-400 uppercase">Regional quests</span>
        <span className="mt-1 block text-lg leading-tight font-extrabold text-violet-50">Plants near you</span>
        <span className="mt-1 block text-sm leading-snug text-violet-200">
          {known ? (
            <>
              <strong className="text-violet-100">
                {found} of {counts.confirmed}
              </strong>{' '}
              confirmed {region.name} plants found
            </>
          ) : (
            'Pick a region and see which plants grow there.'
          )}
        </span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-2xl text-gold-400">
        &rarr;
      </span>
    </Link>
  );
}
