// Run with: npx vite-node -c <config aliasing @ to src> scripts/build_reviewer_packet.mjs
// Builds docs/boss-form-reviewer-packet.html from the REAL question bank, so the packet can
// never describe questions the code does not hold. Run: node scripts/build_reviewer_packet.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const { CHALLENGE_BANK } = await import('../src/lib/challenge-bank.ts');
const { BOSS_IMAGES, REGION_LABELS } = await import('../src/lib/boss-images.ts');
const { FIELD_NOTES } = await import('../src/lib/card-field-notes');
const sources = JSON.parse(readFileSync('src/data/sources.json', 'utf8'));
const srcList = sources.sources ?? sources;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Concerns the drafter found on a re-read. A reviewer rules on each; none is a decision.
const CONCERNS = {
  'ps.stalk': 'The photo shows a SEED head on its stalk, but the feedback says the stalk carries "one flower".',
  'ps.leaves2': 'Distractor photos show a little leaf at the edges. Confirm the correct picture is clearly the only leaf-dominant one.',
  'ps.rosette': 'Distractor photos show a little leaf at the edges. Confirm the correct picture is clearly the only leaf-dominant one.',
  'ps.wind': 'The options imply wind is the only way. The source says "wind-dispersed" only. Is "Floating on water" / "Stuck to fur" safe as wrong answers?',
  'hb.puff': 'A puff also used to be a BUD. The distractor "bud" may be defensible, so the answer could be arguable.',
  'hb.curb': 'Small yellow flowers at distance. Please confirm the photo shows dandelion and not another yellow daisy-family plant, and that the tap box covers the flowers.',
  'hb.curb2': 'Same as hb.curb: confirm the species in the photo and the tap box.',
  'tr.curb': 'Same as hb.curb: confirm the species in the photo and the tap box.',
  'hb.trampled': '"Packed soil is fine" is looser than the source ("especially tolerant of compacted soils"). Approve or reword.',
  'tr.packed': '"Yes, they cope" is looser than the source ("especially tolerant of compacted soils"). Approve or reword.',
  'tr.sap': 'The distractor "Pale yellow": confirm no common dandelion latex is described that way.',
  'cp.single': 'The cat’s-ear claim has no cited source. Both sources cover dandelion only.',
  'cp.branch': 'The cat’s-ear claim ("usually branches") has no cited source. Wording must stay "usually", never "always".',
  'cp.forks': 'Hedged answer "Probably not". Confirm a forked stem really is a reliable pointer away from dandelion.',
  'tr.single': 'Needs a second cat’s-ear photograph that does not exist yet. Disabled.',
  'tr.branch': 'Needs a second cat’s-ear photograph that does not exist yet. Disabled.',
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

const card = (q) => {
  const disabled = q.requires?.length;
  const body = q.kind === 'quick-pick'
    ? `<ul class="opts"><li class="y">${esc(q.correct)} <em>correct</em></li>${q.distractors.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`
    : q.kind === 'spot-feature'
      ? `<div class="grid one">${regionPhoto(q.media, q.correct)}</div><p class="ans">Correct region: <b>${esc(REGION_LABELS[q.correct] ?? q.correct)}</b>. Wrong regions offered: ${q.distractors.map((d) => esc(REGION_LABELS[d] ?? d)).join(', ')}.</p>`
      : `${q.media ? `<p class="lab">Shown with the question</p><div class="grid one">${photo(q.media)}</div>` : ''}<p class="lab">Options (green = correct)</p><div class="grid">${photo(q.correct, 'right')}${q.distractors.map((d) => photo(d, 'wrong')).join('')}</div>`;
  const concern = CONCERNS[q.id];
  const srcs = q.sources.map((s) => { const r = srcList.find((x) => x.id === s); return r ? `<a href="${esc(r.url)}">${esc(r.organization)}: ${esc(r.title)}</a>` : esc(s); }).join(' · ');
  return `<article id="${q.id}"><header><code>${q.id}</code><span>${ACT[q.activity]} · ${KIND[q.kind]}</span>${disabled ? '<strong class="off">DISABLED until: ' + q.requires.join(', ') + '</strong>' : ''}</header>
<h3>${esc(q.prompt)}</h3>${body}
<dl><dt>Feedback shown after answering</dt><dd>${esc(q.feedback)}</dd><dt>Claim being tested (must appear in the curated notes)</dt><dd>“${esc(q.fact)}”</dd><dt>Cited</dt><dd>${srcs}</dd></dl>
${concern ? `<p class="flag"><b>Drafter’s concern:</b> ${esc(concern)}</p>` : ''}
<form class="rule"><b>Ruling</b> <label><input type="radio" name="${q.id}"> Approve as written</label> <label><input type="radio" name="${q.id}"> Approve with changes</label> <label><input type="radio" name="${q.id}"> Reject</label><span class="line">Changes / notes: ______________________________</span></form></article>`;
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
.flag{background:var(--warn);border-left:4px solid var(--warnl);padding:8px 12px;font-size:.88rem}.rule{border-top:1px dashed var(--line);margin-top:12px;padding-top:10px;font-size:.88rem;display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center}.line{color:var(--mut)}
nav{font-size:.85rem;display:flex;flex-wrap:wrap;gap:6px 14px;margin:10px 0}nav a{color:var(--acc)}a{color:var(--acc)}
@media print{body{font-size:12px}article{break-inside:avoid}.rule input{display:none}}
</style></head><body><main>
<p class="sans" style="margin:0;color:var(--mut)">Plantdex · Boss Form pilot · Dandelion (<i>Taraxacum officinale</i>)</p>
<h1>Botanical Review Packet</h1>
<p>Every question below is a <b>draft</b>. None is shown to players and none can award anything until a named reviewer signs it off. ${total} drafts in total; ${off} are already disabled because they need something that does not exist yet.</p>
<div class="box"><h4>What we are asking you to do</h4><ol class="sans"><li>For each question, check that the <b>claim is true</b>, that the <b>cited source supports it</b>, and that <b>each photograph really shows what its caption says</b> (and the green tap box sits on the right part).</li><li>Mark Approve, Approve with changes, or Reject, and write the corrected wording if any.</li><li>Rule on the three open items at the end (cat’s-ear photo, cat’s-ear wording, source verification).</li></ol>
<p class="sans"><b>What this is not:</b> a safety test. No question concerns eating, preparing or using the plant. Nothing here claims a health effect. The only subject is telling parts and lookalikes apart.</p></div>
<div class="box"><h4>The curated notes the questions are drawn from</h4><ul class="sans">${notes.identification.map((i) => `<li><b>${esc(i.trait)}.</b> ${esc(i.detail)}</li>`).join('')}<li><b>Habitat.</b> ${esc(notes.habitat)}</li><li><b>Lookalike note (currently under review).</b> ${esc(notes.lookalikes[0].commonName)}: ${esc(notes.lookalikes[0].distinguishBy)}</li></ul>
<p class="sans">The lookalike note says dandelion stalks are “hollow” and lookalikes have “leafy” flowering stems. No question uses “hollow”, and the sources describe cat’s-ear stems as leafless with small bracts. Please rule on that sentence (open item 2).</p></div>
<div class="box"><h4>Sources cited (none yet marked verified in the registry)</h4><ul class="sans">${['wisc-dandelion', 'umn-dandelions'].map((s) => { const r = srcList.find((x) => x.id === s); return `<li><a href="${esc(r.url)}">${esc(r.organization)}: ${esc(r.title)}</a> · verified: ${r.verified}</li>`; }).join('')}</ul></div>
<nav>${order.map((a) => `<a href="#${CHALLENGE_BANK.find((q) => q.activity === a).id}">${ACT[a]}</a>`).join('')}<a href="#open">Open items</a></nav>
${sections}
<section id="open"><h2>Open items</h2>
<div class="box sans"><h4>1. Cat’s-ear branching photograph</h4><p>iNaturalist photo 69472306 (<i>Hypochaeris radicata</i>, CC0, Lilesville NC, 2020-04-26): ${photo('c-branched').replace('<figure', '<figure style="max-width:300px"')}A Y-shaped fork with a bud on the short branch. Does it clearly show the branching it is meant to show, and is the plant correctly identified?<br><br>☐ Approve   ☐ Reject, use a different photo</p></div>
<div class="box sans"><h4>2. Cat’s-ear wording</h4><p>Rule on: “Dandelion flower stalks are single, unbranched and hollow, rising straight from the basal rosette rather than from branched leafy flowering stems.” Proposed safer shape: dandelion stalks are single and unbranched; cat’s-ear stems usually fork, with small scale-like bracts and no true leaves. Please supply the exact words you will stand behind and a citation.</p></div>
<div class="box sans"><h4>3. Source verification</h4><p>Please confirm each cited page says what the questions need (milky sap, wind-dispersal, single stalk, compacted soil, roadside habitat), or give better ones.</p></div>
<div class="box sans"><h4>4. Reviewer</h4><p>Name and credentials: ______________________   Date: ______________</p></div></section>
</main></body></html>`;
writeFileSync('docs/boss-form-reviewer-packet.html', html);
console.log('questions', total, 'disabled', off, 'images', used.size, 'bytes', html.length);
