import Link from 'next/link';
import type { Herb } from '@/lib/types';
import {
  claimCitations,
  countSources,
  formatCitation,
  resolveRefs,
  sectionCitations,
  type ResolvedSource,
} from '@/lib/sources';

/**
 * "Sources (N)" — collapsed by default.
 *
 * A card page is a collectible object first. Citations belong to the person who asks
 * "where did this come from?", not to everyone who opens the page, so this is a one-line
 * summary that expands. The answer is always one tap away and never in the way.
 *
 * Two rules it keeps from the citation system:
 *  • Only VERIFIED sources render, at any granularity.
 *  • It states what is NOT independently sourced. Listing only what is cited would let a
 *    reader assume the rest is cited too, which for a product about plants people take
 *    outdoors is a worse failure than looking thin.
 */
export function SourcesSection({ herb }: { herb: Herb }) {
  const entryLevel = resolveRefs(herb.sources);
  const { cited, awaiting } = sectionCitations(herb.sectionSources);
  const claims = claimCitations(herb.claimSources);
  const total = countSources(herb);

  if (total === 0) return null;

  return (
    <details className="panel p-5">
      <summary className="cursor-pointer text-sm font-bold tracking-wide text-gold-400 uppercase">
        Sources ({total})
      </summary>

      {entryLevel.length > 0 && (
        <ul className="mt-3 space-y-3">
          {entryLevel.map((entry) => (
            <li key={entry.source.id + (entry.detail ?? '')}>
              <Citation entry={entry} />
            </li>
          ))}
        </ul>
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
          {awaiting.length === 7
            ? 'every section here is transcribed from the card, with no independent reference yet.'
            : `${awaiting.length} sections here are transcribed from the card, with no independent reference yet.`}{' '}
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
