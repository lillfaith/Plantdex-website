import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOGUE } from './catalogue';

const PAGE = readFileSync('src/app/learn/plants/page.tsx', 'utf8');
const code = PAGE.replace(/\/\*[\s\S]*?\*\//g, '');

describe('the plant library index', () => {
  it('lists the whole catalogue from the catalogue itself, once each', () => {
    expect(code).toContain('[...CATALOGUE]');
    expect(new Set(CATALOGUE.map((p) => p.id)).size).toBe(CATALOGUE.length);
  });
  it('links every row to the one expanded profile, on its Field Identification tab', () => {
    expect(code).toContain('href={`/herbdex/${plant.id}/#field-identification`}');
  });
  it('is an index only: it reads names, never traits, lookalikes, uses or the card back', () => {
    expect(code).not.toMatch(/card-field-notes|fieldNotesFor|healingTraits|\.back\./);
    expect(code).not.toMatch(/herbs\.json|sources\.json/);
  });
  it('is open to everybody and carries the safety notice', () => {
    expect(code).not.toMatch(/useHerbdex|isDiscovered|'use client'/);
    expect(code).toContain('<SafetyNotice');
  });
  it('is reachable from Learn', () => {
    expect(readFileSync('src/app/learn/page.tsx', 'utf8')).toContain("href: '/learn/plants'");
  });
});
