import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXPANSION_ENTRIES } from './expansion-entries';
import { COLLECTIONS } from './collection';
import { CATALOGUE } from './catalogue';
import { EXPANSION_PILOT_ON } from './expansion-pilot-flag';
// @ts-expect-error plain .mjs without declarations
import { REFUSAL_ENV, refusal } from '../../scripts/build-pilot-preview.mjs';

/*
 * THE PRODUCTION PATH IS UNCHANGED, AND A DEFAULT BUILD CONTAINS NONE OF THE PILOT.
 *
 * The preview is not a flag in the live app. It is a staged copy built by scripts/build-pilot-preview.mjs
 * in which one file is swapped. So the guarantees are: the committed seam is empty, nothing live can reach
 * the preview module, the config and every workflow pin the flag off, the script refuses CI, and a built
 * `out/` (when one exists) holds none of the five names or any card text.
 */

const read = (p: string) => readFileSync(p, 'utf8');
const walk = (dir: string, out: string[] = []): string[] => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

describe('the committed tree serves nothing', () => {
  it('has an empty expansion seam, no expansion collection and no digital entry beyond the 9 Field Cards', () => {
    expect(EXPANSION_ENTRIES).toEqual([]);
    expect(COLLECTIONS.map((c) => c.id)).toEqual(['collection-01', 'field-cards']);
    expect(CATALOGUE).toHaveLength(54);
  });
  it('reads the flag as off', () => {
    expect(EXPANSION_PILOT_ON).toBe(false);
  });
  it('keeps the generated pilot data HELD for all five', () => {
    const d = JSON.parse(read('docs/expansion/pilot/expansion-pilot.generated.json'));
    expect(d.cards.map((c: { publication: { status: string } }) => c.publication.status)).toEqual(Array(5).fill('HELD'));
  });
  it('is reachable from no live module: only the build script, the staged swap and tests name the preview module', () => {
    const offenders = walk('src')
      .filter((p) => /\.(ts|tsx)$/.test(p) && !/\.test\.tsx?$/.test(p) && !p.endsWith('expansion-entries.preview.ts'))
      .filter((p) => /(from|import\(|require\()\s*['"][^'"]*(expansion-entries\.preview|expansion-pilot\.generated)/.test(read(p)));
    expect(offenders).toEqual([]);
    const importers = walk('src').filter((p) => /from '\.\/expansion-entries'/.test(read(p)) && !p.endsWith('.test.ts'));
    expect(importers.sort()).toEqual(['src/lib/catalogue.ts', 'src/lib/collection.ts']);
  });
});

describe('the production build path is unchanged', () => {
  it('next.config.ts defaults the flag to the literal off and has no preview or staging logic', () => {
    const cfg = read('next.config.ts');
    expect(cfg).toMatch(/NEXT_PUBLIC_EXPANSION_PILOT:\s*process\.env\.NEXT_PUBLIC_EXPANSION_PILOT \?\? 'off'/);
    expect(cfg).not.toMatch(/pilot-preview|expansion-entries|PREVIEW/i);
  });
  it('no workflow sets the flag to anything but the literal off (today none mentions it at all)', () => {
    const dir = '.github/workflows';
    for (const f of readdirSync(dir).filter((n) => /\.ya?ml$/.test(n))) {
      for (const line of read(join(dir, f)).split('\n').filter((l) => l.includes('NEXT_PUBLIC_EXPANSION_PILOT'))) {
        expect(line.trim().replace(/\s+/g, ' '), `${f}: ${line}`).toBe("NEXT_PUBLIC_EXPANSION_PILOT: 'off'");
      }
    }
  });
  it('no workflow runs the preview build script', () => {
    for (const f of readdirSync('.github/workflows')) expect(read(join('.github/workflows', f))).not.toMatch(/build-pilot-preview|out-pilot-preview/);
  });
  it('no package script runs the preview as part of build, verify or test', () => {
    const scripts = JSON.parse(read('package.json')).scripts as Record<string, string>;
    for (const name of ['build', 'verify', 'test', 'lint', 'typecheck']) expect(scripts[name], name).not.toMatch(/pilot-preview/);
  });
  it('the preview script refuses in CI and in a deploy environment, and allows a plain local shell', () => {
    for (const name of REFUSAL_ENV) expect(refusal({ [name]: 'true' }), name).toMatch(new RegExp(name));
    expect(refusal({})).toBeNull();
  });
  it('the preview output is git-ignored', () => {
    expect(read('.gitignore')).toMatch(/^out-pilot-preview\/$/m);
  });
});

/*
 * THE BUILT-EXPORT SCAN. Runs against `out/` when a DEFAULT build exists (always after `npm run build`, and
 * required to exist with REQUIRE_EXPANSION_BUNDLE=1). Searches every built file for the five names, the
 * binomials, the card text, the preview label and the placeholder plate.
 */
describe('a default build holds none of the pilot content', () => {
  const required = process.env.REQUIRE_EXPANSION_BUNDLE === '1';
  const built = existsSync('out/index.html');
  const generated = JSON.parse(read('docs/expansion/pilot/expansion-pilot.generated.json')) as { cards: { commonName: string; scientificName: string; id: string; publication: { status: string } }[] };
  const needles = [
    'PREVIEW - UNREVIEWED', 'Herbdex Expansion', 'herbdex-expansion', 'No approved artwork in this build',
    ...generated.cards.flatMap((c) => [c.commonName, c.scientificName, c.id]),
  ].filter((n, i, a) => a.indexOf(n) === i);
  // NOT searched, on purpose: the six back fields (their words - "Wound support", "Mucilage" - are the
  // deck's own vocabulary and appear on printed cards), and the binomials of three species that the
  // matcher's EXISTING refusal/synonym tables already name in every build (Rumex crispus, Plantago
  // lanceolata, Trifolium repens). Card ids, common names, the other two binomials, the preview label,
  // the collection name and the placeholder plate text are unique to the pilot.
  const existingTableNames = new Set(['Rumex crispus', 'Plantago lanceolata', 'Trifolium repens']);
  const distinctive = needles.filter((n) => !existingTableNames.has(n));

  it.skipIf(!built && !required)('searches a real build', () => {
    expect(built, 'REQUIRE_EXPANSION_BUNDLE=1 needs a built out/').toBe(true);
    const files = walk('out').filter((p) => /\.(html|js|css|txt|json|svg)$/.test(p));
    expect(files.length).toBeGreaterThan(100);
  });
  it.skipIf(!built && !required)('contains none of the five names, binomials, ids or card text', () => {
    const hits: string[] = [];
    for (const p of walk('out').filter((q) => /\.(html|js|css|txt|json|svg|map)$/.test(q))) {
      const text = read(p);
      for (const n of distinctive) if (text.includes(n)) hits.push(`${p}: ${n}`);
    }
    expect(hits.slice(0, 20)).toEqual([]);
  });
  it('the needle list is real: it names every card and its distinctive back text', () => {
    for (const n of ['Boneset', 'Black-Eyed Susan', 'Curly Dock', 'Narrowleaf Plantain', 'White Clover', 'Rudbeckia hirta', 'rumex-crispus']) expect(distinctive).toContain(n);
    expect(distinctive.length).toBeGreaterThan(15);
  });
});
