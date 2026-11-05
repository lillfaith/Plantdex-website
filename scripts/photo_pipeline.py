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
    g = bgr[:, :, 1].astype(float)
    sharp = float(np.mean(np.abs(np.diff(g, axis=0))[:, :-1] + np.abs(np.diff(g, axis=1))[:-1, :]))
    if sharp < MIN_SHARPNESS:
        out["reject"].append(f"too soft: gradient energy {sharp:.1f} < {MIN_SHARPNESS}")
    m = masks(bgr)
    skin_frac, skin_smooth, obstructs = skin_blob(bgr, m["skin"],
                                                  m["white"] | m["yellow"] | m["green"])
    # OBSTRUCTION, NOT PRESENCE. A hand holding a stem BEHIND the flower is background and
    # segmentation removes it; a hand ACROSS the flower has destroyed the subject and no
    # amount of masking brings it back. Rejecting on presence alone threw out the best
    # chamomile photograph in the set, whose finger sits entirely behind the bloom.
    if skin_frac > MAX_SKIN and skin_smooth < SKIN_SMOOTH and obstructs:
        out["reject"].append(
            f"a hand or finger crosses the plant itself ({100*skin_frac:.1f}% of frame, "
            f"internal gradient {skin_smooth:.1f})")
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
    pts["sharpness"] = round(min(1.0, sharp / 25) * 10, 1)
    # reproductive structures, foliage, and whether BOTH are present
    flower = float((m["white"] | m["yellow"]).mean())
    foliage = float(m["green"].mean())
    pts["flowers_visible"] = round(min(1.0, flower / 0.12) * 12, 1)
    pts["foliage_visible"] = round(min(1.0, foliage / 0.25) * 12, 1)
    pts["whole_plant"] = 14.0 if (flower > 0.02 and foliage > 0.05) else 0.0
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
    results = []
    for s in usable:
        src = pdir / s["file"]
        cut = card_art.cutout(src, margin=0.06, iterations=6)
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
        try:
            art, plan = place_like_the_deck(cut, prof)
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
