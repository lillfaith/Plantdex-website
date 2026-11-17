#!/usr/bin/env python3
"""Render finished expansion cards: the deck's own template + table text + the APPROVED artwork layers.

PRIVATE DEVELOPMENT TOOL. Reads the hidden draft data (src/data/expansion-cards.json) and an approved
asset package (cards/<n>/{front_final,main_source,pixel_icon_native_24x24,back_gradient_mask_overlay}.png
plus templates/front_base_390x630.png). It writes images and a QA report to --out. It edits no card
record, adds nothing to public/, and deploys nothing.

Text, icons, bars and the template come from render_generated_card.py (measured off the printed deck).
The ARTWORK is placed where the approved reference front puts it: the subject's box is measured by
differencing front_final against the blank base, so the placement follows the approved mockup rather
than a guess. The tall back preview is the approved aligned overlay, used as supplied.

    python3 scripts/render_expansion_batch.py --assets <unzipped package> --data <expansion-cards.json> \
        --cards 57 58 59 60 61 --out out/
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

import numpy as np
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import render_generated_card as R  # noqa: E402

REF_W, REF_H = 390, 630
K = R.WIDTH / REF_W
MAIN_OPACITY = 0.95                      # main botanical layer at 95% (the deck's own photo opacity)
PIXEL_DISPLAY = {57: 96}                 # approved: Boneset's icon displays 96px, the others ~91px
PIXEL_DISPLAY_DEFAULT = 91
# Element icons (water / sun / temperature) at the size they are drawn on the SHIPPED cards. The renderer's own
# STAT_ROWS_INK came out larger (drops 35x54 vs 33x49, suns spilling into each other, thermometers 22x35 vs
# 21x33), measured by colour-segmenting Dandelion/Pine from public/cards against this renderer's output.
# (x0, top, width, height) of each icon's full ink; pitch from the shipped rows (66.5-67).
SHIPPED_STAT_ROWS_INK = {"water": (74, 776, 33, 50), "sun": (61, 853, 60, 55), "temperature": (70, 931, 43, 59)}
SHIPPED_STAT_PITCH = 66.4
ART_ROWS = (0, 385)                      # reference rows that hold the art window
R.STAT_ROWS_INK = SHIPPED_STAT_ROWS_INK
R.SLOT_PITCH = SHIPPED_STAT_PITCH
# The season tile. The renderer's SLOT_SEASON (688,1016)-(736,1064) sits 4px right of where the SHIPPED cards draw it
# (measured on Dandelion/Pine: gold tile at (684,1016)-(732,1064)), so the icon landed beside the template's own tile
# and read as a second, offset tile on top of the original.
# NAMES. The deck reduces an over-long name by 5% at a time, only as far as it must. The limits are the real
# boundaries, measured on the template: the name bar runs x=59..607 and the text starts at ~73, so 520 leaves ~14px
# inside the bar's right edge; the Latin name must clear the first use disc (starts x=619) with ~24px to spare.
R.SHRINK_STEP = 0.95
R.SLOT_LIMITS = {**R.SLOT_LIMITS, "common": 520, "scientific": 520}
R.SLOT_SEASON = (682, 1013, 733, 1064)   # covers the shipped tile AND the template tile beneath it
PIXEL_BOX = (265, 405, 375, 530)         # reference box around the pixel panel


def changed_bbox(a: Image.Image, b: Image.Image, box, thresh: int = 24):
    x0, y0, x1, y1 = box
    A = np.asarray(a.convert("RGB"), dtype=int)[y0:y1, x0:x1]
    B = np.asarray(b.convert("RGB"), dtype=int)[y0:y1, x0:x1]
    m = np.abs(A - B).sum(axis=2) > thresh
    ys, xs = np.where(m)
    if not len(xs):
        return None
    return (x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1)


def clear_template_tile(front: Image.Image) -> Image.Image:
    """Remove the template's own gold season tile (inpainted from its surroundings) so the season icon is the
    ONLY tile drawn there, instead of sitting on top of a second, slightly offset one."""
    import cv2
    rgb = np.asarray(front.convert("RGB")).copy()
    y0, y1, x0, x1 = 1005, 1072, 672, 742
    sub = rgb[y0:y1, x0:x1]
    m = ((sub[..., 0] > 200) & (sub[..., 1] > 190) & (sub[..., 2] < 200)).astype(np.uint8) * 255
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    rgb[y0:y1, x0:x1] = cv2.inpaint(sub, m, 4, cv2.INPAINT_TELEA)
    out = front.copy()
    out.paste(Image.fromarray(rgb), (0, 0))
    return out


def apply_overrides(c: dict) -> dict:
    """Apply the owner's recorded text edits (expansion/text-overrides.json) to a COPY of the card; refuse if the 'from' text is gone."""
    import copy
    path = HERE.parent / "expansion" / "text-overrides.json"
    c = copy.deepcopy(c)
    if not path.exists():
        return c
    for e in json.loads(path.read_text()).get(str(c["cardNumber"]), []):
        sect, key = e["field"].split(".")
        items = c[sect][key]
        if "append" in e:                          # owner ADDS entries to a list; nothing is replaced
            items.extend(x for x in e["append"] if x not in items)
            continue
        if not isinstance(items, list):          # a single value (rarity, xp), not a list of entries
            if items != e["from"]:
                raise SystemExit(f"card {c['cardNumber']}: override expects {e['from']!r} in {e['field']} but found {items!r}")
            c[sect][key] = e["to"]
            continue
        if e["from"] not in items:
            raise SystemExit(f"card {c['cardNumber']}: override expects {e['from']!r} in {e['field']} but found {items}")
        items[items.index(e["from"])] = e["to"]
    return c


def card_record(c: dict) -> dict:
    c = apply_overrides(c)
    f = c["front"]
    return {"card_number": f"#{c['cardNumber']}", "common_name": c["commonName"],
            "front": {"scientific_name": c["scientificName"], "use_icons": f["uses"], "season": f["season"],
                      "environmental_indicators": {"water": f["stats"]["water"], "sun": f["stats"]["sun"],
                                                   "temperature": f["stats"]["temperature"]},
                      "encounter_rate": f["rarity"]},
            "back": {k: c["back"][k] for k in ("healingTraits", "compounds", "taste", "aromatic", "preparations", "usableParts")}}


def subject_mask(ref: Image.Image, base: Image.Image, box, thresh: int = 24) -> np.ndarray:
    x0, y0, x1, y1 = box
    A = np.asarray(ref.convert("RGB"), dtype=int)[y0:y1, x0:x1]
    B = np.asarray(base.convert("RGB"), dtype=int)[y0:y1, x0:x1]
    return np.abs(A - B).sum(axis=2) > thresh


def fit_uniform(src_alpha: np.ndarray, target: np.ndarray):
    """Find the UNIFORM scale and offset that best lay the source's alpha over the approved front's subject.

    Never stretches: one scale for both axes. Scored by overlap (IoU) with the region the approved front
    actually changed. Returns (scale, dx, dy, iou) in reference pixels, relative to the target array.
    """
    th, tw = target.shape
    sh, sw = src_alpha.shape
    ys, xs = np.where(target)
    tb = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    best = (0.0, 1.0, 0, 0)
    base_s = min((tb[2] - tb[0]) / sw, (tb[3] - tb[1]) / sh)
    for s in np.linspace(base_s * 0.80, base_s * 1.35, 56):
        w, h = max(1, round(sw * s)), max(1, round(sh * s))
        a = np.asarray(Image.fromarray((src_alpha * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)) > 100
        # candidate offsets: align bottom-centre, top-centre and left/right edges of the two boxes, then refine
        cxs = [tb[0], tb[2] - w, (tb[0] + tb[2] - w) // 2]
        cys = [tb[1], tb[3] - h, (tb[1] + tb[3] - h) // 2]
        for cx in cxs:
            for cy in cys:
                for dx in range(-6, 7, 2):
                    for dy in range(-6, 7, 2):
                        ox, oy = cx + dx, cy + dy
                        x0, y0, x1, y1 = max(0, ox), max(0, oy), min(tw, ox + w), min(th, oy + h)
                        if x1 <= x0 or y1 <= y0:
                            continue
                        aa = a[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
                        tt = target[y0:y1, x0:x1]
                        inter = (aa & tt).sum()
                        union = aa.sum() + target.sum() - inter
                        iou = inter / max(1, union)
                        if iou > best[0]:
                            best = (float(iou), float(s), ox, oy)
    return best[1], best[2], best[3], best[0]


def place_main(front: Image.Image, n: int, pkg: pathlib.Path) -> dict:
    base = Image.open(pkg / "templates" / "front_base_390x630.png")
    ref = Image.open(pkg / "cards" / str(n) / "front_final.png")
    box = (0, ART_ROWS[0], REF_W, ART_ROWS[1])
    target = subject_mask(ref, base, box)
    src = Image.open(pkg / "cards" / str(n) / "main_source.png").convert("RGBA")
    src = src.crop(src.getbbox())
    alpha = np.asarray(src.getchannel("A"), dtype=float) / 255
    s, ox, oy, iou = fit_uniform(alpha, target)
    # coarse fit was on the whole source at reference scale: refine nothing further, place at shipped scale
    w, h = round(src.width * s * K), round(src.height * s * K)
    art = src.resize((w, h), Image.LANCZOS)
    art.putalpha(art.getchannel("A").point(lambda v: round(v * MAIN_OPACITY)))
    # The approved front is CLIPPED at the bottom of the art window (stem bottom ~row 329): the source runs on
    # below it, so cut at the lowest row the approved front shows the subject on. Nothing else is cropped.
    ys = np.where(target.any(axis=1))[0]
    cut = round((ys.max() + 1 - oy) * K)
    if 0 < cut < art.height:
        art = art.crop((0, 0, art.width, cut))
    px, py = round(ox * K), round(oy * K)
    front.alpha_composite(art, (px, py))
    return {"uniform_scale_ref": round(s, 4), "placed_px": [px, py, w, h], "overlap_iou": round(iou, 3),
            "source_aspect": round(src.width / src.height, 3), "placed_aspect": round(w / h, 3),
            "clipped_at_window_bottom": bool(0 < cut < h)}


def place_pixel(front: Image.Image, n: int, pkg: pathlib.Path) -> dict:
    """The icon's INK is centred in the pixel panel (both axes), at the approved display size."""
    icon = Image.open(pkg / "cards" / str(n) / "pixel_icon_native_24x24.png").convert("RGBA")
    assert icon.size == (24, 24), icon.size
    ab = icon.getbbox()
    disp = PIXEL_DISPLAY.get(n, PIXEL_DISPLAY_DEFAULT)
    f = disp / 24 * K                                   # shipped px per native px
    size = round(24 * f)
    x0, y0, x1, y1 = R.SLOT_PIXEL
    pcx, pcy = (x0 + x1) / 2, (y0 + y1) / 2
    icx, icy = (ab[0] + ab[2]) / 2 * f, (ab[1] + ab[3]) / 2 * f
    px, py = round(pcx - icx), round(pcy - icy)
    front.alpha_composite(icon.resize((size, size), Image.NEAREST), (px, py))
    return {"panel_centre": [pcx, pcy], "ink_native": list(ab), "display_ref_px": disp, "placed_px": [px, py, size, size]}


def qa_checks(front: Image.Image, back: Image.Image, info: dict) -> dict:
    """Automated checks for every rule learned in review, so a regression fails here instead of in front of the owner."""
    import cv2
    a = np.asarray(front.convert("RGB"))
    hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV)
    H, S_, V = (hsv[..., i].astype(int) for i in range(3))
    out = {}

    def first_box(mask, y0, y1, x0=62, x1=200, dilate=1):
        mm = mask[y0:y1, x0:x1].astype(np.uint8)
        if dilate > 1:
            mm = cv2.dilate(mm, np.ones((dilate, dilate), np.uint8))
        n, l, st, _ = cv2.connectedComponentsWithStats(mm)
        c = sorted([t for t in st[1:] if t[4] > 150], key=lambda t: t[0])
        return c[0] if c else None
    shipped = {"water": (33, 49), "sun": (54, 54), "temperature": (21, 33)}
    masks = {"water": ((H > 85) & (H < 110) & (S_ > 60) & (V > 120), 750, 835, 1),
             "sun": ((H >= 18) & (H <= 34) & (S_ > 90) & (V > 170), 836, 920, 7),
             "temperature": ((((H < 10) | (H > 170)) & (S_ > 150) & (V > 120)), 922, 1010, 1)}
    for k, (m, y0, y1, d) in masks.items():
        b = first_box(m, y0, y1, dilate=d)
        want = shipped[k]
        out[f"icon_{k}_matches_shipped_size"] = bool(b is not None and abs(b[2] - (d - 1) - want[0]) <= 4 and abs(b[3] - (d - 1) - want[1]) <= 4)
    px = info.get("pixel")
    if px:
        cx = px["placed_px"][0] + (px["ink_native"][0] + px["ink_native"][2]) / 2 * px["placed_px"][2] / 24
        cy = px["placed_px"][1] + (px["ink_native"][1] + px["ink_native"][3]) / 2 * px["placed_px"][3] / 24
        out["pixel_icon_centred_in_panel"] = bool(abs(cx - px["panel_centre"][0]) <= 2 and abs(cy - px["panel_centre"][1]) <= 2)
        out["main_art_not_stretched"] = bool(abs(info["main"]["source_aspect"] - info["main"]["placed_aspect"]) <= 0.01)
    # names: ink must stay inside the name bar (x 59..607) and clear the first use disc (x >= 619) with room to spare
    yellow = (a[..., 0] > 200) & (a[..., 1] > 180) & (a[..., 2] < 170)            # the name / Latin lettering
    edge = lambda y0, y1, x1: (int(np.where(yellow[y0:y1, 62:x1].any(axis=0))[0].max() + 62) if yellow[y0:y1, 62:x1].any() else None)
    out["name_right_edge_px"] = edge(75, 135, 607)
    out["name_inside_bar_with_room"] = bool(out["name_right_edge_px"] is not None and out["name_right_edge_px"] <= 607 - 8)
    out["latin_right_edge_px"] = edge(712, 760, 612)
    out["latin_clear_of_use_discs"] = bool(out["latin_right_edge_px"] is not None and out["latin_right_edge_px"] <= 619 - 16)
    tile = ((a[1000:1080, 660:760, 0] > 230) & (a[1000:1080, 660:760, 1] > 220) & (a[1000:1080, 660:760, 2] < 190))
    ys, xs = np.where(tile)
    out["season_tile_single_and_in_place"] = bool(len(xs) and (xs.max() - xs.min() + 1) <= 52 and (ys.max() - ys.min() + 1) <= 53 and 680 <= xs.min() + 660 <= 686)
    out["all_passed"] = all(v for k, v in out.items() if isinstance(v, bool))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--assets", help="approved art package; a card with no art folder in it is rendered WITHOUT artwork"); ap.add_argument("--data", required=True)
    ap.add_argument("--cards", nargs="+", type=int, required=True); ap.add_argument("--out", required=True)
    a = ap.parse_args()
    pkg, out = pathlib.Path(a.assets or "/nonexistent"), pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    cards = {c["cardNumber"]: c for c in json.load(open(a.data))["cards"]}
    real_pages = R.template_pages
    report = {"cards": {}}
    for n in a.cards:
        c = cards[n]
        rec = card_record(c)
        has_art = (pkg / "cards" / str(n) / "main_source.png").exists()
        ov = None
        if has_art:
            overlay = Image.open(pkg / "cards" / str(n) / "back_gradient_mask_overlay.png").convert("RGBA")
            ov = overlay.resize((R.WIDTH, round(R.WIDTH * REF_H / REF_W)), Image.LANCZOS)

        def pages(ov=ov):
            f, b = real_pages()
            b = b.copy()
            f = clear_template_tile(f)
            if ov is not None:
                b.alpha_composite(ov, (0, 0))   # the preview sits UNDER the back text, as on the printed deck
            return f, b
        R.template_pages = pages
        blocked: list = []
        front = R.render_front(rec, out / "_none", blocked)       # text, use discs, bars, season, rarity
        back = R.render_back(rec, blocked)
        R.template_pages = real_pages
        if has_art:
            info = {"main": place_main(front, n, pkg), "pixel": place_pixel(front, n, pkg), "renderer_notes": blocked}
        else:
            info = {"art": "NONE YET: rendered without main image, pixel icon or tall preview", "renderer_notes": blocked}
        d = out / f"{n:03d}_{c['id']}"
        d.mkdir(exist_ok=True)
        front.convert("RGB").save(d / "front.png", optimize=True)
        back.convert("RGB").save(d / "back.png", optimize=True)
        # visual parity with the approved reference at its own size
        for side, img in (("front", front), ("back", back)):
            if not has_art:
                break
            ref = Image.open(pkg / "cards" / str(n) / f"{side}_final.png").convert("RGB")
            mine = img.convert("RGB").resize(ref.size, Image.LANCZOS)
            diff = np.abs(np.asarray(mine, dtype=int) - np.asarray(ref, dtype=int)).sum(axis=2)
            info[f"{side}_parity"] = {"mean_abs_diff_per_channel": round(float(diff.mean() / 3), 2)}
            # side-by-side for review: approved reference | mine
            sb = Image.new("RGB", (ref.width * 2 + 10, ref.height), (245, 245, 250))
            sb.paste(ref, (0, 0)); sb.paste(mine, (ref.width + 10, 0))
            sb.save(d / f"compare_{side}_reference_vs_generated.png")
        info["qa"] = qa_checks(front, back, info)
        info["has_art"] = has_art
        report["cards"][str(n)] = {"common_name": c["commonName"], **info}
        print(n, c["commonName"], "art" if has_art else "NO ART", "QA", "PASS" if info["qa"]["all_passed"] else "FAIL " + str([k for k, v in info["qa"].items() if v is False]), f"| renderer notes: {len(blocked)}")
    (out / "render-report.json").write_text(json.dumps(report, indent=1))
    failed = [n for n, c in report["cards"].items() if not c["qa"]["all_passed"]]
    if failed:
        print("QA FAILED for cards:", ", ".join(failed))
        return 1          # a card that breaks a rule learned in review does not ship
    return 0


if __name__ == "__main__":
    sys.exit(main())
