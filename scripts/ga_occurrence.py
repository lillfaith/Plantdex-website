#!/usr/bin/env python3
"""Ask GBIF what is actually recorded in Georgia, for each species in the printed deck.

WHAT THIS IS FOR. The quest board needs species a player in Georgia can realistically meet.
Plantdex holds no occurrence data at all — `REGIONAL_STATUS` in `src/lib/invasive-status.ts`
records INVASIVE LISTINGS from the Georgia Invasive Species Council, which is a different
fact and must never be used as a substitute: a species can be listed and locally scarce, or
abundant and unlisted.

────────────────────────────────────────────────────────────────────────────────
IT DECIDES NOTHING AND WRITES NO DATABASE.

It prints counts and a PROPOSED classification, and a human reads it. The thresholds below
are a stated rule applied uniformly, not a judgement about any particular plant — the whole
point of writing them down is that somebody can disagree with the rule rather than with 36
separate opinions.

api.gbif.org is blocked from the sandbox this repo is edited in (measured: `CONNECT tunnel
failed, response 403`), so this runs in GitHub Actions like `resolve_taxa.py` and
`inat_observations.py`. It spends nothing, reads no secret and contacts no identification
provider.
────────────────────────────────────────────────────────────────────────────────

WHY A HERBARIUM SPECIMEN COUNTS FOR MORE THAN AN OBSERVATION. A preserved specimen is a
physical sheet in a collection, determined by a botanist and re-checkable. A human
observation is usually a photograph, often an app record, and its identification may never
have been reviewed. Both are evidence; they are not the same weight, so they are counted
separately and the classification needs one of the two to be substantial.

WHY ABSENCE IS NOT ABSENCE. Observation density tracks where people with phones go, not
where plants grow. Zero records in GBIF is therefore `insufficient` — never `unlikely`,
which is a positive claim that would need an authority saying the species does not occur
here. `catalog_species_regions` refuses `unlikely` without a source for that reason.

    python3 scripts/ga_occurrence.py                 # the whole printed deck
    python3 scripts/ga_occurrence.py --limit 5       # a batch
    python3 scripts/ga_occurrence.py --self-test     # no network
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DECK = REPO / "src" / "data" / "herbs.json"

MATCH = "https://api.gbif.org/v1/species/match"
OCCURRENCE = "https://api.gbif.org/v1/occurrence/search"
GADM = "https://api.gbif.org/v1/geocode/gadm/USA/subdivisions"
UA = "plantdex-georgia-occurrence (https://github.com/lillfaith/Plantdex-website)"

# ── The classification rule, stated once and applied uniformly ────────────────
#
# `confirmed` wants evidence that is hard to produce by accident. Either a real herbarium
# presence (several determined sheets), or an observation record so dense that a systematic
# misidentification is implausible.
MIN_SPECIMENS_FOR_CONFIRMED = 5
MIN_OBSERVATIONS_FOR_CONFIRMED = 100
# `likely` is "something is recorded here, but not enough of it to be sure".
MIN_RECORDS_FOR_LIKELY = 1

SEASON_OF_MONTH = {
    12: "winter", 1: "winter", 2: "winter",
    3: "spring", 4: "spring", 5: "spring",
    6: "summer", 7: "summer", 8: "summer",
    9: "autumn", 10: "autumn", 11: "autumn",
}
# A season counts as supported when it holds a real share of the dated records. Below this
# a handful of stray months would "support" every season for every plant.
SEASON_SHARE = 0.15


def get(url: str, params: dict) -> dict:
    full = f"{url}?{urllib.parse.urlencode(params, doseq=True)}"
    request = urllib.request.Request(full, headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            if attempt == 2:
                raise RuntimeError(f"GBIF unreachable: {error}") from error
            time.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


def georgia_gid() -> str:
    """Resolve Georgia's GADM id rather than hard-coding `USA.11_1`.

    A hard-coded gid is a silent wrong answer if GADM renumbers — it would return counts for
    a different state and nothing would look wrong. Resolving by name fails loudly instead.
    """
    data = get(GADM, {})
    rows = data if isinstance(data, list) else data.get("results", [])
    for row in rows:
        if str(row.get("name", "")).strip().lower() == "georgia":
            return str(row["id"])
    raise RuntimeError("Georgia not found in GADM's USA subdivisions")


def deck_species() -> list[tuple[str, str, str]]:
    """(herb id, common name, binomial) for every printed card that names a species."""
    data = json.loads(DECK.read_text())
    herbs = data["herbs"] if isinstance(data, dict) else data
    out = []
    for herb in herbs:
        name = herb.get("scientificName", "")
        # `Genus spp.` cards name no species and cannot have an occurrence record.
        if " spp." in name or not name:
            continue
        out.append((herb["id"], herb["commonName"], name))
    return out


def classify(specimens: int, observations: int) -> tuple[str, str]:
    total = specimens + observations
    if specimens >= MIN_SPECIMENS_FOR_CONFIRMED:
        return "confirmed", f"{specimens} herbarium specimens"
    if observations >= MIN_OBSERVATIONS_FOR_CONFIRMED:
        return "confirmed", f"{observations} observations"
    if total >= MIN_RECORDS_FOR_LIKELY:
        return "likely", f"only {total} record(s)"
    # NEVER `unlikely`. Zero records is a statement about recording effort.
    return "insufficient", "no GBIF records in Georgia"


def seasons_from(months: dict[int, int]) -> tuple[list[str], int]:
    dated = sum(months.values())
    if dated == 0:
        return [], 0
    by_season: dict[str, int] = {}
    for month, count in months.items():
        season = SEASON_OF_MONTH.get(month)
        if season:
            by_season[season] = by_season.get(season, 0) + count
    supported = [s for s, c in by_season.items() if c / dated >= SEASON_SHARE]
    order = ["spring", "summer", "autumn", "winter"]
    return sorted(supported, key=order.index), dated


def survey(gid: str, binomial: str) -> dict:
    match = get(MATCH, {"name": binomial, "strict": "false"})
    if not match.get("usageKey") or match.get("matchType") in (None, "NONE"):
        return {"error": "no GBIF backbone match", "accepted": None}

    key = match["usageKey"]
    accepted = match.get("species") or match.get("canonicalName")

    def count(**extra) -> dict:
        return get(OCCURRENCE, {"taxonKey": key, "gadmGid": gid, "limit": 0, **extra})

    specimens = count(basisOfRecord="PRESERVED_SPECIMEN")["count"]
    observations = count(basisOfRecord="HUMAN_OBSERVATION")["count"]
    faceted = count(facet="month", facetLimit=12)
    months: dict[int, int] = {}
    for facet in faceted.get("facets", []):
        if facet.get("field") == "MONTH":
            for item in facet.get("counts", []):
                try:
                    months[int(item["name"])] = int(item["count"])
                except (KeyError, ValueError):
                    continue

    occurrence, why = classify(specimens, observations)
    seasons, dated = seasons_from(months)
    return {
        "accepted": accepted,
        "gbif_id": str(key),
        "taxonomy": str(match.get("status", "")).lower(),
        "specimens": specimens,
        "observations": observations,
        "total": faceted.get("count", specimens + observations),
        "occurrence": occurrence,
        "why": why,
        "seasons": seasons,
        "dated_records": dated,
    }


def self_test() -> int:
    checks = []
    checks.append((classify(9, 0)[0] == "confirmed", "9 specimens -> confirmed"))
    checks.append((classify(0, 250)[0] == "confirmed", "250 observations -> confirmed"))
    checks.append((classify(1, 3)[0] == "likely", "a few records -> likely"))
    checks.append((classify(0, 0)[0] == "insufficient", "no records -> insufficient"))
    checks.append((classify(0, 0)[0] != "unlikely", "no records is NEVER unlikely"))
    s, dated = seasons_from({5: 80, 6: 60, 1: 2})
    checks.append((s == ["spring", "summer"] and dated == 142, f"seasons from months -> {s}"))
    checks.append((seasons_from({})[0] == [], "no dated records -> no seasons claimed"))
    names = [n for _, _, n in deck_species()]
    checks.append((len(names) == 36, f"{len(names)} binomial species in the deck (expect 36)"))
    checks.append((not any(" spp." in n for n in names), "genus cards are excluded"))
    bad = sum(1 for ok, _ in checks if not ok)
    for ok, label in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {label}")
    print("\nALL SELF-TESTS PASSED" if not bad else f"\n{bad} FAILURE(S)")
    return 1 if bad else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--out", default="build/georgia-occurrence.json")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()

    gid = georgia_gid()
    print(f"Georgia GADM id: {gid}\n")
    species = deck_species()
    if args.limit:
        species = species[: args.limit]

    results = {}
    print(f"{'card':24} {'accepted name':30} {'spec':>5} {'obs':>7} {'class':12} seasons")
    print("-" * 100)
    for herb_id, common, binomial in species:
        try:
            row = survey(gid, binomial)
        except RuntimeError as error:
            row = {"error": str(error)}
        results[herb_id] = {"common_name": common, "printed_name": binomial, **row}
        if row.get("error"):
            print(f"{common[:24]:24} {'':30} {'':>5} {'':>7} ERROR        {row['error'][:30]}")
        else:
            print(f"{common[:24]:24} {str(row['accepted'])[:30]:30} {row['specimens']:>5} "
                  f"{row['observations']:>7} {row['occurrence']:12} {','.join(row['seasons'])}")
        time.sleep(0.3)   # Courtesy to a free, keyless API.

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({
        "region": "us-ga", "gadm_gid": gid,
        "source": "GBIF occurrence search, api.gbif.org/v1/occurrence/search",
        "generated_on": time.strftime("%Y-%m-%d"),
        "rule": {
            "confirmed": f">={MIN_SPECIMENS_FOR_CONFIRMED} preserved specimens "
                         f"OR >={MIN_OBSERVATIONS_FOR_CONFIRMED} human observations",
            "likely": f">={MIN_RECORDS_FOR_LIKELY} record(s) below those thresholds",
            "insufficient": "no records — NOT evidence of absence",
            "season_share": SEASON_SHARE,
        },
        "species": results,
    }, indent=1, sort_keys=True))
    print(f"\nwrote {out}")
    print("THIS DECIDES NOTHING. A human reads it and sets eligibility and occurrence.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
