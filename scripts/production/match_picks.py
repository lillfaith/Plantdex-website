#!/usr/bin/env python3
"""Identify which iNaturalist photographs the owner's picked images are (RESEARCH ONLY; scores and selects nothing).

The owner supplied image files without photo ids. For each card the sealed pool (every photograph the pipeline scored, from
the v4.2 result) is downloaded at `large` and compared with each picked image by normalised correlation of a 48x48 greyscale
thumbnail (plus a dHash distance). A picked image with no match above the threshold is reported as NOT FOUND in the pool.
  match_picks.py --card 77 --result <result.json> --images <dir> --map <json filename->role> --out <json>
"""
from __future__ import annotations

import concurrent.futures as cf
import io
import json
import pathlib
import sys
import urllib.request

import numpy as np
from PIL import Image

BASE = "https://inaturalist-open-data.s3.amazonaws.com/photos/{pid}/large.{ext}"


def thumb(im: Image.Image, n=48) -> np.ndarray:
    g = np.asarray(im.convert("L").resize((n, n), Image.BILINEAR), float)
    g = g - g.mean()
    d = np.linalg.norm(g)
    return g / d if d else g


def dhash(im: Image.Image) -> np.ndarray:
    g = np.asarray(im.convert("L").resize((17, 16), Image.BILINEAR), float)
    return (g[:, 1:] > g[:, :-1]).flatten()


def fetch(pid: int):
    for ext in ("jpg", "jpeg", "png"):
        try:
            with urllib.request.urlopen(urllib.request.Request(BASE.format(pid=pid, ext=ext), headers={"User-Agent": "plantdex-dev-pick-match"}), timeout=40) as r:
                return pid, Image.open(io.BytesIO(r.read())).convert("RGB")
        except Exception:
            continue
    return pid, None


def main() -> int:
    a = sys.argv
    arg = lambda k: a[a.index(k) + 1]  # noqa: E731
    res = json.load(open(arg("--result")))
    picks = json.load(open(arg("--map")))
    imgs = {f: Image.open(pathlib.Path(arg("--images")) / f).convert("RGB") for f in picks}
    pt = {f: (thumb(im), dhash(im), im.size) for f, im in imgs.items()}
    pool = {r["photo_id"]: r["observation_id"] for r in res["pool_scores"]}
    best = {f: [] for f in picks}
    done = missing = 0
    with cf.ThreadPoolExecutor(16) as ex:
        for pid, im in ex.map(fetch, list(pool)):
            done += 1
            if im is None:
                missing += 1
                continue
            t, h = thumb(im), dhash(im)
            for f, (pt_, ph, _) in pt.items():
                best[f].append((float((t * pt_).sum()), int((h != ph).sum()), pid))
    out = {"card": int(arg("--card")), "pool_photos": len(pool), "download_failures": missing, "matches": {}}
    for f, lst in best.items():
        lst.sort(reverse=True)
        top = lst[:3]
        out["matches"][f] = {"role": picks[f], "size": list(pt[f][2]),
                              "best": [{"photo_id": p, "observation_id": pool[p], "ncc": round(c, 4), "dhash_dist": d} for c, d, p in top],
                              "matched": bool(top and top[0][0] >= 0.97)}
    pathlib.Path(arg("--out")).write_text(json.dumps(out, indent=1))
    for f, m in out["matches"].items():
        b = m["best"][0] if m["best"] else {}
        print(f, m["role"], "MATCH" if m["matched"] else "no match", b, flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
