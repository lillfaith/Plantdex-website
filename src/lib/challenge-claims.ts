/**
 * WHICH SOURCE SUPPORTS WHICH CLAIM, for the Boss Form review packet.
 *
 * NOT SHIPPED TO THE SERVER. The server scores indices and never needs a bibliography, so this
 * stays out of the edge-shared set.
 *
 * `basis` is the honest part. `read` means a PERSON opened the page and found the claim in it.
 * Nothing here is `read`. `machine-read` means Claude fetched the page text and found the quoted
 * words, which is better than a search summary and still not a person's confirmation: the
 * registry rule keeps `verified` for a human. `search-summary` is a search engine's summary
 * only, and `unsourced` marks a claim for which no source has been seen at all. No code path
 * trusts these rows, and none of the sources is `verified: true` in the registry.
 */
export type ClaimBasis = 'read' | 'machine-read' | 'search-summary' | 'unsourced' | 'editorial';

export interface ClaimSource {
  readonly id: string;
  /** The claim, in the words the questions use. */
  readonly claim: string;
  readonly sourceIds: readonly string[];
  readonly basis: ClaimBasis;
  /** What the drafter actually saw, or why there is nothing. */
  readonly note: string;
  /** Question ids this claim is used by. */
  readonly usedBy: readonly string[];
}

export const CATS_EAR_CLAIMS: readonly ClaimSource[] = [
  {
    id: 'name',
    claim: 'Hypochaeris radicata L. is an accepted species in the daisy family (Asteraceae).',
    sourceIds: ['wfo-hypochaeris-radicata'],
    basis: 'search-summary',
    note: 'A search summary of the World Flora Online page says accepted species, Asteraceae. The page itself could not be read: its certificate would not verify from this environment.',
    usedBy: [],
  },
  {
    id: 'branched',
    claim: 'Cat’s-ear flowering stems are usually branched.',
    sourceIds: ['wsu-hosted-usfs-treatment-guide'],
    basis: 'machine-read',
    note: 'The WSU-hosted US Forest Service guide says: "hairy cats-ear has branched or several flowering stems (a single flowering stem in common dandelion)". That is "branched or several", not "usually branched". The WSU HortSense address does not load.',
    usedBy: ['cp.single', 'cp.branch', 'cp.forks', 'tr.single', 'tr.branch'],
  },
  {
    id: 'leafless-bracts',
    claim: 'Cat’s-ear stems are largely leafless, with small bracts.',
    sourceIds: ['wfo-hypochaeris-radicata'],
    basis: 'unsourced',
    note: 'No page read says it. The World Flora Online summary calls it a "scapose" herb, which points at a leafless flowering stem, and the Forest Service guide mentions only the outer bracts under the flower head, not bracts on the stem. The wording comes from the preliminary reviewer.',
    usedBy: ['curated note (lookalikes)'],
  },
  {
    id: 'leaves-habitat',
    claim: 'Cat’s-ear has a rosette of hairy, lobed leaves and grows in disturbed ground such as lawns.',
    sourceIds: ['wsu-hortsense-catsear'],
    basis: 'search-summary',
    note: 'A search summary only. The WSU HortSense address returns "Page not found", so this claim has no readable source. The Forest Service guide does say the basal leaves are "hairier, more irregular, and have deeper lobes". Not used by any question yet.',
    usedBy: [],
  },
  {
    id: 'bracts-vs-dandelion',
    claim: 'Cat’s-ear flower-head bracts do not bend backward the way dandelion’s do.',
    sourceIds: ['wsu-hosted-usfs-treatment-guide'],
    basis: 'machine-read',
    note: 'The guide says: "the outer bracts below the flower heads of cats-ear are not curved downward (reflexed)". A possible extra clue for a later question. Not used.',
    usedBy: [],
  },
  {
    id: 'clue-not-proof',
    claim: 'Branching is a useful clue, not definitive proof of species identity.',
    sourceIds: [],
    basis: 'editorial',
    note: 'Plantdex’s own caution, requested by the preliminary reviewer. It is a limit on what the question claims, so it needs no citation.',
    usedBy: ['cp.single', 'cp.branch', 'cp.forks', 'tr.single', 'tr.branch', 'curated note (lookalikes)'],
  },
];

/**
 * WHAT EACH PHOTOGRAPH SHOWS, as the drafter read it. A reading is not evidence of species: it
 * says only which of three visible clues is in the frame, so a question that asks for two clues
 * (or for one clue and the absence of another) can be checked against something written down.
 * A botanist confirms or corrects every row. `'unclear'` means the drafter could not tell, and
 * the photograph must not be the CORRECT answer to a question that depends on that clue.
 */
export type Clue = boolean | 'unclear';
export interface PhotoClues {
  readonly leaves: Clue;
  readonly flower: Clue;
  readonly seedHead: Clue;
  readonly note?: string;
}

export const PHOTO_CLUES: Readonly<Record<string, PhotoClues>> = {
  'd-rosette-leaf': { leaves: true, flower: false, seedHead: true, note: 'A small white seed puff sits at the top left.' },
  'd-rosette-alt': { leaves: true, flower: false, seedHead: true, note: 'A small seed puff at the top right edge.' },
  'd-rosette-crop': { leaves: true, flower: false, seedHead: false, note: 'Crop that removes the small puff.' },
  'd-rosette-alt-crop': { leaves: true, flower: false, seedHead: false, note: 'Crop that removes the small puff.' },
  'd-flower-open': { leaves: true, flower: true, seedHead: false, note: 'Leaves show at the bottom and the right edge.' },
  'd-flower-crop': { leaves: false, flower: true, seedHead: false, note: 'Crop that removes the leaves.' },
  'd-flowers-stalks': { leaves: true, flower: true, seedHead: false, note: 'Small leaves at the lower left.' },
  'd-flowers-crop': { leaves: false, flower: true, seedHead: false, note: 'Crop of the two flower heads. No recognisable leaf.' },
  'd-seed-head': { leaves: false, flower: false, seedHead: true },
  'd-seed-stalk': { leaves: true, flower: true, seedHead: true, note: 'Small yellow flowers at the top right and leaves at the base.' },
  'd-plant-stalk': { leaves: true, flower: true, seedHead: false },
  'd-bud': {
    leaves: false,
    flower: 'unclear',
    seedHead: 'unclear',
    note: 'A closed head held in a hand, with withered yellow tips and a pale tuft on top. It may be a bud or a spent bloom closing. A botanist must say which.',
  },
};

/**
 * THE DANDELION CLAIMS BEHIND THE QUESTIONS, mapped to what the two Extension pages say.
 * `direct` means the quoted words make the claim; `partial` means they support part of it;
 * `indirect` means the claim is an inference from them; `not-found` means neither page says it.
 * Quotes are from a machine reading on 2026-11-14. A botanist confirms every row.
 */
export interface DandelionClaim {
  readonly id: string;
  readonly claim: string;
  readonly sourceIds: readonly string[];
  readonly strength: 'direct' | 'partial' | 'indirect' | 'not-found';
  readonly quote: string;
  readonly usedBy: readonly string[];
}

export const DANDELION_CLAIMS: readonly DandelionClaim[] = [
  { id: 'sap', claim: 'Broken stalks and leaves leak milky white sap.', sourceIds: ['wisc-dandelion', 'umn-dandelions'], strength: 'direct', quote: '\u201cThe stem contains milky latex sap.\u201d (Wisconsin) \u201cStalks are hollow and contain white sap when broken.\u201d (Minnesota)', usedBy: ['ps.sap', 'tr.sap'] },
  { id: 'wind', claim: 'The round white seed head is wind-dispersed.', sourceIds: ['wisc-dandelion'], strength: 'partial', quote: '\u201ca feathery parachute of soft, white hairs that makes it easily carried by the wind.\u201d The page does not say wind is the MAIN way seeds spread.', usedBy: ['ps.wind', 'tr.wind', 'ps.clock', 'ps.seedhead2', 'tr.clock', 'tr.puff'] },
  { id: 'stalk', claim: 'One flower on a single, unbranched, leafless stalk.', sourceIds: ['umn-dandelions'], strength: 'direct', quote: '\u201cDandelion stalks do not branch, have no leaves, and only produce one flower.\u201d', usedBy: ['ps.stalk', 'ps.flower2', 'tr.flower', 'tr.flowerbare', 'cp.single', 'cp.branch', 'cp.forks', 'tr.single', 'tr.branch'] },
  { id: 'rosette', claim: 'Toothed or lobed leaves grow in a low rosette.', sourceIds: ['wisc-dandelion', 'umn-dandelions'], strength: 'direct', quote: '\u201cThe lance shaped leaves grow in a rosette\u201d (Wisconsin); leaves \u201cform at the base of the stem in a circular cluster\u201d and \u201care deeply lobed\u201d (Minnesota).', usedBy: ['ps.rosette', 'ps.leaves2', 'tr.rosette', 'tr.rosflower', 'tr.noflower'] },
  { id: 'backward-lobes', claim: 'Leaf lobes point back toward the centre.', sourceIds: ['umn-dandelions'], strength: 'direct', quote: '\u201cDandelion leaves are deeply lobed and form points angled toward the stem.\u201d', usedBy: [] },
  { id: 'lawn-garden', claim: 'Dandelions grow in lawns, gardens and disturbed soil.', sourceIds: ['umn-dandelions', 'wisc-dandelion'], strength: 'direct', quote: '\u201cDandelions thrive in thin lawns, garden beds, and disturbed soils\u201d (Minnesota); \u201ca common plant of grassland and cultivated ground\u201d (Wisconsin).', usedBy: ['hb.lawn', 'hb.disturbed'] },
  { id: 'sun', claim: 'Dandelions grow more in full sun.', sourceIds: ['umn-dandelions'], strength: 'partial', quote: '\u201cdandelions have increased growth in full sun and moist conditions, they are adaptable to many different environments.\u201d The word \u201copen\u201d does not appear, and \u201cDeep shade\u201d is a wrong answer only because the claim is about what they favor.', usedBy: ['hb.sunny'] },
  { id: 'compacted', claim: 'Dandelions can tolerate compacted soil.', sourceIds: ['umn-dandelions'], strength: 'indirect', quote: '\u201cDandelions can indicate compaction\u201d; the taproot is \u201cable to aerate compacted soils.\u201d Growth in compacted soil is implied, and \u201ctolerate\u201d is the drafter\u2019s word.', usedBy: ['hb.trampled', 'tr.packed'] },
  { id: 'paths-roadsides-fields', claim: 'Dandelions grow on paths, roadsides and in fields.', sourceIds: [], strength: 'not-found', quote: 'Neither page uses these words. The curated habitat note keeps them. No ungated question depends on them.', usedBy: ['hb.curb', 'hb.curb2', 'tr.curb'] },
  { id: 'bud-flower', claim: 'A green bud opens into the flower, which later becomes the seed head.', sourceIds: ['wisc-dandelion', 'umn-dandelions'], strength: 'partial', quote: '\u201cThe fat green buds ... open ... to expose all the numerous ray and disc flowers\u201d (Wisconsin); \u201cthe formation of \u2018puffballs\u2019 when they go to seed\u201d (Minnesota). This supports the sequence. Whether the d-bud PHOTOGRAPH shows a bud is a separate question.', usedBy: ['hb.puff', 'hb.bloom2', 'tr.puff'] },
];
