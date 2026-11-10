#!/usr/bin/env python3
"""Manual foreground guidance: say where the plant is, and cut THAT.

WHY A PERSON IN THE LOOP IS THE RIGHT ANSWER HERE AND NOT A BETTER MODEL. Four
architecturally different networks were compared and they agree with each other: a
salient-object detector answers "what is the subject of this photograph", and in a
photograph of a flowering plant the subject is the FLOWER. Elderberry 424182823 kept its
berries and discarded every leaf; mullein 21260078 kept its spike and discarded the whole
rosette. Growing the mask back out recovered the botany and swallowed the background with
it, because green connectivity separates plant from background only when the background is
not green.

None of that is a thresholding problem. It is a question about intent -- WHICH plant, and
how much of it -- and the cheapest reliable source of intent is the art director pointing
at it. One rectangle, drawn once, turns an unanswerable question into an easy one.

HOW IT WORKS. GrabCut, initialised from the rectangle: everything outside is definite
background, everything inside is probable foreground, and the optimiser separates them on
colour and contrast. Optional `--include` and `--exclude` points are painted as DEFINITE
foreground and background and are what fixes the hard cases -- a leaf the box could not
exclude, a berry cluster the optimiser dropped.

NOTHING IS OVERWRITTEN. The guided cutout is written alongside the original as
`<photo_id>-cutout-guided.png`, the source photograph is never modified, and the result is
reported with the same measurements as the baseline so the two can be compared rather than
assumed about. A guided cutout that is not measurably better is not an improvement.

    python3 scripts/guided_cutout.py --species sambucus_canadensis --photo 424182823 \
        --box 0.05,0.10,0.95,0.92
    python3 scripts/guided_cutout.py --species verbascum_thapsus --photo 21260078 \
        --box 0.18,0.10,0.92,1.0 --exclude 0.05,0.95 --exclude 0.95,0.55
"""
from __future__ import annotations

import argparse, json, pathlib, sys

import cv2
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

CANDS = ROOT / "evidence" / "candidates"
PHOTOS = ROOT / "evidence" / "photos"
WORK = 1200
BRUSH = 0.035          # a hint point paints a disc this fraction of the shorter edge


def green(rgb: np.ndarray) -> np.ndarray:
    hsv = cv2.cvtColor(rgb[:, :, ::-1], cv2.COLOR_BGR2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    return (h >= 22) & (h <= 95) & (s >= 40) & (v >= 25)


def measure(rgb: np.ndarray, alpha: np.ndarray) -> dict:
    g = green(rgb)
    k = np.ones((7, 7), np.uint8)
    thin = g & ~cv2.erode(g.astype(np.uint8), k).astype(bool)
    ys, xs = np.nonzero(alpha)
    box = max(1, (ys.max() - ys.min() + 1) * (xs.max() - xs.min() + 1)) if len(ys) else 1
    n, _, st, _ = cv2.connectedComponentsWithStats(alpha.astype(np.uint8), 8)
    pieces = int((st[1:, cv2.CC_STAT_AREA] >= st[1:, cv2.CC_STAT_AREA].max() * 0.05).sum()) \
        if n > 1 else 1
    return {"green_kept": round(float((g & alpha).sum() / max(1, g.sum())), 3),
            "thin_kept": round(float((thin & alpha).sum() / max(1, thin.sum())), 3),
            "frame_kept": round(float(alpha.mean()), 3),
            "solidity": round(float(alpha.sum() / box), 3),
            "pieces": pieces}


def guided(src: pathlib.Path, box: tuple[float, float, float, float],
           include: list[tuple[float, float]], exclude: list[tuple[float, float]],
           iterations: int = 5) -> tuple[Image.Image, np.ndarray, np.ndarray]:
    im = Image.open(src).convert("RGB")
    im.thumbnail((WORK, WORK), Image.LANCZOS)
    rgb = np.array(im)
    h, w = rgb.shape[:2]
    mask = np.full((h, w), cv2.GC_BGD, np.uint8)
    x0, y0, x1, y1 = (int(box[0] * w), int(box[1] * h), int(box[2] * w), int(box[3] * h))
    mask[y0:y1, x0:x1] = cv2.GC_PR_FGD
    r = max(4, int(min(h, w) * BRUSH))
    for fx, fy in include:
        cv2.circle(mask, (int(fx * w), int(fy * h)), r, int(cv2.GC_FGD), -1)
    for fx, fy in exclude:
        cv2.circle(mask, (int(fx * w), int(fy * h)), r, int(cv2.GC_BGD), -1)
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(rgb[:, :, ::-1].copy(), mask, None, bgd, fgd, iterations,
                cv2.GC_INIT_WITH_MASK)
    alpha = np.isin(mask, (cv2.GC_FGD, cv2.GC_PR_FGD))
    # One closing pass: GrabCut leaves pinholes inside dense foliage, and a hole in a leaf
    # is never a correct answer. Deliberately no opening -- that is what removes stems.
    alpha = cv2.morphologyEx(alpha.astype(np.uint8), cv2.MORPH_CLOSE,
                             np.ones((5, 5), np.uint8)).astype(bool)
    return im, rgb, alpha


def baseline_alpha(species: str, photo_id: str, rgb: np.ndarray) -> np.ndarray | None:
    """The saved cutout's mask, put back WHERE IT CAME FROM.

    The cutout on disk is cropped to its own bounding box, so comparing it to a full-frame
    mask means first finding where that crop sits. Stretching it to the frame instead --
    which is what the first version of this did, and what review_gallery.py still does --
    inflates every retention number, because a mask covering a third of the plant is scaled
    up to cover the whole image. The crop is located by matching its pixels against the
    source, which is exact: the cutout's RGB is a literal copy of that region.
    """
    row = next((r for r in json.loads((CANDS / species / "candidates.json").read_text())
                .get("selected", []) if str(r["photo_id"]) == str(photo_id)), None)
    if not row:
        return None
    cut = CANDS / species / row["cutout"]
    if not cut.exists():
        return None
    c = Image.open(cut).convert("RGBA")
    H, W = rgb.shape[:2]
    if c.width > W or c.height > H:
        k = min(W / c.width, H / c.height)
        c = c.resize((max(1, int(c.width * k)), max(1, int(c.height * k))), Image.LANCZOS)
    arr = np.array(c)
    hit = cv2.matchTemplate(rgb, arr[:, :, :3], cv2.TM_CCOEFF_NORMED)
    _, score, _, loc = cv2.minMaxLoc(hit)
    if score < 0.5:
        return None                                    # cannot place it honestly
    out = np.zeros((H, W), bool)
    x, y = loc
    out[y:y + arr.shape[0], x:x + arr.shape[1]] = arr[:, :, 3] > 127
    return out


def main() -> int:
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--species", required=True)
    a.add_argument("--photo", required=True)
    a.add_argument("--box", required=True, help="x0,y0,x1,y1 as fractions of the frame")
    a.add_argument("--include", action="append", default=[], help="x,y definite plant")
    a.add_argument("--exclude", action="append", default=[], help="x,y definite background")
    a.add_argument("--iterations", type=int, default=5)
    args = a.parse_args()

    doc = json.loads((PHOTOS / args.species / "photos.json").read_text())
    entry = next((e for e in doc["photos"] if str(e["photo_id"]) == args.photo), None)
    if not entry:
        print(f"{args.photo}: not in {args.species}'s manifest")
        return 1
    src = PHOTOS / args.species / entry["file"]
    if not src.exists():
        print(f"{src.name}: original not retained; re-download needed")
        return 1

    box = tuple(float(x) for x in args.box.split(","))
    inc = [tuple(float(v) for v in p.split(",")) for p in args.include]
    exc = [tuple(float(v) for v in p.split(",")) for p in args.exclude]
    im, rgb, alpha = guided(src, box, inc, exc, args.iterations)

    base = baseline_alpha(args.species, args.photo, rgb)
    mine = measure(rgb, alpha)
    print(f"=== {args.species} #{args.photo} ===")
    if base is None:
        print("  baseline  could not be located in the source frame; not compared")
    else:
        b = measure(rgb, base)
        print(f"  baseline  green {b['green_kept']:.3f}  thin {b['thin_kept']:.3f}  "
              f"frame {b['frame_kept']:.3f}  solidity {b['solidity']:.3f}  "
              f"pieces {b['pieces']}")
    print(f"  guided    green {mine['green_kept']:.3f}  thin {mine['thin_kept']:.3f}  "
          f"frame {mine['frame_kept']:.3f}  solidity {mine['solidity']:.3f}  "
          f"pieces {mine['pieces']}")

    out = CANDS / args.species / f"{args.photo}-cutout-guided.png"
    rgba = np.dstack([rgb, (alpha * 255).astype(np.uint8)])
    img = Image.fromarray(rgba, "RGBA")
    bb = img.getbbox()
    (img.crop(bb) if bb else img).save(out)
    meta = out.with_suffix(".json")
    meta.write_text(json.dumps({
        "species": args.species, "photo_id": args.photo, "method": "grabcut-guided",
        "box": box, "include": inc, "exclude": exc, "iterations": args.iterations,
        "measurements": mine,
        "note": "Guided by a human-drawn box. The baseline cutout and the source "
                "photograph are untouched; this is written alongside them.",
    }, indent=2) + "\n")
    print(f"  wrote {out.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
