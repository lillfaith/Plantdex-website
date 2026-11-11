'use client';

import { track } from '@/lib/analytics';
import { launchedRegions } from '@/lib/regions';
import { useRegionScope } from '@/lib/region-scope';
import { useRegion } from '@/lib/region-store';

/**
 * Choosing a region — a `<select>`, and deliberately nothing more.
 *
 * NO GPS, NO PERMISSION PROMPT, NO IP LOOKUP. `prepareImage` has no path that returns a
 * camera's original bytes, specifically so EXIF coordinates cannot be stored; asking the
 * browser for a position to pick a plant list would trade that posture away for precision
 * the game does not need. A state is wrong only near a border, and the fix for that is
 * picking a different one.
 *
 * `region_selected` carries no region, because `track()` takes one parameter and at twenty
 * testers a region plus a timestamp is close to a name.
 */
export function RegionPicker({ className = '' }: { className?: string }) {
  // Scoped to the signed-in account, or the device when signed out. Never the default.
  const { region, ready, setRegion } = useRegion(useRegionScope());
  const regions = launchedRegions();

  return (
    <div className={className}>
      <label
        htmlFor="region"
        className="text-xs font-bold tracking-[0.2em] text-violet-300 uppercase"
      >
        Your region
      </label>
      <select
        id="region"
        // `ready` is not the same as "no region": disabled until the first read, so the
        // control never flashes "Everywhere" at somebody who chose Georgia months ago.
        disabled={!ready}
        value={region?.id ?? ''}
        onChange={(event) => {
          const next = event.target.value || null;
          setRegion(next);
          track(next ? 'region_selected' : 'region_cleared');
        }}
        className="mt-2 min-h-11 w-full rounded-lg border border-violet-700 bg-plum-900 px-3 text-base text-violet-100 disabled:opacity-60"
      >
        <option value="">Everywhere &mdash; show the whole collection</option>
        {regions.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name}
          </option>
        ))}
      </select>
      <p className="mt-2 text-xs leading-relaxed text-violet-400">
        {/*
          Said plainly because it is a real limitation today, not a detail: there is no
          server column for this yet, so the choice lives on this device.
        */}
        Remembered on this device only. Nothing about where you are is uploaded, and
        Plantdex never asks for your location.
      </p>
    </div>
  );
}
