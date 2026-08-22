import { describe, expect, it } from 'vitest';
import {
  applyDiscovery,
  applyLearned,
  herbdexReducer,
  reconcileMastery,
} from './herbdex-reducer';
import { emptyState } from './storage';
import { HERBS } from './deck';
import { xpForState, XP_FOR_LEARNING, XP_FOR_MASTERY } from './progression';
import { masteryTotals, qualifiesForMastery, stageFor, stageIndex } from './mastery';
import { buildGarden, stageForState } from './garden';
import type { HerbdexState } from './types';

const herb = HERBS[0]!;
const other = HERBS[1]!;
const at = '2026-01-01T00:00:00.000Z';

/** The full loop the product describes: find it → learn it → find it again. */
function findAndLearn(id: string): HerbdexState {
  const found = applyDiscovery(emptyState(), id, at).state;
  return applyLearned(found, id, at).state;
}

describe('applyLearned', () => {
  it('records learning and awards its XP once the card has been discovered', () => {
    const found = applyDiscovery(emptyState(), herb.id, at).state;
    const { state, result } = applyLearned(found, herb.id, at);

    expect(result.awarded).toBe(true);
    expect(result.xpAwarded).toBe(XP_FOR_LEARNING);
    expect(state.learned[herb.id]).toBe(at);
    expect(xpForState(state)).toBe(herb.xp + XP_FOR_LEARNING);
  });

  it('refuses to learn a card that has not been discovered', () => {
    const { state, result } = applyLearned(emptyState(), herb.id, at);
    expect(result.awarded).toBe(false);
    expect(state.learned).toEqual({});
  });

  it('refuses an unknown herb id', () => {
    const { result } = applyLearned(
      { ...emptyState(), discoveries: { ghost: at } },
      'ghost',
      at,
    );
    expect(result.awarded).toBe(false);
  });

  /** Same guarantee as discovery: replaying can never pay twice. */
  it('is idempotent — the same object back, and no second award', () => {
    const once = findAndLearn(herb.id);
    const xpAfter = xpForState(once);

    const again = applyLearned(once, herb.id, '2027-06-06T00:00:00.000Z');

    expect(again.result.awarded).toBe(false);
    expect(again.result.xpAwarded).toBe(0);
    expect(again.state).toBe(once);
    expect(again.state.learned[herb.id]).toBe(at);
    expect(xpForState(again.state)).toBe(xpAfter);
  });

  it('cannot be farmed by hammering the same card', () => {
    let state = applyDiscovery(emptyState(), herb.id, at).state;
    for (let i = 0; i < 50; i += 1) state = applyLearned(state, herb.id).state;
    expect(Object.keys(state.learned)).toHaveLength(1);
    expect(xpForState(state)).toBe(herb.xp + XP_FOR_LEARNING);
  });

  it('does not mutate the state it is given', () => {
    const found = applyDiscovery(emptyState(), herb.id, at).state;
    const snapshot = JSON.stringify(found);
    applyLearned(found, herb.id, at);
    expect(JSON.stringify(found)).toBe(snapshot);
  });
});

describe('reconcileMastery', () => {
  it('awards mastery once a learned card is sighted again', () => {
    const learned = findAndLearn(herb.id);
    const { state, masteredIds, xpAwarded } = reconcileMastery(learned, { [herb.id]: 1 }, at);

    expect(masteredIds).toEqual([herb.id]);
    expect(xpAwarded).toBe(XP_FOR_MASTERY);
    expect(state.mastered[herb.id]).toBe(at);
    expect(xpForState(state)).toBe(herb.xp + XP_FOR_LEARNING + XP_FOR_MASTERY);
  });

  it('withholds mastery from a card that was found again but never learned', () => {
    const found = applyDiscovery(emptyState(), herb.id, at).state;
    const { state, masteredIds } = reconcileMastery(found, { [herb.id]: 9 }, at);
    expect(masteredIds).toEqual([]);
    expect(state).toBe(found);
  });

  it('withholds mastery from a learned card with no repeat sighting', () => {
    const learned = findAndLearn(herb.id);
    expect(reconcileMastery(learned, {}, at).masteredIds).toEqual([]);
    expect(reconcileMastery(learned, {}, at).state).toBe(learned);
  });

  it('returns the same object when nothing qualifies, so no write happens', () => {
    const state = emptyState();
    expect(reconcileMastery(state, {}, at).state).toBe(state);
  });

  it('is idempotent — re-running awards nothing and rewrites no timestamp', () => {
    const learned = findAndLearn(herb.id);
    const once = reconcileMastery(learned, { [herb.id]: 3 }, at).state;
    const again = reconcileMastery(once, { [herb.id]: 3 }, '2027-06-06T00:00:00.000Z');

    expect(again.masteredIds).toEqual([]);
    expect(again.state).toBe(once);
    expect(again.state.mastered[herb.id]).toBe(at);
    expect(xpForState(again.state)).toBe(xpForState(once));
  });

  /**
   * Mastery is an achievement, not a live status. Deleting the sighting that earned it —
   * tidying up an old journal entry — must never take it back.
   */
  it('never revokes mastery when the sighting that earned it is deleted', () => {
    const learned = findAndLearn(herb.id);
    const mastered = reconcileMastery(learned, { [herb.id]: 1 }, at).state;

    const afterDeletion = reconcileMastery(mastered, {}, at).state;

    expect(afterDeletion.mastered[herb.id]).toBe(at);
    expect(stageFor(afterDeletion, herb.id)).toBe('mastered');
    expect(xpForState(afterDeletion)).toBe(xpForState(mastered));
  });

  it('masters several cards in one pass and leaves the rest alone', () => {
    let state = findAndLearn(herb.id);
    state = applyDiscovery(state, other.id, at).state;
    state = applyLearned(state, other.id, at).state;

    const { masteredIds } = reconcileMastery(state, { [herb.id]: 1 }, at);
    expect(masteredIds).toEqual([herb.id]);
  });
});

describe('the three stages', () => {
  it('reports null for an undiscovered card and never regresses', () => {
    let state = emptyState();
    expect(stageFor(state, herb.id)).toBeNull();
    expect(stageIndex(null)).toBe(0);

    state = applyDiscovery(state, herb.id, at).state;
    expect(stageFor(state, herb.id)).toBe('discovered');
    expect(stageIndex('discovered')).toBe(1);

    state = applyLearned(state, herb.id, at).state;
    expect(stageFor(state, herb.id)).toBe('learned');
    expect(stageIndex('learned')).toBe(2);

    state = reconcileMastery(state, { [herb.id]: 1 }, at).state;
    expect(stageFor(state, herb.id)).toBe('mastered');
    expect(stageIndex('mastered')).toBe(3);
  });

  it('never qualifies an id that is not a real card', () => {
    const tampered: HerbdexState = {
      ...emptyState(),
      discoveries: { ghost: at },
      learned: { ghost: at },
    };
    expect(qualifiesForMastery(tampered, 'ghost', 99)).toBe(false);
    expect(masteryTotals(tampered)).toEqual({ discovered: 0, learned: 0, mastered: 0 });
  });

  it('counts each stage separately across the deck', () => {
    let state = findAndLearn(herb.id);
    state = applyDiscovery(state, other.id, at).state;
    state = reconcileMastery(state, { [herb.id]: 1 }, at).state;

    expect(masteryTotals(state)).toEqual({ discovered: 2, learned: 1, mastered: 1 });
  });
});

describe('the garden mirrors mastery exactly', () => {
  it('walks sprout → growing → flowering with the card', () => {
    let state = emptyState();
    expect(stageForState(state, herb.id)).toBeNull();

    state = applyDiscovery(state, herb.id, at).state;
    expect(stageForState(state, herb.id)).toBe('sprout');

    state = applyLearned(state, herb.id, at).state;
    expect(stageForState(state, herb.id)).toBe('growing');

    state = reconcileMastery(state, { [herb.id]: 1 }, at).state;
    expect(stageForState(state, herb.id)).toBe('flowering');
  });

  /** Sightings alone must not grow a plant — that is what the ladder used to do. */
  it('does not grow a plant for sightings on their own', () => {
    const found = applyDiscovery(emptyState(), herb.id, at).state;
    const afterManySightings = reconcileMastery(found, { [herb.id]: 20 }, at).state;
    expect(stageForState(afterManySightings, herb.id)).toBe('sprout');
  });

  it('plants only discovered species', () => {
    const state = applyDiscovery(emptyState(), herb.id, at).state;
    const garden = buildGarden(
      state,
      HERBS.map((entry) => entry.id),
    );
    expect(garden).toEqual([{ herbId: herb.id, stage: 'sprout' }]);
  });
});

describe('herbdexReducer', () => {
  it('runs the whole loop through the reducer', () => {
    let state = herbdexReducer(emptyState(), { type: 'discover', herbId: herb.id, at });
    expect(stageFor(state, herb.id)).toBe('discovered');

    state = herbdexReducer(state, { type: 'learn', herbId: herb.id, at });
    expect(stageFor(state, herb.id)).toBe('learned');

    state = herbdexReducer(state, {
      type: 'syncMastery',
      sightingCounts: { [herb.id]: 1 },
      at,
    });
    expect(stageFor(state, herb.id)).toBe('mastered');

    state = herbdexReducer(state, { type: 'reset' });
    expect(state.learned).toEqual({});
    expect(state.mastered).toEqual({});
  });
});
