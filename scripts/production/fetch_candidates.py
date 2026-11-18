#!/usr/bin/env python3
"""Package specific candidate photographs (by photo id + observation id) as unedited originals with a verification manifest.

Per photograph: its OWN licence must be CC0, the observation's taxon must be the species, and the highest size iNaturalist serves is downloaded unedited.
Anything that fails is REPORTED and left out; nothing is substituted.
  fetch_candidates.py --request <json> --out <dir>
Request: {"batch": "...", "note": "...", "scientific": "...", "card": 62, "role": "tall", "items": [{"photo_id": 1, "observation_id": 2, "why": "..."}]}
"""
from __future__ import annotations

import csv, datetime as dt, io, json, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F                      # noqa: E402
from production import fetch_selected as FS        # noqa: E402


def main() -> int:
    a = sys.argv
    req = json.load(open(a[a.index("--request") + 1]))
    out = pathlib.Path(a[a.index("--out") + 1]); out.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    taxon = F.resolve_taxon(req["scientific"])
    rows, report = [], []
    for n, it in enumerate(req["items"], 1):
        FS.HINTS[it["photo_id"]] = it["observation_id"]
        try:
            r = FS.fetch_one(it["photo_id"], req["scientific"], taxon)
        except Exception as e:  # noqa: BLE001
            r = {"photo_id": it["photo_id"], "problems": [f"fetch failed: {e}"]}
        row = {"card": req["card"], "role": req["role"], "species": req["scientific"], "photo_id": it["photo_id"], "observation_id": r.get("observation_id"),
               "photographer": r.get("photographer"), "license_code": r.get("license_code"), "license": r.get("license"), "taxon_check": r.get("taxon_check"),
               "observation_taxon": (r.get("observation_taxon") or {}).get("name"), "observed_on": r.get("observed_on"), "observation_url": r.get("observation_url"),
               "photo_page_url": r.get("photo_page_url"), "source_url": r.get("source_url"), "size_served": r.get("size_served"), "width": r.get("width"),
               "height": r.get("height"), "bytes": len(r["bytes"]) if r.get("bytes") else None, "sha256": r.get("sha256"), "file": None, "why_suggested": it.get("why"),
               "verified_at": stamp, "problems": "; ".join(r["problems"])}
        if r["problems"]:
            report.append(f"photo {it['photo_id']}: " + "; ".join(r["problems"]))
        if r.get("bytes") and not any("licence" in p or "MISMATCH" in p or "observation taxon" in p for p in r["problems"]):
            d = out / f"card-{req['card']}_{req['scientific'].lower().replace(' ', '-')}" / req["role"]
            d.mkdir(parents=True, exist_ok=True)
            name = f"candidate-{n}__{it['photo_id']}_original.{r['ext']}"
            (d / name).write_bytes(r["bytes"])
            row["file"] = f"{d.relative_to(out)}/{name}"
        rows.append(row)
    buf = io.StringIO(); w = csv.DictWriter(buf, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    (out / "manifest.csv").write_text(buf.getvalue())
    (out / "manifest.json").write_text(json.dumps({"batch": req["batch"], "note": req.get("note"), "built": stamp, "rows": rows}, indent=1))
    lines = [f"{req['batch']} - {stamp}", "Unedited originals exactly as served by iNaturalist. Nothing cropped, resized, background-removed or re-encoded.",
             f"{sum(1 for r in rows if r['file'])} of {len(rows)} photographs verified and included.", ""] + (report or ["No failed downloads, taxonomic mismatches or licence problems."])
    (out / "REPORT.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    for r in rows:
        print(r["photo_id"], "obs", r["observation_id"], r["license_code"], r["taxon_check"], r["size_served"], f"{r['width']}x{r['height']}", r["photographer"])
    return 0 if all(r["file"] for r in rows) else 2


if __name__ == "__main__":
    sys.exit(main())
