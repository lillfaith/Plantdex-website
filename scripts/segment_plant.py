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


def cutout(path: pathlib.Path, work_edge: int = WORK_EDGE) -> tuple[Image.Image, str]:
    """Returns the RGBA cutout and the method that produced it."""
    im = Image.open(path).convert("RGB")
    im.thumbnail((work_edge, work_edge), Image.LANCZOS)
    try:
        from rembg import remove
        a = np.array(remove(im, session=_session()).convert("RGBA").getchannel("A"))
        if (a > 127).mean() >= MIN_KEEP:
            rgba = Image.fromarray(np.dstack([np.array(im), tidy(a)]), "RGBA")
            box = rgba.getbbox()
            return (rgba.crop(box) if box else rgba), MODEL
        reason = f"{MODEL} kept {(a > 127).mean():.3f}, below {MIN_KEEP}"
    except Exception as exc:                            # model missing, no network, OOM
        reason = f"{type(exc).__name__}: {exc}"[:120]
    # FALLBACK IS LOUD. A silent downgrade would ship a visibly worse cutout under the
    # name of the better method, and nobody reviewing the card would know which ran.
    print(f"   [segment] falling back to colour segmentation -- {reason}", file=sys.stderr)
    return card_art.cutout(path, margin=0.06, iterations=6), "colour-fallback"


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
    cut, how = cutout(pathlib.Path(a.photo))
    out = a.out or (pathlib.Path(a.photo).stem + "-cutout.png")
    cut.save(out)
    print(f"{out}  {cut.size}  via {how}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
