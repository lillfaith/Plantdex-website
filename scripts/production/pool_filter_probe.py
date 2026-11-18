#!/usr/bin/env python3
"""Why were 9 of the owner's 19 photographs never in the pool although every observation is reachable? RESEARCH ONLY.
Fetches each owner observation the way the pool builder does (search endpoint) and applies the pool builder's own photos_of filter, printing each decision."""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F  # noqa: E402
from production import search2 as SE  # noqa: E402

picks = json.load(open(sys.argv[1]))["picks"]
tax = {62: "Eriogonum fasciculatum", 63: "Parthenium integrifolium", 64: "Pseudognaphalium obtusifolium", 65: "Nelumbo lutea", 66: "Erigeron annuus"}
rows = []
for card, name in tax.items():
    tid = F.resolve_taxon(name)["id"]
    mine = [p for p in picks if p["card"] == card]
    ids = ",".join(str(o) for o in sorted({p["observation_id"] for p in mine}))
    ans = F.get(f"{F.API}/observations?id={ids}&per_page=200&photo_license=cc0&taxon_id={tid}") or {}
    got = {o["id"]: o for o in ans.get("results", [])}
    for p in mine:
        o = got.get(p["observation_id"])
        if o is None:
            r = {**p, "in_search_result": False}
        else:
            ph = next((x for x in o.get("photos", []) if x["id"] == p["photo_id"]), None)
            kept = [x["photo_id"] for x in SE.photos_of(o, tid, "probe")]
            r = {**p, "in_search_result": True, "photo_in_result": ph is not None, "photo_license": (ph or {}).get("license_code"),
                 "original_dimensions_in_search_result": (ph or {}).get("original_dimensions"), "kept_by_photos_of": p["photo_id"] in kept,
                 "obs_taxon_id": (o.get("taxon") or {}).get("id"), "taxon_id": tid}
        rows.append(r)
        print(card, p["role"], p["photo_id"], {k: v for k, v in r.items() if k not in ("card", "role", "picture", "photo_id", "observation_id")})
pathlib.Path("out").mkdir(exist_ok=True)
json.dump(rows, open("out/pool-filter-probe.json", "w"), indent=1)
