import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BOSS_PILOT,
  CHALLENGE_ACTIVITIES,
  PASS_MARKS,
  STAGE_RULES,
  PREREQUISITE_ACTIVITIES,
  mayAttempt,
  type ActivityId,
} from './boss-form';
import { ACTIVE_CHALLENGES, BOSS_SPECIES, CHALLENGE_BANK } from './challenge-bank';
import { CATS_EAR_CLAIMS, DANDELION_CLAIMS, PHOTO_CLUES } from './challenge-claims';
import { getSource } from './sources';
import { BOSS_IMAGES, REGION_LABELS, regionAt } from './boss-images';
import { stageGuessOdds } from './challenge-odds';
import {
  CHALLENGE_REVIEWS,
  READY_ASSETS,
  buildChallenge,
  evaluateSubmission,
  isAvailable,
  isServable,
} from './mastery-challenges';
import { FIELD_NOTES } from './card-field-notes';

const DANDELION = 'taraxacum-officinale';
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const all: ReadonlySet<ActivityId> = new Set(PREREQUISITE_ACTIVITIES);
const PREVIEW = { includeUnreviewed: true } as const;
const words = (text: string) => text.trim().split(/\s+/).length;

describe('thresholds are the approved ones', () => {
  it('pins them', () => {
    expect(STAGE_RULES).toEqual({
      'part-spotter': { played: 3, pool: 4, need: 2 },
      compare: { played: 2, pool: 3, need: 2 },
      'habitat-season': { played: 2, pool: 3, need: 2 },
      'boss-trial': { played: 5, pool: 6, need: 4 },
    });
    expect(PASS_MARKS['boss-trial']).toEqual({ need: 4, of: 5 });
  });
  it('no migration or function holds a threshold', () => {
    const sql = readFileSync('supabase/migrations/0012_boss_forms.sql', 'utf8');
    expect(strip(sql.replace(/--.*$/gm, ''))).not.toMatch(/pass|need|score|threshold/i);
  });
  it('the pilot is Dandelion only, and the plant list always equals the content registry', () => {
    expect([...BOSS_PILOT]).toEqual([DANDELION]);
    expect([...BOSS_PILOT].sort()).toEqual(BOSS_SPECIES.map((x) => x.herbId).sort());
  });
  it('boss-form.ts, shipped in every build, never imports a question bank', () => {
    expect(strip(readFileSync('src/lib/boss-form.ts', 'utf8'))).not.toMatch(/challenge-bank|boss-species/);
  });
});

describe('nothing unreviewed can be served or awarded', () => {
  it('has no sign-offs today, so nothing is servable', () => {
    expect(Object.keys(CHALLENGE_REVIEWS)).toHaveLength(0);
    expect(CHALLENGE_BANK.every((item) => !isServable(item))).toBe(true);
    for (const activity of CHALLENGE_ACTIVITIES) {
      expect(buildChallenge(DANDELION, activity, 0)).toBeNull();
    }
  });

  it('a draft can only be previewed with the explicit client-side option', () => {
    expect(buildChallenge(DANDELION, 'part-spotter', 0, PREVIEW)).not.toBeNull();
    expect(buildChallenge(DANDELION, 'habitat-season', 0, PREVIEW)).not.toBeNull();
  });

  it('the server decision never takes either test option, so a draft cannot earn anything', () => {
    const source = strip(readFileSync('src/lib/mastery-challenges.ts', 'utf8'));
    const decision = source.slice(source.indexOf('export function evaluateSubmission'));
    expect(decision).not.toMatch(/includeUnreviewed|includeUnavailable/);
    const verdict = evaluateSubmission(
      { herbId: DANDELION, activity: 'part-spotter', attempt: 0, answers: [[0], [0], [0], [0]] },
      { mastered: true, completed: new Set() },
    );
    expect(verdict).toEqual({ ok: false, reason: 'unavailable' });
  });
});

describe('items that need something missing are disabled', () => {
  it('nothing is ready today', () => {
    expect(READY_ASSETS.size).toBe(0);
  });
  it('every cat’s-ear item requires the missing pieces, and is not built even in preview', () => {
    const cats = CHALLENGE_BANK.filter((item) =>
      [item.correct, ...item.distractors, item.media ?? ''].some((id) => id.startsWith('c-')) ||
      /fork|branch/i.test(item.prompt),
    );
    expect(cats.length).toBeGreaterThanOrEqual(5);
    for (const item of cats) {
      expect(isAvailable(item), item.id).toBe(false);
      expect(item.requires?.length, item.id).toBeGreaterThan(0);
    }
    // The cat’s-ear comparisons are disabled. Compare is built from its dandelion-only drafts.
    expect(buildChallenge(DANDELION, 'compare', 0, PREVIEW)).toHaveLength(2);
    expect(buildChallenge(DANDELION, 'compare', 0)).toBeNull();
    // The Trial's own cat's-ear items are disabled too, but its other drafts now fill it, so a
    // DEVELOPMENT preview can build it. The server never can: nothing is reviewed.
    expect(buildChallenge(DANDELION, 'boss-trial', 0, PREVIEW)).toHaveLength(5);
    expect(buildChallenge(DANDELION, 'boss-trial', 0)).toBeNull();
  });
  it('any item pointing at a photograph that has no file is disabled', () => {
    for (const item of CHALLENGE_BANK) {
      const ids = [item.media, item.correct, ...item.distractors].filter(
        (id): id is string => typeof id === 'string' && id in BOSS_IMAGES,
      );
      if (ids.some((id) => !BOSS_IMAGES[id]!.src)) {
        expect(isAvailable(item), `${item.id} uses a photo with no file`).toBe(false);
      }
    }
  });
});

describe('the bank is derived from curated notes, not invented', () => {
  const notes = FIELD_NOTES[DANDELION]!;
  const corpus = JSON.stringify(notes).replace(/\\"/g, '"');
  it('every item tests a phrase that is still in the curated Dandelion notes', () => {
    for (const item of CHALLENGE_BANK) {
      expect(corpus, item.id).toContain(item.fact);
      if (item.alsoFact) expect(corpus, item.id).toContain(item.alsoFact);
    }
  });
  it('every item cites a source and has distinct answers, by kind', () => {
    const counts = { 'pick-picture': 2, 'spot-feature': 3, showdown: 1 } as const;
    for (const item of CHALLENGE_BANK) {
      expect(item.sources.length, item.id).toBeGreaterThan(0);
      expect(new Set([item.correct, ...item.distractors]).size, item.id).toBe(
        1 + item.distractors.length,
      );
      if (item.kind === 'quick-pick') {
        expect([1, 2], item.id).toContain(item.distractors.length);
      } else {
        expect(item.distractors.length, item.id).toBe(counts[item.kind]);
      }
    }
  });
  it('stays short: nine-word prompts, eighteen-word feedback, five-word text answers', () => {
    for (const item of CHALLENGE_BANK) {
      expect(words(item.prompt), item.id).toBeLessThanOrEqual(9);
      expect(words(item.feedback), item.id).toBeLessThanOrEqual(18);
      if (item.kind === 'quick-pick') {
        for (const text of [item.correct, ...item.distractors]) {
          expect(words(text), `${item.id}: ${text}`).toBeLessThanOrEqual(5);
        }
      }
    }
  });
  it('asks nothing about eating, safety or medicine, and never uses "hollow" as a difference', () => {
    const banned = /\b(edib\w*|eat|eaten|consum\w*|safe|safety|dose|dosage|treat\w*|cure|remed\w*|medic\w*|poison\w*|toxic|forag\w*|harvest\w*|taste|tea|tincture)\b/i;
    for (const item of CHALLENGE_BANK) {
      const text = [item.prompt, item.feedback, ...(item.kind === 'quick-pick' ? [item.correct, ...item.distractors] : [])].join(' ');
      expect(text, item.id).not.toMatch(banned);
      if (item.activity === 'compare' || item.requires) expect(text, item.id).not.toMatch(/hollow/i);
    }
  });
  it('uses the wording corrected after the source check, never "leafy" stems', () => {
    for (const item of CHALLENGE_BANK) expect(item.prompt + item.feedback, item.id).not.toMatch(/leafy/i);
  });
  it('the ACTIVE pool is exactly the template, and every archived question is kept', () => {
    const species = BOSS_SPECIES[0]!;
    expect(species.active).toHaveLength(16);
    expect(species.archived).toHaveLength(19);
    expect(CHALLENGE_BANK).toHaveLength(35);
    for (const [activity, rule] of Object.entries(STAGE_RULES) as [ActivityId, { pool: number }][]) {
      expect(species.active.filter((i) => i.activity === activity), activity).toHaveLength(rule.pool);
    }
  });
  it('the Trial reuses no activity prompt', () => {
    const activityPrompts = new Set(
      CHALLENGE_BANK.filter((i) => i.activity !== 'boss-trial').map((i) => i.prompt),
    );
    for (const item of CHALLENGE_BANK.filter((i) => i.activity === 'boss-trial')) {
      expect(activityPrompts.has(item.prompt), item.id).toBe(false);
    }
  });
});

describe('the photographs', () => {
  it('are CC0, exist on disk, and every referenced image is registered', () => {
    for (const [id, image] of Object.entries(BOSS_IMAGES)) {
      expect(image.licence, id).toBe('cc0');
      if (image.src) expect(existsSync(`public${image.src}`), id).toBe(true);
    }
    for (const item of CHALLENGE_BANK) {
      if (item.kind === 'pick-picture' || item.kind === 'showdown') {
        for (const id of [item.correct, ...item.distractors]) expect(BOSS_IMAGES[id], `${item.id}: ${id}`).toBeDefined();
      }
      if (item.media) expect(BOSS_IMAGES[item.media], `${item.id}: media`).toBeDefined();
    }
  });
  it('give every tap question regions for each of its options, and no others', () => {
    for (const item of CHALLENGE_BANK.filter((i) => i.kind === 'spot-feature')) {
      const regions = Object.keys(BOSS_IMAGES[item.media!]!.regions ?? {});
      for (const option of [item.correct, ...item.distractors]) {
        expect(regions, `${item.id}: ${option}`).toContain(option);
        expect(REGION_LABELS[option], option).toBeDefined();
      }
    }
  });
  it('turn a tap into the region under it, or nothing', () => {
    expect(regionAt('d-flower-open', 50, 40)).toBe('head');
    expect(regionAt('d-seed-stalk', 50, 70)).toBe('stalk');
    expect(regionAt('d-seed-stalk', 99, 2)).toBeNull();
    expect(regionAt('no-such-image', 1, 1)).toBeNull();
  });
});

describe('the gate: mastery first, then the three prerequisites', () => {
  it('refuses an unmastered player, a non-pilot herb and a trial without prerequisites', () => {
    expect(mayAttempt(DANDELION, 'part-spotter', { mastered: false, completed: new Set() })).toEqual({ ok: false, reason: 'not-mastered' });
    expect(mayAttempt('urtica-dioica', 'part-spotter', { mastered: true, completed: new Set() })).toEqual({ ok: false, reason: 'not-in-pilot' });
    expect(mayAttempt(DANDELION, 'boss-trial', { mastered: true, completed: new Set(['part-spotter']) })).toEqual({ ok: false, reason: 'prerequisites-missing' });
    expect(mayAttempt(DANDELION, 'boss-trial', { mastered: true, completed: all })).toEqual({ ok: true });
  });
  it('rejects unknown activities and non-numeric attempts', () => {
    const standing = { mastered: true, completed: all };
    expect(evaluateSubmission({ herbId: DANDELION, activity: 'x', attempt: 0, answers: [] }, standing)).toEqual({ ok: false, reason: 'unknown-activity' });
    expect(evaluateSubmission({ herbId: DANDELION, activity: 'compare', attempt: '0', answers: [] }, standing)).toEqual({ ok: false, reason: 'bad-attempt' });
  });
});

describe('the exception stays separate from the card check', () => {
  it('neither module imports the other', () => {
    const check = readFileSync('src/lib/knowledge-check.ts', 'utf8');
    const challenges = readFileSync('src/lib/mastery-challenges.ts', 'utf8');
    expect(check).not.toMatch(/mastery-challenges|challenge-bank|boss-form/);
    expect(strip(challenges)).not.toMatch(/knowledge-check/);
  });
  it('the existing card-check guard is unchanged', () => {
    const test = readFileSync('src/lib/knowledge-check.test.ts', 'utf8');
    expect(test).toContain('/heal|treat|cure|remed|safe|edible|eat|dose|medic|identif|poison/i');
  });
});

describe('the preliminary botanical review changed wording, never gates', () => {
  const by = (id: string) => CHALLENGE_BANK.find((i) => i.id === id)!;
  it('nothing is approved and nothing is ready', () => {
    expect(Object.keys(CHALLENGE_REVIEWS)).toEqual([]);
    expect(READY_ASSETS.size).toBe(0);
    for (const item of CHALLENGE_BANK) expect(isServable(item), item.id).toBe(false);
  });
  it('keeps every question id the bank had', () => {
    expect(CHALLENGE_BANK.length).toBe(35);
  });
  it('the roadside questions stay disabled pending better species evidence', () => {
    for (const id of ['hb.curb', 'hb.curb2', 'tr.curb']) {
      expect(by(id).requires, id).toContain('roadside-species-evidence');
      expect(isAvailable(by(id)), id).toBe(false);
    }
  });
  it('the cat’s-ear photo questions also wait for an independent identification review', () => {
    for (const id of ['cp.single', 'cp.branch', 'tr.single', 'tr.branch']) {
      expect(by(id).requires, id).toContain('cats-ear-independent-id-review');
    }
  });
  it('branching is only ever offered as a clue, never as proof', () => {
    for (const id of ['cp.single', 'cp.branch', 'cp.forks', 'tr.single', 'tr.branch']) {
      expect(by(id).feedback, id).toMatch(/clue/i);
      expect(by(id).feedback, id).not.toMatch(/\b(always|definitely|only)\b/i);
    }
  });
  it('the wind questions ask for the MAIN mechanism', () => {
    for (const id of ['ps.wind', 'tr.wind']) {
      expect(`${by(id).prompt} ${by(id).correct}`, id).toMatch(/main/i);
    }
  });
  it('hb.puff no longer offers the bud, which the puff also grew from', () => {
    expect(by('hb.puff').distractors).not.toContain('d-bud');
  });
  it('compacted soil is worded as tolerance', () => {
    for (const id of ['hb.trampled', 'tr.packed']) {
      expect(by(id).feedback, id).toMatch(/can tolerate compacted soil/i);
    }
  });
  it('ps.stalk talks about the seed head its photograph shows', () => {
    expect(by('ps.stalk').prompt + by('ps.stalk').feedback).toMatch(/seed head/i);
  });
  it('cat’s-ear sources exist in the registry and none is claimed verified', () => {
    for (const item of CHALLENGE_BANK) {
      for (const id of item.sources) {
        const src = getSource(id);
        expect(src, `${item.id} cites unknown source ${id}`).toBeDefined();
        expect(src!.verified, id).toBe(false);
      }
    }
  });
  it('every question traces to a mapped claim, and no source is claimed verified', () => {
    const mapped = new Set([...DANDELION_CLAIMS, ...CATS_EAR_CLAIMS].flatMap((c) => c.usedBy));
    for (const item of CHALLENGE_BANK) expect(mapped.has(item.id), `${item.id} has no claim row`).toBe(true);
    for (const c of DANDELION_CLAIMS) for (const id of c.sourceIds) expect(getSource(id)?.verified, id).toBe(false);
  });
  it('no claim is marked read, because nobody has opened these pages yet', () => {
    for (const c of CATS_EAR_CLAIMS) expect(c.basis, c.id).not.toBe('read');
    for (const c of CATS_EAR_CLAIMS) for (const id of c.sourceIds) expect(getSource(id), id).toBeDefined();
  });
});

const V1_IDS = [
  'ps.rosette', 'ps.stalk', 'ps.clock', 'ps.sap', 'ps.leaves2', 'ps.flower2', 'ps.seedhead2', 'ps.wind',
  'cp.single', 'cp.branch', 'cp.forks',
  'hb.curb', 'hb.trampled', 'hb.puff', 'hb.curb2', 'hb.bloom2',
  'tr.rosette', 'tr.clock', 'tr.flower', 'tr.single', 'tr.branch', 'tr.curb', 'tr.puff', 'tr.packed', 'tr.wind', 'tr.sap',
];

describe('version 3: complete pools, nothing player-visible', () => {
  const ids = CHALLENGE_BANK.map((i) => i.id);
  const draft = { includeUnreviewed: true } as const;
  it('keeps all 26 original ids and adds only new ones', () => {
    for (const id of V1_IDS) expect(ids, id).toContain(id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length - V1_IDS.length).toBe(9);
  });
  it('every stage has exactly its pool of ungated ACTIVE drafts, and builds for every attempt', () => {
    for (const [activity, rule] of Object.entries(STAGE_RULES) as [ActivityId, { played: number; pool: number }][]) {
      const eligible = ACTIVE_CHALLENGES.filter((i) => i.activity === activity && isAvailable(i));
      expect(eligible, activity).toHaveLength(rule.pool);
      for (let attempt = 0; attempt < 2 * rule.pool; attempt += 1) {
        expect(buildChallenge(DANDELION, activity, attempt, draft), `${activity} #${attempt}`).toHaveLength(rule.played);
      }
    }
  });
  it('Compare has its three ungated drafts, and still cannot be served', () => {
    const compare = ACTIVE_CHALLENGES.filter((i) => i.activity === 'compare' && isAvailable(i));
    expect(compare.map((i) => i.id).sort()).toEqual(['cp.rosette', 'cp.seedstalk', 'cp.stages']);
    expect(buildChallenge(DANDELION, 'compare', 0, draft)).toHaveLength(2);
    expect(buildChallenge(DANDELION, 'compare', 0)).toBeNull();
  });
  it('the roadside and cat’s-ear questions are still gated', () => {
    for (const id of ['hb.curb', 'hb.curb2', 'tr.curb', 'cp.single', 'cp.branch', 'cp.forks', 'tr.single', 'tr.branch']) {
      expect(isAvailable(CHALLENGE_BANK.find((i) => i.id === id)!), id).toBe(false);
    }
  });
  it('no draft is servable or can award: every activity is unavailable to the server, even for a mastered player', () => {
    for (const item of CHALLENGE_BANK) expect(isServable(item), item.id).toBe(false);
    for (const activity of ['part-spotter', 'compare', 'habitat-season', 'boss-trial'] as const) {
      expect(buildChallenge(DANDELION, activity, 0)).toBeNull();
      const standing = { mastered: true, completed: new Set<ActivityId>(['part-spotter', 'compare', 'habitat-season']) };
      const decision = evaluateSubmission({ herbId: DANDELION, activity, attempt: 0, answers: [[0]] }, standing);
      expect(decision, activity).toEqual({ ok: false, reason: 'unavailable' });
    }
  });
  it('the production flag stays pinned OFF', () => {
    const config = readFileSync('next.config.ts', 'utf8');
    expect(config).toMatch(/NEXT_PUBLIC_BOSS_FORMS\s*\?\?\s*'off'/);
    for (const file of ['.github/workflows/deploy.yml']) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/NEXT_PUBLIC_BOSS_FORMS:\s*(\S+)/g)) expect(m[1], file).toMatch(/^'?off'?$/);
    }
  });
  it('an answer photograph never contains the feature a question asks for, per the written readings', () => {
    const by = (id: string) => CHALLENGE_BANK.find((i) => i.id === id)!;
    const clues = (id: string) => PHOTO_CLUES[id]!;
    // Leaf questions: no wrong picture may show a leaf.
    for (const id of ['ps.rosette', 'ps.leaves2']) for (const d of by(id).distractors) expect(clues(d).leaves, `${id}: ${d}`).toBe(false);
    // Seed-head questions: no wrong picture may show, or possibly show, a seed head.
    for (const id of ['ps.clock', 'ps.seedhead2', 'tr.clock', 'hb.bloom2', 'tr.puff', 'cp.stages']) {
      for (const d of by(id).distractors) expect(clues(d).seedHead === true, `${id}: ${d}`).toBe(false);
      expect(clues(by(id).correct).seedHead, id).toBe(true);
    }
    // Two-clue Trial questions.
    const rf = by('tr.rosflower');
    expect([clues(rf.correct).leaves, clues(rf.correct).flower]).toEqual([true, true]);
    for (const d of rf.distractors) expect(clues(d).leaves === true && clues(d).flower === true, d).toBe(false);
    const nf = by('tr.noflower');
    expect([clues(nf.correct).leaves, clues(nf.correct).flower, clues(nf.correct).seedHead]).toEqual([true, false, false]);
    for (const d of nf.distractors) expect(clues(d).flower === true || clues(d).seedHead === true, d).toBe(true);
    // tr.flowerbare is a quick pick about the stalk in its own photograph, not a picture hunt.
    const fb = by('tr.flowerbare');
    expect(fb.kind).toBe('quick-pick');
    expect(fb.media).toBe('d-plant-stalk');
    expect(fb.correct).toBe('No, only at the base');
  });
  it('a crop keeps its parent’s photograph id and licence, and its file exists', () => {
    for (const [id, image] of Object.entries(BOSS_IMAGES).filter(([, i]) => i.cropOf)) {
      const parent = BOSS_IMAGES[image.cropOf!]!;
      expect(image.inatPhotoId, id).toBe(parent.inatPhotoId);
      expect(image.licence, id).toBe(parent.licence);
      expect(image.crop, id).toHaveLength(4);
      expect(existsSync(`public${image.src}`), id).toBe(true);
    }
  });
  it('no photograph is the CORRECT answer of two Trial questions', () => {
    const seen = new Map<string, string>();
    for (const item of CHALLENGE_BANK.filter((i) => i.activity === 'boss-trial' && isAvailable(i) && i.kind === 'pick-picture')) {
      expect(seen.get(item.correct), `${item.id} repeats ${item.correct}`).toBeUndefined();
      seen.set(item.correct, item.id);
    }
  });
});

describe('version 4: Compare, the bud photograph, Habitat odds and cat’s-ear wording', () => {
  const by = (id: string) => CHALLENGE_BANK.find((i) => i.id === id)!;
  const clues = (id: string) => PHOTO_CLUES[id]!;
  it('the new Compare questions are dandelion-only and two-observation, and the originals keep their gates', () => {
    for (const id of ['cp.rosette', 'cp.seedstalk', 'cp.stages']) {
      const item = by(id);
      expect(item.kind, id).toBe('pick-picture');
      expect(item.distractors, id).toHaveLength(2);
      expect(item.requires, id).toBeUndefined();
      for (const photo of [item.correct, ...item.distractors]) expect(photo.startsWith('c-'), `${id}: ${photo}`).toBe(false);
    }
    // Every Compare prompt asks which PICTURE SHOWS something, never what the plant lacks, so a
    // feature that is merely out of frame cannot make a wrong picture right.
    for (const id of ['cp.rosette', 'cp.seedstalk', 'cp.stages']) {
      expect(by(id).prompt, id).toMatch(/^Which shows/);
      expect(by(id).prompt, id).not.toMatch(/\b(no|not|without|only|but)\b/i);
    }
    const ro = by('cp.rosette');
    expect(clues(ro.correct).leaves).toBe(true);
    for (const d of ro.distractors) expect(clues(d).leaves, d).toBe(false);
    const ss = by('cp.seedstalk');
    expect(clues(ss.correct).seedHead).toBe(true);
    for (const d of ss.distractors) expect(clues(d).seedHead, d).toBe(false);
    const st = by('cp.stages');
    expect(clues(st.correct).seedHead).toBe(true);
    for (const d of st.distractors) expect(clues(d).seedHead, d).toBe(false);
    for (const id of ['cp.single', 'cp.branch', 'cp.forks']) expect(isAvailable(by(id)), id).toBe(false);
  });
  it('no question uses the unresolved d-bud photograph, and nothing calls it a bud', () => {
    for (const item of CHALLENGE_BANK) {
      expect([item.media, item.correct, ...item.distractors], item.id).not.toContain('d-bud');
    }
    expect(BOSS_IMAGES['d-bud']!.alt).not.toMatch(/\bbud\b/i);
    expect(clues('d-bud').flower).toBe('unclear');
  });
  it('Habitat guess odds are computed from the implemented scoring: three options, no second chance', () => {
    const habitat = ACTIVE_CHALLENGES.filter((i) => i.activity === 'habitat-season');
    for (const item of habitat) expect(1 + item.distractors.length, item.id).toBe(3);
    const byHand = 3 ** -2; // two of two right, each a one-in-three guess
    expect(stageGuessOdds(DANDELION, 'habitat-season')!.average).toBeCloseTo(byHand, 12);
    expect(byHand).toBeCloseTo(0.111, 3);
  });
  it('cat’s-ear wording follows the one source that was read, and no more', () => {
    const notes = JSON.stringify(FIELD_NOTES[DANDELION]);
    expect(notes).toContain('branched or several flowering stems');
    const text = [notes, ...CHALLENGE_BANK.map((i) => `${i.prompt} ${i.feedback}`)].join(' ');
    expect(text).not.toMatch(/usually branch/i);
    expect(text).not.toMatch(/largely leafless/i);
    expect(text).not.toMatch(/small bracts/i);
    for (const id of ['cp.single', 'cp.branch', 'cp.forks', 'tr.single', 'tr.branch']) {
      expect(by(id).requires?.length, id).toBeGreaterThan(0);
      expect(by(id).feedback, id).toMatch(/clue/i);
    }
  });
});

describe('independent review addendum', () => {
  const by = (id: string) => CHALLENGE_BANK.find((i) => i.id === id)!;
  it('no trial prompt asks about what a plant lacks, because a feature can be out of frame', () => {
    for (const id of ['tr.noflower', 'tr.rosflower']) expect(by(id).prompt, id).toMatch(/picture/i);
    expect(by('tr.noflower').feedback).toMatch(/in view/);
  });
  it('Habitat distractors are realistic: no water, caves or underwater ground', () => {
    const habitat = CHALLENGE_BANK.filter((i) => i.activity === 'habitat-season');
    for (const item of habitat) {
      for (const text of [item.correct, ...item.distractors].filter((t) => !t.startsWith('d-'))) {
        expect(text, `${item.id}: ${text}`).not.toMatch(/water|cave|underwater|ocean|lake/i);
      }
    }
    expect(by('hb.sunny').correct).toBe('Full sun');
    expect(by('hb.sunny').feedback).toMatch(/tolerate shade/);
  });
  it('identification-flavoured feedback never lets one feature stand for the species', () => {
    const single = ['ps.rosette', 'ps.leaves2', 'ps.clock', 'ps.sap', 'ps.flower2', 'ps.seedhead2', 'tr.rosette', 'tr.clock', 'tr.flower', 'tr.sap', 'tr.flowerbare', 'cp.rosette', 'cp.seedstalk'];
    for (const id of single) {
      expect(by(id).feedback, id).toMatch(/(other plants|many plants|related|alone|one clue|not proof|several clues|more clues|other clues)/i);
    }
    for (const item of CHALLENGE_BANK) {
      expect(`${item.prompt} ${item.feedback}`, item.id).not.toMatch(/\b((this|that|it) is a dandelion|proves|confirms it|always|definitely|certainly)\b/i);
    }
  });
  it('the unread MSU page is recorded as unread, and nothing here is verified', () => {
    expect(getSource('msu-extension-dandelion')?.note).toMatch(/^NOT read/);
    for (const id of ['cornell-cals-dandelion', 'cornell-weedid-dandelion', 'unce-dandelion-guide', 'msu-extension-dandelion']) {
      expect(getSource(id)?.verified, id).toBe(false);
    }
  });
});
