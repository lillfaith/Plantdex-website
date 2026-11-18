#!/usr/bin/env python3
"""Re-score ONLY the photographs a v4 run rejected for a role floor, under v4.1 (floors are flags), and rebuild the result.

A floor flag changes no score, so every row without a floor rejection is identical under v4 and v4.1 and is kept. RESEARCH ONLY.
  rescore_floors.py --result <v4 result.json> --kind white|yellow --out <dir> [--owner-picks <json>]
"""
from __future__ import annotations

import json
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F                              # noqa: E402
from production import rank as R                           # noqa: E402
from production.pipeline_run import score_photo, rank_info # noqa: E402


def main() -> int:
    a = sys.argv
    arg = lambda k, d=None: a[a.index(k) + 1] if k in a else d  # noqa: E731
    res = json.load(open(arg("--result")))
    kind = arg("--kind", "white")
    rows = res["pool_scores"]
    hit = [r for r in rows if any(h.startswith("role_floor") for ro in R.ROLES for h in r["scores"][ro]["hard"])]
    print(f"{len(hit)} of {len(rows)} rows carry a floor rejection and are re-scored under v4.1", flush=True)
    oids = sorted({r["observation_id"] for r in hit})
    obs = {}
    for i in range(0, len(oids), 100):
        for o in (F.get(f"{F.API}/observations/{','.join(map(str, oids[i:i + 100]))}?per_page=200") or {}).get("results", []):
            obs[o["id"]] = o
    work = pathlib.Path("_work_rescore")
    done = 0
    for r in hit:
        o = obs.get(r["observation_id"])
        ph = next((x for x in (o or {}).get("photos", []) if x["id"] == r["photo_id"]), None)
        if not ph:
            print("  missing", r["photo_id"]); continue
        dims = ph.get("original_dimensions") or {}
        p = {"identification_agreements": o.get("num_identification_agreements"), "identification_disagreements": o.get("num_identification_disagreements"),
             "flowering_annotation": any((x.get("controlled_attribute") or {}).get("label") == "Plant Phenology" and (x.get("controlled_value") or {}).get("label") == "Flowering" for x in o.get("annotations") or []),
             "community_taxon_id": o.get("community_taxon_id"), "taxon_id": (o.get("taxon") or {}).get("id"),
             "photo_id": ph["id"], "observation_id": o["id"], "urls": {s: F.photo_url(ph, s) for s in F.SIZES},
             "orig_long": max(dims.get("width", 0), dims.get("height", 0)) or 2048}
        F.download([p], work, prefer="large")
        if not p.get("file"):
            continue
        try:
            r["scores"] = score_photo(work / p["file"], p, kind, "v4.1")["scores"]
            done += 1
        except Exception as e:  # noqa: BLE001
            print("  error", r["photo_id"], str(e)[:80])
        if done % 25 == 0:
            print(f"  {done}/{len(hit)}", flush=True)
    out = {**{k: v for k, v in res.items() if k not in ("pool_scores", "owner_picks")}, "policy": "v4.1", "rescored_rows": done, "built": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
           "survivors": {}, "rejections": {}, "top12": {}, "joint_top3": R.joint_top3(rows)}
    for ro in R.ROLES:
        surv = sorted([x for x in rows if not x["scores"][ro]["rejected"] and x["scores"][ro]["score"] >= R.MIN_SCORE], key=lambda x: -x["scores"][ro]["score"])
        out["survivors"][ro] = len(surv)
        cnt = {}
        for x in rows:
            for h in x["scores"][ro]["hard"]:
                cnt[h.split(":")[0]] = cnt.get(h.split(":")[0], 0) + 1
        out["rejections"][ro] = dict(sorted(cnt.items(), key=lambda kv: -kv[1]))
        out["top12"][ro] = [{"photo_id": x["photo_id"], "observation_id": x["observation_id"], "score": x["scores"][ro]["score"], "view": x["scores"][ro]["view"]} for x in surv[:12]]
    by = {r["photo_id"]: r for r in rows}
    if res.get("owner_picks"):
        out["owner_picks"] = []
        for pk in res["owner_picks"]:
            row = by.get(pk["photo_id"])
            base = {k: pk[k] for k in ("card", "role", "picture", "photo_id", "observation_id")}
            out["owner_picks"].append({**base, "in_pool": row is not None, **(rank_info(row, rows, pk["role"]) if row else {})})
    out["pool_scores"] = rows
    d = pathlib.Path(arg("--out")); d.mkdir(parents=True, exist_ok=True)
    (d / "result.json").write_text(json.dumps(out, indent=1, default=str))
    print("rescored", done, "rows")
    return 0


if __name__ == "__main__":
    sys.exit(main())
