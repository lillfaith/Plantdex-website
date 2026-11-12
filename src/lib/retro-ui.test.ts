import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REFERENCE_PHOTOS, photosFor, referencePreview } from './reference-photos';
import { LOOKALIKE_COMPARISONS, comparisonFor } from './reference-comparisons';
import { pixelIsland, pixelLeaf, pixelObject } from './pixel-art';

const read = (path: string) => readFileSync(path, 'utf8');
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('reference photographs and comparisons stay private until reviewed', () => {
  it('the preview exists only under `next dev` with the flag set', () => {
    expect(referencePreview('1', 'production')).toBe(false);
    expect(referencePreview('1', 'test')).toBe(false);
    expect(referencePreview(undefined, 'development')).toBe(false);
    expect(referencePreview('1', 'development')).toBe(true);
  });
  it('nothing is reviewed, so production shows no photograph and no comparison', () => {
    expect(REFERENCE_PHOTOS.every((photo) => photo.reviewed === false)).toBe(true);
    expect(LOOKALIKE_COMPARISONS.every((one) => one.reviewed === false)).toBe(true);
    expect(photosFor('taraxacum-officinale', false)).toHaveLength(0);
    expect(comparisonFor('taraxacum-officinale', false)).toBeNull();
  });
  it('every photograph carries an allowed licence, an author and a Commons page', () => {
    for (const photo of REFERENCE_PHOTOS) {
      expect(photo.licence, photo.src).toMatch(/^(CC0 1\.0|CC BY \d\.\d|CC BY-SA \d\.\d)$/);
      expect(photo.author.length, photo.src).toBeGreaterThan(1);
      expect(photo.commonsUrl, photo.src).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(photo.attribution.length, photo.src).toBeGreaterThan(20);
    }
  });
  it('the comparison uses only the two supported characters, never hollowness', () => {
    const text = JSON.stringify(LOOKALIKE_COMPARISONS);
    expect(text).not.toMatch(/hollow|bract|colour|diameter/i);
    expect(LOOKALIKE_COMPARISONS[0]!.rows.map((row) => row.trait)).toEqual(['Flower stalk', 'Leaves']);
    expect(text).not.toMatch(/\b(safe|edible|eat|consume)\b/i);
  });
  it('identification photographs are never filtered or pixelated', () => {
    const code = strip(read('src/components/herbdex/ReferencePhotos.tsx'));
    expect(code).not.toMatch(/pixelated|sepia|grayscale|brightness|blur|\[filter:|image-rendering/i);
  });
});

describe('the retro layer is scenery and objects, never a redrawn plant', () => {
  it('builds crisp data-URI art once and deterministically', () => {
    for (const art of [pixelIsland(), pixelLeaf(), pixelObject('book'), pixelObject('magnifier'), pixelObject('mortar'), pixelObject('emblem')]) {
      expect(art).toMatch(/^url\("data:image\/svg\+xml,/);
      expect(decodeURIComponent(art)).toContain('shape-rendering="crispEdges"');
    }
    expect(pixelIsland()).toBe(pixelIsland());
  });
  it('the parchment page is scoped to the Identify tab only', () => {
    const tabs = read('src/components/herbdex/ProfileTabs.tsx');
    expect(tabs.match(/field-guide/g)).toHaveLength(1);
    expect(tabs).toMatch(/tab\.id === 'field-identification'\s*\?\s*'field-guide/);
    for (const file of ['src/app/learn/page.tsx', 'src/components/herbdex/MasteryTrack.tsx', 'src/components/game/SpeciesHero.tsx']) {
      expect(read(file)).not.toContain('field-guide');
    }
  });
  it('the evolution path shows the real sprite stages and invents no reward', () => {
    const track = strip(read('src/components/herbdex/MasteryTrack.tsx'));
    expect(track).toContain("discovered: 'sprout'");
    expect(track).toContain("mastered: 'flowering'");
    expect(track).not.toMatch(/chest|Boss|bossForm|Card title/i);
    expect(track).toContain('XP_FOR_STAGE[entry](herb)');
  });
  it('the Learn menu keeps all four routes', () => {
    const page = read('src/app/learn/page.tsx');
    for (const href of ['/learn/plants', '/learn/glossary', '/learn/preparations', '/safety']) {
      expect(page).toContain(`href: '${href}'`);
    }
  });
  it('the character panel keeps the stored wording and the disclaimer', () => {
    const hero = read('src/components/game/SpeciesHero.tsx');
    expect(hero).toContain('herb.back.healingTraits.slice(0, 3)');
    expect(hero).toContain('Traditional use, not proven treatment.');
    expect(hero).toContain('<CardFlip herb={herb} size="hero" />');
  });
});
