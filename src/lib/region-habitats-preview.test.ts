import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RECORDED_COPY } from './regional-nearby';

const component = readFileSync('src/components/quests/HabitatsPreview.tsx', 'utf8');
const route = readFileSync('src/app/quests/habitats-preview/page.tsx', 'utf8');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '');

describe('Habitats preview (owner-approved direction, flag off)', () => {
  it('is behind a build-time flag the production build does not set', () => {
    expect(route).toMatch(/NEXT_PUBLIC_HABITATS_PREVIEW !== 'on'/);
    expect(route).toMatch(/notFound\(\)/);
  });

  it('never presents the placeholder scenery as finished artwork', () => {
    expect(component).toMatch(/data-placeholder-art/);
    expect(component).toMatch(/Placeholder scene/);
  });

  it('the plant sheet carries a short notice, and the full method stays behind "About this data"', () => {
    expect(RECORDED_COPY.sheetNotice.length).toBeLessThan(120);
    expect(RECORDED_COPY.sheetNotice).toMatch(/not a guarantee/);
    const code = strip(component);
    // The sheet shows the short notice and an "About this data" control; the long source note is only the About dialog's body.
    expect(code).toMatch(/RECORDED_COPY\.sheetNotice/);
    expect(code.match(/\{note\}/g)?.length).toBe(1);
    expect(code).toMatch(/About this data/);
  });

  it('the short notice implies no location, no safety and no edibility claim', () => {
    for (const re of [/\bnear\s?by\b/i, /near you/i, /around you/i, /right now/i, /\bsafe\b/i, /edible/i, /medicin/i]) {
      expect(RECORDED_COPY.sheetNotice).not.toMatch(re);
    }
  });

  it('reads the real view-model and records nothing', () => {
    expect(component).toMatch(/habitatsViewModel/);
    expect(strip(component)).not.toMatch(/\.discover\(|applyDiscovery|learn\(|localStorage|geolocation/);
  });
});
