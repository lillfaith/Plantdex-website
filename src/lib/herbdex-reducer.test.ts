import { describe, expect, it } from 'vitest';
import { applyDiscovery, herbdexReducer, reconcileAchievements } from './herbdex-reducer';
import { emptyState } from './storage';
import { HERBS } from './deck';
import { xpForState } from './progression';
import type { HerbdexState } from './types';

const first = HERBS[0]!;
const second = HERBS[1]!;

function discoverAll(ids: string[]): HerbdexState {
  let state = emptyState();
  for (const id of ids) state = applyDiscovery(state, id).state;
  return state;
}

describe('applyDiscovery', () => {
  it('records a first discovery and awards its XP', () => {
    const { state, result } = applyDiscovery(emptyState(), first.id);
    expect(result.awarded).toBe(true);
    expect(result.xpAwarded).toBe(first.xp);
    expect(state.discoveries[first.id]).toBeTruthy();
    expect(xpForState(state)).toBe(first.xp);
  });

  /**
   * The single most important guarantee in this milestone: AGENTS.md forbids awarding
   * XP repeatedly for the same discovery.
   */
  it('is idempotent — a repeated discovery awards nothing and changes nothing', () => {
    const once = applyDiscovery(emptyState(), first.id).state;
    const xpAfterFirst = xpForState(once);

    const again = applyDiscovery(once, first.id);

    expect(again.result.awarded).toBe(false);
    expect(again.result.xpAwarded).toBe(0);
    expect(again.result.newAchievementIds).toEqual([]);
    // Same object identity: nothing was rewritten, not even the timestamp.
    expect(again.state).toBe(once);
    expect(xpForState(again.state)).toBe(xpAfterFirst);
  });

  it('cannot be farmed by hammering the same herb', () => {
    let state = emptyState();
    for (let i = 0; i < 50; i += 1) state = applyDiscovery(state, first.id).state;

    expect(Object.keys(state.discoveries)).toHaveLength(1);
    expect(xpForState(state)).toBe(first.xp);
  });

  it('preserves the original discovery timestamp on a replay', () => {
    const once = applyDiscovery(emptyState(), first.id, '2026-01-01T00:00:00.000Z').state;
    const again = applyDiscovery(once, first.id, '2027-06-06T00:00:00.000Z').state;
    expect(again.discoveries[first.id]).toBe('2026-01-01T00:00:00.000Z');
  });

  it('rejects an unknown herb id instead of recording it', () => {
    const { state, result } = applyDiscovery(emptyState(), 'totally-made-up');
    expect(result.awarded).toBe(false);
    expect(state.discoveries).toEqual({});
  });

  it('accumulates XP across distinct herbs', () => {
    const state = discoverAll([first.id, second.id]);
    expect(xpForState(state)).toBe(first.xp + second.xp);
  });

  it('unlocks an achievement once, then never reports it again', () => {
    const firstResult = applyDiscovery(emptyState(), first.id);
    expect(firstResult.result.newAchievementIds).toContain('first-find');

    const secondResult = applyDiscovery(firstResult.state, second.id);
    expect(secondResult.result.newAchievementIds).not.toContain('first-find');
    expect(secondResult.state.achievements['first-find']).toBe(
      firstResult.state.achievements['first-find'],
    );
  });

  it('does not mutate the state it is given', () => {
    const original = emptyState();
    const snapshot = JSON.stringify(original);
    applyDiscovery(original, first.id);
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});

describe('herbdexReducer', () => {
  it('hydrates, discovers and resets', () => {
    const loaded = discoverAll([first.id]);
    let state = herbdexReducer(emptyState(), { type: 'hydrate', state: loaded });
    expect(state).toBe(loaded);

    state = herbdexReducer(state, { type: 'discover', herbId: second.id });
    expect(Object.keys(state.discoveries)).toHaveLength(2);

    state = herbdexReducer(state, { type: 'reset' });
    expect(state.discoveries).toEqual({});
    expect(state.achievements).toEqual({});
  });
});

describe('reconcileAchievements', () => {
  it('retroactively unlocks achievements a player already qualifies for', () => {
    // Simulates a saved collection from before an achievement existed.
    const state = emptyState();
    for (const herb of HERBS.slice(0, 12)) {
      state.discoveries[herb.id] = '2026-01-01T00:00:00.000Z';
    }
    expect(state.achievements).toEqual({});

    const reconciled = reconcileAchievements(state);
    expect(reconciled.achievements['first-find']).toBeTruthy();
    expect(reconciled.achievements['forager-10']).toBeTruthy();
    expect(reconciled.achievements['explorer-25']).toBeUndefined();
  });

  it('returns the same object when there is nothing to unlock', () => {
    const state = emptyState();
    expect(reconcileAchievements(state)).toBe(state);
  });
});
