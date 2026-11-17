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


def card_record(c: dict) -> dict:
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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--assets", required=True); ap.add_argument("--data", required=True)
    ap.add_argument("--cards", nargs="+", type=int, required=True); ap.add_argument("--out", required=True)
    a = ap.parse_args()
    pkg, out = pathlib.Path(a.assets), pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    cards = {c["cardNumber"]: c for c in json.load(open(a.data))["cards"]}
    real_pages = R.template_pages
    report = {"cards": {}}
    for n in a.cards:
        c = cards[n]
        rec = card_record(c)
        overlay = Image.open(pkg / "cards" / str(n) / "back_gradient_mask_overlay.png").convert("RGBA")
        ov = overlay.resize((R.WIDTH, round(R.WIDTH * REF_H / REF_W)), Image.LANCZOS)

        def pages(ov=ov):
            f, b = real_pages()
            b = b.copy()
            f = clear_template_tile(f)
            b.alpha_composite(ov, (0, 0))       # the preview sits UNDER the back text, as on the printed deck
            return f, b
        R.template_pages = pages
        blocked: list = []
        front = R.render_front(rec, out / "_none", blocked)       # text, use discs, bars, season, rarity
        back = R.render_back(rec, blocked)
        R.template_pages = real_pages
        info = {"main": place_main(front, n, pkg), "pixel": place_pixel(front, n, pkg), "renderer_notes": blocked}
        d = out / f"{n:03d}_{c['id']}"
        d.mkdir(exist_ok=True)
        front.convert("RGB").save(d / "front.png", optimize=True)
        back.convert("RGB").save(d / "back.png", optimize=True)
        # visual parity with the approved reference at its own size
        for side, img in (("front", front), ("back", back)):
            ref = Image.open(pkg / "cards" / str(n) / f"{side}_final.png").convert("RGB")
            mine = img.convert("RGB").resize(ref.size, Image.LANCZOS)
            diff = np.abs(np.asarray(mine, dtype=int) - np.asarray(ref, dtype=int)).sum(axis=2)
            info[f"{side}_parity"] = {"mean_abs_diff_per_channel": round(float(diff.mean() / 3), 2)}
            # side-by-side for review: approved reference | mine
            sb = Image.new("RGB", (ref.width * 2 + 10, ref.height), (245, 245, 250))
            sb.paste(ref, (0, 0)); sb.paste(mine, (ref.width + 10, 0))
            sb.save(d / f"compare_{side}_reference_vs_generated.png")
        report["cards"][str(n)] = {"common_name": c["commonName"], **info}
        print(n, c["commonName"], "ok", info["front_parity"], info["back_parity"], f"renderer notes: {len(blocked)}")
    (out / "render-report.json").write_text(json.dumps(report, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
