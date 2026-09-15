import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  LEGAL_REVIEWED,
  LEGAL_STATUS,
  blockingOwnerInputs,
  ownerInput,
  reviewOutstanding,
} from '@/lib/legal';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * Shared furniture for /privacy and /terms.
 *
 * Both pages are read rather than scanned, so this is the plainest layout on the site: one
 * reading measure, generous leading, no panels competing for attention. The deck's display
 * face still sets the headings, so it reads as Plantdex rather than as a pasted template.
 */

/**
 * A fact the repository cannot supply, shown as a visible gap.
 *
 * Rendered inline where the sentence needs it, so the surrounding text still reads as a
 * sentence and the hole is obvious. Never styled quietly — a placeholder that blends in is
 * how a draft policy gets published looking finished.
 */
export function OwnerGap({ id }: { id: string }) {
  const input = ownerInput(id);
  if (!input) {
    // Unregistered ids are a build failure via legal.test.ts, but never render a bare token.
    return <span className="font-bold text-stat-temp">[ awaiting owner input ]</span>;
  }
  /*
   * ANSWERED ENTRIES RENDER AS ORDINARY PROSE, not as a highlighted box that happens to
   * contain the right words. The highlight exists to make an unanswered gap impossible to
   * miss during review; once the owner has answered, the sentence should simply read as a
   * sentence. This is the whole reason the answer lives on the registry entry rather than
   * being pasted into each page: six render sites, one source of truth.
   */
  if (input.value) return <>{input.value}</>;

  return (
    <mark className="rounded border border-stat-temp/60 bg-stat-temp/15 px-1.5 py-0.5 text-sm font-bold text-violet-100">
      <span className="sr-only">Awaiting owner input: </span>
      [{input.label}]
    </mark>
  );
}

/**
 * The draft banner, shown while anything is outstanding — a missing fact OR an unreviewed
 * answer.
 *
 * IT HAS TO NAME BOTH, because they look completely different on the page. A blocking input
 * leaves a visible hole in a sentence, so "marked below in the text" tells a reader exactly
 * where to look. An answer awaiting review leaves FINISHED PROSE that reads as settled —
 * there is nothing marked, nothing to find, and a banner that only mentioned holes would
 * send someone hunting for one that is not there and conclude the notice was stale.
 */
function DraftNotice() {
  const blocking = blockingOwnerInputs();
  const unreviewed = reviewOutstanding();
  if (LEGAL_STATUS === 'published') return null;
  return (
    <aside
      role="note"
      aria-labelledby="draft-heading"
      className="mb-8 rounded-card border border-stat-temp/60 bg-stat-temp/10 p-5"
    >
      <h2
        id="draft-heading"
        className="flex items-center gap-2 text-sm font-bold tracking-wide text-violet-100 uppercase"
      >
        <PlantdexIcon name="errata" className="text-base" />
        Draft — not yet in force
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-violet-200">
        This page describes what the application actually does today, written from the code
        rather than from a template.{' '}
        {blocking.length > 0 && (
          <>
            {blocking.length} detail{blocking.length === 1 ? '' : 's'} cannot be established
            from the software and {blocking.length === 1 ? 'is' : 'are'} marked below in the
            text.{' '}
          </>
        )}
        {unreviewed.length > 0 && (
          <>
            {/*
              SAID PLAINLY, because this is the half a reader cannot see. The sentences it
              refers to are complete and read as settled; only this line distinguishes a
              considered draft from a reviewed one.
            */}
            {unreviewed.length === 1 ? 'One section is' : `${unreviewed.length} sections are`}{' '}
            written but not yet checked by a lawyer.{' '}
          </>
        )}
        Until that is resolved, this is a working draft rather than a policy anyone should
        rely on.
      </p>
    </aside>
  );
}

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-8">
      <DraftNotice />

      <h1 className="font-display text-3xl font-extrabold text-gold-plate">{title}</h1>
      <p className="mt-3 text-base leading-relaxed text-violet-200">{intro}</p>
      <p className="mt-3 text-xs text-violet-400">
        Last checked against the application on{' '}
        <time dateTime={LEGAL_REVIEWED}>
          {new Date(LEGAL_REVIEWED).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
        .
      </p>

      <div className="mt-8 space-y-8">{children}</div>

      {/* Neither page replaces the safety page, and both say so rather than assuming it. */}
      <aside className="mt-12 rounded-card border border-violet-600/70 bg-plum-800/40 p-5">
        <h2 className="text-sm font-bold tracking-wide text-gold-400 uppercase">
          This is not the safety information
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-violet-200">
          Identifying, foraging and using wild plants carries real risk, and none of it is
          covered here.{' '}
          <Link
            href="/safety"
            className="font-semibold text-violet-100 underline underline-offset-2 hover:text-gold-400"
          >
            Read the herbal safety information
          </Link>
          .
        </p>
      </aside>
    </main>
  );
}

/** One numbered section of a policy. */
export function LegalSection({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="font-display text-xl font-bold text-gold-300">
        {heading}
      </h2>
      <div className="mt-3 space-y-3 text-base leading-relaxed text-violet-200">{children}</div>
    </section>
  );
}

/** A plain definition row, for the "what is stored" tables both pages use. */
export function LegalTable({ rows }: { rows: { term: string; detail: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-violet-700/50 rounded-card border border-violet-700/60">
      {rows.map((row) => (
        <div key={row.term} className="px-4 py-3">
          <dt className="text-sm font-bold text-violet-100">{row.term}</dt>
          <dd className="mt-1 text-sm leading-relaxed text-violet-300">{row.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
