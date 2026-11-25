import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { HABITATS, habitatsOf } from './habitat';
import { habitatsViewModel, HABITAT_VIEW_COPY, type HabitatsInput } from './habitat-view-model';
import { EMPTY_PREFERENCE, type RegionPreference } from './region-preference';
import { speciesForRegion } from './region-species';
import { nearbyByHabitat } from './regional-nearby';

const GA = 'us-ga';
const base: HabitatsInput = {
  discoveries: {}, enabled: false, preference: EMPTY_PREFERENCE, membership: {}, stateId: null, legacyRegionId: GA,
};
const pref = (home: string, extras: string[] = []): RegionPreference => ({
  ...EMPTY_PREFERENCE, home, homeSource: 'manual', extras,
});
const ids = (m: ReturnType<typeof habitatsViewModel>, h: string) =>
  m.habitats.find((s) => s.habitat === h)!.tiles.map((t) => t.herbId);

describe('Georgia parity (flag off)', () => {
  it('reproduces nearbyByHabitat tile for tile, in its order', () => {
    const m = habitatsViewModel(base);
    for (const g of nearbyByHabitat(GA, {})) expect(ids(m, g.habitat)).toEqual([...g.confirmed, ...g.likely]);
    expect(m.state).toBe('ready');
    expect(m.scope.label).toBe('Georgia records');
  });

  it('flag off ignores a stored multi-region preference', () => {
    const on = habitatsViewModel({ ...base, enabled: true, preference: pref('eco-a'), membership: { 'eco-a': ['plantago-major'] } });
    const off = habitatsViewModel({ ...base, preference: pref('eco-a'), membership: { 'eco-a': ['plantago-major'] } });
    expect(off).toEqual(habitatsViewModel(base));
    expect(on).not.toEqual(off);
  });

  it('flag on with no selected region is still today\'s view', () => {
    expect(habitatsViewModel({ ...base, enabled: true })).toEqual(habitatsViewModel(base));
  });

  it('marks occasional records without calling them collected or missing', () => {
    const m = habitatsViewModel(base);
    const occ = speciesForRegion(GA).filter((s) => s.occurrence === 'likely').map((s) => s.herbId);
    const tiles = m.habitats.flatMap((h) => h.tiles);
    for (const id of occ) expect(tiles.find((t) => t.herbId === id)!.recordedOccasionally).toBe(true);
    expect(tiles.every((t) => t.recorded)).toBe(true);
    expect(tiles.some((t) => t.herbId === 'mentha-canadensis')).toBe(false);
  });
});

describe('counts', () => {
  it('region total is the union counted once, not the habitat sum', () => {
    const m = habitatsViewModel(base);
    const sum = m.habitats.reduce((n, h) => n + h.count.total, 0);
    const unique = new Set(m.habitats.flatMap((h) => h.tiles.map((t) => t.herbId)));
    expect(m.total.total).toBe(unique.size);
    expect(sum).toBeGreaterThan(m.total.total);
    expect(m.total.total).toBe(35);
  });

  it('collected total counts a dual-habitat card once', () => {
    const dual = speciesForRegion(GA).find((s) => habitatsOf(s.herbId).length === 2 && s.occurrence === 'confirmed')!.herbId;
    const m = habitatsViewModel({ ...base, discoveries: { [dual]: '2026-01-01' } });
    expect(m.total.collected).toBe(1);
    expect(m.habitats.filter((h) => h.count.collected === 1)).toHaveLength(2);
  });

  it('every count carries a scope label naming its source', () => {
    const m = habitatsViewModel(base);
    expect(m.total.scopeLabel).toBe('Georgia records');
    for (const h of m.habitats) expect(h.count.scopeLabel).toBe('Georgia records');
  });
});

describe('collected is independent of region', () => {
  it('a card held but outside the scope is not a tile and changes no count', () => {
    const outside = 'mentha-canadensis';
    const a = habitatsViewModel(base);
    const b = habitatsViewModel({ ...base, discoveries: { [outside]: 'x' } });
    expect(b).toEqual(a);
  });

  it('status comes from discoveries even where the record is absent', () => {
    const m = habitatsViewModel({
      ...base, enabled: true, preference: pref('eco-a'),
      membership: { 'eco-a': ['plantago-major', 'viola-sororia'] }, discoveries: { 'viola-sororia': 'x' },
    });
    const tiles = m.habitats.flatMap((h) => h.tiles);
    expect(tiles.find((t) => t.herbId === 'viola-sororia')).toMatchObject({ status: 'collected', info: { collected: true } });
    expect(tiles.find((t) => t.herbId === 'plantago-major')).toMatchObject({ status: 'notFound' });
  });
});

describe('multi-region', () => {
  const membership = { 'eco-a': ['plantago-major', 'viola-sororia'], 'eco-b': ['viola-sororia', 'taraxacum-officinale'] };
  it('unions regions once and labels the scope', () => {
    const m = habitatsViewModel({ ...base, enabled: true, preference: pref('eco-a', ['eco-b']), membership, occurrence: () => [] });
    expect(m.total.total).toBe(3);
    expect(m.scope).toMatchObject({ mode: 'regions', regionIds: ['eco-a', 'eco-b'], source: 'membership' });
    expect(m.total.scopeLabel).toBe('eco-a + eco-b species list');
    expect(m.habitats.flatMap((h) => h.tiles).every((t) => !t.recorded)).toBe(true);
  });

  it('state filter intersects last', () => {
    const m = habitatsViewModel({
      ...base, enabled: true, preference: pref('eco-a', ['eco-b']), membership, occurrence: () => [],
      stateId: 'xx', stateSpecies: () => ['viola-sororia', 'plantago-major', 'not-in-lens'],
    });
    expect(m.total.total).toBe(2);
    expect(m.scope.stateId).toBe('xx');
  });

  it('explicit empty and no-data states, never "unlikely"', () => {
    const none = habitatsViewModel({ ...base, enabled: true, preference: pref('eco-z'), occurrence: () => [] });
    expect(none.state).toBe('noRegionData');
    const noState = habitatsViewModel({ ...base, enabled: true, preference: pref('eco-a'), membership, occurrence: () => [], stateId: 'xx', stateSpecies: () => [] });
    expect(noState.state).toBe('noRegionData');
    const empty = habitatsViewModel({ ...base, enabled: true, preference: pref('eco-a'), membership, occurrence: () => [], stateId: 'xx', stateSpecies: () => ['taraxacum-officinale'] });
    expect(empty.state).toBe('empty');
    expect(habitatsViewModel({ ...base, legacyRegionId: null }).state).toBe('noRegionSelected');
    expect(habitatsViewModel({ ...base, legacyRegionId: 'us' }).state).toBe('noRegionData');
  });

  it('drops ids with no card rather than inventing a tile', () => {
    const m = habitatsViewModel({ ...base, enabled: true, preference: pref('eco-a'), membership: { 'eco-a': ['no-such-id', 'plantago-major'] }, occurrence: () => [] });
    expect(m.total.total).toBe(1);
  });

  it('flags occurrence data as recorded when a selected region has it', () => {
    const m = habitatsViewModel({ ...base, enabled: true, preference: pref(GA), membership: { [GA]: ['plantago-major'] } });
    expect(m.habitats.flatMap((h) => h.tiles).every((t) => t.recorded)).toBe(true);
  });
});

describe('order and info sheet', () => {
  it('is deterministic and independent of input order', () => {
    const a = habitatsViewModel({ ...base, enabled: true, preference: pref('e'), membership: { e: ['viola-sororia', 'plantago-major', 'taraxacum-officinale'] }, occurrence: () => [] });
    const b = habitatsViewModel({ ...base, enabled: true, preference: pref('e'), membership: { e: ['taraxacum-officinale', 'plantago-major', 'viola-sororia'] }, occurrence: () => [] });
    expect(b).toEqual(a);
    expect(habitatsViewModel(base)).toEqual(habitatsViewModel(base));
  });

  it('lists all five habitats and takes info only from the card', () => {
    const m = habitatsViewModel(base);
    expect(m.habitats.map((h) => h.habitat)).toEqual([...HABITATS]);
    const t = m.habitats.flatMap((h) => h.tiles)[0]!;
    expect(t.info.cardHref).toBe(`/herbdex/${t.herbId}`);
    expect(t.info.habitats.map((h) => h.id)).toEqual(habitatsOf(t.herbId));
    expect(t.info.scientificName).toMatch(/ /);
  });
});

describe('vocabulary', () => {
  it('copy never uses location or likelihood words, or "unlocked"', () => {
    const banned = /\b(near\s?by|near you|right now|live|likely|unlikely|unlocked)\b/i;
    for (const v of Object.values(HABITAT_VIEW_COPY)) expect(banned.test(typeof v === 'function' ? v(1, 2) : v)).toBe(false);
    const src = readFileSync('src/lib/habitat-view-model.ts', 'utf8').split('\n').filter((l) => /'[^']*'/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    expect(/'[^']*\b(near you|right now|unlocked|unlikely)\b[^']*'/i.test(src)).toBe(false);
  });

  it('imports no store, reducer or progression module', () => {
    const src = readFileSync('src/lib/habitat-view-model.ts', 'utf8');
    expect(src).not.toMatch(/from '\.\/(herbdex-reducer|progression|storage|region-store|region-preference-store)/);
  });
});
