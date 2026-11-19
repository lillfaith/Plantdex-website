#!/usr/bin/env python3
"""Recall of the owner's picks versus retrieval depth (and what each depth costs). RESEARCH ONLY: public iNaturalist API, no screening.
For each species: the votes-ordered CC0 research observations are walked page by page (200 each, up to --max-pages); every CC0 photograph >= 800 px of the
right taxon is counted as it would be by search2.build_pool_v4. The other v4 sources (flowering, fruiting, budding, recent) are added exactly as v4 does. For each
depth (pages of votes-deep) the report gives the deduplicated pool size and how many of the owner's picks it contains.
  depth_probe.py --request <json {"cards": {"80": {"taxon": "...", "picks": [{"photo_id":..,"observation_id":..,"role":..}]}}}> --out <dir>"""
from __future__ import annotations

import json
import pathlib
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import fetch_inat_photos as F       # noqa: E402
import search2 as SE                # noqa: E402

DEPTHS = (2, 3, 5, 8, 10, 15, 25)


def page(tid, extra, n):
    params = {"taxon_id": tid, "photo_license": "cc0", "quality_grade": "research", "photos": "true", "per_page": 200, "page": n, **extra}
    r = F.get(f"{F.API}/observations?{F.urllib.parse.urlencode(params)}") or {}
    time.sleep(1.0)
    return r.get("results", []), r.get("total_results")


def main() -> int:
    a = sys.argv
    arg = lambda k, d=None: a[a.index(k) + 1] if k in a else d  # noqa: E731
    req = json.load(open(arg("--request")))
    out = pathlib.Path(arg("--out")); out.mkdir(parents=True, exist_ok=True)
    maxp = int(arg("--max-pages", 25))
    for card, spec in req["cards"].items():
        tid = F.resolve_taxon(spec["taxon"])["id"]
        # other sources, exactly as build_pool_v4 (single page each)
        others, total = [], None
        for name, extra, pages in SE.V4_SOURCES:
            if name == "votes-deep":
                continue
            for n in range(1, pages + 1):
                rows, _ = page(tid, extra, n)
                for o in rows:
                    others += [(p["photo_id"], p["observation_id"]) for p in SE.photos_of(o, tid, name, min_edge=SE.V4_MIN_EDGE)]
                if len(rows) < 200:
                    break
        by_page, obs_pos = [], {}
        k = 0
        for n in range(1, maxp + 1):
            rows, total = page(tid, {"order_by": "votes"}, n)
            ph = []
            for o in rows:
                k += 1
                obs_pos[o["id"]] = k
                ph += [(p["photo_id"], p["observation_id"]) for p in SE.photos_of(o, tid, "votes-deep", min_edge=SE.V4_MIN_EDGE)]
            by_page.append(ph)
            if len(rows) < 200:
                break
        picks = spec["picks"]
        res = {"card": int(card), "taxon": spec["taxon"], "total_cc0_research_obs": total, "picks": len(picks),
               "pick_votes_position": {str(p["photo_id"]): obs_pos.get(p["observation_id"]) for p in picks}, "depths": []}
        for d in DEPTHS:
            if d > len(by_page) and d != DEPTHS[-1] and len(by_page) < DEPTHS[-1] and d > len(by_page) + 0:
                pass
            s = {pid for pg in by_page[:d] for pid, _ in pg} | {pid for pid, _ in others}
            got = [p for p in picks if p["photo_id"] in s]
            res["depths"].append({"pages": d, "observations": min(d * 200, k), "pool_photos": len(s), "picks_in_pool": len(got), "missed": [p["photo_id"] for p in picks if p["photo_id"] not in s]})
        (out / f"{card}.json").write_text(json.dumps(res, indent=1))
        print(card, spec["taxon"], "total", total, [(x["pages"], x["pool_photos"], x["picks_in_pool"]) for x in res["depths"]], flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
