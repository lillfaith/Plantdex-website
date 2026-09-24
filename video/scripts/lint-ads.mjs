#!/usr/bin/env node
/**
 * Pre-render checks on every ad spec in ads/. Enforces the machine-checkable half of
 * CREATIVE_RULES.md; fails (exit 1) on any violation.
 *
 *   - every plant / screen / UI part / image resolves to the manifest (i.e. the ZIPs)
 *   - `quote` text appears verbatim in the website's own src/ (the app's real copy)
 *   - `card` text uses only known card tokens
 *   - no banned claims in ANY on-screen text (medical, edibility, commerce, scarcity)
 *   - hero plants print no warning, carry no known card issue, and are in the printed deck
 *   - an identification demo carries a safety line
 *   - sprite scales are whole numbers; scenes add up to the declared length
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADS } from './ad-ids.mjs';

const VIDEO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = resolve(VIDEO, '..');
const manifest = JSON.parse(readFileSync(join(VIDEO, 'manifest/assets.json'), 'utf8'));

// ── The website's own copy, flattened so JSX line breaks and tags don't hide a match ──
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}
const normalise = (s) =>
  s
    .replace(/\{'\s*'\}/g, ' ')
    // Inline tags (<strong>) sit inside sentences; dropping them rather than spacing them
    // keeps "sprout</strong>." reading as "sprout." and not "sprout .".
    .replace(/<[^>]*>/g, '')
    .replace(/&mdash;/g, '—')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
const corpus = walk(join(REPO, 'src')).map((f) => normalise(readFileSync(f, 'utf8'))).join('\n');

// Claims an ad may never make (CREATIVE_RULES §4, §5). Word-boundary, case-insensitive.
const BANNED = [
  [/\b(heal|heals|healing|cure[sd]?|treat(s|ment)?|remed(y|ies)|medicin(e|al)|detox|immun\w*|therap\w*)\b/i, 'medical claim'],
  [/\b(safe to (eat|consume|use)|edible|eat (it|this|them)|forag\w*)\b/i, 'edibility/safety claim'],
  [/\b(on sale now|buy now|order now|in stock|sold out|limited|only \d+ left|hurry|last chance|ends (today|soon))\b/i, 'commerce/scarcity claim'],
  [/(\$\s?\d|\d+\s?% off|\bfree shipping\b|\bships? in\b|\bdelivery in\b)/i, 'price/shipping claim'],
  [/\b(definitely|guaranteed|100% accurate|always right)\b/i, 'certainty claim'],
  [/\b(\d[\d,]*\+? (users|players|downloads|reviews)|rated \d|★)\b/i, 'fabricated social proof'],
  // Comparative hooks name a genre, never a brand: a third-party trademark on screen reads as an
  // affiliation claim and gets ads rejected. "Plantdex" is ours; these are not.
  [/(pok[eé]mon|pok[eé]dex|nintendo|game ?freak|pikachu|tamagotchi|animal crossing)/i, 'third-party trademark'],
];
const TOKENS = new Set(['commonName', 'scientificName', 'cardNumber', 'rarity']);

// The plant's own knowledge, for checking every value a `knowledge` tag shows.
const deck = JSON.parse(readFileSync(join(REPO, 'src/data/herbs.json'), 'utf8'));
const fieldNotesSrc = readFileSync(join(REPO, 'src/lib/card-field-notes.ts'), 'utf8');
function plantKnowledge(id, field) {
  if (field === 'identification') {
    const start = fieldNotesSrc.indexOf(`'${id}': {`);
    if (start < 0) return null;
    const end = fieldNotesSrc.indexOf('sourceIds', start);
    return [...fieldNotesSrc.slice(start, end).matchAll(/trait: '([^']+)'/g)].map((m) => m[1]);
  }
  return deck.herbs.find((h) => h.id === id)?.back?.[field] ?? null;
}

const errors = [];
const fail = (ad, msg) => errors.push(`${ad}: ${msg}`);

function checkLine(ad, where, raw) {
  if (!raw) return;
  // `*emphasis*` is presentation; every check reads the words without it.
  const line = { ...raw, text: typeof raw.text === 'string' ? raw.text.replace(/\*/g, '') : raw.text };
  if (typeof line.text !== 'string' || !['quote', 'card', 'authored'].includes(line.source)) {
    fail(ad, `${where}: text needs {text, source: quote|card|authored}`);
    return;
  }
  for (const [re, what] of BANNED) if (re.test(line.text)) fail(ad, `${where}: ${what} in "${line.text}"`);
  if (line.source === 'quote' && !corpus.includes(normalise(line.text)))
    fail(ad, `${where}: "${line.text}" is marked quote but is not in the website's src/`);
  if (line.source === 'card')
    for (const [, k] of line.text.matchAll(/\{(\w+)\}/g)) if (!TOKENS.has(k)) fail(ad, `${where}: unknown card token {${k}}`);
  if (line.source !== 'card' && /\{\w+\}/.test(line.text)) fail(ad, `${where}: tokens only work in source "card"`);
}

function checkPlant(ad, where, id, { hero = false, stage } = {}) {
  const p = manifest.plants[id];
  if (!p) return fail(ad, `${where}: unknown plant ${id}`);
  if (stage && !p.sprites[stage]) fail(ad, `${where}: ${id} has no ${stage} sprite`);
  if (hero) {
    if (!p.printed) fail(ad, `${where}: ${id} is a digital-only Field Card; heroes must be printed deck cards`);
    if (p.printedWarning) fail(ad, `${where}: ${id} prints a warning; not a hero card`);
    if (p.knownCardIssue) fail(ad, `${where}: ${id} has a known card issue; not a hero card`);
    if (!p.cards.front) fail(ad, `${where}: ${id} has no card front`);
  }
}

const inPack = (ad, where, path) => {
  if (!manifest.files[path]) fail(ad, `${where}: ${path} is not in the asset pack`);
};

for (const { file, spec } of ADS) {
  const ad = file;
  if (spec.width !== 1080 || spec.height !== 1920) fail(ad, 'must be 1080x1920');
  if (spec.fps !== 30) fail(ad, 'must be 30fps');
  const total = spec.scenes.reduce((n, s) => n + s.duration, 0) - spec.transitionFrames * (spec.scenes.length - 1);
  if (total !== spec.durationInFrames) fail(ad, `scenes add up to ${total} frames, spec declares ${spec.durationInFrames}`);

  spec.scenes.forEach((s, i) => {
    const w = `scene ${i + 1} (${s.type})`;
    if (s.duration <= spec.transitionFrames) fail(ad, `${w}: shorter than a transition`);
    switch (s.type) {
      case 'hook':
        checkPlant(ad, w, s.plant, { hero: true, stage: s.stage });
        if (!Number.isInteger(s.spriteScale) || s.spriteScale < 1) fail(ad, `${w}: spriteScale must be a whole number`);
        s.lines.forEach((l, j) => checkLine(ad, `${w} line ${j + 1}`, l));
        if (s.teaser) {
          checkLine(ad, `${w} teaser`, s.teaser.line);
          // Words pop 2.5 frames apart; the whole sentence needs >= 1s on screen after that.
          const words = s.teaser.line.text.replace(/\*/g, '').split(/\s+/).length;
          if (s.teaser.duration - words * 2.5 < spec.fps) fail(ad, `${w}: teaser is on screen < 1s once fully shown`);
          if (s.teaser.duration >= s.duration) fail(ad, `${w}: teaser is longer than the scene`);
        }
        break;
      case 'cardReveal':
        checkPlant(ad, w, s.plant, { hero: true });
        checkLine(ad, `${w} kicker`, s.kicker);
        checkLine(ad, `${w} caption`, s.caption);
        break;
      case 'photo':
        inPack(ad, w, s.image);
        checkLine(ad, `${w} kicker`, s.kicker);
        checkLine(ad, `${w} caption`, s.caption);
        break;
      case 'footage': {
        const clip = manifest.footage?.[s.clip];
        if (!clip) fail(ad, `${w}: unknown footage clip ${s.clip}`);
        else {
          const needed = (s.startAt ?? 0) + (s.duration / spec.fps) * (s.playbackRate ?? 1);
          if (needed > clip.duration + 0.05) fail(ad, `${w}: needs ${needed.toFixed(2)}s of a ${clip.duration.toFixed(2)}s clip`);
        }
        checkLine(ad, `${w} kicker`, s.kicker);
        checkLine(ad, `${w} caption`, s.caption);
        break;
      }
      case 'knowledge': {
        checkPlant(ad, w, s.plant, { hero: true });
        checkLine(ad, `${w} headline`, s.headline);
        if (!s.tags.length || s.tags.length > 4) fail(ad, `${w}: needs 1–4 tags`);
        checkLine(ad, `${w} safety`, s.safety);
        s.tags.forEach((t, j) => {
          checkLine(ad, `${w} tag ${j + 1} label`, t.label);
          const known = plantKnowledge(s.plant, t.field);
          if (!known) fail(ad, `${w} tag ${j + 1}: ${s.plant} has no ${t.field} data`);
          for (const item of t.items) {
            checkLine(ad, `${w} tag ${j + 1} value`, { text: item, source: 'card' });
            if (known && !known.includes(item)) fail(ad, `${w} tag ${j + 1}: "${item}" is not in ${s.plant}'s ${t.field} (${known.join(', ')})`);
          }
          // EDIBILITY is only honest when the value is what the card itself prints about eating
          // it: the Edible use icon, or an eaten preparation/part from its back. The values are
          // already checked against the card above; here the tag must also carry the
          // identify-first line, because an edibility beat without one reads as a safety claim.
          if (/edib/i.test(t.label.text)) {
            const card = deck.herbs.find((h) => h.id === s.plant);
            const printed = card?.uses?.includes('edible') || ['preparations', 'usableParts'].includes(t.field);
            if (!printed) fail(ad, `${w} tag ${j + 1}: edibility must come from the Edible icon or the card's printed preparations/usable parts`);
            if (s.plant === 'sambucus-spp') fail(ad, `${w} tag ${j + 1}: Elderberry carries a hazard caution; no edibility beat`);
            if (!s.safety || !/identif/i.test(s.safety.text)) fail(ad, `${w} tag ${j + 1}: an edibility tag needs an identify-first safety line in the scene`);
          }
        });
        break;
      }
      case 'screenDemo': {
        const sum = s.shots.reduce((n, x) => n + x.duration, 0);
        if (sum !== s.duration) fail(ad, `${w}: shots add up to ${sum}, scene is ${s.duration}`);
        s.shots.forEach((shot, j) => {
          if (!manifest.screens[shot.screen]?.[shot.framing]) fail(ad, `${w} shot ${j + 1}: no ${shot.framing} screenshot "${shot.screen}"`);
          checkLine(ad, `${w} shot ${j + 1}`, shot.caption);
          if (shot.payoff) {
            checkLine(ad, `${w} shot ${j + 1} payoff`, shot.payoff.line);
            if (shot.payoff.plant) checkPlant(ad, `${w} shot ${j + 1} payoff`, shot.payoff.plant);
            if (shot.payoff.at >= shot.duration - 15) fail(ad, `${w} shot ${j + 1}: payoff lands with < 0.5s left to read`);
          }
        });
        if (s.shots.some((x) => x.screen === 'scan' || x.screen === 'start') && !s.safety)
          fail(ad, `${w}: shows identification, so it needs a safety line`);
        // The safety line shows with the first shot (the scan screen), so THAT shot is what must last.
        if (s.safety && s.shots[0].duration < 45) fail(ad, `${w}: safety line must be on screen ≥ 1.5s (first shot)`);
        checkLine(ad, `${w} safety`, s.safety);
        break;
      }
      case 'uiCallout':
        if (!manifest.uiParts[s.part]) fail(ad, `${w}: unknown UI part ${s.part}`);
        checkLine(ad, `${w} kicker`, s.kicker);
        checkLine(ad, `${w} caption`, s.caption);
        if (s.growth) {
          s.growth.stages.forEach((g, j) => {
            checkPlant(ad, `${w} growth ${j + 1}`, s.growth.plant, { stage: g.stage });
            checkLine(ad, `${w} growth ${j + 1}`, g.label);
          });
        }
        break;
      case 'cta':
        if (s.photo) inPack(ad, w, s.photo);
        checkLine(ad, `${w} headline`, s.headline);
        s.lines.forEach((l, j) => checkLine(ad, `${w} line ${j + 1}`, l));
        s.sprites.forEach((sp, j) => checkPlant(ad, `${w} sprite ${j + 1}`, sp.plant, { stage: sp.stage }));
        checkLine(ad, `${w} button`, s.button);
        checkLine(ad, `${w} safety`, s.safety);
        break;
      default:
        fail(ad, `${w}: unknown scene type`);
    }
  });
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${ADS.length} ad spec(s) pass the creative rules`);
