#!/usr/bin/env python3
"""Score, segment and place CC0 botanical photographs on the PlantDex front.

Scores every retrieved candidate against the measured style profile
(`docs/plantdex-photo-style.json`), segments the best, places them in the card's own art
window and renders previews at the deck's photograph opacity. Nothing is published and the
highest score is NOT auto-selected: the output is three candidates for a person to choose.

    python3 scripts/photo_pipeline.py --species matricaria_chamomilla --top 3
    python3 scripts/photo_pipeline.py --self-test
"""
from __future__ import annotations

import argparse, json, pathlib, sys, time

import cv2
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import card_art                                     # noqa: E402  (segmentation lives there)
import segment_plant                                # noqa: E402  (BiRefNet, colour fallback)
import visual_brief                                 # noqa: E402  (species requirements)
import render_generated_card as R                   # noqa: E402  (template + slot geometry)

STYLE = ROOT / "docs" / "plantdex-photo-style.json"

# THE DECK'S PHOTOGRAPH OPACITY. Applied to the isolated subject only -- never to the frame,
# the text, the icons or the card ground, which are the template and are not ours to dim.
PHOTO_OPACITY = 0.95

MIN_EDGE = 900          # below this there is not enough detail for a 593px-wide window
MIN_SHARPNESS = 3.0     # mean gradient energy; below this the photograph is soft
# A HAND IS ONE LARGE SMOOTH BLOB; SOIL IS SCATTERED AND TEXTURED. Testing the raw skin-hue
# fraction rejected seven of eight chamomile photographs, including a field shot with no
# hands anywhere in it -- bare earth, dry grass, brown stems and limestone all sit in the
# same warm hue band. So the test is the LARGEST CONNECTED skin region, and only when that
# region is also smooth: a palm has almost no internal gradient, a gravel bed has plenty.
MAX_SKIN = 0.045        # fraction of the frame the largest smooth skin blob may cover
SKIN_SMOOTH = 9.0       # mean gradient inside that blob; above this it is texture, not skin
MIN_CUTOUT_EDGE = 220   # a cutout smaller than this is a failed segmentation, not a plant
MAX_UPSCALE = 2.0       # never invent detail to fill the window
# A CUTOUT THAT FILLS ITS OWN BOUNDING BOX IS NOT A CUTOUT. In a dense colony photograph
# every pixel is plant, so segmentation keeps the whole frame and the card renders a
# RECTANGLE of vegetation pasted over the art window. That is the "cannot be cleanly
# segmented" case, and the honest response is to reject the photograph rather than ship a
# rectangle: a real plant silhouette leaves a lot of its box empty.
MAX_CUTOUT_SOLIDITY = 0.82


def style_profile() -> dict:
    return json.loads(STYLE.read_text())["profile"]


def load(path: pathlib.Path) -> np.ndarray:
    return cv2.imread(str(path))


def masks(bgr: np.ndarray) -> dict:
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    H, S, V = hsv[:, :, 0].astype(int), hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
    white = (V > 165) & (S < 60)
    yellow = (H >= 18) & (H <= 38) & (S > 90) & (V > 110)
    green = (H >= 35) & (H <= 90) & (S > 55) & (V > 45)
    skin = (((H <= 25) | (H >= 170)) & (S > 35) & (S < 165) & (V > 90)) & ~(yellow | green | white)
    return {"white": white, "yellow": yellow, "green": green, "skin": skin}


def skin_blob(bgr: np.ndarray, skin: np.ndarray,
              subject: np.ndarray) -> tuple[float, float, bool]:
    """Largest connected skin region: its frame fraction, its smoothness, and whether it
    OBSTRUCTS the subject rather than merely sitting behind it."""
    m = cv2.morphologyEx(skin.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(m, 8)
    if count <= 1:
        return 0.0, 99.0, False
    i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    blob = labels == i
    frac = float(blob.mean())
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY).astype(float)
    gx = np.abs(np.diff(g, axis=1))[:-1, :]          # trim both to (h-1, w-1)
    gy = np.abs(np.diff(g, axis=0))[:, :-1]
    inner = blob[:-1, :-1]
    grad = float(np.mean(gx[inner] + gy[inner])) if inner.sum() > 50 else 99.0
    # Obstruction = the skin region eats into the middle of the subject's own bounding box.
    ys, xs = np.nonzero(subject)
    obstructs = False
    if len(xs) > 500:
        y0, y1 = int(np.percentile(ys, 15)), int(np.percentile(ys, 85))
        x0, x1 = int(np.percentile(xs, 15)), int(np.percentile(xs, 85))
        core = blob[y0:y1, x0:x1]
        obstructs = bool(core.mean() > 0.12)
    return frac, grad, obstructs


def score(path: pathlib.Path, meta: dict, prof: dict) -> dict:
    """A transparent breakdown: every rejection names itself, every point says why."""
    bgr = load(path)
    out = {"photo_id": meta.get("photo_id"), "file": path.name,
           "reject": [], "flags": [], "points": {}, "score": 0.0}
    if bgr is None:
        out["reject"].append("unreadable image file")
        return out
    h, w = bgr.shape[:2]
    dims = meta.get("dimensions") or {}
    orig_edge = max(dims.get("width", w), dims.get("height", h))

    # ── hard rejections ───────────────────────────────────────────────────────────────
    if (meta.get("license_code") or "").lower() != "cc0":
        out["reject"].append(f"licence is {meta.get('license_code')!r}, not cc0")
    if orig_edge < MIN_EDGE:
        out["reject"].append(f"original longest edge {orig_edge}px < {MIN_EDGE}px")
    if meta.get("taxon_name") and meta.get("expected_name") and \
            meta["taxon_name"] != meta["expected_name"]:
        out["reject"].append(f"observation taxon {meta['taxon_name']!r} is not the species asked for")
    # SHARPNESS IS MEASURED INSIDE THE SUBJECT, NOT OVER THE WHOLE FRAME. A good botanical
    # close-up has a deliberately blurred background -- shallow depth of field is what
    # separates the plant from its surroundings and makes it segmentable -- so whole-frame
    # gradient energy scores the best photographs WORST. The best single specimen in the
    # chamomile set measured 5.5 over the frame and 2.2/10 points, behind three colony
    # photographs whose every leaf was in focus. Measured on the subject it is sharp.
    g = bgr[:, :, 1].astype(float)
    gx = np.abs(np.diff(g, axis=0))[:, :-1]
    gy = np.abs(np.diff(g, axis=1))[:-1, :]
    m0 = masks(bgr)
    subj0 = (m0["white"] | m0["yellow"] | m0["green"])[:-1, :-1]
    sharp = float(np.mean(gx[subj0] + gy[subj0])) if subj0.sum() > 500 \
        else float(np.mean(gx + gy))
    if sharp < MIN_SHARPNESS:
        out["reject"].append(f"too soft: gradient energy {sharp:.1f} < {MIN_SHARPNESS}")
    m = m0
    skin_frac, skin_smooth, obstructs = skin_blob(bgr, m["skin"],
                                                  m["white"] | m["yellow"] | m["green"])
    # OBSTRUCTION, NOT PRESENCE. A hand holding a stem BEHIND the flower is background and
    # segmentation removes it; a hand ACROSS the flower has destroyed the subject and no
    # amount of masking brings it back. Rejecting on presence alone threw out the best
    # chamomile photograph in the set, whose finger sits entirely behind the bloom.
    if skin_frac > MAX_SKIN and skin_smooth < SKIN_SMOOTH and obstructs:
        # JUDGED ON THE CUTOUT, NOT ON THE SOURCE. This was a hard rejection, written when
        # segmentation could not remove a hand -- colour matting kept the finger, so a
        # photograph containing one was unusable whatever else it had going for it. With
        # BiRefNet the finger comes out cleanly, and rejecting on the SOURCE threw away the
        # best-composed chamomile in the set: a bloom facing the camera, 7.7% of frame at
        # disc saturation 249, with stem, leaves and bud intact. The check now survives as
        # a flag, and `skin_survives` below rejects the cutout if the hand is still in it.
        out["flags"].append(
            f"a hand crosses the plant in the source ({100*skin_frac:.1f}% of frame); the "
            f"cutout is checked afterwards and rejected if any of it survives")
    elif skin_frac > MAX_SKIN and skin_smooth < SKIN_SMOOTH:
        out["flags"].append(
            f"a hand is present behind the subject ({100*skin_frac:.1f}% of frame) but does "
            f"not cross it; segmentation must remove it and the cutout is checked after")
    elif skin_frac > MAX_SKIN:
        out["flags"].append(
            f"{100*skin_frac:.1f}% warm-toned background (gradient {skin_smooth:.1f}); "
            f"read as soil or dry vegetation rather than skin")
    subject = m["white"] | m["yellow"] | m["green"]
    if subject.mean() < 0.04:
        out["reject"].append("almost no plant colour in the frame")

    # ── positive scoring, each term named ────────────────────────────────────────────
    pts = out["points"]
    pts["resolution"] = round(min(1.0, orig_edge / 2048) * 10, 1)
    # SHARPNESS IS SCORED ON THE ISOLATED SUBJECT, AFTER SEGMENTATION, not here. Even
    # masked to plant colour this is measured over the whole frame, so it still counts the
    # out-of-focus foliage BEHIND the plant -- and shallow depth of field is the property
    # that makes a botanical close-up good and separable in the first place. Measured this
    # way the best chamomile in the set scored 2.5 out of 10 for being sharp. What survives
    # here is only the reject gate above, which catches a photograph that is soft all over.
    pts["sharpness_prefilter"] = 0.0
    # reproductive structures, foliage, and whether BOTH are present
    # FLOWERS, NOT BRIGHT PIXELS. `white | yellow` over the frame is a brightness test: on
    # a Dandelion photograph showing nothing but a leaf rosette it returned the MAXIMUM
    # score, because sunlit leaf edges and pale background are "white". A bloom is a
    # COMPACT region, so the mask is opened and only pieces of real size count -- scattered
    # highlights do not survive that, and a petal or a disc does.
    bloom_raw = (m["white"] | m["yellow"]).astype(np.uint8)
    bloom = cv2.morphologyEx(bloom_raw, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    nb, blab, bstats, _ = cv2.connectedComponentsWithStats(bloom, 8)
    if nb > 1:
        ba = bstats[1:, cv2.CC_STAT_AREA]
        floor = max(200, int(0.0008 * bloom.size))
        bloom = np.isin(blab, [i + 1 for i, v in enumerate(ba) if v >= floor])
    else:
        bloom = np.zeros(bloom.shape, bool)
    flower = float(bloom.mean())
    foliage = float(m["green"].mean())
    pts["flowers_visible"] = round(min(1.0, flower / 0.12) * 10, 1)
    # FOLIAGE IS WORTH LESS THAN IT WAS, AND `whole_plant` IS GONE. Both measured green as
    # a share of the FRAME, which is maximised by a photograph of a meadow and minimised by
    # a close-up of one bloom on a thin stem -- the second being what a card wants. Together
    # they were 26 points, and they kept pushing colony photographs over single specimens.
    # Whether the plant actually has its stems is now checked where it can be checked
    # honestly: on the CUTOUT, by `structure_retention`, after segmentation.
    pts["foliage_visible"] = round(min(1.0, foliage / 0.25) * 6, 1)
    # NO frame-fill term here. How much of the CARD a plant ends up covering is a property
    # of the PLACEMENT, not of the photograph: a bloom filling 60% of its own frame can be
    # seated to occupy the deck's usual 31% of the window. Scoring the raw photograph
    # against a profile measured on finished cards compared two different quantities, and
    # it pushed the best single-specimen shot in the set below three colony photographs.
    # The composition term is added after placement, in `compose_score`.
    fill = float(subject.mean())
    out["_fill"] = fill
    # separability: how much of the frame is neither subject nor obviously background
    ys, xs = np.nonzero(subject)
    h, w = bgr.shape[:2]
    if len(xs):
        bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
        solidity = subject.sum() / max(1, bw * bh)
        pts["clean_subject"] = round(min(1.0, solidity / 0.45) * 12, 1)
        # breathing room: the subject should not already be jammed against every edge
        touched = sum((xs.min() < w*0.01, xs.max() > w*0.99,
                       ys.min() < h*0.01, ys.max() > h*0.99))
        pts["breathing_room"] = round(max(0.0, (3 - touched) / 3) * 10, 1)
        # Only worth saying when the subject is also large: a colony photographed edge to
        # edge genuinely fills the frame, and saying so about every one of them is noise.
        if touched >= 3 and fill > 0.45:
            out["flags"].append(
                f"subject fills the frame and runs off {touched} edges; little room to crop")
    else:
        pts["clean_subject"] = pts["breathing_room"] = 0.0
    # SPECIMEN SCALE: few LARGE reproductive structures, not many tiny ones.
    #
    # This is what separates a portrait of a plant from a photograph of a meadow, and no
    # other term here does it: "flowers visible", "foliage visible", "whole plant" and
    # "silhouette openness" are all satisfied -- often maximised -- by a dense stand. A
    # colony photographed from standing height shows fifty flower heads of a dozen pixels
    # each; a specimen shows one or two of several thousand. The deck's cards are
    # specimens, so the biggest reproductive structure in the frame should be a real
    # fraction of it.
    # MEASURED ON THE SATURATED DISC, NOT ON ANYTHING YELLOWISH. The loose yellow mask
    # includes a yellow-green receptacle, so it scored a flower photographed from BEHIND as
    # highly as one facing the camera -- and the disc is the single most recognisable thing
    # about a chamomile. The largest saturated-gold region separates the three failures
    # cleanly: a bloom facing the viewer measures 7.7% of frame, one facing away 0.77%, and
    # a spray of tiny flowers 0.09%.
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
    Hh, Ss, Vv = hsv[:, :, 0].astype(int), hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
    gold = (Hh >= 18) & (Hh <= 32) & (Ss > 130) & (Vv > 120)
    heads = cv2.morphologyEx(gold.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    nh, _, hstats, _ = cv2.connectedComponentsWithStats(heads, 8)
    if nh > 1:
        areas = np.sort(hstats[1:, cv2.CC_STAT_AREA])[::-1]
        big = float(areas[0] / (h * w))
        count = int((areas >= areas[0] * 0.25).sum())
        pts["disc_scale"] = round(min(1.0, big / 0.05) * 14, 1)
        # ORIENTATION. A disc facing the viewer is deeply saturated; the pale green-yellow
        # receptacle on the back of a flower is not. Median saturation inside the gold
        # separates them: 249 on a bloom facing the camera, 153 on one facing away.
        sat = float(np.median(Ss[gold])) if gold.sum() > 50 else 0.0
        # GATED ON THERE BEING A DISC TO FACE. This is the median saturation of the gold
        # pixels, and with only a handful of them -- a sunlit leaf edge, a speck of dead
        # grass -- the median is meaningless but can still be high. A Dandelion photograph
        # showing nothing but a leaf rosette collected 15.5 of 18 points for the
        # orientation of a flower it does not contain. The score now scales with how much
        # disc is actually present, so no disc earns no orientation points.
        present = min(1.0, big / 0.01)
        pts["disc_facing"] = round(max(0.0, min(1.0, (sat - 140) / 100)) * present * 18, 1)
        out["measured_heads"] = {"largest_disc_frac": round(big, 4),
                                 "comparable_heads": count, "disc_saturation": round(sat, 1)}
        if sat < 180:
            out["flags"].append(
                f"flower may be facing away: disc saturation {sat:.0f} suggests a receptacle "
                f"rather than the open yellow centre")
        if big < 0.01:
            out["flags"].append(
                f"largest flower head is {100*big:.2f}% of the frame: too small to read as "
                f"a specimen on a card")
        if count > 8:
            out["flags"].append(
                f"{count} similarly sized flower heads: reads as a colony, not a specimen")
    else:
        pts["disc_facing"] = 0.0
        pts["specimen_scale"] = 0.0
    # SPECIMEN SCALE, GENERALISED. The disc terms above are specific to a composite, and a
    # pine, a shrub or a grass has no disc at all -- for those every candidate would score
    # zero and the term would rank nothing. So scale is measured on the largest COHERENT
    # SUBJECT REGION, which exists for any growth form: one plant filling a reasonable share
    # of the frame scores well, a distant stand of many small ones does not. The disc bonus
    # is added on top where a disc exists, rather than being the only way to earn the points.
    sub_u8 = cv2.morphologyEx(subject.astype(np.uint8), cv2.MORPH_OPEN,
                              np.ones((7, 7), np.uint8))
    ns, _, sstats, _ = cv2.connectedComponentsWithStats(sub_u8, 8)
    if ns > 1:
        sa = np.sort(sstats[1:, cv2.CC_STAT_AREA])[::-1]
        biggest = float(sa[0] / (h * w))
        # PEAKED, NOT MONOTONIC. "Bigger is better" is the same bias that kept promoting
        # colony photographs: a plant covering 90% of the frame is either a stand or a crop
        # so tight there is nothing to place. The deck's subjects cover about a third of the
        # art window, so the target here is a subject that occupies a comparable share of
        # its own photograph, and both too small and too large lose points.
        target = 0.35
        pts["specimen_scale"] = round(
            max(0.0, 1 - abs(biggest - target) / target) * 16, 1)
        out["measured_subject"] = {"largest_region_frac": round(biggest, 4),
                                   "regions": int((sa >= sa[0] * 0.2).sum())}
    else:
        pts["specimen_scale"] = 0.0
    pts["identification"] = 6.0 if (meta.get("identification_agreements") or 0) >= 2 else 3.0
    if (meta.get("identification_agreements") or 0) < 2:
        out["flags"].append("only one agreeing identification; research grade is not proof")
    out["score"] = round(sum(pts.values()), 1)
    out["measured"] = {"orig_edge": orig_edge, "sharpness": round(sharp, 1),
                       "skin_fraction": round(skin_frac, 4),
                       "flower_fraction": round(flower, 4),
                       "foliage_fraction": round(foliage, 4),
                       "subject_fraction": round(fill, 4)}
    return out


class Unplaceable(Exception):
    """The cutout cannot be seated without breaking one of the deck's own rules."""


def compose_score(front: Image.Image, prof: dict) -> tuple[float, dict]:
    """Score the FINISHED card against the deck's measured composition."""
    import render_generated_card as RR
    tpl, _ = RR.template_pages()
    x0, y0, x1, y1 = R.SLOT_PHOTO
    a = np.array(front.convert("RGB")).astype(int)[y0:y1, x0:x1]
    b = np.array(tpl.convert("RGB")).astype(int)[y0:y1, x0:x1]
    m = np.abs(a - b).max(axis=2) > 40
    H, W = m.shape
    if m.sum() < 500:
        return 0.0, {}
    ys, xs = np.nonzero(m)
    fill = float(m.mean())
    cx = float(xs.mean() / W)
    target = prof["frame_fill"]["median"]
    pts = {
        "frame_fill_match": round(max(0.0, 1 - abs(fill - target) / target) * 16, 1),
        "centred": round(max(0.0, 1 - abs(cx - prof["centroid_x"]["median"]) / 0.15) * 8, 1),
        "crops_bottom": 8.0 if ys.max() >= H - 1 - H * 0.02 else 0.0,
        "keeps_sides": 8.0 if (xs.min() > W * 0.02 and xs.max() < W - 1 - W * 0.02) else 0.0,
    }
    return round(sum(pts.values()), 1), {"placed_fill": round(fill, 3),
                                         "placed_centroid_x": round(cx, 3), "points": pts}


def stem_support(cut: Image.Image, band: float = 0.15) -> dict:
    """Is there enough stem at the foot of the cutout to crop against the bottom edge?

    A bottom crop only reads as ROOTED when something narrow continues to the cut. Crop a
    photograph that ends at the flower and the plant does not look planted, it looks
    beheaded -- so this is measured rather than assumed, and the caller is expected to
    refuse rather than force it.
    """
    a = np.array(cut.getchannel("A")) > 127
    h, w = a.shape
    foot = a[int(h * (1 - band)):]
    xs = np.nonzero(foot.any(axis=0))[0]
    return {"foot_ink": round(float(foot.mean()), 4),
            "foot_width_frac": round((len(xs) and (xs.max() - xs.min() + 1) / w) or 0.0, 3),
            "has_stem": bool(foot.mean() > 0.01)}


def place_rooted(cut: Image.Image, prof: dict, overshoot: float = 1.06
                 ) -> tuple[Image.Image, dict]:
    """Seat the plant so its stem runs OFF the bottom edge, the way the deck does.

    44 of the 45 printed cards crop at the bottom. `place_like_the_deck` seats the subject
    so its lowest pixel lands exactly ON the bottom edge, which is a different thing: the
    plant stops at the line instead of passing through it, and reads as floating in the
    window. Here the subject is scaled slightly taller than the window and seated at the
    top, so the FLOWER keeps its margin and only the stem is cut.

    The guards are what keep that from becoming a distortion: width is capped so the sides
    are never cropped (the deck crops them on fewer than one card in four), the top margin
    is held so petals cannot be clipped, and nothing is stretched -- one scale, both axes.
    """
    box = cut.getbbox()
    if box is None:
        raise Unplaceable("the cutout is empty")
    cut = cut.crop(box)
    iw, ih = cut.size
    if max(iw, ih) < MIN_CUTOUT_EDGE:
        raise Unplaceable(f"cutout is only {iw}x{ih}px; segmentation kept almost nothing")
    x0, y0, x1, y1 = R.SLOT_PHOTO
    W, H = x1 - x0, y1 - y0
    top_margin = round(H * 0.02)
    k_w = (prof["bbox_w_frac"]["p90"] * W) / iw
    k_h = (overshoot * H) / ih
    k = min(k_w, k_h)
    if k > MAX_UPSCALE:
        raise Unplaceable(f"would need {k:.1f}x upscaling; the photograph is too small")
    nw, nh = max(1, round(iw * k)), max(1, round(ih * k))
    art = cut.resize((nw, nh), Image.LANCZOS)
    left = round(prof["centroid_x"]["median"] * W - nw / 2)
    top = top_margin if nh + top_margin > H else H - nh
    return art, {"scale": round(k, 4), "size": [nw, nh], "offset": [left, top],
                 "rooted": True, "crops_bottom": bool(top + nh > H),
                 "bottom_overflow_px": max(0, top + nh - H),
                 "crops_sides": bool(left < 0 or left + nw > W),
                 "top_margin_px": top}


def place_like_the_deck(cut: Image.Image, prof: dict) -> tuple[Image.Image, dict]:
    """Scale and seat a cutout the way the printed deck seats its photographs.

    The rules are measurements, not taste. Across the 45 printed cards the subject spans
    roughly the full height of the window, is horizontally centred, and is cropped at the
    BOTTOM on 44 of 45 while the sides are cropped on fewer than one in four. So height
    drives the scale, the bottom is allowed to run off, and the sides are not.
    """
    x0, y0, x1, y1 = R.SLOT_PHOTO
    W, H = x1 - x0, y1 - y0
    box = cut.getbbox()
    if box is None:
        raise Unplaceable("the cutout is empty")
    cut = cut.crop(box)
    iw, ih = cut.size
    # REFUSE TO UPSCALE A FAILED SEGMENTATION INTO A FULL-FRAME SUBJECT. Height drives the
    # scale, so a cutout reduced to a few surviving pixels would otherwise be magnified to
    # fill the window and rendered as though it were the plant. A control in --self-test
    # feeds this a one-pixel cutout for exactly that reason.
    if max(iw, ih) < MIN_CUTOUT_EDGE:
        raise Unplaceable(f"cutout is only {iw}x{ih}px; segmentation kept almost nothing")
    k_h = (prof["bbox_h_frac"]["median"] * H) / ih
    k_w = (prof["bbox_w_frac"]["p90"] * W) / iw        # p90, so sides stay uncropped
    k = min(k_h, k_w)
    if k > MAX_UPSCALE:
        raise Unplaceable(f"would need {k:.1f}x upscaling; the photograph is too small")
    nw, nh = max(1, round(iw * k)), max(1, round(ih * k))
    art = cut.resize((nw, nh), Image.LANCZOS)
    left = round(prof["centroid_x"]["median"] * W - nw / 2)
    top = H - nh                                       # seat on the bottom edge
    return art, {"scale": round(k, 4), "size": [nw, nh], "offset": [left, top],
                 "height_driven": bool(k_h <= k_w),
                 "crops_bottom": bool(top + nh > H), "crops_sides": bool(left < 0 or left + nw > W)}


def composite(art: Image.Image, plan: dict) -> Image.Image:
    """Paint the subject into the window at the deck's photograph opacity."""
    front, _ = R.template_pages()
    front = front.copy()
    x0, y0, x1, y1 = R.SLOT_PHOTO
    layer = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
    layer.alpha_composite(art.convert("RGBA"), tuple(plan["offset"]))
    # Scale the ALPHA, which dims the photograph without touching anything underneath it
    # and leaves the cutout's own antialiased edge intact.
    a = layer.getchannel("A").point(lambda v: round(v * PHOTO_OPACITY))
    layer.putalpha(a)
    front.alpha_composite(layer, (x0, y0))
    return front


def self_test() -> int:
    prof = style_profile()
    checks = [
        (STYLE.exists(), "the measured style profile is present"),
        (prof["_n"] >= 45, f"the profile covers {prof['_n']} printed cards"),
        (abs(PHOTO_OPACITY - 0.95) < 1e-9, "the photograph opacity is 95%"),
        (prof["touch_bottom_pct"] >= 90,
         f"CONTROL: the deck really does crop at the bottom ({prof['touch_bottom_pct']}%)"),
        (prof["touch_left_pct"] < 30 and prof["touch_right_pct"] < 30,
         "CONTROL: the deck rarely crops the sides, so placement must not"),
    ]
    # CONTROL: a fully transparent cutout must not be scored as a usable subject.
    blank = Image.new("RGBA", (400, 400), (0, 0, 0, 0))
    blank.putpixel((0, 0), (255, 255, 255, 255))
    try:
        place_like_the_deck(blank, prof)
        refused = False
    except Unplaceable:
        refused = True
    checks.append((refused,
                   "CONTROL: a one-pixel cutout is REFUSED, not magnified to fill the frame"))
    ok = True
    for good, label in checks:
        print(("PASS  " if good else "FAIL  ") + label)
        ok &= bool(good)
    print("\n" + ("ALL SELF-TESTS PASSED" if ok else "SELF-TESTS FAILED"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--species")
    ap.add_argument("--top", type=int, default=3)
    ap.add_argument("--out", default=None)
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    if not a.species:
        ap.error("--species is required")

    t0 = time.time()
    prof = style_profile()
    pdir = ROOT / "evidence" / "photos" / a.species
    meta = json.loads((pdir / "photos.json").read_text())
    expected = (meta.get("taxon") or {}).get("name")
    # THE SPECIES' OWN BRIEF, loaded before anything is ranked. Derived from its printed card
    # where the deck has one, otherwise from the median of its family's cards, and an edited
    # brief is used verbatim. Nothing universal: a brief may require no flower at all.
    fams = json.loads((ROOT / "evidence" / "card-families.json").read_text())
    herbs = json.loads((ROOT / "src" / "data" / "herbs.json").read_text())["herbs"]
    card_id = next((h["id"] for h in herbs if h["id"].replace("-", "_") == a.species), None)
    if card_id is None:
        # RESOLVE BY GENUS. The deck names some cards at genus level -- Elderberry is
        # `sambucus-spp` -- so an exact key match misses them and the species silently gets
        # no brief at all, which is the worst outcome: it reverts to the species-blind
        # ranking that picked foliage for a Dandelion. A genus card is the right reference
        # for its own genus, so it is used when there is no species-level card.
        genus = a.species.split("_")[0].lower()
        card_id = next((h["id"] for h in herbs
                        if h["scientificName"].split()[0].lower() == genus), None)
        if card_id:
            print(f"brief: no card for {a.species}; using the genus card {card_id}")
    family = None
    retrieved = ROOT / "evidence" / "retrieved" / f"{a.species}.json"
    if retrieved.exists():
        family = ((json.loads(retrieved.read_text()).get("identity") or {}).get("family"))
    if family is None and card_id:
        family = fams.get(card_id)
    brief = visual_brief.load(a.species, card_id, family)
    if brief:
        print(f"brief: mandatory={brief['mandatory']} preferred={brief['preferred']}"
              + (f"  [family prior: {brief['family_prior']}]" if brief.get("family_prior") else "")
              + ("  [edited]" if brief.get("edited") else ""))
    else:
        print("brief: NONE -- no card and no family match; nothing species-specific is enforced")
    out = pathlib.Path(a.out) if a.out else ROOT / "evidence" / "candidates" / a.species
    out.mkdir(parents=True, exist_ok=True)

    scored = []
    for p in meta["photos"]:
        f = pdir / p["file"]
        if not f.exists():
            continue
        scored.append(score(f, {**p, "expected_name": expected}, prof))
    scored.sort(key=lambda s: (-len(s["reject"]) == 0, s["score"]), reverse=True)
    usable = [s for s in scored if not s["reject"]]
    print(f"scored {len(scored)} candidates, {len(usable)} usable, "
          f"{len(scored)-len(usable)} rejected\n")
    for s in scored:
        tag = "REJECT" if s["reject"] else f"{s['score']:5.1f}"
        print(f"   {tag:>6}  {s['photo_id']}")
        for r in s["reject"]:
            print(f"            reject: {r}")
        for fl in s["flags"]:
            print(f"            flag:   {fl}")

    # WORK DOWN THE RANKED LIST UNTIL `top` SURVIVE. Segmentation is the second gate and a
    # candidate can fail it after scoring well, so taking the first `top` and stopping
    # returns fewer previews than asked for and silently skips candidates that would have
    # passed. Reject, then evaluate the next one.
    # SEGMENT ONLY WHAT WE MIGHT SHOW. BiRefNet costs ~25s an image against ~2s for the
    # colour method, so segmenting all 32 candidates to show 3 would spend thirteen minutes
    # to throw most of it away. Scoring is cheap and ranks first; this takes the ranked list
    # and works down it, stopping once enough have survived segmentation. At 2,000 species
    # that is the difference between a few CPU-hours and a few hundred.
    budget = a.top * 5
    results = []
    for s in usable[:budget]:
        src = pdir / s["file"]
        cut, how = segment_plant.cutout(src)
        s["segmented_by"] = how
        alpha = np.array(cut.getchannel("A")) > 127
        solidity = float(alpha.mean())
        if solidity > MAX_CUTOUT_SOLIDITY:
            s["reject"].append(
                f"cannot be cleanly segmented: the cutout fills {100*solidity:.0f}% of its "
                f"own bounding box, so it is a rectangle of vegetation, not a plant")
            print(f"   {s['photo_id']}: rejected after segmentation "
                  f"(solidity {solidity:.2f})")
            continue
        s["cutout_solidity"] = round(solidity, 3)
        # DID THE HAND SURVIVE? The source check is only a flag now, so this is the gate.
        cut_bgr0 = cv2.cvtColor(np.array(cut.convert("RGB")), cv2.COLOR_RGB2BGR)
        skin_left = float((masks(cut_bgr0)["skin"] & alpha).sum() / max(1, alpha.sum()))
        s["skin_in_cutout"] = round(skin_left, 4)
        if skin_left > 0.04:
            s["reject"].append(
                f"a hand survives segmentation: {100*skin_left:.1f}% of the cutout is skin")
            print(f"   {s['photo_id']}: rejected, hand survives the cutout "
                  f"({100*skin_left:.1f}%)")
            continue
        # DOES THE ISOLATED PLANT CARRY WHAT THE BRIEF REQUIRES? Measured on the CUTOUT,
        # not the source: a structure that did not survive segmentation is not on the card,
        # whatever the photograph contained. A candidate missing a mandatory structure is
        # rejected however sharp and however cleanly it cut.
        if brief:
            sh = visual_brief.structures(cut_bgr0, alpha)
            verdict_b = visual_brief.check(brief, sh)
            s["brief_structures"] = sh
            s["brief_check"] = verdict_b
            if not verdict_b["ok"]:
                s["reject"].append(
                    "missing structures the species' brief requires: "
                    + ", ".join(verdict_b["missing_mandatory"]))
                print(f"   {s['photo_id']}: rejected, lacks "
                      f"{verdict_b['missing_mandatory']}")
                continue
            s["points"]["brief_preferred"] = round(verdict_b["preferred_score"] * 8, 1)
            s["score"] = round(s["score"] + s["points"]["brief_preferred"], 1)
        # DID SEGMENTATION KEEP THE STEMS? A blurred stem is low-contrast and matting drops
        # it, so a cutout can be clean and still be a flower head floating with nothing
        # holding it up. Comparing the green surviving in the cutout against the green in
        # the source catches exactly that: one candidate kept 0.1% of its foliage.
        src_bgr = cv2.imread(str(src))
        cut_bgr = cv2.cvtColor(np.array(cut.convert("RGB")), cv2.COLOR_RGB2BGR)
        src_green = masks(src_bgr)["green"].sum() * (alpha.size / max(1, src_bgr[:, :, 0].size))
        kept_green = (masks(cut_bgr)["green"] & alpha).sum()
        retention = float(kept_green / max(1.0, src_green))
        s["green_retention"] = round(retention, 3)
        s["points"]["structure_retention"] = round(min(1.0, retention / 0.25) * 14, 1)
        # SUBJECT SHARPNESS: gradient energy inside the cutout's own alpha, so the blurred
        # background is not in the measurement at all. This is the term the pre-filter
        # could not compute honestly, and it is why it waits until after segmentation.
        gcut = cv2.cvtColor(cut_bgr, cv2.COLOR_BGR2GRAY).astype(float)
        gx = np.abs(np.diff(gcut, axis=0))[:, :-1]
        gy = np.abs(np.diff(gcut, axis=1))[:-1, :]
        inside = alpha[:-1, :-1]
        subj_sharp = float(np.mean(gx[inside] + gy[inside])) if inside.sum() > 500 else 0.0
        s["subject_sharpness"] = round(subj_sharp, 1)
        s["points"]["subject_sharpness"] = round(min(1.0, subj_sharp / 18) * 14, 1)
        s["score"] = round(s["score"] + s["points"]["structure_retention"]
                           + s["points"]["subject_sharpness"], 1)
        if retention < 0.10:
            s["flags"].append(
                f"segmentation kept only {100*retention:.0f}% of the foliage: stems and "
                f"leaves have been cut away")
        # A PLANT SILHOUETTE IS OPEN; A COLONY IS A SLAB. Across the 45 printed cards the
        # subject fills only ~39% of its own bounding box -- light passes between leaves and
        # around petals. A photograph of a dense stand fills 80-100% of its box and still
        # scores well on "flowers visible" and "foliage visible", which is how three colony
        # photographs outranked the one good single specimen. Scoring the DISTANCE from the
        # deck's own solidity is what tells those two apart.
        want = prof["bbox_fill"]["median"]
        s["points"]["silhouette_openness"] = round(
            max(0.0, 1 - abs(solidity - want) / want) * 18, 1)
        s["score"] = round(s["score"] + s["points"]["silhouette_openness"], 1)
        try:
            # ROOTED WHERE THE PHOTOGRAPH SUPPORTS IT, SEATED WHERE IT DOES NOT. A bottom
            # crop only reads as planted when something narrow continues through the cut;
            # crop a photograph that ends at the flower and it reads as beheaded. So the
            # stem is measured and the composition follows the photograph rather than the
            # photograph being forced into the composition.
            support = stem_support(cut)
            s["stem_support"] = support
            if support["has_stem"]:
                art, plan = place_rooted(cut, prof)
            else:
                art, plan = place_like_the_deck(cut, prof)
                s["flags"].append(
                    "no stem reaches the foot of the cutout, so the plant is seated on the "
                    "bottom edge rather than cropped through it; it will read as standing "
                    "in the window rather than rooted")
        except Unplaceable as exc:
            s["reject"].append(f"unplaceable after segmentation: {exc}")
            print(f"   {s['photo_id']}: {exc}")
            continue
        cutf = out / f"{s['photo_id']}-cutout.png"
        cut.save(cutf)
        front = composite(art, plan)
        cscore, cdetail = compose_score(front, prof)
        s["composition"] = cdetail
        s["score"] = round(s["score"] + cscore, 1)
        prev = out / f"{s['photo_id']}-front.png"
        front.convert("RGB").save(prev)
        rec = next(p for p in meta["photos"] if p["photo_id"] == s["photo_id"])
        results.append({**s, "placement": plan, "cutout": cutf.name, "preview": prev.name,
                        "provenance": {k: rec.get(k) for k in
                                       ("photo_id", "observation_id", "observation_url",
                                        "license_code", "license", "photographer",
                                        "dimensions", "taxon_name", "taxon_id")},
                        "retrieved_at": meta.get("fetched_at")})
    # Rank by the COMBINED score, then keep the strongest `top`.
    results.sort(key=lambda r: -r["score"])
    for extra in results[a.top:]:
        for f in (out / extra["preview"], out / extra["cutout"]):
            f.unlink(missing_ok=True)
    results = results[:a.top]
    print("\nafter placement, ranked by combined score:")
    for r in results:
        c = r.get("composition", {})
        print(f"   {r['score']:6.1f}  {r['photo_id']}  placed_fill={c.get('placed_fill')} "
              f"(deck median {prof['frame_fill']['median']})")
    (out / "candidates.json").write_text(json.dumps(
        {"species": a.species, "opacity": PHOTO_OPACITY, "profile_source": str(STYLE.name),
         "all_scores": scored, "selected": results,
         "seconds": round(time.time() - t0, 1)}, indent=2) + "\n")
    print(f"\nwrote {len(results)} previews to {out}  ({time.time()-t0:.1f}s)")
    print("NOTHING IS SELECTED: the highest score is a ranking, not a decision.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
