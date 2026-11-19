"""A fresh iNaturalist search for replacement candidates, beyond everything already shown.

REUSES scripts/fetch_inat_photos.py (API access, exact-taxon match, original-size URLs) and
scripts/photo_collector.py (`verify_licenses`, the second independent licence check).

WHAT IS DIFFERENT FROM THE FIRST COLLECTOR, AND WHY:
  * It excludes every photograph AND observation already presented in an earlier batch.
  * It searches by several orderings, not by votes alone. Vote order rewards attractive, popular
    shots (macro, top-down, patches) and returned only ~150 observations per species. Here: several
    query types, 200 per page, up to 4 pages each.
  * It prefers observations the observer marked FLOWERING (iNaturalist Plant Phenology), because
    every role needs a flowering plant.
  * It carries identification-quality fields, so a thin or disputed ID is FLAGGED, never hidden.
  * It never widens the licence: a photo is used only if THAT photo is CC0, checked twice.
"""
from __future__ import annotations

import json
import pathlib
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import fetch_inat_photos as F      # noqa: E402
import photo_collector as PC       # noqa: E402

MIN_ORIG_EDGE = 1400               # a candidate's original long edge; the screen later enforces 1200 on retained
PER_PAGE = 200
MAX_PAGES = 4
FLOWERING = {"term_id": 12, "term_value_id": 13}     # Plant Phenology = Flowering
FRUITING = {"term_id": 12, "term_value_id": 14}      # Plant Phenology = Fruiting
BUDDING = {"term_id": 12, "term_value_id": 15}       # Plant Phenology = Flower Budding
QUERIES_V3_EXTRA = [
    ("fruiting-votes", {"order_by": "votes", **FRUITING}),
    ("budding-votes", {"order_by": "votes", **BUDDING}),
]
QUERIES = [
    ("flowering-votes", {"order_by": "votes", **FLOWERING}),
    ("flowering-recent", {"order_by": "observed_on", "order": "desc", **FLOWERING}),
    ("flowering-newest-upload", {"order_by": "created_at", "order": "desc", **FLOWERING}),
    ("any-recent", {"order_by": "observed_on", "order": "desc"}),
    ("any-votes-deep", {"order_by": "votes"}),
]


def previous_index(result_files: list[pathlib.Path], metadata_files: list[pathlib.Path]) -> dict:
    """Every photograph already shown to a reviewer, from the repo's batch results and from the
    metadata of earlier batches. {photo_id: {observation_id, ...provenance}}"""
    idx: dict[int, dict] = {}
    for f in result_files:
        r = json.loads(pathlib.Path(f).read_text())
        for card, sp in r.get("species", {}).items():
            for c in sp.get("candidates", []):
                idx[int(c["photo_id"])] = {"observation_id": c.get("observation_id"), "observation_url": c.get("observation_url"),
                                           "photographer": c.get("photographer"), "license_code": c.get("license_code"),
                                           "card": int(card), "source": pathlib.Path(f).name}
    for f in metadata_files:
        d = json.loads(pathlib.Path(f).read_text())
        for p in d.get("photos", []):
            idx.setdefault(int(p["photo_id"]), {"observation_id": p.get("observation_id"), "observation_url": p.get("observation_url"),
                                                "photographer": p.get("photographer"), "license_code": p.get("license_code"),
                                                "card": d.get("card"), "source": pathlib.Path(f).parent.name})
    return idx


def _annotations(obs: dict) -> bool:
    for a in obs.get("annotations") or []:
        if (a.get("controlled_attribute") or {}).get("label") == "Plant Phenology" and (a.get("controlled_value") or {}).get("label") == "Flowering":
            return True
    return False


def photos_of(obs: dict, taxon_id: int, query: str, min_edge: int = MIN_ORIG_EDGE) -> list[dict]:
    """The CC0 photographs of one observation, each checked on ITS OWN licence."""
    if (obs.get("taxon") or {}).get("id") != taxon_id:
        return []
    out = []
    for i, ph in enumerate(obs.get("photos", [])):
        if (ph.get("license_code") or "").lower() != "cc0":
            continue
        dims = ph.get("original_dimensions") or {}
        long_edge = max(dims.get("width", 0), dims.get("height", 0))
        if long_edge < min_edge:
            continue
        out.append({
            "photo_id": ph["id"], "observation_id": obs["id"], "photo_index": i,
            "observation_url": f"https://www.inaturalist.org/observations/{obs['id']}",
            "license_code": "cc0", "license": F.LICENSE_LABEL["cc0"],
            "photographer": (ph.get("attribution") or "").strip() or None,
            "observed_on": obs.get("observed_on"), "place": obs.get("place_guess"),
            "urls": {s: F.photo_url(ph, s) for s in F.SIZES}, "dimensions": dims, "orig_long": long_edge,
            "taxon_id": taxon_id, "taxon_name": (obs.get("taxon") or {}).get("name"),
            "quality_grade": obs.get("quality_grade"), "community_taxon_id": obs.get("community_taxon_id"),
            "identification_agreements": obs.get("num_identification_agreements"),
            "identification_disagreements": obs.get("num_identification_disagreements"),
            "flowering_annotation": _annotations(obs), "found_by": query,
        })
    return out


def build_pool(taxon_id: int, exclude_photos: set, exclude_obs: set, limit: int = 220, log=print, policy: str = "v2") -> list[dict]:
    """Candidate photographs: new, CC0, large, flowering-first, interleaved across query types."""
    per_query: list[list[dict]] = []
    seen_obs = set()
    queries = QUERIES + (QUERIES_V3_EXTRA if policy == "v3" else [])
    pages = 6 if policy == "v3" else MAX_PAGES          # v3: deeper, because 7 of the owner's 19 picks were never in a pool
    for name, extra in queries:
        got: list[dict] = []
        for page in range(1, pages + 1):
            params = {"taxon_id": taxon_id, "photo_license": "cc0", "quality_grade": "research", "photos": "true",
                      "per_page": PER_PAGE, "page": page, **extra}
            ans = F.get(f"{F.API}/observations?{F.urllib.parse.urlencode(params)}") or {}
            rows = ans.get("results", [])
            for obs in rows:
                if obs["id"] in exclude_obs:
                    continue
                for p in photos_of(obs, taxon_id, name):
                    if p["photo_id"] not in exclude_photos:
                        got.append(p)
            time.sleep(1.0)
            if len(rows) < PER_PAGE:
                break
        log(f"   query {name}: {len(got)} new CC0 photos")
        per_query.append(got)
    pool, seen, per_obs = [], set(), {}
    longest = max((len(q) for q in per_query), default=0)
    for i in range(longest):                      # round-robin, so no one ordering dominates
        for q in per_query:
            if i < len(q):
                p = q[i]
                if p["photo_id"] in seen or per_obs.get(p["observation_id"], 0) >= 2:
                    continue
                seen.add(p["photo_id"])
                per_obs[p["observation_id"]] = per_obs.get(p["observation_id"], 0) + 1
                pool.append(p)
    if policy != "v3":      # v2 ordering puts flowering-annotated photos first, which starves fruit, bud and unannotated photographs at the cut
        pool.sort(key=lambda p: (not p["flowering_annotation"], -(p["identification_agreements"] or 0) // 2, p["photo_index"]))
    return pool[:limit]


def retained_record(photo_id: int, taxon_id: int, prev: dict, taxon_name: str) -> dict | None:
    """Provenance for a previously APPROVED photograph, re-verified rather than trusted."""
    p = prev.get(int(photo_id))
    if not p or not p.get("observation_id"):
        return None
    base = f"https://inaturalist-open-data.s3.amazonaws.com/photos/{int(photo_id)}"
    return {"photo_id": int(photo_id), "observation_id": p["observation_id"],
            "observation_url": p.get("observation_url") or f"https://www.inaturalist.org/observations/{p['observation_id']}",
            "license_code": "cc0", "license": F.LICENSE_LABEL["cc0"], "photographer": p.get("photographer"),
            "urls": {s: f"{base}/{s}.jpg" for s in F.SIZES}, "taxon_id": taxon_id, "taxon_name": taxon_name,
            "orig_long": 0, "photo_index": 0, "flowering_annotation": False, "found_by": "retained"}


def reverify(photos: list[dict], taxon_id: int) -> tuple[list[dict], list[dict]]:
    """The second, independent licence check (re-read from each observation)."""
    return PC.verify_licenses(photos, taxon_id)


# --- v4 retrieval -------------------------------------------------------------------------------------------------
# The retro showed 9 of the owner's 19 photographs never reached a pool: 6 were cut by the interleave, 2 by the two-photographs-per-observation cap and 1 by the
# 1400 px floor. v4 takes the votes-ordered list to a fixed OBSERVATION depth with ALL of each observation's CC0 photographs, adds the phenology and recent
# lists as extra sources, and moves resolution to a per-role floor on the subject (screen.role_floors). Only 800 px is kept here, to drop thumbnails.
V4_MIN_EDGE = 800
V4_SOURCES = [
    ("votes-deep", {"order_by": "votes"}, 2),                                  # 400 observations: every one of the owner's 19 was within 277
    ("flowering-votes", {"order_by": "votes", **FLOWERING}, 1),
    ("fruiting-votes", {"order_by": "votes", **FRUITING}, 1),
    ("budding-votes", {"order_by": "votes", **BUDDING}, 1),
    ("recent", {"order_by": "observed_on", "order": "desc"}, 1),
]


def build_pool_v4(taxon_id: int, log=print, limit: int = 1200) -> list[dict]:
    seen, pool = set(), []
    for name, extra, pages in V4_SOURCES:
        n0 = len(pool)
        for page in range(1, pages + 1):
            params = {"taxon_id": taxon_id, "photo_license": "cc0", "quality_grade": "research", "photos": "true",
                      "per_page": 200, "page": page, **extra}
            rows = (F.get(f"{F.API}/observations?{F.urllib.parse.urlencode(params)}") or {}).get("results", [])
            for obs in rows:
                for p in photos_of(obs, taxon_id, name, min_edge=V4_MIN_EDGE):
                    if p["photo_id"] not in seen:
                        seen.add(p["photo_id"])
                        pool.append(p)
            time.sleep(1.0)
            if len(rows) < 200:
                break
        log(f"   source {name}: +{len(pool) - n0} new CC0 photos")
    return pool[:limit]


# --- v4.3 retrieval: depth scales with how many observations the species has -----------------------------------------------------------------
# The blind batch (#80 clover, #81 Queen Anne's lace) showed v4's fixed 400-observation depth is only a large share of a SMALL species: the owner's missed picks sat
# at votes positions ~470-1,750 of 5,000-6,800 observations. Species up to ~1,500 observations keep the v4 depth (every earlier pick was inside it); larger ones
# go to 2,000. The photograph cut is raised so the last sources (recent) are not silently truncated. Depth was chosen AFTER seeing these picks, so it is a
# measured fix for a diagnosed miss and NOT yet evidence of generalisation.
V43_SMALL_SPECIES_OBS = 1500
V43_LARGE_VOTES_PAGES = 10
V43_CAP = 4000


def build_pool_v43(taxon_id: int, log=print, limit: int = V43_CAP) -> list[dict]:
    probe = (F.get(f"{F.API}/observations?" + F.urllib.parse.urlencode({"taxon_id": taxon_id, "photo_license": "cc0", "quality_grade": "research", "photos": "true", "per_page": 1})) or {})
    total = probe.get("total_results") or 0
    votes_pages = V43_LARGE_VOTES_PAGES if total > V43_SMALL_SPECIES_OBS else 2
    log(f"   {total} CC0 research observations -> votes-deep {votes_pages} pages")
    seen, pool = set(), []
    for name, extra, pages in V4_SOURCES:
        n0 = len(pool)
        for page in range(1, (votes_pages if name == "votes-deep" else pages) + 1):
            params = {"taxon_id": taxon_id, "photo_license": "cc0", "quality_grade": "research", "photos": "true",
                      "per_page": 200, "page": page, **extra}
            rows = (F.get(f"{F.API}/observations?{F.urllib.parse.urlencode(params)}") or {}).get("results", [])
            for obs in rows:
                for p in photos_of(obs, taxon_id, name, min_edge=V4_MIN_EDGE):
                    if p["photo_id"] not in seen:
                        seen.add(p["photo_id"])
                        pool.append(p)
            time.sleep(1.0)
            if len(rows) < 200:
                break
        log(f"   source {name}: +{len(pool) - n0} new CC0 photos")
    return pool[:limit]
