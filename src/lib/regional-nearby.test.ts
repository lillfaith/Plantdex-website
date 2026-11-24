import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { habitatsOf } from './habitat';
import { occurrenceCounts } from './quest-board';
import { speciesForRegion } from './region-species';
import { HABITAT_BLURB, HABITAT_LABEL } from './habitat';
import type { RegionalSpecies } from './quest-board';
import { nearbyByHabitat, occurrenceSourceNote, RECORDED_COPY } from './regional-nearby';

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

describe('edge cases', () => {
  const sp = (herbId: string, occurrence: RegionalSpecies['occurrence']): RegionalSpecies =>
    ({ herbId, occurrence, seasons: [] }) as RegionalSpecies;
  const ids = speciesForRegion(GA).map((s) => s.herbId);

  it('a region with only occasional records lists them and no confirmed ones', () => {
    const groups = nearbyByHabitat(GA, {}, [sp(ids[0]!, 'likely'), sp(ids[1]!, 'likely')]);
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(g.confirmed).toEqual([]);
      expect(g.likely.length).toBeGreaterThan(0);
      expect(g.confirmedFound).toBe(0);
    }
  });

  it('a region with no records yields nothing', () => {
    expect(nearbyByHabitat(GA, { [ids[0]!]: 'x' }, [])).toEqual([]);
  });

  it('a species with no printed card is silently excluded and counts stay consistent', () => {
    const real = sp(ids[0]!, 'confirmed');
    const withExtras = nearbyByHabitat(GA, {}, [real, sp('field-card-not-printed', 'confirmed'), sp('no-such-id', 'likely')]);
    const without = nearbyByHabitat(GA, {}, [real]);
    expect(withExtras).toEqual(without);
    const shown = withExtras.flatMap((g) => [...g.confirmed, ...g.likely]);
    expect(shown).not.toContain('field-card-not-printed');
    expect(shown).not.toContain('no-such-id');
  });

  it('an empty discoveries object counts nothing as in the collection', () => {
    expect(nearbyByHabitat(GA, {}).every((g) => g.confirmedFound === 0)).toBe(true);
  });

  it('discoveries outside the region change nothing', () => {
    const regional = new Set(ids);
    const outsider = 'zzz-not-in-region';
    expect(regional.has(outsider)).toBe(false);
    expect(nearbyByHabitat(GA, { [outsider]: 'x' })).toEqual(nearbyByHabitat(GA, {}));
  });
});

describe('wording', () => {
  const BANNED: [string, RegExp][] = [
    ['nearby', /\bnear\s?by\b/i],
    ['near you', /\bnear you\b/i],
    ['around you', /\baround you\b/i],
    ['close to you', /\bclose to you\b/i],
    ['where to look', /where to look/i],
    ['right now', /right now/i],
    ['currently', /\bcurrent(ly)?\b/i],
    ['live', /\blive\b/i],
    ['likely', /\blikely\b/i],
    ['here', /\bhere\b/i],
  ];
  const copy = RECORDED_COPY;
  const strings = [
    copy.heading('Georgia'),
    copy.subheading('Georgia'),
    copy.progress(2, 5),
    copy.unlockedBadge,
    copy.occasionalLabel('Georgia'),
    copy.sourceNote(GA)!,
    ...Object.values(HABITAT_LABEL),
    ...Object.values(HABITAT_BLURB),
  ];
  const view = readFileSync('src/components/quests/NearbyByHabitat.tsx', 'utf8');
  // JSX text and string literals only; the header comment is allowed to say what it forbids.
  const viewText = view
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !/^\s*(import|\} from)/.test(l))
    .join('\n');
  const literals = [...viewText.matchAll(/'([^']*)'|"([^"]*)"|>([^<>{}]+)</g)]
    .map((m) => m[1] ?? m[2] ?? m[3] ?? '')
    .filter((t) => /\s/.test(t.trim()) || /^[A-Za-z]+$/.test(t.trim()));

  for (const [name, re] of BANNED) {
    it(`no exported string says "${name}"`, () => {
      for (const t of strings) expect(t, t).not.toMatch(re);
    });
    it(`no component literal says "${name}"`, () => {
      for (const t of literals) expect(t, t).not.toMatch(re);
    });
  }

  it('uses the required forms', () => {
    expect(copy.heading('Georgia')).toBe('Recorded in Georgia');
    expect(copy.progress(2, 5)).toBe('2 of 5 in your collection');
    expect(copy.occasionalLabel('Georgia')).toBe('Recorded only occasionally in Georgia');
    const note = copy.sourceNote(GA)!;
    expect(note).toMatch(/not where you are/);
    expect(note).toMatch(/not proof a plant is absent/);
  });

  it('the component takes its words from RECORDED_COPY', () => {
    expect(view).toMatch(/RECORDED_COPY\.heading/);
    expect(view).toMatch(/RECORDED_COPY\.subheading/);
    expect(view).toMatch(/RECORDED_COPY\.progress/);
    expect(view).toMatch(/RECORDED_COPY\.occasionalLabel/);
    expect(view).toMatch(/RECORDED_COPY\.sourceNote/);
  });
});

describe('the provisional view stays unmounted', () => {
  it('QuestBoardPanel does not import NearbyByHabitat', () => {
    const panel = readFileSync('src/components/quests/QuestBoardPanel.tsx', 'utf8');
    expect(panel).not.toMatch(/NearbyByHabitat/);
    expect(panel).not.toMatch(/regional-nearby/);
  });
  it('nothing in src imports it, and it carries the placeholder marker and header', () => {
    const hits = execSync("grep -rl 'NearbyByHabitat' src --include=*.ts --include=*.tsx || true", { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .filter((f) => !/NearbyByHabitat\.tsx$|regional-nearby\.test\.ts$/.test(f));
    expect(hits).toEqual([]);
    const view = readFileSync('src/components/quests/NearbyByHabitat.tsx', 'utf8');
    expect(view).toContain('data-ui-placeholder');
    expect(view).toMatch(/NOT MOUNTED ANYWHERE/);
  });
});
