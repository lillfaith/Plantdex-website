import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { habitatsOf } from './habitat';
import { occurrenceCounts } from './quest-board';
import { speciesForRegion } from './region-species';
import { nearbyByHabitat, occurrenceSourceNote } from './regional-nearby';

const GA = 'us-ga';

describe('nearbyByHabitat', () => {
  it('is empty for no region or an unsurveyed one', () => {
    expect(nearbyByHabitat(null, {})).toEqual([]);
    expect(nearbyByHabitat('us', {})).toEqual([]);
  });

  it('every Georgia species has a habitat, so none silently drops out', () => {
    for (const s of speciesForRegion(GA)) expect(habitatsOf(s.herbId).length).toBeGreaterThan(0);
  });

  it('never lists a species with insufficient or unlikely occurrence', () => {
    const shown = new Set(nearbyByHabitat(GA, {}).flatMap((g) => [...g.confirmed, ...g.likely]));
    expect(shown.has('mentha-canadensis')).toBe(false);
  });

  it('keeps confirmed and likely apart, matching the region totals', () => {
    const groups = nearbyByHabitat(GA, {});
    const counts = occurrenceCounts(speciesForRegion(GA));
    const confirmed = new Set(groups.flatMap((g) => g.confirmed));
    const likely = new Set(groups.flatMap((g) => g.likely));
    expect(confirmed.size).toBe(counts.confirmed);
    expect(likely.size).toBe(counts.likely);
    for (const id of likely) expect(confirmed.has(id)).toBe(false);
  });

  it('lists a dual-habitat species under both its habitats', () => {
    const dual = speciesForRegion(GA).find((s) => habitatsOf(s.herbId).length === 2)!;
    const where = nearbyByHabitat(GA, {})
      .filter((g) => [...g.confirmed, ...g.likely].includes(dual.herbId))
      .map((g) => g.habitat);
    expect(where.sort()).toEqual([...habitatsOf(dual.herbId)].sort());
  });

  it('derives found from discoveries and is repeatable', () => {
    const none = nearbyByHabitat(GA, {});
    expect(none.every((g) => g.confirmedFound === 0)).toBe(true);
    const id = none[0]!.confirmed[0]!;
    const once = nearbyByHabitat(GA, { [id]: '2026-01-01' });
    expect(once.find((g) => g.confirmed.includes(id))!.confirmedFound).toBe(1);
    expect(nearbyByHabitat(GA, { [id]: '2026-02-02' })).toEqual(once);
  });

  it('does not count a discovery of a likely species as confirmed progress', () => {
    const likelyId = speciesForRegion(GA).find((s) => s.occurrence === 'likely')!.herbId;
    const groups = nearbyByHabitat(GA, { [likelyId]: 'x' });
    expect(groups.every((g) => g.confirmedFound === 0)).toBe(true);
  });
});

describe('occurrenceSourceNote', () => {
  it('states source, date, rule and that absence is not proof', () => {
    const note = occurrenceSourceNote(GA)!;
    expect(note).toContain('GBIF');
    expect(note).toContain('2026-11-04');
    expect(note).toMatch(/5 specimens or 100 observations/);
    expect(note).toMatch(/not proof a plant is absent/);
    expect(note).toMatch(/not an identification guide/);
  });
  it('says nothing for a region that was never surveyed', () => {
    expect(occurrenceSourceNote('us')).toBeNull();
    expect(occurrenceSourceNote(null)).toBeNull();
  });
});

describe('boundaries', () => {
  const lib = readFileSync('src/lib/regional-nearby.ts', 'utf8');
  const view = readFileSync('src/components/quests/NearbyByHabitat.tsx', 'utf8');
  it('imports no reducer, progression, mastery or store', () => {
    expect(lib).not.toMatch(/from '\.\/(herbdex-reducer|progression|mastery|research|herbdex-state|storage)/);
  });
  it('the view writes nothing, tracks nothing and awards nothing', () => {
    expect(view).not.toMatch(/track\(|discover\(|localStorage|useHerbdex\(\)\.(discover|learn)/);
    expect(view).not.toMatch(/\bXP\b/);
  });
});
