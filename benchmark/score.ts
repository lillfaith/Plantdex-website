/**
 * Scoring the identification benchmark — with the matcher that ships, never a copy of it.
 *
 * `scripts/identify_web_images.py` talks to the network and writes down what came back. It
 * deliberately decides nothing, because deciding whether an answer was RIGHT means applying
 * `matchScientificName` and `outcomeFor`, and a second implementation of those in Python
 * would be free to disagree with the one a player actually meets. So the raw record goes
 * through the real modules here.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FOUR DIFFERENT QUESTIONS, AND THEY HAVE DIFFERENT ANSWERS.
 *
 *   topSpeciesCorrect  Did the PROVIDER lead with this plant's species? A question about
 *                      PlantNet or plant.id, and nothing to do with the deck.
 *   topCardCorrect     Did PLANTDEX offer the right outcome? For a deck species that is the
 *                      expected card, confirmable, in first place. For a species with no
 *                      card it is the OPPOSITE: offering no card at all, because the Seed
 *                      Shelf is the correct answer and a card here would be a false one.
 *   cardAnywhere       Was the right card reachable further down the list? Only meaningful
 *                      for a deck species. A player scrolls, so this is the ceiling the UI
 *                      could reach; the gap between it and topCardCorrect is what ranking
 *                      costs.
 *   topCardWrong       Did Plantdex offer a card that is not this plant, in first place,
 *                      with a confirm button under it? THE ONE THAT MATTERS. A miss sends
 *                      somebody to the shelf; this writes a false discovery into their
 *                      collection from one tap.
 *
 * Those are reported separately and must never be added together into an "accuracy".
 */

import {
  confidenceBand,
  genusOf,
  matchScientificName,
  normalizeName,
  outcomeFor,
  speciesConfidenceFor,
  type ConfidenceBand,
  type ScanCandidate,
  type ScanOutcome,
  type SpeciesConfidence,
} from '@/lib/plant-match';

export interface BenchmarkTruth {
  /** The species the photographs are of, as the manifest states it. */
  scientificName: string;
  /**
   * The card a correct identification reaches, or null when the right answer is no card.
   *
   * OPTIONAL, AND DERIVED WHEN ABSENT. A field manifest states what the PLANT is; it does
   * not state which card that ought to reach, and it must not — that is a question for
   * `matchScientificName`, and a hand-written column would be somebody's opinion of the
   * answer, free to disagree with the code that actually decides it. `expectedFor` below
   * asks the real matcher.
   */
  expectedHerbId?: string | null;
  /**
   * `species`, `genus` or `family`. Genus- and family-level truth is honest rather than
   * lazy: Solidago and the asters cannot be settled from a phone photograph, and a guess
   * in the denominator would be scored as a provider failure.
   */
  rank?: string;
}

/**
 * Which card a CORRECT identification of this species should reach, asked of the matcher
 * that ships rather than written down beside the photographs.
 *
 * It resolves the truth name exactly as a provider answer would be resolved, which is what
 * makes the expectation and the outcome comparable: both went through the same rules.
 */
export function expectedFor(truth: BenchmarkTruth): string | null {
  if (truth.expectedHerbId !== undefined) return truth.expectedHerbId;
  const match = matchScientificName(truth.scientificName);
  return match.confirmable ? (match.herbId ?? null) : null;
}

/** A provider answer, flattened from either the response or a comparison row. */
export interface RawCandidate {
  scientificName: string;
  score: number;
}

export interface Verdict {
  outcome: ScanOutcome;
  /** Null when the ground truth is family-level and says nothing about the species. */
  topSpeciesCorrect: boolean | null;
  topCardCorrect: boolean;
  /** Null for a species with no card: there is no card to find further down the list. */
  cardAnywhere: boolean | null;
  topCardWrong: boolean;
  topName: string | null;
  topScore: number | null;
  band: ConfidenceBand | null;
  speciesConfidence: SpeciesConfidence | null;
  /** The species the provider led with, when it was not the right one. */
  confusedWith: string | null;
}

export function candidatesOf(raw: readonly RawCandidate[]): ScanCandidate[] {
  /*
   * EXACTLY what `readScan` in src/lib/scans.ts builds, and for the same reason: the match is
   * derived from the provider's own string, once, and everything downstream reads the result.
   */
  return raw.map((candidate) => ({
    scientificName: candidate.scientificName,
    score: candidate.score,
    match: matchScientificName(candidate.scientificName),
  }));
}

export function score(raw: readonly RawCandidate[], truth: BenchmarkTruth): Verdict {
  const candidates = candidatesOf(raw);
  const outcome = outcomeFor(candidates);
  const top = candidates[0];
  const expected = expectedFor(truth);

  if (!top) {
    return {
      outcome,
      topSpeciesCorrect: false,
      // Recognising nothing is the RIGHT answer for no species: a plant with no card is
      // still a plant, and the shelf wants its name.
      topCardCorrect: false,
      cardAnywhere: expected === null ? null : false,
      topCardWrong: false,
      topName: null,
      topScore: null,
      band: null,
      speciesConfidence: null,
      confusedWith: null,
    };
  }

  /*
   * SPECIES AGREEMENT IS MEASURED ON THE LOOKUP KEY, which is the one place in this file
   * that is allowed to. `normalizeName` drops authorship and folds the synonymous section
   * names together, so `Bellis perennis L.` and `Bellis perennis` agree — and it is NOT
   * being stored anywhere, which is the rule it must never break.
   */
  /*
   * RANK-AWARE, BECAUSE THE TRUTH IS NOT ALWAYS A SPECIES.
   *
   * Comparing keys outright would score `Solidago canadensis` as WRONG against a truth of
   * `Solidago` — punishing the provider for being more precise than the observer could be.
   * At genus truth the comparison is on the genus; at family truth nothing at species level
   * is claimed, so this is null and the rate is reported over a smaller denominator rather
   * than quietly counting a row it cannot judge.
   */
  const truthRank = (truth.rank ?? 'species').toLowerCase();
  const topSpeciesCorrect =
    truthRank === 'family'
      ? null
      : truthRank === 'genus'
        ? genusOf(top.scientificName) === genusOf(truth.scientificName)
        : normalizeName(top.scientificName) === normalizeName(truth.scientificName);
  const offersACard = top.match.confirmable;
  const topCardCorrect =
    expected === null ? !offersACard : offersACard && top.match.herbId === expected;
  const topCardWrong =
    expected === null ? offersACard : offersACard && top.match.herbId !== expected;

  const rank = top.match.observedTaxon?.rank;

  return {
    outcome,
    topSpeciesCorrect,
    topCardCorrect,
    cardAnywhere:
      expected === null
        ? null
        : candidates.some(
            (candidate) => candidate.match.confirmable && candidate.match.herbId === expected,
          ),
    topCardWrong,
    topName: top.scientificName,
    topScore: top.score,
    band: confidenceBand(top.score),
    speciesConfidence: rank ? speciesConfidenceFor(rank, top.score) : null,
    confusedWith:
      topSpeciesCorrect === false
        ? normalizeName(top.scientificName) || top.scientificName
        : null,
  };
}

export interface Tally {
  n: number;
  topSpeciesCorrect: number;
  /** Denominator for topSpeciesCorrect: rows whose truth is precise enough to judge it. */
  topSpeciesOf: number;
  topCardCorrect: number;
  cardAnywhere: number;
  /** Denominator for cardAnywhere: sets that have a card to find. */
  cardAnywhereOf: number;
  topCardWrong: number;
  outcomes: Record<ScanOutcome, number>;
  bands: Record<ConfidenceBand, number>;
  speciesConfidence: Record<SpeciesConfidence, number>;
  scores: number[];
}

export function emptyTally(): Tally {
  return {
    n: 0,
    topSpeciesCorrect: 0,
    topSpeciesOf: 0,
    topCardCorrect: 0,
    cardAnywhere: 0,
    cardAnywhereOf: 0,
    topCardWrong: 0,
    outcomes: { matched: 0, uncertain: 0, relatedOnly: 0, noMatch: 0 },
    bands: { strong: 0, moderate: 0, weak: 0 },
    speciesConfidence: { high: 0, moderate: 0, low: 0, unresolved: 0 },
    scores: [],
  };
}

export function add(tally: Tally, verdict: Verdict): Tally {
  tally.n += 1;
  if (verdict.topSpeciesCorrect !== null) {
    tally.topSpeciesOf += 1;
    if (verdict.topSpeciesCorrect) tally.topSpeciesCorrect += 1;
  }
  if (verdict.topCardCorrect) tally.topCardCorrect += 1;
  if (verdict.topCardWrong) tally.topCardWrong += 1;
  if (verdict.cardAnywhere !== null) {
    tally.cardAnywhereOf += 1;
    if (verdict.cardAnywhere) tally.cardAnywhere += 1;
  }
  tally.outcomes[verdict.outcome] += 1;
  if (verdict.band) tally.bands[verdict.band] += 1;
  if (verdict.speciesConfidence) tally.speciesConfidence[verdict.speciesConfidence] += 1;
  if (verdict.topScore !== null) tally.scores.push(verdict.topScore);
  return tally;
}

/**
 * A rate with its 95% Wilson interval, because a rate without one invites a decision the
 * sample cannot support.
 *
 * 10 of 12 is 83%, and its interval runs from roughly 55% to 95% — so a benchmark of twelve
 * sets can tell "mostly works" from "mostly does not" and cannot tell 83% from 70%. Printing
 * the interval beside every rate is what stops the pilot's headline number being quoted as
 * though it were the full run's.
 */
export function rate(hits: number, of: number): { pct: number; low: number; high: number } {
  if (of === 0) return { pct: 0, low: 0, high: 0 };
  const p = hits / of;
  const z = 1.96;
  const denominator = 1 + (z * z) / of;
  const centre = (p + (z * z) / (2 * of)) / denominator;
  const spread = (z * Math.sqrt((p * (1 - p)) / of + (z * z) / (4 * of * of))) / denominator;
  return {
    pct: p * 100,
    low: Math.max(0, centre - spread) * 100,
    high: Math.min(1, centre + spread) * 100,
  };
}

/**
 * McNemar's discordant counts for two conditions over the SAME sets.
 *
 * The paired comparison is the reason a small benchmark is worth running at all. Comparing
 * two independent rates of 12 throws away the pairing and needs a huge difference to say
 * anything; counting only the sets where the two conditions DISAGREE — b succeeded where a
 * failed, and the reverse — uses the design. A 10-set run with 6 discordant pairs splitting
 * 6-0 is a real signal; the same 10 sets read as two independent rates are not.
 */
export function discordant(
  a: readonly boolean[],
  b: readonly boolean[],
): { aOnly: number; bOnly: number; both: number; neither: number } {
  let aOnly = 0;
  let bOnly = 0;
  let both = 0;
  let neither = 0;
  a.forEach((one, index) => {
    const other = b[index] ?? false;
    if (one && other) both += 1;
    else if (one) aOnly += 1;
    else if (other) bOnly += 1;
    else neither += 1;
  });
  return { aOnly, bOnly, both, neither };
}
