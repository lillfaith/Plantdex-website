'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { alphabetical, getTerm, searchGlossary } from '@/lib/glossary';

export function GlossaryView() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => alphabetical(searchGlossary(query)), [query]);

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-2">
        <Link href="/learn" className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-semibold text-violet-300 hover:text-gold-400">
          ← Learn
        </Link>
      </nav>

      <h1 className="font-display text-3xl font-extrabold text-gold-plate">Glossary</h1>
      <p className="mt-1 text-sm text-violet-300">
        The words that turn up on herbal writing and on the cards, plainly defined.
      </p>

      <label className="mt-5 block">
        <span className="sr-only">Search the glossary</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search terms…"
          className="min-h-11 w-full rounded-full border border-violet-700 bg-plum-700/70 px-4 text-sm text-violet-100 placeholder:text-violet-500"
        />
      </label>

      <p aria-live="polite" className="mt-3 text-xs text-violet-400">
        {results.length} {results.length === 1 ? 'term' : 'terms'}
      </p>

      {results.length === 0 ? (
        <p className="panel mt-3 p-6 text-center text-sm text-violet-300">
          Nothing matches that.
        </p>
      ) : (
        <dl className="mt-3 space-y-3">
          {results.map((term) => (
            <div key={term.id} id={term.id} className="panel p-4">
              <dt className="flex flex-wrap items-baseline gap-2">
                <span className="font-display text-lg font-bold text-gold-300">{term.term}</span>
                {term.appearsOnCards && (
                  <span className="rounded-full border border-violet-600 px-2 py-0.5 text-[0.72rem] font-semibold tracking-wide text-violet-300 uppercase">
                    On the cards
                  </span>
                )}
              </dt>
              <dd className="mt-1">
                <p className="text-sm font-semibold text-violet-100">{term.short}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-violet-200">{term.long}</p>
                {term.related.length > 0 && (
                  <p className="mt-2 text-xs text-violet-400">
                    See also:{' '}
                    {term.related.map((id, index) => {
                      const related = getTerm(id);
                      if (!related) return null;
                      return (
                        <span key={id}>
                          {index > 0 && ', '}
                          <a
                            href={`#${related.id}`}
                            className="underline underline-offset-2 hover:text-gold-400"
                          >
                            {related.term}
                          </a>
                        </span>
                      );
                    })}
                  </p>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </main>
  );
}
