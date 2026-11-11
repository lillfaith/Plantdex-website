import { describe, expect, it } from 'vitest';

import {
  DAILY_JOURNAL_POINT_CAP,
  LEADERBOARD_POINTS,
  MIN_QUALIFYING_NOTE,
  PROVISIONAL,
  SCORING_RULES,
  awardForEntry,
  isQualifyingEntry,
  paidJournalSpecies,
  paysChallengePoints,
  scoreFromCounts,
} from './leaderboard';

/**
 * THE FOUR WAYS A LEADERBOARD GETS FARMED, AND WHY NONE OF THEM WORKS HERE.
 *
 * Every test below is one of them. They are written against the pure module rather than the
 * database because that is where the rules live — but the reason they hold in production is
 * structural rather than tested: a score is DERIVED from rows, so there is no award to
 * replay, and `supabase/migrations/0011_leaderboard.sql` has no points column for anybody to
 * write. See `leaderboard.ts` for the full argument and `leaderboard-schema.test.ts` for the
 * check that the SQL and these constants still agree.
 */

const DISCOVERED = new Set(['dandelion', 'yarrow', 'nettle', 'oak', 'plantain', 'violet']);

let tick = 0;
/** A sighting at a fixed UTC instant, so day boundaries in these tests are unambiguous. */
function entry(
  herbId: string,
  options: { notes?: string; photo?: boolean; day?: string; at?: string } = {},
) {
  tick += 1;
  const day = options.day ?? '2026-05-04';
  return {
    herbId,
    notes: options.notes,
    photoId: options.photo ? `${herbId}-photo` : undefined,
    createdAt: options.at ?? `${day}T${String(tick % 24).padStart(2, '0')}:00:00.000Z`,
  };
}

const REAL_NOTE = 'Growing along the sunny edge of a field, several flowering.';

describe('what counts as an observation', () => {
  it('takes a note of real length, or a photograph', () => {
    expect(isQualifyingEntry(entry('dandelion', { notes: REAL_NOTE }), DISCOVERED)).toBe(true);
    expect(isQualifyingEntry(entry('dandelion', { photo: true }), DISCOVERED)).toBe(true);
  });

  it('refuses an empty form, and a note that is only a word', () => {
    expect(isQualifyingEntry(entry('dandelion'), DISCOVERED)).toBe(false);
    expect(isQualifyingEntry(entry('dandelion', { notes: 'nice' }), DISCOVERED)).toBe(false);
    // Whitespace is not length. A note of spaces is an empty form with a long tail.
    expect(
      isQualifyingEntry(entry('dandelion', { notes: ' '.repeat(80) }), DISCOVERED),
    ).toBe(false);
  });

  it('measures the note after trimming, at exactly the documented floor', () => {
    const justShort = 'x'.repeat(MIN_QUALIFYING_NOTE - 1);
    const justEnough = 'x'.repeat(MIN_QUALIFYING_NOTE);
    expect(isQualifyingEntry(entry('yarrow', { notes: `  ${justShort}  ` }), DISCOVERED)).toBe(
      false,
    );
    expect(isQualifyingEntry(entry('yarrow', { notes: `  ${justEnough}  ` }), DISCOVERED)).toBe(
      true,
    );
  });

  it('refuses an entry for a species that is not in the collection', () => {
    /*
     * A journal entry is a RETURN VISIT to something already found. Without this, a player
     * could log entries against all 45 cards without discovering any of them and collect the
     * journal term of the score for plants they never claimed to have seen.
     */
    expect(isQualifyingEntry(entry('chickweed', { notes: REAL_NOTE }), DISCOVERED)).toBe(false);
  });
});

describe('a species pays once, however many times it is written about', () => {
  it('pays the first qualifying entry and nothing after it', () => {
    const first = entry('dandelion', { notes: REAL_NOTE, at: '2026-05-04T09:00:00.000Z' });
    const second = entry('dandelion', { notes: REAL_NOTE, at: '2026-05-04T11:00:00.000Z' });

    expect(awardForEntry(first, [first], DISCOVERED)).toEqual({
      awarded: true,
      points: LEADERBOARD_POINTS.journalEntry,
    });
    expect(awardForEntry(second, [first, second], DISCOVERED)).toEqual({
      awarded: false,
      reason: 'species-already-paid',
    });
    expect(paidJournalSpecies([first, second], DISCOVERED)).toEqual(['dandelion']);
  });

  it('pays nothing extra for an entry that is merely longer or has a photo added', () => {
    // The closest thing to "editing" this schema has: `sightings` grants no update, so an
    // edit is a delete and a fresh insert. Either way the species is already paid.
    const original = entry('yarrow', { notes: REAL_NOTE, at: '2026-05-04T09:00:00.000Z' });
    const rewritten = entry('yarrow', {
      notes: `${REAL_NOTE} ${REAL_NOTE}`,
      photo: true,
      at: '2026-05-04T10:00:00.000Z',
    });
    expect(awardForEntry(rewritten, [original, rewritten], DISCOVERED)).toEqual({
      awarded: false,
      reason: 'species-already-paid',
    });
  });

  it('cannot be farmed by deleting and re-logging', () => {
    /*
     * The whole point of scoring a SET rather than a stream. Delete the entry and write a new
     * one and the player is back where they started: one species, one qualifying entry, 15
     * points. There is no ledger row to re-earn, because there is no ledger.
     */
    const original = entry('nettle', { notes: REAL_NOTE, at: '2026-05-04T09:00:00.000Z' });
    const relogged = entry('nettle', { notes: REAL_NOTE, at: '2026-05-04T15:00:00.000Z' });

    const before = paidJournalSpecies([original], DISCOVERED);
    const afterDeleteAndRelog = paidJournalSpecies([relogged], DISCOVERED);
    expect(afterDeleteAndRelog).toEqual(before);
    expect(afterDeleteAndRelog).toHaveLength(1);
  });

  it('counts an undiscovered species as unpaid, so discovering it later still pays', () => {
    const logged = entry('chickweed', { notes: REAL_NOTE });
    expect(paidJournalSpecies([logged], DISCOVERED)).toEqual([]);
    expect(paidJournalSpecies([logged], new Set([...DISCOVERED, 'chickweed']))).toEqual([
      'chickweed',
    ]);
  });
});

describe('the daily cap', () => {
  const day = (herbId: string, hour: number) =>
    entry(herbId, { notes: REAL_NOTE, at: `2026-05-04T${String(hour).padStart(2, '0')}:00:00.000Z` });

  it('pays the first few of a day and refuses the rest', () => {
    const sightings = ['dandelion', 'yarrow', 'nettle', 'oak', 'plantain', 'violet'].map(
      (herbId, index) => day(herbId, 8 + index),
    );
    const paid = paidJournalSpecies(sightings, DISCOVERED);
    expect(paid).toHaveLength(DAILY_JOURNAL_POINT_CAP);
    // Earliest first: the cap takes the start of the day, not an arbitrary subset.
    expect(paid).toEqual(['dandelion', 'yarrow', 'nettle', 'oak'].slice(0, DAILY_JOURNAL_POINT_CAP));

    const overflow = sightings[DAILY_JOURNAL_POINT_CAP]!;
    expect(awardForEntry(overflow, sightings, DISCOVERED)).toEqual({
      awarded: false,
      reason: 'daily-cap',
    });
  });

  it('resets on the next UTC day', () => {
    const today = ['dandelion', 'yarrow', 'nettle', 'oak'].map((id, i) => day(id, 8 + i));
    const tomorrow = entry('plantain', { notes: REAL_NOTE, at: '2026-05-05T08:00:00.000Z' });
    expect(paidJournalSpecies([...today, tomorrow], DISCOVERED)).toHaveLength(
      DAILY_JOURNAL_POINT_CAP + 1,
    );
  });

  it('measures the day in UTC, including a timestamp written with an offset', () => {
    /*
     * `createdAt` is `new Date().toISOString()` today and is therefore already UTC. This
     * pins the behaviour if that ever stops being true: 23:30 in UTC+02:00 is 21:30 UTC and
     * belongs to the EARLIER day, which a string slice of the ISO text would get wrong.
     */
    const utcEvening = entry('dandelion', { notes: REAL_NOTE, at: '2026-05-04T21:30:00.000Z' });
    const sameInstantOffset = entry('yarrow', {
      notes: REAL_NOTE,
      at: '2026-05-04T23:30:00.000+02:00',
    });
    const paid = paidJournalSpecies([utcEvening, sameInstantOffset], DISCOVERED);
    expect(paid).toHaveLength(2);
    // Both fell on 2026-05-04 UTC, so two of that day's four slots are gone.
    const filler = ['nettle', 'oak', 'plantain'].map((id, i) =>
      entry(id, { notes: REAL_NOTE, at: `2026-05-04T2${i}:45:00.000Z` }),
    );
    expect(
      paidJournalSpecies([utcEvening, sameInstantOffset, ...filler], DISCOVERED),
    ).toHaveLength(DAILY_JOURNAL_POINT_CAP);
  });
});

describe('challenge points', () => {
  it('pays Collection challenges and seasonal ladders', () => {
    expect(paysChallengePoints('collection:backyard')).toBe(true);
    expect(paysChallengePoints('collection:hard-to-find')).toBe(true);
    expect(paysChallengePoints('seasonal:spring')).toBe(true);
  });

  it('pays nothing for a daily', () => {
    // A daily is a nudge worth 25 XP. Paying 100 board points for one would make the board a
    // measure of how often somebody opened the app.
    expect(paysChallengePoints('daily:revisit:taraxacum-officinale')).toBe(false);
  });
});

describe('the score itself', () => {
  it('adds the three terms and reports each one separately', () => {
    const score = scoreFromCounts({ discoveries: 6, journalEntries: 4, challenges: 1 });
    expect(score.discoveryPoints).toBe(6 * LEADERBOARD_POINTS.discovery);
    expect(score.journalPoints).toBe(4 * LEADERBOARD_POINTS.journalEntry);
    expect(score.challengePoints).toBe(1 * LEADERBOARD_POINTS.challenge);
    expect(score.points).toBe(
      score.discoveryPoints + score.journalPoints + score.challengePoints,
    );
  });

  it('is provisional, and there is no other kind', () => {
    /*
     * Nothing in Plantdex verifies that anybody went outside — CLAUDE.md, "Progression is
     * self-declared" — so a board that published a "verified" score would be publishing a
     * claim this product cannot make. The day a verification mechanism exists, this test is
     * what makes somebody name it rather than let the old number quietly change meaning.
     */
    expect(scoreFromCounts({ discoveries: 1, journalEntries: 0, challenges: 0 }).verification).toBe(
      PROVISIONAL,
    );
    expect(PROVISIONAL).toBe('provisional');
  });

  it('scores an empty account at zero rather than at nothing', () => {
    const score = scoreFromCounts({ discoveries: 0, journalEntries: 0, challenges: 0 });
    expect(score.points).toBe(0);
  });

  it('never out-pays field work with indoor work', () => {
    // The ordering of the economy, as a property rather than three numbers: a challenge asks
    // for several real finds, a discovery is one, and a journal entry is a note about a find
    // already made. Reversing any pair would point the incentive at the screen.
    expect(LEADERBOARD_POINTS.challenge).toBeGreaterThan(LEADERBOARD_POINTS.discovery);
    expect(LEADERBOARD_POINTS.discovery).toBeGreaterThan(LEADERBOARD_POINTS.journalEntry);
  });
});

describe('the rules a player reads', () => {
  it('prints the real numbers rather than restating them', () => {
    // Same rule the cosmetics cabinet follows: a UI free to describe a threshold differently
    // from the code that enforces it eventually will.
    const points = SCORING_RULES.map((rule) => rule.points);
    expect(points).toEqual([
      LEADERBOARD_POINTS.discovery,
      LEADERBOARD_POINTS.journalEntry,
      LEADERBOARD_POINTS.challenge,
    ]);
    const journal = SCORING_RULES[1]!;
    expect(journal.note).toContain(String(MIN_QUALIFYING_NOTE));
    expect(journal.note).toContain(String(DAILY_JOURNAL_POINT_CAP));
  });

  it('says somewhere that a repeat find adds nothing', () => {
    const text = SCORING_RULES.map((rule) => `${rule.what} ${rule.note}`).join(' ').toLowerCase();
    expect(text).toContain('once per species');
  });
});
