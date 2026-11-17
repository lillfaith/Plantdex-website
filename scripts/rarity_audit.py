#!/usr/bin/env python3
"""Read-only rarity audit: how many research-grade iNaturalist observations does each card's species have?

PRIVATE DEVELOPMENT TOOL. It changes no card. It exists so a tier can be judged against a number instead of an impression, and so the
new cards can be compared with the printed deck's own tiers (the calibration set). api.inaturalist.org is blocked from the dev sandbox,
so this runs in GitHub Actions (workflow `rarity-audit`).

    python3 scripts/rarity_audit.py --request evidence/rarity/request.json --out evidence/rarity/result.json

Counts are OBSERVATION counts, which track how many people photograph a plant, not how many plants exist. They are a proxy for how
often a player is likely to meet and record a species, which is what an encounter rate is - and a proxy that a striking plant
(passion flower) beats a modest one. It is a signal to read, never an authority.
"""
import argparse, json, pathlib, sys, time, urllib.parse
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import fetch_inat_photos as F  # noqa: E402

PLACES = {"US": 1, "GA": 21}


def taxon(name: str):
    if name.endswith(" spp."):
        genus = name.split()[0]
        ans = F.get(f"{F.API}/taxa?" + urllib.parse.urlencode({"q": genus, "rank": "genus", "is_active": "true", "per_page": 10})) or {}
        for r in ans.get("results", []):
            if r.get("name", "").lower() == genus.lower():
                return r
        return None
    return F.resolve_taxon(name)


def count(tid: int, place: int | None) -> int | None:
    q = {"taxon_id": tid, "quality_grade": "research", "per_page": 0}
    if place:
        q["place_id"] = place
    ans = F.get(f"{F.API}/observations?" + urllib.parse.urlencode(q))
    return None if ans is None else ans.get("total_results")


def main() -> int:
    ap = argparse.ArgumentParser(); ap.add_argument("--request", required=True); ap.add_argument("--out", required=True)
    a = ap.parse_args()
    req = json.loads(pathlib.Path(a.request).read_text())
    out = []
    for row in req["cards"]:
        t = taxon(row["scientific"])
        rec = {**row, "taxon_id": t and t["id"], "taxon_name": t and t["name"], "rank": t and t.get("rank")}
        if t:
            rec["obs_world"] = count(t["id"], None)
            for k, pid in PLACES.items():
                rec[f"obs_{k.lower()}"] = count(t["id"], pid)
                time.sleep(0.3)
        else:
            rec["note"] = "no exact taxon match"
        out.append(rec)
        print(row["card"], row["scientific"], rec.get("obs_us"), rec.get("obs_ga"), flush=True)
    pathlib.Path(a.out).write_text(json.dumps({"counts_are": "research-grade iNaturalist observations; a proxy for encounter, not abundance", "rows": out}, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
