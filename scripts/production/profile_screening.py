#!/usr/bin/env python3
"""Where does screening time go, and which speedups leave the masks (and so the scores) unchanged? RESEARCH ONLY.
Times each stage on a fixed sample of one species' v4 pool, then compares alternative segmenters and thread settings against the current mask.
  profile_screening.py --result evidence/blind-test/retro/62_v4/result.json --n 24 --out <dir>"""
import json, os, pathlib, random, sys, time
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F  # noqa: E402
from production import screen as S  # noqa: E402
from PIL import Image  # noqa: E402

a = sys.argv
arg = lambda k, d=None: a[a.index(k) + 1] if k in a else d  # noqa: E731
res = json.load(open(arg("--result")))
n = int(arg("--n", 24))
rng = random.Random(7)
rows = rng.sample(res["pool_scores"], n)
oids = sorted({r["observation_id"] for r in rows})
obs = {}
for i in range(0, len(oids), 100):
    for o in (F.get(f"{F.API}/observations/{','.join(map(str, oids[i:i + 100]))}?per_page=200") or {}).get("results", []):
        obs[o["id"]] = o
work = pathlib.Path("_prof"); work.mkdir(exist_ok=True)
files, t_dl = [], []
for r in rows:
    o = obs.get(r["observation_id"]); ph = next((x for x in (o or {}).get("photos", []) if x["id"] == r["photo_id"]), None)
    if not ph:
        continue
    p = {"photo_id": r["photo_id"], "urls": {s: F.photo_url(ph, s) for s in F.SIZES}}
    t = time.time(); F.download([p], work, prefer="large"); t_dl.append(time.time() - t)
    if p.get("file"):
        files.append(work / p["file"])
print("downloaded", len(files), "mean s", round(float(np.mean(t_dl)), 2), "cpus", os.cpu_count(), flush=True)
out = {"cpus": os.cpu_count(), "download_s": float(np.mean(t_dl)), "n": len(files)}

# 1. stage timings with the current segmenter
S.default_mask_fn(S.load_work(files[0]))   # warm up (model load excluded)
tl, tm, tev, tviews, nviews = [], [], [], [], []
for f in files:
    t = time.time(); rgb = S.load_work(f); tl.append(time.time() - t)
    t = time.time(); mask = S.default_mask_fn(rgb); tm.append(time.time() - t)
    t = time.time(); S.evaluate(rgb, 2048, "white", S.default_mask_fn, policy="v4.1"); tev.append(time.time() - t)
    t = time.time(); v = S.evaluate_views(rgb, 2048, "white", S.default_mask_fn, "v4.1"); tviews.append(time.time() - t); nviews.append(len(v))
out.update({"load_s": float(np.mean(tl)), "mask_s": float(np.mean(tm)), "evaluate_one_view_s": float(np.mean(tev)), "evaluate_views_s": float(np.mean(tviews)), "mean_views": float(np.mean(nviews))})
print(json.dumps(out), flush=True)

# 2. alternative segmenters: speed and agreement with the current mask
from rembg import new_session, remove  # noqa: E402
import segment_plant as SP  # noqa: E402
ref = {f: S.default_mask_fn(S.load_work(f)) for f in files}
def iou(a, b):
    u = (a | b).sum(); return float((a & b).sum() / u) if u else 1.0
alts = {}
for name in ("u2netp", "silueta", "isnet-general-use", "birefnet-general-lite"):
    try:
        sess = new_session(name)
    except Exception as e:  # noqa: BLE001
        alts[name] = {"error": str(e)[:80]}; continue
    ts, ious = [], []
    for f in files:
        rgb = S.load_work(f); t = time.time()
        alpha = np.array(remove(Image.fromarray(rgb), session=sess).convert("RGBA").getchannel("A")); m = SP.tidy(alpha) > 127
        ts.append(time.time() - t); ious.append(iou(m, ref[f]))
    alts[name] = {"mean_s": float(np.mean(ts)), "mean_iou_vs_current": float(np.mean(ious)), "min_iou": float(np.min(ious)), "frac_iou_ge_0.9": float(np.mean(np.array(ious) >= 0.9))}
    print(name, alts[name], flush=True)
out["alternatives"] = alts

# 3. reuse the full-frame mask for the subject-crop view instead of segmenting the crop again
def evaluate_reuse(rgb, mask, kind):
    ev = S.evaluate(rgb, 2048, kind, lambda _r: mask, policy="v4.1")
    return ev
same, tre, tnew = 0, [], []
for f in files:
    rgb = S.load_work(f); mask = ref[f]
    full = S.evaluate(rgb, 2048, "white", lambda _r, m=mask: m, policy="v4.1")
    boxes = S.crop_boxes(rgb, full, "white")
    for label, (x, y, bw, bh) in boxes:
        if label != "subject-crop":
            continue
        sub_rgb = np.ascontiguousarray(rgb[y:y + bh, x:x + bw]); sub_mask = np.ascontiguousarray(mask[y:y + bh, x:x + bw])
        t = time.time(); e1 = S.evaluate(sub_rgb, 2048, "white", lambda _r, m=sub_mask: m, policy="v4.1"); tre.append(time.time() - t)
        t = time.time(); e2 = S.evaluate(sub_rgb, 2048, "white", S.default_mask_fn, policy="v4.1"); tnew.append(time.time() - t)
        from production import rank as R
        for role in R.ROLES:
            s1 = R.score_role(role, e1, {"identification_agreements": 2, "flowering_annotation": True}, 2048, "white", "v4.1")["score"]
            s2 = R.score_role(role, e2, {"identification_agreements": 2, "flowering_annotation": True}, 2048, "white", "v4.1")["score"]
            out.setdefault("crop_reuse_abs_score_diff", []).append(abs(s1 - s2))
out["crop_reuse"] = {"n_crops": len(tre), "reuse_s": float(np.mean(tre)) if tre else None, "resegment_s": float(np.mean(tnew)) if tnew else None,
                     "mean_abs_score_diff": float(np.mean(out.get("crop_reuse_abs_score_diff", [0]))), "max_abs_score_diff": float(np.max(out.get("crop_reuse_abs_score_diff", [0])))}
out.pop("crop_reuse_abs_score_diff", None)
print(json.dumps(out["crop_reuse"]), flush=True)
pathlib.Path(arg("--out", "out")).mkdir(exist_ok=True)
json.dump(out, open(pathlib.Path(arg("--out", "out")) / "profile.json", "w"), indent=1)
