import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BOSS_PILOT,
  CHALLENGE_ACTIVITIES,
  PASS_MARKS,
  PREREQUISITE_ACTIVITIES,
  mayAttempt,
  type ActivityId,
} from './boss-form';
import { CHALLENGE_BANK } from './challenge-bank';
import {
  CHALLENGE_REVIEWS,
  buildChallenge,
  evaluateSubmission,
  isServable,
  scoreSubmission,
} from './mastery-challenges';
import { FIELD_NOTES } from './card-field-notes';

const DANDELION = 'taraxacum-officinale';
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const all: ReadonlySet<ActivityId> = new Set(PREREQUISITE_ACTIVITIES);

describe('thresholds are the approved ones', () => {
  it('pins them', () => {
    expect(PASS_MARKS['part-spotter']).toEqual({ need: 3, of: 4 });
    expect(PASS_MARKS.compare).toEqual({ need: 3, of: 3 });
    expect(PASS_MARKS['habitat-season']).toEqual({ need: 2, of: 3 });
    expect(PASS_MARKS['boss-trial']).toEqual({ need: 9, of: 10 });
  });
  it('the pilot is Dandelion only', () => {
    expect([...BOSS_PILOT]).toEqual([DANDELION]);
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
    expect(buildChallenge(DANDELION, 'part-spotter', 0, { includeUnreviewed: true })).not.toBeNull();
  });

  it('the server decision never takes that option, so a draft cannot earn anything', () => {
    const source = strip(readFileSync('src/lib/mastery-challenges.ts', 'utf8'));
    const decision = source.slice(source.indexOf('export function evaluateSubmission'));
    expect(decision).not.toMatch(/includeUnreviewed/);
    const verdict = evaluateSubmission(
      { herbId: DANDELION, activity: 'part-spotter', attempt: 0, answers: [[0], [0], [0], [0]] },
      { mastered: true, completed: new Set() },
    );
    expect(verdict).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('the bank is derived from curated notes, not invented', () => {
  const notes = FIELD_NOTES[DANDELION]!;
  const corpus = JSON.stringify(notes);
  it('every drafted trait answer appears in the curated Dandelion notes', () => {
    for (const item of CHALLENGE_BANK.filter((one) => one.activity === 'part-spotter')) {
      expect(corpus, item.id).toContain(item.correct.replace(/’/g, "'"));
    }
  });
  it('every item cites a source and has three distractors distinct from the answer', () => {
    for (const item of CHALLENGE_BANK) {
      expect(item.sources.length, item.id).toBeGreaterThan(0);
      expect(new Set([item.correct, ...item.distractors]).size, item.id).toBe(4);
    }
  });
  it('no drafted question uses hollowness as the difference between two plants', () => {
    for (const item of CHALLENGE_BANK) {
      if (item.activity === 'compare') expect(item.prompt + item.correct).not.toMatch(/hollow/i);
    }
  });
});

describe('the builder and scorer, exercised on drafts', () => {
  const slots = buildChallenge(DANDELION, 'part-spotter', 3, { includeUnreviewed: true })!;
  const right = slots.map((slot) => [slot.primary.correctIndex]);

  it('is deterministic per (herb, activity, attempt) and varies by attempt', () => {
    const again = buildChallenge(DANDELION, 'part-spotter', 3, { includeUnreviewed: true });
    expect(JSON.stringify(again)).toBe(JSON.stringify(slots));
    const other = buildChallenge(DANDELION, 'part-spotter', 4, { includeUnreviewed: true });
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(slots));
  });

  it('scores a perfect set and applies the 3-of-4 mark', () => {
    expect(scoreSubmission(slots, 'part-spotter', right)).toEqual({ resolved: 4, total: 4, passed: true });
    const wrong = (index: number) => (slots[index]!.primary.correctIndex + 1) % 4;
    const one = right.map((a, i) => (i === 0 ? [wrong(0)] : a));
    expect(scoreSubmission(slots, 'part-spotter', one)).toEqual({ resolved: 3, total: 4, passed: true });
    const two = right.map((a, i) => (i < 2 ? [wrong(i)] : a));
    expect(scoreSubmission(slots, 'part-spotter', two)).toEqual({ resolved: 2, total: 4, passed: false });
  });

  it('lets a missed slot be answered once more by its replacement', () => {
    const withSpare = slots.findIndex((slot) => slot.replacement);
    if (withSpare < 0) return;
    const answers = right.map((one, i) =>
      i === withSpare
        ? [(slots[i]!.primary.correctIndex + 1) % 4, slots[i]!.replacement!.correctIndex]
        : one,
    );
    expect(scoreSubmission(slots, 'part-spotter', answers)?.resolved).toBe(4);
  });

  it('rejects malformed submissions instead of scoring them generously', () => {
    expect(scoreSubmission(slots, 'part-spotter', [[0]])).toBeNull();
    expect(scoreSubmission(slots, 'part-spotter', 'x')).toBeNull();
    expect(scoreSubmission(slots, 'part-spotter', right.map(() => [9]))).toBeNull();
    expect(scoreSubmission(slots, 'part-spotter', right.map(() => [-1]))).toBeNull();
    expect(scoreSubmission(slots, 'part-spotter', right.map(() => [0.5]))).toBeNull();
    // A replacement answered after a correct primary.
    expect(scoreSubmission(slots, 'part-spotter', right.map((one) => [...one, 0]))).toBeNull();
  });

  it('has no replacement in the boss trial', () => {
    const trial = [...Array(10)].map((_, i) => ({
      id: `t${i}`,
      herbId: DANDELION,
      activity: 'habitat-season' as const,
      prompt: 'p',
      correct: `c${i}`,
      distractors: ['a', 'b', 'd'] as [string, string, string],
      feedback: 'f',
      sources: ['s'],
    }));
    expect(trial).toHaveLength(10);
    expect(PASS_MARKS['boss-trial'].of).toBe(10);
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
