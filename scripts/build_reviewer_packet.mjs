// Run with: npx vite-node -c <config aliasing @ to src> scripts/build_reviewer_packet.mjs
// Builds docs/boss-form-reviewer-packet.html from the REAL question bank, so the packet can
// never describe questions the code does not hold. Run: node scripts/build_reviewer_packet.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// The bank as it stood in packet version 4 before the addendum, so every change since is computed, not remembered.
const BASELINE = '3f2a875'; // version 4 as first committed; the addendum is measured against it
const oldFile = join(tmpdir(), `old-challenge-bank-${BASELINE}.ts`);
writeFileSync(oldFile, execFileSync('git', ['show', `${BASELINE}:src/lib/challenge-bank.ts`], { encoding: 'utf8' }));
const { CHALLENGE_BANK: OLD_BANK } = await import(oldFile);
const { CHALLENGE_BANK } = await import('../src/lib/challenge-bank.ts');
const { BOSS_IMAGES, REGION_LABELS } = await import('../src/lib/boss-images.ts');
const { CATS_EAR_CLAIMS, DANDELION_CLAIMS, PHOTO_CLUES } = await import('../src/lib/challenge-claims');
const { PASS_MARKS, TRIAL_MIX } = await import('../src/lib/boss-form');
const { activityGuessOdds } = await import('../src/lib/challenge-odds');
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
  'ps.seedhead2': ['fixed', "The unresolved d-bud photograph is gone. The wrong answers are now a leaf crop and an open-flower photograph."],
  'hb.bloom2': ['fixed', "The unresolved d-bud photograph is gone. The wrong answers are now a leaf crop and a photograph of flowers still in bloom."],
  'tr.puff': ['fixed', "The unresolved d-bud photograph is gone. The wrong answers are now two leaf crops."],
  'hb.trampled': ['open', "A third answer (\"No, only sandy soil\") was added so every Habitat question has three options. The Minnesota page says dandelions \"can indicate compaction\" and aerate compacted soil; \"tolerate\" is an inference from that."],
  'tr.packed': ['open', 'The Minnesota page says dandelions "can indicate compaction" and aerate compacted soil. "Tolerate" is an inference from that.'],
  'hb.sunny': ['fixed', "Now asks what light they grow BEST in. Correct answer is \"Full sun\" (Nevada: \"Grows best in moist areas with full sun\"). Distractors are Deep shade and Partial shade; the feedback says dandelions tolerate shade (Cornell), so shade is not made to look impossible."],
  'hb.lawn': ['fixed', "\"Open water\" and \"A shaded cave\" replaced with \"Deep woodland interiors\" and \"Salt marshes\". Both are plausible but not listed by any source read, so a reviewer should confirm neither is accidentally correct. The correct answer is \"Lawns and gardens\"."],
  'hb.disturbed': ['fixed', "\"Ground under water\" removed. Wrong answers are now undisturbed old woodland and undisturbed native prairie. Sources say \"typical plant growing in disturbed site\"; they do not say dandelions never occur elsewhere, so a reviewer should confirm the wording \"typically\"."],
  'tr.rosflower': ['fixed', "Prompt now says \"Which picture shows ...\" for the same reason."],
  'tr.noflower': ['fixed', "Prompt now asks in which PICTURE only leaves are visible, which separates \"not in this photograph\" from \"not on this plant\"."],
  'tr.flowerbare': ['fixed', "Was a photograph hunt for \"a flower head and no leaves\". Now a text question beside the photograph of a whole plant: do leaves grow up the flower stalk? It teaches that dandelion stalks are leafless, which Cornell, Minnesota and Nevada all say. It is a clue, not proof."],
  'cp.stages': ['new', "Compare, growth stages: which is the stage after flowering. The wrong picture is a flower with no seed head."],
  'cp.branch': ['disabled', "Reworded to the source: \"branched or several flowering stems\". Still a clue, not proof. Disabled until the photograph has an independent identification review."],
  'tr.branch': ['disabled', "Reworded to the source: \"branched or several flowering stems\". Needs a second cat’s-ear photograph that does not exist."],
  'cp.forks': ['disabled', "Reworded: dandelion has one flowering stem, branching is a clue, not proof. Disabled until the cat’s-ear wording is ruled on."],
  'cp.rosette': ['new', "Replaces cp.seedleaves. Asks which PICTURE shows a leaf ring, so a feature out of frame cannot make a wrong picture right. Teaches the rosette, with a note that many plants form rosettes."],
  'cp.seedstalk': ['new', "Replaces cp.flowerleaves. Asks which PICTURE shows a seed head on a stalk. The wrong picture shows leaves and no seed head."],
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
    ? `${q.media ? `<div class="grid one">${photo(q.media)}</div>` : ''}<ul class="opts"><li class="y">${esc(q.correct)} <em>correct</em></li>${q.distractors.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>`
    : q.kind === 'spot-feature'
      ? `<div class="grid one">${regionPhoto(q.media, q.correct)}</div><p class="ans">Correct region: <b>${esc(REGION_LABELS[q.correct] ?? q.correct)}</b>. Wrong regions offered: ${q.distractors.map((d) => esc(REGION_LABELS[d] ?? d)).join(', ')}.</p>`
      : `${q.media ? `<p class="lab">Shown with the question</p><div class="grid one">${photo(q.media)}</div>` : ''}<p class="lab">Options (green = correct)</p><div class="grid">${photo(q.correct, 'right')}${q.distractors.map((d) => photo(d, 'wrong')).join('')}</div>`;
  const [state, text] = CONCERNS[q.id] ?? [];
  const changeBox = diffs.length ? `<div class="chg"><b>Changed in the addendum</b><table>${diffs.map(([l, a, b]) => `<tr><th>${esc(l)}</th><td class="old">${esc(a)}</td><td class="new">${esc(b)}</td></tr>`).join('')}</table></div>` : '';
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
<h1>Botanical Review Packet <small style="font-size:1rem;font-weight:400">version 4, frozen</small></h1>
<div class="box" style="border-color:var(--bad)"><h4>Status: DRAFTS ONLY, FROZEN FOR FORMAL REVIEW. Nothing here is approved.</h4>
<p class="sans">No question has a named reviewer or date against it, none can be shown to players and none can award anything. ${total} drafts: ${total - off} ungated, ${off} gated. ${newIds.length} are new in the independent-review addendum (<span class="tag">NEW</span>); questions changed by it are marked <span class="tag">CHANGED</span> with the old text struck through. The bank is not expected to change again before a botanist reviews it, except to apply that review.</p></div>
<div class="box" id="addendum" style="border-color:var(--acc)"><h4>Independent Review Addendum <small style="font-weight:400">added to version 4, no version 5</small></h4>
<p class="sans">A second independent preliminary review found four things to fix. Nothing is approved and no gate moved. Each part below is computed from the question bank, so it cannot drift from it.</p>
<h4 class="sans">1. Questions changed, before and after</h4>
${(() => { const rows = []; for (const q of CHALLENGE_BANK) { const d = changesFor(q); if (!d.length) continue; const isNew = !OLD_BANK.find((x) => x.id === q.id); rows.push(`<tr><td><code>${q.id}</code>${isNew ? ' <span class="tag">NEW</span>' : ''}</td><td>${d.map(([l, a, b]) => `<b>${esc(l)}</b>: ${a ? `<span class="old">${esc(a)}</span> → ` : ''}<span class="new">${esc(b)}</span>`).join('<br>')}</td></tr>`); } const gone = OLD_BANK.filter((o) => !CHALLENGE_BANK.find((q) => q.id === o.id)).map((o) => `<tr><td><code>${o.id}</code> <strong class="off">REMOVED</strong></td><td><span class="old">${esc(o.prompt)}</span> (replaced; it asked which picture holds two features, which rewards photograph composition)</td></tr>`); return `<table class="sans st"><tr><th>Question</th><th>Before → after</th></tr>${rows.join('')}${gone.join('')}</table>`; })()}
<p class="sans"><small>No original question id was removed. The two removed ids were added in version 4 and never reviewed.</small></p>
<h4 class="sans">2. Photographs replaced, cropped or gated</h4>
<ul class="sans"><li><b>Replaced:</b> none. <b>New crops:</b> none. <b>Newly gated:</b> none. The four existing crops and every CC0 licence and provenance record are unchanged.</li>
<li>Where a picture used to be asked about for what is <i>missing</i> from it, the question now asks which <i>picture shows</i> something, so a feature that is out of frame cannot make a wrong picture right: cp.rosette, cp.seedstalk, tr.noflower, tr.rosflower.</li>
<li><b>tr.flowerbare</b> keeps the whole-plant photograph d-plant-stalk and now asks the player about the stalk itself, instead of asking which crop has no leaves. The question screen now shows a photograph above a text question (a three-line change).</li></ul>
<h4 class="sans">3. Habitat distractors</h4>
<ul class="sans"><li><b>hb.sunny:</b> "Deep shade", "Open water" → "Deep shade", "Partial shade". Correct answer "Open, sunny ground" → "Full sun", to match the Nevada wording.</li>
<li><b>hb.lawn:</b> "Open water", "A shaded cave" → "Deep woodland interiors", "Salt marshes". Correct answer "A lawn or garden" → "Lawns and gardens".</li>
<li><b>hb.disturbed:</b> "Ground never disturbed", "Ground under water" → "Undisturbed old woodland", "Undisturbed native prairie".</li>
<li>hb.trampled, hb.puff and hb.bloom2 already had realistic answers. <b>Random-guess pass probability is unchanged at 58.3%</b>: it depends on how many options there are, not how good they are. This is recorded as an <b>accepted assessment-design limitation for the pilot</b>. Scoring, retries, pass marks and question formats were not changed.</li>
<li>Reviewer note: the new woodland, marsh and prairie options are plausible but no source read lists them, so confirm none is accidentally correct. Cornell says dandelions are shade tolerant, which is why the sunny question asks what they grow <i>best</i> in.</li></ul>
<h4 class="sans">4. Sources newly read or partly supported</h4>
<table class="sans st"><tr><th>Claim</th><th>Result</th><th>Source and passage</th></tr>
<tr><td>Wind as the main seed dispersal route</td><td class="partial"><b>Partial.</b> Wind dispersal is direct. "Main" is an inference.</td><td>Cornell CALS: "Seeds are wind dispersed by means of umbrella-like fluff." Cornell Weed ID: "reproduces by wind-blown seeds and through vegetative reproduction from broken taproot segments." Nevada: seeds "blow with the wind".</td></tr>
<tr><td>Dandelions along roadsides</td><td class="done"><b>Direct, for the text claim.</b> The two roadside photographs still need species evidence, so those questions stay gated.</td><td>Nevada (<a href="https://extension.unr.edu/publication.aspx?PubID=2780">extension.unr.edu</a>): "Where it grows: Lawns, gardens, landscaped areas, roadsides, pastures and parks."</td></tr>
<tr><td>Growth in compacted soil</td><td class="gated"><b>Still indirect.</b> No Cornell, Nevada or MSU page read mentions it.</td><td>Only Minnesota: "Dandelions can indicate compaction"; the taproot can "aerate compacted soils".</td></tr>
<tr><td>Full sun, and shade tolerance</td><td class="done"><b>Direct.</b></td><td>Nevada: "Grows best in moist areas with full sun." Cornell CALS: "Dandelion is shade tolerant".</td></tr>
<tr><td>Cat’s-ear stems</td><td class="gated"><b>Conflict found.</b></td><td>Cornell CALS: cat’s-ear "stems are tall and branching with scattered leaves and multiple flowers". That contradicts "largely leafless", which stays out of the bank.</td></tr>
<tr><td>Michigan State University Extension</td><td class="gated"><b>Not read.</b></td><td>The MSU page returned only a bot-protection page, so nothing from it is quoted.</td></tr></table>
<p class="sans"><small>Machine-read means the page text was fetched and the quoted words found in it. All of these remain <code>verified: false</code>; a person must confirm them.</small></p>
<h4 class="sans">5. Identification limits</h4>
<p class="sans">Questions about sap, rosettes, yellow flower heads and white seed heads now say, in their feedback, that the feature is one clue, that other plants share it, or that it alone does not confirm the species (a test enforces this for thirteen questions). No question or feedback gives eating, medicinal or other use advice.</p>
<h4 class="sans">6. Still needs a human botanist</h4>
<ul class="sans"><li>Formal approval of every question: a named reviewer and a date.</li><li>Confirmation of every machine-read passage, and of the unread MSU, World Flora Online and WSU HortSense pages.</li><li>The cat’s-ear photograph and wording, and the roadside photographs (eight questions stay gated).</li><li>The three new Habitat distractor pairs, and the drafter’s reading of what each photograph shows.</li></ul>
<h4 class="sans">7. Test results</h4>
<p class="sans">${process.env.TEST_SUMMARY ?? 'Run npm run verify and rebuild to fill this in.'}</p></div>
<div class="box"><h4>Do the sections now have enough questions?</h4><table class="sans st"><tr><th>Section</th><th>Asked</th><th>Needed incl. retry</th><th>Ungated drafts</th><th>Gated</th><th>Complete?</th></tr>
${[['part-spotter', 'Part Spotter', PASS_MARKS['part-spotter'].of, PASS_MARKS['part-spotter'].of * 2], ['compare', 'Compare', PASS_MARKS.compare.of, PASS_MARKS.compare.of], ['habitat-season', 'Habitat', PASS_MARKS['habitat-season'].of, PASS_MARKS['habitat-season'].of * 2], ['boss-trial', 'Boss Trial', PASS_MARKS['boss-trial'].of, PASS_MARKS['boss-trial'].of]].map(([a, n, asked, need]) => { const all = CHALLENGE_BANK.filter((q) => q.activity === a); const ok = all.filter((q) => isAvailable(q)); return `<tr><td>${n}</td><td>${asked}</td><td>${need}</td><td>${ok.length}</td><td>${all.length - ok.length}</td><td class="${ok.length >= need ? 'done' : 'gated'}">${ok.length >= need ? 'Yes' : 'NO'}</td></tr>`; }).join('')}</table>
<p class="sans">Part Spotter and Habitat each need a different spare for every question, so twice the number asked. The Trial needs ${TRIAL_MIX.visual} picture, ${TRIAL_MIX.applied} applied and ${TRIAL_MIX.recall} recall questions and has no retry, so its ten available drafts are every attempt’s ten (only the order changes). Compare now has its three dandelion-only drafts, so the Trial can follow it. The cat’s-ear questions stay gated.</p></div>
<div class="box"><h4>Habitat guess probability, calculated from the implemented scoring</h4>
<p class="sans">Every available Habitat question has three options and every slot has one retry, so one slot is resolved by pure guessing with probability 1 − (2/3)² = 0.556, and a set passes on 2 of 3. The result is <b>${(() => { const sp = activityGuessOdds('habitat-season', 50, 'available').average; return (sp * 100).toFixed(1); })()}%</b> (computed by the same code the server uses, then checked by hand). The target of under 25% is <b>not</b> reachable with the existing formats, because it needs about six options per question or no retry:</p>
<table class="sans st"><tr><th>Design</th><th>Chance a random guesser passes</th><th>What it would take</th></tr>
<tr><td>Today: 3 options, one retry, pass 2 of 3</td><td>58.3%</td><td>nothing: this is the bank</td></tr>
<tr><td>4 options, one retry</td><td>40.7%</td><td>a four-option format, or the roadside taps back</td></tr>
<tr><td>6 options, one retry</td><td>22.3%</td><td>six plausible options per question</td></tr>
<tr><td>3 options, no retry</td><td>25.9%</td><td>removing the owner’s Habitat retry rule</td></tr>
<tr><td>4 options, no retry</td><td>15.6%</td><td>both of the above</td></tr></table>
<p class="sans">Better distractors do not change this: random guessing depends only on how many options there are. The Boss Trial (under 0.1%) is the real gate, and Compare stays at 50% by design (two choices, no retry). The pass mark, the retry rule and the Trial gate are unchanged.</p></div>
<div class="box"><h4>Change log from version 3</h4><ul class="sans">
<li><b>Compare completed.</b> Three dandelion-only questions (cp.rosette, cp.seedstalk, cp.stages; the first two replace earlier drafts in the addendum above), each comparing two plant parts or growth stages. The three original cat’s-ear comparisons are unchanged apart from wording and are still gated.</li>
<li><b>d-bud photograph retired.</b> It may show a spent bloom, so it is out of hb.bloom2, tr.puff and ps.seedhead2 and is not called a bud anywhere. Its file and provenance are kept.</li>
<li><b>hb.trampled</b> gained a third answer, so every Habitat question has three options.</li>
<li><b>Cat’s-ear wording</b> now says “branched or several flowering stems”, which is what the one page read says. “Usually branched”, “largely leafless” and “small bracts” are removed because no page read says them. Branching is still only a clue, not proof.</li>
<li><b>Unchanged:</b> every original id, every gate, the reviews list (empty), scoring, pass marks, retry rules, XP, mastery and the flag (off).</li></ul></div>
<div class="box"><h4>Still needs a botanist</h4><ul class="sans">
<li><b>Every question.</b> Nothing is approved. Each needs a named reviewer and a date.</li>
<li><b>Sources.</b> All five are unverified. Wisconsin, Minnesota and the Forest Service guide were machine-read; World Flora Online could not be read; the WSU HortSense address returns “Page not found”. A person must confirm each claim row.</li>
<li><b>Source gaps.</b> The pages do not say wind is the <i>main</i> dispersal route, “open” sun, “tolerate” compacted soil, or paths, roadsides and fields.</li>
<li><b>Cat’s-ear photograph</b> (independent identification), and a second one for tr.single and tr.branch. <b>Roadside photographs</b> (species evidence). All eight of those questions stay gated.</li>
<li><b>Photograph readings.</b> Every crop, the three multi-clue Trial questions and the three new Compare questions rest on the drafter’s reading of which clues each photograph shows (table below).</li>
<li><b>An unopened-bud photograph</b> is not needed by any question. If a reviewer wants one used, it must come from a traceable CC0 source.</li></ul></div>
<div class="box"><h4>What we are asking you to do</h4><ol class="sans"><li>For each question, check that the <b>claim is true</b>, that the <b>cited source supports it</b>, and that <b>each photograph shows what its caption says</b>.</li><li>Mark Approve, Approve with changes, or Reject, and write the corrected wording if any.</li><li>Rule on the open items at the end.</li></ol>
<p class="sans"><b>What this is not:</b> a safety test. No question concerns eating, preparing or using the plant. Nothing here claims a health effect. The only subject is telling parts and lookalikes apart.</p></div>
<div class="box"><h4>The curated notes the questions are drawn from</h4><ul class="sans">${notes.identification.map((i) => `<li><b>${esc(i.trait)}.</b> ${esc(i.detail)}</li>`).join('')}<li><b>Habitat.</b> ${esc(notes.habitat)}</li><li><b>Lookalike note.</b> ${esc(notes.lookalikes[0].commonName)}: ${esc(notes.lookalikes[0].distinguishBy)}</li></ul></div>
<div class="box"><h4>Source verification status</h4><table class="sans st"><tr><th>Source</th><th>Status</th><th>What happened on 2026-11-14</th></tr>${['wisc-dandelion', 'umn-dandelions', 'cornell-cals-dandelion', 'cornell-weedid-dandelion', 'unce-dandelion-guide', 'msu-extension-dandelion', 'wfo-hypochaeris-radicata', 'wsu-hortsense-catsear', 'wsu-hosted-usfs-treatment-guide'].map((id) => { const r = srcList.find((x) => x.id === id); const bad = id === 'wfo-hypochaeris-radicata' || id === 'wsu-hortsense-catsear' || id === 'msu-extension-dandelion'; const st = id === 'wfo-hypochaeris-radicata' || id === 'msu-extension-dandelion' ? 'UNVERIFIED, not read' : id === 'wsu-hortsense-catsear' ? 'UNVERIFIED, URL broken' : 'UNVERIFIED, machine-read'; return `<tr><td><a href="${esc(r.url)}">${esc(r.organization)}: ${esc(r.title)}</a></td><td class="${bad ? 'gated' : 'partial'}"><b>${st}</b></td><td>${esc(r.note ?? '')}</td></tr>`; }).join('')}</table>
<p class="sans"><small>“Machine-read” means the page text was fetched and searched for the quoted words. A person has not confirmed it, and the registry keeps <code>verified</code> for a person.</small></p></div>
<div class="box" id="claims"><h4>Claim map: dandelion claims</h4><table class="sans st"><tr><th>Claim</th><th>Strength</th><th>Sources</th><th>What the pages say</th><th>Used by</th></tr>${DANDELION_CLAIMS.map((c) => `<tr><td>${esc(c.claim)}</td><td class="b-${c.strength}"><b>${esc(c.strength)}</b></td><td>${c.sourceIds.map((id) => { const r = srcList.find((x) => x.id === id); return r ? `<a href="${esc(r.url)}">${esc(r.url.replace(/^https?:\/\//, '').slice(0, 48))}</a>` : esc(id); }).join('<br>') || 'none'}</td><td>${esc(c.quote)}</td><td>${esc(c.usedBy.join(', ') || 'none')}</td></tr>`).join('')}</table></div>
<div class="box"><h4>Claim map: cat’s-ear claims</h4><table class="sans st"><tr><th>Claim</th><th>Source(s)</th><th>Basis</th><th>What was seen</th><th>Used by</th></tr>${CATS_EAR_CLAIMS.map((c) => `<tr><td>${esc(c.claim)}</td><td>${c.sourceIds.length ? c.sourceIds.map((id) => { const r = srcList.find((x) => x.id === id); return `<a href="${esc(r.url)}">${esc(r.organization)}</a>`; }).join('<br>') : 'none'}</td><td class="b-${c.basis}"><b>${esc(c.basis)}</b></td><td>${esc(c.note)}</td><td>${esc(c.usedBy.join(', ') || 'not used yet')}</td></tr>`).join('')}</table></div>
<div class="box"><h4>Photographs, provenance and licence</h4><table class="sans st"><tr><th>Image</th><th>iNaturalist photo</th><th>Licence</th><th>Crop of</th><th>Drafter’s reading</th><th>Used in</th></tr>${Object.entries(BOSS_IMAGES).filter(([, im]) => im.src).map(([id, im]) => { const cl = PHOTO_CLUES[id]; const uses = CHALLENGE_BANK.filter((q) => [q.media, q.correct, ...q.distractors].includes(id)).map((q) => q.id); return `<tr><td><code>${id}</code></td><td><a href="https://www.inaturalist.org/photos/${im.inatPhotoId}">${im.inatPhotoId}</a></td><td>${esc(im.licence.toUpperCase())}</td><td>${im.cropOf ? esc(im.cropOf) + ' [' + im.crop.join(', ') + '] %' : '—'}</td><td>${cl ? `leaves ${cl.leaves}, flower ${cl.flower}, seed head ${cl.seedHead}${cl.note ? '. ' + esc(cl.note) : ''}` : '—'}</td><td>${esc(uses.join(', ') || 'none')}</td></tr>`; }).join('')}</table>
<p class="sans"><small>Crops are made by <code>scripts/build_boss_crops.mjs</code> from the files named, so they can be regenerated. Photographer names are not recorded in the repository; CC0 needs no attribution.</small></p></div>
<nav>${order.map((a) => `<a href="#${CHALLENGE_BANK.find((q) => q.activity === a).id}">${ACT[a]}</a>`).join('')}<a href="#open">Open items</a></nav>
${sections}
<section id="key"><h2>Answer key <small>one line per question</small></h2><div class="box"><table class="sans st"><tr><th>Id</th><th>Section</th><th>Correct answer</th><th>Gate</th></tr>${CHALLENGE_BANK.map((q) => `<tr><td><code>${q.id}</code></td><td>${ACT[q.activity]}</td><td>${q.kind === 'quick-pick' ? esc(q.correct) : q.kind === 'spot-feature' ? esc(REGION_LABELS[q.correct] ?? q.correct) + ' (tap)' : esc(q.correct) + ' (picture)'}</td><td>${q.requires?.length ? esc(q.requires.join(', ')) : 'none'}</td></tr>`).join('')}</table></div></section>
<section id="open"><h2>Open items</h2>
<div class="box sans"><h4>1. The retired d-bud photograph</h4><p>No question uses it any more. ${photo('d-bud').replace('<figure', '<figure style="max-width:300px"')}It shows a closed head with withered yellow tips and a pale tuft on top, which may be a spent bloom. It is kept on disk only. If you can say what it shows, that settles whether it could ever be reused.</p></div>
<div class="box sans"><h4>2. Cat’s-ear photograph: independent identification review</h4><p>iNaturalist photo 69472306 (<i>Hypochaeris radicata</i>, CC0, Lilesville NC, 2020-04-26): ${photo('c-branched').replace('<figure', '<figure style="max-width:300px"')}Gates: <code>cats-ear-independent-id-review</code>, <code>cats-ear-branch-photo</code>.<br><br>☐ Approve   ☐ Reject</p></div>
<div class="box sans"><h4>3. Cat’s-ear wording</h4><p>Current curated note: “Dandelion flower stalks are single and unbranched, rising straight from the basal rosette. Cat’s-ear has branched or several flowering stems. Branching is a useful clue, not proof of which species it is: check the leaves and the bracts under the flower head too.” This follows the one page read (“branched or several flowering stems”, hairier and more deeply lobed leaves, outer bracts not curved downward). Please rule on it. Gate: <code>cats-ear-wording-reviewed</code>.</p></div>
<div class="box sans"><h4>4. Roadside photographs</h4><p>hb.curb, hb.curb2 and tr.curb: are the small yellow flowers dandelion? Gate: <code>roadside-species-evidence</code>.</p></div>
<div class="box sans"><h4>5. Sources and the WSU address</h4><p>Open the five sources and confirm each claim row. Replace or remove the broken WSU HortSense address, and read World Flora Online.</p></div>
<div class="box sans"><h4>6. Formal review</h4><p>This packet records drafts only. A formal approval needs a reviewer’s name and a date against each question id.</p><p>Name and credentials: ______________________   Date: ______________</p></div></section>
</main></body></html>`;
writeFileSync('docs/boss-form-reviewer-packet.html', html);
console.log('questions', total, 'disabled', off, 'images', used.size, 'bytes', html.length);
