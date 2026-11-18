"""Role-aware screening of ONE photograph: measure it, then judge it for three different jobs.

WHY THIS EXISTS. The batch tool ranked photographs by iNaturalist votes and screened nothing, and
one pool of 30 served three different jobs. A photograph that makes a good MAIN image (a complete
branch, leaves and flowers, room to cut it out) is usually a poor PIXEL source (one complete head,
a clean silhouette at 24px) and a poor TALL preview (one upright, uncluttered stalk). So a photo is
measured once and evaluated three times.

REUSES the existing pipeline rather than rewriting it:
  * segment_plant.py  - the BiRefNet cutout and its `tidy` clean-up (the subject mask)
  * photo_pipeline.py - `masks` and `skin_blob`, the hand detector

TWO KINDS OF OUTCOME, AND THEY ARE KEPT APART.
  hard   a failure this module can detect RELIABLY (too small, too blurry, a hand in the way, no
         subject, a dense patch with no separable subject, a subject cut off by several edges, a
         flower head cut by the frame, an upright stalk missing its top).
  flag   something it cannot be sure of (perspective, fisheye distortion, whether a cluster is
         representative, a similar species). These NEVER reject; they travel with the photo so a
         person looking at the contact sheet knows what to check.

Everything here is a MEASUREMENT of colour and shape, not botany. A mask can be wrong; a colour
window can mistake a white sky for flowers (which is why flower pixels are only counted INSIDE the
subject mask). The thresholds are conservative on purpose: when in doubt, flag, do not reject.
"""
from __future__ import annotations

import pathlib
import sys

import cv2
import numpy as np
from PIL import Image, ImageOps

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

WORK = 768                 # longest edge the mask is computed at (speed; the shape is what matters)
EDGE = 0.012               # a subject within this share of the frame of an edge TOUCHES it
MIN_ORIGINAL_EDGE = 1200   # px, the original's long edge; below this there is nothing to upscale from
BLUR_REJECT = 12.0         # Laplacian variance on the subject at WORK; below = very soft
BLUR_FLAG = 40.0
DENSE_COVERAGE = 0.72
TINY_HEIGHT = 0.30
TINY_AREA = 0.05

# Flower colour windows, OpenCV HSV (H 0-179, S/V 0-255). Counted only INSIDE the subject mask.
FLOWER_KINDS = {
    "white": lambda h, s, v: (s <= 45) & (v >= 175),
    "pink_purple": lambda h, s, v: (h >= 125) & (h <= 175) & (s >= 45) & (v >= 90),
    "yellow": lambda h, s, v: (h >= 15) & (h <= 35) & (s >= 110) & (v >= 120),
    # rust / red-brown seed or flower spikes (docks, plantains, mugworts): warm hue, moderate-to-high saturation, mid value
    "brown": lambda h, s, v: ((h <= 18) | (h >= 172)) & (s >= 70) & (v >= 50) & (v <= 215),
    # no reliable flower colour (tiny, dull flowers): colour presence is not scored, and nothing is flagged for lacking it
    "none": lambda h, s, v: (h < 0),
}
EXPECTED_FLOWER_SHARE = {"white": 0.10, "pink_purple": 0.07, "yellow": 0.05, "brown": 0.06, "none": 0.0}


# --- the subject mask ------------------------------------------------------------------------

def default_mask_fn(rgb: np.ndarray) -> np.ndarray:
    """The existing pipeline's BiRefNet segmentation, cleaned with its own `tidy`."""
    import segment_plant as S
    from rembg import remove
    alpha = np.array(remove(Image.fromarray(rgb), session=S._session()).convert("RGBA").getchannel("A"))
    return S.tidy(alpha) > 127


def load_work(path: pathlib.Path) -> np.ndarray:
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    im.thumbnail((WORK, WORK), Image.LANCZOS)
    return np.array(im)


# --- measuring -------------------------------------------------------------------------------

def _touch(box, shape, strip_px=None) -> dict:
    h, w = shape
    x, y, bw, bh = box
    return {"top": y <= EDGE * h, "bottom": y + bh >= (1 - EDGE) * h,
            "left": x <= EDGE * w, "right": x + bw >= (1 - EDGE) * w}


def _components(mask: np.ndarray, min_frac: float = 0.0015) -> list[dict]:
    n, labels, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    h, w = mask.shape
    out = []
    for i in range(1, n):
        a = int(st[i, cv2.CC_STAT_AREA])
        if a < min_frac * h * w:
            continue
        box = (int(st[i, 0]), int(st[i, 1]), int(st[i, 2]), int(st[i, 3]))
        comp = labels == i
        cnts, _ = cv2.findContours(comp.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        hull = cv2.contourArea(cv2.convexHull(max(cnts, key=cv2.contourArea))) if cnts else 0
        out.append({"area": a / (h * w), "box": box, "touch": _touch(box, mask.shape),
                    "solidity": round(a / hull, 3) if hull else 0.0,
                    "h_frac": box[3] / h, "w_frac": box[2] / w, "mask": comp})
    out.sort(key=lambda c: -c["area"])
    return out


def _lab_delta(rgb: np.ndarray, inside: np.ndarray, ring: np.ndarray) -> float:
    if inside.sum() < 20 or ring.sum() < 20:
        return 0.0
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(float)
    return float(np.linalg.norm(lab[inside].mean(axis=0) - lab[ring].mean(axis=0)))


def measure(rgb: np.ndarray, mask: np.ndarray, flower_kind: str) -> dict:
    h, w = mask.shape
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    H, S, V = (hsv[..., i].astype(int) for i in range(3))
    comps = _components(mask)
    m: dict = {"coverage": round(float(mask.mean()), 4), "n_components": len(comps)}
    m["lap_var"] = round(float(cv2.Laplacian(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY), cv2.CV_64F)[mask].var()), 1) if mask.sum() > 400 else 0.0
    if not comps:
        m["largest"] = None
        return m
    lc = comps[0]
    sig = [c for c in comps if c["area"] >= 0.15 * lc["area"]]
    n_touch = sum(lc["touch"].values())
    m["largest"] = {"area": round(lc["area"], 4), "h_frac": round(lc["h_frac"], 3), "w_frac": round(lc["w_frac"], 3),
                    "aspect_h_over_w": round(lc["box"][3] / max(1, lc["box"][2]), 2), "solidity": lc["solidity"],
                    "touch": lc["touch"], "n_touch": n_touch,
                    "coherence": round(lc["area"] * h * w / max(1, mask.sum()), 3),
                    "box": [int(v) for v in lc["box"]]}
    m["significant_components"] = len(sig)
    m["stalk_like_components"] = len([c for c in comps if c["area"] >= 0.25 * lc["area"]])
    # colour structures INSIDE the subject only
    green = ((H >= 35) & (H <= 85) & (S >= 40) & mask)
    flower = FLOWER_KINDS[flower_kind](H, S, V) & mask
    flower = cv2.morphologyEx(flower.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)) > 0
    m["green_share"] = round(float(green.sum() / max(1, mask.sum())), 3)
    m["flower_share"] = round(float(flower.sum() / max(1, mask.sum())), 3)
    bg = ~mask
    bg_green = ((H >= 35) & (H <= 85) & (S >= 40) & bg)
    m["bg_green_share"] = round(float(bg_green.sum() / max(1, bg.sum())), 3)
    # background busyness: edge density and colour spread in the background AWAY from the subject's outline
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    far = ~(cv2.dilate(mask.astype(np.uint8), np.ones((15, 15), np.uint8), iterations=2) > 0)
    if far.sum() > 0.05 * far.size:
        edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 40, 110) > 0
        m["bg_busy"] = round(float(min(1.0, 4.0 * edges[far].mean())), 3)       # 0 = plain, 1 = very busy
        m["bg_spread"] = round(float(min(1.0, np.std(rgb[far].reshape(-1, 3), axis=0).mean() / 70)), 3)
    else:
        m["bg_busy"], m["bg_spread"] = 0.6, 0.6      # almost no background visible: a dense scene, not a plain one
    m["exposure_v"] = round(float(V[mask].mean() / 255), 3)
    m["colourfulness"] = round(float(S[mask].mean() / 255), 3)
    # subject boundary contrast: a ring just outside vs just inside the largest component
    k = np.ones((7, 7), np.uint8)
    lcm = lc["mask"]
    outer = cv2.dilate(lcm.astype(np.uint8), k, iterations=2) > 0
    inner = cv2.erode(lcm.astype(np.uint8), k, iterations=1) > 0
    m["boundary_delta_e"] = round(_lab_delta(rgb, lcm & ~inner, outer & ~lcm), 1)
    # the flower heads
    fblobs = _components(flower, min_frac=0.0008)
    if fblobs:
        fb = fblobs[0]
        ring = cv2.dilate(fb["mask"].astype(np.uint8), np.ones((9, 9), np.uint8), iterations=2) > 0
        ring &= ~fb["mask"]
        edge_px = fb["mask"][:max(1, int(h * 0.015))].sum() + fb["mask"][-max(1, int(h * 0.015)):].sum() \
            + fb["mask"][:, :max(1, int(w * 0.015))].sum() + fb["mask"][:, -max(1, int(w * 0.015)):].sum()
        ring_green = float(((H >= 35) & (H <= 85) & (S >= 40) & ring).sum() / max(1, ring.sum()))
        m["flower_blob"] = {"area": round(fb["area"], 4), "h_frac": round(fb["h_frac"], 3), "solidity": fb["solidity"],
                            "touch": fb["touch"], "edge_pixels": int(edge_px),
                            "cropped": bool(any(fb["touch"].values()) and edge_px >= 30),
                            "n_significant": len([c for c in fblobs if c["area"] >= 0.35 * fb["area"]]),
                            "ring_delta_e": round(_lab_delta(rgb, fb["mask"], ring), 1),
                            "ring_green_share": round(ring_green, 3), "box": fb["box"]}
        m["_flower_blob_mask"] = fb["mask"]
    else:
        m["flower_blob"] = None
    return m


# --- hands (reuses the existing detector) --------------------------------------------------

def hand_check(rgb: np.ndarray, mask: np.ndarray) -> dict:
    try:
        import photo_pipeline as P
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        skin = P.masks(bgr)["skin"]
        frac, smooth, obstructs = P.skin_blob(bgr, skin, mask)
        hit = bool(frac > P.MAX_SKIN and smooth < P.SKIN_SMOOTH and obstructs)
        return {"checked": True, "frac": round(float(frac), 3), "smooth": round(float(smooth), 1), "obstructs": bool(obstructs), "reject": hit}
    except Exception as e:  # noqa: BLE001
        return {"checked": False, "why": f"{type(e).__name__}: {str(e)[:60]}", "reject": False}


# --- the 24x24 test (for SUITABILITY only; never a finished sprite) ----------------------------

def pixel_test(rgb: np.ndarray, m: dict) -> dict | None:
    fb = m.get("flower_blob")
    if not fb or "_flower_blob_mask" not in m:
        return None
    x, y, bw, bh = fb["box"]
    side = int(max(bw, bh) * 1.25) + 4
    cx, cy = x + bw // 2, y + bh // 2
    x0, y0 = max(0, cx - side // 2), max(0, cy - side // 2)
    x1, y1 = min(rgb.shape[1], x0 + side), min(rgb.shape[0], y0 + side)
    crop = rgb[y0:y1, x0:x1]
    alpha = (m["_flower_blob_mask"][y0:y1, x0:x1] * 255).astype(np.uint8)
    alpha = cv2.dilate(alpha, np.ones((3, 3), np.uint8))
    rgba = np.dstack([crop, alpha])
    im = Image.fromarray(rgba, "RGBA")
    s = max(im.size)
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
    small = canvas.resize((24, 24), Image.LANCZOS)
    a = np.array(small.getchannel("A"))
    hard = (a >= 128)
    rgb_small = Image.new("RGB", (24, 24), (255, 255, 255))
    rgb_small.paste(small.convert("RGB"), mask=small.getchannel("A"))
    q = rgb_small.quantize(colors=10, method=Image.Quantize.MEDIANCUT).convert("RGB")
    out = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    qp, op = q.load(), out.load()
    for yy in range(24):
        for xx in range(24):
            if hard[yy, xx]:
                op[xx, yy] = (*qp[xx, yy], 255)
    n_comp = cv2.connectedComponents(hard.astype(np.uint8), connectivity=4)[0] - 1
    ys, xs = np.nonzero(hard)
    box_fill = float(hard.sum() / max(1, (xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1))) if len(xs) else 0.0
    colours = len({tuple(p) for p in np.array(out)[hard][:, :3].tolist()}) if hard.any() else 0
    opaque = float(hard.mean())
    score = (1.0 if 0.30 <= opaque <= 0.85 else 0.5) * (1.0 if n_comp == 1 else 0.6) * (1.0 if colours >= 3 else 0.6) * (1.0 if box_fill >= 0.55 else 0.7)
    return {"opaque_fraction": round(opaque, 3), "components": int(n_comp), "colours": int(colours),
            "bbox_fill": round(box_fill, 3), "legibility": round(score, 2), "image": out,
            "enlarged": out.resize((144, 144), Image.NEAREST)}


# --- judging for each role -------------------------------------------------------------------

def _common(m, orig_long, hands, policy: str = "v2") -> tuple[list[str], list[str]]:
    hard, flags = [], []
    if not v4_family(policy) and orig_long < MIN_ORIGINAL_EDGE:   # v4 replaces the frame-level floor with per-role floors on the SUBJECT (role_floors)
        hard.append(f"low_resolution: original long edge {orig_long}px is under {MIN_ORIGINAL_EDGE}px")
    lc = m.get("largest")
    if lc is None or m["coverage"] < 0.01:
        hard.append("no_subject: the segmenter found no separable plant subject")
        return hard, flags
    if m["lap_var"] < BLUR_REJECT:
        hard.append(f"too_soft: subject sharpness {m['lap_var']} is below {BLUR_REJECT}")
    elif m["lap_var"] < BLUR_FLAG:
        flags.append(f"soft_focus: subject sharpness {m['lap_var']}")
    if hands.get("reject"):
        hard.append(f"hands: a hand covers the subject (skin {hands['frac']:.1%} of frame)")
    if m["coverage"] >= DENSE_COVERAGE and lc["n_touch"] >= 3:
        hard.append(f"dense_patch: the subject fills {m['coverage']:.0%} of the frame and touches {lc['n_touch']} edges; no separable plant")
    if m["coverage"] >= 0.5 and lc["n_touch"] >= 2 and 0.8 <= lc["aspect_h_over_w"] <= 1.25:
        flags.append("possible_overhead: dense, roughly square mass; perspective needs a visual check")
    flags.append("perspective_unverified: viewing angle and lens distortion cannot be measured automatically")
    if not hands.get("checked"):
        flags.append("hands_unchecked: the hand detector could not run")
    return hard, flags


def judge_main(m) -> dict:
    hard, flags, lc = [], [], m["largest"]
    sides = [k for k in ("top", "left", "right") if lc["touch"][k]]
    fb = m.get("flower_blob")
    if lc["n_touch"] >= 3:
        hard.append("main_clipped: the subject is cut by three or more frame edges")
    elif len(sides) >= 2:
        hard.append(f"main_clipped: the subject is cut at the {' and '.join(sides)} edges")
    elif fb and fb["cropped"]:
        hard.append("main_clipped: a flower head is cut by the frame")
    elif sides:
        flags.append(f"touches_{sides[0]}_edge: check that nothing important is cut off")
    if lc["h_frac"] < TINY_HEIGHT and lc["area"] < TINY_AREA:
        hard.append(f"subject_too_small: the plant is {lc['h_frac']:.0%} of the frame height")
    if m["flower_share"] < 0.01:
        flags.append("few_flowers: little flower colour in the subject")
    if m["green_share"] < 0.05:
        flags.append("little_foliage: few leaves in the subject")
    if m["significant_components"] >= 5:
        flags.append("fragmented: the subject splits into many pieces")
    completeness = 1.0 - 0.35 * len(sides) - (0.4 if (fb and fb["cropped"]) else 0.0)
    completeness = max(0.0, completeness) * min(1.0, 0.5 + lc["h_frac"])
    suit = min(1.0, lc["h_frac"] / 0.65) * 0.5 + min(1.0, m["green_share"] / 0.25) * 0.25 + min(1.0, m["flower_share"] / 0.08) * 0.25
    return {"hard": hard, "flags": flags, "completeness": max(0.0, completeness), "suitability": min(1.0, suit)}


def judge_pixel(m, px, policy: str = "v2") -> dict:
    hard, flags, fb = [], [], m.get("flower_blob")
    if fb is None:
        flags.append("flower_not_detected: no flower-coloured head found in the subject (colour model may not fit this photo)")
        return {"hard": hard, "flags": flags, "completeness": 0.2, "suitability": 0.1}
    if fb["cropped"] and fb["area"] >= 0.03:
        hard.append("pixel_head_cropped: the largest flower head is cut by the frame")
    elif fb["cropped"]:
        flags.append("flower_touches_edge")
    if fb["n_significant"] >= 3:
        flags.append(f"competing_clusters: {fb['n_significant']} similar flower clusters compete")
    if fb["ring_delta_e"] < 15:
        flags.append(f"low_contrast_silhouette: head vs surroundings differs by only {fb['ring_delta_e']}")
    if fb["ring_green_share"] > 0.55 and fb["ring_delta_e"] < 35:
        flags.append("buried_in_foliage: the head is surrounded by green")
    if fb["area"] < 0.01:
        flags.append("head_small_in_frame: little detail to work from")
    comp = (0.0 if fb["cropped"] else 1.0) * 0.5 + min(1.0, fb["solidity"] / 0.8) * 0.5
    one = (1.0 if fb["n_significant"] <= 1 else 0.5 if fb["n_significant"] == 2 else 0.2)
    if v4_family(policy):
        # The 24px legibility proxy did not predict the owner's picks (it rated the pipeline's top picks 0.74-0.84 and the owner's 0.47), so it carries NO weight
        # until validated against real reductions. The remaining three terms keep their relative proportions (0.35 : 0.2 : 0.1, rescaled to sum to 1).
        suit = (min(1.0, fb["ring_delta_e"] / 35) * 0.35 + one * 0.2 + min(1.0, fb["area"] / 0.06) * 0.1) / 0.65
        return {"hard": hard, "flags": flags, "completeness": comp, "suitability": min(1.0, suit)}
    suit = min(1.0, fb["ring_delta_e"] / 35) * 0.35 + (px["legibility"] if px else 0.3) * 0.35 + one * 0.2 + min(1.0, fb["area"] / 0.06) * 0.1
    return {"hard": hard, "flags": flags, "completeness": comp, "suitability": min(1.0, suit)}


def judge_tall(m, policy: str = "v2") -> dict:
    hard, flags, lc = [], [], m["largest"]
    if lc["touch"]["top"]:
        hard.append("tall_clipped_top: the stalk is cut at the top of the frame")
    if lc["touch"]["left"] and lc["touch"]["right"] and lc["w_frac"] >= 0.92:
        hard.append("tall_wide_mass: a broad mass cropped on both sides, not a single stalk")
    if lc["aspect_h_over_w"] < 1.1:
        flags.append(f"not_vertical: the subject is {lc['aspect_h_over_w']}:1 (height:width)")
    if m["stalk_like_components"] >= 3:
        flags.append(f"crowded_stalks: {m['stalk_like_components']} competing pieces")
    if lc["touch"]["bottom"] and lc["w_frac"] > 0.6:
        flags.append("wide_base_cropped: a wide mass runs off the bottom")
    if m["bg_busy"] >= 0.55:
        flags.append(f"busy_background: the scene behind the stalk is visually busy ({m['bg_busy']})")
    if m["green_share"] < 0.08:
        flags.append("few_leaves_visible")
    if m["flower_share"] < 0.01:
        flags.append("flowers_not_detected")
    comp = (0.0 if lc["touch"]["top"] else 1.0) * 0.6 + min(1.0, lc["h_frac"] / 0.7) * 0.4
    one = 1.0 if m["stalk_like_components"] <= 1 else 0.45 if m["stalk_like_components"] == 2 else 0.1   # ONE stalk, strongly
    plain = 1.0 - max(m["bg_busy"], 0.7 * m["bg_spread"])
    both = min(1.0, m["green_share"] / 0.15) * 0.5 + min(1.0, m["flower_share"] / 0.03) * 0.5    # leaves AND flowers visible
    if v4_family(policy):
        # The plain-background term selected for something the owner's tall picks do not have (top picks 0.05-0.09 background busyness; owner and sample 0.45-0.52).
        # Removed; the other four terms keep their proportions, rescaled to sum to 1.
        suit = (min(1.0, lc["aspect_h_over_w"] / 1.4) * 0.2 + min(1.0, lc["h_frac"] / 0.7) * 0.15 + one * 0.3 + both * 0.15) / 0.8
        flags = [f for f in flags if not f.startswith("busy_background")]
    else:
        suit = min(1.0, lc["aspect_h_over_w"] / 1.4) * 0.2 + min(1.0, lc["h_frac"] / 0.7) * 0.15 + one * 0.3 + plain * 0.2 + both * 0.15
    return {"hard": hard, "flags": flags, "completeness": comp, "suitability": min(1.0, suit)}


# POLICY v3 (owner-picks study, #62-66). Stage A keeps only what the bytes and facts decide. A hand, a stalk cut at the top,
# a clipped or small subject and a cropped head are things an EDIT or a CROP can fix, and the owner accepted pictures with every one
# of them, so under v3 they travel as flags (and still lower the completeness part of the score). v2 behaviour is unchanged.
def v4_family(policy: str) -> bool:
    """v4 and v4.1 share every v4 change; v4.1 differs ONLY in that the per-role floors are flags, not rejections."""
    return policy in ("v4", "v4.1")


SOFT_V3 = ("hands", "main_clipped", "subject_too_small", "pixel_head_cropped", "tall_clipped_top", "tall_wide_mass")


def soften(hard: list[str], flags: list[str], policy: str) -> tuple[list[str], list[str]]:
    if policy not in ("v3", "v4", "v4.1"):
        return hard, flags
    keep, moved = [], []
    for h in hard:
        (moved if h.split(":")[0] in SOFT_V3 else keep).append(h)
    return keep, flags + [f"needs_crop_or_edit({m.split(':')[0]}): {m.split(':', 1)[1].strip()}" for m in moved]


def evaluate(rgb: np.ndarray, orig_long: int, flower_kind: str, mask_fn=default_mask_fn,
             want_pixel_test: bool = True, policy: str = "v2") -> dict:
    """Measure once, judge for all three roles. Never raises on a bad image: it reports."""
    try:
        mask = mask_fn(rgb)
    except Exception as e:  # noqa: BLE001
        return {"error": f"{type(e).__name__}: {str(e)[:100]}"}
    m = measure(rgb, mask, flower_kind)
    hands = hand_check(rgb, mask) if m.get("largest") else {"checked": False, "reject": False}
    hard, flags = _common(m, orig_long, hands, policy)
    hard, flags = soften(hard, flags, policy)
    out = {"measure": {k: v for k, v in m.items() if not k.startswith("_")}, "hands": hands,
           "common_hard": hard, "common_flags": flags, "roles": {}}
    if m.get("largest") is None or any(h.startswith("no_subject") for h in hard):
        for r in ("main", "pixel", "tall"):
            out["roles"][r] = {"hard": [], "flags": [], "completeness": 0.0, "suitability": 0.0}
        return out
    px = pixel_test(rgb, m) if want_pixel_test else None
    out["roles"]["main"] = judge_main(m)
    out["roles"]["pixel"] = judge_pixel(m, px, policy)
    out["roles"]["tall"] = judge_tall(m, policy)
    for r in out["roles"].values():
        r["hard"], r["flags"] = soften(r["hard"], r["flags"], policy)
    if px:
        out["pixel_test"] = {k: v for k, v in px.items() if k not in ("image", "enlarged")}
        out["_pixel_images"] = (px["image"], px["enlarged"])
    return out


# --- v3: crop-then-score ---------------------------------------------------------------------
# The owner's tall previews are "an upright unit found inside a landscape photo" and their main/pixel picks are often a branch inside a wider
# scene. Scoring only the whole frame measures the frame, not the subject. So each photograph is also scored as it would be CROPPED:
# a padded box around the subject (never cutting it), or, when the segmenter finds no subject at all, around the strongest flower cluster.
CROP_PAD = 0.12            # margin around the subject box, as a share of its larger side
CLUSTER_PAD = 0.9          # margin around a flower cluster (the cluster alone has no context to segment)
MAX_CROPS = 3


def _pad_box(box, shape, pad):
    h, w = shape
    x, y, bw, bh = box
    p = int(pad * max(bw, bh))
    x0, y0, x1, y1 = max(0, x - p), max(0, y - p), min(w, x + bw + p), min(h, y + bh + p)
    return (x0, y0, x1 - x0, y1 - y0)


def crop_boxes(rgb: np.ndarray, ev: dict, flower_kind: str) -> list[tuple[str, tuple[int, int, int, int]]]:
    """Candidate crops (label, (x, y, w, h)) in `rgb` pixels. Every crop CONTAINS the subject box it was built from."""
    h, w = rgb.shape[:2]
    out = []
    lc = (ev.get("measure") or {}).get("largest")
    if lc and lc.get("box"):
        box = _pad_box(tuple(lc["box"]), (h, w), CROP_PAD)
        if box[2] * box[3] <= 0.85 * h * w:
            out.append(("subject-crop", box))
    if lc is None or any("no_subject" in x for x in ev.get("common_hard", [])):
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        H, S_, V = (hsv[..., i].astype(int) for i in range(3))
        fl = FLOWER_KINDS[flower_kind](H, S_, V)
        fl = cv2.morphologyEx(fl.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        fl = cv2.dilate(fl, np.ones((9, 9), np.uint8), iterations=2)
        for i, c in enumerate(_components(fl > 0, min_frac=0.0008)[:2]):
            box = _pad_box(c["box"], (h, w), CLUSTER_PAD)
            if box[2] * box[3] <= 0.85 * h * w:
                out.append((f"flower-cluster-{i + 1}", box))
    return out[:MAX_CROPS]


def evaluate_views(rgb: np.ndarray, orig_long: int, flower_kind: str, mask_fn=default_mask_fn, policy: str = "v3") -> list[dict]:
    """The whole frame plus its candidate crops, each fully evaluated. Crops are scored with their TRUE pixel size
    (so quality still sees a small crop) but are not hard-rejected for it: the crop will be placed in an art window, not published as-is."""
    views = []
    full = evaluate(rgb, orig_long, flower_kind, mask_fn, policy=policy)
    if v4_family(policy) and "error" not in full:
        role_floors(full, rgb.shape, orig_long, policy)
    views.append({"label": "full-frame", "box": None, "px": orig_long, "ev": full})
    if "error" in full or policy not in ("v3", "v4", "v4.1"):
        return views
    H, W = rgb.shape[:2]
    for label, (x, y, bw, bh) in crop_boxes(rgb, full, flower_kind):
        px = int(orig_long * max(bw, bh) / max(H, W))
        try:
            ev = evaluate(np.ascontiguousarray(rgb[y:y + bh, x:x + bw]), max(px, MIN_ORIGINAL_EDGE) if policy == "v3" else px, flower_kind, mask_fn, policy=policy)
            if v4_family(policy) and "error" not in ev:
                role_floors(ev, (bh, bw), px, policy)
        except Exception as e:  # noqa: BLE001
            ev = {"error": f"{type(e).__name__}: {str(e)[:80]}"}
        views.append({"label": label, "box": [x, y, bw, bh], "px": px, "ev": ev})
    return views


# --- v4: resolution floors per ROLE, derived from the finished asset's own geometry (not from taste) -------------------------------------
# What matters is the SUBJECT'S pixels at original resolution, not the frame's. Each floor is the size at which the subject is placed at 1:1 or reduced:
MAIN_SUBJECT_FLOOR_PX = 593    # the art window is 593 px wide on the 800 px card: a smaller subject must be enlarged
TALL_SUBJECT_FLOOR_PX = 455    # the oval holds a ~222-reference-px subject = 455 px at 800 px card width
PIXEL_FEATURE_FLOOR_PX = 48    # 2x the 24 px target, the least that can be reduced rather than enlarged


def role_floors(ev: dict, view_shape, view_long_px: int, policy: str = "v4") -> None:
    """v4: append a hard failure to a role when its SUBJECT is below the pixels the finished asset needs; v4.1: append a FLAG instead (the owner accepted pictures below
    two of the floors, and whether enlarging a subject is acceptable is the owner's call). Mutates ev in place."""
    m = ev.get("measure") or {}
    lc = m.get("largest")
    if not lc or "roles" not in ev:
        return
    scale = view_long_px / max(view_shape[:2])
    sink = "flags" if policy == "v4.1" else "hard"
    box = lc.get("box")
    if box:
        long_side = max(box[2], box[3]) * scale
        height = box[3] * scale
        if long_side < MAIN_SUBJECT_FLOOR_PX:
            ev["roles"]["main"][sink].append(f"role_floor_main: subject is {long_side:.0f}px at original resolution, under {MAIN_SUBJECT_FLOOR_PX}px")
        if height < TALL_SUBJECT_FLOOR_PX:
            ev["roles"]["tall"][sink].append(f"role_floor_tall: subject is {height:.0f}px tall at original resolution, under {TALL_SUBJECT_FLOOR_PX}px")
    fb = m.get("flower_blob")
    if fb and fb.get("box"):
        side = max(fb["box"][2], fb["box"][3]) * scale
        if side < PIXEL_FEATURE_FLOOR_PX:
            ev["roles"]["pixel"][sink].append(f"role_floor_pixel: the feature is {side:.0f}px at original resolution, under {PIXEL_FEATURE_FLOOR_PX}px")
