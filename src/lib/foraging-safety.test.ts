import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONTAMINATION_LABEL,
  CONTAMINATION_SURFACES,
  CONTAMINATION_WARNING,
} from './foraging-safety';

/**
 * The contamination warning, and the much harder half: that it STAYS in three places.
 *
 * Omission is not the failure mode worth testing for here. A warning nobody added is obvious
 * the first time somebody looks at the page. A warning added to every surface that felt
 * vaguely safety-shaped is invisible, because by the fourth copy it reads as furniture — and
 * this codebase has already been round that loop once with the full disclaimer, which sat on
 * three pages until it was cut back to one. So the strongest assertion below is the negative
 * one: nothing outside the allow-list may render this text.
 */

/** Where the text is DEFINED, as opposed to shown. Not surfaces. */
const DEFINITION_SITES = [
  'src/lib/foraging-safety.ts',
  'src/lib/foraging-safety.test.ts',
  'src/components/SafetyNotice.tsx',
];

function sourceFiles(dir = 'src'): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}

/** Every file that mentions the warning at all, by constant or by component. */
function filesReferencing(): string[] {
  return sourceFiles().filter((path) => {
    const body = readFileSync(path, 'utf8');
    return (
      body.includes('CONTAMINATION_WARNING') ||
      body.includes('ContaminationNote') ||
      body.includes('treated with pesticides')
    );
  });
}

describe('the contamination warning itself', () => {
  it('names the chemicals rather than warning about chemicals in general', () => {
    expect(CONTAMINATION_WARNING).toContain('pesticides');
    expect(CONTAMINATION_WARNING).toContain('herbicides');
    expect(CONTAMINATION_WARNING).toContain('other chemicals');
  });

  it('gives the reader a decision for the ordinary case of not knowing', () => {
    // The whole point of the second sentence. "Be careful of pesticides" leaves somebody
    // standing in a field with a worry and no rule; this leaves them with a rule.
    expect(CONTAMINATION_WARNING).toMatch(/unsure whether an area was sprayed/);
    expect(CONTAMINATION_WARNING).toMatch(/don’t consume the plant/);
  });

  it('is two sentences, because a third would not be read where it is shown', () => {
    const sentences = CONTAMINATION_WARNING.split('. ').filter(Boolean);
    expect(sentences).toHaveLength(2);
    expect(CONTAMINATION_WARNING.length).toBeLessThan(260);
  });

  it('is labelled as foraging safety, not as a warning about the species', () => {
    // It is not a claim about the plant. A card can be entirely accurate and the plant still
    // unsafe because of where it grew, which is the one thing the label has to not muddle.
    expect(CONTAMINATION_LABEL).toBe('Foraging safety');
    expect(CONTAMINATION_WARNING).not.toMatch(/toxic|poison|do not eat this/i);
  });
});

describe('where it appears', () => {
  it('is on the scan screen, the usable-parts section, and /safety', () => {
    for (const surface of CONTAMINATION_SURFACES) {
      const body = readFileSync(surface, 'utf8');
      const shows =
        body.includes('<ContaminationNote />') || body.includes('CONTAMINATION_WARNING');
      expect(shows, `${surface} no longer shows the contamination warning`).toBe(true);
    }
  });

  it('appears NOWHERE ELSE in the application', () => {
    const allowed = new Set<string>([...CONTAMINATION_SURFACES, ...DEFINITION_SITES]);
    const unexpected = filesReferencing().filter((path) => !allowed.has(path));
    expect(
      unexpected,
      `These files reference the contamination warning but are not an approved surface. ` +
        `Adding it to another screen is how it stops being read — see the header of ` +
        `src/lib/foraging-safety.ts.`,
    ).toEqual([]);
  });

  it('is not on the Seed Shelf, which offers no action it could be about', () => {
    // The shelf records species with no card. It says nothing about edibility or preparation
    // and tells the player so, so a warning about eating would be about an action that
    // surface does not offer.
    for (const path of filesReferencing()) {
      expect(path).not.toMatch(/seed-shelf|SeedShelf/i);
    }
  });

  it('is not global: no layout, nav or provider carries it', () => {
    for (const path of filesReferencing()) {
      expect(path).not.toMatch(/layout\.tsx$|SiteNav|Provider\.tsx$/);
    }
  });

  it('is not on a discovery or card-unlock screen', () => {
    for (const path of filesReferencing()) {
      expect(path).not.toMatch(/Discover|Celebration|FieldCard|Mastery|Garden/i);
    }
  });

  it('shows once per plant profile, not once per section of it', () => {
    // One instance in the file that renders it, so a profile cannot stack three copies.
    const body = readFileSync('src/components/herbdex/CardBackDetails.tsx', 'utf8');
    const occurrences = body.match(/<ContaminationNote \/>/g) ?? [];
    expect(occurrences).toHaveLength(1);
  });
});

describe('the existing safety layers are untouched', () => {
  it('leaves the deck disclaimer living only at /safety', () => {
    const pages = sourceFiles('src/app').filter((path) => path.endsWith('page.tsx'));
    const withFullDisclaimer = pages.filter((path) =>
      readFileSync(path, 'utf8').includes('DISCLAIMER.main'),
    );
    expect(withFullDisclaimer).toEqual(['src/app/safety/page.tsx']);
  });

  it('leaves the scan screen carrying its identification notice as well', () => {
    const body = readFileSync('src/app/scan/page.tsx', 'utf8');
    expect(body).toContain('<SafetyNotice');
    expect(body).toContain('starting point, not proof');
  });

  it('does not borrow the hazard colour reserved for risks in the plant itself', () => {
    // `border-stat-temp` is spent on four blocks, every one a hazard in the species: a printed
    // warning, an added caution, a withdrawn instruction, a lookalike. A fifth would make all
    // four cheaper, and this risk is about the ground rather than the plant.
    const component = readFileSync('src/components/SafetyNotice.tsx', 'utf8');
    const note = component.slice(component.indexOf('export function ContaminationNote'));
    const body = note.slice(0, note.indexOf('\n}'));
    expect(body).not.toContain('stat-temp');
  });
});
