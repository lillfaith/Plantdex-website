import { referencePreview } from './reference-photos';

/**
 * LOOKALIKE COMPARISONS FOR THE FIELD GUIDE (Dandelion pilot). UNREVIEWED.
 *
 * Each difference is worded from what the cited pages actually say (see
 * docs/research/dandelion-lookalike.md) and is limited to the two characters two sources
 * agree on: how the flower stalk branches, and whether the leaves are hairy. Hollow stalks,
 * bracts, leaf colour and head size are NOT here: the research found them contradicted,
 * single-sourced or unsupported.
 *
 * Shown to nobody in a production build until `reviewed` is true after a qualified botanical
 * reviewer has signed off. A comparison never says a plant is safe, edible or usable.
 */
export interface ComparisonRow {
  readonly trait: string;
  readonly plant: string;
  readonly lookalike: string;
  /** Photographs that illustrate the row (paths under /public). */
  readonly plantPhoto: string;
  readonly lookalikePhoto: string;
  readonly cites: readonly { label: string; url: string }[];
}

export interface LookalikeComparison {
  readonly herbId: string;
  readonly lookalikeName: string;
  readonly lookalikeScientific: string;
  readonly rows: readonly ComparisonRow[];
  readonly reviewed: boolean;
}

const PSU = {
  label: 'Penn State Extension, “Noxious Weed – Catsear”',
  url: 'https://extension.psu.edu/noxious-weed-catsear',
};
const WP = {
  label: 'Wikipedia, “Taraxacum” (citing Stace, New Flora of the British Isles)',
  url: 'https://en.wikipedia.org/wiki/Taraxacum',
};

export const LOOKALIKE_COMPARISONS: readonly LookalikeComparison[] = [
  {
    herbId: 'taraxacum-officinale',
    lookalikeName: 'Cat’s-ear',
    lookalikeScientific: 'Hypochaeris radicata',
    reviewed: false,
    rows: [
      {
        trait: 'Flower stalk',
        plant: 'Unforked, with a single head.',
        lookalike: 'Forked, with more than one head.',
        plantPhoto: '/reference/dandelion/dandelion-flower-stalk.webp',
        lookalikePhoto: '/reference/dandelion/hypochaeris-branched-stalks.webp',
        cites: [PSU, WP],
      },
      {
        trait: 'Leaves',
        plant: 'Smooth, not hairy.',
        lookalike: 'Hairy.',
        plantPhoto: '/reference/dandelion/dandelion-rosette-leaf.webp',
        lookalikePhoto: '/reference/dandelion/hypochaeris-leaf-hairs.webp',
        cites: [PSU, WP],
      },
    ],
  },
];

export function comparisonFor(
  herbId: string,
  preview: boolean = referencePreview(),
): LookalikeComparison | null {
  return (
    LOOKALIKE_COMPARISONS.find((one) => one.herbId === herbId && (one.reviewed || preview)) ?? null
  );
}
