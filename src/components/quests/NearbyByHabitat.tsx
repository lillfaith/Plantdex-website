'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { getPrintedCard } from '@/lib/deck';
import { HABITAT_BLURB, HABITAT_LABEL } from '@/lib/habitat';
import { nearbyByHabitat, occurrenceSourceNote } from '@/lib/regional-nearby';

/**
 * "Where to look": the same regional list as the board, grouped by habitat.
 *
 * Display only. It reads the region's recorded species and the player's existing
 * discoveries, writes nothing, and pays nothing. PRESENTATION IS PROVISIONAL — plain panel
 * markup with existing tokens, pending the UI session.
 */
export function NearbyByHabitat({
  regionId,
  regionName,
  discoveries,
}: {
  regionId: string;
  regionName: string;
  discoveries: Readonly<Record<string, unknown>>;
}) {
  const groups = useMemo(() => nearbyByHabitat(regionId, discoveries), [regionId, discoveries]);
  const note = occurrenceSourceNote(regionId);
  if (groups.length === 0) return null;

  const name = (id: string) => getPrintedCard(id)?.commonName ?? id;

  return (
    <section className="panel p-5" aria-labelledby="where-to-look" data-ui-placeholder>
      <h3 id="where-to-look" className="text-sm font-bold text-violet-100">
        Where to look in {regionName}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-violet-400">
        The same plants as above, grouped by the kind of place each is usually recorded. A
        plant with two usual places is listed under both, so these counts overlap.
      </p>
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.habitat}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold text-violet-100">
                {HABITAT_LABEL[group.habitat]}
              </h4>
              <p className="text-xs tabular-nums text-violet-300">
                {group.confirmedFound} of {group.confirmed.length} recorded plants found
              </p>
            </div>
            <p className="text-xs leading-relaxed text-violet-400">
              {HABITAT_BLURB[group.habitat]}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {group.confirmed.map((id) => (
                <li key={id}>
                  <Link
                    href={`/herbdex/${id}`}
                    className="inline-flex min-h-11 items-center rounded-full border border-violet-800/60 px-3 text-xs text-violet-100 hover:border-gold-400/60"
                  >
                    {name(id)}
                    {discoveries[id] ? <span className="ml-1 text-gold-300">&middot; found</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
            {group.likely.length > 0 && (
              <p className="mt-2 text-xs leading-relaxed text-violet-400">
                Recorded only occasionally here, so you may not meet them:{' '}
                {group.likely.map(name).join(', ')}.
              </p>
            )}
          </div>
        ))}
      </div>
      {note && <p className="mt-4 text-xs leading-relaxed text-violet-400">{note}</p>}
    </section>
  );
}
