#!/usr/bin/env node
/**
 * Builds scripts/expansion/data/pilot-source.json: a TEXT-ONLY snapshot of the draft records for the pilot
 * cards, read from a git ref by `git show` (the draft branch is never checked out, modified or copied from).
 * No image bytes enter the repo: for every asset we record the sha256 the draft CLAIMS and the sha256 of the
 * blob that is ACTUALLY at that ref, so the validator can prove they agree without the image being here.
 *
 *   node scripts/expansion/snapshot_draft.mjs [--ids a,b] [--draft-ref R] [--inventory-ref R]
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { canonicalJson } from './validate_record.mjs';

export const DRAFT_REF = 'origin/claude/plantdex-v0-3-supabase-verify-iic8pz';
export const INVENTORY_REF = 'origin/coord/expansion-audit-inventory';
export const PILOT_IDS = ['eupatorium-perfoliatum', 'rudbeckia-hirta', 'rumex-crispus', 'plantago-lanceolata', 'trifolium-repens'];
export const SNAPSHOT_PATH = 'scripts/expansion/data/pilot-source.json';

const git = (...args) => execFileSync('git', args, { maxBuffer: 1 << 28 });
const show = (ref, path) => git('show', `${ref}:${path}`);
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const tryShow = (ref, path) => { try { return execFileSync('git', ['show', `${ref}:${path}`], { maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; } };

function csvRows(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

function assetsFor(draftRef, id, number) {
  const dir = `expansion/assets/${id}`;
  const a = tryShow(draftRef, `${dir}/assets.json`);
  const out = {};
  if (a) {
    const rec = JSON.parse(a);
    for (const role of ['main', 'pixel', 'tall']) {
      const e = rec[role]; if (!e) continue;
      const blob = tryShow(draftRef, `${dir}/${e.file}`);
      out[role] = { path: `${dir}/${e.file}`, recordedSha256: e.sha256 ?? null, actualSha256: blob ? sha(blob) : null,
        origin: e.origin ?? null, botanicalReviewRequired: e.botanical_review_required ?? null, importedBy: e.imported_by ?? null, note: null };
    }
    return out;
  }
  const slug = `${String(number).padStart(3, '0')}_${id}`;
  const dirP = `expansion/cards/${slug}/approved_final`;
  const prov = JSON.parse(show(draftRef, `${dirP}/provenance.json`));
  const roles = { main: 'main_generated_cutout_used.png', pixel: 'pixel_icon_native_24x24.png' };
  for (const [role, file] of Object.entries(roles)) {
    if (!(file in prov.files)) continue;
    const blob = tryShow(draftRef, `${dirP}/${file}`);
    out[role] = { path: `${dirP}/${file}`, recordedSha256: prov.files[file], actualSha256: blob ? sha(blob) : null,
      origin: null, botanicalReviewRequired: null, importedBy: null, note: prov.note ?? null };
  }
  return out;
}

export function buildSnapshot({ ids = PILOT_IDS, draftRef = DRAFT_REF, inventoryRef = INVENTORY_REF } = {}) {
  const draftBlob = show(draftRef, 'src/data/expansion-cards.json');
  const draft = JSON.parse(draftBlob);
  const inv = csvRows(show(inventoryRef, 'docs/expansion/audit/inventory.csv').toString('utf8'));
  const files = draft.source.files.map((f) => {
    const blob = tryShow(draftRef, f.file);
    return { file: f.file, recordedSha256: f.sha256, actualSha256: blob ? sha(blob) : null };
  });
  const overrides = JSON.parse(show(draftRef, 'expansion/text-overrides.json'));
  const cards = ids.map((id) => {
    const found = draft.cards.find((c) => c.id === id);
    if (!found) throw new Error(`no draft record for ${id}`);
    // The draft keeps owner text edits in a separate file "applied on top of the record when cards are rendered".
    // Apply them here, so the snapshot holds what the owner actually approved, and say which fields they touched.
    const record = structuredClone(found), ownerEdits = [];
    for (const o of overrides[String(found.cardNumber)] ?? []) {
      if (!o.field.startsWith('back.')) continue;
      const key = o.field.slice(5);
      record.back[key] = 'set' in o ? o.set : record.back[key].map((v) => (v === o.from ? o.to : v));
      ownerEdits.push({ field: o.field, by: o.by });
    }
    const i = inv.find((r) => r.id === id) ?? {};
    return {
      record, ownerEdits, assets: assetsFor(draftRef, id, record.cardNumber),
      inventory: { mainImage: i.main_image_status ?? null, tallPreview: i.tall_preview_status ?? null, pixelIcon: i.pixel_icon_status ?? null,
        sprite: i.sprite_files_status ?? null, assembledCard: i.card_assembled_status ?? null,
        approvalQuote: i.owner_approval_quote || null, spriteApprovalQuote: i.sprite_approval_quote || null },
    };
  });
  return {
    snapshotOf: { draftCommit: git('rev-parse', draftRef).toString().trim(), inventoryCommit: git('rev-parse', inventoryRef).toString().trim(),
      draftFile: 'src/data/expansion-cards.json', draftFileSha256: sha(draftBlob), draftStatus: draft.master.status },
    sourceFiles: files, cards,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
  const snap = buildSnapshot({ ids: arg('--ids', PILOT_IDS.join(',')).split(','), draftRef: arg('--draft-ref', DRAFT_REF), inventoryRef: arg('--inventory-ref', INVENTORY_REF) });
  writeFileSync(arg('--out', SNAPSHOT_PATH), canonicalJson(snap));
  console.log(`wrote ${arg('--out', SNAPSHOT_PATH)}: ${snap.cards.length} cards`);
}
