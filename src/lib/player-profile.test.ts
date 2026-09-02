import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from './achievements';
import { HERBS } from './deck';
import { emptyState } from './storage';
import { DEFAULT_FRAME_ID } from './field-frames';
import {
  MAX_DISPLAY_NAME,
  MAX_PINNED,
  emptyProfile,
  isEmptyProfile,
  parseProfile,
  resolveProfile,
  type StoredProfile,
} from './player-profile';
import type { HerbdexState } from './types';

const AT = '2026-01-01T00:00:00.000Z';

function stateWith(discovered: string[], achievements: string[] = []): HerbdexState {
  const state = emptyState();
  for (const id of discovered) state.discoveries[id] = AT;
  for (const id of achievements) state.achievements[id] = AT;
  return state;
}

function profileWith(overrides: Partial<StoredProfile>): StoredProfile {
  return { ...emptyProfile(), ...overrides };
}

const FIRST = HERBS[0]!.id;
const SECOND = HERBS[1]!.id;

describe('parseProfile', () => {
  it('returns an empty profile for anything that is not an object', () => {
    for (const junk of [null, undefined, 'x', 7, []]) {
      expect(parseProfile(junk)).toEqual(emptyProfile());
    }
  });

  it('trims, collapses and caps a display name', () => {
    expect(parseProfile({ displayName: '  Ada   Lovelace  ' }).displayName).toBe('Ada Lovelace');
    expect(parseProfile({ displayName: '   ' }).displayName).toBeNull();
    expect(parseProfile({ displayName: 'a'.repeat(200) }).displayName).toHaveLength(
      MAX_DISPLAY_NAME,
    );
  });

  /* A name carrying a newline would break out of a single-line heading. */
  it('never keeps a newline in a display name', () => {
    expect(parseProfile({ displayName: 'Ada\nLovelace' }).displayName).toBe('Ada Lovelace');
  });

  it('caps and de-duplicates pinned achievements', () => {
    const parsed = parseProfile({ pinnedAchievementIds: ['a', 'a', 'b', 'c', 'd', 'e'] });
    expect(parsed.pinnedAchievementIds).toEqual(['a', 'b', 'c']);
    expect(parsed.pinnedAchievementIds.length).toBeLessThanOrEqual(MAX_PINNED);
  });

  it('drops non-string ids rather than storing them', () => {
    const parsed = parseProfile({
      avatarHerbId: 42,
      pinnedAchievementIds: [1, {}, 'real'],
    });
    expect(parsed.avatarHerbId).toBeNull();
    expect(parsed.pinnedAchievementIds).toEqual(['real']);
  });
});

describe('isEmptyProfile', () => {
  it('is true for a fresh profile and false once anything is chosen', () => {
    expect(isEmptyProfile(emptyProfile())).toBe(true);
    expect(isEmptyProfile(profileWith({ titleId: 'seedling-scholar' }))).toBe(false);
    expect(isEmptyProfile(profileWith({ pinnedAchievementIds: ['first-find'] }))).toBe(false);
  });
});

/*
 * THE RESOLVER. Everything below is the guard that stops the page rendering a selection the
 * collection does not support — the reason selections are validated on READ rather than on
 * write.
 */
describe('resolveProfile', () => {
  it('drops an avatar for a plant that has not been discovered', () => {
    const stored = profileWith({ avatarHerbId: FIRST });
    expect(resolveProfile(stored, emptyState()).avatarHerbId).toBeNull();
    expect(resolveProfile(stored, stateWith([FIRST])).avatarHerbId).toBe(FIRST);
  });

  it('drops a sidekick and a featured plant that have not been discovered', () => {
    const stored = profileWith({ sidekickHerbId: FIRST, featuredHerbId: SECOND });
    const none = resolveProfile(stored, emptyState());
    expect(none.sidekickHerbId).toBeNull();
    expect(none.featuredHerbId).toBeNull();

    const some = resolveProfile(stored, stateWith([FIRST, SECOND]));
    expect(some.sidekickHerbId).toBe(FIRST);
    expect(some.featuredHerbId).toBe(SECOND);
  });

  /*
   * A sidekick needs DISCOVERY, not mastery — the plant travels with you the moment you
   * find it, and its sprite grows on its own mastery stage instead.
   */
  it('accepts a sidekick that is discovered but not yet learned or mastered', () => {
    const state = stateWith([FIRST]);
    expect(state.learned[FIRST]).toBeUndefined();
    expect(state.mastered[FIRST]).toBeUndefined();
    expect(resolveProfile(profileWith({ sidekickHerbId: FIRST }), state).sidekickHerbId).toBe(FIRST);
  });

  it('drops an id that names no card in the deck', () => {
    const stored = profileWith({ avatarHerbId: 'herb-from-collection-02' });
    // Even with a discovery record forged for it, it is not a real card.
    const state = stateWith(['herb-from-collection-02']);
    expect(resolveProfile(stored, state).avatarHerbId).toBeNull();
  });

  it('falls back to the default frame when the chosen one is not earned', () => {
    expect(resolveProfile(profileWith({ avatarFrameId: 'starlight' }), emptyState()).frame.id).toBe(
      DEFAULT_FRAME_ID,
    );
  });

  it('returns a null title when the chosen one is not earned, so the level name shows', () => {
    expect(resolveProfile(profileWith({ titleId: 'curator' }), emptyState()).title).toBeNull();
    expect(
      resolveProfile(profileWith({ titleId: 'seedling-scholar' }), emptyState())?.title?.id,
    ).toBe('seedling-scholar');
  });

  it('drops pinned achievements that are not earned, and ones that are not real', () => {
    const real = ACHIEVEMENTS[0]!.id;
    const stored = profileWith({ pinnedAchievementIds: [real, 'no-such-achievement'] });
    expect(resolveProfile(stored, emptyState()).pinnedAchievementIds).toEqual([]);
    expect(resolveProfile(stored, stateWith([], [real])).pinnedAchievementIds).toEqual([real]);
  });

  it('never returns more than MAX_PINNED, even from a hand-built profile', () => {
    const ids = ACHIEVEMENTS.slice(0, 5).map((a) => a.id);
    // Bypasses parseProfile deliberately: this is the guard for a row written elsewhere.
    const stored = { ...emptyProfile(), pinnedAchievementIds: ids };
    const resolved = resolveProfile(stored, stateWith([], ids));
    expect(resolved.pinnedAchievementIds).toHaveLength(MAX_PINNED);
  });

  it('does not throw on a profile full of stale ids', () => {
    const stored: StoredProfile = {
      displayName: 'x',
      avatarHerbId: 'gone',
      avatarFrameId: 'gone',
      titleId: 'gone',
      sidekickHerbId: 'gone',
      featuredHerbId: 'gone',
      pinnedAchievementIds: ['gone'],
    };
    const resolved = resolveProfile(stored, emptyState());
    expect(resolved.frame.id).toBe(DEFAULT_FRAME_ID);
    expect(resolved.title).toBeNull();
    expect(resolved.avatarHerbId).toBeNull();
  });
});

/*
 * THE PRIVACY RULE, ENFORCED ON THE SHAPE ITSELF. The profile is owner-only this pass, and
 * nothing about a person's account, whereabouts or notes belongs in it — so the stored shape
 * must never grow a field for one.
 */
describe('the stored shape', () => {
  it('holds exactly seven fields, all of them choices', () => {
    expect(Object.keys(emptyProfile()).sort()).toEqual([
      'avatarFrameId',
      'avatarHerbId',
      'displayName',
      'featuredHerbId',
      'pinnedAchievementIds',
      'sidekickHerbId',
      'titleId',
    ]);
  });

  it('holds no derived progression value', () => {
    const forbidden = ['xp', 'level', 'discovered', 'mastered', 'completion', 'achievementsEarned'];
    const keys = Object.keys(emptyProfile()).map((key) => key.toLowerCase());
    for (const word of forbidden) {
      expect(keys).not.toContain(word.toLowerCase());
    }
  });

  it('holds nothing about the person behind the account', () => {
    const keys = Object.keys(emptyProfile()).map((key) => key.toLowerCase());
    for (const word of ['email', 'region', 'location', 'note', 'photo', 'scan', 'sighting']) {
      expect(keys.some((key) => key.includes(word))).toBe(false);
    }
  });
});
