#!/usr/bin/env node
/**
 * Search the asset manifest.   npm run find -- dandelion     npm run find -- garden
 *
 * Matches plant ids, common and scientific names, screen keys and routes, UI-part keys
 * and notes, and finally raw pack paths. Prints what an ad spec would reference.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VIDEO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const m = JSON.parse(readFileSync(join(VIDEO, 'manifest/assets.json'), 'utf8'));
const q = process.argv.slice(2).join(' ').toLowerCase();
if (!q) {
  console.log('usage: npm run find -- <term>');
  process.exit(2);
}
const hit = (...xs) => xs.some((x) => x && String(x).toLowerCase().includes(q));

for (const [id, p] of Object.entries(m.plants)) {
  if (!hit(id, p.commonName, p.scientificName, `#${p.cardNumber}`)) continue;
  const flags = [!p.printed && 'digital-only Field Card', p.printedWarning && 'prints a warning', p.knownCardIssue && 'known card issue']
    .filter(Boolean)
    .join('; ');
  console.log(`\nPLANT ${id} — #${p.cardNumber} ${p.commonName} (${p.scientificName}) ${p.rarity}${flags ? ` [${flags}]` : ''}`);
  for (const [v, f] of Object.entries(p.cards)) if (f) console.log(`  card ${v.padEnd(8)} ${f}`);
  for (const [s, seq] of Object.entries(p.sprites))
    console.log(`  sprite ${s.padEnd(7)} ${seq.frameCount} frames @ ${seq.fps}fps, ${seq.frameWidth}x${seq.frameHeight}  ${dirname(seq.frames[0])}/`);
}
for (const [k, s] of Object.entries(m.screens)) {
  if (!hit(k, s.route)) continue;
  console.log(`\nSCREEN ${k} (${s.route})`);
  for (const [fr, f] of Object.entries(s)) if (fr !== 'route') console.log(`  ${fr.padEnd(17)} ${f}`);
}
for (const [k, u] of Object.entries(m.uiParts)) {
  if (hit(k, u.note)) console.log(`\nUI PART ${k} — ${u.note}\n  ${u.file} ${m.files[u.file].width}x${m.files[u.file].height}`);
}
const paths = Object.keys(m.files).filter((f) => f.toLowerCase().includes(q) && !f.includes('/frames/'));
if (paths.length) console.log(`\nFILES (${paths.length}, sprite frames omitted)\n${paths.slice(0, 40).map((f) => `  ${f}`).join('\n')}`);
