#!/usr/bin/env python3
"""Identify the exact iNaturalist photographs behind the owner's 19 pictures, verify them, and package the originals.

The owner's pictures are resized (and sometimes cropped) and carry no ids. The owner's browsing history names the
observations they were choosing from. For each species this reads every photo on those observations, matches each
picture to a photo by feature matching (RANSAC inliers), then for each match checks the photo's OWN licence and the
observation's taxon and downloads the highest size iNaturalist serves, unedited. Anything that does not match, is not
CC0, or is the wrong taxon is REPORTED and left out; nothing is substituted.
  fetch_human_picks.py --request <json> --picks <dir> --out <dir>
"""
from __future__ import annotations

import csv, datetime as dt, hashlib, io, json, pathlib, sys

import cv2
import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F  # noqa: E402
from production.fetch_selected import image_size, sized_candidates  # noqa: E402

PICK_ROLE = {"main": "main", "pixe": "pixel", "preview": "tall"}
MIN_INLIERS = 25


def gray(data: bytes | None = None, path: pathlib.Path | None = None):
    arr = np.frombuffer(data, np.uint8) if data is not None else np.fromfile(str(path), np.uint8)
    im = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
    s = 900 / max(im.shape)
    return cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA) if s < 1 else im


def inliers(orb, bf, a, b) -> int:
    (kp, des), (k2, d2) = a, b
    if des is None or d2 is None or len(k2) < 8:
        return 0
    good = [m for m, n in (p for p in bf.knnMatch(des, d2, k=2) if len(p) == 2) if m.distance < 0.75 * n.distance]
    if len(good) < 10:
        return 0
    src = np.float32([kp[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([k2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    _, mask = cv2.findHomography(src, dst, cv2.RANSAC, 6.0)
    return int(mask.sum()) if mask is not None else 0


def main() -> int:
    a = sys.argv
    arg = lambda k: a[a.index(k) + 1]  # noqa: E731
    req = json.load(open(arg("--request")))
    picks = pathlib.Path(arg("--picks"))
    out = pathlib.Path(arg("--out")); out.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    orb = cv2.ORB_create(2500); bf = cv2.BFMatcher(cv2.NORM_HAMMING)
    rows, report = [], []
    for c in req["cards"]:
        taxon = F.resolve_taxon(c["scientific"])
        # every photo on the named observations, with the licence the photo itself carries
        cands = []
        for oid in c["observations"]:
            ans = F.get(f"{F.API}/observations/{oid}") or {}
            obs = (ans.get("results") or [None])[0]
            if not obs:
                report.append(f"#{c['card']} observation {oid}: could not be read"); continue
            t = obs.get("taxon") or {}
            check = "exact" if t.get("id") == taxon["id"] else "beneath species" if taxon["id"] in (t.get("ancestor_ids") or []) else "MISMATCH"
            for ph in obs.get("photos", []):
                url = F.photo_url(ph, "large")
                data = F.get(url, raw=True) if url else None
                if not data:
                    continue
                kp, des = orb.detectAndCompute(gray(data=data), None)
                cands.append({"obs": obs, "ph": ph, "check": check, "desc": (kp, des)})
        print(f"#{c['card']}: {len(cands)} photos on {len(c['observations'])} observations")
        for f in sorted(picks.glob(f"{c['slug']}*")):
            role = PICK_ROLE[next(k for k in PICK_ROLE if k in f.stem)]
            pd = orb.detectAndCompute(gray(path=f), None)
            scored = sorted(((inliers(orb, bf, pd, x["desc"]), x) for x in cands), key=lambda t: -t[0])
            best, x = scored[0] if scored else (0, None)
            row = {"card": c["card"], "role": role, "owner_picture": f.name, "species": c["scientific"], "match_inliers": best,
                   "runner_up_inliers": scored[1][0] if len(scored) > 1 else 0, "photo_id": None, "problems": ""}
            if x is None or best < MIN_INLIERS:
                row["problems"] = f"no photo on the named observations matches this picture (best {best} inliers)"
                report.append(f"#{c['card']} {role} ({f.name}): " + row["problems"]); rows.append(row); continue
            ph, obs = x["ph"], x["obs"]
            lic = (ph.get("license_code") or "").lower()
            user = obs.get("user") or {}
            row.update({"photo_id": ph["id"], "observation_id": obs["id"], "observation_url": f"https://www.inaturalist.org/observations/{obs['id']}",
                        "photo_page_url": f"https://www.inaturalist.org/photos/{ph['id']}", "photographer": ph.get("attribution_name") or user.get("name") or user.get("login"),
                        "license_code": lic or None, "license": F.LICENSE_LABEL.get(lic, lic or "none (all rights reserved)"),
                        "observation_taxon": (obs.get("taxon") or {}).get("name"), "taxon_check": x["check"], "observed_on": obs.get("observed_on"), "verified_at": stamp})
            probs = []
            if lic != "cc0":
                probs.append(f"licence is {lic or 'all rights reserved'!r}, not cc0: original NOT downloaded")
            if x["check"] == "MISMATCH":
                probs.append(f"observation taxon is {row['observation_taxon']!r}, not {c['scientific']!r}")
            if best < 100:
                probs.append(f"weak match ({best} inliers): confirm by eye")
            if not probs[:2] or (lic == "cc0" and x["check"] != "MISMATCH"):
                for size in ("original", "large"):
                    for url in sized_candidates(ph, size):
                        data = F.get(url, raw=True)
                        if data:
                            ext = url.rsplit(".", 1)[1].lower()
                            d = out / f"card-{c['card']}_{c['scientific'].lower().replace(' ', '-')}" / role
                            d.mkdir(parents=True, exist_ok=True)
                            name = f"{f.stem}__{ph['id']}_original.{ext}"
                            (d / name).write_bytes(data)
                            w, h = image_size(data) or (None, None)
                            row.update({"size_served": size, "source_url": url, "width": w, "height": h, "bytes": len(data),
                                        "sha256": hashlib.sha256(data).hexdigest(), "file": f"{d.relative_to(out)}/{name}"})
                            if size != "original":
                                probs.append("original size unavailable; only 'large' served")
                            break
                    if row.get("file"):
                        break
                if not row.get("file"):
                    probs.append("no downloadable size found")
            row["problems"] = "; ".join(probs)
            if any(not p.startswith("weak match") for p in probs):
                report.append(f"#{c['card']} {role} ({f.name}, photo {ph['id']}): {row['problems']}")
            rows.append(row)
    fields = ["card", "role", "owner_picture", "species", "photo_id", "observation_id", "photographer", "license_code", "license", "taxon_check", "observation_taxon",
              "match_inliers", "runner_up_inliers", "observed_on", "observation_url", "photo_page_url", "source_url", "size_served", "width", "height", "bytes", "sha256", "file", "verified_at", "problems"]
    buf = io.StringIO(); w = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore"); w.writeheader(); w.writerows(rows)
    (out / "manifest.csv").write_text(buf.getvalue())
    (out / "manifest.json").write_text(json.dumps({"batch": req["batch"], "built": stamp, "rows": rows}, indent=1))
    lines = [f"Owner picks: exact photographs - {stamp}", "Unedited originals as served by iNaturalist; nothing cropped, resized or re-encoded.",
             f"{sum(1 for r in rows if r.get('file'))} of {len(rows)} pictures matched, verified and downloaded.", ""]
    lines += report or ["No problems."]
    (out / "REPORT.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    for r in rows:
        print(r["card"], r["role"], r["owner_picture"], "->", r.get("photo_id"), "obs", r.get("observation_id"), r.get("license_code"), r.get("taxon_check"), "inl", r["match_inliers"], "/", r["runner_up_inliers"], f"{r.get('width')}x{r.get('height')}", r.get("photographer"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
