import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { CATALOGUE, CATALOGUE_SIZE, DIGITAL_ONLY_SIZE } from './catalogue';
import { PRINTED_CARDS, PRINTED_DECK_SIZE } from './deck';
import {
  EXPANSION_CARDS,
  EXPANSION_COUNT,
  EXPANSION_FRONT_FIELDS,
  EXPANSION_SOURCE,
  expansionCardById,
  missingFrontFields,
} from './expansion-cards';

const ROOT = process.cwd();
const BACK_FIELDS = ['healingTraits', 'compounds', 'taste', 'aromatic', 'preparations', 'usableParts'] as const;

/** Same rule as scripts/build_deck.py `slugify`: ids come from the scientific name. */
function slugify(name: string): string {
  const out: string[] = [];
  for (const ch of name.toLowerCase()) {
    if (/[a-z0-9]/.test(ch)) out.push(ch);
    else if (ch === ' ' || ch === '-') out.push('-');
  }
  return out.join('').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== 'node_modules' && name !== '.next') walk(p, out);
    } else out.push(p);
  }
  return out;
}

/** PNG width, height and colour type straight from the IHDR chunk. Colour type 6 is RGBA. */
function png(path: string): { w: number; h: number; colourType: number } {
  const b = readFileSync(path);
  expect(b.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colourType: b.readUInt8(25) };
}

describe('expansion cards: the imported records', () => {
  it('imports every expansion row in the source file, less any recorded exclusion', () => {
    expect(EXPANSION_COUNT).toBeGreaterThan(0);
    expect(EXPANSION_COUNT).toBe(EXPANSION_SOURCE.csvExpansionRows - EXPANSION_SOURCE.excluded.length);
  });

  it('gives each card an id derived from its scientific name, and no two share an id or number', () => {
    for (const c of EXPANSION_CARDS) expect(c.id).toBe(slugify(c.scientificName));
    expect(new Set(EXPANSION_CARDS.map((c) => c.id)).size).toBe(EXPANSION_COUNT);
    expect(new Set(EXPANSION_CARDS.map((c) => c.cardNumber)).size).toBe(EXPANSION_COUNT);
  });

  it('numbers the cards after the 56 existing numbers, in one unbroken run', () => {
    const nums = EXPANSION_CARDS.map((c) => c.cardNumber);
    expect(Math.min(...nums)).toBe(57);
    nums.forEach((n, i) => expect(n).toBe(57 + i));
  });

  it('carries all six back fields, non-empty, and each equals the text as supplied', () => {
    for (const c of EXPANSION_CARDS) {
      for (const f of BACK_FIELDS) {
        expect(c.back[f].length, `#${c.cardNumber} ${f}`).toBeGreaterThan(0);
        for (const t of c.back[f]) expect(t.trim()).toBe(t);
        expect(c.back[f].join(', ')).toBe(c.supplied[f].replace(/,\s*/g, ', '));
      }
    }
  });

  it('marks every card a draft and invents none of the front fields the files do not contain', () => {
    for (const c of EXPANSION_CARDS) {
      expect(c.status).toBe('draft');
      for (const k of EXPANSION_FRONT_FIELDS) expect(c.front[k], `#${c.cardNumber} ${k}`).toBeNull();
      expect(missingFrontFields(c)).toEqual([...EXPANSION_FRONT_FIELDS]);
    }
  });

  it('never treats a search-results link as a citation', () => {
    for (const c of EXPANSION_CARDS) {
      expect(c.researchLinks.links.length).toBeLessThanOrEqual(3);
      for (const l of c.researchLinks.links) expect(l.isCitation).toBe(l.type === 'Direct reference');
    }
  });

  it('keeps editorial safety notes as review data, never as a printed-card warning', () => {
    expect(EXPANSION_CARDS.some((c) => c.review.cardSafetyWarning)).toBe(true);
    for (const c of EXPANSION_CARDS) expect('warning' in c).toBe(false);
  });

  it('is found by id', () => {
    expect(expansionCardById('eupatorium-perfoliatum')?.cardNumber).toBe(57);
    expect(expansionCardById('taraxacum-officinale')).toBeUndefined();
  });
});

describe('expansion cards: nothing existing is overwritten or duplicated', () => {
  it('shares no id, scientific name or card number with any existing card', () => {
    const ids = new Set(CATALOGUE.map((h) => h.id));
    const sci = new Set(CATALOGUE.map((h) => h.scientificName.toLowerCase()));
    const nums = new Set(CATALOGUE.map((h) => h.cardNumber));
    for (const c of EXPANSION_CARDS) {
      expect(ids.has(c.id), c.id).toBe(false);
      expect(sci.has(c.scientificName.toLowerCase()), c.scientificName).toBe(false);
      expect(nums.has(c.cardNumber), String(c.cardNumber)).toBe(false);
      expect([46, 47]).not.toContain(c.cardNumber);
    }
  });

  it('leaves the live counts exactly as they were', () => {
    expect(PRINTED_DECK_SIZE).toBe(45);
    expect(PRINTED_CARDS).toHaveLength(45);
    expect(DIGITAL_ONLY_SIZE).toBe(9);
    expect(CATALOGUE_SIZE).toBe(54);
  });

  it('is absent from the generated deck and sprite data', () => {
    const herbs = readFileSync(join(ROOT, 'src/data/herbs.json'), 'utf8');
    const sprites = readFileSync(join(ROOT, 'src/data/sprites.json'), 'utf8');
    for (const c of EXPANSION_CARDS) {
      expect(herbs.includes(`"${c.id}"`), c.id).toBe(false);
      expect(sprites.includes(`"${c.id}"`), c.id).toBe(false);
    }
  });
});

describe('expansion cards: hidden from every live feature by construction', () => {
  const sources = walk(join(ROOT, 'src')).filter((p) => /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p));
  const edge = existsSync(join(ROOT, 'supabase/functions')) ? walk(join(ROOT, 'supabase/functions')).filter((p) => /\.ts$/.test(p)) : [];

  it('is imported by no live module, edge function or page', () => {
    const importers = [...sources, ...edge]
      .filter((p) => relative(ROOT, p) !== 'src/lib/expansion-cards.ts')
      .filter((p) => /expansion-cards/.test(readFileSync(p, 'utf8')))
      .map((p) => relative(ROOT, p));
    expect(importers).toEqual([]);
  });

  it('imports nothing but types itself, so it cannot reach the catalogue or deck either way', () => {
    const own = readFileSync(join(ROOT, 'src/lib/expansion-cards.ts'), 'utf8');
    const imports = [...own.matchAll(/^import\s+(type\s+)?[^;]*?from\s+'([^']+)'/gm)];
    for (const m of imports) {
      const isData = m[2] === '@/data/expansion-cards.json';
      expect(isData || Boolean(m[1]), `${m[2]} must be a type-only import`).toBe(true);
    }
    expect(own).not.toMatch(/from '\.\/(catalogue|deck|field-cards|collection)'/);
  });

  it('ships no expansion artwork in public/, which is what gets deployed', () => {
    const pub = walk(join(ROOT, 'public')).map((p) => relative(join(ROOT, 'public'), p));
    for (const c of EXPANSION_CARDS) {
      const hit = pub.filter((p) => p.includes(c.id));
      expect(hit, c.id).toEqual([]);
    }
    expect(pub.some((p) => /expansion/i.test(p))).toBe(false);
  });
});

describe('expansion cards: artwork lives outside public/ and has shared placeholders', () => {
  const ph = join(ROOT, 'expansion/assets/_placeholders');

  it('has one placeholder per artwork kind', () => {
    for (const f of ['main.png', 'pixel.png', 'tall.png']) expect(existsSync(join(ph, f)), f).toBe(true);
  });

  it('has a placeholder pixel icon of native 21-24px with an alpha channel', () => {
    const p = png(join(ph, 'pixel.png'));
    expect(p.w).toBeGreaterThanOrEqual(21);
    expect(p.w).toBeLessThanOrEqual(24);
    expect(p.h).toBeGreaterThanOrEqual(21);
    expect(p.h).toBeLessThanOrEqual(24);
    expect(p.colourType).toBe(6);
  });

  it('has a transparent main placeholder at template resolution and a tall one that is taller than wide', () => {
    const m = png(join(ph, 'main.png'));
    expect(m.colourType).toBe(6);
    expect(m.h).toBeGreaterThanOrEqual(484);
    const t = png(join(ph, 'tall.png'));
    expect(t.h / t.w).toBeGreaterThanOrEqual(1.3);
  });
});

describe('expansion cards: the generated file matches its supplied sources', () => {
  it('records the hash of each supplied file, and the copies in the repo still match', () => {
    expect(EXPANSION_SOURCE.files).toHaveLength(3);
    for (const f of EXPANSION_SOURCE.files) {
      const actual = createHash('sha256').update(readFileSync(join(ROOT, f.file))).digest('hex');
      expect(actual, `${f.file} changed; re-run scripts/import_expansion_cards.py`).toBe(f.sha256);
    }
  });
});
