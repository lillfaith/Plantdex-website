import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from './achievements';
import { DECK_SIZE, HERBS, getHerb } from './deck';
import { HABITATS, habitatOf } from './habitat';
import { emptyState } from './storage';
import { GARDEN_PREVIEW_COUNT, RECENT_FIND_COUNT, profileStats } from './profile-stats';
import type { HerbdexState } from './types';

function at(day: number): string {
  return `2026-01-${String(day).padStart(2, '0')}T00:00:00.000Z`;
}

function stateWith({
  discovered = {} as Record<string, string>,
  learned = [] as string[],
  mastered = [] as string[],
  research = [] as string[],
  achievements = [] as string[],
}): HerbdexState {
  const state = emptyState();
  Object.assign(state.discoveries, discovered);
  for (const id of learned) state.learned[id] = at(1);
  for (const id of mastered) state.mastered[id] = at(1);
  for (const id of research) state.research[id] = at(1);
  for (const id of achievements) state.achievements[id] = at(1);
  return state;
}

describe('an empty collection', () => {
  const stats = profileStats(emptyState());

  it('reads as a real level-1 profile rather than a broken one', () => {
    expect(stats.progress.level).toBe(1);
    expect(stats.discovered).toBe(0);
    expect(stats.completionPct).toBe(0);
    expect(stats.deckSize).toBe(DECK_SIZE);
    expect(stats.achievementsTotal).toBe(ACHIEVEMENTS.length);
  });

  /* "Woodland, 0" would be a lie dressed as a stat. Nothing explored means nothing to name. */
  it('names no top habitat and no rarest card', () => {
    expect(stats.topHabitat).toBeNull();
    expect(stats.rarestHerbId).toBeNull();
    expect(stats.recentFinds).toEqual([]);
    expect(stats.gardenPreview).toEqual([]);
  });

  it('still lists every habitat, so the strip has a shape to draw', () => {
    expect(stats.habitats.map((h) => h.habitat)).toEqual([...HABITATS]);
    expect(stats.habitats.every((h) => h.count === 0)).toBe(true);
  });
});

describe('counts', () => {
  it('ignores records for ids that are not real cards', () => {
    const stats = profileStats(
      stateWith({
        discovered: { 'not-a-herb': at(1) },
        learned: ['not-a-herb'],
        mastered: ['not-a-herb'],
      }),
    );
    expect(stats.discovered).toBe(0);
    expect(stats.learned).toBe(0);
    expect(stats.mastered).toBe(0);
    expect(stats.completionPct).toBe(0);
  });

  it('counts only research ids belonging to a known kind', () => {
    const stats = profileStats(
      stateWith({ research: ['daily:x', 'seasonal:y', 'nonsense:z', 'bare'] }),
    );
    expect(stats.researchCompleted).toBe(2);
  });

  it('reaches 100% on a complete collection', () => {
    const discovered = Object.fromEntries(HERBS.map((herb) => [herb.id, at(1)]));
    expect(profileStats(stateWith({ discovered })).completionPct).toBe(100);
  });
});

describe('the rarest card held', () => {
  it('is the highest rarity, and the lowest card number among equals', () => {
    const epics = HERBS.filter((herb) => herb.rarity === 'Epic').sort(
      (a, b) => a.cardNumber - b.cardNumber,
    );
    const commons = HERBS.filter((herb) => herb.rarity === 'Common').slice(0, 3);
    expect(epics.length).toBeGreaterThanOrEqual(2);

    const discovered = Object.fromEntries(
      [...commons, ...epics].map((herb) => [herb.id, at(1)]),
    );
    expect(profileStats(stateWith({ discovered })).rarestHerbId).toBe(epics[0]!.id);
  });

  /*
   * Discoveries are an object, so a "best" chosen by key order would move between a reload
   * and a sync. Built in both insertion orders; the answer must not change.
   */
  it('does not depend on the order the finds were recorded in', () => {
    const epics = HERBS.filter((herb) => herb.rarity === 'Epic').sort(
      (a, b) => a.cardNumber - b.cardNumber,
    );
    const forwards = Object.fromEntries(epics.map((herb) => [herb.id, at(1)]));
    const backwards = Object.fromEntries([...epics].reverse().map((herb) => [herb.id, at(1)]));
    expect(profileStats(stateWith({ discovered: forwards })).rarestHerbId).toBe(epics[0]!.id);
    expect(profileStats(stateWith({ discovered: backwards })).rarestHerbId).toBe(epics[0]!.id);
  });
});

describe('recent finds', () => {
  it('are the newest first, capped, and carry their real mastery stage', () => {
    const ids = HERBS.slice(0, 6).map((herb) => herb.id);
    const discovered = Object.fromEntries(ids.map((id, index) => [id, at(index + 1)]));
    const stats = profileStats(
      stateWith({ discovered, learned: [ids[5]!], mastered: [ids[5]!] }),
    );

    expect(stats.recentFinds).toHaveLength(RECENT_FIND_COUNT);
    expect(stats.recentFinds[0]!.herbId).toBe(ids[5]);
    expect(stats.recentFinds[0]!.stage).toBe('mastered');
    expect(stats.recentFinds[1]!.herbId).toBe(ids[4]);
    expect(stats.recentFinds[2]!.stage).toBe('discovered');
  });

  it('breaks a same-timestamp tie by card number, not by key order', () => {
    const ids = HERBS.slice(0, 4)
      .map((herb) => herb.id)
      .sort((a, b) => getHerb(b)!.cardNumber - getHerb(a)!.cardNumber);
    const discovered = Object.fromEntries(ids.map((id) => [id, at(2)]));
    const finds = profileStats(stateWith({ discovered })).recentFinds;
    const numbers = finds.map((find) => getHerb(find.herbId)!.cardNumber);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });
});

describe('the garden preview', () => {
  it('shows the most grown plants first and never the whole garden', () => {
    const ids = HERBS.slice(0, 12).map((herb) => herb.id);
    const discovered = Object.fromEntries(ids.map((id) => [id, at(1)]));
    const stats = profileStats(
      stateWith({ discovered, learned: [ids[9]!, ids[10]!], mastered: [ids[10]!] }),
    );

    expect(stats.gardenPreview.length).toBeLessThanOrEqual(GARDEN_PREVIEW_COUNT);
    expect(stats.gardenPreview[0]).toEqual({ herbId: ids[10], stage: 'flowering' });
    expect(stats.gardenPreview[1]).toEqual({ herbId: ids[9], stage: 'growing' });
  });
});

describe('habitat standings', () => {
  it('count by primary habitat only', () => {
    const woodland = HERBS.filter((herb) => habitatOf(herb.id)?.primary === 'woodland').slice(0, 4);
    const discovered = Object.fromEntries(woodland.map((herb) => [herb.id, at(1)]));
    const stats = profileStats(stateWith({ discovered }));
    expect(stats.topHabitat).toEqual({ habitat: 'woodland', count: 4 });
    expect(stats.habitats.find((h) => h.habitat === 'woodland')!.count).toBe(4);
  });
});
