#!/usr/bin/env node
/**
 * Import validator for expansion-card draft records (cards #57-141). Pure, dependency-free, deterministic.
 *
 * Two separate questions, never merged:
 *   validateRecord()  - is this record WELL-FORMED and collision-free?  -> errors (the record is rejected)
 *   publicationGate() - may it be SHOWN?                                -> status READY | HELD + reasons
 * A gate has exactly one way to pass: positive evidence in scripts/expansion/data/pilot-reviews.json (or the
 * record itself). Absence, a pending status, a generic line or a search link is never evidence. Nothing here
 * lowers a gate to make a record pass; a record with no review simply stays HELD.
 *
 *   node scripts/expansion/validate_record.mjs            # validate + gate the committed snapshot
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SNAPSHOT = 'scripts/expansion/data/pilot-source.json';
export const REVIEWS = 'scripts/expansion/data/pilot-reviews.json';
export const NUMBER_RANGE = [57, 141];
export const STAT_RANGE = [1, 5];
export const NON_AI_ORIGINS = ['photograph', 'hand_drawn', 'licensed_illustration'];
const HEX64 = /^[0-9a-f]{64}$/;
const BACK_FIELDS = ['healingTraits', 'compounds', 'taste', 'aromatic', 'preparations', 'usableParts'];
const GENERIC_CAUTION = [/^identify positively/i, /family allergy possible/i, /^use caution\.?$/i, /^consult a (doctor|professional)/i];

/** Stable key order, 2-space indent, trailing newline, ASCII-safe: the same bytes on every machine. */
export function canonicalJson(value) {
  const sort = (v) => Array.isArray(v) ? v.map(sort)
    : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])])) : v;
  return `${JSON.stringify(sort(value), null, 2).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)}\n`;
}

const read = (p) => readFileSync(join(ROOT, p), 'utf8');
export const slugify = (sci) => sci.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const binomial = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

/** The deck's own tables and everything integration already holds, read from source, never restated. */
export function loadIntegration(root = ROOT) {
  const rd = (p) => readFileSync(join(root, p), 'utf8');
  const deck = JSON.parse(rd('src/data/herbs.json'));
  const py = rd('scripts/build_deck.py');
  const xpTable = Object.fromEntries([...py.match(/XP_BY_RARITY = \{([^}]*)\}/)[1].matchAll(/"(\w+)":\s*(\d+)/g)].map((m) => [m[1], +m[2]]));
  const fc = rd('src/lib/field-cards.ts');
  const fieldCards = [...fc.matchAll(/id: '([^']+)',\s*cardNumber: (\d+),[\s\S]*?scientificName: '([^']+)'/g)].map((m) => ({ id: m[1], cardNumber: +m[2], scientificName: m[3] }));
  const all = [...deck.herbs.map((h) => ({ id: h.id, cardNumber: h.cardNumber, scientificName: h.scientificName })), ...fieldCards];
  return {
    seasons: Object.keys(deck.seasonLabels), uses: Object.keys(deck.useLabels), xpTable, rarities: Object.keys(xpTable),
    ids: new Set(all.map((c) => c.id)), names: new Map(all.map((c) => [binomial(c.scientificName), c.id])),
    numbers: new Set([...all.map((c) => c.cardNumber), ...deck.nonHerbCards.map((c) => c.cardNumber)]),
    sppGenera: new Set(all.filter((c) => /\bspp\.$/.test(c.scientificName)).map((c) => c.scientificName.split(' ')[0].toLowerCase())),
  };
}

export const isSearchUrl = (u) => /[?&](term|q|query|search|s)=|\/search\b|scholar\.google\.|\/\?term=|\/state-search|powo\.science\.kew\.org\/?$/i.test(u);
/** A citation is a specific document, not a query. Deliberately strict: when unsure, it is not one. */
export function isRealCitation(link) {
  if (!link || link.isCitation !== true) return false;
  let u; try { u = new URL(link.url); } catch { return false; }
  if (u.protocol !== 'https:' || isSearchUrl(link.url) || /not a citation/i.test(link.type ?? '')) return false;
  return /pubmed\.ncbi\.nlm\.nih\.gov\/\d+\/?$/.test(link.url) || /pmc\.ncbi\.nlm\.nih\.gov\/articles\/PMC\d+/.test(link.url)
    || /^https:\/\/doi\.org\/10\./.test(link.url) || (u.pathname.length > 1 && !/^\/(plants|taxon)\/?$/.test(u.pathname) && /\.(pdf)$|\/pubs?\//i.test(u.pathname));
}

export function identityLevel(sci) {
  if (/\bspp?\.$/.test(sci)) return 'genus';
  if (/[×]|\sx\s/.test(sci)) return 'hybrid';
  if (/\b(subsp|var|f)\./.test(sci)) return 'infraspecific';
  return /^[A-Z][a-z]+ [a-z]+(-[a-z]+)?$/.test(sci) ? 'species' : 'unknown';
}

const err = (code, message, field) => ({ code, message, ...(field ? { field } : {}) });

/** Structural validation of one card entry from the snapshot. `siblings` = the other entries in the same batch. */
export function validateRecord(entry, integ, siblings = [], source = null) {
  const r = entry.record, f = r?.front ?? {}, errors = [];
  for (const k of ['id', 'cardNumber', 'commonName', 'scientificName']) if (r?.[k] == null || r[k] === '') errors.push(err('missing_field', `${k} is required`, k));
  for (const k of ['rarity', 'xp', 'season', 'uses', 'stats']) if (f[k] == null) errors.push(err('missing_field', `front.${k} is required`, `front.${k}`));
  for (const k of BACK_FIELDS) if (!Array.isArray(r?.back?.[k]) || !r.back[k].length || r.back[k].some((s) => typeof s !== 'string' || !s)) errors.push(err('missing_field', `back.${k} must be a non-empty list of strings`, `back.${k}`));
  if (errors.length) return errors;
  if (r.id !== slugify(r.scientificName)) errors.push(err('id_not_from_scientific_name', `id ${r.id} must be ${slugify(r.scientificName)}`, 'id'));
  if (integ.ids.has(r.id)) errors.push(err('id_collision', `${r.id} already exists in integration`, 'id'));
  if (siblings.some((s) => s !== entry && s.record.id === r.id)) errors.push(err('id_collision', `${r.id} is duplicated within the batch`, 'id'));
  if (!Number.isInteger(r.cardNumber) || r.cardNumber < NUMBER_RANGE[0] || r.cardNumber > NUMBER_RANGE[1]) errors.push(err('number_out_of_range', `cardNumber ${r.cardNumber} outside ${NUMBER_RANGE.join('-')}`, 'cardNumber'));
  if (integ.numbers.has(r.cardNumber)) errors.push(err('number_collision', `#${r.cardNumber} already exists in integration`, 'cardNumber'));
  if (siblings.some((s) => s !== entry && s.record.cardNumber === r.cardNumber)) errors.push(err('number_collision', `#${r.cardNumber} is duplicated within the batch`, 'cardNumber'));
  const level = identityLevel(r.scientificName);
  if (level !== 'species') errors.push(err('identity_not_species', `${r.scientificName} reads as ${level}; the pilot imports species-level cards only`, 'scientificName'));
  if (integ.names.has(binomial(r.scientificName))) errors.push(err('name_collision', `${r.scientificName} is already card ${integ.names.get(binomial(r.scientificName))}`, 'scientificName'));
  if (integ.sppGenera.has(r.scientificName.split(' ')[0].toLowerCase())) errors.push(err('claimed_by_genus_card', `genus ${r.scientificName.split(' ')[0]} is held by a spp. card`, 'scientificName'));
  if (!integ.rarities.includes(f.rarity)) errors.push(err('bad_rarity', `rarity ${f.rarity}`, 'front.rarity'));
  else if (f.xp !== integ.xpTable[f.rarity]) errors.push(err('bad_xp', `xp ${f.xp} but ${f.rarity} is ${integ.xpTable[f.rarity]}`, 'front.xp'));
  if (!integ.seasons.includes(f.season)) errors.push(err('bad_season', `season ${f.season}`, 'front.season'));
  if (!Array.isArray(f.uses) || !f.uses.length || f.uses.some((u) => !integ.uses.includes(u))) errors.push(err('bad_uses', `uses ${JSON.stringify(f.uses)}`, 'front.uses'));
  for (const k of ['water', 'sun', 'temperature']) { const v = f.stats?.[k]; if (!Number.isInteger(v) || v < STAT_RANGE[0] || v > STAT_RANGE[1]) errors.push(err('bad_stat', `stats.${k} = ${v}`, `front.stats.${k}`)); }
  const sup = r.supplied?.stats;
  if (sup && (sup.sun !== f.stats?.sun || sup.water !== f.stats?.water || sup.heat !== f.stats?.temperature)) errors.push(err('stats_disagree_with_supplied', 'front.stats differs from the supplied sheet', 'front.stats'));
  if (r.supplied?.peakSeason && r.supplied.peakSeason.toLowerCase() !== f.season) errors.push(err('season_disagrees_with_supplied', 'front.season differs from the supplied sheet', 'front.season'));
  // hashes: a recorded hash must be well-formed and equal to the hash of the blob actually at the source ref.
  const hashes = [...(source ?? []).map((s) => ['source ' + s.file, s]), ...Object.entries(entry.assets ?? {}).map(([role, a]) => [`${role} asset`, a])];
  for (const [label, h] of hashes) {
    if (!HEX64.test(h.recordedSha256 ?? '')) errors.push(err('missing_hash', `${label}: no recorded sha256`, label));
    else if (!HEX64.test(h.actualSha256 ?? '')) errors.push(err('hash_unverifiable', `${label}: the file was not found at the source ref`, label));
    else if (h.recordedSha256 !== h.actualSha256) errors.push(err('hash_mismatch', `${label}: recorded ${h.recordedSha256.slice(0, 12)} but file is ${h.actualSha256.slice(0, 12)}`, label));
  }
  for (const role of ['main', 'pixel']) if (!entry.assets?.[role]) errors.push(err('missing_hash', `no ${role} asset provenance recorded`, `${role} asset`));
  return errors;
}

const present = (v) => typeof v === 'string' && v.trim().length > 0;
const hold = (reasons, code, detail) => reasons.push(detail ? { code, detail } : { code });

/** The publication gate. READY only when EVERY gate passes; reasons are machine-readable and sorted. */
export function publicationGate(entry, review = {}) {
  const r = entry.record, reasons = [];
  const caution = review.caution, links = r.researchLinks?.links ?? [];
  // 1. sourced caution reviewed: a named reviewer, a date, species-specific text, and at least one real citation.
  if (!caution) hold(reasons, 'caution_unreviewed', r.review?.cardSafetyWarningStatus);
  else {
    if (!present(caution.reviewedBy) || !present(caution.reviewedAt)) hold(reasons, 'caution_review_unsigned');
    if (!present(caution.text)) hold(reasons, 'caution_text_missing');
    else if (GENERIC_CAUTION.some((re) => re.test(caution.text.trim()))) hold(reasons, 'caution_generic');
    if (!(caution.sources ?? []).some((s) => isRealCitation({ url: s, isCitation: true }))) hold(reasons, 'caution_unsourced');
  }
  // 2. image provenance: recorded as non-AI, or AI-derived and explicitly reviewed. Unrecorded is not non-AI.
  const img = review.image, main = entry.assets?.main;
  if (!main) hold(reasons, 'image_provenance_missing');
  else if (!NON_AI_ORIGINS.includes(main.origin) && !(img && present(img.reviewedBy) && present(img.reviewedAt) && img.botanicallyReviewed === true)) {
    hold(reasons, main.origin ? 'image_ai_derivative_unreviewed' : 'image_origin_unrecorded', main.origin ?? undefined);
    if (!main.origin && /generated|ai[_ -]/i.test(`${main.note ?? ''} ${main.path ?? ''}`)) hold(reasons, 'image_ai_derivative_unreviewed', 'named as generated in its own provenance');
  }
  // 3. taxon identity verified against an authority, and the accepted name equals the record's name.
  const tx = review.taxon;
  if (!tx) hold(reasons, 'taxon_identity_unverified');
  else if (!present(tx.authority) || !present(tx.checkedAt) || !present(tx.url) || tx.rank !== 'species') hold(reasons, 'taxon_review_incomplete');
  else if (binomial(tx.acceptedName) !== binomial(r.scientificName)) hold(reasons, 'taxon_name_mismatch', `${tx.acceptedName} vs ${r.scientificName}`);
  // 4. citations: at least one real document. Search links never count, whatever they are labelled.
  if (!links.some(isRealCitation)) hold(reasons, links.some((l) => l.isCitation !== true || isSearchUrl(l.url)) ? 'citations_only_search_links' : 'citations_missing');
  // 5. approved assets: owner approval recorded for the main image and the pixel icon.
  for (const [role, key] of [['main', 'mainImage'], ['pixel', 'pixelIcon']]) if (entry.inventory?.[key] !== 'APPROVED') hold(reasons, 'asset_not_approved', role);
  reasons.sort((a, b) => (a.code + (a.detail ?? '')).localeCompare(b.code + (b.detail ?? '')));
  return { status: reasons.length ? 'HELD' : 'READY', reasons };
}

export function validateBatch(snapshot, reviews = {}, integ = loadIntegration()) {
  return snapshot.cards.map((entry) => {
    const errors = validateRecord(entry, integ, snapshot.cards, snapshot.sourceFiles);
    return { id: entry.record.id, cardNumber: entry.record.cardNumber, errors, gate: publicationGate(entry, reviews[entry.record.id]) };
  });
}

export const loadSnapshot = () => JSON.parse(read(SNAPSHOT));
export function loadReviews() { try { return JSON.parse(read(REVIEWS)); } catch { return {}; } }

if (import.meta.url === `file://${process.argv[1]}`) {
  let bad = 0;
  for (const c of validateBatch(loadSnapshot(), loadReviews())) {
    console.log(`#${c.cardNumber} ${c.id}: ${c.errors.length ? 'INVALID' : 'valid'}, ${c.gate.status}`);
    for (const e of c.errors) console.log(`    error  ${e.code}: ${e.message}`);
    for (const g of c.gate.reasons) console.log(`    held   ${g.code}${g.detail ? ` (${g.detail})` : ''}`);
    bad += c.errors.length;
  }
  process.exit(bad ? 1 : 0);
}
