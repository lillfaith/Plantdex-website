import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  EMPTY_PREFERENCE, MAX_EXTRAS, addExtra, clearHome, multiRegionEnabled, parsePreference,
  removeExtra, selectedRegions, serializePreference, setHome, type RegionPreference,
} from './region-preference';
import { applyStateFilter, countCollection, speciesInView, unionSpecies } from './region-collection';
import { readPreference, writePreference, REGION_PREFERENCE_KEY } from './region-preference-store';
import { REGION_STORAGE_KEY } from './region-store';
import { GEORGIA, speciesForRegion } from './region-species';
import type { HabitatClass } from './habitat';

// FIXTURES ONLY. These ids and species are invented test data, not region membership.
const known = (id: string) => ['ecoregion-aa', 'ecoregion-bb', 'ecoregion-cc', 'ecoregion-dd'].includes(id);
const membership = {
  'ecoregion-aa': ['sp-1', 'sp-2', 'sp-3'],
  'ecoregion-bb': ['sp-3', 'sp-4'],
  'ecoregion-cc': ['sp-5'],
};
const habs: Record<string, HabitatClass[]> = {
  'sp-1': ['woodland'], 'sp-2': ['woodland', 'meadow'], 'sp-3': ['meadow', 'wayside'], 'sp-4': ['garden'], 'sp-5': ['wetland'],
};
const habitatsOf = (id: string) => habs[id] ?? [];
const mem = () => {
  const store = new Map<string, string>();
  return Object.assign(store, {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
};
const withHome = (p = EMPTY_PREFERENCE) => setHome(p, 'ecoregion-aa', 'manual', known);

describe('selection', () => {
  it('sets, changes and clears home; the old home is dropped, not demoted', () => {
    const a = withHome();
    expect(a.home).toBe('ecoregion-aa');
    const b = setHome(a, 'ecoregion-bb', 'suggested', known);
    expect(b).toMatchObject({ home: 'ecoregion-bb', homeSource: 'suggested', extras: [] });
    const c = clearHome(b);
    expect(c).toMatchObject({ home: null, homeSource: null });
  });
  it('extras dedupe, exclude home, are capped, and an unknown id is refused', () => {
    let p = addExtra(withHome(), 'ecoregion-bb', known);
    expect(addExtra(p, 'ecoregion-bb', known)).toBe(p);
    expect(addExtra(p, 'ecoregion-aa', known)).toBe(p);
    expect(addExtra(p, 'ecoregion-zz', known)).toBe(p);
    expect(selectedRegions(p)).toEqual(['ecoregion-aa', 'ecoregion-bb']);
    p = setHome(p, 'ecoregion-bb', 'manual', known);
    expect(p.extras).toEqual([]);
    expect(removeExtra(p, 'ecoregion-cc')).toBe(p);
    const open = () => true;
    let big = EMPTY_PREFERENCE;
    for (let i = 0; i < 20; i++) big = addExtra(big, `region-${String.fromCharCode(97 + i)}x`, open);
    expect(big.extras).toHaveLength(MAX_EXTRAS);
  });
  it('is idempotent: no-ops return the same object', () => {
    const p = withHome();
    expect(setHome(p, 'ecoregion-aa', 'manual', known)).toBe(p);
    expect(clearHome(EMPTY_PREFERENCE)).toBe(EMPTY_PREFERENCE);
  });
  it('lets a region be selected with no home (region is a lens, never a gate)', () => {
    expect(selectedRegions(addExtra(EMPTY_PREFERENCE, 'ecoregion-cc', known))).toEqual(['ecoregion-cc']);
  });
});

describe('counting rules', () => {
  it('union counts a species in two selected regions once', () => {
    const u = unionSpecies(['ecoregion-aa', 'ecoregion-bb'], membership);
    expect(u).toEqual(['sp-1', 'sp-2', 'sp-3', 'sp-4']);
    expect(unionSpecies(['ecoregion-dd'], membership)).toEqual([]); // no data: absent, not an error
  });
  it('the total is unique species and is NEVER the sum of habitat counts', () => {
    const c = countCollection(unionSpecies(['ecoregion-aa', 'ecoregion-bb'], membership), habitatsOf);
    expect(c.total).toBe(4);
    const sum = Object.values(c.byHabitat).reduce((a, b) => a + b, 0);
    expect(sum).toBe(6);
    expect(sum).not.toBe(c.total);
    expect(c.byHabitat.meadow).toBe(2);
  });
  it('the state filter intersects last and never changes the selected regions', () => {
    const p = addExtra(withHome(), 'ecoregion-bb', known);
    const before = JSON.stringify(p);
    const view = speciesInView({
      enabled: true, preference: p, membership, stateId: 'us-xx',
      stateSpecies: () => ['sp-2', 'sp-4', 'sp-9'],
    });
    expect(view).toEqual(['sp-2', 'sp-4']);
    expect(JSON.stringify(p)).toBe(before);
    expect(applyStateFilter(['a'], null)).toEqual(['a']);
  });
});

describe('unset home and flag off leave today exactly as it is', () => {
  const georgiaIds = GEORGIA.map((e) => e.herbId);
  it('nothing selected, no state: no filter at all', () => {
    expect(speciesInView({ enabled: true, preference: EMPTY_PREFERENCE, membership, stateId: null })).toBeNull();
  });
  it('nothing selected + Georgia: exactly the Georgia list, in order', () => {
    expect(speciesInView({ enabled: true, preference: EMPTY_PREFERENCE, membership, stateId: 'us-ga' })).toEqual(georgiaIds);
  });
  it('flag off ignores a stored selection entirely', () => {
    const p = addExtra(withHome(), 'ecoregion-bb', known);
    expect(speciesInView({ enabled: false, preference: p, membership, stateId: 'us-ga' })).toEqual(georgiaIds);
    expect(speciesInView({ enabled: false, preference: p, membership, stateId: null })).toBeNull();
  });
  it('Georgia data is untouched', () => {
    expect(speciesForRegion('us-ga')).toBe(GEORGIA);
  });
  it('the flag is off unless exactly "on"', () => {
    for (const v of [undefined, '', 'true', '1', 'ON', 'off']) expect(multiRegionEnabled(v)).toBe(false);
    expect(multiRegionEnabled('on')).toBe(true);
  });
});

describe('no coordinates can be held or written', () => {
  it('serialises exactly five keys, all ids or enum strings', () => {
    const p: RegionPreference = { ...addExtra(withHome(), 'ecoregion-bb', known), locationAsk: 'declined' };
    const out = JSON.parse(serializePreference(p));
    expect(Object.keys(out).sort()).toEqual(['extras', 'home', 'homeSource', 'locationAsk', 'neighbours']);
    expect(JSON.stringify(out)).not.toMatch(/\d+\.\d+/);
  });
  it('parse drops extra keys and refuses coordinate-shaped region ids', () => {
    const p = parsePreference(
      { home: '33.7,-84.3', extras: ['33.7', 'ecoregion-bb', 12], lat: 33.7, lng: -84.3, accuracy: 5, locationAsk: 'granted' },
      known,
    );
    expect(p).toEqual({ home: null, extras: ['ecoregion-bb'], homeSource: null, neighbours: [], locationAsk: 'granted' });
    expect(Object.keys(p)).not.toContain('lat');
  });
  it('parse validates enums and degrades garbage to empty', () => {
    expect(parsePreference('x', known)).toBe(EMPTY_PREFERENCE);
    expect(parsePreference([], known)).toBe(EMPTY_PREFERENCE);
    const p = parsePreference({ home: 'ecoregion-aa', homeSource: 'gps', locationAsk: 'always' }, known);
    expect(p).toMatchObject({ home: 'ecoregion-aa', homeSource: 'manual', locationAsk: 'never' });
  });
  it('the modules import no location or detection code', () => {
    for (const f of ['region-preference', 'region-collection', 'region-preference-store']) {
      const src = readFileSync(`src/lib/${f}.ts`, 'utf8');
      expect(src).not.toMatch(/geolocation|navigator\.|detect-region|from '\.\/(?:location|detect)/i);
    }
  });
});

describe('storage', () => {
  it('is keyed per scope and never collides with the single-region key', () => {
    expect(REGION_PREFERENCE_KEY.startsWith(REGION_STORAGE_KEY)).toBe(false);
    expect(REGION_PREFERENCE_KEY.startsWith('plantdex.')).toBe(true);
    const s = mem();
    writePreference('alice', withHome(), s);
    expect(readPreference('alice', known, s).home).toBe('ecoregion-aa');
    expect(readPreference('bob', known, s)).toBe(EMPTY_PREFERENCE);
    expect(readPreference('device', known, s)).toBe(EMPTY_PREFERENCE);
  });
  it('validates on read: corrupt JSON, withdrawn regions and absent storage are survivable', () => {
    const s = mem();
    s.set(`${REGION_PREFERENCE_KEY}:a`, '{not json');
    expect(readPreference('a', known, s)).toBe(EMPTY_PREFERENCE);
    writePreference('a', withHome(), s);
    expect(readPreference('a', (id) => id !== 'ecoregion-aa', s).home).toBeNull();
    expect(readPreference('a', known, null)).toBe(EMPTY_PREFERENCE);
    expect(() => writePreference('a', withHome(), null)).not.toThrow();
  });
  it('an empty preference removes the entry rather than storing one', () => {
    const s = mem();
    writePreference('a', withHome(), s);
    writePreference('a', EMPTY_PREFERENCE, s);
    expect(s.size).toBe(0);
  });
});
