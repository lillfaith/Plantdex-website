#!/usr/bin/env python3
"""Why did the owner's picks miss the v4.x pool? RESEARCH ONLY (public iNaturalist API; changes nothing).
For each card: (1) rebuild the v4 pool WITHOUT the 1200-photo cut and record each source's contribution and where every
owner pick would sit in the uncut list; (2) fetch each missed pick's observation and record the facts the filters look at
(taxon id vs the pool's, quality grade, licence, original size, annotations); (3) find the observation's position in the
votes ordering (up to --depth pages of 200).
  cap_cut_probe.py --request <json {"cards": {"80": {"taxon": "Trifolium repens", "picks": [{"photo_id":..,"observation_id":..}]}}}> --out <dir>"""
from __future__ import annotations

import json
import pathlib
import sys
import time
import urllib.parse

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import fetch_inat_photos as F       # noqa: E402
import search2 as SE                # noqa: E402


def votes_position(taxon_id: int, want: set[int], depth: int) -> dict:
    pos = {}
    n = 0
    for page in range(1, depth + 1):
        params = {"taxon_id": taxon_id, "photo_license": "cc0", "quality_grade": "research", "photos": "true", "per_page": 200, "page": page, "order_by": "votes"}
        rows = (F.get(f"{F.API}/observations?{F.urllib.parse.urlencode(params)}") or {}).get("results", [])
        for o in rows:
            n += 1
            if o["id"] in want:
                pos[o["id"]] = n
        time.sleep(1.0)
        if len(rows) < 200 or len(pos) == len(want):
            break
    return {"positions": pos, "scanned": n}


def main() -> int:
    a = sys.argv
    arg = lambda k, d=None: a[a.index(k) + 1] if k in a else d  # noqa: E731
    req = json.load(open(arg("--request")))
    out = pathlib.Path(arg("--out")); out.mkdir(parents=True, exist_ok=True)
    depth = int(arg("--depth", 25))
    for card, spec in req["cards"].items():
        t = F.resolve_taxon(spec["taxon"]); tid = t["id"]
        # uncut pool with per-source provenance
        seen, pool, per_src = set(), [], {}
        for name, extra, pages in SE.V4_SOURCES:
            n0 = len(pool)
            for page in range(1, pages + 1):
                params = {"taxon_id": tid, "photo_license": "cc0", "quality_grade": "research", "photos": "true", "per_page": 200, "page": page, **extra}
                rows = (F.get(f"{F.API}/observations?{F.urllib.parse.urlencode(params)}") or {}).get("results", [])
                for obs in rows:
                    for p in SE.photos_of(obs, tid, name, min_edge=SE.V4_MIN_EDGE):
                        if p["photo_id"] not in seen:
                            seen.add(p["photo_id"]); pool.append({"photo_id": p["photo_id"], "observation_id": p["observation_id"], "source": name})
                time.sleep(1.0)
                if len(rows) < 200:
                    break
            per_src[name] = len(pool) - n0
        idx = {p["photo_id"]: i + 1 for i, p in enumerate(pool)}
        res = {"card": int(card), "taxon_id": tid, "uncut_pool": len(pool), "cap": 1200, "per_source_new_photos": per_src, "picks": []}
        want = {p["observation_id"] for p in spec["picks"]}
        vp = votes_position(tid, want, depth)
        res["votes_scan"] = {"scanned_observations": vp["scanned"]}
        for pk in spec["picks"]:
            ob = (F.get(f"{F.API}/observations/{pk['observation_id']}") or {}).get("results", [{}])[0]
            ph = next((x for x in ob.get("photos", []) if x.get("id") == pk["photo_id"]), {})
            dims = ph.get("original_dimensions") or {}
            res["picks"].append({**pk, "in_uncut_pool": pk["photo_id"] in idx, "position_in_uncut_pool": idx.get(pk["photo_id"]),
                                 "source": next((p["source"] for p in pool if p["photo_id"] == pk["photo_id"]), None),
                                 "obs_taxon": (ob.get("taxon") or {}).get("name"), "obs_taxon_id": (ob.get("taxon") or {}).get("id"), "taxon_matches_pool": (ob.get("taxon") or {}).get("id") == tid,
                                 "quality_grade": ob.get("quality_grade"), "license": ph.get("license_code"), "long_edge": max(dims.get("width", 0), dims.get("height", 0)),
                                 "n_photos_in_obs": len(ob.get("photos", [])), "votes_position": vp["positions"].get(pk["observation_id"]),
                                 "faves": ob.get("faves_count"), "annotations": [(x.get("controlled_attribute_id"), x.get("controlled_value_id")) for x in ob.get("annotations", [])]})
            print(card, res["picks"][-1], flush=True)
        (out / f"{card}.json").write_text(json.dumps(res, indent=1))
        print(card, "uncut", len(pool), per_src, flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
