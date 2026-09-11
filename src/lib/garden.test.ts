import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GARDEN_STAGE_BY_MASTERY,
  GROWTH_STAGES,
  MASTERY_BY_GARDEN_STAGE,
  gardenStageIndex,
  nextStageHint,
  type GardenEntry,
} from './garden';
import { MASTERY_STAGES, MASTERY_STAGE_LABEL, SIGHTINGS_FOR_MASTERY } from './mastery';
import { advancedNow, recordStages, resetGardenMoments } from './garden-moments';

/**
 * THE GARDEN'S v1 RULES, AND THERE WAS NO TEST FILE HERE AT ALL BEFORE THIS ONE.
 *
 * Two things are pinned: the mapping between the two vocabularies the Garden speaks (mastery
 * and growth), and the rule that decides when a plant has actually GROWN rather than merely
 * been rendered again.
 */

afterEach(() => resetGardenMoments());

describe('the two vocabularies stay in step', () => {
  it('maps growth back to mastery as an exact inverse, both ways', () => {
    /*
     * Spelled out rather than derived, so this is the guard. A fourth mastery stage added to
     * the forward map with nothing mapping back would otherwise be invisible until a tile
     * rendered `undefined`.
     */
    for (const mastery of MASTERY_STAGES) {
      expect(MASTERY_BY_GARDEN_STAGE[GARDEN_STAGE_BY_MASTERY[mastery]]).toBe(mastery);
    }
    for (const stage of GROWTH_STAGES) {
      expect(GARDEN_STAGE_BY_MASTERY[MASTERY_BY_GARDEN_STAGE[stage]]).toBe(stage);
    }
    expect(Object.keys(MASTERY_BY_GARDEN_STAGE)).toHaveLength(GROWTH_STAGES.length);
  });

  it('gives every growth stage a mastery word to print', () => {
    for (const stage of GROWTH_STAGES) {
      const word = MASTERY_STAGE_LABEL[MASTERY_BY_GARDEN_STAGE[stage]];
      expect(word, `no label for ${stage}`).toBeTruthy();
    }
    // The three the tile actually shows.
    expect(MASTERY_STAGE_LABEL[MASTERY_BY_GARDEN_STAGE.sprout]).toBe('Discovered');
    expect(MASTERY_STAGE_LABEL[MASTERY_BY_GARDEN_STAGE.growing]).toBe('Learned');
    expect(MASTERY_STAGE_LABEL[MASTERY_BY_GARDEN_STAGE.flowering]).toBe('Mastered');
  });
});

describe('the action line says what the rules actually require', () => {
  it('names the next action for the two unfinished stages, and none for the last', () => {
    expect(nextStageHint('sprout')).toBe('Learn its card');
    expect(nextStageHint('growing')).toBe('Find it again');
    expect(nextStageHint('flowering'), 'a finished plant was given homework').toBeNull();
  });

  it('describes the real mastery requirement, not a different one', () => {
    /*
     * `SIGHTINGS_FOR_MASTERY` is 1, so "find it again" IS the whole requirement. If that
     * constant ever rises, this copy becomes a lie — one sighting would no longer finish the
     * job — and this test is what says so rather than a player discovering it.
     */
    expect(SIGHTINGS_FOR_MASTERY, 'the growing-stage copy now understates the rule').toBe(1);
    expect(nextStageHint('growing')).toMatch(/again/i);
  });

  it('stays short enough for a three-across tile', () => {
    // ~85px of text width at 390px. Anything past ~24 characters wraps to three lines on
    // every one of up to 45 tiles, which is how the Garden doubles in height by accident.
    for (const stage of GROWTH_STAGES) {
      const hint = nextStageHint(stage);
      if (hint) expect(hint.length, `"${hint}" is too long for a tile`).toBeLessThanOrEqual(24);
    }
  });
});

describe('a plant has grown only if it moved forward since we last showed it', () => {
  const entry = (herbId: string, stage: GardenEntry['stage']): GardenEntry => ({ herbId, stage });

  it('announces nothing on the first read of a session, however full the garden', () => {
    /*
     * THE DEFECT THIS WHOLE STORE EXISTS FOR. `stage-grow` was unconditional, so every plant
     * crossfaded on every visit and the real event was hidden inside a page transition. An id
     * we have never shown is not an advance.
     */
    const fresh = recordStages([
      entry('a', 'sprout'),
      entry('b', 'growing'),
      entry('c', 'flowering'),
    ]);
    expect(fresh).toEqual([]);
    expect(advancedNow()).toEqual([]);
  });

  it('announces a plant that moved up the ladder', () => {
    recordStages([entry('a', 'sprout')]);
    expect(recordStages([entry('a', 'growing')])).toEqual(['a']);
    expect(advancedNow()).toEqual(['a']);
  });

  it('says nothing when the stage has not changed', () => {
    recordStages([entry('a', 'growing')]);
    expect(recordStages([entry('a', 'growing')])).toEqual([]);
  });

  it('says nothing when a plant moves BACKWARDS, because that is not a plant shrinking', () => {
    /*
     * Mastery never reverses, so a backward move means the collection changed identity
     * underneath us — signing out mid-session swaps to the signed-out one. Celebrating that
     * would congratulate somebody for losing their progress.
     */
    recordStages([entry('a', 'flowering')]);
    expect(recordStages([entry('a', 'sprout')])).toEqual([]);
    expect(advancedNow()).toEqual([]);
  });

  it('replaces the batch rather than appending, so the second event is not the first plus one', () => {
    recordStages([entry('a', 'sprout'), entry('b', 'sprout')]);
    expect(recordStages([entry('a', 'growing'), entry('b', 'sprout')])).toEqual(['a']);
    expect(recordStages([entry('a', 'growing'), entry('b', 'growing')])).toEqual(['b']);
    expect(advancedNow(), 'the earlier advance was announced a second time').toEqual(['b']);
  });

  it('treats two stages crossed at once as one advance for that plant', () => {
    recordStages([entry('a', 'sprout')]);
    expect(recordStages([entry('a', 'flowering')])).toEqual(['a']);
  });

  it('orders the ladder the way the stages are declared', () => {
    expect(gardenStageIndex('sprout')).toBeLessThan(gardenStageIndex('growing'));
    expect(gardenStageIndex('growing')).toBeLessThan(gardenStageIndex('flowering'));
  });
});

describe('the moment is gated, and silent under reduced motion', () => {
  it('applies the growth animation only to a plant that advanced', () => {
    /*
     * The regression guard for the shipped defect: `className="stage-grow block"` was
     * unconditional, so this fails against the version that is live today.
     */
    const sprite = readFileSync('src/components/garden/GrowthSprite.tsx', 'utf8');
    expect(sprite, 'the growth animation is unconditional again').not.toContain(
      '"stage-grow block"',
    );
    expect(sprite).toContain("advanced ? 'stage-grow node-earned' : ''");
  });

  it('freezes both halves of the moment when motion is reduced', () => {
    const css = readFileSync('src/app/globals.css', 'utf8');
    const blocks = css.split('@media (prefers-reduced-motion: reduce)').slice(1);
    const covered = blocks.join('\n');
    for (const name of ['stage-grow', 'node-earned']) {
      expect(covered, `${name} is not silenced under reduced motion`).toContain(`.${name}`);
    }
  });

  it('does not repeat the visible copy to screen readers', () => {
    /*
     * The hint used to be `sr-only` and invisible to everyone else — the bug this release
     * fixes. Now that it is on the tile, saying it twice would just make a screen reader
     * read it twice.
     */
    const view = readFileSync('src/components/garden/GardenView.tsx', 'utf8');
    expect(view, 'the hint is visible AND announced separately').not.toContain(
      '<span className="sr-only">{hint}</span>',
    );
  });

  it('marks a finished plant with something that does not move', () => {
    const view = readFileSync('src/components/garden/GardenView.tsx', 'utf8');
    expect(view).toContain('soil-line');
    // Whatever marks "finished" must not be one of the looping effects.
    expect(view, 'the flowering mark loops').not.toMatch(/animate-pulse|node-pulse|sparkle/);
  });
});
