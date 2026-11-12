import type { ActivityId } from './boss-form.ts';

/**
 * DRAFT QUESTION BANK. EVERY ITEM HERE IS UNREVIEWED.
 *
 * Nothing in this file is served to a player. `mastery-challenges.ts` serves an item only
 * when `CHALLENGE_REVIEWS` carries a named reviewer and a date for its id, and that table is a
 * separate file so a sign-off is a separate, reviewable commit. A drafted question is a claim
 * about a plant; the pilot is not allowed to make one until a qualified botanical reviewer
 * has checked the claim and its sources.
 *
 * Each correct option and each piece of feedback is a sentence copied from
 * `card-field-notes.ts` for this species (a test asserts it still appears there), and every
 * distractor is the same field from a DIFFERENT species. Nothing is invented. `sources` are
 * the source ids that note already cites.
 *
 * NOT YET DRAFTED, AND WHY:
 *  - `compare` needs a named lookalike. The curated Dandelion entry names only a group, and
 *    the proposed *Hypochaeris radicata* needs a cited edit first. A comparison question
 *    must never use "hollow stalk" as the difference: both plants have hollow stalks.
 *  - Photographs for `part-spotter` need verified licences.
 *  - The Boss Trial needs ten questions across the three activities.
 */
export interface ChallengeItem {
  readonly id: string;
  readonly herbId: string;
  readonly activity: Exclude<ActivityId, 'boss-trial'>;
  readonly prompt: string;
  /** The correct answer first; the builder shuffles. */
  readonly correct: string;
  readonly distractors: readonly [string, string, string];
  readonly feedback: string;
  readonly sources: readonly string[];
}

const DANDELION = 'taraxacum-officinale';
const SRC = ['wisc-dandelion', 'umn-dandelions'] as const;

export const CHALLENGE_BANK: readonly ChallengeItem[] = [
  {
    id: 'dandelion.part.rosette',
    herbId: DANDELION,
    activity: 'part-spotter',
    prompt: 'Which curated trait describes the dandelion’s low ring of leaves at the base?',
    correct: 'Low rosette of deeply toothed or lobed leaves.',
    distractors: [
      'Large oblong to broadly lance-shaped leaves.',
      'Many narrow alternate leaves run up the stem.',
      'Leaf edges are often distinctly wavy.',
    ],
    feedback: 'The note describes a low rosette of deeply toothed or lobed leaves.',
    sources: SRC,
  },
  {
    id: 'dandelion.part.lobes',
    herbId: DANDELION,
    activity: 'part-spotter',
    prompt: 'Which curated trait describes the direction of the dandelion’s leaf lobes?',
    correct: 'Leaf lobes commonly point back toward the centre of the rosette.',
    distractors: [
      'Leaves generally lance-shaped with toothed margins.',
      'Lower leaves form a basal cluster on long stalks.',
      'Large oblong to broadly lance-shaped leaves.',
    ],
    feedback: 'The note says the lobes commonly point back toward the centre of the rosette.',
    sources: SRC,
  },
  {
    id: 'dandelion.part.stalk',
    herbId: DANDELION,
    activity: 'part-spotter',
    prompt: 'Which curated trait describes how the dandelion’s flower is carried?',
    correct: 'A bright yellow head grows singly on a leafless, hollow stalk.',
    distractors: [
      'Numerous tiny yellow heads form large branching, often arching plume-like clusters.',
      'Tall branching stems carry many small greenish flowers that mature rusty brown.',
      'Spreads by rhizomes as well as seed and may form colonies.',
    ],
    feedback: 'The note describes one bright yellow head per leafless stalk.',
    sources: SRC,
  },
  {
    id: 'dandelion.part.seedhead',
    herbId: DANDELION,
    activity: 'part-spotter',
    prompt: 'Which curated trait describes the dandelion once the flower has finished?',
    correct: 'Mature flowers become round white wind-dispersed clocks.',
    distractors: [
      'Tall branching stems carry many small greenish flowers that mature rusty brown.',
      'A papery sheath surrounds the stem at each node.',
      'Spreads by rhizomes as well as seed and may form colonies.',
    ],
    feedback: 'The note describes round white wind-dispersed seed heads.',
    sources: SRC,
  },
  {
    id: 'dandelion.part.latex',
    herbId: DANDELION,
    activity: 'part-spotter',
    prompt: 'Which curated trait describes what happens when a dandelion leaf or stalk is broken?',
    correct: 'Broken leaves or flower stalks release a milky sap.',
    distractors: [
      'A papery sheath surrounds the stem at each node.',
      'Leaf edges are often distinctly wavy.',
      'Lower leaves form a basal cluster on long stalks.',
    ],
    feedback: 'The note says broken leaves or flower stalks release a milky sap.',
    sources: SRC,
  },
  {
    id: 'dandelion.habitat.setting',
    herbId: DANDELION,
    activity: 'habitat-season',
    prompt: 'Which curated habitat note matches the dandelion?',
    correct:
      'Lawns, paths, roadsides, gardens, fields and other open sunny places on disturbed ground.',
    distractors: [
      'Pastures, fields, gardens, riverbanks, roadsides, livestock areas and forest edges, on moist or disturbed ground.',
      'Meadows, old fields, roadsides, woodland edges and disturbed open sunny sites, on moderately moist but well-drained soil.',
      'Shaded woodland floors and the edges of streams.',
    ],
    feedback: 'The note lists lawns, paths, roadsides, gardens, fields and other open sunny, disturbed ground.',
    sources: SRC,
  },
  {
    id: 'dandelion.habitat.soil',
    herbId: DANDELION,
    activity: 'habitat-season',
    prompt: 'Which soil condition does the curated habitat note say the dandelion tolerates well?',
    correct: 'Compacted soils.',
    distractors: ['Permanently flooded soils.', 'Deep shade.', 'Bare rock.'],
    feedback: 'The note says it is especially tolerant of compacted soils.',
    sources: SRC,
  },
  {
    id: 'dandelion.season.printed',
    herbId: DANDELION,
    activity: 'habitat-season',
    prompt: 'Which season does the printed card give for the dandelion?',
    correct: 'Summer',
    distractors: ['Winter', 'Spring', 'Autumn'],
    feedback: 'Card #01 prints summer as its season.',
    sources: ['plantdex-deck'],
  },
];
