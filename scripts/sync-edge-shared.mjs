#!/usr/bin/env node
// Copies the pure, browser-free modules that govern mastery and research completion into
// `supabase/functions/_shared/herbdex/`, so the edge function runs the *exact* logic that
// governs local play rather than a hand-maintained second copy. Run this before
// `supabase functions deploy` — see CLAUDE.md's "When adding a backend (V0.3)" section.
//
// Only `deck.ts`'s JSON import needs rewriting: the app resolves `@/data/herbs.json` via a
// bundler path alias Deno doesn't have, so the copy imports the sibling `herbs.json` this
// script places alongside it, with the `with { type: 'json' }` attribute Deno requires.
// Everything else is copied byte-for-byte.

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const srcLib = join(root, 'src', 'lib');
const destDir = join(root, 'supabase', 'functions', '_shared', 'herbdex');

const PURE_MODULES = [
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

mkdirSync(destDir, { recursive: true });

for (const name of PURE_MODULES) {
  const src = join(srcLib, name);
  const dest = join(destDir, name);
  if (name === 'deck.ts') {
    const rewritten = readFileSync(src, 'utf8').replace(
      "import deckJson from '@/data/herbs.json';",
      "import deckJson from './herbs.json' with { type: 'json' };",
    );
    writeFileSync(dest, rewritten);
  } else {
    copyFileSync(src, dest);
  }
}

copyFileSync(join(root, 'src', 'data', 'herbs.json'), join(destDir, 'herbs.json'));

console.log(`Synced ${PURE_MODULES.length} modules + herbs.json into ${destDir}`);
