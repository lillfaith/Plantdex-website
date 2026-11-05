#!/usr/bin/env python3
"""Measure the photographic composition of every shipped PlantDex front.

WHAT CAN AND CANNOT BE RECOVERED. The shipped cards are FLATTENED: there is no separate
photographic layer in `public/cards/*.webp`, and `build_deck.py` rasterises print masters
that are not in this repository. What IS recoverable is the photograph's footprint, because
`docs/assets/cardbase.pdf` is the same template with no content on it -- so every pixel
inside the art window that differs from the template is photograph, and every pixel that
matches is backdrop showing through.

That gives footprint, placement, crop behaviour, edge softness and colour faithfully. It
does NOT give the photograph's own pixels where it is composited at less than full opacity,
so "lighting" below is measured on the COMPOSITED result and is a property of the card, not
of the source photograph. Stated rather than glossed, because a style profile built on a
misread layer would be confidently wrong for 2,000 species.

    python3 scripts/analyze_card_photos.py --out docs/plantdex-photo-style.json
    python3 scripts/analyze_card_photos.py --self-test
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CARDS = ROOT / "public" / "cards"
TEMPLATE = ROOT / "docs" / "assets" / "cardbase.pdf"
WIDTH, HEIGHT = 800, 1293
SLOT_PHOTO = (105, 197, 698, 681)          # the art window's inner opening, 593x484
DIFF = 40                                   # a pixel differs from the template by this much


def template_front() -> np.ndarray:
    import pymupdf
    doc = pymupdf.open(TEMPLATE)
    page = doc[0]
    zoom = WIDTH / page.rect.width
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
    im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    return np.array(im).astype(int)


def card_fronts() -> list[tuple[str, np.ndarray]]:
    out = []
    for p in sorted(CARDS.glob("*.webp")):
        im = Image.open(p).convert("RGB").resize((WIDTH, HEIGHT), Image.LANCZOS)
        out.append((p.stem, np.array(im).astype(int)))
    return out


def edge_softness(mask: np.ndarray) -> float:
    """Halo pixels per unit of boundary: 0 is a hard cut, 2+ is a soft one."""
    grown = mask.copy()
    for _ in range(2):
        g = grown.copy()
        g[:-1] |= grown[1:]; g[1:] |= grown[:-1]
        g[:, :-1] |= grown[:, 1:]; g[:, 1:] |= grown[:, :-1]
        grown = g
    halo = grown & ~mask
    b = np.zeros_like(mask)
    b[:-1] |= mask[:-1] & ~mask[1:]; b[1:] |= mask[1:] & ~mask[:-1]
    b[:, :-1] |= mask[:, :-1] & ~mask[:, 1:]; b[:, 1:] |= mask[:, 1:] & ~mask[:, :-1]
    return float(halo.sum() / max(1, b.sum()))


def measure(name: str, front: np.ndarray, tpl: np.ndarray) -> dict | None:
    x0, y0, x1, y1 = SLOT_PHOTO
    sub, bs = front[y0:y1, x0:x1], tpl[y0:y1, x0:x1]
    H, W = sub.shape[:2]
    m = np.abs(sub - bs).max(axis=2) > DIFF
    # DENOISE BEFORE MEASURING ANYTHING POSITIONAL. The card and the template are the same
    # artwork resampled twice, so a handful of pixels on a gold corner or a hairline rail
    # differ by more than the threshold. They are a rounding artefact, not photograph -- but
    # a bounding box is a MIN and a MAX, so four stray pixels in four corners report every
    # card as filling the frame and touching all four edges, which is what the first run of
    # this script did. Keeping only components of real size is what makes the box mean
    # something.
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    if count > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        keep = {i + 1 for i, a in enumerate(areas) if a >= 400}
        m = np.isin(labels, list(keep)) if keep else np.zeros_like(m, bool)
    m = m.astype(bool)
    if m.sum() < 2000:
        return None
    ys, xs = np.nonzero(m)
    bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
    bw, bh = bx1 - bx0 + 1, by1 - by0 + 1
    px = sub[m]
    mx = px.max(axis=1); mn = px.min(axis=1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    g = sub[:, :, 1].astype(float)
    sharp = float(np.mean(np.abs(np.diff(g, axis=0))[:, :-1] + np.abs(np.diff(g, axis=1))[:-1, :]))
    # green fraction is a proxy for how much foliage is on the card
    r, gg, b = px[:, 0], px[:, 1], px[:, 2]
    foliage = float(np.mean((gg > r + 8) & (gg > b + 8)))
    return {
        "card": name,
        "frame_fill": round(float(m.mean()), 4),                 # of the whole opening
        "bbox_fill": round(float(m.sum() / max(1, bw * bh)), 4),  # solidity within its box
        "bbox": [int(bx0), int(by0), int(bw), int(bh)],
        "bbox_w_frac": round(bw / W, 3),
        "bbox_h_frac": round(bh / H, 3),
        "centroid_x": round(float(xs.mean() / W), 3),
        "centroid_y": round(float(ys.mean() / H), 3),
        "touch_left": bool(bx0 <= 1), "touch_right": bool(bx1 >= W - 2),
        "touch_top": bool(by0 <= 1), "touch_bottom": bool(by1 >= H - 2),
        "margin_left": int(bx0), "margin_right": int(W - 1 - bx1),
        "margin_top": int(by0), "margin_bottom": int(H - 1 - by1),
        "edge_softness": round(edge_softness(m), 2),
        "mean_brightness": round(float(mx.mean()), 1),
        "max_brightness": int(mx.max()),
        "mean_saturation": round(float(sat.mean()), 3),
        "sharpness": round(sharp, 1),
        "foliage_fraction": round(foliage, 3),
    }


def summarise(rows: list[dict]) -> dict:
    def stat(key):
        v = np.array([r[key] for r in rows], float)
        return {"mean": round(float(v.mean()), 3), "median": round(float(np.median(v)), 3),
                "sd": round(float(v.std()), 3), "min": round(float(v.min()), 3),
                "max": round(float(v.max()), 3),
                "p10": round(float(np.percentile(v, 10)), 3),
                "p90": round(float(np.percentile(v, 90)), 3)}
    keys = ["frame_fill", "bbox_fill", "bbox_w_frac", "bbox_h_frac", "centroid_x",
            "centroid_y", "margin_left", "margin_right", "margin_top", "margin_bottom",
            "edge_softness", "mean_brightness", "max_brightness", "mean_saturation",
            "sharpness", "foliage_fraction"]
    out = {k: stat(k) for k in keys}
    out["_n"] = len(rows)
    for e in ("left", "right", "top", "bottom"):
        out[f"touch_{e}_pct"] = round(100 * sum(r[f"touch_{e}"] for r in rows) / len(rows), 1)
    return out


def self_test() -> int:
    checks = [(TEMPLATE.exists(), "the template PDF is present"),
              (len(list(CARDS.glob("*.webp"))) >= 45, "at least 45 fronts are present")]
    tpl = template_front()
    checks.append((tpl.shape[0] == HEIGHT, f"the template rasterises to {HEIGHT}px"))
    # CONTROL: the template measured against itself must find no photograph at all.
    checks.append((measure("control", tpl, tpl) is None,
                   "CONTROL: the blank template reports no photograph"))
    # CONTROL: a card measured against itself must also report nothing, which catches a
    # denoiser so weak that resampling noise alone would register as a subject.
    one = card_fronts()[0][1]
    checks.append((measure("self", one, one) is None,
                   "CONTROL: a card against itself reports no photograph"))
    ok = True
    for good, label in checks:
        print(("PASS  " if good else "FAIL  ") + label)
        ok &= bool(good)
    print("\n" + ("ALL SELF-TESTS PASSED" if ok else "SELF-TESTS FAILED"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", default="docs/plantdex-photo-style.json")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    tpl = template_front()
    rows = [r for r in (measure(n, f, tpl) for n, f in card_fronts()) if r]
    doc = {"generated_from": "public/cards/*.webp vs docs/assets/cardbase.pdf",
           "slot_photo": list(SLOT_PHOTO), "diff_threshold": DIFF,
           "limitation": ("the shipped cards are flattened; this measures the photograph's "
                          "FOOTPRINT and its composited colour, not the source photograph"),
           "cards": rows, "profile": summarise(rows)}
    out = ROOT / a.out
    out.write_text(json.dumps(doc, indent=2) + "\n")
    p = doc["profile"]
    print(f"measured {p['_n']} cards -> {a.out}\n")
    for k in ("frame_fill", "bbox_w_frac", "bbox_h_frac", "centroid_x", "centroid_y",
              "edge_softness", "max_brightness", "foliage_fraction", "bbox_fill"):
        s = p[k]
        print(f"   {k:18} median {s['median']:7.3f}   p10-p90 {s['p10']:7.3f}-{s['p90']:7.3f}"
              f"   sd {s['sd']:.3f}")
    print()
    for e in ("left", "right", "top", "bottom"):
        print(f"   touches {e:7} on {p[f'touch_{e}_pct']:5.1f}% of cards")
    return 0


if __name__ == "__main__":
    sys.exit(main())
