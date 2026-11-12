import Link from 'next/link';
import { collectibleBelowLeader, type CandidateCardView } from '@/lib/scan-summary';
import { combinedSupport, type SupportCandidate } from '@/lib/card-support';
import { getCatalogueEntry } from '@/lib/catalogue';

/**
 * "One of these has a card" — shown only when the identifier's leading answer does not.
 *
 * IT SIGNPOSTS; IT DOES NOT PROMOTE. The ranking, the scores and the scan's outcome are all
 * untouched — see `collectibleBelowLeader` for why that distinction is the whole design. The
 * wording has to carry it too: it says the card EXISTS among the suggestions, names which
 * one, and sends the player to check the plant against it. It must never say the plant has
 * been identified as that species, because the identifier did not say so.
 */
export function CollectibleBelowLeader({
  candidates,
}: {
  candidates: readonly (CandidateCardView & { scientificName: string })[];
}) {
  const index = collectibleBelowLeader(candidates);
  if (index === null) return null;

  const candidate = candidates[index];
  const herbId = candidate?.match.herbId;
  const herb = herbId ? getCatalogueEntry(herbId) : null;
  if (!herb || !candidate) return null;

  return (
    <p className="mt-4 rounded-xl border border-violet-600/50 bg-plum-800/60 p-3 text-xs leading-relaxed text-violet-200">
      <span
        aria-hidden="true"
        className="mr-2 inline-block h-2.5 w-2.5 shrink-0 border-2 border-violet-400 bg-violet-400 align-middle"
      />
      <span className="font-semibold text-violet-100">
        Plantdex has a card among these suggestions — {herb.commonName}
      </span>{' '}
      {/*
        NAMED AS A LOWER-RANKED SUGGESTION, DELIBERATELY. The identifier put something else
        first, and a line that hid that would be the collection quietly overruling it.
      */}
      (<span className="font-botanical italic">{candidate.scientificName}</span>, not the
      identifier&rsquo;s leading answer). Compare the plant with{' '}
      <Link
        href={`/herbdex/${herb.id}`}
        className="font-semibold text-gold-400 underline-offset-2 hover:underline"
      >
        its card
      </Link>{' '}
      before you record anything.
    </p>
  );
}

/**
 * "Several of these names are the same plant" — the figure a reader thought they were
 * already being shown.
 *
 * A provider splits its mass across NAMES, and several names routinely mean one card, so a
 * correct identification can lead at 45% while 68% of the ranking points at that card. See
 * `card-support.ts` for why adding those shares is description rather than inflation.
 *
 * Shown only when more than one name contributes; otherwise it would restate a number
 * already on the row above it.
 */
export function CombinedSupport({ candidates }: { candidates: readonly SupportCandidate[] }) {
  const support = combinedSupport(candidates);
  if (!support) return null;

  const herb = getCatalogueEntry(support.herbId);
  if (!herb) return null;

  return (
    <p className="mt-3 rounded-xl border border-violet-600/50 bg-plum-800/60 p-3 text-xs leading-relaxed text-violet-200">
      <span className="font-semibold text-violet-100">
        {support.names.length} of these suggestions are names for {herb.commonName} —{' '}
        <span className="text-gold-400">{Math.round(support.share * 100)}%</span> of the
        ranking between them.
      </span>{' '}
      {/*
        The caveat travels WITH the number, not in grey text at the foot of the list. A
        combined share is no more calibrated than the parts it was added from, and this is
        the one line most likely to be read as a probability.
      */}
      Still a ranking rather than a calibrated probability, and still worth checking the
      plant against the card.
    </p>
  );
}
