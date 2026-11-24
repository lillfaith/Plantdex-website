'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { getPrintedCard } from '@/lib/deck';
import { HABITAT_BLURB, HABITAT_LABEL } from '@/lib/habitat';
import { nearbyByHabitat, RECORDED_COPY } from '@/lib/regional-nearby';

/**
 * NOT MOUNTED ANYWHERE. Awaiting the UI session's design. DO NOT MOUNT.
 *
 * A provisional, throwaway layout for the regional recorded-plants-by-habitat logic in
 * `src/lib/regional-nearby.ts`. Nothing may import this file (pinned by
 * `regional-nearby.test.ts`); `/quests` renders exactly what it did before.
 *
 * Every user-facing sentence comes from `RECORDED_COPY`; this file writes none of its own.
 * Display only: it reads the region's recorded species and the player's existing
 * discoveries, writes nothing, and pays nothing.
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
  const note = RECORDED_COPY.sourceNote(regionId);
  if (groups.length === 0) return null;

  const name = (id: string) => getPrintedCard(id)?.commonName ?? id;

  return (
    <section className="panel p-5" aria-labelledby="recorded-in-region" data-ui-placeholder>
      <h3 id="recorded-in-region" className="text-sm font-bold text-violet-100">
        {RECORDED_COPY.heading(regionName)}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-violet-400">
        {RECORDED_COPY.subheading(regionName)}
      </p>
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.habitat}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="text-sm font-semibold text-violet-100">
                {HABITAT_LABEL[group.habitat]}
              </h4>
              <p className="text-xs tabular-nums text-violet-300">
                {RECORDED_COPY.progress(group.confirmedFound, group.confirmed.length)}
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
                    {discoveries[id] ? <span className="ml-1 text-gold-300">&middot; {RECORDED_COPY.unlockedBadge}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
            {group.likely.length > 0 && (
              <p className="mt-2 text-xs leading-relaxed text-violet-400">
                {RECORDED_COPY.occasionalLabel(regionName)}: {group.likely.map(name).join(', ')}.
              </p>
            )}
          </div>
        ))}
      </div>
      {note && <p className="mt-4 text-xs leading-relaxed text-violet-400">{note}</p>}
    </section>
  );
}
