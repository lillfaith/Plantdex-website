// Run with: npx vite-node -c <config aliasing @ to src> scripts/build_reviewer_packet.mjs
// Builds docs/boss-form-reviewer-packet.html from the REAL question bank, so the packet can
// never describe questions the code does not hold. Run: node scripts/build_reviewer_packet.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// The bank as it stood in packet version 2, so every change since is computed, not remembered.
const BASELINE = '7540fab'; // version 2 of the packet
const oldFile = join(tmpdir(), `old-challenge-bank-${BASELINE}.ts`);
writeFileSync(oldFile, execFileSync('git', ['show', `${BASELINE}:src/lib/challenge-bank.ts`], { encoding: 'utf8' }));
const { CHALLENGE_BANK: OLD_BANK } = await import(oldFile);
const { CHALLENGE_BANK } = await import('../src/lib/challenge-bank.ts');
const { BOSS_IMAGES, REGION_LABELS } = await import('../src/lib/boss-images.ts');
const { CATS_EAR_CLAIMS, DANDELION_CLAIMS, PHOTO_CLUES } = await import('../src/lib/challenge-claims');
const { PASS_MARKS, TRIAL_MIX } = await import('../src/lib/boss-form');
const { isAvailable } = await import('../src/lib/mastery-challenges');
const { FIELD_NOTES } = await import('../src/lib/card-field-notes');
const sources = JSON.parse(readFileSync('src/data/sources.json', 'utf8'));
const srcList = sources.sources ?? sources;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// State of each item that needs the reviewer's attention in version 3:
//   fixed     changed after version 2
//   new       a replacement question added in version 3
//   disabled  gated until the named evidence exists
//   open      nobody has resolved it; a botanist must rule
const D = 'Branching is only a clue, not proof. ';
const CONCERNS = {
  'tr.sap': ['fixed', 'The "Pale yellow" wrong answer is now "Bright blue". The correct answer is still "Milky white".'],
  'ps.rosette': ['fixed', 'Wrong-answer photographs were checked for leaves. The flower photograph showed leaves, so it is now a crop with no leaves. The other wrong answer, a seed head, shows none.'],
  'ps.leaves2': ['fixed', 'Wrong-answer photographs were checked for leaves. Both showed leaves, so one is now a flower crop with no leaves and the other is the leafless seed-head close-up.'],
  'ps.clock': ['fixed', 'A wrong-answer leaf photograph had a small seed puff in it. It is now a crop without the puff.'],
  'tr.clock': ['fixed', 'A wrong-answer leaf photograph had a small seed puff in it. It is now a crop without the puff.'],
  'hb.puff': ['fixed', 'Both wrong answers are leaf photographs, cropped so no small seed puff shows.'],
  'ps.seedhead2': ['open', 'The wrong-answer leaf photograph is now a crop without its small puff. The other wrong answer, d-bud, still needs a botanist: see the d-bud item at the end.'],
  'hb.bloom2': ['open', 'd-bud is kept as a wrong answer, as instructed, because a bud comes before an open flower. A botanist must confirm the photograph shows a bud and not a spent bloom: see the d-bud item at the end.'],
  'tr.puff': ['open', 'd-bud is kept as a wrong answer, as instructed. A botanist must confirm the photograph shows a bud and not a spent bloom: see the d-bud item at the end.'],
  'hb.trampled': ['open', 'The Minnesota page says dandelions "can indicate compaction" and aerate compacted soil. "Tolerate" is an inference from that.'],
  'tr.packed': ['open', 'The Minnesota page says dandelions "can indicate compaction" and aerate compacted soil. "Tolerate" is an inference from that.'],
  'hb.sunny': ['new', 'Supported in part: "increased growth in full sun and moist conditions", but the same page says dandelions are "adaptable to many different environments". The word "open" is not on the page.'],
  'hb.lawn': ['new', 'Supported for lawns and gardens ("thin lawns, garden beds"). Paths, roadsides and fields are not on either page.'],
  'hb.disturbed': ['new', 'Supported: "disturbed soils". The wrong answer "Ground never disturbed" is the opposite of the claim, not a claim about where dandelions never grow.'],
  'tr.rosflower': ['new', 'Two clues needed: a leaf ring AND a flower. Each wrong picture lacks one (checked against the written photograph readings).'],
  'tr.noflower': ['new', 'Leaves are not enough: both wrong pictures also show a flower or a seed head, so the answer needs an absence as well as a presence.'],
  'tr.flowerbare': ['new', 'A flower head with no leaves in frame. The correct picture is a crop made for the purpose, so the question rests on the crop, not on the plant. A botanist may prefer to drop it.'],
  'hb.curb': ['disabled', 'Still disabled. Needs: roadside-species-evidence. Neither Extension page mentions roadsides.'],
  'hb.curb2': ['disabled', 'Still disabled. Needs: roadside-species-evidence.'],
  'tr.curb': ['disabled', 'Still disabled. Needs: roadside-species-evidence.'],
  'cp.single': ['disabled', D + 'Still disabled: the photograph needs an independent identification review.'],
  'cp.branch': ['disabled', D + 'Still disabled: the photograph needs an independent identification review.'],
  'cp.forks': ['disabled', D + 'Still disabled until the cat’s-ear wording is ruled on.'],
  'tr.single': ['disabled', D + 'Needs a second cat’s-ear photograph that does not exist.'],
  'tr.branch': ['disabled', D + 'Needs a second cat’s-ear photograph that does not exist.'],
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
  const changeBox = diffs.length ? `<div class="chg"><b>Changed since version 2</b><table>${diffs.map(([l, a, b]) => `<tr><th>${esc(l)}</th><td class="old">${esc(a)}</td><td class="new">${esc(b)}</td></tr>`).join('')}</table></div>` : '';
  const srcs = q.sources.map((s) => { const r = srcList.find((x) => x.id === s); return r ? `<a href="${esc(r.url)}">${esc(r.organization)}: ${esc(r.title)}</a>` : esc(s); }).join(' · ');
  return `<article id="${q.id}"><header><code>${q.id}</code>${!OLD_BANK.find((x) => x.id === q.id) ? '<strong class="tag">NEW</strong>' : diffs.length ? '<strong class="tag">CHANGED</strong>' : ''}<span>${ACT[q.activity]} · ${KIND[q.kind]}</span>${disabled ? '<strong class="off">DISABLED until: ' + q.requires.join(', ') + '</strong>' : ''}</header>
<h3>${esc(q.prompt)}</h3>${body}
<dl><dt>Feedback shown after answering</dt><dd>${esc(q.feedback)}</dd><dt>Claim being tested (must appear in the curated notes)</dt><dd>“${esc(q.fact)}”</dd><dt>Cited</dt><dd>${srcs}</dd></dl>
${changeBox}${text ? `<p class="flag ${state}"><b>${state === 'open' ? 'UNRESOLVED' : state === 'disabled' ? 'STAYS DISABLED' : state === 'new' ? 'NEW, awaiting your ruling' : 'ADDRESSED, awaiting your ruling'}:</b> ${esc(text)}</p>` : ''}
<form class="rule"><b>Ruling (not an approval until a named reviewer signs)</b> <label><input type="radio" name="${q.id}"> Approve as written</label> <label><input type="radio" name="${q.id}"> Approve with changes</label> <label><input type="radio" name="${q.id}"> Reject</label><span class="line">Changes / notes: ______________________________</span></form></article>`;
};

const order = ['part-spotter', 'compare', 'habitat-season', 'boss-trial'];
const sections = order.map((a) => `<section><h2>${ACT[a]} <small>${CHALLENGE_BANK.filter((q) => q.activity === a).length} questions</small></h2>${CHALLENGE_BANK.filter((q) => q.activity === a).map(card).join('')}</section>`).join('');
const notes = FIELD_NOTES['taraxacum-officinale'];
const total = CHALLENGE_BANK.length;
const newIds = CHALLENGE_BANK.filter((q) => !OLD_BANK.find((x) => x.id === q.id)).map((q) => q.id);
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
.st{border-collapse:collapse;width:100%;font-size:.85rem}.st th,.st td{border-bottom:1px solid var(--line);padding:5px 8px;text-align:left;vertical-align:top}.st td.done{color:var(--ok)}.st td.gated{color:var(--bad)}.st td.partial{color:var(--warnl)}.b-direct{color:var(--ok)}.b-partial,.b-indirect{color:var(--warnl)}.b-not-found{color:var(--bad)}.b-machine-read{color:var(--ok)}.b-unsourced{color:var(--bad)}.b-search-summary{color:var(--warnl)}.box small{color:var(--mut)}</style></head><body><main>
<p class="sans" style="margin:0;color:var(--mut)">Plantdex · Boss Form pilot · Dandelion (<i>Taraxacum officinale</i>)</p>
<h1>Botanical Review Packet <small style="font-size:1rem;font-weight:400">version 3</small></h1>
<div class="box" style="border-color:var(--bad)"><h4>Status: DRAFTS ONLY. Nothing here is approved.</h4>
<p class="sans">No question has a named reviewer or date against it, none can be shown to players and none can award anything. ${total} drafts: ${total - off} ungated, ${off} gated. ${newIds.length} questions are new in this version and are marked <span class="tag">NEW</span>; changed ones are marked <span class="tag">CHANGED</span> with the old text struck through.</p></div>
<div class="box"><h4>Do the sections now have enough questions?</h4><table class="sans st"><tr><th>Section</th><th>Asked</th><th>Needed incl. retry</th><th>Ungated drafts</th><th>Gated</th><th>Complete?</th></tr>
${[['part-spotter', 'Part Spotter', PASS_MARKS['part-spotter'].of, PASS_MARKS['part-spotter'].of * 2], ['compare', 'Compare', PASS_MARKS.compare.of, PASS_MARKS.compare.of], ['habitat-season', 'Habitat', PASS_MARKS['habitat-season'].of, PASS_MARKS['habitat-season'].of * 2], ['boss-trial', 'Boss Trial', PASS_MARKS['boss-trial'].of, PASS_MARKS['boss-trial'].of]].map(([a, n, asked, need]) => { const all = CHALLENGE_BANK.filter((q) => q.activity === a); const ok = all.filter((q) => isAvailable(q)); return `<tr><td>${n}</td><td>${asked}</td><td>${need}</td><td>${ok.length}</td><td>${all.length - ok.length}</td><td class="${ok.length >= need ? 'done' : 'gated'}">${ok.length >= need ? 'Yes' : 'NO'}</td></tr>`; }).join('')}</table>
<p class="sans">The Trial needs ${TRIAL_MIX.visual} picture, ${TRIAL_MIX.applied} applied and ${TRIAL_MIX.recall} recall questions and has no retry, so its ten available drafts are every attempt’s ten (only the order changes). <b>Compare has no ungated question</b>: every comparison needs the cat’s-ear photograph. The Trial opens only after Compare, so the pilot cannot be completed until that evidence exists.</p></div>
<div class="box"><h4>Change log from version 2</h4><ul class="sans">
<li><b>6 new questions.</b> Habitat: hb.sunny, hb.lawn, hb.disturbed. Boss Trial: tr.rosflower, tr.noflower, tr.flowerbare (each needs two observations).</li>
<li><b>tr.sap:</b> “Pale yellow” is now “Bright blue”.</li>
<li><b>Photographs:</b> four crops were made from existing CC0 photographs so a wrong-answer picture is not also a valid example of what is asked (leaves, a flower, a seed puff). Provenance table below.</li>
<li><b>Seed-head and leaf questions:</b> wrong-answer pictures swapped for those crops in ps.rosette, ps.leaves2, ps.clock, ps.seedhead2, hb.puff, hb.bloom2, tr.clock and tr.puff. Correct answers unchanged.</li>
<li><b>Habitat feedback</b> reworded to match what the Extension pages actually say.</li>
<li><b>d-bud kept</b> as a wrong answer in hb.bloom2 and tr.puff, as instructed.</li>
<li><b>Sources:</b> three of the five were fetched and read by a machine this time (Wisconsin, Minnesota, the Forest Service guide). World Flora Online could not be read (certificate). The WSU HortSense address returns “Page not found”. All five remain unverified.</li>
<li><b>Unchanged:</b> all 26 original ids, every gate, the reviews list (empty), scoring, pass marks, XP, mastery, and the flag (off).</li></ul></div>
<div class="box"><h4>Still needs a botanist</h4><ul class="sans">
<li><b>d-bud photograph.</b> Is it a bud, or a spent bloom closing? The photograph shows withered yellow tips and a pale tuft on a closed head. If it is a spent bloom it is not a valid wrong answer in hb.bloom2, tr.puff and ps.seedhead2.</li>
<li><b>Open the sources.</b> A person must confirm each page before any source is marked verified. The Minnesota and Wisconsin pages say most of what the questions need (see the claim table), but not that wind is the <i>main</i> mechanism, and not “open” sunny, “tolerate” compacted soil, or paths, roadsides and fields.</li>
<li><b>Cat’s-ear wording.</b> The only page read says “branched or several flowering stems”, not “usually branched”, and nothing read says “largely leafless” or “small bracts”.</li>
<li><b>Cat’s-ear photograph</b> (independent identification) and a second one; <b>roadside photographs</b> (species evidence).</li>
<li><b>Photograph readings.</b> The three multi-clue Trial questions and every crop rest on the drafter’s reading of which clues each photograph shows (table below). Confirm or correct.</li>
<li><b>Guess odds, for the owner.</b> With the roadside taps gated, Habitat can be passed by guessing about 58% of the time. The Trial remains the real gate (under 0.1%).</li></ul></div>
<div class="box"><h4>What we are asking you to do</h4><ol class="sans"><li>For each question, check that the <b>claim is true</b>, that the <b>cited source supports it</b>, and that <b>each photograph shows what its caption says</b>.</li><li>Mark Approve, Approve with changes, or Reject, and write the corrected wording if any.</li><li>Rule on the open items at the end.</li></ol>
<p class="sans"><b>What this is not:</b> a safety test. No question concerns eating, preparing or using the plant. Nothing here claims a health effect. The only subject is telling parts and lookalikes apart.</p></div>
<div class="box"><h4>The curated notes the questions are drawn from</h4><ul class="sans">${notes.identification.map((i) => `<li><b>${esc(i.trait)}.</b> ${esc(i.detail)}</li>`).join('')}<li><b>Habitat.</b> ${esc(notes.habitat)}</li><li><b>Lookalike note.</b> ${esc(notes.lookalikes[0].commonName)}: ${esc(notes.lookalikes[0].distinguishBy)}</li></ul></div>
<div class="box"><h4>Source verification status</h4><table class="sans st"><tr><th>Source</th><th>Status</th><th>What happened on 2026-11-14</th></tr>${['wisc-dandelion', 'umn-dandelions', 'wfo-hypochaeris-radicata', 'wsu-hortsense-catsear', 'wsu-hosted-usfs-treatment-guide'].map((id) => { const r = srcList.find((x) => x.id === id); const st = id === 'wfo-hypochaeris-radicata' ? 'UNVERIFIED, not read' : id === 'wsu-hortsense-catsear' ? 'UNVERIFIED, URL broken' : 'UNVERIFIED, machine-read'; return `<tr><td><a href="${esc(r.url)}">${esc(r.organization)}: ${esc(r.title)}</a></td><td class="${id.startsWith('wfo') || id === 'wsu-hortsense-catsear' ? 'gated' : 'partial'}"><b>${st}</b></td><td>${esc(r.note ?? '')}</td></tr>`; }).join('')}</table>
<p class="sans"><small>“Machine-read” means the page text was fetched and searched for the quoted words. A person has not confirmed it, and the registry keeps <code>verified</code> for a person.</small></p></div>
<div class="box" id="claims"><h4>Claim map: dandelion claims</h4><table class="sans st"><tr><th>Claim</th><th>Strength</th><th>What the pages say</th><th>Used by</th></tr>${DANDELION_CLAIMS.map((c) => `<tr><td>${esc(c.claim)}</td><td class="b-${c.strength}"><b>${esc(c.strength)}</b></td><td>${esc(c.quote)}</td><td>${esc(c.usedBy.join(', ') || 'none')}</td></tr>`).join('')}</table></div>
<div class="box"><h4>Claim map: cat’s-ear claims</h4><table class="sans st"><tr><th>Claim</th><th>Source(s)</th><th>Basis</th><th>What was seen</th><th>Used by</th></tr>${CATS_EAR_CLAIMS.map((c) => `<tr><td>${esc(c.claim)}</td><td>${c.sourceIds.length ? c.sourceIds.map((id) => { const r = srcList.find((x) => x.id === id); return `<a href="${esc(r.url)}">${esc(r.organization)}</a>`; }).join('<br>') : 'none'}</td><td class="b-${c.basis}"><b>${esc(c.basis)}</b></td><td>${esc(c.note)}</td><td>${esc(c.usedBy.join(', ') || 'not used yet')}</td></tr>`).join('')}</table></div>
<div class="box"><h4>Photographs, provenance and licence</h4><table class="sans st"><tr><th>Image</th><th>iNaturalist photo</th><th>Licence</th><th>Crop of</th><th>Drafter’s reading</th><th>Used in</th></tr>${Object.entries(BOSS_IMAGES).filter(([, im]) => im.src).map(([id, im]) => { const cl = PHOTO_CLUES[id]; const uses = CHALLENGE_BANK.filter((q) => [q.media, q.correct, ...q.distractors].includes(id)).map((q) => q.id); return `<tr><td><code>${id}</code></td><td><a href="https://www.inaturalist.org/photos/${im.inatPhotoId}">${im.inatPhotoId}</a></td><td>${esc(im.licence.toUpperCase())}</td><td>${im.cropOf ? esc(im.cropOf) + ' [' + im.crop.join(', ') + '] %' : '—'}</td><td>${cl ? `leaves ${cl.leaves}, flower ${cl.flower}, seed head ${cl.seedHead}${cl.note ? '. ' + esc(cl.note) : ''}` : '—'}</td><td>${esc(uses.join(', ') || 'none')}</td></tr>`; }).join('')}</table>
<p class="sans"><small>Crops are made by <code>scripts/build_boss_crops.mjs</code> from the files named, so they can be regenerated. Photographer names are not recorded in the repository; CC0 needs no attribution.</small></p></div>
<nav>${order.map((a) => `<a href="#${CHALLENGE_BANK.find((q) => q.activity === a).id}">${ACT[a]}</a>`).join('')}<a href="#open">Open items</a></nav>
${sections}
<section id="key"><h2>Answer key <small>one line per question</small></h2><div class="box"><table class="sans st"><tr><th>Id</th><th>Section</th><th>Correct answer</th><th>Gate</th></tr>${CHALLENGE_BANK.map((q) => `<tr><td><code>${q.id}</code></td><td>${ACT[q.activity]}</td><td>${q.kind === 'quick-pick' ? esc(q.correct) : q.kind === 'spot-feature' ? esc(REGION_LABELS[q.correct] ?? q.correct) + ' (tap)' : esc(q.correct) + ' (picture)'}</td><td>${q.requires?.length ? esc(q.requires.join(', ')) : 'none'}</td></tr>`).join('')}</table></div></section>
<section id="open"><h2>Open items</h2>
<div class="box sans"><h4>1. The d-bud photograph</h4><p>It is a wrong answer in hb.bloom2, tr.puff and ps.seedhead2, on the reasoning that a bud comes before an open flower. ${photo('d-bud').replace('<figure', '<figure style="max-width:300px"')}The photograph shows a closed head with withered yellow tips and a pale tuft on top. Is it a bud, or a spent bloom closing? If a spent bloom, it must come out of those answers.<br><br>☐ Bud, keep   ☐ Spent bloom, replace</p></div>
<div class="box sans"><h4>2. Cat’s-ear photograph: independent identification review</h4><p>iNaturalist photo 69472306 (<i>Hypochaeris radicata</i>, CC0, Lilesville NC, 2020-04-26): ${photo('c-branched').replace('<figure', '<figure style="max-width:300px"')}Gates: <code>cats-ear-independent-id-review</code>, <code>cats-ear-branch-photo</code>.<br><br>☐ Approve   ☐ Reject</p></div>
<div class="box sans"><h4>3. Cat’s-ear wording</h4><p>Current: “Cat’s-ear stems are usually branched and largely leafless, with small bracts. Branching is a useful clue, not proof of which species it is.” The Forest Service guide says “branched or several flowering stems”. Please rule, and cite where “largely leafless” and “small bracts” come from. Gate: <code>cats-ear-wording-reviewed</code>.</p></div>
<div class="box sans"><h4>4. Roadside photographs</h4><p>hb.curb, hb.curb2 and tr.curb: are the small yellow flowers dandelion? Gate: <code>roadside-species-evidence</code>.</p></div>
<div class="box sans"><h4>5. Sources and the WSU address</h4><p>Open the five sources and confirm each claim row. Replace or remove the broken WSU HortSense address, and read World Flora Online.</p></div>
<div class="box sans"><h4>6. Formal review</h4><p>This packet records drafts only. A formal approval needs a reviewer’s name and a date against each question id.</p><p>Name and credentials: ______________________   Date: ______________</p></div></section>
</main></body></html>`;
writeFileSync('docs/boss-form-reviewer-packet.html', html);
console.log('questions', total, 'disabled', off, 'images', used.size, 'bytes', html.length);
