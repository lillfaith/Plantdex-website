import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BOSS_PILOT,
  CHALLENGE_ACTIVITIES,
  PASS_MARKS,
  PREREQUISITE_ACTIVITIES,
  RETRY_ACTIVITIES,
  TRIAL_MIX,
  mayAttempt,
  type ActivityId,
} from './boss-form';
import { CHALLENGE_BANK } from './challenge-bank';
import { BOSS_IMAGES, REGION_LABELS, regionAt } from './boss-images';
import { activityGuessOdds, guessPassProbability } from './challenge-odds';
import {
  CHALLENGE_REVIEWS,
  READY_ASSETS,
  buildChallenge,
  evaluateSubmission,
  isAvailable,
  isServable,
  scoreSubmission,
} from './mastery-challenges';
import { FIELD_NOTES } from './card-field-notes';

const DANDELION = 'taraxacum-officinale';
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const all: ReadonlySet<ActivityId> = new Set(PREREQUISITE_ACTIVITIES);
const PREVIEW = { includeUnreviewed: true } as const;
const words = (text: string) => text.trim().split(/\s+/).length;

describe('thresholds are the approved ones', () => {
  it('pins them', () => {
    expect(PASS_MARKS['part-spotter']).toEqual({ need: 3, of: 4 });
    // Owner decision: Compare is two of three. The number lives only in code, never in SQL.
    expect(PASS_MARKS.compare).toEqual({ need: 2, of: 3 });
    expect(PASS_MARKS['habitat-season']).toEqual({ need: 2, of: 3 });
    expect(PASS_MARKS['boss-trial']).toEqual({ need: 9, of: 10 });
  });
  it('no migration or function holds a threshold', () => {
    const sql = readFileSync('supabase/migrations/0012_boss_forms.sql', 'utf8');
    expect(strip(sql.replace(/--.*$/gm, ''))).not.toMatch(/pass|need|score|threshold/i);
  });
  it('the pilot is Dandelion only', () => {
    expect([...BOSS_PILOT]).toEqual([DANDELION]);
  });
  it('only Part Spotter and Habitat get a second chance; Compare and the Trial never do', () => {
    expect([...RETRY_ACTIVITIES].sort()).toEqual(['habitat-season', 'part-spotter']);
  });
});

describe('nothing unreviewed can be served or awarded', () => {
  it('has no sign-offs today, so nothing is servable', () => {
    expect(Object.keys(CHALLENGE_REVIEWS)).toHaveLength(0);
    expect(CHALLENGE_BANK.every((item) => !isServable(item))).toBe(true);
    for (const activity of CHALLENGE_ACTIVITIES) {
      expect(buildChallenge(DANDELION, activity, 0)).toBeNull();
    }
  });

  it('a draft can only be previewed with the explicit client-side option', () => {
    expect(buildChallenge(DANDELION, 'part-spotter', 0, PREVIEW)).not.toBeNull();
    expect(buildChallenge(DANDELION, 'habitat-season', 0, PREVIEW)).not.toBeNull();
  });

  it('the server decision never takes either test option, so a draft cannot earn anything', () => {
    const source = strip(readFileSync('src/lib/mastery-challenges.ts', 'utf8'));
    const decision = source.slice(source.indexOf('export function evaluateSubmission'));
    expect(decision).not.toMatch(/includeUnreviewed|includeUnavailable/);
    const verdict = evaluateSubmission(
      { herbId: DANDELION, activity: 'part-spotter', attempt: 0, answers: [[0], [0], [0], [0]] },
      { mastered: true, completed: new Set() },
    );
    expect(verdict).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('items that need something missing are disabled', () => {
  it('nothing is ready today', () => {
    expect(READY_ASSETS.size).toBe(0);
  });
  it('every cat’s-ear item requires the missing pieces, and is not built even in preview', () => {
    const cats = CHALLENGE_BANK.filter((item) =>
      [item.correct, ...item.distractors, item.media ?? ''].some((id) => id.startsWith('c-')) ||
      /fork|branch/i.test(item.prompt),
    );
    expect(cats.length).toBeGreaterThanOrEqual(5);
    for (const item of cats) {
      expect(isAvailable(item), item.id).toBe(false);
      expect(item.requires?.length, item.id).toBeGreaterThan(0);
    }
    // With the Compare pool disabled, Compare and the Trial cannot be built, even as a preview.
    expect(buildChallenge(DANDELION, 'compare', 0, PREVIEW)).toBeNull();
    expect(buildChallenge(DANDELION, 'boss-trial', 0, PREVIEW)).toBeNull();
  });
  it('any item pointing at a photograph that has no file is disabled', () => {
    for (const item of CHALLENGE_BANK) {
      const ids = [item.media, item.correct, ...item.distractors].filter(
        (id): id is string => typeof id === 'string' && id in BOSS_IMAGES,
      );
      if (ids.some((id) => !BOSS_IMAGES[id]!.src)) {
        expect(isAvailable(item), `${item.id} uses a photo with no file`).toBe(false);
      }
    }
  });
});

describe('the bank is derived from curated notes, not invented', () => {
  const notes = FIELD_NOTES[DANDELION]!;
  const corpus = JSON.stringify(notes).replace(/\\"/g, '"');
  it('every item tests a phrase that is still in the curated Dandelion notes', () => {
    for (const item of CHALLENGE_BANK) expect(corpus, item.id).toContain(item.fact);
  });
  it('every item cites a source and has distinct answers, by kind', () => {
    const counts = { 'pick-picture': 2, 'spot-feature': 3, showdown: 1 } as const;
    for (const item of CHALLENGE_BANK) {
      expect(item.sources.length, item.id).toBeGreaterThan(0);
      expect(new Set([item.correct, ...item.distractors]).size, item.id).toBe(
        1 + item.distractors.length,
      );
      if (item.kind === 'quick-pick') {
        expect([1, 2], item.id).toContain(item.distractors.length);
      } else {
        expect(item.distractors.length, item.id).toBe(counts[item.kind]);
      }
    }
  });
  it('stays short: nine-word prompts, eighteen-word feedback, five-word text answers', () => {
    for (const item of CHALLENGE_BANK) {
      expect(words(item.prompt), item.id).toBeLessThanOrEqual(9);
      expect(words(item.feedback), item.id).toBeLessThanOrEqual(18);
      if (item.kind === 'quick-pick') {
        for (const text of [item.correct, ...item.distractors]) {
          expect(words(text), `${item.id}: ${text}`).toBeLessThanOrEqual(5);
        }
      }
    }
  });
  it('asks nothing about eating, safety or medicine, and never uses "hollow" as a difference', () => {
    const banned = /\b(edib\w*|eat|eaten|consum\w*|safe|safety|dose|dosage|treat\w*|cure|remed\w*|medic\w*|poison\w*|toxic|forag\w*|harvest\w*|taste|tea|tincture)\b/i;
    for (const item of CHALLENGE_BANK) {
      const text = [item.prompt, item.feedback, ...(item.kind === 'quick-pick' ? [item.correct, ...item.distractors] : [])].join(' ');
      expect(text, item.id).not.toMatch(banned);
      if (item.activity === 'compare' || item.requires) expect(text, item.id).not.toMatch(/hollow/i);
    }
  });
  it('uses the wording corrected after the source check, never "leafy" stems', () => {
    for (const item of CHALLENGE_BANK) expect(item.prompt + item.feedback, item.id).not.toMatch(/leafy/i);
  });
  it('has the pools the retry rule needs, so each retry is a different question', () => {
    const size = (activity: ActivityId) => CHALLENGE_BANK.filter((i) => i.activity === activity).length;
    expect(size('part-spotter')).toBeGreaterThanOrEqual(8);
    expect(size('habitat-season')).toBeGreaterThanOrEqual(5);
    const trial = CHALLENGE_BANK.filter((i) => i.activity === 'boss-trial');
    for (const category of ['visual', 'applied', 'recall'] as const) {
      expect(trial.filter((i) => i.category === category).length).toBe(TRIAL_MIX[category]);
    }
  });
  it('the Trial reuses no activity prompt', () => {
    const activityPrompts = new Set(
      CHALLENGE_BANK.filter((i) => i.activity !== 'boss-trial').map((i) => i.prompt),
    );
    for (const item of CHALLENGE_BANK.filter((i) => i.activity === 'boss-trial')) {
      expect(activityPrompts.has(item.prompt), item.id).toBe(false);
    }
  });
});

describe('the photographs', () => {
  it('are CC0, exist on disk, and every referenced image is registered', () => {
    for (const [id, image] of Object.entries(BOSS_IMAGES)) {
      expect(image.licence, id).toBe('cc0');
      if (image.src) expect(existsSync(`public${image.src}`), id).toBe(true);
    }
    for (const item of CHALLENGE_BANK) {
      if (item.kind === 'pick-picture' || item.kind === 'showdown') {
        for (const id of [item.correct, ...item.distractors]) expect(BOSS_IMAGES[id], `${item.id}: ${id}`).toBeDefined();
      }
      if (item.media) expect(BOSS_IMAGES[item.media], `${item.id}: media`).toBeDefined();
    }
  });
  it('give every tap question regions for each of its options, and no others', () => {
    for (const item of CHALLENGE_BANK.filter((i) => i.kind === 'spot-feature')) {
      const regions = Object.keys(BOSS_IMAGES[item.media!]!.regions ?? {});
      for (const option of [item.correct, ...item.distractors]) {
        expect(regions, `${item.id}: ${option}`).toContain(option);
        expect(REGION_LABELS[option], option).toBeDefined();
      }
    }
  });
  it('turn a tap into the region under it, or nothing', () => {
    expect(regionAt('d-flower-open', 50, 40)).toBe('head');
    expect(regionAt('d-seed-stalk', 50, 70)).toBe('stalk');
    expect(regionAt('d-seed-stalk', 99, 2)).toBeNull();
    expect(regionAt('no-such-image', 1, 1)).toBeNull();
  });
});

describe('the builder and scorer, exercised on drafts', () => {
  const slots = buildChallenge(DANDELION, 'part-spotter', 3, PREVIEW)!;
  const right = slots.map((slot) => [slot.primary.correctIndex]);
  const wrongOf = (question: { options: readonly string[]; correctIndex: number }) =>
    (question.correctIndex + 1) % question.options.length;

  it('is deterministic per (herb, activity, attempt) and varies by attempt', () => {
    const again = buildChallenge(DANDELION, 'part-spotter', 3, PREVIEW);
    expect(JSON.stringify(again)).toBe(JSON.stringify(slots));
    const other = buildChallenge(DANDELION, 'part-spotter', 4, PREVIEW);
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(slots));
  });

  it('scores a perfect set and applies the 3-of-4 mark', () => {
    expect(scoreSubmission(slots, 'part-spotter', right)).toEqual({ resolved: 4, total: 4, passed: true });
    const one = right.map((a, i) => (i === 0 ? [wrongOf(slots[0]!.primary)] : a));
    expect(scoreSubmission(slots, 'part-spotter', one)).toEqual({ resolved: 3, total: 4, passed: true });
    const two = right.map((a, i) => (i < 2 ? [wrongOf(slots[i]!.primary)] : a));
    expect(scoreSubmission(slots, 'part-spotter', two)).toEqual({ resolved: 2, total: 4, passed: false });
  });

  it('gives every Part Spotter slot a second chance, and it is a different question', () => {
    for (const slot of slots) {
      expect(slot.replacement).toBeDefined();
      expect(slot.replacement!.id).not.toBe(slot.primary.id);
    }
    const answers = right.map((one, i) =>
      i === 0 ? [wrongOf(slots[0]!.primary), slots[0]!.replacement!.correctIndex] : one,
    );
    expect(scoreSubmission(slots, 'part-spotter', answers)?.resolved).toBe(4);
  });

  it('allows only ONE retry per slot, and none after a correct first answer', () => {
    expect(scoreSubmission(slots, 'part-spotter', right.map((one) => [...one, 0]))).toBeNull();
    const three = right.map((one, i) => (i === 0 ? [wrongOf(slots[0]!.primary), 0, 0] : one));
    expect(scoreSubmission(slots, 'part-spotter', three)).toBeNull();
  });

  it('refuses a second answer in an activity with no retry', () => {
    const synthetic = [
      { primary: slots[0]!.primary, replacement: slots[0]!.replacement },
      { primary: slots[1]!.primary, replacement: slots[1]!.replacement },
      { primary: slots[2]!.primary, replacement: slots[2]!.replacement },
    ];
    const retried = synthetic.map((slot, i) =>
      i === 0 ? [wrongOf(slot.primary), slot.replacement!.correctIndex] : [slot.primary.correctIndex],
    );
    expect(scoreSubmission(synthetic, 'compare', retried)).toBeNull();
    expect(scoreSubmission(synthetic, 'boss-trial', retried)).toBeNull();
    const firstTry = synthetic.map((slot) => [slot.primary.correctIndex]);
    expect(scoreSubmission(synthetic, 'compare', firstTry)).toEqual({ resolved: 3, total: 3, passed: true });
  });

  it('Compare passes at two of three', () => {
    const synthetic = slots.slice(0, 3).map((slot) => ({ primary: slot.primary }));
    const two = synthetic.map((slot, i) => [i === 0 ? wrongOf(slot.primary) : slot.primary.correctIndex]);
    expect(scoreSubmission(synthetic, 'compare', two)).toEqual({ resolved: 2, total: 3, passed: true });
    const one = synthetic.map((slot, i) => [i < 2 ? wrongOf(slot.primary) : slot.primary.correctIndex]);
    expect(scoreSubmission(synthetic, 'compare', one)?.passed).toBe(false);
  });

  it('rejects malformed submissions instead of scoring them generously', () => {
    expect(scoreSubmission(slots, 'part-spotter', [[0]])).toBeNull();
    expect(scoreSubmission(slots, 'part-spotter', 'x')).toBeNull();
    expect(scoreSubmission(slots, 'part-spotter', right.map(() => [9]))).toBeNull();
    expect(scoreSubmission(slots, 'part-spotter', right.map(() => [-1]))).toBeNull();
    expect(scoreSubmission(slots, 'part-spotter', right.map(() => [0.5]))).toBeNull();
  });
});

describe('the Boss Trial composition', () => {
  // Built from the questions as specified, since the cat’s-ear ones are disabled today.
  const trial = buildChallenge(DANDELION, 'boss-trial', 0, { includeUnavailable: true })!;
  it('is ten questions: six visual, three applied, one recall', () => {
    expect(trial).toHaveLength(10);
    const count = (category: string) => trial.filter((s) => s.primary.category === category).length;
    expect(count('visual')).toBe(TRIAL_MIX.visual);
    expect(count('applied')).toBe(TRIAL_MIX.applied);
    expect(count('recall')).toBe(TRIAL_MIX.recall);
  });
  it('has no second chance on any question', () => {
    expect(trial.every((slot) => slot.replacement === undefined)).toBe(true);
  });
});

describe('random-guess odds, from the real answer counts and retry rules', () => {
  it('computes an exact distribution', () => {
    const coin = (n: number) => Array.from({ length: n }, () => ({
      primary: { id: 'x', kind: 'quick-pick', category: 'recall', prompt: 'p', options: ['a', 'b'], correctIndex: 0, feedback: 'f', sources: [] },
    })) as never;
    expect(guessPassProbability(coin(3), 2)).toBeCloseTo(0.5, 10);
    expect(guessPassProbability(coin(3), 3)).toBeCloseTo(0.125, 10);
  });
  it('Compare is the easy one to guess, and the Trial is the real gate', () => {
    const compare = activityGuessOdds('compare')!;
    expect(compare.average).toBeCloseTo(0.5, 6);
    expect(activityGuessOdds('part-spotter')!.average).toBeLessThan(0.4);
    expect(activityGuessOdds('habitat-season')!.average).toBeLessThan(0.5);
    expect(activityGuessOdds('boss-trial')!.average).toBeLessThan(0.001);
  });
});

describe('the gate: mastery first, then the three prerequisites', () => {
  it('refuses an unmastered player, a non-pilot herb and a trial without prerequisites', () => {
    expect(mayAttempt(DANDELION, 'part-spotter', { mastered: false, completed: new Set() })).toEqual({ ok: false, reason: 'not-mastered' });
    expect(mayAttempt('urtica-dioica', 'part-spotter', { mastered: true, completed: new Set() })).toEqual({ ok: false, reason: 'not-in-pilot' });
    expect(mayAttempt(DANDELION, 'boss-trial', { mastered: true, completed: new Set(['part-spotter']) })).toEqual({ ok: false, reason: 'prerequisites-missing' });
    expect(mayAttempt(DANDELION, 'boss-trial', { mastered: true, completed: all })).toEqual({ ok: true });
  });
  it('rejects unknown activities and non-numeric attempts', () => {
    const standing = { mastered: true, completed: all };
    expect(evaluateSubmission({ herbId: DANDELION, activity: 'x', attempt: 0, answers: [] }, standing)).toEqual({ ok: false, reason: 'unknown-activity' });
    expect(evaluateSubmission({ herbId: DANDELION, activity: 'compare', attempt: '0', answers: [] }, standing)).toEqual({ ok: false, reason: 'bad-attempt' });
  });
});

describe('the exception stays separate from the card check', () => {
  it('neither module imports the other', () => {
    const check = readFileSync('src/lib/knowledge-check.ts', 'utf8');
    const challenges = readFileSync('src/lib/mastery-challenges.ts', 'utf8');
    expect(check).not.toMatch(/mastery-challenges|challenge-bank|boss-form/);
    expect(strip(challenges)).not.toMatch(/knowledge-check/);
  });
  it('the existing card-check guard is unchanged', () => {
    const test = readFileSync('src/lib/knowledge-check.test.ts', 'utf8');
    expect(test).toContain('/heal|treat|cure|remed|safe|edible|eat|dose|medic|identif|poison/i');
  });
});
