'use client';

import Link from 'next/link';
import { useId, useMemo, useState } from 'react';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * The searchable plant index. Names and links only, handed in by the page from the catalogue;
 * it owns no botanical data. Search matches common and scientific names, ignores case and
 * accents, and filters 54 rows in memory with no request.
 */
export interface LibraryRow {
  readonly id: string;
  readonly commonName: string;
  readonly scientificName: string;
}

const fold = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function PlantLibrary({ plants }: { plants: readonly LibraryRow[] }) {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const wanted = fold(query);

  const groups = useMemo(() => {
    const matches = plants.filter(
      (plant) =>
        wanted === '' ||
        fold(plant.commonName).includes(wanted) ||
        fold(plant.scientificName).includes(wanted),
    );
    const byLetter = new Map<string, LibraryRow[]>();
    for (const plant of matches) {
      const letter = plant.commonName.charAt(0).toUpperCase();
      byLetter.set(letter, [...(byLetter.get(letter) ?? []), plant]);
    }
    return { total: matches.length, letters: [...byLetter.entries()] };
  }, [plants, wanted]);

  return (
    <div>
      <div role="search" className="sticky top-0 z-10 -mx-4 bg-plum-950/90 px-4 py-2 backdrop-blur">
        <label htmlFor={inputId} className="sr-only">
          Search plants by common or scientific name
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by common or scientific name"
          autoComplete="off"
          className="min-h-12 w-full rounded-full border border-violet-600 bg-plum-900 px-5 text-sm text-violet-100 placeholder:text-violet-400"
        />
        <p className="mt-1 px-2 text-xs text-violet-300" aria-live="polite">
          {wanted === '' ? `${plants.length} plants` : `${groups.total} of ${plants.length} plants`}
        </p>
      </div>

      {groups.total === 0 ? (
        <p className="mt-6 rounded-xl border border-violet-700 bg-plum-900/40 p-5 text-center text-sm text-violet-200">
          No plant matches &ldquo;{query.trim()}&rdquo;. Try part of a common or scientific name.
        </p>
      ) : (
        <div className="mt-2 space-y-4 pb-24">
          {groups.letters.map(([letter, rows]) => (
            <section key={letter} aria-label={`Plants starting with ${letter}`}>
              <h2 className="font-display px-1 text-sm font-bold text-gold-400">{letter}</h2>
              <ul className="mt-1 divide-y divide-violet-800/70 rounded-xl border border-violet-700 bg-plum-900/40">
                {rows.map((plant) => (
                  <li key={plant.id}>
                    <Link
                      href={`/herbdex/${plant.id}/#field-identification`}
                      className="flex min-h-14 items-center gap-3 px-3 py-2 transition-colors hover:bg-plum-600/50"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-600 bg-plum-800 text-lg text-violet-300"
                      >
                        <PlantdexIcon name="leaves" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-violet-100">
                          {plant.commonName}
                        </span>
                        <span className="font-botanical block truncate text-xs text-violet-300 italic">
                          {plant.scientificName}
                        </span>
                      </span>
                      <span aria-hidden="true" className="shrink-0 text-violet-400">
                        &rarr;
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
