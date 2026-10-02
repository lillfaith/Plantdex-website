import { badgeExplanation, type RegionalStatus } from '@/lib/invasive-status';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * A regional invasive listing, shown compactly on a plant profile.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT IS NOT STYLED AS A SAFETY WARNING, AND THAT IS THE POINT.
 *
 * Three colour families are already spoken for on this page and each means something:
 *
 *   red (`stat-temp`)    a hazard in the plant — printed warning, added caution, withdrawn
 *                        instruction, lookalike that could put somebody in hospital
 *   gold                 general herbal safety framing, and the contamination note
 *   violet / plum        an informational note about this card (`CardIssueNote`)
 *
 * Being invasive is not a risk to the reader. It is a fact about the plant's standing in a
 * place, and it mostly changes how somebody harvests rather than whether they should. Borrowing
 * red for it would put an ecological note at the same weight as "this looks like a plant that
 * can kill you", and the next real warning is what pays for that. So it takes the violet
 * informational treatment, which is the family whose meaning already fits.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE REGION IS IN THE CHIP, NOT JUST IN THE SENTENCE. `INVASIVE — GEORGIA` is the part that
 * gets skimmed, and an unqualified `INVASIVE` chip is exactly the universal claim the data
 * model exists to prevent. A reader in Oregon must be able to see at a glance that this is a
 * statement about Georgia.
 *
 * THE SOURCE IS NAMED AND LINKED, because the badge asserts something contestable about a
 * plant somebody may be standing in front of, and "considered invasive" is only meaningful if
 * the reader can see who considers it so. Same standard as the card's own citations.
 */
export function InvasiveBadge({ claim }: { claim: RegionalStatus }) {
  return (
    <aside
      aria-labelledby="invasive-heading"
      className="rounded-xl border border-violet-600/70 bg-plum-700/70 px-3 py-2.5"
    >
      <h2
        id="invasive-heading"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold tracking-wide text-violet-100 uppercase"
      >
        <PlantdexIcon name="leaves" className="shrink-0 text-sm text-violet-300" />
        {/*
          An em dash joins the two halves of one label rather than separating two chips: the
          status and the region are a single claim and must not be able to wrap apart into
          something that reads as a bare `INVASIVE`.
        */}
        <span className="whitespace-nowrap">
          Invasive &mdash; {claim.region}
        </span>
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-violet-200">
        {badgeExplanation(claim)}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-violet-300">
        {/*
          PROVENANCE, AND NOTHING ELSE AFTER IT. The badge renders at most ~240 characters: the
          chip, the sentence a forager can act on, and who says so. It previously also printed
          the species note and the authority's full tier definition, which took it past 500 and
          turned a marker into a passage.

          BOTH ARE STILL IN THE DATA. `claim.note` and `claim.category` — the tier's wording
          verbatim, which is the authority's current terminology and the thing that must not be
          translated into a category number — are recorded in `invasive-status.ts` and pinned by
          tests. What changed is how much of the evidence the badge prints, not how much of it
          is kept. The link goes to the list itself.

          The taxon is printed because on a genus card it is the difference between a true
          statement and a false one, and it costs one word in the ordinary case.
        */}
        Listed as <span className="italic">{claim.taxon}</span> by{' '}
        <a
          href={claim.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-400 underline underline-offset-2 hover:text-gold-300"
        >
          {claim.source.name}
        </a>
        .
      </p>
    </aside>
  );
}
