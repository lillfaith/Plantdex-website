import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  addExplicitExtensions,
  PURE_MODULES,
  rewriteForDeno,
} from '../../scripts/sync-edge-shared.mjs';

/**
 * Guards the generated edge-function copies under `supabase/functions/_shared/herbdex/`.
 *
 * Two failures used to be invisible until `supabase functions deploy` rejected the bundle,
 * which is a slow and confusing place to find out:
 *
 *  1. Deno has no extension guessing. The sync script used to copy byte-for-byte, so every
 *     relative import arrived extensionless (`from './deck'`) and the deploy died with
 *     `Module not found ".../deck"`. There were 20 of them across 8 modules; only the first
 *     was reported, so fixing them one deploy at a time would have taken 8 rounds.
 *  2. `supabase/functions/**` is excluded from this project's tsconfig and ESLint (it is
 *     Deno, a different runtime), so nothing else in `npm run verify` reads these files at
 *     all. Editing a pure module in `src/lib` and forgetting to re-run the sync silently
 *     ships a server that disagrees with the client about mastery and research.
 *
 * These tests close both: the drift check re-derives what each file *should* contain from
 * its real source using the real rewrite, and the extension check reads the whole shipped
 * directory, entrypoint included.
 */

const root = join(import.meta.dirname, '..', '..');
const sharedDir = join(root, 'supabase', 'functions', '_shared', 'herbdex');
const entrypoint = join(root, 'supabase', 'functions', 'herbdex-action', 'index.ts');

/** Every relative specifier in a module, from `import`/`export ... from` and side effects. */
function relativeImports(source: string): string[] {
  return [...source.matchAll(/(?:\bfrom|\bimport)\s*['"](\.\.?\/[^'"]*)['"]/g)].map(
    (match) => match[1]!,
  );
}

describe('generated edge-function modules', () => {
  it('mirrors every pure module without drifting from its source', () => {
    for (const name of PURE_MODULES) {
      const source = readFileSync(join(root, 'src', 'lib', name), 'utf8');
      const generated = readFileSync(join(sharedDir, name), 'utf8');
      expect(generated, `${name} is stale — re-run \`npm run sync:edge-shared\``).toBe(
        rewriteForDeno(name, source),
      );
    }
  });

  it('ships the deck data the app ships', () => {
    expect(readFileSync(join(sharedDir, 'herbs.json'), 'utf8')).toBe(
      readFileSync(join(root, 'src', 'data', 'herbs.json'), 'utf8'),
    );
  });

  // The bug that broke `supabase functions deploy`: Deno resolves no extensions at all.
  it('gives every relative import an explicit extension Deno can resolve', () => {
    for (const name of [...PURE_MODULES, 'herbs.json'].filter((n) => n.endsWith('.ts'))) {
      for (const specifier of relativeImports(readFileSync(join(sharedDir, name), 'utf8'))) {
        expect(specifier, `${name} imports "${specifier}" without an extension`).toMatch(
          /\.(ts|json)$/,
        );
      }
    }
  });

  // Stronger than the extension check: walk the graph the way Deno does — a specifier is a
  // literal path, with no extension guessing and no index resolution — and confirm every
  // edge lands on a file that actually exists. Deno is not installable in every environment
  // this repo is worked on from, so this stands in for `deno check` on the resolution half,
  // which is the half that broke the deploy.
  it('resolves every module in the graph from the entrypoint', () => {
    const seen = new Set<string>();
    const queue = [entrypoint];

    while (queue.length > 0) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);

      for (const specifier of relativeImports(readFileSync(file, 'utf8'))) {
        const resolved = join(dirname(file), specifier);
        expect(
          existsSync(resolved),
          `${basename(file)} imports "${specifier}", which resolves to a file that does not exist`,
        ).toBe(true);
        if (resolved.endsWith('.ts')) queue.push(resolved);
      }
    }

    // Every pure module is reachable from the entrypoint, so a missing copy fails here too.
    for (const name of PURE_MODULES) {
      expect(seen, `${name} is not reachable from the entrypoint`).toContain(
        join(sharedDir, name),
      );
    }
  });

  it('holds the hand-written entrypoint to the same rule', () => {
    for (const specifier of relativeImports(readFileSync(entrypoint, 'utf8'))) {
      expect(specifier, `index.ts imports "${specifier}" without an extension`).toMatch(
        /\.(ts|json)$/,
      );
    }
  });

  it('imports deck data as a sibling JSON module, not through the app path alias', () => {
    const deck = readFileSync(join(sharedDir, 'deck.ts'), 'utf8');
    expect(deck).toContain("from './herbs.json' with { type: 'json' }");
    expect(deck).not.toContain('@/data/herbs.json');
  });
});

describe('addExplicitExtensions', () => {
  it('adds .ts to bare relative specifiers', () => {
    expect(addExplicitExtensions(`import { a } from './deck';`)).toBe(
      `import { a } from './deck.ts';`,
    );
    expect(addExplicitExtensions(`import type { T } from '../types';`)).toBe(
      `import type { T } from '../types.ts';`,
    );
    expect(addExplicitExtensions(`export { b } from './rng';`)).toBe(
      `export { b } from './rng.ts';`,
    );
    expect(addExplicitExtensions(`import './side-effect';`)).toBe(`import './side-effect.ts';`);
  });

  it('leaves specifiers that already resolve alone', () => {
    for (const line of [
      `import deckJson from './herbs.json' with { type: 'json' };`,
      `import { a } from './deck.ts';`,
    ]) {
      expect(addExplicitExtensions(line)).toBe(line);
    }
  });

  // Deno's own specifiers are not relative and must survive untouched — appending `.ts` to
  // either would break the entrypoint instead of fixing it.
  it('never touches npm: or https: specifiers', () => {
    for (const line of [
      `import { createClient } from 'npm:@supabase/supabase-js@2';`,
      `import { serve } from 'https://deno.land/std/http/server.ts';`,
    ]) {
      expect(addExplicitExtensions(line)).toBe(line);
    }
  });
});
