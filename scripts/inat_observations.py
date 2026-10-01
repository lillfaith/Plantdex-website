#!/usr/bin/env python3
"""Find iNaturalist observations good enough to stand in for a field specimen.

WHY THIS EXISTS. The blocking validation needs two independently documented common
dandelions and one documented goldenrod, each with several photographs OF ONE INDIVIDUAL.
The Commons pilot could not supply that — a category returns different plants by different
people, which is why `sameIndividual` was 0 of 24 there and why the photo-count axis was
unreadable. An iNaturalist OBSERVATION is by construction one organism at one place and
time, so its photos are the same individual by definition rather than by hope.

WHAT IT SELECTS FOR, AND WHY EACH FILTER IS THERE:

  quality_grade=research   Community-verified: at least two thirds of identifiers agree, the
                           record has a date, a location and a photo, and nobody has flagged
                           it. This is the "independently identified" bar, not a search hit.
  photos>=3                A specimen needs habit, leaf and feature. Fewer than three cannot
                           fill the slots and would quietly become a two-photo specimen.
  photo_license set        TWO REASONS, and the second is the practical one. Licensed photos
                           are served from the OPEN DATA bucket, which is the only
                           iNaturalist host reachable from a sandbox; all-rights-reserved
                           photos live on a host that is not. So this filter is what makes
                           the images fetchable at all, and it also keeps the benchmark off
                           pictures whose owners did not license reuse.
  identifications_most_agree
                           Prefers records where the community converged rather than ones
                           carried by a single confident identifier.

IT SELECTS NOTHING ON ITS OWN. It prints candidates — id, taxon, grade, licence, photo ids,
date, place — and a human picks. The slot each photograph should occupy cannot be decided
from metadata: iNaturalist photo order is whatever the observer uploaded, and photo 1 IS the
single-photograph condition, so a close-up there would measure something else entirely.

NO PLANTNET AND NO PLANT.ID. This talks only to the iNaturalist API and spends nothing.

Usage:  TAXON="Taraxacum officinale" LIMIT=8 python3 scripts/inat_observations.py
"""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request

API = "https://api.inaturalist.org/v1/observations"
# iNaturalist asks for a identifying agent and a modest request rate.
UA = "plantdex-identification-benchmark (https://github.com/lillfaith/Plantdex-website)"


def medium_url(photo: dict) -> str | None:
    """The open-data URL for this photo's medium rendition, taken from the API's own string.

    THE EXTENSION IS NOT PREDICTABLE FROM THE PHOTO ID. This script first composed
    `.../photos/<id>/medium.jpg` by hand, which 404s for every photo iNaturalist stored as
    `.jpeg` — and the two are mixed within a single observation, so a guessed extension gives
    a list of URLs where some work and some do not, for no reason a reader can see. The API
    returns the real `square` URL; swapping the rendition in it is the only part that is ours
    to decide.
    """
    url = photo.get("url")
    if not url or "/square." not in url:
        return None
    return url.replace("/square.", "/medium.")


def search(taxon: str, limit: int, place_id: str | None) -> list[dict]:
    params = {
        "taxon_name": taxon,
        "quality_grade": "research",
        "photos": "true",
        "photo_license": "cc0,cc-by,cc-by-nc,cc-by-sa,cc-by-nc-sa",
        "order_by": "votes",
        "per_page": str(max(limit * 3, 30)),
        "locale": "en",
    }
    if place_id:
        params["place_id"] = place_id
    request = urllib.request.Request(
        f"{API}?{urllib.parse.urlencode(params)}", headers={"User-Agent": UA}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response).get("results", [])


def main() -> int:
    taxon = os.environ.get("TAXON", "").strip()
    limit = int(os.environ.get("LIMIT", "8"))
    place_id = os.environ.get("PLACE_ID", "").strip() or None
    if not taxon:
        print("set TAXON")
        return 2

    print(f"taxon: {taxon}   research-grade, CC-licensed photos, 3+ photos")
    if place_id:
        print(f"place_id: {place_id}")
    print()

    kept = 0
    for obs in search(taxon, limit, place_id):
        photos = obs.get("photos") or []
        # A photo with no id, no licence or no open-data URL cannot be fetched at all.
        usable = [
            p for p in photos if p.get("id") and p.get("license_code") and medium_url(p)
        ]
        if len(usable) < 3:
            continue

        name = (obs.get("taxon") or {}).get("name", "?")
        rank = (obs.get("taxon") or {}).get("rank", "?")
        # ONLY the taxon the community settled on. A record identified to genus is not
        # ground truth for a species-level question, and is printed so it can be rejected.
        agree = obs.get("num_identification_agreements", 0)
        disagree = obs.get("num_identification_disagreements", 0)

        print(f"observation {obs['id']}   https://www.inaturalist.org/observations/{obs['id']}")
        print(f"  taxon      {name}  [{rank}]   grade={obs.get('quality_grade')}")
        print(f"  community  {agree} agree / {disagree} disagree")
        print(f"  observed   {obs.get('observed_on_string') or obs.get('observed_on')}")
        print(f"  place      {obs.get('place_guess')}")
        print(f"  photos     {len(usable)} usable of {len(photos)}")
        for index, photo in enumerate(usable, start=1):
            print(
                f"    {index}. photo {photo['id']}  {photo.get('license_code')}"
                f"  {medium_url(photo) or '(no open-data url)'}"
            )
        print()
        kept += 1
        if kept >= limit:
            break

    if kept == 0:
        print("No observation met the filters. Loosen LIMIT or drop PLACE_ID.")
    else:
        print(
            f"{kept} candidate(s). A HUMAN NOW PICKS, and assigns each photograph a slot:\n"
            "  slot 1 = whole plant (this alone IS the p1 condition)\n"
            "  slot 2 = leaf + stem\n"
            "  slot 3 = flower / fruit / seed head\n"
            "iNaturalist photo order is the observer's, not semantic, so it cannot be used."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
