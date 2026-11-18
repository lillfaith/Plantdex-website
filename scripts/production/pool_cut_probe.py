#!/usr/bin/env python3
"""Replay the v3 pool builder and report, for each owner photograph, where it sat in every query list and what happened to it in the interleave. RESEARCH ONLY."""
import json, pathlib, sys, time, urllib.parse
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F  # noqa: E402
from production import search2 as SE  # noqa: E402

picks = json.load(open(sys.argv[1]))["picks"]
tax = {62: "Eriogonum fasciculatum", 63: "Parthenium integrifolium", 64: "Pseudognaphalium obtusifolium", 65: "Nelumbo lutea", 66: "Erigeron annuus"}
LIMIT = 320
out = []
for card, name in tax.items():
    tid = F.resolve_taxon(name)["id"]
    want = {p["photo_id"]: p for p in picks if p["card"] == card}
    queries = SE.QUERIES + SE.QUERIES_V3_EXTRA
    lists = {}
    for qn, extra in queries:
        got = []
        for page in range(1, 7):
            params = {"taxon_id": tid, "photo_license": "cc0", "quality_grade": "research", "photos": "true", "per_page": 200, "page": page, **extra}
            ans = F.get(f"{F.API}/observations?{urllib.parse.urlencode(params)}") or {}
            rows = ans.get("results", [])
            for o in rows:
                got.extend(SE.photos_of(o, tid, qn))
            time.sleep(1.0)
            if len(rows) < 200:
                break
        lists[qn] = got
        print(card, qn, "photos", len(got), flush=True)
    seen, per_obs, pool = set(), {}, []
    verdict = {}
    longest = max(len(q) for q in lists.values())
    for i in range(longest):
        for qn in lists:
            q = lists[qn]
            if i < len(q):
                ph = q[i]
                if ph["photo_id"] in seen:
                    continue
                if per_obs.get(ph["observation_id"], 0) >= 2:
                    if ph["photo_id"] in want:
                        verdict.setdefault(ph["photo_id"], "dropped: observation already had 2 photos in the pool")
                    continue
                seen.add(ph["photo_id"]); per_obs[ph["observation_id"]] = per_obs.get(ph["observation_id"], 0) + 1
                pool.append(ph)
    for pid, pk in want.items():
        idx = next((i for i, x in enumerate(pool) if x["photo_id"] == pid), None)
        in_q = {qn: next((i + 1 for i, x in enumerate(l) if x["photo_id"] == pid), None) for qn, l in lists.items()}
        r = {"card": card, "role": pk["role"], "photo_id": pid, "interleaved_index": idx, "kept_in_first_320": idx is not None and idx < LIMIT,
             "position_in_each_query_list": in_q, "note": verdict.get(pid)}
        out.append(r); print(r, flush=True)
    print(card, "interleaved pool size", len(pool), "unique observations", len(per_obs))
pathlib.Path("out").mkdir(exist_ok=True)
json.dump(out, open("out/pool-cut-probe.json", "w"), indent=1)
