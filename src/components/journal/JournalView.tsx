'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getHerb } from '@/lib/deck';
import { assetPath } from '@/lib/asset-path';
import { GROWTH_STAGE_LABEL, useSightings } from '@/lib/sightings';
import { SightingPhoto } from './SightingPhoto';

/**
 * The whole field journal, newest first, across every species.
 *
 * Entries are added from a plant's own page — this is the reading view, so it stays a
 * timeline rather than a second place to create things.
 */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function JournalView() {
  const sightings = useSightings();

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-gold-plate">Field Journal</h1>
      <p className="mt-1 text-sm text-violet-300">
        Everything you&apos;ve logged, newest first.
      </p>

      {sightings.length === 0 ? (
        <div className="panel mt-6 p-6 text-center">
          <p className="text-sm text-violet-200">Your journal is empty.</p>
          <p className="mt-2 text-sm text-violet-300">
            Open a plant you&apos;ve found and log a sighting — date, place, photo, notes.
            Return to the same patch to watch it change.
          </p>
          <Link
            href="/herbdex"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400"
          >
            Go to my Herbdex
          </Link>
        </div>
      ) : (
        <ol className="mt-6 space-y-5">
          {sightings.map((sighting) => {
            const herb = getHerb(sighting.herbId);
            return (
              <li key={sighting.id} className="panel p-4">
                <div className="flex items-start gap-3">
                  {herb && (
                    <Link href={`/herbdex/${herb.id}`} className="shrink-0">
                      <Image
                        src={assetPath(herb.sprite)}
                        alt=""
                        aria-hidden="true"
                        width={276}
                        height={276}
                        className="h-14 w-14 rounded-lg bg-plum-700/70 object-contain"
                      />
                    </Link>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      {herb ? (
                        <Link
                          href={`/herbdex/${herb.id}`}
                          className="font-display text-base font-bold text-gold-300 hover:underline"
                        >
                          {herb.commonName}
                        </Link>
                      ) : (
                        <span className="font-display text-base font-bold text-violet-300">
                          Unknown plant
                        </span>
                      )}
                      <time dateTime={sighting.date} className="text-xs text-violet-300">
                        {formatDate(sighting.date)}
                      </time>
                    </div>
                    {sighting.region && (
                      <p className="text-xs text-violet-300">{sighting.region}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {sighting.growthStage && (
                        <span className="rounded-full border border-violet-600 px-2 py-0.5 text-[0.62rem] font-semibold text-violet-200">
                          {GROWTH_STAGE_LABEL[sighting.growthStage]}
                        </span>
                      )}
                      {sighting.foundAgain && (
                        <span className="rounded-full bg-plum-600 px-2 py-0.5 text-[0.62rem] font-semibold tracking-wide text-violet-200 uppercase">
                          Found again
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {sighting.photoId && (
                  <div className="mt-3 max-w-sm">
                    <SightingPhoto
                      photoId={sighting.photoId}
                      alt={`Photo from ${formatDate(sighting.date)}`}
                    />
                  </div>
                )}
                {sighting.notes && (
                  <p className="mt-2 text-sm leading-relaxed text-violet-200">{sighting.notes}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
