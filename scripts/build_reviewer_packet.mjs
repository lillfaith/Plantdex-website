// Run with: npx vite-node -c <config aliasing @ to src> scripts/build_reviewer_packet.mjs
// Builds docs/boss-form-reviewer-packet.html from the REAL question bank, so the packet can
// never describe questions the code does not hold. Run: node scripts/build_reviewer_packet.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// The bank as it stood in packet version 1, so every change since is computed, not remembered.
const BASELINE = '6057365';
const oldFile = join(tmpdir(), `old-challenge-bank-${BASELINE}.ts`);
writeFileSync(oldFile, execFileSync('git', ['show', `${BASELINE}:src/lib/challenge-bank.ts`], { encoding: 'utf8' }));
const { CHALLENGE_BANK: OLD_BANK } = await import(oldFile);
const { CHALLENGE_BANK } = await import('../src/lib/challenge-bank.ts');
const { BOSS_IMAGES, REGION_LABELS } = await import('../src/lib/boss-images.ts');
const { CATS_EAR_CLAIMS } = await import('../src/lib/challenge-claims');
const { FIELD_NOTES } = await import('../src/lib/card-field-notes');
const sources = JSON.parse(readFileSync('src/data/sources.json', 'utf8'));
const srcList = sources.sources ?? sources;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// What happened to each concern from packet version 1. Three states:
//   fixed      the wording or the answers were changed after the preliminary review
//   disabled   the question is gated until the named evidence exists
//   open       nobody has resolved it; the reviewer must rule
const CONCERNS = {
  'ps.stalk': ['fixed', 'Prompt and feedback now talk about the seed head the photograph shows.'],
  'ps.wind': ['fixed', 'Now asks for the MAIN way the seeds spread, and every option says "mostly".'],
  'tr.wind': ['fixed', 'Now asks for the MAIN way the seeds spread, and every option says "mostly".'],
  'hb.puff': ['fixed', 'The bud distractor is gone: a puff also grew from a bud. Both wrong answers are now leaf photographs.'],
  'hb.trampled': ['fixed', 'Reworded to "can tolerate compacted soil".'],
  'tr.packed': ['fixed', 'Reworded to "can tolerate compacted soil".'],
  'hb.curb': ['disabled', 'Disabled until better evidence shows the flowers are dandelion. Needs: roadside-species-evidence.'],
  'hb.curb2': ['disabled', 'Disabled until better evidence shows the flowers are dandelion. Needs: roadside-species-evidence.'],
  'tr.curb': ['disabled', 'Disabled until better evidence shows the flowers are dandelion. Needs: roadside-species-evidence.'],
  'cp.single': ['disabled', 'Branching is now offered as a clue, not proof. Still disabled: the photograph needs an independent identification review.'],
  'cp.branch': ['disabled', 'Branching is now offered as a clue, not proof. Still disabled: the photograph needs an independent identification review.'],
  'cp.forks': ['disabled', 'Branching is now offered as a clue, not proof. Still disabled until the cat\u2019s-ear wording is ruled on.'],
  'tr.single': ['disabled', 'Branching is now offered as a clue, not proof. Needs a second cat\u2019s-ear photograph that does not exist.'],
  'tr.branch': ['disabled', 'Branching is now offered as a clue, not proof. Needs a second cat\u2019s-ear photograph that does not exist.'],
  'ps.leaves2': ['open', 'Wrong-answer photographs show a little leaf at the edges. Confirm the correct picture is clearly the only leaf-dominant one.'],
  'ps.rosette': ['open', 'Wrong-answer photographs show a little leaf at the edges. Confirm the correct picture is clearly the only leaf-dominant one.'],
  'tr.sap': ['open', 'The distractor "Pale yellow": confirm no common dandelion latex is described that way.'],
};

const ACT = { 'part-spotter': 'Part Spotter', compare: 'Compare', 'habitat-season': 'Habitat', 'boss-trial': 'Boss Trial' };
const KIND = { 'pick-picture': 'Pick the picture', 'spot-feature': 'Tap the part', showdown: 'Lookalike showdown', 'quick-pick': 'Quick pick' };

const b64 = (f) => readFileSync(`public${f}`).toString('base64');
const used = new Set();
CHALLENGE_BANK.forEach((q) => {
  [q.media, ...(q.kind === 'quick-pick' ? [] : [q.correct, ...q.distractors])].forEach((id) => id && BOSS_IMAGES[id] && used.add(id));
});

const photo = (id, highlight) => {
  const im = BOSS_IMAGES[id];
  const tag = highlight === 'right' ? 'correct' : highlight === 'wrong' ? 'wrong' : 'shown';
  if (!im) return `<figure class="ph missing"><div>no image</div><figcaption>${esc(id)}</figcaption></figure>`;
  if (!im.src) return `<figure class="ph missing ${tag}"><div>Photograph does not exist yet</div><figcaption>${esc(id)}</figcaption></figure>`;
  return `<figure class="ph ${tag}"><img alt="${esc(im.alt)}" src="data:image/webp;base64,${b64(im.src)}"><figcaption><b>${esc(id)}</b> · iNat photo ${im.inatPhotoId} · ${esc(im.licence.toUpperCase())}<br>${esc(im.alt)}</figcaption></figure>`;
};
const regionPhoto = (id, correct) => {
  const im = BOSS_IMAGES[id];
  if (!im?.src) return photo(id);
  const boxes = Object.entries(im.regions ?? {}).flatMap(([r, rects]) => rects.map((x) => `<i class="rg ${r === correct ? 'ok' : ''}" style="left:${x.x}%;top:${x.y}%;width:${x.w}%;height:${x.h}%"><u>${esc(REGION_LABELS[r] ?? r)}</u></i>`)).join('');
  return `<figure class="ph shown"><div class="rw"><img alt="${esc(im.alt)}" src="data:image/webp;base64,${b64(im.src)}">${boxes}</div><figcaption><b>${esc(id)}</b> · iNat photo ${im.inatPhotoId} · CC0<br>${esc(im.alt)}. Green box = the correct region. Grey = wrong regions.</figcaption></figure>`;
};

const FIELDS = [['prompt', 'Question'], ['media', 'Shown picture'], ['correct', 'Correct answer'], ['distractors', 'Wrong answers'], ['feedback', 'Feedback'], ['fact', 'Claim tested'], ['requires', 'Gated until'], ['sources', 'Cited sources']];
const show = (v) => (v === undefined ? '(none)' : Array.isArray(v) ? (v.length ? v.join(', ') : '(none)') : String(v));
const changesFor = (q) => {
  const o = OLD_BANK.find((x) => x.id === q.id);
  if (!o) return [['NEW QUESTION', '', q.prompt]];
  return FIELDS.filter(([k]) => show(o[k]) !== show(q[k])).map(([k, label]) => [label, show(o[k]), show(q[k])]);
};
const card = (q) => {
  const diffs = changesFor(q);
  const disabled = q.requires?.length;
  const body = q.kind === 'quick-pick'
    ? `<ul class="opts"><li class="y">${esc(q.correct)} <em>correct</em></li>${q.distractors.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`
    : q.kind === 'spot-feature'
      ? `<div class="grid one">${regionPhoto(q.media, q.correct)}</div><p class="ans">Correct region: <b>${esc(REGION_LABELS[q.correct] ?? q.correct)}</b>. Wrong regions offered: ${q.distractors.map((d) => esc(REGION_LABELS[d] ?? d)).join(', ')}.</p>`
      : `${q.media ? `<p class="lab">Shown with the question</p><div class="grid one">${photo(q.media)}</div>` : ''}<p class="lab">Options (green = correct)</p><div class="grid">${photo(q.correct, 'right')}${q.distractors.map((d) => photo(d, 'wrong')).join('')}</div>`;
  const [state, text] = CONCERNS[q.id] ?? [];
  const changeBox = diffs.length ? `<div class="chg"><b>Changed since version 1</b><table>${diffs.map(([l, a, b]) => `<tr><th>${esc(l)}</th><td class="old">${esc(a)}</td><td class="new">${esc(b)}</td></tr>`).join('')}</table></div>` : '';
  const srcs = q.sources.map((s) => { const r = srcList.find((x) => x.id === s); return r ? `<a href="${esc(r.url)}">${esc(r.organization)}: ${esc(r.title)}</a>` : esc(s); }).join(' · ');
  return `<article id="${q.id}"><header><code>${q.id}</code>${diffs.length ? '<strong class="tag">CHANGED</strong>' : ''}<span>${ACT[q.activity]} · ${KIND[q.kind]}</span>${disabled ? '<strong class="off">DISABLED until: ' + q.requires.join(', ') + '</strong>' : ''}</header>
<h3>${esc(q.prompt)}</h3>${body}
<dl><dt>Feedback shown after answering</dt><dd>${esc(q.feedback)}</dd><dt>Claim being tested (must appear in the curated notes)</dt><dd>“${esc(q.fact)}”</dd><dt>Cited</dt><dd>${srcs}</dd></dl>
${changeBox}${text ? `<p class="flag ${state}"><b>${state === 'open' ? 'UNRESOLVED' : state === 'disabled' ? 'STAYS DISABLED' : 'ADDRESSED, awaiting your ruling'}:</b> ${esc(text)}</p>` : ''}
<form class="rule"><b>Ruling (not an approval until a named reviewer signs)</b> <label><input type="radio" name="${q.id}"> Approve as written</label> <label><input type="radio" name="${q.id}"> Approve with changes</label> <label><input type="radio" name="${q.id}"> Reject</label><span class="line">Changes / notes: ______________________________</span></form></article>`;
};

const order = ['part-spotter', 'compare', 'habitat-season', 'boss-trial'];
const sections = order.map((a) => `<section><h2>${ACT[a]} <small>${CHALLENGE_BANK.filter((q) => q.activity === a).length} questions</small></h2>${CHALLENGE_BANK.filter((q) => q.activity === a).map(card).join('')}</section>`).join('');
const notes = FIELD_NOTES['taraxacum-officinale'];
const total = CHALLENGE_BANK.length;
const off = CHALLENGE_BANK.filter((q) => q.requires?.length).length;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boss Form Review Packet</title>
<style>
:root{--bg:#f6f4ef;--ink:#1d2417;--mut:#5b6553;--card:#fff;--line:#d9d6cb;--ok:#2f7d3b;--bad:#a8402e;--warn:#fff2d0;--warnl:#d9a928;--acc:#3f2d6b}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#161a14;--ink:#e8ecdf;--mut:#a3ad98;--card:#1f241c;--line:#363d31;--ok:#7fcf8a;--bad:#f0907f;--warn:#3a3217;--warnl:#d9a928;--acc:#c9b6ff;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#161a14;--ink:#e8ecdf;--mut:#a3ad98;--card:#1f241c;--line:#363d31;--ok:#7fcf8a;--bad:#f0907f;--warn:#3a3217;--warnl:#d9a928;--acc:#c9b6ff;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 Georgia,'Times New Roman',serif}
main{max-width:920px;margin:0 auto;padding:24px 16px 80px}h1{font-size:2rem;margin:.2em 0}h2{font-size:1.5rem;margin:2em 0 .6em;border-bottom:2px solid var(--acc);padding-bottom:.2em}h2 small{font-weight:400;color:var(--mut);font-size:.9rem}h3{margin:.4em 0;font-size:1.2rem}
.sans,header,figcaption,dt,.lab,.flag,.rule,.opts,.ans,nav{font-family:system-ui,sans-serif}
.box{background:var(--card);border:1px solid var(--line);padding:14px 18px;margin:14px 0}
.box h4{margin:.2em 0;font-family:system-ui,sans-serif}
article{background:var(--card);border:1px solid var(--line);padding:16px;margin:16px 0}
article>header{display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:.85rem;color:var(--mut)}code{background:var(--bg);padding:1px 6px;border:1px solid var(--line);color:var(--ink)}
.off{color:var(--bad)}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}.grid.one{grid-template-columns:minmax(0,300px)}
.ph{margin:0;border:3px solid var(--line)}.ph.correct{border-color:var(--ok)}.ph.wrong{border-color:var(--line)}.ph img{display:block;width:100%;height:auto}
.ph figcaption{font-size:.72rem;padding:6px;color:var(--mut)}.ph.missing div{padding:34px 8px;text-align:center;background:repeating-linear-gradient(45deg,var(--bg),var(--bg) 8px,var(--line) 8px,var(--line) 9px);font-family:system-ui,sans-serif;font-size:.85rem}
.rw{position:relative}.rg{position:absolute;border:2px solid #888;background:rgba(120,120,120,.15)}.rg.ok{border-color:#2fb04a;background:rgba(47,176,74,.28)}.rg u{position:absolute;left:0;top:0;font:700 10px system-ui;background:#000a;color:#fff;text-decoration:none;padding:0 3px}
.lab{font-size:.78rem;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);margin:10px 0 4px}.opts{list-style:none;padding:0}.opts li{padding:7px 10px;border:1px solid var(--line);margin:5px 0}.opts li.y{border-color:var(--ok)}.opts em{color:var(--ok);font-size:.8rem;margin-left:8px}
dl{margin:12px 0;font-size:.92rem}dt{font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);margin-top:8px}dd{margin:2px 0}
.tag{background:var(--acc);color:var(--bg);padding:1px 8px;font-size:.72rem;letter-spacing:.06em}.chg{font-family:system-ui,sans-serif;font-size:.84rem;border:1px solid var(--acc);padding:8px 10px;margin:10px 0}.chg table{border-collapse:collapse;width:100%;margin-top:4px}.chg th{text-align:left;width:22%;vertical-align:top;color:var(--mut);font-weight:600;padding:3px 6px 3px 0}.chg td{vertical-align:top;padding:3px 6px;width:39%}.old{text-decoration:line-through;color:var(--bad)}.new{color:var(--ok);font-weight:600}.flag.fixed{border-left-color:var(--ok)}.flag.disabled{border-left-color:var(--bad)}.flag{background:var(--warn);border-left:4px solid var(--warnl);padding:8px 12px;font-size:.88rem}.rule{border-top:1px dashed var(--line);margin-top:12px;padding-top:10px;font-size:.88rem;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center}.line{color:var(--mut)}
nav{font-size:.85rem;display:flex;flex-wrap:wrap;gap:6px 14px;margin:10px 0}nav a{color:var(--acc)}a{color:var(--acc)}
@media print{body{font-size:12px}article{break-inside:avoid}.rule input{display:none}}
.st{border-collapse:collapse;width:100%;font-size:.85rem}.st th,.st td{border-bottom:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:top}.st td.done{color:var(--ok)}.st td.gated{color:var(--bad)}.st td.partial{color:var(--warnl)}.b-unsourced{color:var(--bad)}.b-search-summary{color:var(--warnl)}.box small{color:var(--mut)}</style></head><body><main>
<p class="sans" style="margin:0;color:var(--mut)">Plantdex · Boss Form pilot · Dandelion (<i>Taraxacum officinale</i>)</p>
<h1>Botanical Review Packet <small style="font-size:1rem;font-weight:400">version 2</small></h1>
<div class="box" style="border-color:var(--bad)"><h4>Status: PRELIMINARY REVIEW ONLY. Nothing here is approved.</h4>
<p class="sans">This version applies the corrections from a preliminary botanical review. A preliminary review is <b>not</b> a formal sign-off, so no question has a named reviewer or date against it, none can be shown to players, and none can award anything. ${total} drafts; <b>${off} are gated</b> and ${total - off} are not gated but still unreviewed. Everything that changed since version 1 is marked <span class="tag">CHANGED</span> with the old text struck through.</p></div>
<div class="box"><h4>The ten requests, and what was done</h4><table class="sans st"><tr><th>#</th><th>Request</th><th>Result</th></tr>
${[
['1', 'Replace “branched leafy flowering stems”', 'Done in the curated note: “usually branched and largely leafless, with small bracts”. The wording is yours; no source seen says “small bracts” (see claim map).', 'done'],
['2', 'Branching is a clue, not proof', 'Done in the note and in the feedback of all five cat’s-ear questions. Tests forbid “always”, “definitely” and “only” there.', 'done'],
['3', 'Wind questions ask for the primary mechanism', 'Done for ps.wind and tr.wind (“main way”, every option “mostly”), and for the three seed-head feedback lines (“mainly spread by the wind”).', 'done'],
['4', 'Fix the bud distractor in hb.puff', 'Done: both wrong answers are now leaf photographs. d-bud is still used as a wrong answer in hb.bloom2 and tr.puff, where a bud is not what follows a flower; rule if you disagree.', 'done'],
['5', 'Compacted-soil wording', 'Done in the note, hb.trampled and tr.packed: “can tolerate compacted soil”.', 'done'],
['6', 'Align ps.stalk with its seed-head photograph', 'Done: the prompt now says “the stalk holding the seed head”.', 'done'],
['7', 'Roadside questions stay disabled', 'Done and strengthened: hb.curb, hb.curb2 and tr.curb now need “roadside-species-evidence”, which does not exist.', 'gated'],
['8', 'Cat’s-ear photo questions stay disabled', 'Done and strengthened: they now also need “cats-ear-independent-id-review”.', 'gated'],
['9', 'Add WFO and WSU references with a claim map', 'Added three references, all UNVERIFIED, and a claim-by-claim map. The drafting environment cannot reach these sites, so no page was opened; every mapping rests on a search summary or has no source. See “Claim map” below.', 'partial'],
['10', 'Preserve IDs, gates and reward logic', 'All 26 IDs unchanged. Reviews list and ready-assets list still empty. Scoring and awarding code untouched; a test pins it.', 'done'],
].map(([n, r, res, st]) => `<tr><td>${n}</td><td>${r}</td><td class="${st}">${res}</td></tr>`).join('')}</table></div>
<div class="box"><h4>Unresolved, and who must act</h4><ul class="sans">
<li><b>Open the sources.</b> Neither WFO nor either WSU page has been read. Until someone does, no cat’s-ear claim has a confirmed citation, and the registry marks all of them unverified.</li>
<li><b>“Small bracts” has no source.</b> It comes from the preliminary review. Find where a source says it, or soften it.</li>
<li><b>Independent identification review</b> of the cat’s-ear photograph (iNat 69472306), plus a second photograph for tr.single and tr.branch.</li>
<li><b>Roadside photographs.</b> Better evidence that the small yellow flowers are dandelion, or replace the photographs.</li>
<li><b>Still open from version 1:</b> ps.rosette and ps.leaves2 (incidental leaves in wrong-answer photographs), and the “Pale yellow” distractor in tr.sap.</li>
<li><b>Consequence of disabling the roadside questions:</b> Habitat now has only ${CHALLENGE_BANK.filter((q) => q.activity === 'habitat-season' && !q.requires?.length).length} available questions, so it has no spare question for its one retry. The Trial has ${CHALLENGE_BANK.filter((q) => q.activity === 'boss-trial' && !q.requires?.length).length} available of the ten it needs. More dandelion questions, or better roadside photographs, are needed before the pilot can be built.</li>
</ul></div>
<div class="box"><h4>What we are asking you to do</h4><ol class="sans"><li>For each question, check that the <b>claim is true</b>, that the <b>cited source supports it</b>, and that <b>each photograph really shows what its caption says</b>.</li><li>Mark Approve, Approve with changes, or Reject, and write the corrected wording if any.</li><li>Rule on the open items at the end.</li></ol>
<p class="sans"><b>What this is not:</b> a safety test. No question concerns eating, preparing or using the plant. Nothing here claims a health effect. The only subject is telling parts and lookalikes apart.</p></div>
<div class="box"><h4>The curated notes the questions are drawn from (as now worded)</h4><ul class="sans">${notes.identification.map((i) => `<li><b>${esc(i.trait)}.</b> ${esc(i.detail)}</li>`).join('')}<li><b>Habitat.</b> ${esc(notes.habitat)}</li><li><b>Lookalike note <span class="tag">CHANGED</span>.</b> ${esc(notes.lookalikes[0].commonName)}: ${esc(notes.lookalikes[0].distinguishBy)}</li></ul>
<p class="sans">The version 1 sentence read: “Dandelion flower stalks are single, unbranched and hollow, rising straight from the basal rosette rather than from branched leafy flowering stems.” No question uses “hollow” as a difference.</p></div>
<div class="box"><h4>Sources, all unverified</h4><ul class="sans">${['wisc-dandelion', 'umn-dandelions', 'wfo-hypochaeris-radicata', 'wsu-hortsense-catsear', 'wsu-hosted-usfs-treatment-guide'].map((id) => { const r = srcList.find((x) => x.id === id); return `<li>${id.startsWith('w') && !['wisc-dandelion'].includes(id) ? '<span class="tag">NEW</span> ' : ''}<a href="${esc(r.url)}">${esc(r.organization)}: ${esc(r.title)}</a> · verified: ${r.verified}${r.note ? `<br><small>${esc(r.note)}</small>` : ''}</li>`; }).join('')}</ul></div>
<div class="box" id="claims"><h4>Claim map: cat’s-ear claims and their sources</h4><p class="sans">“Basis” says what the drafter actually saw. <b>search-summary</b> means only a search engine’s summary of the page; <b>unsourced</b> means no source seen; <b>editorial</b> is Plantdex’s own caution. Nothing is “read”.</p>
<table class="sans st"><tr><th>Claim</th><th>Source(s)</th><th>Basis</th><th>What was seen</th><th>Used by</th></tr>${CATS_EAR_CLAIMS.map((c) => `<tr><td>${esc(c.claim)}</td><td>${c.sourceIds.length ? c.sourceIds.map((id) => { const r = srcList.find((x) => x.id === id); return `<a href="${esc(r.url)}">${esc(r.organization)}</a>`; }).join('<br>') : 'none'}</td><td class="b-${c.basis}"><b>${esc(c.basis)}</b></td><td>${esc(c.note)}</td><td>${esc(c.usedBy.join(', ') || 'not used yet')}</td></tr>`).join('')}</table></div>
<nav>${order.map((a) => `<a href="#${CHALLENGE_BANK.find((q) => q.activity === a).id}">${ACT[a]}</a>`).join('')}<a href="#open">Open items</a></nav>
${sections}
<section id="open"><h2>Open items</h2>
<div class="box sans"><h4>1. Cat’s-ear photograph: independent identification review</h4><p>iNaturalist photo 69472306 (<i>Hypochaeris radicata</i>, CC0, Lilesville NC, 2020-04-26): ${photo('c-branched').replace('<figure', '<figure style="max-width:300px"')}A Y-shaped fork with a bud on the short branch. Needed: someone other than the drafter confirms the plant is <i>Hypochaeris radicata</i> and that the photograph shows the branching it is meant to show. Gate: <code>cats-ear-independent-id-review</code>, <code>cats-ear-branch-photo</code>.<br><br>☐ Approve   ☐ Reject, use a different photo</p></div>
<div class="box sans"><h4>2. Cat’s-ear wording</h4><p>Version 2 wording: “Cat’s-ear stems are usually branched and largely leafless, with small bracts. Branching is a useful clue, not proof of which species it is.” Please rule, and say where a source supports “small bracts”. Gate: <code>cats-ear-wording-reviewed</code>.</p></div>
<div class="box sans"><h4>3. Roadside species evidence</h4><p>hb.curb, hb.curb2 and tr.curb use two photographs of small yellow flowers by a pavement. Please say whether they are dandelion, or give better evidence. Gate: <code>roadside-species-evidence</code>.</p></div>
<div class="box sans"><h4>4. Source verification</h4><p>Open the five sources and tell us, claim by claim, what each page really says (see the claim map). Only then should anything be marked verified.</p></div>
<div class="box sans"><h4>5. Formal review</h4><p>This packet records a preliminary review only. A formal approval needs a reviewer’s name and a date against each question id.</p><p>Name and credentials: ______________________   Date: ______________</p></div></section>
</main></body></html>`;
writeFileSync('docs/boss-form-reviewer-packet.html', html);
console.log('questions', total, 'disabled', off, 'images', used.size, 'bytes', html.length);
