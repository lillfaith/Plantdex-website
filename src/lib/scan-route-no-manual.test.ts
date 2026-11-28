import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
const flat = (source: string) => source.replace(/\s+/g, ' ');
const read = (path: string) => readFileSync(path, 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(name)) out.push(full);
  }
  return out;
}

/**
 * OWNER DECISION: a new collectible card is unlocked only by the in-app camera and receipt
 * flow. The card page used to record a find from two taps; it now routes to the scanner.
 */
describe('the card page routes to Scan and unlocks nothing', () => {
  const panel = strip(read('src/components/herbdex/DiscoverPanel.tsx'));

  it('links to the scanner with a 44px-plus primary action', () => {
    expect(panel).toContain("from 'next/link'");
    expect(panel).toContain('href="/scan"');
    expect(panel).toContain('Scan it to collect');
    expect(panel).toMatch(/min-h-12/);
  });

  it('never calls discover() and has no confirm dialog', () => {
    expect(panel).not.toMatch(/\bdiscover\(/);
    expect(panel).not.toMatch(/\bdiscover\b[^a-zA-Z]*[,}]\s*=\s*useHerbdex|\{[^}]*\bdiscover\b[^}]*\}\s*=\s*useHerbdex/);
    expect(panel).not.toContain('<dialog');
    expect(panel).not.toContain('Yes, I found it');
    expect(panel).not.toContain('Log a Discovery');
  });

  it('says how a card is unlocked, in the honest words', () => {
    const text = flat(panel);
    expect(text).toContain('unlocked by scanning the plant with the in-app camera while signed in');
    expect(text).toContain('cannot unlock a card');
    expect(text).not.toMatch(/verified|found it outdoors|safe to eat|edible/i);
  });

  it('prints only the XP the ledger would pay for a scan', () => {
    expect(panel).toContain('xpForDiscoveries([herb.id])');
    expect(panel).not.toMatch(/\{herb\.xp\}/);
  });

  it('keeps the reveal-for-reading path', () => {
    const locked = read('src/components/herbdex/LockedHerb.tsx');
    expect(locked).toContain('revealHerb(herb.id)');
    expect(locked).not.toContain('Log a Discovery');
    expect(locked).not.toContain('spoilerFree');
  });
});

describe('no component outside the scan lane writes a discovery', () => {
  const files = walk('src/components').filter(
    (f) => !f.includes('/components/scan/') && !f.includes('/components/seedshelf/'),
  );

  it('has no discover( call', () => {
    const offenders = files.filter((f) => /\bdiscover\(/.test(strip(read(f))));
    expect(offenders).toEqual([]);
  });
});

describe('CollectionRefusalNotice', () => {
  const tsx = read('src/components/ui/CollectionRefusalNotice.tsx');
  const css = read('src/app/globals.css');
  const block = css.slice(css.indexOf('.refusal-host {'));

  it('is a status region with a 44px dismiss and a Scan link', () => {
    expect(tsx).toContain('role="status"');
    expect(tsx).toContain('min-h-11 min-w-11');
    expect(tsx).toContain('dismissRefusal');
    expect(tsx).toContain('href="/scan"');
    expect(flat(tsx)).toContain('scanning the plant with the in-app camera while signed in');
  });

  it('is flat lavender, not a dark panel, and never animates', () => {
    expect(block).toContain('var(--card-violet-50)');
    expect(block).toContain('var(--card-violet-500)');
    expect(block).not.toMatch(/animation|infinite|backdrop-filter|blur|gradient/);
    expect(tsx).not.toMatch(/animate-|infinite/);
  });

  it('sits above the bottom nav and only takes pointer events inside its card', () => {
    expect(block).toMatch(/\.refusal-host \{[^}]*bottom: calc\(5rem/);
    expect(block).toMatch(/\.refusal-host \{[^}]*pointer-events: none/);
    expect(block).toMatch(/\.refusal-card \{[^}]*pointer-events: auto/);
  });

  it('claims neither verification nor outdoors', () => {
    expect(tsx.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/verified|found outdoors/i);
  });
});
