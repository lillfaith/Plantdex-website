#!/usr/bin/env python3
"""Find CC0 botanical photographs on iNaturalist, record their provenance, download them.

────────────────────────────────────────────────────────────────────────────────
A PHOTOGRAPH IS SOMEBODY'S WORK, AND THE LICENCE TRAVELS WITH IT OR IT IS NOT USED.

Every photo this writes carries the observation id, the photographer's name, the licence
code and the original URL. `catalog_species` already refuses an image without them --
`an_image_carries_its_licence` -- and this produces the record that constraint wants.

CC0 ONLY, BY DEFAULT AND ON PURPOSE. CC-BY and CC-BY-NC are perfectly usable with
attribution, and mixing them into the same pipeline means one day shipping a card whose
attribution was dropped by a layout change. `--licenses` can widen it deliberately; the
default cannot drift.

ONLY RESEARCH-GRADE OBSERVATIONS. A casual observation is one person's guess at what they
photographed. Research grade means the community agreed on the identification, which is the
closest thing available to "this really is that plant" -- and a card built on a
misidentified photograph teaches the wrong species to somebody standing in a field.

api.inaturalist.org is refused by the sandbox proxy like every other source host, so this
runs in Actions.

    python3 scripts/fetch_inat_photos.py "Matricaria chamomilla" --out evidence/photos
    python3 scripts/fetch_inat_photos.py --self-test
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

API = "https://api.inaturalist.org/v1"
UA = "plantdex-card-pipeline (https://github.com/lillfaith/Plantdex-website)"

# The only licence that needs no attribution line. Everything else is opt-in.
DEFAULT_LICENSES = ("cc0",)

LICENSE_LABEL = {
    "cc0": "CC0 (public domain dedication)",
    "cc-by": "CC BY",
    "cc-by-nc": "CC BY-NC",
    "cc-by-sa": "CC BY-SA",
}

# iNaturalist serves several sizes from one base name.
SIZES = ("original", "large", "medium")


def get(url: str, *, raw: bool = False, timeout: int = 60):
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                body = response.read()
                return body if raw else json.loads(body)
        except urllib.error.HTTPError as error:
            if error.code == 404:
                return None
            if attempt == 2:
                raise RuntimeError(f"{url} -> HTTP {error.code}") from error
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
            if attempt == 2:
                raise RuntimeError(f"{url} unreachable: {error}") from error
        time.sleep(2 ** attempt)
    return None


def resolve_taxon(name: str) -> dict | None:
    """The iNat taxon whose name matches EXACTLY. A near match is a different plant."""
    params = {"q": name, "rank": "species", "is_active": "true", "per_page": 10}
    answer = get(f"{API}/taxa?{urllib.parse.urlencode(params)}") or {}
    for row in answer.get("results", []):
        if (row.get("name") or "").strip().lower() == name.strip().lower():
            return row
    return None


def photo_url(photo: dict, size: str) -> str | None:
    """Rewrite iNat's square URL to another size. The base name is shared."""
    url = photo.get("url") or ""
    if not url:
        return None
    return re.sub(r"/(square|small|medium|large|original)\.", f"/{size}.", url)


def harvest(name: str, licenses: tuple[str, ...], want: int,
            min_edge: int = 900, months: str | None = None) -> dict:
    taxon = resolve_taxon(name)
    if taxon is None:
        return {"taxon": None, "photos": [],
                "note": f"no exactly-matching active species taxon for {name!r}"}

    photos: list[dict] = []
    seen: set[int] = set()
    for licence in licenses:
        params = {
            "taxon_id": taxon["id"],
            "photo_license": licence,
            "quality_grade": "research",
            "photos": "true",
            "order_by": "votes",
            "per_page": 30,
        }
        # MONTH FILTER, because phenology is not a colour. Elderberry's card shows FRUIT,
        # and the CC0 set ordered by votes returned 32 photographs of the flower umbel and
        # not one of the drupes -- people photograph elders in bloom. iNaturalist can
        # restrict by observation month, so a species whose card shows fruit is retrieved
        # from the fruiting months rather than hoping fruit turns up.
        if months:
            params["month"] = months
        # PAGINATE. One page of 30 observations is not 30 usable photographs: most are
        # dropped by the per-photo licence re-check and the taxon re-check below, so a
        # single page returned six. A selection system needs 20-40 to choose from.
        pages = []
        for page in range(1, 6):
            answer = get(f"{API}/observations?"
                         f"{urllib.parse.urlencode({**params, 'page': page})}") or {}
            got = answer.get("results", [])
            pages.extend(got)
            if len(got) < params["per_page"] or len(pages) >= want * 4:
                break
            time.sleep(0.6)
        for obs in pages:
            # The observation's taxon must still be the one asked for: a research-grade
            # observation can be research grade for a DIFFERENT species.
            if (obs.get("taxon") or {}).get("id") != taxon["id"]:
                continue
            for photo in obs.get("photos", []):
                if photo["id"] in seen:
                    continue
                # THE OBSERVATION'S LICENCE IS NOT THE PHOTO'S LICENCE. They are set
                # separately on iNaturalist, so a CC0 observation can carry an all-rights-
                # reserved photograph. This checks the PHOTO.
                if (photo.get("license_code") or "").lower() != licence:
                    continue
                dims = photo.get("original_dimensions") or {}
                if max(dims.get("width", 0), dims.get("height", 0)) < min_edge:
                    continue
                seen.add(photo["id"])
                photos.append({
                    "photo_id": photo["id"],
                    "observation_id": obs["id"],
                    "observation_url": f"https://www.inaturalist.org/observations/{obs['id']}",
                    "license_code": licence,
                    "license": LICENSE_LABEL.get(licence, licence),
                    "photographer": (photo.get("attribution") or "").strip() or None,
                    "observed_on": obs.get("observed_on"),
                    "place": obs.get("place_guess"),
                    "urls": {s: photo_url(photo, s) for s in SIZES},
                    "dimensions": photo.get("original_dimensions"),
                    "taxon_name": (obs.get("taxon") or {}).get("name"),
                    "taxon_id": (obs.get("taxon") or {}).get("id"),
                    "quality_grade": obs.get("quality_grade"),
                    # Research grade does NOT guarantee a correct identification; it means
                    # enough people agreed. Recording the count lets a scorer weigh it.
                    "identification_agreements": obs.get("num_identification_agreements"),
                    "identification_disagreements": obs.get("num_identification_disagreements"),
                })
                if len(photos) >= want:
                    break
            if len(photos) >= want:
                break
        time.sleep(0.6)
        if len(photos) >= want:
            break

    return {
        "taxon": {"id": taxon["id"], "name": taxon["name"],
                  "rank": taxon.get("rank"), "wikipedia": taxon.get("wikipedia_url")},
        "photos": photos,
        "note": None,
    }


def download(photos: list[dict], out: pathlib.Path, prefer: str = "original") -> None:
    """Fetch each photograph, preferring `prefer` and falling back down the ladder.

    THE ORDER MATTERS AND USED TO BE WRONG. `large` was tried first, so every photograph
    arrived at 1024px on its long edge however big the original was. The card's art window
    is 593px wide and a subject occupying a third of a 1024px frame is ~300px, which then
    has to be UPSCALED about 1.7x to fill the window -- soft, on the one element of the card
    a buyer looks at closest. The chosen chamomile candidate is 1536x2048 at source and was
    downloaded at 768x1024 for exactly this reason.
    """
    out.mkdir(parents=True, exist_ok=True)
    ladder = [prefer] + [s for s in ("original", "large", "medium") if s != prefer]
    for photo in photos:
        for size in ladder:
            url = (photo["urls"] or {}).get(size)
            if not url:
                continue
            body = get(url, raw=True)
            if not body:
                continue
            ext = pathlib.Path(urllib.parse.urlparse(url).path).suffix or ".jpg"
            path = out / f"inat-{photo['photo_id']}{ext}"
            path.write_bytes(body)
            photo["file"] = path.name
            photo["bytes"] = len(body)
            photo["downloaded_size"] = size
            break
        time.sleep(0.3)


def self_test() -> int:
    sample = {"url": "https://inaturalist-open-data.s3.amazonaws.com/photos/1/square.jpg"}
    checks = [
        (photo_url(sample, "large").endswith("/large.jpg"), "square -> large rewrite"),
        (photo_url(sample, "original").endswith("/original.jpg"), "square -> original"),
        (photo_url({}, "large") is None, "a photo with no url yields none"),
        (DEFAULT_LICENSES == ("cc0",),
         "the DEFAULT is CC0 only -- widening it has to be deliberate"),
        ("cc-by" not in DEFAULT_LICENSES,
         "CONTROL: an attribution licence is NOT in the default set"),
        (all(k in LICENSE_LABEL for k in DEFAULT_LICENSES),
         "every default licence has a human-readable label to print"),
    ]
    bad = sum(1 for ok, _ in checks if not ok)
    for ok, label in checks:
        print(f"{'PASS' if ok else 'FAIL'}  {label}")
    print("\nALL SELF-TESTS PASSED" if not bad else f"\n{bad} FAILURE(S)")
    return 1 if bad else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("species", nargs="*")
    parser.add_argument("--out", default="evidence/photos")
    parser.add_argument("--want", type=int, default=32)
    parser.add_argument("--months", default=None,
                        help="comma-separated observation months, e.g. 8,9,10 for\n                              autumn fruit. Phenology cannot be recovered from a\n                              hue, so it is selected at retrieval.")
    parser.add_argument("--size", default="large",
                        choices=("original", "large", "medium"),
                        help="which rendition to download. `large` is 1024px on the long\n                              edge; `original` is whatever the photographer uploaded and is\n                              what a card needs -- the art window is 593px wide and a\n                              subject occupying a third of a 1024px frame has to be\n                              UPSCALED to fill it.")
    parser.add_argument("--min-edge", type=int, default=900,
                        help="skip photos whose longest original edge is smaller")
    parser.add_argument("--licenses", default=",".join(DEFAULT_LICENSES))
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not args.species:
        print("name at least one species", file=sys.stderr)
        return 2

    licenses = tuple(part.strip().lower() for part in args.licenses.split(",") if part.strip())
    out = pathlib.Path(args.out)
    for name in args.species:
        # PER-SPECIES MONTHS. One --months for a whole run is wrong: each species has its
        # own phenology and the deck already records which season its card shows.
        months = args.months
        if months is None:
            cfg = pathlib.Path("evidence/retrieval-months.json")
            if cfg.exists():
                key = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
                entry = json.loads(cfg.read_text()).get(key)
                if entry:
                    months = entry["months"]
                    print(f"   {name}: restricting to months {months} ({entry['season']})")
        result = harvest(name, licenses, args.want, args.min_edge, months)
        key = name.lower().replace(" ", "_")
        folder = out / key
        if result["photos"]:
            download(result["photos"], folder, args.size)
        record = {
            "species": name,
            "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "source": "iNaturalist",
            "licenses_requested": list(licenses),
            "quality_grade": "research",
            **result,
            "warning": "Each photo's licence, photographer and original URL travel with "
                       "it. A card that shows one of these without its provenance record "
                       "is using somebody's work without saying so.",
        }
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "photos.json").write_text(
            json.dumps(record, indent=2, ensure_ascii=False) + "\n")
        got = len(result["photos"])
        print(f"{name}: taxon={result['taxon']['id'] if result['taxon'] else None} "
              f"photos={got} licensed={licenses} -> {folder}")
        for photo in result["photos"]:
            print(f"    {photo.get('file', '(not downloaded)')}  "
                  f"{photo['license_code']}  {str(photo['photographer'])[:60]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
