#!/usr/bin/env python3
"""Where do the owner's hand picks sit in the FULL screened pool, not just the pipeline's shortlist?

RESEARCH ONLY (no card, asset, weight or ranking changes). For one species it rebuilds the candidate pool WITHOUT the
previously-shown exclusion, screens every photograph with the real pipeline (screen.evaluate + rank.score_role),
locates the owner's pictures in that pool by feature matching, and reports for each: which hard rejection (if any) hit
it, its score, and its rank among everything that survived. Each supplied picture is ALSO scored directly, so a pick
that is not in the pool is still measured with the same instrument.

  selection_study_pool.py --request evidence/photo-fetch/request.json --index 0 --picks <dir> --out <dir> [--limit 300]
"""
from __future__ import annotations

import json
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F            # noqa: E402
from production import rank as R         # noqa: E402
from production import screen as S       # noqa: E402
from production import search2 as SE     # noqa: E402

ROLES = ("main", "pixel", "tall")
PICK_ROLE = {"main": "main", "pixe": "pixel", "preview": "tall"}
SLUG = {62: "buckwheat", 63: "wildquinine", 64: "sweeteverlasting", 65: "americanlotus", 66: "annualfleabane"}
KIND = {62: "white", 63: "white", 64: "white", 65: "yellow", 66: "white"}
NEUTRAL_OBS = {"identification_agreements": 2, "identification_disagreements": 0, "flowering_annotation": True}


def small_gray(p: pathlib.Path):
    im = cv2.imread(str(p), cv2.IMREAD_GRAYSCALE)
    if im is None:
        return None
    s = 900 / max(im.shape)
    return cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA) if s < 1 else im


def match(orb, bf, des, kp, des2, kp2):
    if des is None or des2 is None or len(kp2) < 8:
        return 0
    good = [m for m, n in (p for p in bf.knnMatch(des, des2, k=2) if len(p) == 2) if m.distance < 0.75 * n.distance]
    if len(good) < 10:
        return 0
    src = np.float32([kp[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([kp2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    _, mask = cv2.findHomography(src, dst, cv2.RANSAC, 6.0)
    return int(mask.sum()) if mask is not None else 0


def evaluate_file(path: pathlib.Path, photo: dict, kind: str, orig_long: int):
    rgb = S.load_work(path)
    ev = S.evaluate(rgb, orig_long, kind, S.default_mask_fn)
    scores = {r: R.score_role(r, ev, photo, orig_long, kind) for r in ROLES}
    return ev, scores


def compact(ev, scores):
    m = (ev or {}).get("measure") or {}
    return {"scores": {r: {"score": s["score"], "rejected": s["rejected"], "hard": s["hard"], "flags": s["flags"], "parts": s.get("parts")} for r, s in scores.items()},
            "hands": (ev or {}).get("hands"), "measure": m, "pixel_test": (ev or {}).get("pixel_test")}


def font(n):
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", n)
    except OSError:
        return ImageFont.load_default()


def main() -> int:
    a = sys.argv
    arg = lambda k, d=None: a[a.index(k) + 1] if k in a else d  # noqa: E731
    req = json.load(open(arg("--request")))
    row = req["cards"][int(arg("--index"))]
    n = row["card"]
    picks = pathlib.Path(arg("--picks"))
    out = pathlib.Path(arg("--out")) / str(n)
    (out / "sheets").mkdir(parents=True, exist_ok=True)
    work = pathlib.Path("_work") / str(n)
    taxon = F.resolve_taxon(row["scientific"])
    tid = taxon["id"]
    pool = SE.build_pool(tid, set(), set(), limit=int(arg("--limit", 300)))
    table_ids = {r: int(row["photos"][r]) for r in ROLES}
    # make sure the table (ChatGPT) picks are in the pool even if the query ordering would have cut them
    have = {p["photo_id"] for p in pool}
    print(f"#{n}: pool {len(pool)}")
    rows, desc = [], {}
    orb = cv2.ORB_create(2500)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING)
    for i, p in enumerate(pool):
        if not (F.download([p], work, prefer="large") or p.get("file")):
            pass
        f = work / p["file"] if p.get("file") else None
        if not f or not f.exists():
            continue
        try:
            ev, sc = evaluate_file(f, p, KIND[n], p["orig_long"])
        except Exception as e:  # noqa: BLE001
            ev, sc = {"error": str(e)[:80]}, {r: {"score": 0.0, "rejected": True, "hard": [f"error {e}"], "flags": [], "parts": None} for r in ROLES}
        g = small_gray(f)
        desc[p["photo_id"]] = orb.detectAndCompute(g, None) if g is not None else (None, None)
        rows.append({"photo_id": p["photo_id"], "observation_id": p["observation_id"], "file": str(f), "orig_long": p["orig_long"], **compact(ev, sc)})
        if i % 25 == 0:
            print("  screened", i, flush=True)
    surv = {r: sorted([x for x in rows if not x["scores"][r]["rejected"] and x["scores"][r]["score"] >= R.MIN_SCORE], key=lambda x: -x["scores"][r]["score"]) for r in ROLES}
    rank_of = {r: {x["photo_id"]: i for i, x in enumerate(surv[r], 1)} for r in ROLES}
    by_id = {x["photo_id"]: x for x in rows}
    res = {"card": n, "scientific": row["scientific"], "pool": len(rows), "survivors": {r: len(surv[r]) for r in ROLES}, "rejections": {}, "human": [], "chatgpt_table": {}, "pipeline_top5": {}}
    for r in ROLES:
        cnt: dict = {}
        for x in rows:
            for h in x["scores"][r]["hard"]:
                cnt[h.split(":")[0]] = cnt.get(h.split(":")[0], 0) + 1
        res["rejections"][r] = dict(sorted(cnt.items(), key=lambda kv: -kv[1]))
        res["pipeline_top5"][r] = [{"photo_id": x["photo_id"], "score": x["scores"][r]["score"]} for x in surv[r][:5]]
        tid_ = table_ids[r]
        t = by_id.get(tid_)
        res["chatgpt_table"][r] = {"photo_id": tid_, "in_pool": t is not None, **({"score": t["scores"][r]["score"], "rejected": t["scores"][r]["rejected"], "hard": t["scores"][r]["hard"], "rank": rank_of[r].get(tid_), "of": len(surv[r])} if t else {})}
    # --- the human's pictures: locate in the pool, and score the picture itself ---------------------------------
    for fpath in sorted(picks.glob(f"{SLUG[n]}*")):
        role = PICK_ROLE[next(k for k in PICK_ROLE if k in fpath.stem)]
        g = small_gray(fpath)
        kp, des = orb.detectAndCompute(g, None)
        best = (0, None)
        for pid, (k2, d2) in desc.items():
            inl = match(orb, bf, des, kp, d2, k2)
            if inl > best[0]:
                best = (inl, pid)
        found = best[1] if best[0] >= 25 else None
        ev, sc = evaluate_file(fpath, {**NEUTRAL_OBS, "photo_id": -1}, KIND[n], 3000)   # picture scored as-is; resolution neutralised
        rec = {"file": fpath.name, "role": role, "match_inliers": best[0], "photo_id": found, "in_pool": found is not None,
               "own_picture": compact(ev, sc)}
        if found:
            x = by_id[found]
            rec["pool_record"] = {"score_by_role": {r: x["scores"][r]["score"] for r in ROLES}, "rejected_by_role": {r: x["scores"][r]["hard"] for r in ROLES}, "rank_by_role": {r: rank_of[r].get(found) for r in ROLES}}
        # where the picture's own score would land among the pool's survivors for the role it was picked for
        s_own = sc[role]["score"]
        rec["own_score_for_role"] = s_own
        rec["own_rejected_for_role"] = sc[role]["hard"]
        rec["own_rank_if_inserted"] = 1 + sum(1 for x in surv[role] if x["scores"][role]["score"] > s_own)
        rec["of"] = len(surv[role])
        res["human"].append(rec)
        # sheet: human picture | matched pool original | pipeline #1
        cells = [(fpath, f"HUMAN {role.upper()} ({fpath.name})\nown score {s_own} rej {sc[role]['hard'][:1]}\nrank if inserted {rec['own_rank_if_inserted']}/{len(surv[role])}")]
        if found:
            cells.append((pathlib.Path(by_id[found]["file"]), f"same photo in pool: {found}\nrank {rank_of[role].get(found)} / rej {by_id[found]['scores'][role]['hard'][:1]}"))
        top = surv[role][0]
        cells.append((pathlib.Path(top["file"]), f"PIPELINE #1 {role}\nphoto {top['photo_id']} score {top['scores'][role]['score']}"))
        cw, ch = 360, 500
        W = Image.new("RGB", (cw * len(cells), ch + 56), "white"); d = ImageDraw.Draw(W)
        for i, (pp, cap) in enumerate(cells):
            im = Image.open(pp).convert("RGB"); im.thumbnail((cw - 8, ch)); W.paste(im, (i * cw + 4, 56))
            for j, line in enumerate(cap.split("\n")):
                d.text((i * cw + 6, 4 + j * 15), line, fill="black", font=font(12))
        W.save(out / "sheets" / f"{fpath.stem}.jpg", quality=80)
    # compact whole-pool table, for later statistics
    res["pool_scores"] = [{"photo_id": x["photo_id"], "scores": {r: x["scores"][r]["score"] for r in ROLES}, "rejected": {r: x["scores"][r]["hard"] for r in ROLES},
                           "hands": (x["hands"] or {}).get("reject"), "m": {k: x["measure"].get(k) for k in ("flower_share", "bg_busy", "bg_green_share", "boundary_delta_e", "stalk_like_components")},
                           "largest": {k: (x["measure"].get("largest") or {}).get(k) for k in ("h_frac", "aspect_h_over_w", "coherence", "solidity")}} for x in rows]
    (out / "pool-result.json").write_text(json.dumps(res, indent=1, default=str))
    print(json.dumps({k: res[k] for k in ("pool", "survivors", "rejections")}, indent=1))
    for h in res["human"]:
        print(h["file"], h["role"], "in_pool", h["in_pool"], h["photo_id"], "own", h["own_score_for_role"], h["own_rejected_for_role"], "rank_if", h["own_rank_if_inserted"], "/", h["of"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
