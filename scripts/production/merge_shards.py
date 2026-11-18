#!/usr/bin/env python3
"""Join the shards of one pipeline_run (same species and policy) into the result.json a single run would have written. RESEARCH ONLY.
  merge_shards.py --dir <dir containing shard_*.json> --out <dir>"""
import json, pathlib, sys, time
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from production import rank as R  # noqa: E402
from production.pipeline_run import rank_info  # noqa: E402

a = sys.argv
d, out = pathlib.Path(a[a.index("--dir") + 1]), pathlib.Path(a[a.index("--out") + 1])
shards = [json.load(open(f)) for f in sorted(d.glob("shard_*.json"))]
rows = [r for s in shards for r in s["rows"]]
meta = shards[0]
assert sum(len(s["rows"]) for s in shards) > 0 and all(s["pool_total"] == meta["pool_total"] for s in shards), "shards come from different pools"
res = {"card": meta["card"], "scientific": meta["scientific"], "policy": meta["policy"], "pool": len(rows), "pool_total": meta["pool_total"], "shards": len(shards),
       "built": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "survivors": {}, "rejections": {}, "top12": {}, "joint_top3": R.joint_top3(rows)}
for r in R.ROLES:
    surv = sorted([x for x in rows if not x["scores"][r]["rejected"] and x["scores"][r]["score"] >= R.MIN_SCORE], key=lambda x: -x["scores"][r]["score"])
    res["survivors"][r] = len(surv)
    cnt = {}
    for x in rows:
        for h in x["scores"][r]["hard"]:
            cnt[h.split(":")[0]] = cnt.get(h.split(":")[0], 0) + 1
    res["rejections"][r] = dict(sorted(cnt.items(), key=lambda kv: -kv[1]))
    res["top12"][r] = [{"photo_id": x["photo_id"], "observation_id": x["observation_id"], "score": x["scores"][r]["score"], "view": x["scores"][r]["view"]} for x in surv[:12]]
for s in shards:
    for o in s.get("owner_rows", []):
        pk = {k: v for k, v in o.items() if k not in ("row", "in_pool")}
        res.setdefault("owner_picks", []).append({**pk, "in_pool": o["in_pool"], **rank_info(o["row"], rows, o["role"])})
res["pool_scores"] = rows
out.mkdir(parents=True, exist_ok=True)
(out / "result.json").write_text(json.dumps(res, indent=1, default=str))
print("merged", len(shards), "shards,", len(rows), "rows of", meta["pool_total"])
