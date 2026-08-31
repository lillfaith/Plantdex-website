import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HERBS } from './deck';
import { FIELD_NOTES } from './card-field-notes';
import {
  HABITATS,
  HABITAT_ASSIGNMENTS,
  HABITAT_BLURB,
  HABITAT_DATA_STATUS,
  HABITAT_LABEL,
  judgementCalls,
  habitatCounts,
  habitatsOf,
  herbIdsInHabitat,
  isInHabitat,
  matchesHabitatFilter,
} from './habitat';

describe('habitat taxonomy', () => {
  it('labels and blurbs every class', () => {
    for (const habitat of HABITATS) {
      expect(HABITAT_LABEL[habitat], habitat).toBeTruthy();
      expect(HABITAT_BLURB[habitat], habitat).toBeTruthy();
    }
    expect(Object.keys(HABITAT_LABEL).sort()).toEqual([...HABITATS].sort());
  });

  it('gives every species in the deck exactly one primary habitat', () => {
    for (const herb of HERBS) {
      const entry = HABITAT_ASSIGNMENTS[herb.id];
      expect(entry, `${herb.id} has no habitat assignment`).toBeDefined();
      expect(HABITATS, `${herb.id}: unknown primary`).toContain(entry!.primary);
    }
  });

  it('assigns no habitat to a herb that is not in the deck', () => {
    // A typo'd id would otherwise sit in the table forever, silently classifying nothing.
    const deckIds = new Set(HERBS.map((herb) => herb.id));
    for (const id of Object.keys(HABITAT_ASSIGNMENTS)) {
      expect(deckIds.has(id), `${id} is not a herb in the deck`).toBe(true);
    }
  });

  it('never repeats the primary as the secondary', () => {
    // "Woodland and also Woodland" is not a second habitat, and it would double-count the
    // species in every inclusive tally.
    for (const [id, entry] of Object.entries(HABITAT_ASSIGNMENTS)) {
      if (entry.secondary === undefined) continue;
      expect(HABITATS, `${id}: unknown secondary`).toContain(entry.secondary);
      expect(entry.secondary, `${id}: secondary repeats primary`).not.toBe(entry.primary);
    }
  });

  it('returns habitats primary-first, one or two of them', () => {
    for (const herb of HERBS) {
      const list = habitatsOf(herb.id);
      expect(list.length, herb.id).toBeGreaterThanOrEqual(1);
      expect(list.length, herb.id).toBeLessThanOrEqual(2);
      expect(list[0], herb.id).toBe(HABITAT_ASSIGNMENTS[herb.id]!.primary);
      expect(new Set(list).size, `${herb.id}: duplicate habitat`).toBe(list.length);
    }
    expect(habitatsOf('not-a-herb')).toEqual([]);
  });

  it('agrees with itself about membership', () => {
    for (const habitat of HABITATS) {
      for (const id of herbIdsInHabitat(habitat)) {
        expect(isInHabitat(id, habitat), `${id} / ${habitat}`).toBe(true);
      }
    }
  });

  it('counts primaries to exactly the deck size', () => {
    const counts = habitatCounts();
    const primaryTotal = HABITATS.reduce((n, habitat) => n + counts[habitat].primary, 0);
    expect(primaryTotal).toBe(HERBS.length);
    // Inclusive counts exceed the deck size precisely because secondaries exist.
    const inclusiveTotal = HABITATS.reduce((n, habitat) => n + counts[habitat].inclusive, 0);
    expect(inclusiveTotal).toBeGreaterThan(primaryTotal);
  });

  it('uses all five classes as a primary', () => {
    // Not a balance requirement — the opposite. It only checks that no class is dead
    // weight; the counts themselves are deliberately uneven.
    const counts = habitatCounts();
    for (const habitat of HABITATS) {
      expect(counts[habitat].primary, `${habitat} is never a primary`).toBeGreaterThan(0);
    }
  });

  it('does NOT force equal rosters', () => {
    /*
     * The deck is a backyard deck: Garden and Woodland are large and Wetland is small,
     * because that is where these 45 plants actually grow. This test exists so that a
     * later "let's even out the chart" pass fails loudly instead of quietly moving a
     * species out of its habitat.
     */
    const counts = habitatCounts();
    const primaries = HABITATS.map((habitat) => counts[habitat].primary);
    expect(Math.max(...primaries)).toBeGreaterThan(Math.min(...primaries) + 1);
  });

  it('derives every assignment from habitat prose that actually exists', () => {
    // The classification is a reading OF the cited prose. A species with no prose would
    // mean the class came from somewhere unsourced. Read directly from the field notes
    // rather than through habitat.ts, which deliberately does not import them.
    for (const herb of HERBS) {
      expect(FIELD_NOTES[herb.id]?.habitat, `${herb.id} has no cited habitat prose`).toBeTruthy();
    }
  });

  it('pins how much of the habitat prose carries its own citation', () => {
    /*
     * HONEST NUMBER, NOT A PASSING ONE. Every card has CARD-LEVEL sources
     * (`card-sources.ts`, keyed by card number, 45/45) — but those are about chemistry and
     * traditional use. Only these eight attach a source to the HABITAT SENTENCE itself,
     * which is what the classification was read from.
     *
     * So "derived from cited habitat prose" is true for eight species and overstated for
     * the rest: the prose exists and was curated, but is not independently sourced. This
     * test locks the current set so the number can only go up — adding a species here is
     * fine, quietly dropping one is not — and so the gap stays visible instead of being
     * forgotten.
     */
    const cited = HERBS.filter((herb) => (FIELD_NOTES[herb.id]?.sourceIds.length ?? 0) > 0);
    expect(cited.map((herb) => herb.id).sort()).toEqual(
      [
        'achillea-millefolium',
        'allium-vineale',
        'cichorium-intybus',
        'pinus-spp',
        'portulaca-oleracea',
        'rhus-spp',
        'sambucus-spp',
        'taraxacum-officinale',
      ].sort(),
    );
  });

  it('records a real reason wherever the call was a judgement', () => {
    const flagged = judgementCalls();
    expect(flagged.length).toBeGreaterThan(0);
    for (const { herbId, judgement } of flagged) {
      expect(judgement.length, `${herbId}: judgement note too thin`).toBeGreaterThan(80);
      // A rationale has to name what it decided against, or it is only an assertion.
      expect(judgement, `${herbId}: names no alternative`).toMatch(
        /lead|rather than|instead|secondary|rejected|considered|alternative|only safe|excluded|lost to|over /i,
      );
    }
    // Judgement calls come back in deck order, so the list reads like the deck.
    const order = HERBS.map((herb) => herb.id);
    const positions = flagged.map((entry) => order.indexOf(entry.herbId));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});

/**
 * THE GUARD THAT MATTERS.
 *
 * These assignments are a derivation waiting on human sign-off. Until `HABITAT_DATA_STATUS`
 * reads 'confirmed', no component or route may consume them — so the taxonomy can be built,
 * tested and refined without one unreviewed classification reaching a reader as though it
 * were established fact.
 *
 * Flipping the status to 'confirmed' is the single edit that releases it, and this test is
 * what makes that edit meaningful rather than ceremonial.
 */
describe('proposed habitat data stays out of the UI', () => {
  const UI_ROOTS = ['src/components', 'src/app'];

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    });
  }

  it('is not imported by any component or route while status is "proposed"', () => {
    if (HABITAT_DATA_STATUS === 'confirmed') return;
    const offenders = UI_ROOTS.flatMap(walk)
      .filter((path) => path.endsWith('.tsx') || path.endsWith('.ts'))
      .filter((path) => /from '@\/lib\/habitat'|from '\.\.?\/.*\/habitat'/.test(readFileSync(path, 'utf8')));
    expect(
      offenders,
      'habitat assignments are still marked "proposed" — review them and set ' +
        'HABITAT_DATA_STATUS to "confirmed" before rendering them',
    ).toEqual([]);
  });
});

describe('habitat filtering', () => {
  it('partitions the deck: every card under exactly one filter', () => {
    /*
     * The property that makes the filter honest. Because it matches PRIMARY only, the five
     * filters are a partition — counts sum to the deck and no card appears twice. Matching
     * secondaries would break both, and would put 29 of 45 cards behind "Wayside".
     */
    for (const herb of HERBS) {
      const matches = HABITATS.filter((habitat) => matchesHabitatFilter(herb.id, habitat));
      expect(matches, `${herb.id} matches ${matches.length} filters`).toHaveLength(1);
    }
    const total = HABITATS.reduce(
      (n, habitat) => n + HERBS.filter((herb) => matchesHabitatFilter(herb.id, habitat)).length,
      0,
    );
    expect(total).toBe(HERBS.length);
  });

  it('never matches on a secondary habitat', () => {
    const withSecondary = HERBS.filter((herb) => HABITAT_ASSIGNMENTS[herb.id]?.secondary);
    expect(withSecondary.length).toBeGreaterThan(0);
    for (const herb of withSecondary) {
      const secondary = HABITAT_ASSIGNMENTS[herb.id]!.secondary!;
      expect(matchesHabitatFilter(herb.id, secondary), `${herb.id}`).toBe(false);
      expect(isInHabitat(herb.id, secondary), `${herb.id}`).toBe(true);
    }
  });

  it('returns no cards for an unknown herb id', () => {
    for (const habitat of HABITATS) {
      expect(matchesHabitatFilter('not-a-herb', habitat)).toBe(false);
    }
  });
});
