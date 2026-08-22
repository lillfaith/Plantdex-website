'use client';

import { useId, useRef } from 'react';
import Link from 'next/link';
import { findTerm } from '@/lib/glossary';

/**
 * An inline "(?)" that defines a term without leaving the page.
 *
 * Renders nothing extra when the word is not in the glossary, so plant pages can wrap any
 * card wording safely and terms can be added later without touching the plant pages.
 */
export function GlossaryTermLink({ word }: { word: string }) {
  const term = findTerm(word);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  if (!term) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={`What does ${term.term} mean?`}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-violet-500 align-middle text-[0.6rem] font-bold text-violet-300 hover:border-gold-500 hover:text-gold-400"
      >
        <span aria-hidden="true">?</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="panel m-auto w-[min(24rem,calc(100vw-2rem))] p-5 text-violet-100 backdrop:bg-violet-deep/80 backdrop:backdrop-blur-sm"
      >
        <h2 id={titleId} className="font-display text-lg font-bold text-gold-plate">
          {term.term}
        </h2>
        <p className="mt-2 text-sm font-semibold text-violet-100">{term.short}</p>
        <p className="mt-2 text-sm leading-relaxed text-violet-200">{term.long}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/learn/glossary"
            className="text-xs font-semibold text-violet-300 underline underline-offset-2 hover:text-gold-400"
          >
            Open the full glossary →
          </Link>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="min-h-11 rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400"
          >
            Got it
          </button>
        </div>
      </dialog>
    </>
  );
}
