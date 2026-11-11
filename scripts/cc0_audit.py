#!/usr/bin/env python3
"""How many CC0 photographs does iNaturalist actually hold per species?

The Chamomile run returned EIGHT usable photographs where the scorer wants 20-40, and the
question that follows is whether chamomile is unusual or whether the whole CC0 pool is thin.
This counts, per species, at each gate the pipeline applies, so the loss is attributable:

    observations -> CC0 at PHOTO level -> research grade -> original >= 900px

It downloads nothing. Counting is cheap; 2,000 species of image downloads is not, and the
decision this informs -- whether CC0 alone can supply the programme -- needs only counts.

    python3 scripts/cc0_audit.py --species-file evidence/audit-species.txt
    python3 scripts/cc0_audit.py --self-test
"""
from __future__ import annotations

import argparse, json, pathlib, sys, time, urllib.parse

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from fetch_inat_photos import API, get, resolve_taxon          # noqa: E402

MIN_EDGE = 900


def audit(name: str) -> dict:
    taxon = resolve_taxon(name)
    if taxon is None:
        return {"species": name, "error": "no exactly-matching active species taxon"}
    tid = taxon["id"]
    out = {"species": name, "taxon_id": tid, "accepted": taxon["name"]}

    def count(**extra) -> int:
        params = {"taxon_id": tid, "photos": "true", "per_page": 0, **extra}
        a = get(f"{API}/observations?{urllib.parse.urlencode(params)}") or {}
        return int(a.get("total_results") or 0)

    out["observations_with_photos"] = count()
    out["research_grade"] = count(quality_grade="research")
    out["cc0_photos"] = count(photo_license="cc0")
    out["cc0_research"] = count(photo_license="cc0", quality_grade="research")

    # The resolution gate needs the actual photos, so sample one page rather than all.
    params = {"taxon_id": tid, "photo_license": "cc0", "quality_grade": "research",
              "photos": "true", "order_by": "votes", "per_page": 30}
    a = get(f"{API}/observations?{urllib.parse.urlencode(params)}") or {}
    usable = 0
    sampled = 0
    for obs in a.get("results", []):
        if (obs.get("taxon") or {}).get("id") != tid:
            continue
        for ph in obs.get("photos", []):
            if (ph.get("license_code") or "").lower() != "cc0":
                continue
            sampled += 1
            d = ph.get("original_dimensions") or {}
            if max(d.get("width", 0), d.get("height", 0)) >= MIN_EDGE:
                usable += 1
    out["sampled_cc0_photos"] = sampled
    out["sampled_pass_resolution"] = usable
    time.sleep(0.7)
    return out


def self_test() -> int:
    checks = [(MIN_EDGE == 900, "the resolution gate matches the fetcher's"),
              (callable(resolve_taxon), "the fetcher's taxon resolver is reusable")]
    ok = True
    for good, label in checks:
        print(("PASS  " if good else "FAIL  ") + label)
        ok &= bool(good)
    print("\n" + ("ALL SELF-TESTS PASSED" if ok else "SELF-TESTS FAILED"))
    return 0 if ok else 1


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--species-file", default="evidence/audit-species.txt")
    ap.add_argument("--out", default="evidence/cc0-audit.json")
    ap.add_argument("--self-test", action="store_true")
    a = ap.parse_args()
    if a.self_test:
        return self_test()
    root = pathlib.Path(__file__).resolve().parent.parent
    names = [ln.strip() for ln in (root / a.species_file).read_text().splitlines()
             if ln.strip() and not ln.startswith("#")]
    rows = []
    print(f"{'species':30}{'obs':>8}{'research':>10}{'cc0':>8}{'cc0+rg':>8}"
          f"{'>=900px':>9}")
    for n in names:
        r = audit(n)
        rows.append(r)
        if "error" in r:
            print(f"{n:30}  {r['error']}")
            continue
        print(f"{n:30}{r['observations_with_photos']:>8}{r['research_grade']:>10}"
              f"{r['cc0_photos']:>8}{r['cc0_research']:>8}"
              f"{r['sampled_pass_resolution']:>5}/{r['sampled_cc0_photos']}")
    ok = [r for r in rows if "error" not in r]
    if ok:
        vals = sorted(r["cc0_research"] for r in ok)
        print(f"\ncc0 + research grade, across {len(ok)} species: "
              f"min {vals[0]}  median {vals[len(vals)//2]}  max {vals[-1]}")
        thin = [r["species"] for r in ok if r["cc0_research"] < 20]
        print(f"{len(thin)}/{len(ok)} species have fewer than 20 CC0 research-grade "
              f"observations")
    (root / a.out).write_text(json.dumps({"min_edge": MIN_EDGE, "rows": rows}, indent=2) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
