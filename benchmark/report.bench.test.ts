/**
 * THE IDENTIFICATION ACCURACY REPORT.
 *
 * Reads what `scripts/identify_web_images.py` recorded and scores it with the matcher that
 * ships. It is a report wearing a test's clothes, for two reasons: the repo already has the
 * TypeScript, the `@/` alias and the runner, and scoring with anything but the real
 * `matchScientificName` / `outcomeFor` would measure a copy of the product.
 *
 * IT ASSERTS NOTHING ABOUT ACCURACY, deliberately. Every threshold in this system —
 * `confidenceBand`, `SIGHTINGS_FOR_MASTERY`, the `IDENTIFY_PROFILE` edge, whether the third
 * photograph is worth asking for — is a number this benchmark exists to INFORM. A test that
 * failed on one would be the benchmark grading itself against a figure nobody has evidence
 * for yet, and the first thing anybody would do is move the figure. The assertions here are
 * about the RECORDING: that every request is accounted for, that no set was silently
 * dropped, and that a run claiming to compare providers actually has both providers' rows.
 *
 * Run: npx vitest run --config vitest.bench.config.ts
 */

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { matchScientificName } from '@/lib/plant-match';

import {
  add,
  discordant,
  emptyTally,
  expectedFor,
  rate,
  score,
  type BenchmarkTruth,
  type RawCandidate,
  type Tally,
  type Verdict,
} from './score';

const RESULTS = process.env.BENCH_RESULTS ?? 'benchmark-results.jsonl';
const COMPARISONS = process.env.BENCH_COMPARISONS ?? 'benchmark-comparisons.json';

interface Record_ {
  setId: string;
  condition: string;
  truth: BenchmarkTruth;
  sameIndividual: boolean;
  source: string;
  certainty?: string;
  class?: string;
  signedIn: boolean;
  comparing: boolean;
  images: { title: string; organ: string; bytes: number }[];
  http: number;
  response: {
    /*
     * `rank` is the PROVIDER'S OWN word for how precise its answer is, carried through
     * untouched by `identify-plant`. It was in the recording from the first run and nothing
     * printed it, which is how a report can hold the answer to a question and still not
     * answer it — the Goldenrod scope decision turns on whether PlantNet replies at species
     * or genus rank, and only the full dump below can say.
     */
    candidates?: { scientificName: string; score: number; rank?: string }[];
    observationId?: string;
    provider?: string;
    code?: string;
    error?: string;
    notAPlant?: boolean;
    providerFoundNothing?: boolean;
  };
}

interface ComparisonRow {
  observation_id: string;
  provider: 'plantnet' | 'plantid';
  candidates: { scientificName: string; probability: number }[];
  failure?: string | null;
}

function readRecords(): Record_[] {
  if (!existsSync(RESULTS)) return [];
  return readFileSync(RESULTS, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record_);
}

function readComparisons(): ComparisonRow[] {
  if (!existsSync(COMPARISONS)) return [];
  return JSON.parse(readFileSync(COMPARISONS, 'utf8')) as ComparisonRow[];
}

const records = readRecords();
const comparisons = readComparisons();

/** Order a table reads in, rather than whichever condition happened to run first. */
const CONDITION_ORDER = ['p1', 'p2', 'p3auto', 'p3tag'];
const CONDITION_MEANING: Record<string, string> = {
  p1: '1 photograph (habit). Needs a deployment whose MIN_IMAGES is below 2.',
  p2: "2 photographs (habit, leaf). The app's minimum.",
  p3auto: '3 photographs, third tagged `auto`. EXACTLY what the app sends today.',
  p3tag: '3 photographs, third tagged with the organ it really is.',
};

function pct(hits: number, of: number): string {
  const { pct: value, low, high } = rate(hits, of);
  if (of === 0) return '    n/a';
  return `${value.toFixed(0).padStart(3)}%  [${low.toFixed(0)}-${high.toFixed(0)}]  ${hits}/${of}`;
}

function spread(scores: number[]): string {
  if (scores.length === 0) return 'no scores';
  const sorted = [...scores].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  return `min ${sorted[0]!.toFixed(2)}  p25 ${at(0.25).toFixed(2)}  median ${at(0.5).toFixed(
    2,
  )}  p75 ${at(0.75).toFixed(2)}  max ${sorted[sorted.length - 1]!.toFixed(2)}`;
}

function verdictFor(record: Record_): Verdict {
  const raw: RawCandidate[] = (record.response.candidates ?? []).map((candidate) => ({
    scientificName: candidate.scientificName,
    score: candidate.score,
  }));
  return score(raw, record.truth);
}

function reportTally(label: string, tally: Tally): void {
  console.log(`\n  ${label}   (${tally.n} sets)`);
  console.log(
    `    provider led with the right species   ${pct(tally.topSpeciesCorrect, tally.topSpeciesOf)}`,
  );
  console.log(`    Plantdex offered the right outcome    ${pct(tally.topCardCorrect, tally.n)}`);
  console.log(
    `    right card anywhere in the list       ${pct(tally.cardAnywhere, tally.cardAnywhereOf)}`,
  );
  console.log(
    `    WRONG card offered in first place     ${pct(tally.topCardWrong, tally.n)}   <- the one that writes a false find`,
  );
  const outcomes = Object.entries(tally.outcomes)
    .map(([name, count]) => `${name} ${count}`)
    .join('   ');
  console.log(`    outcome                               ${outcomes}`);
  const bands = Object.entries(tally.bands)
    .map(([name, count]) => `${name} ${count}`)
    .join('   ');
  console.log(`    confidence band of the leader         ${bands}`);
  const species = Object.entries(tally.speciesConfidence)
    .map(([name, count]) => `${name} ${count}`)
    .join('   ');
  console.log(`    species-level confidence              ${species}`);
  console.log(`    leading score                         ${spread(tally.scores)}`);
}

describe.skipIf(records.length === 0)('identification accuracy benchmark', () => {
  it('states what this run can and cannot support', () => {
    const sets = new Set(records.map((one) => one.setId));
    const conditions = new Set(records.map((one) => one.condition));
    const sameIndividual = records.filter((one) => one.sameIndividual).length;

    console.log('\n================================================================');
    console.log('IDENTIFICATION ACCURACY BENCHMARK');
    console.log('================================================================');
    console.log(`  ${records.length} requests   ${sets.size} sets   ${conditions.size} conditions`);
    console.log(`  source: ${RESULTS}`);
    const fieldRows = records.filter((one) => one.source === 'field').length;
    console.log('\n  LIMITS OF THIS EVIDENCE. Read these before quoting a number.');
    console.log(
      fieldRows === records.length
        ? '   - These ARE phone photographs taken in the field, so the usual caveat does not\n' +
            '     apply: no upper-bound correction is needed. What remains is that they are one\n' +
            '     person, one area, one season.'
        : '   - Wikimedia photographs are CLEANER than what a player sends: framed, in focus,\n' +
            '     often by somebody who knew what the plant was. Every rate below is therefore\n' +
            '     an UPPER BOUND on field performance, not an estimate of it.',
    );
    console.log(
      `   - ${sameIndividual} of ${records.length} requests used photographs of ONE individual.` +
        (sameIndividual === records.length
          ? '\n     ALL of them, so the photo-count axis is measuring what the app actually\n' +
            '     sends: several views of one plant. This is the arm the Commons run could not\n' +
            '     support.'
          : '\n     Where that is 0, the photo-count comparison handed the provider three\n' +
            '     DIFFERENT plants, which is not what the app sends — it may flatter three\n' +
            '     photographs (more variation) or penalise them (a blended answer). Treat the\n' +
            '     count axis as indicative until a set built from one specimen says otherwise.'),
    );
    const field = records.filter((one) => one.source === 'field').length;
    console.log(
      field === records.length
        ? '   - The ground truth is what the photographer wrote down BEFORE scanning. Rows\n' +
            '     marked `unsure` are reported separately and never counted as a provider\n' +
            '     failure; genus- and family-level truth is scored at that rank, not below it.'
        : '   - The ground truth is the Commons category name. A miscategorised file is a\n' +
            '     wrong answer scored as a provider failure.',
    );
    console.log(
      '   - The sample is small. Every rate carries a 95% interval; two rates whose intervals\n' +
        '     overlap have not been shown to differ.',
    );

    expect(sets.size).toBeGreaterThan(0);
  });

  it('accounts for every request, including the ones that failed', () => {
    const failed = records.filter((one) => one.http !== 200);
    console.log(`\n  HTTP: ${records.length - failed.length} answered, ${failed.length} did not`);
    for (const one of failed) {
      console.log(
        `    ${one.setId} / ${one.condition}: ${one.http} ${one.response.code ?? one.response.error ?? ''}`,
      );
    }
    const refused = failed.filter((one) => one.response.code === 'tooFewImages');
    if (refused.length) {
      console.log(
        `\n    ${refused.length} refused for too few images. The 1-photograph condition cannot\n` +
          '    run against a deployment whose MIN_IMAGES is 2. That is a recording of the\n' +
          '    question being unanswerable, not a result.',
      );
    }
    // Every request was written down. A silently dropped one is the failure mode that makes
    // a rate wrong rather than uncertain.
    expect(records.every((one) => typeof one.http === 'number')).toBe(true);
  });

  it('reports each condition', () => {
    const present = CONDITION_ORDER.filter((one) =>
      records.some((record) => record.condition === one),
    );
    console.log('\n----------------------------------------------------------------');
    console.log('BY CONDITION');
    console.log('----------------------------------------------------------------');
    for (const condition of present) {
      const answered = records.filter((one) => one.condition === condition && one.http === 200);
      if (answered.length === 0) {
        console.log(`\n  ${condition}   no answered request`);
        continue;
      }
      const tally = answered.reduce((acc, one) => add(acc, verdictFor(one)), emptyTally());
      reportTally(`${condition}  — ${CONDITION_MEANING[condition] ?? ''}`, tally);
    }
    expect(present.length).toBeGreaterThan(0);
  });

  it('compares conditions as PAIRS over the same sets', () => {
    console.log('\n----------------------------------------------------------------');
    console.log('PAIRED COMPARISONS  (same photographs, one thing changed)');
    console.log('----------------------------------------------------------------');
    console.log(
      '  Counts only the sets where the two conditions DISAGREE. Two rates of twelve tell\n' +
        '  you almost nothing; six discordant pairs splitting 6-0 tell you something.\n',
    );

    const byKey = new Map<string, Record_>();
    for (const one of records) {
      if (one.http === 200) byKey.set(`${one.setId}|${one.condition}`, one);
    }
    const setIds = [...new Set(records.map((one) => one.setId))];

    const pairs: [string, string][] = [
      ['p1', 'p2'],
      ['p2', 'p3auto'],
      ['p3auto', 'p3tag'],
    ];
    for (const [a, b] of pairs) {
      const left: boolean[] = [];
      const right: boolean[] = [];
      const names: string[] = [];
      for (const setId of setIds) {
        const one = byKey.get(`${setId}|${a}`);
        const other = byKey.get(`${setId}|${b}`);
        if (!one || !other) continue;
        left.push(verdictFor(one).topCardCorrect);
        right.push(verdictFor(other).topCardCorrect);
        names.push(setId);
      }
      if (left.length === 0) {
        console.log(`  ${a} vs ${b}: no set ran both`);
        continue;
      }
      const d = discordant(left, right);
      console.log(
        `  ${a} vs ${b}  over ${left.length} sets:  both right ${d.both}   both wrong ${d.neither}` +
          `   only ${a} ${d.aOnly}   only ${b} ${d.bOnly}`,
      );
      const moved = names.filter((_, index) => left[index] !== right[index]);
      if (moved.length) console.log(`     moved: ${moved.join(', ')}`);
    }
    expect(setIds.length).toBeGreaterThan(0);
  });

  it('prints every candidate, with the provider rank and what the matcher did with it', () => {
    /*
     * THE WHOLE LIST, NOT THE LEADER. Every rate in this report is computed from
     * `candidates[0]`, which is correct — `outcomeFor` reads rank at the top of the list and
     * that is what a player meets. But a scope decision is made from what the provider
     * ACTUALLY SAID, including the answers it ranked second and fifth, and the leader alone
     * cannot show that a card was one place away from being offered.
     *
     * Printed for every set rather than a chosen few: the moment it is a filter, the one
     * specimen somebody needed is the one that was filtered out.
     */
    console.log('\n----------------------------------------------------------------');
    console.log('FULL CANDIDATE LISTS  (provider name, score, provider rank, our verdict)');
    console.log('----------------------------------------------------------------');
    for (const setId of [...new Set(records.map((one) => one.setId))]) {
      const mine = records.filter((one) => one.setId === setId);
      const truth = mine[0]!.truth;
      console.log(
        `\n  ${setId}   truth: ${truth.scientificName}` +
          ` (${truth.rank ?? 'species'})  ->  ${expectedFor(truth) ?? 'no card (Seed Shelf)'}`,
      );
      for (const condition of CONDITION_ORDER) {
        const one = mine.find((record) => record.condition === condition);
        if (!one) continue;
        if (one.http !== 200) {
          console.log(`    ${condition}: HTTP ${one.http} ${one.response.code ?? ''}`);
          continue;
        }
        const raw = one.response.candidates ?? [];
        if (raw.length === 0) {
          console.log(`    ${condition}: the provider returned NO candidates`);
          continue;
        }
        console.log(`    ${condition}:`);
        raw.forEach((candidate, index) => {
          const match = matchScientificName(candidate.scientificName);
          const verdict = match.confirmable
            ? `CONFIRMABLE -> ${match.herbId} (${match.eligibility})`
            : `${match.kind}${match.herbId ? ` -> ${match.herbId}` : ''}`;
          console.log(
            `      ${index + 1}. ${candidate.scientificName.padEnd(34)}` +
              ` ${candidate.score.toFixed(3)}  rank=${(candidate.rank ?? '?').padEnd(8)} ${verdict}`,
          );
        });
      }
    }
    expect(records.length).toBeGreaterThan(0);
  });

  it('reports each set, so a species that keeps failing is visible', () => {
    console.log('\n----------------------------------------------------------------');
    console.log('BY SET');
    console.log('----------------------------------------------------------------');
    const setIds = [...new Set(records.map((one) => one.setId))];
    const confusions = new Map<string, number>();

    for (const setId of setIds) {
      const mine = records.filter((one) => one.setId === setId);
      const truth = mine[0]!.truth;
      /*
       * `expectedFor`, NOT `truth.expectedHerbId`. A field manifest carries no expected
       * card — it is DERIVED from the truth name by the real matcher — so reading the raw
       * field printed "no card (Seed Shelf)" against every specimen in the first field run,
       * including ones whose species the deck plainly carries. The SCORING was right
       * throughout; only this header line lied, which is the more dangerous shape of bug:
       * a reader checks the header, not the arithmetic.
       */
      const target = expectedFor(truth) ?? 'no card (Seed Shelf)';
      console.log(`\n  ${setId}   truth: ${truth.scientificName}  ->  ${target}`);
      for (const condition of CONDITION_ORDER) {
        const one = mine.find((record) => record.condition === condition);
        if (!one) continue;
        if (one.http !== 200) {
          console.log(`    ${condition.padEnd(7)} HTTP ${one.http} ${one.response.code ?? ''}`);
          continue;
        }
        const verdict = verdictFor(one);
        const mark = verdict.topCardWrong ? 'WRONG CARD' : verdict.topCardCorrect ? 'ok' : 'miss';
        console.log(
          `    ${condition.padEnd(7)} ${(verdict.topName ?? '(nothing)').padEnd(34)} ` +
            `${(verdict.topScore ?? 0).toFixed(3)}  ${verdict.outcome.padEnd(11)} ${mark}`,
        );
        if (verdict.confusedWith) {
          confusions.set(
            `${truth.scientificName} -> ${verdict.confusedWith}`,
            (confusions.get(`${truth.scientificName} -> ${verdict.confusedWith}`) ?? 0) + 1,
          );
        }
      }
    }

    console.log('\n  REPEATED CONFUSIONS  (leading answer was a different species)');
    const ranked = [...confusions.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked.length === 0) console.log('    none');
    for (const [pair, count] of ranked) {
      console.log(`    ${count}x  ${pair}`);
    }
    expect(setIds.length).toBeGreaterThan(0);
  });

  it('compares the two providers on identical photographs', () => {
    console.log('\n----------------------------------------------------------------');
    console.log('PROVIDER COMPARISON');
    console.log('----------------------------------------------------------------');

    if (comparisons.length === 0) {
      console.log(
        `  No ${COMPARISONS}. Run the harness again with COMPARISONS=1 to read the rows back,\n` +
          '  or the provider axis simply was not measured: the alternate provider\'s answer is\n' +
          "  never in the response, by design, so its absence here is expected without it.",
      );
      return;
    }

    const truthByObservation = new Map<string, BenchmarkTruth>();
    const setByObservation = new Map<string, string>();
    for (const one of records) {
      const observation = one.response.observationId;
      if (observation) {
        truthByObservation.set(observation, one.truth);
        setByObservation.set(observation, `${one.setId}/${one.condition}`);
      }
    }

    const byProvider = new Map<string, Tally>();
    const paired = new Map<string, Map<string, boolean>>();
    for (const row of comparisons) {
      const truth = truthByObservation.get(row.observation_id);
      if (!truth) continue;
      const verdict = score(
        (row.candidates ?? []).map((candidate) => ({
          scientificName: candidate.scientificName,
          score: candidate.probability,
        })),
        truth,
      );
      const tally = byProvider.get(row.provider) ?? emptyTally();
      byProvider.set(row.provider, add(tally, verdict));
      const slot = paired.get(row.observation_id) ?? new Map<string, boolean>();
      slot.set(row.provider, verdict.topCardCorrect);
      paired.set(row.observation_id, slot);
    }

    for (const [provider, tally] of byProvider) {
      reportTally(provider, tally);
    }

    const both = [...paired.entries()].filter(([, slot]) => slot.size === 2);
    if (both.length) {
      const d = discordant(
        both.map(([, slot]) => slot.get('plantnet') ?? false),
        both.map(([, slot]) => slot.get('plantid') ?? false),
      );
      console.log(
        `\n  PAIRED over ${both.length} observations:  both right ${d.both}   both wrong ${d.neither}` +
          `   only plantnet ${d.aOnly}   only plantid ${d.bOnly}`,
      );
      const moved = both
        .filter(([, slot]) => slot.get('plantnet') !== slot.get('plantid'))
        .map(([observation]) => setByObservation.get(observation) ?? observation);
      if (moved.length) console.log(`     disagreed on: ${moved.join(', ')}`);
    }

    /*
     * A run that says it compared providers and has rows for only one of them measured
     * nothing — most likely the alternate provider's key is unset on that deployment, which
     * comparison mode treats as "simply no second call" precisely so it can never fail a
     * scan. Here that silence would be read as a result, so it is an assertion.
     */
    const comparing = records.filter((one) => one.comparing && one.http === 200);
    if (comparing.length > 0) {
      expect([...byProvider.keys()].sort()).toEqual(['plantid', 'plantnet']);
    }
  });
});

describe.skipIf(records.length > 0)('identification accuracy benchmark', () => {
  it('has nothing to report', () => {
    console.log(
      `\n  No ${RESULTS}. Run:\n` +
        '    DRY_RUN=1 MANIFEST=scripts/benchmark/sets.json PROJECT_REF=... ANON_KEY=... \\\n' +
        '      python3 scripts/identify_web_images.py\n' +
        '  and drop DRY_RUN once the budget is approved.',
    );
    expect(records).toHaveLength(0);
  });
});
