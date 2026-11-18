#!/usr/bin/env python3
"""Run the photo pipeline end to end for ONE species under a named policy (v2 = as shipped, v3 = owner-picks study changes).

Writes ranked results only. It selects nothing, edits nothing and approves nothing. Used for two things:
  * RETRO  (#62-66, --owner-picks): how do the owner's 19 known picks fare under v2 and v3?
  * BLIND  (#77-81): a prediction set, written and committed BEFORE the owner chooses.

  pipeline_run.py --request <json with "species">  --index N  --policy v2|v3  --limit 320  [--owner-picks <json>]  --out <dir>
"""
from __future__ import annotations

import json
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F            # noqa: E402
from production import rank as R         # noqa: E402
from production import screen as S       # noqa: E402
from production import search2 as SE     # noqa: E402

ROLES = R.ROLES
NEUTRAL_OBS = {"identification_agreements": 2, "identification_disagreements": 0, "flowering_annotation": True}


def score_photo(path: pathlib.Path, photo: dict, kind: str, policy: str) -> dict:
    rgb = S.load_work(path)
    views = S.evaluate_views(rgb, photo["orig_long"], kind, S.default_mask_fn, policy)
    scores = {r: R.best_view(r, views, photo, kind, policy) for r in ROLES}
    compact = {r: {"score": s["score"], "rejected": s["rejected"], "hard": s["hard"], "view": s.get("view"), "crop_box": s.get("crop_box"),
                   "flags": [f.split(":")[0] for f in s["flags"]]} for r, s in scores.items()}
    return {"photo_id": photo["photo_id"], "observation_id": photo["observation_id"], "scores": compact}


def rank_info(row: dict, rows: list[dict], role: str) -> dict:
    surv = [r for r in rows if not r["scores"][role]["rejected"] and r["scores"][role]["score"] >= R.MIN_SCORE]
    s = row["scores"][role]
    ok = not s["rejected"] and s["score"] >= R.MIN_SCORE
    rank = 1 + sum(1 for r in surv if r["scores"][role]["score"] > s["score"]) if ok else None
    return {"score": s["score"], "survives": ok, "hard": s["hard"], "view": s["view"], "rank": rank, "of": len(surv),
            "percentile_from_top": round(rank / len(surv), 3) if ok and surv else None, "in_top12": bool(rank and rank <= 12), "in_top3": bool(rank and rank <= 3)}


def main() -> int:
    a = sys.argv
    arg = lambda k, d=None: a[a.index(k) + 1] if k in a else d  # noqa: E731
    req = json.load(open(arg("--request")))
    sp = req["species"][int(arg("--index"))]
    policy = arg("--policy", "v3")
    limit = int(arg("--limit", 320))
    out = pathlib.Path(arg("--out")) / f"{sp['card']}_{policy}"
    out.mkdir(parents=True, exist_ok=True)
    work = pathlib.Path("_work") / f"{sp['card']}_{policy}"
    taxon = F.resolve_taxon(sp["scientific"])
    tid = taxon["id"]
    t0 = time.time()
    pool_file = arg("--pool-file")      # sharded runs must all screen the SAME pool: iNaturalist changes while shards run, so the pool is built once and shared
    if pool_file and pathlib.Path(pool_file).exists():
        pool = json.load(open(pool_file))
    else:
        pool = SE.build_pool_v4(tid) if policy in ("v4", "v4.1", "v4.2") else SE.build_pool(tid, set(), set(), limit=limit, policy=policy)
        if pool_file:
            pathlib.Path(pool_file).parent.mkdir(parents=True, exist_ok=True)
            json.dump(pool, open(pool_file, "w"), default=str)
    if arg("--pool-only"):
        print("pool", len(pool))
        return 0
    print(f"#{sp['card']} {sp['scientific']} policy={policy}: pool {len(pool)}", flush=True)
    by_pid = {p["photo_id"]: p for p in pool}
    shard = arg("--shard")                       # "k/n": screen only every n-th photograph (pool order is deterministic); merge_shards.py joins the pieces
    k, n_sh = (int(x) for x in shard.split("/")) if shard else (0, 1)
    rows = []
    for i, p in enumerate(pool):
        if i % n_sh != k:
            continue
        F.download([p], work, prefer="large")
        if not p.get("file"):
            continue
        try:
            rows.append(score_photo(work / p["file"], p, sp["flower_kind"], policy))
        except Exception as e:  # noqa: BLE001
            print("  error", p["photo_id"], str(e)[:80])
        if i % 25 == 0:
            print(f"  {i}/{len(pool)}  {int(time.time() - t0)}s", flush=True)
    if shard:
        # a shard writes its rows only; shard 0 also scores the owner's picks (below) so the merge can rank them against the whole pool
        res = {"card": sp["card"], "scientific": sp["scientific"], "policy": policy, "shard": shard, "pool_total": len(pool), "rows": rows, "owner_rows": []}
        if picks_file_for_shard := arg("--owner-picks"):
            if k == 0:
                for pk in [x for x in json.load(open(picks_file_for_shard))["picks"] if x["card"] == sp["card"]]:
                    ans = F.get(f"{F.API}/observations/{pk['observation_id']}") or {}
                    obs = (ans.get("results") or [{}])[0]
                    ph = next((x for x in obs.get("photos", []) if x.get("id") == pk["photo_id"]), None)
                    if ph:
                        dims = ph.get("original_dimensions") or {}
                        p = {**NEUTRAL_OBS, "photo_id": ph["id"], "observation_id": obs["id"], "urls": {s: F.photo_url(ph, s) for s in F.SIZES},
                             "orig_long": max(dims.get("width", 0), dims.get("height", 0)) or 2048, "identification_agreements": obs.get("num_identification_agreements") or 0}
                        F.download([p], work, prefer="large")
                        if p.get("file"):
                            res["owner_rows"].append({**pk, "in_pool": pk["photo_id"] in by_pid, "row": score_photo(work / p["file"], p, sp["flower_kind"], policy)})
        (out / f"shard_{k}.json").write_text(json.dumps(res, default=str))
        print("shard", shard, "rows", len(rows))
        return 0
    res = {"card": sp["card"], "scientific": sp["scientific"], "policy": policy, "pool": len(rows), "built": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "survivors": {}, "rejections": {}, "top12": {}, "joint_top3": R.joint_top3(rows)}
    for r in ROLES:
        surv = sorted([x for x in rows if not x["scores"][r]["rejected"] and x["scores"][r]["score"] >= R.MIN_SCORE], key=lambda x: -x["scores"][r]["score"])
        res["survivors"][r] = len(surv)
        cnt: dict = {}
        for x in rows:
            for h in x["scores"][r]["hard"]:
                cnt[h.split(":")[0]] = cnt.get(h.split(":")[0], 0) + 1
        res["rejections"][r] = dict(sorted(cnt.items(), key=lambda kv: -kv[1]))
        res["top12"][r] = [{"photo_id": x["photo_id"], "observation_id": x["observation_id"], "score": x["scores"][r]["score"], "view": x["scores"][r]["view"]} for x in surv[:12]]
    # --- the owner's known picks (retro only): in the pool or not, and how this policy treats each --------------------------
    picks_file = arg("--owner-picks")
    if picks_file:
        for pk in [x for x in json.load(open(picks_file))["picks"] if x["card"] == sp["card"]]:
            row = next((r for r in rows if r["photo_id"] == pk["photo_id"]), None)
            in_pool = row is not None
            if row is None:                      # not retrieved: score it anyway, so retrieval and scoring failures are reported separately
                ans = F.get(f"{F.API}/observations/{pk['observation_id']}") or {}
                obs = (ans.get("results") or [{}])[0]
                ph = next((x for x in obs.get("photos", []) if x.get("id") == pk["photo_id"]), None)
                if ph:
                    p = {**NEUTRAL_OBS, "photo_id": ph["id"], "observation_id": obs["id"], "urls": {s: F.photo_url(ph, s) for s in F.SIZES}, "orig_long": max((ph.get("original_dimensions") or {}).get("width", 0), (ph.get("original_dimensions") or {}).get("height", 0)) or 2048,
                         "identification_agreements": obs.get("num_identification_agreements") or 0}
                    F.download([p], work, prefer="large")
                    if p.get("file"):
                        row = score_photo(work / p["file"], p, sp["flower_kind"], policy)
            pk_res = {**pk, "in_pool": in_pool}
            if row:
                pk_res.update(rank_info(row, rows, pk["role"]))
            res.setdefault("owner_picks", []).append(pk_res)
    res["pool_scores"] = rows
    (out / "result.json").write_text(json.dumps(res, indent=1, default=str))
    print(json.dumps({k: res[k] for k in ("pool", "survivors", "rejections", "joint_top3")}, indent=1))
    for pk in res.get("owner_picks", []):
        print(pk["picture"], pk["role"], "in_pool", pk["in_pool"], "| survives", pk.get("survives"), "rank", pk.get("rank"), "/", pk.get("of"), pk.get("hard"), pk.get("view"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
