import { describe, expect, it } from 'vitest';
import {
  buildWorld,
  currentSeason,
  DAILY_BOARD_SIZE,
  deckSupply,
  localDateKey,
  pickDailyTasks,
  progressForTask,
  researchTaskById,
  STANDING_TASKS,
  xpForTask,
  type ResearchWorld,
} from './research';
import { reconcileResearch, applyDiscovery, applyLearned } from './herbdex-reducer';
import { emptyState } from './storage';
import { getHerb, HERBS } from './deck';
import { RESEARCH_XP, xpForState } from './progression';
import type { HerbdexState } from './types';

const at = '2026-01-01T00:00:00.000Z';

function world(
  state: HerbdexState = emptyState(),
  sightingCounts: Record<string, number> = {},
): ResearchWorld {
  return buildWorld(state, sightingCounts);
}

/** Discover / learn every card matching a predicate, through the real transitions. */
function progressThrough(
  ids: string[],
  stage: 'discovered' | 'learned' = 'discovered',
): HerbdexState {
  let state = emptyState();
  for (const id of ids) {
    state = applyDiscovery(state, id, at).state;
    if (stage === 'learned') state = applyLearned(state, id, at).state;
  }
  return state;
}

describe('no task can be impossible', () => {
  /**
   * THE test in this file.
   *
   * The deck holds 22 summer cards, 14 spring, 8 autumn and exactly ONE winter card.
   * A challenge asking for three winter plants would not be hard, it would be unwinnable —
   * and a player would rightly read it as the app being broken. Every target has to be
   * within what the physical deck can actually supply.
   */
  it('never sets a target higher than the deck can supply', () => {
    for (const task of STANDING_TASKS) {
      for (const step of task.steps) {
        // The most a step can ever measure is every card in the deck satisfying it, which
        // is bounded above by the deck itself.
        expect(step.target).toBeGreaterThan(0);
        expect(step.target).toBeLessThanOrEqual(HERBS.length);
      }
    }
  });

  it('is completable end to end for every standing task, using the real deck', () => {
    // The strongest possible version: fully master the entire deck and log a sighting of
    // everything, then assert every standing task reports itself finished. If any task
    // asked for something the deck cannot provide, this fails.
    let state = emptyState();
    const counts: Record<string, number> = {};
    for (const herb of HERBS) {
      state = applyDiscovery(state, herb.id, at).state;
      state = applyLearned(state, herb.id, at).state;
      state = { ...state, mastered: { ...state.mastered, [herb.id]: at } };
      counts[herb.id] = 2;
    }

    const complete = world(state, counts);
    for (const task of STANDING_TASKS) {
      expect(progressForTask(task, complete).qualifies, `${task.id} is not completable`).toBe(
        true,
      );
    }
  });

  it('sizes the winter challenge to the single winter card the deck actually has', () => {
    const winter = STANDING_TASKS.find((task) => task.id === 'seasonal:winter');
    expect(winter).toBeDefined();
    expect(winter!.herbIds).toHaveLength(deckSupply((herb) => herb.season === 'winter'));
    for (const step of winter!.steps) {
      expect(step.target).toBeLessThanOrEqual(winter!.herbIds.length);
    }
  });

  it('names only real cards in the Backyard Collection', () => {
    const backyard = STANDING_TASKS.find((task) => task.id === 'collection:backyard');
    expect(backyard).toBeDefined();
    for (const herbId of backyard!.herbIds) {
      const herb = getHerb(herbId);
      expect(herb, `${herbId} is not a card in this deck`).toBeDefined();
      // The point of the challenge is that these are findable without going anywhere.
      expect(herb!.rarity).toBe('Common');
    }
  });
});

describe('progressForTask', () => {
  const seasonalSpring = STANDING_TASKS.find((task) => task.id === 'seasonal:spring')!;

  it('reports nothing done for an empty collection', () => {
    const progress = progressForTask(seasonalSpring, world());
    expect(progress.current).toBe(0);
    expect(progress.qualifies).toBe(false);
    expect(progress.done).toBe(false);
  });

  it('counts only cards matching the task, not the whole collection', () => {
    const summerIds = HERBS.filter((herb) => herb.season === 'summer').map((herb) => herb.id);
    const progress = progressForTask(seasonalSpring, world(progressThrough(summerIds)));
    expect(progress.steps[0]!.current).toBe(0);
  });

  it('clamps a step at its target rather than overshooting', () => {
    const springIds = HERBS.filter((herb) => herb.season === 'spring').map((herb) => herb.id);
    const progress = progressForTask(seasonalSpring, world(progressThrough(springIds)));
    const discover = progress.steps[0]!;
    expect(discover.current).toBe(discover.target);
  });

  it('treats a recorded completion as done even when the steps no longer qualify', () => {
    const state: HerbdexState = {
      ...emptyState(),
      research: { [seasonalSpring.id]: at },
    };
    const progress = progressForTask(seasonalSpring, world(state));
    expect(progress.qualifies).toBe(false);
    expect(progress.done).toBe(true);
    expect(progress.completedAt).toBe(at);
  });
});

describe('reconcileResearch', () => {
  const backyard = STANDING_TASKS.find((task) => task.id === 'collection:backyard')!;

  function backyardComplete(): HerbdexState {
    return progressThrough([...backyard.herbIds]);
  }

  it('records a completed task and awards its XP', () => {
    const state = backyardComplete();
    const before = xpForState(state);

    const outcome = reconcileResearch(state, world(state), [backyard], at);

    expect(outcome.completedIds).toEqual([backyard.id]);
    expect(outcome.xpAwarded).toBe(RESEARCH_XP.collection);
    expect(outcome.state.research[backyard.id]).toBe(at);
    expect(xpForState(outcome.state)).toBe(before + RESEARCH_XP.collection);
  });

  it('returns the same object when nothing qualifies, so no write happens', () => {
    const state = emptyState();
    expect(reconcileResearch(state, world(state), STANDING_TASKS, at).state).toBe(state);
  });

  it('is idempotent — re-running awards nothing and rewrites no timestamp', () => {
    const state = backyardComplete();
    const once = reconcileResearch(state, world(state), [backyard], at).state;
    const again = reconcileResearch(once, world(once), [backyard], '2027-06-06T00:00:00.000Z');

    expect(again.completedIds).toEqual([]);
    expect(again.state).toBe(once);
    expect(again.state.research[backyard.id]).toBe(at);
    expect(xpForState(again.state)).toBe(xpForState(once));
  });

  it('cannot be farmed by running it fifty times', () => {
    let state = backyardComplete();
    for (let i = 0; i < 50; i += 1) {
      state = reconcileResearch(state, world(state), [backyard], at).state;
    }
    expect(Object.keys(state.research)).toEqual([backyard.id]);
  });

  /**
   * The same guarantee mastery has. A task finished by logging a sighting must survive
   * that sighting being deleted — tidying an old journal entry is not a reason to take
   * back something already earned.
   */
  it('never revokes a completion when the facts behind it change', () => {
    const herb = HERBS[0]!;
    const learned = applyLearned(applyDiscovery(emptyState(), herb.id, at).state, herb.id, at)
      .state;
    const task = researchTaskById(`daily:revisit:${herb.id}`)!;

    const completed = reconcileResearch(learned, world(learned, { [herb.id]: 1 }), [task], at)
      .state;
    expect(completed.research[task.id]).toBe(at);

    // Delete the sighting.
    const afterDeletion = reconcileResearch(completed, world(completed, {}), [task], at).state;
    expect(afterDeletion.research[task.id]).toBe(at);
    expect(progressForTask(task, world(afterDeletion, {})).done).toBe(true);
    expect(xpForState(afterDeletion)).toBe(xpForState(completed));
  });

  /**
   * A daily only pays once it has been OFFERED. Without this, every eligible daily in the
   * deck would silently complete the moment its condition happened to be true, and a
   * player would be handed hundreds of XP for tasks they were never shown.
   */
  it('ignores a qualifying task that is not active', () => {
    const state = backyardComplete();
    const outcome = reconcileResearch(state, world(state), [], at);
    expect(outcome.completedIds).toEqual([]);
    expect(outcome.state).toBe(state);
  });

  it('does not mutate the state it is given', () => {
    const state = backyardComplete();
    const snapshot = JSON.stringify(state);
    reconcileResearch(state, world(state), [backyard], at);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('daily board', () => {
  it('offers only tasks that are not already satisfied', () => {
    const empty = world();
    const picks = pickDailyTasks(empty, '2026-08-22', new Set());
    for (const task of picks) {
      expect(progressForTask(task, empty).qualifies).toBe(false);
    }
  });

  it('offers nothing that depends on a card the player has not found', () => {
    // A fresh player can only be asked to FIND things — learning, revisiting and mastering
    // all require a card they do not have yet.
    const picks = pickDailyTasks(world(), '2026-08-22', new Set(), 20);
    for (const task of picks) {
      expect(task.id.startsWith('daily:find:')).toBe(true);
    }
  });

  it('is deterministic for a given date and player state', () => {
    const w = world();
    const a = pickDailyTasks(w, '2026-08-22', new Set()).map((task) => task.id);
    const b = pickDailyTasks(w, '2026-08-22', new Set()).map((task) => task.id);
    expect(a).toEqual(b);
  });

  it('offers a different set on a different date', () => {
    const w = world();
    const a = pickDailyTasks(w, '2026-08-22', new Set()).map((task) => task.id);
    const b = pickDailyTasks(w, '2026-09-30', new Set()).map((task) => task.id);
    expect(a).not.toEqual(b);
  });

  it('fills the board and honours exclusions', () => {
    const w = world();
    const first = pickDailyTasks(w, '2026-08-22', new Set());
    expect(first).toHaveLength(DAILY_BOARD_SIZE);

    const exclude = new Set(first.map((task) => task.id));
    const second = pickDailyTasks(w, '2026-08-22', exclude);
    for (const task of second) expect(exclude.has(task.id)).toBe(false);
  });

  it('spreads picks across templates once the player has cards to work with', () => {
    const ids = HERBS.slice(0, 10).map((herb) => herb.id);
    const state = progressThrough(ids, 'learned');
    const picks = pickDailyTasks(world(state), '2026-08-22', new Set(), 6);
    const templates = new Set(picks.map((task) => task.id.split(':')[1]));
    expect(templates.size).toBeGreaterThan(1);
  });

  it('runs dry rather than repeating itself when there is nothing left to ask', () => {
    // Everything discovered, learned, mastered and re-sighted: no daily applies.
    let state = emptyState();
    const counts: Record<string, number> = {};
    for (const herb of HERBS) {
      state = applyDiscovery(state, herb.id, at).state;
      state = applyLearned(state, herb.id, at).state;
      state = { ...state, mastered: { ...state.mastered, [herb.id]: at } };
      counts[herb.id] = 1;
    }
    expect(pickDailyTasks(world(state, counts), '2026-08-22', new Set())).toEqual([]);
  });
});

describe('researchTaskById', () => {
  it('resolves standing tasks', () => {
    for (const task of STANDING_TASKS) {
      expect(researchTaskById(task.id)?.id).toBe(task.id);
    }
  });

  it('resolves a daily id back to the same task', () => {
    const herb = HERBS[0]!;
    const task = researchTaskById(`daily:find:${herb.id}`);
    expect(task).toBeDefined();
    expect(task!.herbIds).toEqual([herb.id]);
    expect(task!.kind).toBe('daily');
  });

  it('refuses ids that are not real tasks, so they can never be worth XP', () => {
    for (const id of [
      '',
      'nonsense',
      'daily:',
      'daily:find:not-a-herb',
      'daily:not-a-template:urtica-dioica',
      'seasonal:not-a-season',
      'collection:invented',
    ]) {
      expect(researchTaskById(id), id).toBeUndefined();
    }
  });
});

describe('XP', () => {
  it('pays each kind at the rate in the progression table', () => {
    for (const task of STANDING_TASKS) {
      expect(xpForTask(task)).toBe(RESEARCH_XP[task.kind]);
    }
    expect(xpForTask(researchTaskById(`daily:find:${HERBS[0]!.id}`)!)).toBe(RESEARCH_XP.daily);
  });

  it('is stable when the same state is scored twice', () => {
    const state: HerbdexState = {
      ...emptyState(),
      research: { 'seasonal:spring': at, 'collection:backyard': at },
    };
    expect(xpForState(state)).toBe(xpForState(state));
    expect(xpForState(state)).toBe(RESEARCH_XP.seasonal + RESEARCH_XP.collection);
  });

  it('is worth nothing for an id with an unrecognised prefix', () => {
    const state: HerbdexState = { ...emptyState(), research: { 'made-up:thing': at } };
    expect(xpForState(state)).toBe(0);
  });
});

describe('date helpers', () => {
  it('formats a local date key without drifting across timezones', () => {
    // Constructed from local parts, so this is the same calendar day the player sees.
    const key = localDateKey(new Date(2026, 7, 22, 23, 30));
    expect(key).toBe('2026-08-22');
  });

  it('maps months onto the deck seasons', () => {
    expect(currentSeason(new Date(2026, 0, 15))).toBe('winter');
    expect(currentSeason(new Date(2026, 3, 15))).toBe('spring');
    expect(currentSeason(new Date(2026, 6, 15))).toBe('summer');
    expect(currentSeason(new Date(2026, 9, 15))).toBe('autumn');
  });
});

describe('the task set stays honest', () => {
  /**
   * AGENTS.md suggests a Pollinator Challenge, and the deck carries no pollinator data.
   * Grouping cards by a property the cards do not have would mean deciding for myself
   * which species qualify — inventing botany, which is the one thing this project rules
   * out absolutely. This test pins that decision so it is a deliberate choice rather than
   * something that quietly reappears.
   */
  it('groups cards only by properties actually printed on them', () => {
    const printed = /^(seasonal|collection|daily):/;
    for (const task of STANDING_TASKS) {
      expect(task.id).toMatch(printed);
    }
    const ids = STANDING_TASKS.map((task) => task.id);
    expect(ids).not.toContain('collection:pollinator');
  });

  it('never asks the player to find plants grouped by a traditional use', () => {
    // The use icons describe traditional and historical use. A task sending someone out to
    // find "edible" or "wound" plants edges from collecting toward prompting use, which is
    // not what a collecting challenge is for.
    const forbidden = /edible|wound|digestive|urinary|immune|calm|heart|lungs|topical/i;
    for (const task of STANDING_TASKS) {
      expect(task.title).not.toMatch(forbidden);
      for (const step of task.steps) expect(step.label).not.toMatch(forbidden);
    }
  });
});
