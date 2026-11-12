/**
 * REFERENCE PHOTOGRAPHS for the Field Identification tab.
 *
 * EMPTY UNTIL THE RESEARCH IS VERIFIED. An entry is added only after its licence, author and
 * attribution were read on the Wikimedia Commons file page, and the image was looked at and
 * confirmed to show the feature it claims to. Allowed licences: CC0, CC BY, CC BY-SA.
 * `reference-photos.test.ts` enforces the shape, so research output can be dropped in without
 * a code change, and an entry that breaks a rule fails the build.
 */
export const ALLOWED_LICENCES = ['CC0 1.0', 'CC BY', 'CC BY-SA'] as const;
export type PhotoLicence = (typeof ALLOWED_LICENCES)[number];

export interface ReferencePhoto {
  readonly herbId: string;
  /** Path under /public, e.g. /reference/dandelion/dandelion-rosette.webp */
  readonly src: string;
  /** What the photograph is for, in a few words (shown as the caption). */
  readonly shows: string;
  /** Plain alt text describing what is visible. */
  readonly alt: string;
  readonly licence: PhotoLicence;
  readonly licenceUrl: string;
  readonly author: string;
  readonly commonsUrl: string;
  /** The exact attribution line the licence requires. */
  readonly attribution: string;
  /** Whether and how the image was changed (a resize is a change under CC BY-SA). */
  readonly changesNote: string;
}

export const REFERENCE_PHOTOS: readonly ReferencePhoto[] = [];

export function photosFor(herbId: string): readonly ReferencePhoto[] {
  return REFERENCE_PHOTOS.filter((photo) => photo.herbId === herbId);
}
