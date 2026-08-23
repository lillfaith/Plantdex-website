#!/usr/bin/env node
// Copies the pure, browser-free modules that govern mastery and research completion into
// `supabase/functions/_shared/herbdex/`, so the edge function runs the *exact* logic that
// governs local play rather than a hand-maintained second copy. Run this before
// `supabase functions deploy` — see CLAUDE.md's "V0.3 accounts" section.
//
// Two rewrites are applied on the way across, because Deno resolves modules differently
// from the Next.js bundler the app is built with:
//
//  1. RELATIVE IMPORTS GET AN EXPLICIT `.ts`. `src/lib` is compiled with
//     `moduleResolution: bundler`, which lets a module say `from './deck'`. Deno has no
//     such extension guessing and fails the whole bundle with `Module not found ".../deck"`
//     — which is exactly how this broke once: the copy was byte-for-byte, so all 20
//     relative specifiers across these modules arrived extensionless and
//     `supabase functions deploy` died on the first one it reached. The app's own sources
//     must stay extensionless (tsconfig does not set `allowImportingTsExtensions`), so the
//     rewrite belongs here, in the generated copy, and never in `src/lib`.
//  2. `deck.ts`'s JSON import is repointed: the app resolves `@/data/herbs.json` via a
//     bundler path alias Deno doesn't have, so the copy imports the sibling `herbs.json`
//     this script places alongside it, with the `with { type: 'json' }` attribute Deno
//     requires.
//
// Nothing else is altered — no logic is rewritten, dropped or duplicated here.
// `edge-shared.test.ts` pins both rewrites and fails if a generated file drifts from the
// source it mirrors, so a missed re-run surfaces in `npm test` rather than in a failed deploy.

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PURE_MODULES = [
  'types.ts',
  'herbdex-state.ts',
  'deck.ts',
  'achievements.ts',
  'progression.ts',
  'mastery.ts',
  'rng.ts',
  'research.ts',
  'herbdex-reducer.ts',
];

/** Specifiers that already carry an extension Deno understands are left alone. */
const HAS_EXTENSION = /\.(ts|tsx|js|mjs|cjs|json)$/;

/**
 * Add the explicit `.ts` Deno requires to every relative specifier.
 *
 * Covers `import ... from '...'`, `export ... from '...'` and bare `import '...'` side
 * effect imports. Only `./` and `../` specifiers are touched: `npm:` and `https:`
 * specifiers are Deno's own and must pass through untouched.
 */
export function addExplicitExtensions(source) {
  return source
    .replace(/(\bfrom\s*['"])(\.\.?\/[^'"]*)(['"])/g, (match, open, spec, close) =>
      HAS_EXTENSION.test(spec) ? match : `${open}${spec}.ts${close}`,
    )
    .replace(/(\bimport\s*['"])(\.\.?\/[^'"]*)(['"])/g, (match, open, spec, close) =>
      HAS_EXTENSION.test(spec) ? match : `${open}${spec}.ts${close}`,
    );
}

/** The exact bytes `name` should have inside `_shared/herbdex/`, given its `src/lib` source. */
export function rewriteForDeno(name, source) {
  const repointed =
    name === 'deck.ts'
      ? source.replace(
          "import deckJson from '@/data/herbs.json';",
          "import deckJson from './herbs.json' with { type: 'json' };",
        )
      : source;
  return addExplicitExtensions(repointed);
}

export function syncEdgeShared(root) {
  const srcLib = join(root, 'src', 'lib');
  const destDir = join(root, 'supabase', 'functions', '_shared', 'herbdex');

  mkdirSync(destDir, { recursive: true });

  for (const name of PURE_MODULES) {
    const source = readFileSync(join(srcLib, name), 'utf8');
    writeFileSync(join(destDir, name), rewriteForDeno(name, source));
  }

  copyFileSync(join(root, 'src', 'data', 'herbs.json'), join(destDir, 'herbs.json'));
  return destDir;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const destDir = syncEdgeShared(root);
  console.log(`Synced ${PURE_MODULES.length} modules + herbs.json into ${destDir}`);
}
