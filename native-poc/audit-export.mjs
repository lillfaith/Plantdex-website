// Read-only audit of a built static export (`out/`) for bundling inside a native WKWebView shell.
// Usage: node native-poc/audit-export.mjs [out-dir]
// It changes nothing, imports nothing from src/, and needs no dependency. It answers: how many files and
// bytes would ship in the app, which routes exist, whether the export was built for a domain root (no
// base path, which is what capacitor://localhost serves), and which URLs would leave the bundle.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.argv[2] ?? 'out';
const files = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else files.push({ path: p, size: statSync(p).size });
  }
})(root);

const bytes = (list) => list.reduce((n, f) => n + f.size, 0);
const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
const byExt = {};
for (const f of files) (byExt[extname(f.path) || '(none)'] ??= []).push(f);

console.log(`files: ${files.length}  total: ${mb(bytes(files))}`);
for (const [ext, list] of Object.entries(byExt).sort((a, b) => bytes(b[1]) - bytes(a[1])).slice(0, 8)) {
  console.log(`  ${ext.padEnd(8)} ${String(list.length).padStart(5)} files  ${mb(bytes(list))}`);
}
const html = files.filter((f) => f.path.endsWith('.html'));
const rsc = files.filter((f) => f.path.endsWith('.txt'));
console.log(`html pages: ${html.length}   RSC payload (.txt) files: ${rsc.length}`);

let basePathed = 0;
const external = new Map();
let rootRel = 0;
for (const f of html) {
  const s = readFileSync(f.path, 'utf8');
  if (/(?:href|src)="\/Plantdex-website\//.test(s)) basePathed += 1;
  if (/(?:href|src)="\/_next\//.test(s)) rootRel += 1;
  for (const m of s.matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)) {
    const host = new URL(m[1]).host;
    external.set(host, (external.get(host) ?? 0) + 1);
  }
}
console.log(`pages referencing /Plantdex-website/ base path: ${basePathed} (must be 0 for a bundled build)`);
console.log(`pages using root-relative /_next/ assets: ${rootRel} (what capacitor://localhost/ serves)`);
console.log('external hosts referenced from markup (would need network, or be removed/blocked in-app):');
for (const [h, n] of [...external].sort()) console.log(`  ${h} x${n}`);

// Third-party script tags injected at runtime are not in the HTML; list build-time env sensitivity too.
const js = files.filter((f) => f.path.endsWith('.js'));
let supabaseUrls = new Set();
for (const f of js) {
  for (const m of readFileSync(f.path, 'utf8').matchAll(/https:\/\/[a-z0-9]{20}\.supabase\.co/g)) supabaseUrls.add(m[0]);
}
console.log(`supabase project URLs baked into JS: ${supabaseUrls.size ? [...supabaseUrls].join(', ') : 'none (accounts unconfigured in this build)'}`);
