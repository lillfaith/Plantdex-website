#!/usr/bin/env python3
"""Turn a botanical photograph into the two artwork assets a generated card needs.

────────────────────────────────────────────────────────────────────────────────
TWO ASSETS, BOTH DERIVED FROM THE PHOTOGRAPH, NEITHER A SHRUNKEN COPY OF IT.

  cutout     The plant on transparency, for the art window and the supporting panel.
             The printed cards place a cut-out plant on the backdrop; a rectangular crop
             with its own sky and gravel in it reads as a snapshot pasted onto a card.

  pixel      The TRUE PIXEL ICON for the supporting panel. The deck's own icon was
             measured rather than guessed: `reference-pixel-icon.png` is 360px wide and
             its most common horizontal colour run is 13px, so it is a ~28x28 mosaic
             upscaled with nearest neighbour -- the same grid the creature sprites use.
             Downsampling a photo to 28 squares and blowing it back up is exactly that,
             and it is NOT the same thing as scaling a photo down to icon size, which
             stays a photo and reads as one.

Segmentation is GrabCut: classical, offline, no model download, and it fails VISIBLY
rather than subtly -- a bad cut leaves obvious holes, where a learned matte can quietly
invent a plausible edge that is not the plant's.

    python3 scripts/card_art.py photo.jpg --out art/ --grid 28
"""

from __future__ import annotations

import argparse
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image

# Measured from `docs/assets/card-kit/reference-pixel-icon.png`: 360 / 13 ~= 28.
PIXEL_GRID = 28
PIXEL_OUT = 360


def grabcut(bgr: np.ndarray, margin: float, iterations: int) -> np.ndarray:
    """Foreground alpha, 0-255. The rectangle is the frame inset by `margin`."""
    h, w = bgr.shape[:2]
    mx, my = int(w * margin), int(h * margin)
    rect = (mx, my, w - 2 * mx, h - 2 * my)
    mask = np.zeros((h, w), np.uint8)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(bgr, mask, rect, bgd, fgd, iterations, cv2.GC_INIT_WITH_RECT)
    alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    # Close pin-holes inside petals, then soften the edge by one pixel so the cut does not
    # read as a sticker.
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return cv2.GaussianBlur(alpha, (3, 3), 0)


def plant_blobs(alpha: np.ndarray, keep: float = 0.12) -> np.ndarray:
    """Keep every piece at least `keep` of the biggest one.

    `largest_blob` is right when the mask was built from a rectangle prior and everything
    outside the subject is suspect. After region growing from a plant-colour core it is
    too strict: the surviving pieces are already plant-coloured, and a stem pinched to a
    few pixels by a shadow becomes its own component, so keeping only the largest throws
    away the stem and the bud hanging off it -- the parts that make a photograph a
    SPECIMEN rather than a close-up of one flower head.
    """
    count, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 127).astype(np.uint8), 8)
    if count <= 1:
        return alpha
    areas = stats[1:, cv2.CC_STAT_AREA]
    cutoff = areas.max() * keep
    wanted = {i + 1 for i, a in enumerate(areas) if a >= cutoff}
    mask = np.isin(labels, list(wanted))
    return np.where(mask, alpha, 0).astype(np.uint8)


def largest_blob(alpha: np.ndarray) -> np.ndarray:
    """Keep the biggest connected piece.

    A photograph of a plant has one subject; everything else GrabCut kept is a leaf from
    a neighbouring plant or a bright stone, and on a card it reads as dirt on the lens.
    """
    count, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 127).astype(np.uint8), 8)
    if count <= 1:
        return alpha
    biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return np.where(labels == biggest, alpha, 0).astype(np.uint8)


def plant_seed(bgr: np.ndarray) -> np.ndarray:
    """A GrabCut seed mask built from PLANT COLOUR, not from a rectangle.

    THE RECTANGLE PRIOR IS WHY THE CUTOUTS FAILED. `GC_INIT_WITH_RECT` assumes the subject
    fills a centred box and everything outside it is background -- which is false for a
    field photograph. On the chamomile set it kept a fist-sized patch of gravel on one
    photo and the PHOTOGRAPHER'S FINGER on another, and the finger survived because it is
    central, large and nothing in the model said it was not the plant.

    Colour does say so. A chamomile is white ray florets, a yellow disc and green foliage;
    skin is none of those, and nor is limestone. So the seed marks those three families as
    probable foreground, marks confidently-not-plant pixels as probable background, and
    lets GrabCut refine the boundary from there instead of inventing one.

    Deliberately SEED, not a final mask: a hard colour threshold alone cuts shadowed petals
    and halates against a bright sky. GrabCut is good at the edge once it is told roughly
    where the subject is -- that was always the missing half.
    """
    # REGION GROWING FROM A CONFIDENT CORE, because colour alone cannot separate a white
    # ray floret from a white stone. The disc and the foliage are unambiguous -- nothing in
    # a limestone bed is saturated yellow or saturated green -- so those are the core, and
    # pale pixels join the plant ONLY if they are connected to that core. A petal is; a
    # stone two inches away is not, however similar its colour.
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    H, S, V = hsv[:, :, 0].astype(int), hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
    white = (V > 165) & (S < 60)                       # ray florets
    yellow = (H >= 18) & (H <= 38) & (S > 90) & (V > 110)   # the disc
    green = (H >= 35) & (H <= 90) & (S > 55) & (V > 45)     # foliage and stems
    # Skin is a specific failure this exists to stop: warm, mid-saturation, never green.
    # NOTE THE `white` IN THE EXCLUSION. Ray florets are not neutral white -- they pick up
    # warm light and sit at S ~40-80 -- so a skin test that only spares yellow and green
    # classifies the petals themselves as skin, and region growing then cannot reach them.
    # That left one sprite as a bare yellow disc with every petal cut off.
    skin = (((H <= 25) | (H >= 170)) & (S > 35) & (S < 165) & (V > 90)) & ~(yellow | green | white)

    core = cv2.morphologyEx((yellow | green).astype(np.uint8), cv2.MORPH_CLOSE,
                            np.ones((9, 9), np.uint8)).astype(bool)
    core = (plant_blobs(core.astype(np.uint8) * 255, keep=0.05) > 0)
    reachable = (core | white) & ~skin
    grown = core.copy()
    k3 = np.ones((3, 3), np.uint8)
    for _ in range(220):                      # ~1 plant-width at the 1200px working size
        nxt = (cv2.dilate(grown.astype(np.uint8), k3) > 0) & reachable
        if nxt.sum() == grown.sum():
            break
        grown = nxt
    plant = cv2.morphologyEx(grown.astype(np.uint8), cv2.MORPH_CLOSE,
                             np.ones((9, 9), np.uint8)).astype(bool)
    # NOT `largest_blob`. On the best chamomile photograph in the set the plant-coloured
    # core breaks into 41 components, because the photographer's finger passes BEHIND the
    # stem and interrupts the green: the flower head is one component, the stem another,
    # the bud a third. Keeping only the largest discarded 61% of the plant-coloured pixels
    # and produced a cutout of a flower head with no stem and no bud -- the parts that make
    # the photograph a specimen. Every substantial plant-coloured piece seeds the grow.
    plant = plant_blobs(plant.astype(np.uint8) * 255, keep=0.05) > 0
    # Grow the seed a little: the true edge lies just outside a strict colour match.
    near = cv2.dilate(plant.astype(np.uint8), np.ones((25, 25), np.uint8)) > 0

    mask = np.full(bgr.shape[:2], cv2.GC_PR_BGD, np.uint8)
    mask[near] = cv2.GC_PR_FGD
    mask[plant] = cv2.GC_FGD
    mask[skin] = cv2.GC_BGD
    mask[~near] = cv2.GC_BGD
    return mask


def grabcut_seeded(bgr: np.ndarray, iterations: int) -> np.ndarray:
    mask = plant_seed(bgr)
    if (mask == cv2.GC_FGD).sum() < 200:          # no plant colour found; nothing to seed
        return None
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(bgr, mask, None, bgd, fgd, iterations, cv2.GC_INIT_WITH_MASK)
    alpha = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    return cv2.GaussianBlur(alpha, (3, 3), 0)


def cutout(path: pathlib.Path, margin: float, iterations: int) -> Image.Image:
    bgr = cv2.imread(str(path))
    if bgr is None:
        raise SystemExit(f"cannot read {path}")
    # Work at a sane size: GrabCut on a 2048px photo is slow and no more accurate.
    h, w = bgr.shape[:2]
    scale = 1200 / max(h, w)
    if scale < 1:
        bgr = cv2.resize(bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    alpha = grabcut_seeded(bgr, iterations)
    if alpha is None:                  # fall back to the rectangle prior, visibly
        print(f"   {path.name}: no plant colour found, falling back to the rectangle prior")
        alpha = grabcut(bgr, margin, iterations)
    alpha = plant_blobs(alpha)
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    out = np.dstack([rgb, alpha])
    im = Image.fromarray(out, "RGBA")
    box = im.getbbox()
    return im.crop(box) if box else im


def pixelate(im: Image.Image, grid: int = PIXEL_GRID, size: int = PIXEL_OUT) -> Image.Image:
    """A true mosaic: `grid` squares across, then nearest-neighbour back up.

    The alpha is quantised too -- a block is either in the plant or it is not. A mosaic
    with soft edges is a blurred photo wearing a grid, which is the thing this replaces.
    """
    side = max(im.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
    small = square.resize((grid, grid), Image.BOX)
    data = np.array(small)
    data[..., 3] = np.where(data[..., 3] > 110, 255, 0)
    small = Image.fromarray(data, "RGBA")
    return small.resize((size, size), Image.NEAREST)


def coverage(im: Image.Image) -> float:
    a = np.array(im)[..., 3]
    return float((a > 127).mean())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("photos", nargs="+")
    parser.add_argument("--out", required=True)
    parser.add_argument("--margin", type=float, default=0.06)
    parser.add_argument("--iterations", type=int, default=6)
    parser.add_argument("--grid", type=int, default=PIXEL_GRID)
    args = parser.parse_args()

    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for name in args.photos:
        path = pathlib.Path(name)
        cut = cutout(path, args.margin, args.iterations)
        cut.save(out / f"{path.stem}-cutout.png")
        pix = pixelate(cut, args.grid)
        pix.save(out / f"{path.stem}-pixel.png")
        print(f"{path.name}: cutout {cut.size} coverage {coverage(cut):.0%}"
              f"  pixel {pix.size} ({args.grid}x{args.grid} grid)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
