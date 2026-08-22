import Link from 'next/link';
import type { Herb } from '@/lib/types';
import { formatCitation, resolveRefs, sectionCitations } from '@/lib/sources';

/**
 * "Sources & Further Reading".
 *
 * Renders only references that resolve to a *verified* registry entry, so an unchecked
 * citation cannot borrow the credibility of a real one.
 *
 * It also states what is NOT independently sourced. Listing only the citations that exist
 * would leave a reader to assume the rest are cited too — which, for a product about
 * plants people take outdoors, is a worse failure than looking thin. Right now that is
 * every section on every card: the deck is the source, and nothing has been added to it.
 */
export function SourcesSection({ herb }: { herb: Herb }) {
  const entryLevel = resolveRefs(herb.sources);
  const { cited, awaiting } = sectionCitations(herb.sectionSources);

  if (entryLevel.length === 0 && cited.length === 0) return null;

  return (
    <section aria-labelledby="sources-heading" className="panel p-5">
      <h2 id="sources-heading" className="text-sm font-bold tracking-wide text-gold-400 uppercase">
        Sources &amp; further reading
      </h2>
      <p className="mt-1 mb-3 text-xs text-violet-400">
        Where the information on this page comes from.
      </p>

      {entryLevel.length > 0 && (
        <ul className="space-y-3">
          {entryLevel.map(({ source, detail }) => (
            <li key={source.id + (detail ?? '')} className="text-sm">
              <p className="font-semibold text-violet-100">
                {source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-gold-400"
                  >
                    {formatCitation(source)}
                  </a>
                ) : (
                  formatCitation(source)
                )}
              </p>
              {detail && <p className="text-xs text-violet-300">{detail}</p>}
              {source.note && <p className="mt-0.5 text-xs text-violet-400">{source.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {/* Per-section citations, once verified ones exist for a given card. */}
      {cited.length > 0 && (
        <dl className="mt-4 space-y-2 border-t border-violet-700/50 pt-3">
          {cited.map(({ section, label, sources }) => (
            <div key={section} className="text-sm">
              <dt className="text-xs font-bold tracking-wide text-violet-300 uppercase">
                {label}
              </dt>
              <dd className="mt-0.5 space-y-1">
                {sources.map(({ source, detail }) => (
                  <p key={source.id + (detail ?? '')} className="text-xs text-violet-200">
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-gold-400"
                      >
                        {formatCitation(source)}
                      </a>
                    ) : (
                      formatCitation(source)
                    )}
                    {detail && <span className="text-violet-400"> — {detail}</span>}
                  </p>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {awaiting.length > 0 && (
        <p className="mt-4 border-t border-violet-700/50 pt-3 text-xs leading-relaxed text-violet-400">
          <span className="font-semibold text-violet-300">Awaiting independent sources:</span>{' '}
          {awaiting.length === 7
            ? 'every section on this page is transcribed from the physical card and carries no independent reference yet.'
            : `${awaiting.length} sections on this page are transcribed from the physical card and carry no independent reference yet.`}{' '}
          References appear here only once a person has read them and confirmed they support
          what they are attached to.{' '}
          <Link
            href="/safety"
            className="font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
          >
            How this works →
          </Link>
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-violet-400">
        Traditional and historical use describes how a plant has been used, not evidence
        that it works. Where a plant has been studied, that research is cited separately.
      </p>
    </section>
  );
}
