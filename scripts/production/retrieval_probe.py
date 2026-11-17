#!/usr/bin/env python3
"""Where in each iNaturalist ordering do the owner's chosen observations sit? RESEARCH ONLY (reads the public API; changes nothing).

For each species it pages through several (ordering, filter) combinations of CC0-photo observations and records the 1-based position of every
observation the owner chose from. A position beyond what a pool reaches is a RETRIEVAL miss, independent of any scoring.
  retrieval_probe.py --picks evidence/blind-test/owner-picks-62-66.json --species evidence/blind-test/species-62-66.json --out <dir> [--pages 15]
"""
from __future__ import annotations

import json
import pathlib
import sys
import time
import urllib.parse

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F  # noqa: E402

BASE = {"photo_license": "cc0", "photos": "true", "per_page": 200}
COMBOS = [
    ("research | votes", {"quality_grade": "research", "order_by": "votes"}),
    ("research | newest observed", {"quality_grade": "research", "order_by": "observed_on", "order": "desc"}),
    ("research | newest upload", {"quality_grade": "research", "order_by": "created_at", "order": "desc"}),
    ("research | id desc (site default)", {"quality_grade": "research"}),
    ("any grade | id desc (site default)", {}),
    ("any grade | votes", {"order_by": "votes"}),
    ("research | flowering | votes", {"quality_grade": "research", "order_by": "votes", "term_id": 12, "term_value_id": 13}),
    ("research | fruiting | votes", {"quality_grade": "research", "order_by": "votes", "term_id": 12, "term_value_id": 14}),
]


def main() -> int:
    a = sys.argv
    arg = lambda k, d=None: a[a.index(k) + 1] if k in a else d  # noqa: E731
    picks = json.load(open(arg("--picks")))["picks"]
    species = json.load(open(arg("--species")))["species"]
    pages = int(arg("--pages", 15))
    out = pathlib.Path(arg("--out")); out.mkdir(parents=True, exist_ok=True)
    res = {"pages": pages, "per_page": 200, "species": {}}
    for sp in species:
        taxon = F.resolve_taxon(sp["scientific"])
        want = {p["observation_id"]: p for p in picks if p["card"] == sp["card"]}
        info = {"scientific": sp["scientific"], "wanted": len(want), "orderings": {}}
        for name, extra in COMBOS:
            found, total = {}, None
            for page in range(1, pages + 1):
                params = {**BASE, "taxon_id": taxon["id"], "page": page, **extra}
                ans = F.get(f"{F.API}/observations?{urllib.parse.urlencode(params)}") or {}
                total = ans.get("total_results", total)
                rows = ans.get("results", [])
                for i, o in enumerate(rows):
                    if o["id"] in want and o["id"] not in found:
                        found[o["id"]] = (page - 1) * 200 + i + 1
                time.sleep(1.0)
                if len(rows) < 200 or len(found) == len(want):
                    break
            info["orderings"][name] = {"total_matching": total, "positions": {str(k): v for k, v in found.items()}, "found": len(found), "reached": min(total or 0, pages * 200)}
            print(sp["card"], name, "found", len(found), "/", len(want), "positions", sorted(found.values()), "of", total, flush=True)
        res["species"][str(sp["card"])] = info
    (out / "retrieval-probe.json").write_text(json.dumps(res, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
