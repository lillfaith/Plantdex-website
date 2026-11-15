import type { ActivityId } from './boss-form';

/**
 * DRAFT QUESTION BANK. EVERY ITEM HERE IS UNREVIEWED.
 *
 * Nothing in this file is served to a player. `mastery-challenges.ts` serves an item only
 * when `CHALLENGE_REVIEWS` carries a named reviewer and a date for its id AND every asset the
 * item `requires` is ready. A drafted question is a claim about a plant; the pilot is not
 * allowed to make one until a qualified botanical reviewer has checked the claim, its sources
 * and its photographs.
 *
 * EVERY ANSWER IS AN INDEX INTO `options`, WHATEVER THE FORMAT. That is what lets four formats
 * share one server scorer: a picture is an image id, a tapped part is a region id (the screen
 * turns a tap into a region; the server never sees coordinates), and a quick pick is a short
 * text. Images live in `boss-images.ts`, which the server does not need.
 *
 * Each item names the `fact` it tests: a phrase that must still appear in the curated notes
 * (`card-field-notes.ts`), and a test asserts it does. Nothing is invented. Photographs are
 * CC0 iNaturalist photographs only; a decorative sprite is never an answer image.
 *
 * ITEMS THAT DEPEND ON SOMETHING MISSING carry `requires`, and stay disabled until it exists:
 *   cats-ear-branch-photo      a licensed photograph clearly showing a branched cat's-ear stem
 *   cats-ear-wording-reviewed  a reviewer's ruling on the cat's-ear wording (the old note said
 *                              "branched LEAFY flowering stems"; the corrected wording is
 *                              "usually branched, largely leafless, with small bracts", and
 *                              branching is a clue, never proof of species)
 *   cats-ear-independent-id-review  an independent confirmation that the cat's-ear photograph
 *                              really shows Hypochaeris radicata
 *   roadside-species-evidence  better evidence that the small yellow flowers in the two roadside
 *                              photographs are dandelion and not another yellow daisy-family
 *                              plant
 *
 * THE PRELIMINARY REVIEW IS NOT AN APPROVAL. Wording here follows a preliminary botanical
 * review, which is why it changed; it has not put a name in `CHALLENGE_REVIEWS`, and nothing
 * here is formally approved.
 */
export type ChallengeKind = 'pick-picture' | 'spot-feature' | 'showdown' | 'quick-pick';
export type ChallengeCategory = 'visual' | 'applied' | 'recall';

export interface ChallengeItem {
  readonly id: string;
  readonly herbId: string;
  readonly activity: ActivityId;
  readonly kind: ChallengeKind;
  readonly category: ChallengeCategory;
  /** Up to nine words. */
  readonly prompt: string;
  /** A picture shown with the question: the photograph to tap on, or the puff to match. */
  readonly media?: string;
  /** Image id, region id or short text, by kind. The builder shuffles it in. */
  readonly correct: string;
  /** One for a showdown, two or three otherwise. */
  readonly distractors: readonly string[];
  /** One sentence, up to eighteen words. */
  readonly feedback: string;
  readonly sources: readonly string[];
  /** A phrase from the curated notes this item tests. */
  readonly fact: string;
  /** A second phrase, for an item that needs two observations to answer. Also from the notes. */
  readonly alsoFact?: string;
  readonly requires?: readonly string[];
}

const DANDELION = 'taraxacum-officinale';
const SRC = ['wisc-dandelion', 'umn-dandelions'] as const;
const CAT = [
  'cats-ear-branch-photo',
  'cats-ear-wording-reviewed',
  'cats-ear-independent-id-review',
] as const;
/** Cat's-ear claims from sources the drafter has not read; see `challenge-claims.ts`. */
const CATSRC = [
  ...SRC,
  'wfo-hypochaeris-radicata',
  'wsu-hortsense-catsear',
  'wsu-hosted-usfs-treatment-guide',
] as const;
/** A roadside photograph whose species has not been confirmed by independent review. */
const ROADSIDE = ['roadside-species-evidence'] as const;
const CAT_WORDING = ['cats-ear-wording-reviewed'] as const;

export const CHALLENGE_BANK: readonly ChallengeItem[] = [
  // ── Part Spotter: four are asked, the rest are the second chances ─────────────────────
  {
    id: 'ps.rosette',
    herbId: DANDELION,
    activity: 'part-spotter',
    kind: 'pick-picture',
    category: 'visual',
    prompt: 'Find the leaf rosette.',
    correct: 'd-rosette-leaf',
    distractors: ['d-flower-crop', 'd-seed-head'],
    feedback: 'A low ring of toothed leaves. Many plants form rosettes, so check other clues too.',
    sources: SRC,
    fact: 'Low rosette of deeply toothed or lobed leaves',
  },
  {
    id: 'ps.stalk',
    herbId: DANDELION,
    activity: 'part-spotter',
    kind: 'spot-feature',
    category: 'visual',
    prompt: 'Tap the stalk holding the seed head.',
    media: 'd-seed-stalk',
    correct: 'stalk',
    distractors: ['head', 'leaves', 'ground'],
    feedback: 'One bare stalk holds up the seed head, and held the flower before it.',
    sources: SRC,
    fact: 'singly on a leafless',
  },
  {
    id: 'ps.clock',
    herbId: DANDELION,
    activity: 'part-spotter',
    kind: 'pick-picture',
    category: 'visual',
    prompt: 'Find the seed ‘clock’.',
    correct: 'd-seed-head',
    distractors: ['d-rosette-crop', 'd-flower-open'],
    feedback: 'A round white seed head, mainly spread by the wind. It alone does not confirm the species.',
    sources: SRC,
    fact: 'round white wind-dispersed',
  },
  {
    id: 'ps.sap',
    herbId: DANDELION,
    activity: 'part-spotter',
    kind: 'quick-pick',
    category: 'recall',
    prompt: 'If a stalk breaks, what leaks out?',
    correct: 'Milky white sap',
    distractors: ['Clear water', 'Nothing, it is dry'],
    feedback: 'Broken stalks leak milky sap. Other plants do too, so use several clues.',
    sources: SRC,
    fact: 'milky sap',
  },
  {
    id: 'ps.leaves2',
    herbId: DANDELION,
    activity: 'part-spotter',
    kind: 'pick-picture',
    category: 'visual',
    prompt: 'Spot the dandelion leaves.',
    correct: 'd-rosette-alt',
    distractors: ['d-flowers-crop', 'd-seed-head'],
    feedback: 'Toothed leaves in a low ring. Leaves alone do not confirm the species.',
    sources: SRC,
    fact: 'Low rosette of deeply toothed or lobed leaves',
  },
  {
    id: 'ps.flower2',
    herbId: DANDELION,
    activity: 'part-spotter',
    kind: 'spot-feature',
    category: 'visual',
    prompt: 'Tap the flower head.',
    media: 'd-flowers-stalks',
    correct: 'head',
    distractors: ['stalk', 'leaves', 'ground'],
    feedback: 'One yellow head tops each stalk. Many related flowers look alike, so use more clues.',
    sources: SRC,
    fact: 'bright yellow head grows singly',
  },
  {
    id: 'ps.seedhead2',
    herbId: DANDELION,
    activity: 'part-spotter',
    kind: 'pick-picture',
    category: 'visual',
    prompt: 'Spot the white seed head.',
    correct: 'd-seed-stalk',
    distractors: ['d-rosette-alt-crop', 'd-flower-open'],
    feedback: 'Round, white and mainly spread by the wind. A white seed head alone is not proof.',
    sources: SRC,
    fact: 'round white wind-dispersed',
  },
  {
    id: 'ps.wind',
    herbId: DANDELION,
    activity: 'part-spotter',
    kind: 'quick-pick',
    category: 'applied',
    prompt: 'What is the main way the seeds spread?',
    correct: 'Mostly on the wind',
    distractors: ['Mostly floating on water', 'Mostly stuck to fur'],
    feedback: 'Wind is the main way a dandelion seed head spreads its seeds.',
    sources: SRC,
    fact: 'wind-dispersed',
  },

  // ── Compare (Lookalike Showdown): no retry, and DISABLED until the cat's-ear pieces exist ─
  {
    id: 'cp.single',
    herbId: DANDELION,
    activity: 'compare',
    kind: 'showdown',
    category: 'visual',
    prompt: 'Which has one stalk from the leaves?',
    correct: 'd-plant-stalk',
    distractors: ['c-branched'],
    feedback: 'Dandelion stalks are single and unbranched. Branching is a clue, not proof.',
    sources: CATSRC,
    fact: 'single and unbranched',
    requires: CAT,
  },
  {
    id: 'cp.branch',
    herbId: DANDELION,
    activity: 'compare',
    kind: 'showdown',
    category: 'visual',
    prompt: 'Which has branched or several flowering stems?',
    correct: 'c-branched',
    distractors: ['d-flowers-stalks'],
    feedback: 'Cat’s-ear has branched or several flowering stems. That is a clue, not proof.',
    sources: CATSRC,
    fact: 'single and unbranched',
    requires: CAT,
  },
  {
    id: 'cp.forks',
    herbId: DANDELION,
    activity: 'compare',
    kind: 'quick-pick',
    category: 'applied',
    prompt: 'A stem forks into several heads. Dandelion?',
    correct: 'Probably not',
    distractors: ['Yes, that is dandelion'],
    feedback: 'Probably not: dandelion has one flowering stem. Branching is a clue, not proof.',
    sources: CATSRC,
    fact: 'single and unbranched',
    requires: CAT_WORDING,
  },

  {
    id: 'cp.rosette',
    herbId: DANDELION,
    activity: 'compare',
    kind: 'showdown',
    category: 'visual',
    prompt: 'Which shows leaves growing in a low ring?',
    correct: 'd-rosette-leaf',
    distractors: ['d-flower-crop'],
    feedback: 'A rosette is a low ring of leaves. Many plants form rosettes, so it is one clue.',
    sources: SRC,
    fact: 'Low rosette of deeply toothed or lobed leaves',
  },
  {
    id: 'cp.seedstalk',
    herbId: DANDELION,
    activity: 'compare',
    kind: 'showdown',
    category: 'visual',
    prompt: 'Which shows a seed head on a stalk?',
    correct: 'd-seed-stalk',
    distractors: ['d-rosette-crop'],
    feedback: 'The seed head sits on a bare stalk. A white seed head alone does not confirm the species.',
    sources: SRC,
    fact: 'round white wind-dispersed',
    alsoFact: 'singly on a leafless',
  },
  {
    id: 'cp.stages',
    herbId: DANDELION,
    activity: 'compare',
    kind: 'showdown',
    category: 'visual',
    prompt: 'Which shows the stage after flowering?',
    correct: 'd-seed-head',
    distractors: ['d-flower-crop'],
    feedback: 'Mature flowers become round white seed heads, so the seed head comes later.',
    sources: SRC,
    fact: 'Mature flowers become round white wind-dispersed clocks',
  },

  // ── Habitat: three asked, the rest are the second chances ─────────────────────────────
  {
    id: 'hb.curb',
    herbId: DANDELION,
    activity: 'habitat-season',
    kind: 'spot-feature',
    category: 'visual',
    prompt: 'Spot the dandelions by the curb.',
    media: 'd-curb-a',
    correct: 'flowers',
    distractors: ['curb', 'road', 'grass'],
    feedback: 'Dandelions love roadsides and paths: open, sunny, disturbed ground.',
    sources: SRC,
    fact: 'roadsides',
    requires: ROADSIDE,
  },
  {
    id: 'hb.trampled',
    herbId: DANDELION,
    activity: 'habitat-season',
    kind: 'quick-pick',
    category: 'applied',
    prompt: 'Can dandelions tolerate compacted soil?',
    correct: 'Yes, they can tolerate it',
    distractors: ['No, they need loose soil', 'No, only sandy soil'],
    feedback: 'Dandelions can tolerate compacted soil.',
    sources: SRC,
    fact: 'tolerate compacted soil',
  },
  {
    id: 'hb.puff',
    herbId: DANDELION,
    activity: 'habitat-season',
    kind: 'pick-picture',
    category: 'applied',
    prompt: 'This puff used to be a…',
    media: 'd-seed-head',
    correct: 'd-flower-open',
    distractors: ['d-rosette-crop', 'd-rosette-alt-crop'],
    feedback: 'Mature flowers turn into round white seed heads.',
    sources: SRC,
    fact: 'round white wind-dispersed',
  },
  {
    id: 'hb.curb2',
    herbId: DANDELION,
    activity: 'habitat-season',
    kind: 'spot-feature',
    category: 'visual',
    prompt: 'Find the dandelions on this pavement edge.',
    media: 'd-curb-b',
    correct: 'flowers',
    distractors: ['curb', 'road', 'grass'],
    feedback: 'Paths and roadsides suit dandelions.',
    sources: SRC,
    fact: 'roadsides',
    requires: ROADSIDE,
  },
  {
    id: 'hb.bloom2',
    herbId: DANDELION,
    activity: 'habitat-season',
    kind: 'pick-picture',
    category: 'applied',
    prompt: 'A dandelion finishes blooming. What next?',
    media: 'd-flower-open',
    correct: 'd-seed-head',
    distractors: ['d-rosette-alt-crop', 'd-flowers-crop'],
    feedback: 'The flower becomes a round white seed head.',
    sources: SRC,
    fact: 'round white wind-dispersed',
  },

  {
    id: 'hb.sunny',
    herbId: DANDELION,
    activity: 'habitat-season',
    kind: 'quick-pick',
    category: 'applied',
    prompt: 'Dandelions grow best in which light?',
    correct: 'Full sun',
    distractors: ['Deep shade', 'Partial shade'],
    feedback: 'Dandelions grow best in full sun, though they tolerate shade.',
    sources: SRC,
    fact: 'open sunny places',
  },
  {
    id: 'hb.lawn',
    herbId: DANDELION,
    activity: 'habitat-season',
    kind: 'quick-pick',
    category: 'recall',
    prompt: 'Where do dandelions commonly grow?',
    correct: 'Lawns and gardens',
    distractors: ['Deep woodland interiors', 'Salt marshes'],
    feedback: 'Lawns, gardens, roadsides and parks are all typical places for dandelions.',
    sources: SRC,
    fact: 'Lawns, paths, roadsides, gardens, fields',
  },
  {
    id: 'hb.disturbed',
    herbId: DANDELION,
    activity: 'habitat-season',
    kind: 'quick-pick',
    category: 'applied',
    prompt: 'Dandelions typically colonize what ground?',
    correct: 'Disturbed ground',
    distractors: ['Undisturbed old woodland', 'Undisturbed native prairie'],
    feedback: 'Dandelions typically colonize disturbed soil, such as garden beds and thin lawns.',
    sources: SRC,
    fact: 'disturbed ground',
  },

  // ── Boss Trial: its own items, never a copy of an activity's wording or photograph ──────
  {
    id: 'tr.rosette',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'spot-feature',
    category: 'visual',
    prompt: 'Tap the ring of leaves.',
    media: 'd-plant-stalk',
    correct: 'leaves',
    distractors: ['flower', 'stalk', 'wall'],
    feedback: 'Toothed leaves in a low ring: the rosette. Many plants form rosettes.',
    sources: SRC,
    fact: 'Low rosette of deeply toothed or lobed leaves',
  },
  {
    id: 'tr.clock',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'pick-picture',
    category: 'visual',
    prompt: 'Which one is the seed head?',
    correct: 'd-seed-stalk',
    distractors: ['d-flowers-stalks', 'd-rosette-alt-crop'],
    feedback: 'Round, white, mainly wind-spread. A seed head alone does not confirm the species.',
    sources: SRC,
    fact: 'round white wind-dispersed',
  },
  {
    id: 'tr.flower',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'spot-feature',
    category: 'visual',
    prompt: 'Tap the yellow bloom.',
    media: 'd-flower-open',
    correct: 'head',
    distractors: ['stalk', 'leaves', 'ground'],
    feedback: 'One bright head per bare stalk. Related plants look similar, so use other clues.',
    sources: SRC,
    fact: 'bright yellow head grows singly',
  },
  {
    id: 'tr.single',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'showdown',
    category: 'visual',
    prompt: 'Which has one unbranched stalk?',
    correct: 'd-flowers-stalks',
    distractors: ['c-branched-2'],
    feedback: 'Dandelion stalks are single and unbranched. Branching is a clue, not proof.',
    sources: CATSRC,
    fact: 'single and unbranched',
    requires: CAT,
  },
  {
    id: 'tr.branch',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'showdown',
    category: 'visual',
    prompt: 'Which one forks into several heads?',
    correct: 'c-branched-2',
    distractors: ['d-plant-stalk'],
    feedback: 'Cat’s-ear has branched or several flowering stems. That is a clue, not proof.',
    sources: CATSRC,
    fact: 'single and unbranched',
    requires: CAT,
  },
  {
    id: 'tr.curb',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'spot-feature',
    category: 'visual',
    prompt: 'Find a dandelion by the road.',
    media: 'd-curb-b',
    correct: 'flowers',
    distractors: ['curb', 'road', 'grass'],
    feedback: 'Roadsides and paths suit dandelions.',
    sources: SRC,
    fact: 'roadsides',
    requires: ROADSIDE,
  },
  {
    id: 'tr.puff',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'pick-picture',
    category: 'applied',
    prompt: 'What does a finished flower become?',
    media: 'd-flower-open',
    correct: 'd-seed-head',
    distractors: ['d-rosette-crop', 'd-rosette-alt-crop'],
    feedback: 'Flowers become wind-spread seed heads.',
    sources: SRC,
    fact: 'round white wind-dispersed',
  },
  {
    id: 'tr.packed',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'quick-pick',
    category: 'applied',
    prompt: 'On a trampled path, can dandelions tolerate it?',
    correct: 'Yes, they can tolerate it',
    distractors: ['No, they need loose soil'],
    feedback: 'Dandelions can tolerate compacted soil.',
    sources: SRC,
    fact: 'tolerate compacted soil',
  },
  {
    id: 'tr.wind',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'quick-pick',
    category: 'applied',
    prompt: 'How do the seeds mainly travel?',
    correct: 'Mostly on the wind',
    distractors: ['Mostly by water', 'Mostly on animal fur'],
    feedback: 'Wind is the main way the seeds spread.',
    sources: SRC,
    fact: 'wind-dispersed',
  },
  {
    id: 'tr.sap',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'quick-pick',
    category: 'recall',
    prompt: 'Which sap is a dandelion’s?',
    correct: 'Milky white',
    distractors: ['Clear and watery', 'Bright blue'],
    feedback: 'Broken leaves and stalks leak milky sap. Other plants do too.',
    sources: SRC,
    fact: 'milky sap',
  },
  {
    id: 'tr.rosflower',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'pick-picture',
    category: 'visual',
    prompt: 'Which picture shows a leaf ring and a flower?',
    correct: 'd-plant-stalk',
    distractors: ['d-rosette-crop', 'd-flower-crop'],
    feedback: 'Two clues together: a low ring of toothed leaves and a yellow flower.',
    sources: SRC,
    fact: 'Low rosette of deeply toothed or lobed leaves',
    alsoFact: 'bright yellow head grows singly',
  },
  {
    id: 'tr.noflower',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'pick-picture',
    category: 'visual',
    prompt: 'In which picture are only leaves visible?',
    correct: 'd-rosette-alt-crop',
    distractors: ['d-flower-open', 'd-seed-stalk'],
    feedback: 'Only that picture shows leaves without a flower or seed head in view.',
    sources: SRC,
    fact: 'Low rosette of deeply toothed or lobed leaves',
  },
  {
    id: 'tr.flowerbare',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'quick-pick',
    category: 'visual',
    prompt: 'Do leaves grow up the flower stalk?',
    media: 'd-plant-stalk',
    correct: 'No, only at the base',
    distractors: ['Yes, all along it', 'Yes, near the flower'],
    feedback: 'Dandelion stalks have no leaves; the leaves grow at the base. One clue, not proof.',
    sources: SRC,
    fact: 'singly on a leafless',
  },
];
