import Link from 'next/link';
import type { Herb } from '@/lib/types';
import { citationsFor, evidenceLabelFor } from '@/lib/card-sources';
import {
  claimCitations,
  countSources,
  formatCitation,
  resolveRefs,
  sectionCitations,
  type ResolvedSource,
} from '@/lib/sources';
import { SOURCEABLE_SECTIONS } from '@/lib/types';

/**
 * "Sources (N)" — collapsed by default.
 *
 * A card page is a collectible object first. Citations belong to the person who asks
 * "where did this come from?", not to everyone who opens the page, so this is a one-line
 * summary that expands. The answer is always one tap away and never in the way.
 *
 * Three rules it keeps from the citation system:
 *  • Only VERIFIED sources render, at any granularity.
 *  • It states what is NOT independently sourced. Listing only what is cited would let a
 *    reader assume the rest is cited too, which for a product about plants people take
 *    outdoors is a worse failure than looking thin.
 *  • The deck and the independent references are shown as different things. The deck is
 *    where the words on this page came from; the references are what somebody checked them
 *    against. Merging the two lists would let three journal articles read as though they
 *    were the source of the card's text, which is not what happened.
 */
export function SourcesSection({ herb }: { herb: Herb }) {
  const entryLevel = resolveRefs(citationsFor(herb));
  const provenance = entryLevel.filter((entry) => entry.source.kind === 'deck');
  const references = entryLevel.filter((entry) => entry.source.kind !== 'deck');
  const evidence = evidenceLabelFor(herb);
  const { cited, awaiting } = sectionCitations(herb.sectionSources);
  const claims = claimCitations(herb.claimSources);
  const total = countSources({ ...herb, sources: citationsFor(herb) });

  if (total === 0) return null;

  return (
    <details className="panel p-5">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-bold tracking-wide text-gold-400 uppercase">
        Sources ({total})
        {evidence && (
          <span className="rounded-full border border-violet-600 bg-plum-700/70 px-2 py-0.5 text-[0.68rem] tracking-wide text-violet-200">
            {evidence}
          </span>
        )}
      </summary>

      {provenance.length > 0 && (
        <ul className="mt-3 space-y-3">
          {provenance.map((entry) => (
            <li key={entry.source.id + (entry.detail ?? '')}>
              <Citation entry={entry} />
            </li>
          ))}
        </ul>
      )}

      {/* Independent references for the plant, from the card-by-card source audit. */}
      {references.length > 0 && (
        <div className="mt-4 border-t border-violet-700/50 pt-3">
          <h3 className="text-xs font-bold tracking-wide text-violet-300 uppercase">
            Independent references
          </h3>
          <ul className="mt-1.5 space-y-1">
            {references.map((entry) => (
              <li key={entry.source.id + (entry.detail ?? '')}>
                <Citation entry={entry} small />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-violet-400">
            Plant information is educational. Evidence ranges from traditional use and
            laboratory studies to human clinical research; source quality and applicability
            vary by plant, preparation, and species.
          </p>
        </div>
      )}

      {/* Per-section, once verified sources exist for a given card. */}
      {cited.length > 0 && (
        <dl className="mt-4 space-y-2 border-t border-violet-700/50 pt-3">
          {cited.map(({ section, label, sources }) => (
            <div key={section}>
              <dt className="text-xs font-bold tracking-wide text-violet-300 uppercase">
                {label}
              </dt>
              <dd className="mt-0.5 space-y-1">
                {sources.map((entry) => (
                  <Citation key={entry.source.id + (entry.detail ?? '')} entry={entry} small />
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Per-claim. The claim text is shown so a reader can see exactly what is supported. */}
      {claims.length > 0 && (
        <dl className="mt-4 space-y-2 border-t border-violet-700/50 pt-3">
          {claims.map((claim) => (
            <div key={claim.claimId}>
              <dt className="text-xs text-violet-200">“{claim.claim}”</dt>
              <dd className="mt-0.5 space-y-1">
                {claim.sources.map((entry) => (
                  <Citation key={entry.source.id + (entry.detail ?? '')} entry={entry} small />
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {awaiting.length > 0 && (
        <p className="mt-4 border-t border-violet-700/50 pt-3 text-xs leading-relaxed text-violet-400">
          <span className="font-semibold text-violet-300">Awaiting sources:</span>{' '}
          {awaitingSentence(awaiting.length, references.length > 0)}{' '}
          <Link
            href="/safety"
            className="font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
          >
            How this works →
          </Link>
        </p>
      )}
    </details>
  );
}

/**
 * What is still uncited, said accurately once independent references exist.
 *
 * Two things changed when the audit's references arrived, and this sentence has to keep
 * up with both. It can no longer say "no independent reference yet" on a card that has
 * three — but they are attached to the PLANT, not to any one section, so it also cannot
 * imply the sections are covered. And the count is compared against
 * `SOURCEABLE_SECTIONS.length` rather than the literal 7 it used to hard-code, which was
 * one section added away from silently claiming the wrong thing.
 */
function awaitingSentence(awaiting: number, hasReferences: boolean): string {
  const all = awaiting === SOURCEABLE_SECTIONS.length;
  if (hasReferences) {
    return all
      ? 'the references above are about the plant as a whole; no individual section here is separately sourced yet.'
      : `${awaiting} sections here are not separately sourced yet — the references above are about the plant as a whole.`;
  }
  return all
    ? 'every section here is transcribed from the card, with no independent reference yet.'
    : `${awaiting} sections here are transcribed from the card, with no independent reference yet.`;
}

function Citation({ entry, small = false }: { entry: ResolvedSource; small?: boolean }) {
  const { source, detail } = entry;
  const text = formatCitation(source);
  return (
    <p className={small ? 'text-xs text-violet-200' : 'text-sm font-semibold text-violet-100'}>
      {source.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-gold-400"
        >
          {text}
        </a>
      ) : (
        text
      )}
      {detail && <span className="text-violet-400"> — {detail}</span>}
      {source.note && !small && (
        <span className="mt-0.5 block text-xs font-normal text-violet-400">{source.note}</span>
      )}
    </p>
  );
}
