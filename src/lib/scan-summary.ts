import { getCatalogueEntry } from './catalogue';
import { speciesConfidenceForProvider } from './identification-confidence';
import type { ProviderId } from './identification-types';
import { genusOf, taxonRank, type ScanCandidate } from './plant-match';

/**
 * WHAT THE EVIDENCE ACTUALLY SUPPORTS, IN A SENTENCE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SCAN SCREEN HAD NO ANSWER, ONLY A LIST. A player who photographed a wood sorrel got
 * five ranked binomials and was left to work out for themselves that the identifier agreed
 * on the genus and disagreed on the species. That conclusion is derivable from the result,
 * so the product should be the one drawing it.
 *
 * THREE LEVELS, AND THE RULE IS "CLAIM THE HIGHEST ONE THE RESULT SUPPORTS":
 *
 *   species  one candidate is a species AND clears the provider's own `high` band.
 *   genus    the plausible field agrees on a genus, even though the species does not settle.
 *   none     neither holds. The list is still shown; nothing is claimed above it.
 *
 * EVERY THRESHOLD HERE IS BORROWED, NEVER INVENTED. The species test is
 * `speciesConfidenceForProvider`, which is the same per-provider band the rest of the app
 * reads and which returns `unresolved` above species rank whatever the number. This module
 * adds exactly one rule of its own — `PLAUSIBLE_SHARE` — and it is RELATIVE for the reason
 * `outcomeFor` already gives: a provider's absolute score falls as the genus gets bigger,
 * because confidence is divided among congeners, so an absolute cut would be stricter on
 * exactly the large genera where a genus-level answer is most useful.
 *
 * NOTHING HERE READS CARD ELIGIBILITY TO DECIDE WHAT IS TRUE. `deckVernacularForGenus` is
 * the single place the deck is consulted, and it only supplies a NAME for a genus the
 * candidates already agreed on by rank and score. Remove every card from the deck and this
 * module reaches the same level, the same genus and the same ordering — only the wording
 * loses a vernacular. That is the property `scan-summary.test.ts` pins, and it is what keeps
 * "Plantdex has a card for this" from leaking into "this is what the plant is".
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type SummaryLevel = 'species' | 'genus' | 'none';

export interface ScanSummary {
  readonly level: SummaryLevel;
  /** The lead line. Names a taxon only at `level`, never below it. */
  readonly headline: string;
  /** The taxonomic line under it — what is settled and what is not. */
  readonly qualifier: string;
  /** One sentence of plain English explaining the level. */
  readonly detail: string;
  /** The genus claimed, capitalised, when `level` is `genus`. */
  readonly genus?: string;
}

/**
 * A candidate is PLAUSIBLE when it scores at least this share of the leader.
 *
 * Half. Chosen so that the wood sorrel case — 0.45 leading, 0.23 behind it — counts the
 * runner-up as a live alternative, which is precisely why that result may not claim a
 * species. Relative rather than absolute, see the module note.
 */
export const PLAUSIBLE_SHARE = 0.5;

/** Candidates within `PLAUSIBLE_SHARE` of the leader: the field still genuinely in play. */
export function plausibleField(candidates: readonly ScanCandidate[]): readonly ScanCandidate[] {
  const top = candidates[0];
  if (!top) return [];
  const floor = top.score * PLAUSIBLE_SHARE;
  return candidates.filter((candidate) => candidate.score >= floor);
}

/**
 * `Oxalis stricta` -> `Oxalis`, `Sambucus spp.` -> `Sambucus`. Empty when the name carries no
 * genus.
 *
 * Moved here from `scan-ambiguity.ts`, which this change emptied: that module existed because
 * the scan list used to be HEADED by the card's common name, so two Sambucus rows both read
 * "Elderberry" and had to be detected and swapped. Rows are headed by the binomial now, so
 * there is nothing left to detect — the duplicate-name case cannot be drawn. The genus prose
 * it also held is still wanted, and this is the module that already computes it.
 */
export function genusLabel(scientificName: string): string {
  const genus = genusOf(scientificName);
  return genus ? genus.replace(/^./, (letter) => letter.toUpperCase()) : '';
}

/**
 * The deck's own word for a genus — and ONLY when the deck is unambiguous about it.
 *
 * Used for naming and never for ranking. A genus that several candidates share, where every
 * one of those candidates that resolves to a card resolves to the SAME card, may borrow that
 * card's common name: "Oxalis" and "wood sorrel" are two names for one group, and the second
 * is the one a person recognises. Two different cards in the genus means the deck has no
 * single word for it, so none is offered rather than one being picked.
 *
 * THIS CANNOT PROMOTE A SPECIES. It is reached only after the level has been decided, it
 * names the genus rather than any member of it, and the row ordering never sees it.
 */
export function deckVernacularForGenus(
  candidates: readonly ScanCandidate[],
  genus: string,
): string | undefined {
  const ids = new Set<string>();
  for (const candidate of candidates) {
    if (genusLabel(candidate.scientificName) !== genus) continue;
    const herbId = candidate.match.herbId;
    if (herbId) ids.add(herbId);
  }
  if (ids.size !== 1) return undefined;
  const [herbId] = [...ids];
  return getCatalogueEntry(herbId!)?.commonName;
}

/** The provider that answered, defaulting to the one an older record would have used. */
export function providerOf(provider: string | undefined): ProviderId {
  return provider === 'plantid' ? 'plantid' : 'plantnet';
}

/**
 * Summarise a result set.
 *
 * Reads the candidates in the order the provider ranked them and never reorders them. The
 * leader is `candidates[0]` because that is the identifier's own answer — the same authority
 * `outcomeFor` uses, and for the same reason.
 */
export function summariseScan(
  candidates: readonly ScanCandidate[],
  provider: string | undefined,
): ScanSummary {
  const top = candidates[0];
  if (!top) {
    return {
      level: 'none',
      headline: 'No suggestions came back',
      qualifier: 'Nothing to compare',
      detail: 'The identifier returned no candidates for these photos.',
    };
  }

  const providerId = providerOf(provider);
  const field = plausibleField(candidates);
  const genus = genusLabel(top.scientificName);

  /*
   * SPECIES, AND ONLY ON THE PROVIDER'S OWN HIGH BAND. `speciesConfidenceForProvider`
   * already refuses anything above species rank at any score, so a section named at 0.99
   * cannot reach this branch — which is the rule `speciesConfidenceFor` exists to state and
   * this module has no business restating.
   */
  /*
   * THE OBSERVED RANK WHERE THERE IS ONE, THE NAME'S OWN RANK WHERE THERE IS NOT. A scan
   * recorded before `observedTaxon` existed carries no rank, and defaulting those to
   * `unknown` would silently demote every historical result to "not sure" — a rendering bug
   * dressed as caution. `taxonRank` is the same function the normalizer used to fill the
   * field in the first place, so the fallback agrees with the record rather than guessing.
   */
  const rank = top.match.observedTaxon?.rank ?? taxonRank(top.scientificName);
  const confidence = speciesConfidenceForProvider(providerId, rank, top.score);
  if (confidence === 'high') {
    return {
      level: 'species',
      headline: `Looks like ${top.commonName ?? top.scientificName}`,
      qualifier: `${top.scientificName} · strongest single match`,
      detail:
        'The identifier put one species clearly ahead of the rest. Check it against the card before you record anything.',
      genus: genus || undefined,
    };
  }

  /*
   * GENUS, WHEN THE FIELD STILL IN PLAY AGREES ON ONE.
   *
   * Two ways to get here, and both are the same claim: either several live candidates share
   * a genus, or one candidate is far enough ahead that nothing else is live — in which case
   * the genus rests on that candidate alone, which is weaker than a species claim and
   * stronger than nothing.
   */
  const agrees = genus !== '' && field.every((candidate) => genusLabel(candidate.scientificName) === genus);
  if (agrees) {
    const vernacular = deckVernacularForGenus(candidates, genus);
    return {
      level: 'genus',
      genus,
      headline: vernacular ? `Looks like a ${vernacular.toLowerCase()}` : `Looks like a ${genus} of some kind`,
      qualifier: `Genus: ${genus} · exact species uncertain`,
      /*
       * TWO WAYS TO BE UNSURE ABOUT A SPECIES, AND THEY DO NOT READ THE SAME. "Several close
       * matches" is false of a result whose leader is alone out in front — which is the
       * ordinary shape in a large genus, where the score is divided among congeners and a
       * decided identifier still returns 0.30.
       */
      detail:
        field.length > 1
          ? "Plantdex found several close matches, but the photos don't support choosing an exact species confidently yet."
          : "The identifier settled on the genus, but isn't confident enough about which species within it.",
    };
  }

  /*
   * NEITHER. The live candidates disagree about the genus, so naming one would be picking a
   * side the evidence has not picked. The list below still carries everything the identifier
   * said, in its order.
   */
  return {
    level: 'none',
    headline: 'Not sure what this is yet',
    qualifier: 'No taxon is well enough supported to name',
    detail:
      "The suggestions below disagree with each other, so Plantdex won't put a name to this. They are listed in the identifier's own order, strongest first.",
  };
}

/**
 * WHAT WOULD ACTUALLY IMPROVE THIS ANSWER, WHEN THERE IS SOMETHING TO SAY.
 *
 * Silent on a confident species — there is nothing to fix — and silent about the third photo
 * when the third photo was already taken, because a suggestion somebody has already followed
 * reads as the app not having looked. That tailoring is the whole point: the generic version
 * of this line is advice, and advice that ignores what you just did is noise.
 */
export function improvementHint(
  level: SummaryLevel,
  hasFeaturePhoto: boolean,
): string | undefined {
  if (level === 'species') return undefined;
  return hasFeaturePhoto
    ? 'Try another angle, or a photo of a different part — a flower, fruit, seed head, stem or bark each narrow it differently.'
    : 'Add a clear photo of a flower, fruit, seed head, stem or bark. A distinctive feature separates close relatives faster than more leaf shots.';
}
