import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
/**
 * Every hand-written function that imports the shared copies.
 *
 * More than one since the Seed Shelf: `seed-packet` mints a species' canonical artwork with
 * the same generator the app previews with, so it pulls in `seed-packet.ts`, `seed-shelf.ts`
 * and `plant-match.ts`. Walking only the first entrypoint would leave those three unchecked
 * — and unreachable-from-anywhere is exactly the state a forgotten sync leaves them in.
 */
const entrypoints = [
  join(root, 'supabase', 'functions', 'herbdex-action', 'index.ts'),
  join(root, 'supabase', 'functions', 'seed-packet', 'index.ts'),
  // identify-plant joined the list when it started issuing signed candidates: it now imports
  // the same validator and signer that seed-packet verifies with, and a drifted copy of
  // either would reject every legitimate scan.
  join(root, 'supabase', 'functions', 'identify-plant', 'index.ts'),
];

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
  it('resolves every module in the graph from every entrypoint', () => {
    const seen = new Set<string>();
    const queue = [...entrypoints];

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

    // Every pure module is reachable from some entrypoint, so a missing copy fails here too.
    for (const name of PURE_MODULES) {
      expect(seen, `${name} is not reachable from any entrypoint`).toContain(
        join(sharedDir, name),
      );
    }
  });

  it('holds the hand-written entrypoints to the same rule', () => {
    for (const specifier of entrypoints.flatMap((file) =>
      relativeImports(readFileSync(file, 'utf8')),
    )) {
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

/**
 * EVERY SHARED EXPORT AN EDGE FUNCTION USES MUST ACTUALLY BE IMPORTED.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BUG THIS EXISTS FOR, and it reached a live deployment. `seed-packet` called
 * `canonicalIdentity(entry)` while its import block named only `mintablePacketInput`. In
 * Deno that is a ReferenceError on the first request that reaches the line — the module
 * still boots, so OPTIONS answered 204 and the function looked deployed, and every POST
 * carrying a species came back as a bare `500 Internal Server Error` with no clue in it.
 *
 * Nothing in this repo could see it. `supabase/functions/**` is excluded from tsconfig and
 * ESLint because it is Deno, `deno check` needs a runtime this sandbox cannot install, and
 * the unit test that "covered" the call asserted the SOURCE TEXT contained
 * `canonicalIdentity(entry)` — which a missing import does not change.
 *
 * So this reads the shared modules' real exports and the function's real import list, and
 * compares them against what the function's code actually references.
 * ─────────────────────────────────────────────────────────────────────────────
 */
describe('edge functions import what they use', () => {
  /** Every name exported from the shared copies. */
  function sharedExports(): Set<string> {
    const names = new Set<string>();
    for (const file of readdirSync(sharedDir)) {
      if (!file.endsWith('.ts')) continue;
      const source = readFileSync(join(sharedDir, file), 'utf8');
      for (const match of source.matchAll(
        /^export\s+(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm,
      )) {
        names.add(match[1]!);
      }
    }
    return names;
  }

  /** Source with comments and string literals removed, so a mention in prose is not a use. */
  function code(source: string): string {
    return source
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/[^\n]*/g, ' ')
      .replace(/`(?:\\[\s\S]|[^\\`])*`/g, '``')
      .replace(/'(?:\\.|[^\\'])*'/g, "''")
      .replace(/"(?:\\.|[^\\"])*"/g, '""');
  }

  /** Names bound by this file's import statements, including `type X` and `X as Y`. */
  function importedNames(source: string): Set<string> {
    const names = new Set<string>();
    for (const block of source.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from/g)) {
      for (const entry of block[1]!.split(',')) {
        const cleaned = entry.replace(/\btype\b/, '').trim();
        if (!cleaned) continue;
        const alias = /\bas\s+([A-Za-z_$][\w$]*)/.exec(cleaned);
        names.add(alias ? alias[1]! : cleaned.split(/\s+/)[0]!);
      }
    }
    for (const def of source.matchAll(/import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/g)) {
      names.add(def[1]!);
    }
    return names;
  }

  it.each(entrypoints)('%s references only names it imports', (entrypoint) => {
    const source = readFileSync(entrypoint, 'utf8');
    const body = code(source);
    const imported = importedNames(source);

    const missing = [...sharedExports()].filter(
      (name) => !imported.has(name) && new RegExp(`\\b${name}\\b`).test(body),
    );

    expect(
      missing,
      `${entrypoint} uses shared export(s) it never imports: ${missing.join(', ')}. ` +
        'In Deno that is a ReferenceError at request time, not a build error.',
    ).toEqual([]);
  });
});
