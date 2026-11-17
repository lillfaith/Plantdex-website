#!/usr/bin/env python3
"""Download the owner's SELECTED iNaturalist photos, unedited, and package them with a manifest.

A FETCHER AND A VERIFIER. It decides nothing and edits nothing: the bytes written are the bytes iNaturalist
served at the highest size it offers. Runs in GitHub Actions only (api.inaturalist.org is refused by the dev sandbox).

Request (evidence/photo-fetch/request.json):
  {"batch": "62-66", "cards": [{"card": 62, "scientific": "Eriogonum fasciculatum",
     "photos": {"main": 156413, "pixel": 577631995, "tall": 351651663}}, ...]}
The ids are iNaturalist PHOTO ids. For every one this checks, individually, and REPORTS rather than substitutes:
  1. the photo resolves to an observation and is on it,
  2. the photo's own licence is CC0 (read from the observation's photo record AND from the photo record itself),
  3. the observation's taxon is the requested species (or a taxon beneath it, flagged as such),
  4. the highest size is downloaded ("original"; anything smaller is flagged as a shortfall).
A photo used for two roles is downloaded once and referenced twice.
"""
from __future__ import annotations

import csv
import datetime as dt
import hashlib
import io
import json
import pathlib
import re
import struct
import sys
import urllib.error
import urllib.parse
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F  # noqa: E402

ROLES = ("main", "pixel", "tall")
UA = F.UA


def raw_get(url: str) -> bytes | None:
    return F.get(url, raw=True, timeout=120)


def image_size(data: bytes) -> tuple[int, int] | None:
    """Pixel dimensions read from the header only. Nothing is decoded or re-encoded."""
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    if data[:3] == b"\xff\xd8\xff":
        i = 2
        while i + 9 < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
                i += 2
                continue
            seg = struct.unpack(">H", data[i + 2:i + 4])[0]
            if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                h, w = struct.unpack(">HH", data[i + 5:i + 9])
                return w, h
            i += 2 + seg
    return None


HINTS: dict[int, int] = {}


def load_hints(folder: pathlib.Path) -> int:
    """photo id -> observation id, read from the search runs' own result files (the contact-sheet ids come from there)."""
    def walk(o):
        if isinstance(o, dict):
            if isinstance(o.get("photo_id"), int) and isinstance(o.get("observation_id"), int):
                HINTS[o["photo_id"]] = o["observation_id"]
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for v in o:
                walk(v)
    for f in folder.rglob("*.json"):
        try:
            walk(json.loads(f.read_text()))
        except (ValueError, OSError):
            pass
    return len(HINTS)


def observation_id_for_photo(photo_id: int) -> int | None:
    """iNaturalist's v1 API has no photo lookup. Use the search runs' records, then the photo's own page (which
    refuses automated clients from some networks - hence the hints come first)."""
    if photo_id in HINTS:
        return HINTS[photo_id]
    j = F.get(f"https://www.inaturalist.org/photos/{photo_id}.json")
    if isinstance(j, dict):
        m = re.search(r"/observations/(\d+)", str(j.get("native_page_url") or ""))
        if m:
            return int(m.group(1))
    html = raw_get(f"https://www.inaturalist.org/photos/{photo_id}")
    if html:
        m = re.search(r"/observations/(\d+)", html.decode("utf-8", "ignore"))
        if m:
            return int(m.group(1))
    return None


def sized_candidates(photo: dict, size: str) -> list[str]:
    url = F.photo_url(photo, size)
    if not url:
        return []
    out = [url]
    stem, _, ext = url.rpartition(".")
    for alt in ("jpg", "jpeg", "png"):
        if alt != ext.lower():
            out.append(f"{stem}.{alt}")
    return out


def fetch_one(photo_id: int, species: str, taxon: dict) -> dict:
    """Everything about one photo. 'problems' empty means it passed every check."""
    rec: dict = {"photo_id": photo_id, "problems": []}
    obs_id = observation_id_for_photo(photo_id)
    if obs_id is None:
        rec["problems"].append("could not resolve the photo to an observation")
        return rec
    rec["observation_id"] = obs_id
    ans = F.get(f"{F.API}/observations/{obs_id}") or {}
    obs = (ans.get("results") or [None])[0]
    if not obs:
        rec["problems"].append(f"observation {obs_id} could not be read")
        return rec
    ph = next((p for p in obs.get("photos", []) if p.get("id") == photo_id), None)
    if ph is None:
        rec["problems"].append(f"photo is not on observation {obs_id} (id may be an observation or candidate number)")
        return rec
    lic = (ph.get("license_code") or "").lower()
    rec["license_code"] = lic or None
    rec["license"] = F.LICENSE_LABEL.get(lic, lic or "none (all rights reserved)")
    if lic != "cc0":
        rec["problems"].append(f"licence is {lic or 'all rights reserved'!r}, not cc0")
    j = F.get(f"https://www.inaturalist.org/photos/{photo_id}.json")
    if isinstance(j, dict) and j.get("license_code") is not None and str(j["license_code"]).lower() != lic:
        rec["problems"].append(f"licence disagrees between records: {j['license_code']!r} vs {lic!r}")
    t = obs.get("taxon") or {}
    rec["observation_taxon"] = {"id": t.get("id"), "name": t.get("name"), "rank": t.get("rank")}
    if t.get("id") == taxon["id"]:
        rec["taxon_check"] = "exact"
    elif taxon["id"] in (t.get("ancestor_ids") or []):
        rec["taxon_check"] = "beneath requested species (infraspecific)"
    else:
        rec["taxon_check"] = "MISMATCH"
        rec["problems"].append(f"observation taxon is {t.get('name')!r} ({t.get('rank')}), not {species!r}")
    user = obs.get("user") or {}
    rec.update({"photographer": ph.get("attribution_name") or user.get("name") or user.get("login"),
                "attribution": ph.get("attribution"), "observed_on": obs.get("observed_on"),
                "observation_url": f"https://www.inaturalist.org/observations/{obs_id}",
                "photo_page_url": f"https://www.inaturalist.org/photos/{photo_id}",
                "reported_original_dimensions": ph.get("original_dimensions")})
    # highest size iNaturalist offers; anything below it is a shortfall the owner must hear about
    for size in ("original", "large"):
        for url in sized_candidates(ph, size):
            data = raw_get(url)
            if data:
                rec.update({"size_served": size, "source_url": url, "bytes": data, "ext": url.rsplit(".", 1)[1].lower()})
                break
        if "bytes" in rec:
            break
    if "bytes" not in rec:
        rec["problems"].append("no downloadable size found")
        return rec
    if rec["size_served"] != "original":
        rec["problems"].append("original size unavailable; only 'large' was served")
    rec["sha256"] = hashlib.sha256(rec["bytes"]).hexdigest()
    dims = image_size(rec["bytes"])
    rec["width"], rec["height"] = dims if dims else (None, None)
    return rec


def run(request: dict, out: pathlib.Path) -> int:
    out.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    cache: dict[tuple[int, str], dict] = {}
    rows, report, bad = [], [], 0
    for c in request["cards"]:
        taxon = F.resolve_taxon(c["scientific"])
        if taxon is None:
            report.append(f"#{c['card']}: taxon {c['scientific']!r} did not resolve on iNaturalist")
            bad += 1
            continue
        slug = c["scientific"].lower().replace(" ", "-")
        folder = out / f"card-{c['card']}_{slug}"
        first_role: dict[int, str] = {}
        for role in ROLES:
            pid = int(c["photos"][role])
            key = (pid, c["scientific"])
            if key not in cache:
                try:
                    cache[key] = fetch_one(pid, c["scientific"], taxon)
                except Exception as e:  # a network failure is reported, never papered over
                    cache[key] = {"photo_id": pid, "problems": [f"fetch failed: {e}"]}
            r = cache[key]
            row = {"card": c["card"], "role": role, "species": c["scientific"], "photo_id": pid,
                   "observation_id": r.get("observation_id"), "photographer": r.get("photographer"),
                   "license": r.get("license"), "license_code": r.get("license_code"),
                   "taxon_check": r.get("taxon_check"), "observation_taxon": (r.get("observation_taxon") or {}).get("name"),
                   "source_url": r.get("source_url"), "observation_url": r.get("observation_url"),
                   "observed_on": r.get("observed_on"), "size_served": r.get("size_served"),
                   "width": r.get("width"), "height": r.get("height"), "sha256": r.get("sha256"),
                   "bytes": len(r["bytes"]) if r.get("bytes") else None, "file": None, "same_file_as_role": None,
                   "verified_at": stamp, "problems": "; ".join(r["problems"])}
            if r["problems"]:
                bad += 1
                report.append(f"#{c['card']} {role} (photo {pid}): " + "; ".join(r["problems"]))
            if r.get("bytes"):
                if pid in first_role:
                    row["file"] = next(x["file"] for x in rows if x["card"] == c["card"] and x["role"] == first_role[pid])
                    row["same_file_as_role"] = first_role[pid]
                    d = folder / role
                    d.mkdir(parents=True, exist_ok=True)
                    (d / f"SAME_PHOTO_AS_{first_role[pid].upper()}.txt").write_text(
                        f"Photo {pid} is used for both '{first_role[pid]}' and '{role}'.\nThe single unedited original is at ../{first_role[pid]}/\n")
                else:
                    first_role[pid] = role
                    d = folder / role
                    d.mkdir(parents=True, exist_ok=True)
                    name = f"{pid}_original.{r['ext']}"
                    (d / name).write_bytes(r["bytes"])
                    row["file"] = f"{folder.name}/{role}/{name}"
            rows.append(row)
    fields = list(rows[0].keys()) if rows else []
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=fields)
    w.writeheader()
    w.writerows(rows)
    (out / "manifest.csv").write_text(buf.getvalue())
    (out / "manifest.json").write_text(json.dumps({"batch": request.get("batch"), "built": stamp, "rows": rows}, indent=1))
    ok = bad == 0
    lines = [f"PlantDex photo fetch {request.get('batch')} - {stamp}",
             "Unedited originals exactly as served by iNaturalist. No cropping, resizing, background removal or re-encoding.",
             "RESULT: " + ("ALL CHECKS PASSED" if ok else f"{len(report)} PROBLEM(S) - see below"), ""]
    lines += report or ["No failed downloads, taxonomic mismatches or licence problems."]
    (out / "REPORT.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    return 0 if ok else 2


def self_test() -> int:
    png = b"\x89PNG\r\n\x1a\n" + b"\0\0\0\rIHDR" + struct.pack(">II", 640, 480) + b"\0" * 8
    assert image_size(png) == (640, 480)
    jpg = b"\xff\xd8\xff\xe0\x00\x10JFIF\0\x01\x01\0\0\x01\0\x01\0\0" + b"\xff\xc0\x00\x11\x08" + struct.pack(">HH", 300, 400) + b"\x03" + b"\0" * 9
    assert image_size(jpg) == (400, 300)
    c = sized_candidates({"url": "https://x/photos/5/square.jpeg"}, "original")
    assert c[0] == "https://x/photos/5/original.jpeg" and "https://x/photos/5/original.jpg" in c
    print("self-test ok")
    return 0


if __name__ == "__main__":
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    if "--hints" in sys.argv:
        print("hints loaded:", load_hints(pathlib.Path(sys.argv[sys.argv.index("--hints") + 1])))
    req = json.load(open(sys.argv[sys.argv.index("--request") + 1]))
    sys.exit(run(req, pathlib.Path(sys.argv[sys.argv.index("--out") + 1])))
