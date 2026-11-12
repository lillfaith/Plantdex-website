/**
 * REFERENCE PHOTOGRAPHS FOR THE FIELD GUIDE (Dandelion pilot). EVERY ENTRY IS UNREVIEWED.
 *
 * Generated from the research session's verified records (docs/research/dandelion-images.json):
 * each licence, author and attribution below was read on its Wikimedia Commons file page. They
 * are shown to nobody in a production build: an entry is public only once `reviewed` is true,
 * and nothing here is. A development build with NEXT_PUBLIC_REFERENCE_PREVIEW=1 shows them,
 * marked as drafts, so the design can be reviewed.
 *
 * Species identification of every photograph is the uploader's claim, and the botanist review
 * the owner requires has not happened. Photographs illustrate; they are not proof.
 */
export interface ReferencePhoto {
  readonly herbId: string;
  /** Path under /public. */
  readonly src: string;
  readonly kind: 'plant' | 'lookalike';
  readonly shows: string;
  readonly alt: string;
  readonly licence: string;
  readonly licenceUrl: string;
  readonly author: string;
  readonly commonsUrl: string;
  readonly attribution: string;
  readonly changesNote: string;
  readonly shareAlike: boolean;
  /** True only after a qualified botanical reviewer and the licence check have signed off. */
  readonly reviewed: boolean;
}

export const REFERENCE_PHOTOS: readonly ReferencePhoto[] = [
  {
    herbId: "taraxacum-officinale",
    src: "/reference/dandelion/dandelion-rosette-leaf.webp",
    kind: "plant",
    shows: "Leaf",
    alt: "A single deeply toothed dandelion leaf held against grass, the teeth pointing back toward its base.",
    licence: "CC BY 2.0",
    licenceUrl: "https://creativecommons.org/licenses/by/2.0/",
    author: "Harry Rose",
    commonsUrl: "https://commons.wikimedia.org/wiki/File:Taraxacum_officinale_leaf1_(16189363040).jpg",
    attribution: "\"Taraxacum officinale leaf1\" by Harry Rose (Macleay Grass Man on Flickr), licensed CC BY 2.0, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Taraxacum_officinale_leaf1_(16189363040).jpg",
    changesNote: "Changes made, and must be stated: resized (from Wikimedia's 960px rendition of the 4000x3000 original) to 640x480 and re-encoded as WebP at quality 85. No crop and no colour edit.",
    shareAlike: false,
    reviewed: false,
  },
  {
    herbId: "taraxacum-officinale",
    src: "/reference/dandelion/dandelion-flower-head.webp",
    kind: "plant",
    shows: "Flower heads",
    alt: "Open yellow dandelion heads, each made of many narrow ray florets, among deeply cut leaves.",
    licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
    author: "Dcrjsr",
    commonsUrl: "https://commons.wikimedia.org/wiki/File:Common_dandelion_Taraxacum_officinale_flowers.jpg",
    attribution: "\"Common dandelion Taraxacum officinale flowers\" by Dcrjsr, licensed CC BY 4.0, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Common_dandelion_Taraxacum_officinale_flowers.jpg",
    changesNote: "Changes made, and must be stated: resized (from Wikimedia's 960px rendition of the 5472x3648 original) to 560x373 and re-encoded as WebP at quality 58. No crop and no colour edit.",
    shareAlike: false,
    reviewed: false,
  },
  {
    herbId: "taraxacum-officinale",
    src: "/reference/dandelion/dandelion-flower-stalk.webp",
    kind: "plant",
    shows: "Flower stalks",
    alt: "Several leafless, unbranched dandelion stalks, each carrying one head, rising from a low clump of leaves.",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    author: "Kleuske",
    commonsUrl: "https://commons.wikimedia.org/wiki/File:Dandelion_ground_level.JPG",
    attribution: "\"Dandelion ground level\" by Kleuske, licensed CC BY-SA 3.0, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Dandelion_ground_level.JPG",
    changesNote: "Changes made, and must be stated: resized (from Wikimedia's 960px rendition of the 2272x1704 original) to 440x330 and re-encoded as WebP at quality 67. No crop and no colour edit. ShareAlike: the adapted image must be offered under CC BY-SA 3.0 or a compatible licence.",
    shareAlike: true,
    reviewed: false,
  },
  {
    herbId: "taraxacum-officinale",
    src: "/reference/dandelion/dandelion-seed-head.webp",
    kind: "plant",
    shows: "Seed head",
    alt: "A round white dandelion seed head, the clock, with wind-blown seeds.",
    licence: "CC0 1.0",
    licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    author: "Jonson22",
    commonsUrl: "https://commons.wikimedia.org/wiki/File:Regrat_lu%C4%8Dka_-_Taraxacum_officinale.JPG",
    attribution: "\"Regrat lučka - Taraxacum officinale\" by Jonson22, CC0 1.0 (credit not required; given as courtesy), via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Regrat_lu%C4%8Dka_-_Taraxacum_officinale.JPG",
    changesNote: "Changes made (stating them is courtesy under CC0, not a requirement): resized (from Wikimedia's 960px rendition of the 3072x2304 original) to 640x480 and re-encoded as WebP at quality 79. No crop and no colour edit.",
    shareAlike: false,
    reviewed: false,
  },
  {
    herbId: "taraxacum-officinale",
    src: "/reference/dandelion/hypochaeris-branched-stalks.webp",
    kind: "lookalike",
    shows: "Cat’s-ear: branched stalks",
    alt: "Common cat’s-ear with budding stems that fork, one flower already open.",
    licence: "CC BY-SA 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    author: "TomStonehunter",
    commonsUrl: "https://commons.wikimedia.org/wiki/File:Hypochaeris_radicata_(cat's_ear)_with_budding_stems_and_its_first_flower.jpg",
    attribution: "\"Hypochaeris radicata (cat's ear) with budding stems and its first flower\" by TomStonehunter, licensed CC BY-SA 4.0, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Hypochaeris_radicata_(cat's_ear)_with_budding_stems_and_its_first_flower.jpg",
    changesNote: "Changes made, and must be stated: resized (from Wikimedia's 960px rendition of the 3648x5472 original) to 427x640 and re-encoded as WebP at quality 85. No crop and no colour edit. ShareAlike: the adapted image must be offered under CC BY-SA 4.0 or a compatible licence.",
    shareAlike: true,
    reviewed: false,
  },
  {
    herbId: "taraxacum-officinale",
    src: "/reference/dandelion/hypochaeris-leaf-hairs.webp",
    kind: "lookalike",
    shows: "Cat’s-ear: hairy leaf",
    alt: "A single cat’s-ear leaf close up, covered in coarse hairs.",
    licence: "CC BY-SA 3.0",
    licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    author: "Walter Siegmund",
    commonsUrl: "https://commons.wikimedia.org/wiki/File:Hypochaeris_radicata_3296.JPG",
    attribution: "\"Hypochaeris radicata 3296\" by Walter Siegmund, licensed CC BY-SA 3.0, via Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Hypochaeris_radicata_3296.JPG",
    changesNote: "Changes made, and must be stated: resized (from Wikimedia's 960px rendition of the 4272x2848 original) to 640x427 and re-encoded as WebP at quality 70. No crop and no colour edit. ShareAlike: the adapted image must be offered under CC BY-SA or a compatible licence.",
    shareAlike: true,
    reviewed: false,
  },
];

/** Production shows only reviewed photographs. Development can preview drafts on request. */
export function referencePreview(
  flag: string | undefined = process.env.NEXT_PUBLIC_REFERENCE_PREVIEW,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  return flag === '1' && nodeEnv === 'development';
}

export function photosFor(herbId: string, preview: boolean = referencePreview()): readonly ReferencePhoto[] {
  return REFERENCE_PHOTOS.filter(
    (photo) => photo.herbId === herbId && (photo.reviewed || preview),
  );
}
