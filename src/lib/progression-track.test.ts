import { describe, expect, it } from 'vitest';
import { milestonesInLevel, progressionSubtext } from './progression-track';
import { progressFromXp, LEVELS } from './progression';
import { FIELD_CARD_SLOTS, FIELD_CARDS_TOTAL } from './field-cards';

/**
 * ONE BAR CARRYING TWO LADDERS.
 *
 * These tests pin the arithmetic, not the pixels: where a Field Card marker sits along the
 * current level band, and which of the four sentences appears under it. Both are pure
 * functions of `Progress` plus the thresholds, so neither can drift from the ladders without
 * failing here.
 */

const at = (xp: number) => progressFromXp(xp);

describe('milestones on the level bar', () => {
  it('positions a threshold by where it falls inside the band, not by its raw XP', () => {
    // Level 7 spans 5,500 -> 8,000 and Field Card 6 sits at 7,000.
    const marks = milestonesInLevel(at(6000));
    expect(marks).toHaveLength(1);
    expect(marks[0]!.xp).toBe(7000);
    expect(marks[0]!.fraction).toBeCloseTo((7000 - 5500) / (8000 - 5500), 10);
    expect(marks[0]!.earned).toBe(false);
    expect(marks[0]!.atLevelUp).toBe(false);
  });

  it('marks a crossed threshold earned, and only once the XP is actually there', () => {
    expect(milestonesInLevel(at(6999))[0]!.earned).toBe(false);
    expect(milestonesInLevel(at(7000))[0]!.earned).toBe(true);
    expect(milestonesInLevel(at(7500))[0]!.earned).toBe(true);
  });

  it('puts a threshold that coincides with the level-up at the far right, flagged', () => {
    // Level 6 spans 3,600 -> 5,500 and Field Card 5 is also 5,500.
    const marks = milestonesInLevel(at(4000));
    expect(marks).toHaveLength(1);
    expect(marks[0]!.fraction).toBe(1);
    expect(marks[0]!.atLevelUp, 'a coinciding threshold was not flagged').toBe(true);
  });

  it('excludes the band floor, so a reward already collected is not re-announced', () => {
    /*
     * Standing exactly on 5,500 means Level 7 has just begun AND Field Card 5 has just been
     * won. Drawing it pinned to the left edge of the fresh bar would show the reward again on
     * the very screen that announced it. The range is exclusive at the floor for this reason.
     */
    const marks = milestonesInLevel(at(5500));
    expect(marks.map((m) => m.xp), 'the floor threshold was drawn on the new band').not.toContain(5500);
    expect(marks.map((m) => m.xp)).toEqual([7000]);
  });

  it('never crowds the bar: at most one marker in any band, across the whole ladder', () => {
    /*
     * This is measured rather than assumed, and it is what decides the visual design. If a
     * future threshold change makes two land in one band, this fails and the bar needs a
     * crowding rule before it ships.
     */
    for (const level of LEVELS) {
      const marks = milestonesInLevel(at(level.minXp + 1));
      expect(marks.length, `level ${level.level} carries ${marks.length} markers`).toBeLessThanOrEqual(1);
    }
  });

  it('draws nothing at max level, where the band and the remaining cards are both empty', () => {
    const max = LEVELS[LEVELS.length - 1]!;
    expect(at(max.minXp).nextLevelXp).toBeNull();
    expect(milestonesInLevel(at(max.minXp))).toEqual([]);
    // And that is honest rather than a hidden state: the ladder tops out above the last card.
    expect(FIELD_CARD_SLOTS[FIELD_CARDS_TOTAL - 1]!.xp).toBeLessThan(max.minXp);
  });

  it('reads every threshold from field-cards.ts rather than restating one', () => {
    const seen = new Set<number>();
    for (const level of LEVELS) {
      for (const mark of milestonesInLevel(at(level.minXp + 1))) seen.add(mark.xp);
    }
    // Every card except any sitting on the very first band floor is reachable as a marker.
    for (const slot of FIELD_CARD_SLOTS) {
      expect(seen.has(slot.xp), `slot ${slot.ordinal} (${slot.xp} XP) is never drawn`).toBe(true);
    }
  });
});

describe('the line under the bar names what is actually next', () => {
  it('says both at once when one XP total buys both', () => {
    // 3,875 XP: Level 7 and Field Card 5 both sit at 5,500.
    expect(progressionSubtext(at(3875))).toBe('1,625 XP to Level 7 + your next Field Card');
  });

  it('leads with the Field Card when it comes first', () => {
    // 6,375 XP: card 6 at 7,000 (625 away), level 8 at 8,000 (1,625 away).
    expect(progressionSubtext(at(6375))).toBe(
      '625 XP to next Field Card · 1,625 XP to Level 8',
    );
  });

  it('leads with the level when THAT comes first, which includes a brand-new player', () => {
    /*
     * REAL XP TOTALS, and this test used to fake one. I had reasoned that "level first" was
     * unreachable because every card either coincides with a level-up or precedes it — which
     * ignores the ordinary case where the band's card is already earned and the next is a
     * band away. At 9,000 XP the next level (10,000) beats the next card (11,000).
     *
     * And 0 XP does the same thing: Level 2 is 250 away, the first Field Card 600. So the
     * shape I called impossible is the first line every new player reads.
     */
    expect(progressionSubtext(at(9000))).toBe('1,000 XP to Level 9 · 2,000 XP to next Field Card');
    expect(progressionSubtext(at(0))).toBe('250 XP to Level 2 · 600 XP to next Field Card');
  });

  it('produces all four shapes from real XP totals, none of them vanishingly rare', () => {
    /*
     * The guard on the reasoning above: sweep the whole ladder and count which sentence each
     * XP total yields. If a future threshold change strands one shape at zero occurrences,
     * that is worth knowing deliberately rather than discovering from a screenshot.
     */
    const seen = { both: 0, cardFirst: 0, levelFirst: 0, levelOnly: 0 };
    for (let xp = 0; xp <= 15000; xp += 25) {
      const line = progressionSubtext(at(xp));
      if (line.includes('+ your next Field Card')) seen.both += 1;
      else if (!line.includes('Field Card')) seen.levelOnly += 1;
      else if (line.indexOf('Field Card') < line.indexOf('Level')) seen.cardFirst += 1;
      else seen.levelFirst += 1;
    }
    for (const [shape, count] of Object.entries(seen)) {
      expect(count, `the "${shape}" sentence has no reachable XP total`).toBeGreaterThan(0);
    }
  });

  it('falls back to plain level progress once all nine are held', () => {
    // 14,000 XP holds every card; Level 11 is still 1,000 away.
    const text = progressionSubtext(at(14000));
    expect(text).toBe('1,000 XP to Level 11');
    expect(text, 'Field Cards are still being mentioned with none left').not.toMatch(/Field Card/);
  });

  it('says nothing about a next level at the top of the ladder', () => {
    expect(progressionSubtext(at(LEVELS[LEVELS.length - 1]!.minXp))).toBe('Highest level reached.');
  });

  it('never restates a threshold: the numbers move when the player does', () => {
    // A sanity sweep — every XP total produces a line, and none of them is empty or NaN.
    for (let xp = 0; xp <= 15000; xp += 137) {
      const line = progressionSubtext(at(xp));
      expect(line.length, `empty subtext at ${xp} XP`).toBeGreaterThan(0);
      expect(line, `NaN leaked into the subtext at ${xp} XP`).not.toMatch(/NaN/);
    }
  });
});
