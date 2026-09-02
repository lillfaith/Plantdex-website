import { describe, expect, it } from 'vitest';
import { HERBS } from './deck';
import { emptyState } from './storage';
import { HABITATS, habitatOf, type HabitatClass } from './habitat';
import { isUnlocked, unlockedIds } from './cosmetics';
import {
  DEFAULT_FRAME_ID,
  FIELD_FRAMES,
  MASTERED_FOR_BLOOM,
  getFrame,
  resolveFrame,
} from './field-frames';
import {
  FIELD_TITLES,
  HABITAT_SPECIALIST_ID,
  HABITAT_SPECIALIST_THRESHOLD,
  MASTERED_FOR_CARDWRIGHT,
  discoveriesPerHabitat,
  getTitle,
  qualifyingHabitat,
  titleLabel,
} from './field-titles';
import type { HerbdexState } from './types';

const AT = '2026-01-01T00:00:00.000Z';

function stateWith({
  discovered = [] as string[],
  mastered = [] as string[],
}): HerbdexState {
  const state = emptyState();
  for (const id of discovered) state.discoveries[id] = AT;
  for (const id of mastered) {
    state.discoveries[id] = AT;
    state.mastered[id] = AT;
  }
  return state;
}

const idsInHabitat = (habitat: HabitatClass) =>
  HERBS.filter((herb) => habitatOf(herb.id)?.primary === habitat).map((herb) => herb.id);

const ALL = [...FIELD_FRAMES, ...FIELD_TITLES];

describe('the cosmetic registries', () => {
  it('have unique, stable, slug-shaped ids across both sets', () => {
    const ids = ALL.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('give every entry a condition sentence for the cabinet to print', () => {
    for (const item of ALL) expect(item.condition.trim().length).toBeGreaterThan(0);
  });

  /*
   * The front-loading the ladder was designed around: a brand-new player must open the
   * cabinet and find something already theirs, not a wall of locks. If somebody later
   * gates the default frame or the starter title behind a discovery, this fails.
   */
  it('give an empty collection exactly one frame and one title', () => {
    const empty = emptyState();
    expect(unlockedIds(FIELD_FRAMES, empty)).toEqual([DEFAULT_FRAME_ID]);
    expect(unlockedIds(FIELD_TITLES, empty)).toEqual(['seedling-scholar']);
  });

  it('unlock everything for a fully mastered deck', () => {
    const all = HERBS.map((herb) => herb.id);
    const complete = stateWith({ discovered: all, mastered: all });
    // Research-gated titles are the exception: they need research records, not cards.
    const researchGated = new Set(['field-researcher', 'seasonal-surveyor']);
    for (const frame of FIELD_FRAMES) expect(frame.isUnlocked(complete)).toBe(true);
    for (const title of FIELD_TITLES) {
      if (researchGated.has(title.id)) continue;
      expect(title.isUnlocked(complete)).toBe(true);
    }
  });

  /*
   * Purity. A predicate that read a clock or a random source would make the cabinet, the
   * picker and the resolver capable of disagreeing about the same collection.
   */
  it('are pure: the same state always gives the same answer', () => {
    const half = HERBS.slice(0, 22).map((herb) => herb.id);
    const state = stateWith({ discovered: half, mastered: half.slice(0, 12) });
    for (const item of ALL) expect(item.isUnlocked(state)).toBe(item.isUnlocked(state));
  });
});

describe('frame thresholds', () => {
  it('bloom needs exactly MASTERED_FOR_BLOOM cards', () => {
    const ids = HERBS.map((herb) => herb.id);
    const under = stateWith({ mastered: ids.slice(0, MASTERED_FOR_BLOOM - 1) });
    const at = stateWith({ mastered: ids.slice(0, MASTERED_FOR_BLOOM) });
    expect(getFrame('bloom')!.isUnlocked(under)).toBe(false);
    expect(getFrame('bloom')!.isUnlocked(at)).toBe(true);
  });

  it('does not count mastery records for ids that are not real cards', () => {
    const state = emptyState();
    for (let i = 0; i < 40; i += 1) state.mastered[`not-a-herb-${i}`] = AT;
    expect(getFrame('bloom')!.isUnlocked(state)).toBe(false);
  });
});

describe('resolveFrame', () => {
  const empty = emptyState();

  it('falls back to the default for an unearned frame', () => {
    expect(resolveFrame('starlight', empty).id).toBe(DEFAULT_FRAME_ID);
  });

  it('falls back to the default for an id from a build that no longer exists', () => {
    expect(resolveFrame('frame-from-2024', empty).id).toBe(DEFAULT_FRAME_ID);
    expect(resolveFrame(null, empty).id).toBe(DEFAULT_FRAME_ID);
  });

  it('returns the chosen frame once it is genuinely earned', () => {
    const earned = stateWith({ discovered: [HERBS[0]!.id] });
    expect(resolveFrame('amber-ring', earned).id).toBe('amber-ring');
  });
});

describe('isUnlocked', () => {
  it('is false for an unknown id rather than throwing', () => {
    expect(isUnlocked(FIELD_TITLES, 'no-such-title', emptyState())).toBe(false);
    expect(isUnlocked(FIELD_TITLES, null, emptyState())).toBe(false);
  });
});

/*
 * HABITAT SPECIALIST — the title that must privilege no habitat.
 */
describe('Habitat Specialist', () => {
  it('is earned on identical terms by every habitat, one at a time', () => {
    for (const habitat of HABITATS) {
      const ids = idsInHabitat(habitat);
      expect(ids.length).toBeGreaterThanOrEqual(HABITAT_SPECIALIST_THRESHOLD);

      const under = stateWith({ discovered: ids.slice(0, HABITAT_SPECIALIST_THRESHOLD - 1) });
      const at = stateWith({ discovered: ids.slice(0, HABITAT_SPECIALIST_THRESHOLD) });

      expect(qualifyingHabitat(under)).toBeNull();
      expect(qualifyingHabitat(at)).toBe(habitat);
      expect(getTitle(HABITAT_SPECIALIST_ID)!.isUnlocked(at)).toBe(true);
    }
  });

  it('counts by primary habitat only', () => {
    // A species whose SECONDARY is woodland must not push anyone toward Woodland.
    const secondaryOnly = HERBS.filter(
      (herb) => habitatOf(herb.id)?.secondary === 'woodland' && habitatOf(herb.id)?.primary !== 'woodland',
    ).map((herb) => herb.id);
    if (secondaryOnly.length >= HABITAT_SPECIALIST_THRESHOLD) {
      const state = stateWith({ discovered: secondaryOnly.slice(0, HABITAT_SPECIALIST_THRESHOLD) });
      expect(qualifyingHabitat(state)).not.toBe('woodland');
    }
    const counts = discoveriesPerHabitat(
      stateWith({ discovered: idsInHabitat('wayside').slice(0, 3) }),
    );
    expect(counts.wayside).toBe(3);
  });

  /*
   * THE TIE-BREAK. Discoveries are an object, so "whichever habitat came first" would
   * depend on insertion order — the same collection could print a different title after a
   * reload or a sync. Built here in BOTH insertion orders; the answer must not move.
   */
  it('breaks an exact tie deterministically, whatever order the finds went in', () => {
    const a = idsInHabitat(HABITATS[0]!).slice(0, HABITAT_SPECIALIST_THRESHOLD);
    const b = idsInHabitat(HABITATS[1]!).slice(0, HABITAT_SPECIALIST_THRESHOLD);
    const forwards = stateWith({ discovered: [...a, ...b] });
    const backwards = stateWith({ discovered: [...b, ...a] });
    expect(qualifyingHabitat(forwards)).toBe(HABITATS[0]);
    expect(qualifyingHabitat(backwards)).toBe(HABITATS[0]);
  });

  it('prefers the habitat with more finds over HABITATS order', () => {
    const first = idsInHabitat(HABITATS[0]!).slice(0, HABITAT_SPECIALIST_THRESHOLD);
    const second = idsInHabitat(HABITATS[1]!).slice(0, HABITAT_SPECIALIST_THRESHOLD + 2);
    expect(second.length).toBe(HABITAT_SPECIALIST_THRESHOLD + 2);
    expect(qualifyingHabitat(stateWith({ discovered: [...first, ...second] }))).toBe(HABITATS[1]);
  });

  it('labels itself with the qualifying habitat, and plainly when there is none', () => {
    const earned = stateWith({
      discovered: idsInHabitat('wetland').slice(0, HABITAT_SPECIALIST_THRESHOLD),
    });
    const title = getTitle(HABITAT_SPECIALIST_ID)!;
    expect(titleLabel(title, earned, 'Wetland')).toBe('Habitat Specialist · Wetland');
    expect(titleLabel(title, emptyState(), 'Wetland')).toBe('Habitat Specialist');
  });

  it('leaves every other title label alone', () => {
    const title = getTitle('cardwright')!;
    expect(titleLabel(title, emptyState(), 'Wetland')).toBe('Cardwright');
  });
});

describe('cardwright', () => {
  it('needs exactly MASTERED_FOR_CARDWRIGHT cards', () => {
    const ids = HERBS.map((herb) => herb.id);
    expect(getTitle('cardwright')!.isUnlocked(stateWith({ mastered: ids.slice(0, MASTERED_FOR_CARDWRIGHT - 1) }))).toBe(false);
    expect(getTitle('cardwright')!.isUnlocked(stateWith({ mastered: ids.slice(0, MASTERED_FOR_CARDWRIGHT) }))).toBe(true);
  });
});
