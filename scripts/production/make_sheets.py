#!/usr/bin/env python3
"""Labelled contact sheets for human review: the pipeline's top N per role (and optionally the owner's picks), with the REAL 24x24 reduction beside each pixel source.

RESEARCH/REVIEW ONLY. It scores nothing and selects nothing. Photos are downloaded at `large` and are never edited; the 24px images are the pipeline's own reduction
of the detected feature, shown so a person can judge whether the proxy matches what survives.
  make_sheets.py --result <result.json> --card 62 --n 8 --out <dir> [--owner-picks <json>]
"""
from __future__ import annotations

import json
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F            # noqa: E402
from production import screen as S       # noqa: E402

KIND = {62: "white", 63: "white", 64: "white", 65: "yellow", 66: "white", 77: "white", 78: "white", 79: "yellow", 80: "white", 81: "white"}
CW, CH = 330, 470


def font(n):
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", n)
    except OSError:
        return ImageFont.load_default()


def fetch(photo_id: int, observation_id: int, work: pathlib.Path):
    obs = ((F.get(f"{F.API}/observations/{observation_id}") or {}).get("results") or [{}])[0]
    ph = next((x for x in obs.get("photos", []) if x.get("id") == photo_id), None)
    if not ph:
        return None
    p = {"photo_id": photo_id, "urls": {s: F.photo_url(ph, s) for s in F.SIZES}}
    F.download([p], work, prefer="large")
    return work / p["file"] if p.get("file") else None


def tile(path, caption, card, pixel=False):
    W = Image.new("RGB", (CW * (2 if pixel else 1), CH + 56), "white")
    d = ImageDraw.Draw(W)
    for j, line in enumerate(caption.split("\n")):
        d.text((6, 4 + j * 15), line, fill="black", font=font(12))
    if path and path.exists():
        im = Image.open(path).convert("RGB")
        im.thumbnail((CW - 8, CH))
        W.paste(im, (4, 56))
        if pixel:
            rgb = S.load_work(path)
            ev = S.evaluate(rgb, 2048, KIND[card], S.default_mask_fn, policy="v4")
            img = (ev.get("_pixel_images") or (None, None))[1]
            if img is not None:
                bg = Image.new("RGB", img.size, (235, 235, 235)); bg.paste(img.convert("RGB"), mask=img.getchannel("A"))
                W.paste(bg.resize((288, 288), Image.NEAREST), (CW + 12, 70))
                d.text((CW + 12, 360), f"real 24x24 reduction; pieces {((ev.get('pixel_test') or {}).get('components'))}, colours {((ev.get('pixel_test') or {}).get('colours'))}", fill="black", font=font(11))
            else:
                d.text((CW + 12, 70), "no feature detected", fill="red", font=font(12))
    return W


def sheet(tiles, out):
    if not tiles:
        return
    cols = 4 if not any(t.width > CW for t in tiles) else 2
    rows = (len(tiles) + cols - 1) // cols
    w = max(t.width for t in tiles)
    S_ = Image.new("RGB", (w * cols, (CH + 56) * rows), "white")
    for i, t in enumerate(tiles):
        S_.paste(t, ((i % cols) * w, (i // cols) * (CH + 56)))
    S_.save(out, quality=80)


def main() -> int:
    a = sys.argv
    arg = lambda k, d=None: a[a.index(k) + 1] if k in a else d  # noqa: E731
    res = json.load(open(arg("--result")))
    card, n = int(arg("--card")), int(arg("--n", 8))
    out = pathlib.Path(arg("--out")); out.mkdir(parents=True, exist_ok=True)
    work = pathlib.Path("_work_sheets") / str(card)
    for role in ("main", "pixel", "tall"):
        tiles = []
        for i, c in enumerate(res["top12"][role][:n], 1):
            path = fetch(c["photo_id"], c["observation_id"], work)
            tiles.append(tile(path, f"#{i} {role}  photo {c['photo_id']}\nscore {c['score']}  view {c['view']}", card, pixel=(role == "pixel")))
        sheet(tiles, out / f"{card}_{role}_{res['policy']}_top.jpg")
    if arg("--owner-picks"):
        for role in ("main", "pixel", "tall"):
            tiles = []
            for pk in [p for p in json.load(open(arg("--owner-picks")))["picks"] if p["card"] == card and p["role"] == role]:
                path = fetch(pk["photo_id"], pk["observation_id"], work)
                tiles.append(tile(path, f"OWNER {role}  photo {pk['photo_id']}\n{pk['picture']}", card, pixel=(role == "pixel")))
            sheet(tiles, out / f"{card}_{role}_owner.jpg")
    return 0


if __name__ == "__main__":
    sys.exit(main())
