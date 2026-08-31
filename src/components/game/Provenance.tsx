'use client';

import { useId, useRef } from 'react';

/**
 * Where a section's content came from: the printed card, or Plantdex.
 *
 * This replaces the full-width uppercase line "ADDED BY PLANTDEX — NOT ON THE CARD" that
 * sat above three sections. The DISTINCTION is not being softened — it is load-bearing,
 * because a reader who thinks a lookalike discriminator came off their own deck weighs it
 * differently from one who knows the site added it. What changes is the weight: a chip
 * states the same thing in a fraction of the space, and an info control carries the longer
 * explanation for anyone who wants it.
 *
 * No emoji. `src/lib/no-emoji.test.ts` forbids them, and the obvious sparkle character
 * (U+2726) sits inside the range it blocks — the marks here are geometric shapes, which
 * render in the page's own font and take the colour of the token around them.
 */
export function ProvenanceChip({ source }: { source: 'card' | 'plantdex' }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isCard = source === 'card';

  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.72rem] font-bold tracking-[0.1em] uppercase ${
          isCard
            ? 'border-violet-600/70 bg-violet-800/25 text-violet-200'
            : 'border-mystery-pink/45 bg-mystery-pink/10 text-mystery-pink'
        }`}
      >
        <span aria-hidden="true" className="leading-none">
          {isCard ? '▣' : '◈'}
        </span>
        {isCard ? 'Physical card data' : 'Plantdex field data'}
      </span>

      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="What is the difference between physical card data and Plantdex field data?"
        /* 16px mark, 44px target — the hit box grows without moving anything on screen. */
        className="relative inline-flex h-4 w-4 items-center justify-center rounded-full border border-violet-600 text-[0.72rem] leading-none font-bold text-violet-300 before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:border-gold-500 hover:text-gold-400"
      >
        <span aria-hidden="true">?</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="panel-modal m-auto w-[min(26rem,calc(100vw-2rem))] p-5 text-violet-100 backdrop:bg-plum-950/85 backdrop:backdrop-blur-sm"
      >
        <h2 id={titleId} className="font-display text-lg font-bold text-gold-plate">
          Where this comes from
        </h2>
        <dl className="mt-3 space-y-3 text-sm leading-relaxed">
          <div>
            <dt className="font-bold text-violet-100">▣ Physical card data</dt>
            <dd className="mt-0.5 text-violet-200">
              Transcribed word for word from the printed card in your deck, including its own
              wording. Nothing is added, expanded or paraphrased.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-mystery-pink">◈ Plantdex field data</dt>
            <dd className="mt-0.5 text-violet-200">
              Added by this site and not printed on your card — identification traits, habitat
              and lookalikes. It carries its own sources, listed at the foot of the page, and
              is kept separate from the transcription rather than mixed into it.
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="mt-5 min-h-11 w-full rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400"
        >
          Got it
        </button>
      </dialog>
    </span>
  );
}
