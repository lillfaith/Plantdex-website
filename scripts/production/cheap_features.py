#!/usr/bin/env python3
"""Cheap, segmentation-free features for every photograph in a species' v4.1 pool. RESEARCH ONLY.

Question: can a pre-filter that never runs the segmenter predict which photographs the full screening will rank highly, well enough to skip the rest WITHOUT losing the
owner's picks? Features come from a 500 px image and plain colour/edge statistics. Nothing here selects or edits anything.
  cheap_features.py --result evidence/blind-test/retro/62_v4.1/result.json --card 62 --kind white --out <dir>"""
import json, pathlib, sys, time
import cv2, numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F  # noqa: E402
from production import screen as S  # noqa: E402

a = sys.argv
arg = lambda k, d=None: a[a.index(k) + 1] if k in a else d  # noqa: E731
res = json.load(open(arg("--result")))
kind = arg("--kind", "white")
rows = res["pool_scores"]
oids = sorted({r["observation_id"] for r in rows})
obs = {}
for i in range(0, len(oids), 100):
    for o in (F.get(f"{F.API}/observations/{','.join(map(str, oids[i:i + 100]))}?per_page=200") or {}).get("results", []):
        obs[o["id"]] = o
work = pathlib.Path("_cheap"); work.mkdir(exist_ok=True)
out = []
t0 = time.time()
for n, r in enumerate(rows):
    o = obs.get(r["observation_id"]); ph = next((x for x in (o or {}).get("photos", []) if x["id"] == r["photo_id"]), None)
    if not ph:
        continue
    p = {"photo_id": r["photo_id"], "urls": {s: F.photo_url(ph, s) for s in F.SIZES}}
    F.download([p], work, prefer="medium")
    if not p.get("file"):
        continue
    im = cv2.imread(str(work / p["file"]))
    if im is None:
        continue
    s = 500 / max(im.shape[:2]); im = cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA) if s < 1 else im
    h, w = im.shape[:2]
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV); H, Sat, V = (hsv[..., i].astype(int) for i in range(3))
    rgb = cv2.cvtColor(im, cv2.COLOR_BGR2RGB)
    flower = S.FLOWER_KINDS[kind](H, Sat, V)
    green = (H >= 35) & (H <= 85) & (Sat >= 40)
    gray = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (5, 5), 0), 40, 110) > 0
    cy0, cy1, cx0, cx1 = int(h * .2), int(h * .8), int(w * .2), int(w * .8)
    centre = (slice(cy0, cy1), slice(cx0, cx1))
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    dims = ph.get("original_dimensions") or {}
    fl = flower.astype(np.uint8); n_cc, _, st, _ = cv2.connectedComponentsWithStats(cv2.morphologyEx(fl, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)), 8)
    areas = sorted([int(st[i, cv2.CC_STAT_AREA]) for i in range(1, n_cc)], reverse=True)
    out.append({"photo_id": r["photo_id"], "observation_id": r["observation_id"], "f": {
        "flower_share": float(flower.mean()), "flower_share_centre": float(flower[centre].mean()), "green_share": float(green.mean()), "green_share_centre": float(green[centre].mean()),
        "edge_density": float(edges.mean()), "edge_density_centre": float(edges[centre].mean()), "edge_ratio_centre_to_border": float(edges[centre].mean() / max(1e-4, edges.mean())),
        "sat_mean": float(Sat.mean() / 255), "val_mean": float(V.mean() / 255), "val_std": float(V.std() / 255), "colour_spread": float(rgb.reshape(-1, 3).std(axis=0).mean() / 70),
        "lap_var": float(lap.var()), "lap_var_centre": float(lap[centre].var()), "aspect": w / h, "orig_long": float(max(dims.get("width", 0), dims.get("height", 0))),
        "largest_flower_blob": float(areas[0] / (h * w)) if areas else 0.0, "n_flower_blobs": float(len([x for x in areas if x > 0.0008 * h * w])),
        "skin_like": float(((H <= 25) & (Sat >= 40) & (Sat <= 170) & (V >= 80)).mean())}})
    if n % 100 == 0:
        print(f"  {n}/{len(rows)}  {int(time.time() - t0)}s", flush=True)
d = pathlib.Path(arg("--out", "out")); d.mkdir(exist_ok=True)
json.dump({"card": int(arg("--card")), "rows": out}, open(d / f"cheap_{arg('--card')}.json", "w"))
print("rows", len(out), "seconds", int(time.time() - t0))
