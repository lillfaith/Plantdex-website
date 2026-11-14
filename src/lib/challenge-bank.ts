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
 *                              "branched LEAFY flowering stems"; sources describe leafless
 *                              stems with small scale-like bracts, and branching that is usual
 *                              rather than universal)
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
  readonly requires?: readonly string[];
}

const DANDELION = 'taraxacum-officinale';
const SRC = ['wisc-dandelion', 'umn-dandelions'] as const;
const CAT = ['cats-ear-branch-photo', 'cats-ear-wording-reviewed'] as const;
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
    distractors: ['d-flower-open', 'd-seed-head'],
    feedback: 'A rosette is a low ring of toothed leaves. The lobes often point back toward the middle.',
    sources: SRC,
    fact: 'Low rosette of deeply toothed or lobed leaves',
  },
  {
    id: 'ps.stalk',
    herbId: DANDELION,
    activity: 'part-spotter',
    kind: 'spot-feature',
    category: 'visual',
    prompt: 'Tap the flower stalk.',
    media: 'd-seed-stalk',
    correct: 'stalk',
    distractors: ['head', 'leaves', 'ground'],
    feedback: 'One bare stalk carries one flower.',
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
    distractors: ['d-rosette-leaf', 'd-flower-open'],
    feedback: 'That round white puff is the seed head, and the wind spreads it.',
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
    feedback: 'Broken leaves and stalks release a milky sap.',
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
    distractors: ['d-flowers-stalks', 'd-seed-stalk'],
    feedback: 'Dandelion leaves sit in a low, toothed ring at ground level.',
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
    feedback: 'One bright yellow head sits on top of each stalk.',
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
    distractors: ['d-rosette-alt', 'd-bud'],
    feedback: 'Round, white and spread by the wind.',
    sources: SRC,
    fact: 'round white wind-dispersed',
  },
  {
    id: 'ps.wind',
    herbId: DANDELION,
    activity: 'part-spotter',
    kind: 'quick-pick',
    category: 'applied',
    prompt: 'How does a dandelion puff travel?',
    correct: 'On the wind',
    distractors: ['Floating on water', 'Stuck to fur'],
    feedback: 'The seed head is wind-dispersed, so the wind carries the seeds.',
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
    feedback: 'Dandelion stalks are single and unbranched, and rise straight from the leaves.',
    sources: SRC,
    fact: 'single, unbranched',
    requires: CAT,
  },
  {
    id: 'cp.branch',
    herbId: DANDELION,
    activity: 'compare',
    kind: 'showdown',
    category: 'visual',
    prompt: 'Which usually has a branching stem?',
    correct: 'c-branched',
    distractors: ['d-flowers-stalks'],
    feedback: 'Cat’s-ear usually branches. Dandelion stalks stay single.',
    sources: SRC,
    fact: 'single, unbranched',
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
    feedback: 'Dandelion stalks are single and unbranched.',
    sources: SRC,
    fact: 'single, unbranched',
    requires: CAT_WORDING,
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
  },
  {
    id: 'hb.trampled',
    herbId: DANDELION,
    activity: 'habitat-season',
    kind: 'quick-pick',
    category: 'applied',
    prompt: 'A path gets trampled hard. Can dandelions cope?',
    correct: 'Yes, packed soil is fine',
    distractors: ['No, they need soft soil'],
    feedback: 'Dandelions are especially tolerant of packed soil.',
    sources: SRC,
    fact: 'compacted soils',
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
    distractors: ['d-rosette-leaf', 'd-bud'],
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
    distractors: ['d-rosette-alt', 'd-bud'],
    feedback: 'The flower becomes a round white seed head.',
    sources: SRC,
    fact: 'round white wind-dispersed',
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
    feedback: 'Toothed leaves in a low ring: the rosette.',
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
    distractors: ['d-flowers-stalks', 'd-rosette-alt'],
    feedback: 'Round, white and spread by the wind.',
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
    feedback: 'One bright head per bare stalk.',
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
    feedback: 'Dandelion stalks do not branch.',
    sources: SRC,
    fact: 'single, unbranched',
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
    feedback: 'Lookalikes usually branch. Dandelion does not.',
    sources: SRC,
    fact: 'single, unbranched',
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
    distractors: ['d-rosette-leaf', 'd-bud'],
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
    prompt: 'Hard-packed soil along a path. Dandelions?',
    correct: 'Yes, they cope',
    distractors: ['No, they need loose soil'],
    feedback: 'Compacted soil does not stop them.',
    sources: SRC,
    fact: 'compacted soils',
  },
  {
    id: 'tr.wind',
    herbId: DANDELION,
    activity: 'boss-trial',
    kind: 'quick-pick',
    category: 'applied',
    prompt: 'How do the seeds travel?',
    correct: 'On the wind',
    distractors: ['By water', 'On animal fur'],
    feedback: 'The seed head is wind-dispersed.',
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
    distractors: ['Clear and watery', 'Pale yellow'],
    feedback: 'Broken leaves and stalks leak milky sap.',
    sources: SRC,
    fact: 'milky sap',
  },
];
