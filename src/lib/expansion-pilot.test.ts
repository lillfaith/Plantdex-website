import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generate, REVIEW_COPY, GENERATED } from '../../scripts/expansion/generate_pilot.mjs';
import {
  canonicalJson, isRealCitation, loadIntegration, loadReviews, loadSnapshot, publicationGate, validateBatch, validateRecord,
} from '../../scripts/expansion/validate_record.mjs';

const integ = loadIntegration();
const snapshot = loadSnapshot();
const clone = <T,>(v: T): T => structuredClone(v);
const entry = (id: string) => clone(snapshot.cards.find((c: { record: { id: string } }) => c.record.id === id));
const codes = (xs: { code: string }[]) => xs.map((x) => x.code);
const REAL = 'https://pubmed.ncbi.nlm.nih.gov/22004891/';
const SEARCH = 'https://pubmed.ncbi.nlm.nih.gov/?term=%22Rudbeckia%20hirta%22';
/** A record with every review present: proves the gate CAN pass, and gives each test one thing to remove. */
const fullReview = () => ({
  caution: { text: 'Contains pyrrolizidine alkaloids; do not take internally.', sources: [REAL], reviewedBy: 'botanist', reviewedAt: '2026-11-25' },
  image: { botanicallyReviewed: true, reviewedBy: 'botanist', reviewedAt: '2026-11-25' },
  taxon: { authority: 'WCVP', acceptedName: 'Eupatorium perfoliatum', rank: 'species', checkedAt: '2026-11-25', url: 'https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:1' },
});
const approved = () => { const e = entry('eupatorium-perfoliatum'); e.inventory.mainImage = 'APPROVED'; e.inventory.pixelIcon = 'APPROVED'; return e; };

describe('the five pilot records', () => {
  const results = validateBatch(snapshot, loadReviews(), integ);
  it('are the pilot set and are structurally valid', () => {
    expect(results.map((r) => r.cardNumber)).toEqual([57, 60, 67, 68, 80]);
    for (const r of results) expect(r.errors, r.id).toEqual([]);
  });
  it('are all HELD, because no review exists, with machine-readable reasons', () => {
    for (const r of results) {
      expect(r.gate.status, r.id).toBe('HELD');
      expect(codes(r.gate.reasons), r.id).toEqual(expect.arrayContaining(['caution_unreviewed', 'taxon_identity_unverified', 'image_ai_derivative_unreviewed']));
    }
  });
  it('count only #57 as having real citations; the others hold search links', () => {
    const by = Object.fromEntries(results.map((r) => [r.id, codes(r.gate.reasons)]));
    expect(by['eupatorium-perfoliatum']).not.toContain('citations_only_search_links');
    for (const id of ['rudbeckia-hirta', 'rumex-crispus', 'plantago-lanceolata', 'trifolium-repens']) expect(by[id], id).toContain('citations_only_search_links');
  });
  it('hold #67 and #68 on unapproved main images, and #80 on an unrecorded origin', () => {
    const by = Object.fromEntries(results.map((r) => [r.id, r.gate.reasons]));
    expect(by['rumex-crispus']).toContainEqual({ code: 'asset_not_approved', detail: 'main' });
    expect(by['plantago-lanceolata']).toContainEqual({ code: 'asset_not_approved', detail: 'main' });
    expect(codes(by['trifolium-repens'] ?? [])).toContain('image_origin_unrecorded');
  });
});

describe('collisions are rejected', () => {
  it('an id already in integration or the catalogue', () => {
    const e = entry('rumex-crispus'); e.record.id = 'plantago-major';
    expect(codes(validateRecord(e, integ))).toContain('id_collision');
    const f = entry('rumex-crispus'); f.record.id = 'echinacea-purpurea';
    expect(codes(validateRecord(f, integ))).toContain('id_collision');
  });
  it('a card number already used, by the deck, a Field Card or the two non-herb cards', () => {
    for (const n of [1, 45, 46, 47, 48, 56]) {
      const e = entry('rumex-crispus'); e.record.cardNumber = n;
      expect(codes(validateRecord(e, integ)), String(n)).toContain('number_collision');
    }
  });
  it('a species already carried, and a genus held by a spp. card', () => {
    const e = entry('rumex-crispus'); e.record.scientificName = 'Plantago major'; e.record.id = 'plantago-major';
    expect(codes(validateRecord(e, integ))).toContain('name_collision');
    const g = entry('rumex-crispus'); g.record.scientificName = 'Acer rubrum'; g.record.id = 'acer-rubrum';
    expect(codes(validateRecord(g, integ))).toContain('claimed_by_genus_card');
  });
  it('a duplicate inside the batch', () => {
    const a = entry('rumex-crispus'), b = entry('plantago-lanceolata'); b.record.cardNumber = 67; b.record.id = 'rumex-crispus';
    expect(codes(validateRecord(b, integ, [a, b]))).toEqual(expect.arrayContaining(['id_collision', 'number_collision']));
  });
  it('a non-species identity, an unknown rarity, xp off the table, a bad season, a missing field', () => {
    const e = entry('rumex-crispus');
    e.record.scientificName = 'Rumex spp.'; e.record.front.rarity = 'Mythic'; e.record.front.season = 'monsoon'; delete e.record.back.taste;
    expect(codes(validateRecord(e, integ))).toContain('missing_field');
    const f = entry('rumex-crispus'); f.record.scientificName = 'Rumex x acutus'; f.record.id = 'rumex-x-acutus';
    expect(codes(validateRecord(f, integ))).toContain('identity_not_species');
    const g = entry('rumex-crispus'); g.record.front.xp = 175; g.record.front.season = 'monsoon';
    expect(codes(validateRecord(g, integ))).toEqual(expect.arrayContaining(['bad_xp', 'bad_season']));
  });
});

describe('hashes', () => {
  it('a missing recorded hash, a mismatch and a file not found are each an error', () => {
    const e = entry('rumex-crispus'); delete e.assets.main.recordedSha256;
    expect(codes(validateRecord(e, integ, [], snapshot.sourceFiles))).toContain('missing_hash');
    const m = entry('rumex-crispus'); m.assets.main.actualSha256 = '0'.repeat(64);
    expect(codes(validateRecord(m, integ, [], snapshot.sourceFiles))).toContain('hash_mismatch');
    const n = entry('rumex-crispus'); n.assets.pixel.actualSha256 = null;
    expect(codes(validateRecord(n, integ, [], snapshot.sourceFiles))).toContain('hash_unverifiable');
    const src = clone(snapshot.sourceFiles); src[0].recordedSha256 = 'abc';
    expect(codes(validateRecord(entry('rumex-crispus'), integ, [], src))).toContain('missing_hash');
  });
  it('the committed snapshot has verified every source file and asset', () => {
    expect(snapshot.sourceFiles).toHaveLength(7);
    for (const f of snapshot.sourceFiles) expect(f.recordedSha256).toBe(f.actualSha256);
  });
});

describe('the publication gate', () => {
  it('can pass, and only with every review present', () => {
    expect(publicationGate(approved(), fullReview())).toEqual({ status: 'READY', reasons: [] });
    for (const key of ['caution', 'image', 'taxon'] as const) {
      const r = fullReview(); delete r[key];
      expect(publicationGate(approved(), r).status, key).toBe('HELD');
    }
  });
  it('does not count a search link as a citation, however it is labelled', () => {
    expect(isRealCitation({ url: SEARCH, isCitation: true, type: 'Direct reference' })).toBe(false);
    expect(isRealCitation({ url: 'https://scholar.google.com/scholar?q=x', isCitation: true })).toBe(false);
    expect(isRealCitation({ url: REAL, isCitation: false })).toBe(false);
    expect(isRealCitation({ url: REAL, isCitation: true })).toBe(true);
    const e = approved(); e.record.researchLinks.links = [{ url: SEARCH, isCitation: true, type: 'Direct reference' }];
    expect(codes(publicationGate(e, fullReview()).reasons)).toContain('citations_only_search_links');
    e.record.researchLinks.links = [];
    expect(codes(publicationGate(e, fullReview()).reasons)).toContain('citations_missing');
  });
  it('holds an AI-derived or unrecorded image until it is flagged reviewed', () => {
    const unreviewed = { ...fullReview(), image: undefined };
    expect(codes(publicationGate(approved(), unreviewed).reasons)).toContain('image_ai_derivative_unreviewed');
    expect(codes(publicationGate(approved(), { ...fullReview(), image: { botanicallyReviewed: false, reviewedBy: 'x', reviewedAt: 'y' } }).reasons)).toContain('image_ai_derivative_unreviewed');
    const e = approved(); e.assets.main.origin = 'photograph';
    expect(publicationGate(e, unreviewed).status).toBe('READY');
    e.assets.main.origin = null;
    expect(codes(publicationGate(e, unreviewed).reasons)).toContain('image_origin_unrecorded');
  });
  it('never counts a generic or unsourced caution as sourced', () => {
    for (const text of ['Identify positively before use.', 'Daisy-family allergy possible.']) {
      const r = fullReview(); r.caution.text = text;
      expect(codes(publicationGate(approved(), r).reasons), text).toContain('caution_generic');
    }
    const noSource = fullReview(); noSource.caution.sources = [SEARCH];
    expect(codes(publicationGate(approved(), noSource).reasons)).toContain('caution_unsourced');
    const unsigned = fullReview(); unsigned.caution.reviewedBy = '';
    expect(codes(publicationGate(approved(), unsigned).reasons)).toContain('caution_review_unsigned');
    expect(codes(publicationGate(approved(), {}).reasons)).toContain('caution_unreviewed');
  });
  it('holds a taxon whose accepted name differs from the record', () => {
    const r = fullReview(); r.taxon.acceptedName = 'Eupatorium altissimum';
    expect(codes(publicationGate(approved(), r).reasons)).toContain('taxon_name_mismatch');
  });
});

describe('the generated file', () => {
  const text = generate();
  const data = JSON.parse(text);
  it('is deterministic: same bytes twice, canonical, no negative zero, no carriage return', () => {
    expect(generate()).toBe(text);
    expect(canonicalJson(data)).toBe(text);
    expect(text.endsWith('\n') && !text.includes('\r') && !/-0(\D)/.test(text.replace(/"[^"]*"/g, '""'))).toBe(true);
  });
  it('is the committed review copy, and the src/data copy if there is one', () => {
    expect(readFileSync(REVIEW_COPY, 'utf8')).toBe(text);
    if (existsSync(GENERATED)) expect(readFileSync(GENERATED, 'utf8')).toBe(text);
  });
  it('carries only fields that came from the validated record, with explicit nulls for the rest', () => {
    const allowed = new Set(['species', 'owner-supplied master sheet (draft), not independently verified']);
    const pool = JSON.stringify(snapshot.cards);
    for (const c of data.cards) {
      for (const k of ['identification', 'lookalikes', 'habitat', 'sprite', 'collectionId', 'caution']) expect(c[k], `${c.id}.${k}`).toBeNull();
      expect(c.assets.publishedPath).toBeNull();
      const leaves: string[] = [];
      const walk = (v: unknown, path: string) => {
        if (typeof v === 'string') { if (!path.startsWith('publication')) leaves.push(v); }
        else if (Array.isArray(v)) v.forEach((x) => walk(x, path));
        else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, path ? `${path}.${k}` : k));
      };
      walk(c, '');
      for (const s of leaves) expect(allowed.has(s) || pool.includes(JSON.stringify(s).slice(1, -1)), `${c.id}: invented string ${s}`).toBe(true);
    }
  });
  it('drops the draft caution until a review supplies one, and then uses only the reviewed text', () => {
    for (const c of snapshot.cards) expect(text).not.toContain(c.record.review.cardSafetyWarning);
    const withReview = JSON.parse(generate(snapshot, { 'eupatorium-perfoliatum': fullReview() }, integ)).cards[0];
    expect(withReview.caution.text).toBe(fullReview().caution.text);
    expect(withReview.caution.sources).toEqual([REAL]);
  });
  it('refuses to generate from an invalid record', () => {
    const bad = clone(snapshot); bad.cards[0].record.cardNumber = 45;
    expect(() => generate(bad, {}, integ)).toThrow(/number_collision/);
  });
});

describe('the pilot stays out of the live app', () => {
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const live: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx|js|mjs)$/.test(name) && !/\.test\./.test(name)) live.push(p.replace(/\\/g, '/'));
    }
  };
  walk('src');
  it('has no live module importing the generated file or the importer', () => {
    const importers = live.filter((p) => /expansion-pilot\.generated|pilot-source|generate_pilot|validate_record|snapshot_draft/.test(strip(readFileSync(p, 'utf8'))));
    expect(importers).toEqual([]);
  });
  it('has no live module reading the flag or the pilot module yet', () => {
    const readers = live.filter((p) => p !== 'src/lib/expansion-pilot-flag.ts' && /expansion-pilot-flag|NEXT_PUBLIC_EXPANSION_PILOT/.test(strip(readFileSync(p, 'utf8'))));
    expect(readers).toEqual([]);
  });
  it('reads the flag as === \'on\' and nothing else', () => {
    const flag = strip(readFileSync('src/lib/expansion-pilot-flag.ts', 'utf8'));
    expect(flag).toMatch(/process\.env\.NEXT_PUBLIC_EXPANSION_PILOT === 'on'/);
    expect(flag).not.toMatch(/'true'|'1'|'preview'|toLowerCase|\?\?|\|\|/);
  });
  it('has filed the next.config.ts default as a request rather than editing the file', () => {
    expect(readFileSync('agents/requests/coord-expansion-pilot-flag.md', 'utf8')).toContain("NEXT_PUBLIC_EXPANSION_PILOT: process.env.NEXT_PUBLIC_EXPANSION_PILOT ?? 'off',");
    expect(readFileSync('next.config.ts', 'utf8')).not.toContain('EXPANSION_PILOT');
  });
  it('the draft caution lines and ids appear nowhere in live source', () => {
    const lines = snapshot.cards.map((c: { record: { review: { cardSafetyWarning: string } } }) => c.record.review.cardSafetyWarning);
    for (const p of live) { const t = readFileSync(p, 'utf8'); for (const l of lines) expect(t.includes(l), `${p}: ${l}`).toBe(false); }
  });
  /** Meaningful only after `next build` with the flag off; skips locally without out/, cannot skip when REQUIRE_EXPANSION_BUNDLE=1. */
  const required = process.env.REQUIRE_EXPANSION_BUNDLE === '1';
  it.skipIf(!required && !existsSync('out/_next'))('a flag-off built export contains none of the pilot content', () => {
    expect(existsSync('out/index.html'), 'out/ is not a complete export').toBe(true);
    expect(process.env.NEXT_PUBLIC_EXPANSION_PILOT ?? 'off', 'the build under test must have the flag off').toBe('off');
    const needles = [...snapshot.cards.map((c: { record: { review: { cardSafetyWarning: string } } }) => c.record.review.cardSafetyWarning), 'expansion-pilot.generated', 'Pyrrolizidine-alkaloid status disputed'];
    const found: string[] = []; let scanned = 0;
    const scan = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) scan(p);
        else if (/\.(js|html|txt|json)$/.test(name)) { scanned += 1; const t = readFileSync(p, 'utf8'); for (const n of needles) if (t.includes(n)) found.push(`${p}: ${n}`); }
      }
    };
    scan('out');
    expect(scanned).toBeGreaterThan(0);
    expect(found).toEqual([]);
  });
});
