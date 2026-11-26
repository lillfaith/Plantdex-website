#!/usr/bin/env node
/**
 * BUILD THE PROTECTED PILOT PREVIEW (local / sandbox only).
 *
 *   node scripts/build-pilot-preview.mjs [--out DIR] [--stage DIR]
 *
 * It copies the repository into a scratch directory, replaces `src/lib/expansion-entries.ts` there with
 * the preview module, sets NEXT_PUBLIC_EXPANSION_PILOT=on for that one build, and exports to DIR
 * (default `out-pilot-preview/`, git-ignored). The real checkout is never modified, so there is no switch in
 * it that a deploy could flip.
 *
 * It REFUSES to run in CI or when the production environment is configured, and no workflow calls it.
 */
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REFUSAL_ENV = ['CI', 'GITHUB_ACTIONS', 'GITHUB_PAGES', 'SITE_DOMAIN'];

/** Returns the reason this build must not run, or null. Exported so a test can exercise it. */
export function refusal(env) {
  for (const name of REFUSAL_ENV) if (env[name]) return `${name} is set: the pilot preview is a local sandbox build and never runs in CI or a deploy environment`;
  return null;
}

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function main() {
  const reason = refusal(process.env);
  if (reason) { console.error(`REFUSED: ${reason}`); process.exit(2); }
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? resolve(process.argv[i + 1]) : d; };
  const out = arg('--out', join(root, 'out-pilot-preview'));
  // Inside the repo (Turbopack refuses a node_modules that points outside its root), removed after the build.
  const stage = arg('--stage', join(root, '.pilot-preview-stage'));
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  const skip = new Set(['.pilot-preview-stage', '.git', 'node_modules', '.next', 'out', 'out-pilot-preview', 'evidence', 'field', 'field-inat', 'product-source']);
  for (const name of readdirSync(root)) {
    if (skip.has(name) || name.includes('iCloud Photos')) continue;
    cpSync(join(root, name), join(stage, name), { recursive: true });
  }
  // Hard links: same files, no copy, and Turbopack accepts them where it rejects a symlink.
  const link = spawnSync('cp', ['-al', join(root, 'node_modules'), join(stage, 'node_modules')], { stdio: 'inherit' });
  if (link.status !== 0) { console.error('could not hard-link node_modules into the stage'); process.exit(1); }
  writeFileSync(join(stage, 'src/lib/expansion-entries.ts'), readFileSync(join(root, 'src/lib/expansion-entries.preview.ts')));
  const env = { ...process.env, NEXT_PUBLIC_EXPANSION_PILOT: 'on' };
  const r = spawnSync('npx', ['next', 'build'], { cwd: stage, env, stdio: 'inherit' });
  if (r.status === 0) {
    rmSync(out, { recursive: true, force: true });
    cpSync(join(stage, 'out'), out, { recursive: true });
  }
  rmSync(stage, { recursive: true, force: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.log(`Preview exported to ${out}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
