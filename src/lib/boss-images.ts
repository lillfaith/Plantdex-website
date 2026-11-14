/**
 * THE PHOTOGRAPHS BEHIND THE BOSS FORM CHALLENGES, and the tap regions drawn on them.
 *
 * CC0 IS THE ONLY LICENCE USED. Each entry records the iNaturalist photo id and observation it
 * came from, and every file is a resized WebP of that photograph. A decorative pixel sprite is
 * never an answer image here: it is art, not an identification reference.
 *
 * NOT PART OF THE SERVER'S SHARED MODULES. The server scores indices and never needs a
 * picture, so this file ships only with the browser bundle.
 *
 * REGIONS ARE DRAFT, AND A REVIEWER CONFIRMS THEM. A spot-the-feature question answers with a
 * region id; the screen turns a tap into the region under it. Rectangles are percentages of
 * the image (x, y, width, height) and an earlier entry wins where two overlap. A tap outside
 * every region answers nothing, so a stray tap is never a wrong answer.
 *
 * `src` is absent for a photograph that does not exist yet (the branched cat's-ear stem).
 * Every question that uses one `requires` it, and stays disabled; a test enforces that.
 */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface BossImage {
  /** Absent until a licensed photograph exists. */
  readonly src?: string;
  readonly alt: string;
  readonly licence: 'cc0';
  readonly inatPhotoId?: number;
  readonly width?: number;
  readonly height?: number;
  readonly regions?: Readonly<Record<string, readonly Rect[]>>;
}

const dir = '/boss-form';

export const BOSS_IMAGES: Readonly<Record<string, BossImage>> = {
  'd-rosette-leaf': {
    src: `${dir}/d-rosette-leaf.webp`,
    alt: 'A ring of deeply toothed green leaves at ground level',
    licence: 'cc0',
    inatPhotoId: 282276229,
    width: 375,
    height: 500,
  },
  'd-rosette-alt': {
    src: `${dir}/d-rosette-alt.webp`,
    alt: 'Toothed green leaves growing in a low ring',
    licence: 'cc0',
    inatPhotoId: 282276389,
    width: 500,
    height: 500,
  },
  'd-flower-open': {
    src: `${dir}/d-flower-open.webp`,
    alt: 'A bright yellow flower head open in full bloom',
    licence: 'cc0',
    inatPhotoId: 486847173,
    width: 375,
    height: 500,
    regions: {
      head: [{ x: 5, y: 5, w: 88, h: 70 }],
      stalk: [{ x: 42, y: 76, w: 14, h: 22 }],
      leaves: [
        { x: 0, y: 82, w: 30, h: 18 },
        { x: 82, y: 0, w: 18, h: 22 },
      ],
      ground: [{ x: 82, y: 40, w: 18, h: 50 }],
    },
  },
  'd-seed-head': {
    src: `${dir}/d-seed-head.webp`,
    alt: 'A round white seed head up close',
    licence: 'cc0',
    inatPhotoId: 282276185,
    width: 500,
    height: 500,
  },
  'd-seed-stalk': {
    src: `${dir}/d-seed-stalk.webp`,
    alt: 'A white seed head on a tall bare stalk',
    licence: 'cc0',
    inatPhotoId: 282276157,
    width: 375,
    height: 500,
    regions: {
      head: [{ x: 33, y: 25, w: 30, h: 22 }],
      stalk: [{ x: 44, y: 47, w: 14, h: 48 }],
      leaves: [
        { x: 0, y: 36, w: 32, h: 14 },
        { x: 58, y: 82, w: 24, h: 18 },
      ],
      ground: [
        { x: 0, y: 52, w: 40, h: 38 },
        { x: 62, y: 52, w: 38, h: 28 },
      ],
    },
  },
  'd-flowers-stalks': {
    src: `${dir}/d-flowers-stalks.webp`,
    alt: 'Two yellow flower heads on stalks among stones',
    licence: 'cc0',
    inatPhotoId: 284777956,
    width: 375,
    height: 500,
    regions: {
      head: [
        { x: 53, y: 28, w: 27, h: 15 },
        { x: 48, y: 41, w: 34, h: 24 },
      ],
      stalk: [{ x: 52, y: 65, w: 12, h: 26 }],
      leaves: [{ x: 4, y: 76, w: 30, h: 22 }],
      ground: [
        { x: 0, y: 58, w: 40, h: 18 },
        { x: 70, y: 30, w: 30, h: 70 },
      ],
    },
  },
  'd-plant-stalk': {
    src: `${dir}/d-plant-stalk.webp`,
    alt: 'A dandelion with leaves beside a stone edge and one flower on a stalk',
    licence: 'cc0',
    inatPhotoId: 486847133,
    width: 375,
    height: 500,
    regions: {
      flower: [{ x: 48, y: 9, w: 26, h: 12 }],
      stalk: [{ x: 58, y: 20, w: 12, h: 20 }],
      leaves: [{ x: 38, y: 38, w: 56, h: 58 }],
      wall: [{ x: 0, y: 10, w: 36, h: 86 }],
    },
  },
  'd-curb-a': {
    src: `${dir}/d-curb-a.webp`,
    alt: 'Small yellow flowers growing along the edge of a pavement',
    licence: 'cc0',
    inatPhotoId: 120604612,
    width: 500,
    height: 333,
    regions: {
      flowers: [{ x: 28, y: 54, w: 66, h: 16 }],
      curb: [{ x: 0, y: 42, w: 100, h: 12 }],
      road: [{ x: 0, y: 72, w: 100, h: 28 }],
      grass: [{ x: 0, y: 8, w: 100, h: 32 }],
    },
  },
  'd-curb-b': {
    src: `${dir}/d-curb-b.webp`,
    alt: 'Small yellow flowers along a roadside edge',
    licence: 'cc0',
    inatPhotoId: 120601622,
    width: 500,
    height: 333,
    regions: {
      flowers: [
        { x: 28, y: 60, w: 26, h: 18 },
        { x: 50, y: 52, w: 14, h: 14 },
        { x: 82, y: 72, w: 16, h: 18 },
      ],
      curb: [{ x: 0, y: 44, w: 60, h: 18 }],
      road: [{ x: 0, y: 78, w: 100, h: 22 }],
      grass: [{ x: 0, y: 8, w: 100, h: 36 }],
    },
  },
  'd-bud': {
    src: `${dir}/d-bud.webp`,
    alt: 'A closed flower head with green bracts held in a hand',
    licence: 'cc0',
    inatPhotoId: 282276319,
    width: 375,
    height: 500,
  },
  // NOT YET AVAILABLE: a clear photograph of a branched cat's-ear flowering stem. No src.
  'c-branched': {
    alt: 'A cat’s-ear flowering stem that branches',
    licence: 'cc0',
  },
  'c-branched-2': {
    alt: 'A second cat’s-ear stem that forks into several heads',
    licence: 'cc0',
  },
};

/** Human names for the parts a tap can land on. Used as accessible labels, never as hints. */
export const REGION_LABELS: Readonly<Record<string, string>> = {
  head: 'Flower head',
  stalk: 'Stalk',
  leaves: 'Leaves',
  ground: 'Ground',
  flower: 'Flower',
  wall: 'Wall',
  flowers: 'Flowers',
  curb: 'Curb',
  road: 'Road',
  grass: 'Grass',
};

/** The region under a tap, as percentages of the image, or null for a tap on no region. */
export function regionAt(imageId: string, xPct: number, yPct: number): string | null {
  const regions = BOSS_IMAGES[imageId]?.regions;
  if (!regions) return null;
  for (const [id, rects] of Object.entries(regions)) {
    if (rects.some((r) => xPct >= r.x && xPct <= r.x + r.w && yPct >= r.y && yPct <= r.y + r.h)) {
      return id;
    }
  }
  return null;
}

/**
 * A pointer position as percentages of the image box it landed on.
 *
 * Takes the box's own rectangle, so the answer is the same whatever size the photograph is drawn
 * at: a region is a percentage of the PICTURE, never a pixel. The box must be the image itself
 * (no padding around it), which is why the screen puts its ref on the inner element.
 */
export function pointInBox(
  box: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  if (box.width <= 0 || box.height <= 0) return null;
  const x = ((clientX - box.left) / box.width) * 100;
  const y = ((clientY - box.top) / box.height) * 100;
  if (x < 0 || x > 100 || y < 0 || y > 100) return null;
  return { x, y };
}
