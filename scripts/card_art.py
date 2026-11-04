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


def cutout(path: pathlib.Path, margin: float, iterations: int) -> Image.Image:
    bgr = cv2.imread(str(path))
    if bgr is None:
        raise SystemExit(f"cannot read {path}")
    # Work at a sane size: GrabCut on a 2048px photo is slow and no more accurate.
    h, w = bgr.shape[:2]
    scale = 1200 / max(h, w)
    if scale < 1:
        bgr = cv2.resize(bgr, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    alpha = largest_blob(grabcut(bgr, margin, iterations))
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
