import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CHALLENGE_ACTIVITIES,
  CHALLENGE_DAILY_LIMIT,
  CHALLENGE_TRIAL_DAILY_LIMIT,
  PASS_MARKS,
  STAGE_RULES,
  revealsAnswersAtEndOnly,
  type ActivityId,
} from './boss-form';
import {
  ACTIVE_CHALLENGES,
  BOSS_SPECIES,
  CHALLENGE_BANK,
  speciesProblems,
  type BossSpecies,
  type ChallengeItem,
} from './challenge-bank';
import { blindClearProbability, guessPassProbability, stageGuessOdds } from './challenge-odds';
import {
  CHALLENGE_REVIEWS,
  READY_ASSETS,
  buildChallenge,
  evaluateSubmission,
  isServable,
  scoreSubmission,
  selectForAttempt,
} from './mastery-challenges';
import { hash, seeded } from './rng';

const DANDELION = 'taraxacum-officinale';
const DRAFT = { includeUnreviewed: true } as const;
const MASTERED = { mastered: true, completed: new Set<ActivityId>() };
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Exact chance by listing EVERY possible set of guesses. Independent of the dynamic programme. */
function bruteForce(optionCounts: readonly number[], need: number): number {
  let right = 0;
  let total = 0;
  const walk = (i: number, correct: number, weight: number) => {
    if (i === optionCounts.length) {
      total += weight;
      if (correct >= need) right += weight;
      return;
    }
    for (let option = 0; option < optionCounts[i]!; option += 1) {
      walk(i + 1, correct + (option === 0 ? 1 : 0), weight / optionCounts[i]!);
    }
  };
  walk(0, 0, 1);
  expect(total).toBeCloseTo(1, 12);
  return right;
}

const optionCounts = (activity: ActivityId, attempt: number) =>
  buildChallenge(DANDELION, activity, attempt, DRAFT)!.map((q) => q.options.length);

describe('the template', () => {
  it('plays 12 of 16 questions: 3/4, 2/3, 2/3 and 5/6', () => {
    const played = CHALLENGE_ACTIVITIES.map((a) => STAGE_RULES[a].played);
    const pool = CHALLENGE_ACTIVITIES.map((a) => STAGE_RULES[a].pool);
    expect(played).toEqual([3, 2, 2, 5]);
    expect(pool).toEqual([4, 3, 3, 6]);
    expect(played.reduce((a, b) => a + b)).toBe(12);
    expect(pool.reduce((a, b) => a + b)).toBe(16);
    expect(PASS_MARKS).toEqual({
      'part-spotter': { need: 2, of: 3 },
      compare: { need: 2, of: 2 },
      'habitat-season': { need: 2, of: 2 },
      'boss-trial': { need: 4, of: 5 },
    });
  });
  it('every pool is larger than what is played, so a retry can always differ', () => {
    for (const a of CHALLENGE_ACTIVITIES) expect(STAGE_RULES[a].pool).toBeGreaterThan(STAGE_RULES[a].played);
  });
  it('the registered species passes the generic structural check', () => {
    for (const species of BOSS_SPECIES) expect(speciesProblems(species, STAGE_RULES), species.herbId).toEqual([]);
  });
  it('the generic check catches a short pool, a gated active question and a stray plant', () => {
    const real = BOSS_SPECIES[0]!;
    const drop = real.active.slice(1);
    expect(speciesProblems({ ...real, active: drop }, STAGE_RULES).join()).toMatch(/part-spotter: 3 active/);
    const gated: ChallengeItem = { ...real.active[0]!, requires: ['something'] };
    expect(speciesProblems({ ...real, active: [gated, ...real.active.slice(1)] }, STAGE_RULES).join()).toMatch(/active but gated/);
    const stray: ChallengeItem = { ...real.active[0]!, id: 'x.stray', herbId: 'other-plant' };
    expect(speciesProblems({ ...real, archived: [...real.archived, stray] }, STAGE_RULES).join()).toMatch(/belongs to other-plant/);
  });
  it('a second plant needs only content: the engine names no plant', () => {
    for (const file of ['mastery-challenges', 'challenge-odds']) {
      expect(strip(readFileSync(`src/lib/${file}.ts`, 'utf8')), file).not.toMatch(/taraxacum|dandelion/i);
    }
    // The registry may name a species in exactly two places: the import and the list entry.
    const bank = strip(readFileSync('src/lib/challenge-bank.ts', 'utf8'))
      .replace("import { DANDELION_SPECIES } from './boss-species/taraxacum-officinale';", '')
      .replace('[DANDELION_SPECIES]', '[]');
    expect(bank).not.toMatch(/taraxacum|dandelion/i);
    // A made-up plant built from the real one's shape passes the same check.
    const make = (activity: ActivityId, n: number): ChallengeItem[] =>
      Array.from({ length: n }, (_, i) => ({
        id: `z.${activity}.${i}`, herbId: 'imaginarium-testium', activity, kind: 'quick-pick', category: 'recall',
        prompt: 'p', correct: 'a', distractors: ['b', 'c'], feedback: 'f', sources: ['s'], fact: 'x',
      }));
    const toy: BossSpecies = {
      herbId: 'imaginarium-testium',
      active: CHALLENGE_ACTIVITIES.flatMap((a) => make(a, STAGE_RULES[a].pool)),
      archived: [],
    };
    expect(speciesProblems(toy, STAGE_RULES)).toEqual([]);
  });
});

describe('the 16 active and 19 archived questions', () => {
  const species = BOSS_SPECIES[0]!;
  it('keeps all 35 drafted ids, with no overlap between the two lists', () => {
    const active = species.active.map((i) => i.id);
    const archived = species.archived.map((i) => i.id);
    expect(active).toHaveLength(16);
    expect(archived).toHaveLength(19);
    expect(new Set([...active, ...archived]).size).toBe(35);
    expect(CHALLENGE_BANK.map((i) => i.id).sort()).toEqual([...active, ...archived].sort());
  });
  it('the exact active sixteen', () => {
    expect(species.active.map((i) => i.id)).toEqual([
      'ps.rosette', 'ps.stalk', 'ps.clock', 'ps.sap',
      'cp.stages', 'cp.rosette', 'cp.seedstalk',
      'hb.sunny', 'hb.lawn', 'hb.disturbed',
      'tr.rosflower', 'tr.noflower', 'tr.flowerbare', 'tr.rosette', 'tr.puff', 'tr.wind',
    ]);
  });
  it('archived questions are never built, scored or servable, even with a review entry', () => {
    const archivedIds = new Set(species.archived.map((i) => i.id));
    for (const activity of CHALLENGE_ACTIVITIES) {
      for (let attempt = 0; attempt < 12; attempt += 1) {
        for (const options of [DRAFT, { includeUnavailable: true }, {}]) {
          for (const q of buildChallenge(DANDELION, activity, attempt, options) ?? []) {
            expect(archivedIds.has(q.id), `${activity} #${attempt}: ${q.id}`).toBe(false);
          }
        }
      }
    }
    expect(ACTIVE_CHALLENGES.some((i) => archivedIds.has(i.id))).toBe(false);
  });
  it('nothing is approved: no reviews, no ready assets, nothing servable, nothing buildable for a player', () => {
    expect(Object.keys(CHALLENGE_REVIEWS)).toEqual([]);
    expect(READY_ASSETS.size).toBe(0);
    for (const item of CHALLENGE_BANK) expect(isServable(item), item.id).toBe(false);
    for (const activity of CHALLENGE_ACTIVITIES) expect(buildChallenge(DANDELION, activity, 0)).toBeNull();
  });
});

describe('whole-stage retries and rotation', () => {
  it('each attempt leaves out a different question, so a retry is never the same set twice', () => {
    for (const activity of CHALLENGE_ACTIVITIES) {
      const { pool } = STAGE_RULES[activity];
      const seen = new Set<string>();
      let previous = '';
      for (let attempt = 0; attempt < pool; attempt += 1) {
        const ids = buildChallenge(DANDELION, activity, attempt, DRAFT)!.map((q) => q.id).sort().join();
        expect(ids, `${activity} #${attempt} repeats the try before`).not.toBe(previous);
        seen.add(ids);
        previous = ids;
      }
      expect(seen.size, activity).toBe(pool);
      // The cycle repeats, and attempt numbers far out still build.
      expect(buildChallenge(DANDELION, activity, pool, DRAFT)!.map((q) => q.id).sort().join())
        .toBe(buildChallenge(DANDELION, activity, 0, DRAFT)!.map((q) => q.id).sort().join());
      expect(buildChallenge(DANDELION, activity, 9999, DRAFT)).toHaveLength(STAGE_RULES[activity].played);
    }
  });
  it('no attempt can ask for more questions than the pool holds', () => {
    for (const activity of CHALLENGE_ACTIVITIES) {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const built = buildChallenge(DANDELION, activity, attempt, DRAFT)!;
        expect(built.length).toBeLessThanOrEqual(STAGE_RULES[activity].pool - 1);
        expect(new Set(built.map((q) => q.id)).size).toBe(built.length);
      }
    }
    expect(selectForAttempt([1, 2, 3, 4], 5, 0)).toEqual([]);
  });
  it('is deterministic per (plant, stage, attempt) and reshuffles options and order', () => {
    const a = buildChallenge(DANDELION, 'boss-trial', 2, DRAFT);
    expect(JSON.stringify(buildChallenge(DANDELION, 'boss-trial', 2, DRAFT))).toBe(JSON.stringify(a));
    expect(JSON.stringify(buildChallenge(DANDELION, 'boss-trial', 8, DRAFT))).not.toBe(JSON.stringify(a));
  });
  it('rejects bad attempt numbers and plants that have no Boss Form', () => {
    expect(buildChallenge(DANDELION, 'part-spotter', -1, DRAFT)).toBeNull();
    expect(buildChallenge(DANDELION, 'part-spotter', 1.5, DRAFT)).toBeNull();
    expect(buildChallenge(DANDELION, 'part-spotter', 10_000, DRAFT)).toBeNull();
    expect(buildChallenge('urtica-dioica', 'part-spotter', 0, DRAFT)).toBeNull();
  });
});

describe('scoring', () => {
  const set = (activity: ActivityId) => buildChallenge(DANDELION, activity, 3, DRAFT)!;
  const right = (qs: ReturnType<typeof set>) => qs.map((q) => q.correctIndex);
  const wrong = (q: { options: readonly string[]; correctIndex: number }) => (q.correctIndex + 1) % q.options.length;

  it('passes exactly at each stage’s mark', () => {
    for (const activity of CHALLENGE_ACTIVITIES) {
      const qs = set(activity);
      const { need } = STAGE_RULES[activity];
      const answers = right(qs);
      for (let miss = 0; miss <= qs.length; miss += 1) {
        const given = answers.map((a, i) => (i < miss ? wrong(qs[i]!) : a));
        const score = scoreSubmission(qs, activity, given)!;
        expect(score.resolved, `${activity} miss ${miss}`).toBe(qs.length - miss);
        expect(score.passed, `${activity} miss ${miss}`).toBe(qs.length - miss >= need);
      }
    }
  });
  it('one wrong in the Trial still passes, two do not', () => {
    const qs = set('boss-trial');
    const one = right(qs).map((a, i) => (i === 0 ? wrong(qs[0]!) : a));
    const two = right(qs).map((a, i) => (i < 2 ? wrong(qs[i]!) : a));
    expect(scoreSubmission(qs, 'boss-trial', one)!.passed).toBe(true);
    expect(scoreSubmission(qs, 'boss-trial', two)!.passed).toBe(false);
  });
  it('rejects every malformed shape, including the old two-answer retry shape', () => {
    const qs = set('part-spotter');
    const ok = right(qs);
    expect(scoreSubmission(qs, 'part-spotter', ok)).not.toBeNull();
    expect(scoreSubmission(qs, 'part-spotter', ok.map((a) => [a]))).toBeNull();
    expect(scoreSubmission(qs, 'part-spotter', ok.map((a) => [a, 0]))).toBeNull();
    expect(scoreSubmission(qs, 'part-spotter', ok.slice(1))).toBeNull();
    expect(scoreSubmission(qs, 'part-spotter', [...ok, 0])).toBeNull();
    expect(scoreSubmission(qs, 'part-spotter', ok.map(() => -1))).toBeNull();
    expect(scoreSubmission(qs, 'part-spotter', ok.map(() => 99))).toBeNull();
    expect(scoreSubmission(qs, 'part-spotter', ok.map(() => 0.5))).toBeNull();
    expect(scoreSubmission(qs, 'part-spotter', ok.map(() => '0'))).toBeNull();
    expect(scoreSubmission(qs, 'part-spotter', 'nope')).toBeNull();
    expect(scoreSubmission(qs, 'part-spotter', null)).toBeNull();
  });
  it('the Trial alone hides answers until the end', () => {
    expect(CHALLENGE_ACTIVITIES.filter(revealsAnswersAtEndOnly)).toEqual(['boss-trial']);
  });
});

describe('progress is never taken back, and nothing awards from a draft', () => {
  it('a failed submission records nothing and carries no deletion', () => {
    // Drafts are unservable, so the server's own path is `unavailable`; the pure scorer shows the
    // shape a fail would have.
    const decision = evaluateSubmission({ herbId: DANDELION, activity: 'part-spotter', attempt: 0, answers: [0, 0, 0] }, MASTERED);
    expect(decision).toEqual({ ok: false, reason: 'unavailable' });
    const qs = buildChallenge(DANDELION, 'part-spotter', 0, DRAFT)!;
    const failing = scoreSubmission(qs, 'part-spotter', qs.map((q) => (q.correctIndex + 1) % q.options.length))!;
    expect(failing.passed).toBe(false);
    // `recordActivity` is `score.passed`, so a fail writes nothing; no code path removes a row.
    const source = strip(readFileSync('src/lib/mastery-challenges.ts', 'utf8'));
    expect(source).toContain('recordActivity: score.passed');
    expect(source).not.toMatch(/delete|revoke|reset/i);
  });
  it('failing the Trial cannot un-complete earlier stages: completion is a one-way insert', () => {
    const sql = readFileSync('supabase/migrations/0012_boss_forms.sql', 'utf8');
    expect(sql).toMatch(/on conflict[\s\S]*do nothing/i);
    expect(sql).not.toMatch(/delete from public\.challenge_completions/i);
    const fn = strip(readFileSync('supabase/functions/challenge-submit/index.ts', 'utf8'));
    expect(fn).not.toMatch(/\.delete\(/);
  });
  it('a mastered player with every prerequisite still gets nothing for any stage, because nothing is approved', () => {
    const standing = { mastered: true, completed: new Set<ActivityId>(['part-spotter', 'compare', 'habitat-season']) };
    for (const activity of CHALLENGE_ACTIVITIES) {
      expect(evaluateSubmission({ herbId: DANDELION, activity, attempt: 0, answers: [0, 0, 0, 0, 0] }, standing)).toEqual({ ok: false, reason: 'unavailable' });
    }
  });
});

describe('random-guess odds, calculated and checked three ways', () => {
  const average = (activity: ActivityId) => {
    const { pool } = STAGE_RULES[activity];
    let sum = 0;
    for (let attempt = 0; attempt < pool; attempt += 1) {
      sum += bruteForce(optionCounts(activity, attempt), STAGE_RULES[activity].need);
    }
    return sum / pool;
  };
  const expected: Record<ActivityId, number> = {
    'part-spotter': 0.231,
    compare: 0.111,
    'habitat-season': 0.111,
    'boss-trial': 0.038,
  };

  it('the dynamic programme equals brute-force enumeration of every guess, for every rotation', () => {
    for (const activity of CHALLENGE_ACTIVITIES) {
      for (let attempt = 0; attempt < STAGE_RULES[activity].pool; attempt += 1) {
        const qs = buildChallenge(DANDELION, activity, attempt, DRAFT)!;
        expect(guessPassProbability(qs, STAGE_RULES[activity].need), `${activity} #${attempt}`)
          .toBeCloseTo(bruteForce(qs.map((q) => q.options.length), STAGE_RULES[activity].need), 12);
      }
    }
  });
  it('matches the figures reported to the owner', () => {
    for (const activity of CHALLENGE_ACTIVITIES) {
      expect(average(activity), activity).toBeCloseTo(expected[activity], 3);
      expect(stageGuessOdds(DANDELION, activity)!.average, activity).toBeCloseTo(average(activity), 12);
    }
  });
  it('the Trial is meaningfully harder to guess than every stage before it', () => {
    for (const activity of ['part-spotter', 'compare', 'habitat-season'] as const) {
      expect(average('boss-trial')).toBeLessThan(average(activity) / 2);
    }
    expect(average('boss-trial')).toBeLessThan(0.05);
  });
  it('a simulated blind guesser, through the real builder and scorer, passes at the calculated rate', () => {
    const rand = seeded(hash('odds-simulation'));
    for (const activity of CHALLENGE_ACTIVITIES) {
      let passes = 0;
      const tries = 6000;
      for (let attempt = 0; attempt < tries; attempt += 1) {
        const qs = buildChallenge(DANDELION, activity, attempt % 10_000, DRAFT)!;
        const guess = qs.map((q) => Math.floor(rand() * q.options.length));
        if (scoreSubmission(qs, activity, guess)!.passed) passes += 1;
      }
      expect(Math.abs(passes / tries - average(activity)), activity).toBeLessThan(0.02);
    }
  });

  describe('repeated attempts in one day', () => {
    const p = (a: ActivityId) => average(a);
    const early = [{ p: p('part-spotter') }, { p: p('compare') }, { p: p('habitat-season') }];
    const day = (total: number, trialCap?: number) =>
      blindClearProbability([...early, { p: p('boss-trial'), cap: trialCap }], total);

    it('without the Trial cap, the old 60 a day let a blind clicker clear everything about three days in four', () => {
      expect(day(60)).toBeGreaterThan(0.7);
    });
    it('with the approved limits (20 a day, 3 Boss Trials) a blind clicker clears all four stages about 5% of days', () => {
      expect(CHALLENGE_DAILY_LIMIT).toBe(20);
      expect(CHALLENGE_TRIAL_DAILY_LIMIT).toBe(3);
      expect(day(CHALLENGE_DAILY_LIMIT, CHALLENGE_TRIAL_DAILY_LIMIT)).toBeCloseTo(0.0506, 2);
    });
    it('the day maths agrees with a simulation of a bot obeying the same server limits', () => {
      const rand = seeded(hash('day-simulation'));
      const stages = CHALLENGE_ACTIVITIES.map((a) => ({ a, p: p(a) }));
      let cleared = 0;
      const days = 40_000;
      for (let d = 0; d < days; d += 1) {
        let submissions = 0;
        let trials = 0;
        let ok = true;
        for (const { a, p: pass } of stages) {
          let done = false;
          while (!done) {
            if (submissions >= CHALLENGE_DAILY_LIMIT) { ok = false; break; }
            if (a === 'boss-trial') {
              if (trials >= CHALLENGE_TRIAL_DAILY_LIMIT) { ok = false; break; }
              trials += 1;
            }
            submissions += 1;
            done = rand() < pass;
          }
          if (!ok) break;
        }
        if (ok) cleared += 1;
      }
      expect(Math.abs(cleared / days - day(CHALLENGE_DAILY_LIMIT, CHALLENGE_TRIAL_DAILY_LIMIT))).toBeLessThan(0.01);
    });
    it('a player who knows the material is nowhere near the limits', () => {
      // At 90% accuracy a try passes with these chances, so the expected number of tries per stage is small.
      const knows = (n: number, need: number, a: number) => {
        let d = [1];
        for (let i = 0; i < n; i += 1) {
          const nx = new Array<number>(d.length + 1).fill(0);
          d.forEach((m, k) => { nx[k]! += m * (1 - a); nx[k + 1]! += m * a; });
          d = nx;
        }
        return d.reduce((s, m, k) => (k >= need ? s + m : s), 0);
      };
      const tries = CHALLENGE_ACTIVITIES.map((x) => 1 / knows(STAGE_RULES[x].played, STAGE_RULES[x].need, 0.9));
      expect(tries.reduce((a, b) => a + b)).toBeLessThan(5);
      expect(CHALLENGE_DAILY_LIMIT).toBeGreaterThan(tries.reduce((a, b) => a + b) * 3);
    });
  });
});
