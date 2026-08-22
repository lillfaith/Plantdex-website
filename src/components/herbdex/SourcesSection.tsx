import type { SourceRef } from '@/lib/types';
import { formatCitation, resolveRefs } from '@/lib/sources';

/**
 * "Sources & Further Reading".
 *
 * Renders only references that resolve to a *verified* registry entry, so an unchecked
 * citation cannot borrow the credibility of a real one. If nothing resolves, the section
 * does not render at all rather than showing an empty shell.
 */
export function SourcesSection({ refs }: { refs: SourceRef[] | undefined }) {
  const resolved = resolveRefs(refs);
  if (resolved.length === 0) return null;

  return (
    <section aria-labelledby="sources-heading" className="panel p-5">
      <h2 id="sources-heading" className="text-sm font-bold tracking-wide text-gold-400 uppercase">
        Sources &amp; further reading
      </h2>
      <p className="mt-1 mb-3 text-xs text-violet-400">
        Where the information on this page comes from.
      </p>
      <ul className="space-y-3">
        {resolved.map(({ source, detail }) => (
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
      <p className="mt-4 border-t border-violet-700/50 pt-3 text-xs leading-relaxed text-violet-400">
        Traditional and historical use describes how a plant has been used, not evidence
        that it works. Where a plant has been studied, that research is cited separately.
      </p>
    </section>
  );
}
