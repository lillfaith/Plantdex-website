#!/usr/bin/env python3
"""Isolate a plant from its photograph: BiRefNet first, colour segmentation as fallback.

WHY BIREFNET AND NOT THE OTHER AI MODELS. U2Net and ISNet are salient-object detectors and
they resolve a plant to its single most conspicuous blob -- on the best chamomile photograph
U2Net kept the yellow disc and discarded every petal, and SAM returned one petal.
BiRefNet is a dichotomous-segmentation model built for exactly the case those fail at: fine,
high-frequency boundaries. On the same photograph it keeps petals, stem, leaves and bud AND
removes the background foliage that colour segmentation cannot, because it is separating
figure from ground rather than matching hues.

It costs ~25s an image against ~2s for the colour method, which is why the pipeline SCORES
cheaply and segments only the few candidates it is going to show. At 2,000 species that is
the difference between a few CPU-hours and a few hundred.

    python3 scripts/segment_plant.py photo.jpg --out cutout.png
    python3 scripts/segment_plant.py --self-test
"""
from __future__ import annotations

import argparse, os, pathlib, sys

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import card_art                                       # noqa: E402

MODEL = os.environ.get("PLANTDEX_SEGMENT_MODEL", "birefnet-general-lite")
WORK_EDGE = 1200
MIN_KEEP = 0.02          # below this the model found nothing and the fallback is used
SHATTERED = 6            # this many substantial pieces is not one specimen
MAX_RESCUE_SOLIDITY = 0.80   # measured: a grow above this returned the whole photograph
KEEP_COMPONENT = 0.04    # keep pieces at least this fraction of the largest
_SESSION = {}


def _session():
    from rembg import new_session
    if MODEL not in _SESSION:
        _SESSION[MODEL] = new_session(MODEL)
    return _SESSION[MODEL]


def tidy(alpha: np.ndarray) -> np.ndarray:
    """Drop specks, keep every substantial piece, and soften the rim by one pixel.

    NOT `largest_blob`: a plant photographed against anything is routinely several
    components -- a bud below a leaf, a stem crossed by a shadow -- and keeping only the
    biggest is what reduced the best photograph in the set to a flower head with no stem.
    The deck's own cutouts measure ~1.8 halo pixels per boundary pixel, so a hard-edged
    mask would not match them either.
    """
    hard = (alpha > 127).astype(np.uint8)
    hard = cv2.morphologyEx(hard, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(hard, 8)
    if n > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        keep = [i + 1 for i, a in enumerate(areas) if a >= areas.max() * KEEP_COMPONENT]
        hard = np.isin(labels, keep).astype(np.uint8)
    out = np.where(hard > 0, alpha, 0).astype(np.uint8)
    return cv2.GaussianBlur(out, (3, 3), 0)


def edge_contact(alpha: np.ndarray) -> dict:
    """How much of each frame edge the SEGMENTED subject occupies, before cropping.

    This has to be measured here and nowhere else. Once the cutout is cropped to its
    bounding box the information is gone, and measuring it on the colour mask instead --
    which is what the first version did -- answers a different question entirely: in any
    field photograph background vegetation touches all four edges, so every candidate
    looked clipped and the gate rejected the whole set.
    """
    a = alpha > 127
    h, w = a.shape
    t = max(1, int(h * 0.02))
    return {"top": round(float(a[:t].mean()), 3),
            "bottom": round(float(a[-t:].mean()), 3),
            "left": round(float(a[:, :max(1, int(w * 0.02))].mean()), 3),
            "right": round(float(a[:, -max(1, int(w * 0.02)):].mean()), 3)}


def _grow_rescue(rgb: np.ndarray, seed: np.ndarray) -> np.ndarray | None:
    """Grow the seed into plant-coloured regions connected to it. None if it over-grows.

    The over-growth check is the point and it is measured, not chosen: on the pilot the
    grown masks that returned the photograph scored 0.86-0.97 for fill of their own
    bounding box, and the ones that were genuine cutouts scored 0.27-0.52. Above 0.80 this
    refuses and the ordinary fallback path runs instead.
    """
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    h, s_, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    plant = ((h >= 22) & (h <= 95) & (s_ >= 40) & (v >= 25)) | seed
    n, lab = cv2.connectedComponents(plant.astype(np.uint8), 8)
    near = cv2.dilate(seed.astype(np.uint8), np.ones((9, 9), np.uint8), 2).astype(bool)
    out = seed.copy()
    for i in range(1, n):
        comp = lab == i
        size = int(comp.sum())
        if size < 200:
            continue
        if int((comp & near).sum()) >= min(150, max(20, int(size * 0.02))):
            out |= comp
    if not out.any():
        return None
    ys, xs = np.nonzero(out)
    box = max(1, (ys.max() - ys.min() + 1) * (xs.max() - xs.min() + 1))
    if out.sum() / box > MAX_RESCUE_SOLIDITY:
        return None
    return out


def cutout(path: pathlib.Path, work_edge: int = WORK_EDGE
           ) -> tuple[Image.Image, str, dict]:
    """Returns the RGBA cutout, the method that produced it, and its frame-edge contact."""
    im = Image.open(path).convert("RGB")
    im.thumbnail((work_edge, work_edge), Image.LANCZOS)
    try:
        from rembg import remove
        a = np.array(remove(im, session=_session()).convert("RGBA").getchannel("A"))
        if (a > 127).mean() >= MIN_KEEP:
            tidied = tidy(a)
            edges = edge_contact(tidied)
            rgba = Image.fromarray(np.dstack([np.array(im), tidied]), "RGBA")
            box = rgba.getbbox()
            return (rgba.crop(box) if box else rgba), MODEL, edges
        # EXPERIMENTAL GROW, AND ONLY WHERE THE BASELINE PRODUCED NOTHING USABLE.
        #
        # The pilot settled that the seeded grow is not a production step: on five of eight
        # photographs it returned something close to the original frame (solidity up to
        # 0.967, which is a rectangle of vegetation, not a cutout). It is kept for the one
        # case it demonstrably rescued -- pine 111407747, where BiRefNet Lite returned an
        # EMPTY mask in ten fragments and the grow recovered a clean branch because the
        # leaf litter behind it is brown rather than green.
        #
        # That is the whole gate: empty, or shattered. Where the baseline found a coherent
        # subject the grow is never consulted, because where it fails it fails by keeping
        # too much, and too much looks like success to every metric that counts retention.
        #
        # The result is MARKED. `birefnet-general-lite+grow-rescue` travels with the
        # candidate into candidates.json and gates.py, which refuses to let any
        # grow-rescued cutout reach an approval: a recovered structure and an added
        # background look identical to a number and must be looked at.
        kept = (a > 127).mean()
        n, _, st, _ = cv2.connectedComponentsWithStats((a > 127).astype(np.uint8), 8)
        shards = int((st[1:, cv2.CC_STAT_AREA] >= st[1:, cv2.CC_STAT_AREA].max() * 0.05).sum()) if n > 1 else 1
        if kept < MIN_KEEP or shards >= SHATTERED:
            grown = _grow_rescue(np.array(im), a > 127)
            if grown is not None:
                tidied = tidy((grown * 255).astype(np.uint8))
                edges = edge_contact(tidied)
                rgba = Image.fromarray(np.dstack([np.array(im), tidied]), "RGBA")
                box = rgba.getbbox()
                print(f"   [segment] GROW RESCUE: baseline kept {kept:.3f} in {shards} "
                      f"piece(s); recovered {grown.mean():.3f}. Needs visual review.",
                      file=sys.stderr)
                return (rgba.crop(box) if box else rgba), f"{MODEL}+grow-rescue", edges
        reason = f"{MODEL} kept {kept:.3f}, below {MIN_KEEP}"
    except Exception as exc:                            # model missing, no network, OOM
        reason = f"{type(exc).__name__}: {exc}"[:120]
    # FALLBACK IS LOUD. A silent downgrade would ship a visibly worse cutout under the
    # name of the better method, and nobody reviewing the card would know which ran.
    print(f"   [segment] falling back to colour segmentation -- {reason}", file=sys.stderr)
    fb = card_art.cutout(path, margin=0.06, iterations=6)
    return fb, "colour-fallback", {}


def self_test() -> int:
    checks = []
    try:
        import rembg                                    # noqa: F401
        checks.append((True, "rembg is importable"))
    except ImportError:
        checks.append((False, "rembg is importable"))
    # CONTROL: tidy() must not reduce two real pieces to one.
    a = np.zeros((100, 100), np.uint8)
    a[10:40, 10:40] = 255
    a[60:90, 60:90] = 255
    n, _, _, _ = cv2.connectedComponentsWithStats((tidy(a) > 127).astype(np.uint8), 8)
    checks.append((n - 1 == 2, "CONTROL: tidy() keeps both substantial pieces"))
    # CONTROL: a speck beside a large piece is dropped.
    b = np.zeros((100, 100), np.uint8)
    b[10:60, 10:60] = 255
    b[90:92, 90:92] = 255
    n2, _, _, _ = cv2.connectedComponentsWithStats((tidy(b) > 127).astype(np.uint8), 8)
    checks.append((n2 - 1 == 1, "CONTROL: tidy() drops a speck"))
    ok = True
    for good, label in checks:
        print(("PASS  " if good else "FAIL  ") + label)
        ok &= bool(good)
    print("\n" + ("ALL SELF-TESTS PASSED" if ok else "SELF-TESTS FAILED"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("photo", nargs="?")
    ap.add_argument("--out")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if not a.photo:
        ap.error("a photo is required")
    cut, how, _ = cutout(pathlib.Path(a.photo))
    out = a.out or (pathlib.Path(a.photo).stem + "-cutout.png")
    cut.save(out)
    print(f"{out}  {cut.size}  via {how}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
