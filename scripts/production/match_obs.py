#!/usr/bin/env python3
"""Identify owner-picked images among the photographs of the observations the owner visited (browsing history). RESEARCH ONLY.
  match_obs.py --obs <json card->[observation ids]> --images <dir> --maps <dir with map_<card>.json> --out <dir>
Every photograph of every listed observation is downloaded at `large` (public API) and compared with each picked image of that card
(normalised correlation of a 48x48 greyscale thumbnail). Reports photo id, observation id, licence and species for each match."""
from __future__ import annotations

import io
import json
import pathlib
import sys
import time
import urllib.request

from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from match_picks import thumb, dhash  # noqa: E402


def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "plantdex-dev-pick-match"}), timeout=60) as r:
                return r.read()
        except Exception:
            time.sleep(2 + i * 3)
    return None


def main() -> int:
    a = sys.argv
    arg = lambda k: a[a.index(k) + 1]  # noqa: E731
    obs = json.load(open(arg("--obs")))
    out = pathlib.Path(arg("--out")); out.mkdir(parents=True, exist_ok=True)
    for card, ids in obs.items():
        picks = json.load(open(pathlib.Path(arg("--maps")) / f"map_{card}.json"))
        pt = {f: (thumb(Image.open(pathlib.Path(arg("--images")) / f).convert("RGB")), dhash(Image.open(pathlib.Path(arg("--images")) / f).convert("RGB"))) for f in picks}
        raw = get("https://api.inaturalist.org/v1/observations?id=" + ",".join(map(str, ids)) + "&per_page=50&locale=en")
        results = (json.loads(raw) if raw else {}).get("results", [])
        best = {f: [] for f in picks}
        photos = []
        for o in results:
            for p in o.get("photos", []):
                url = (p.get("url") or "").replace("/square.", "/large.")
                data = get(url)
                if not data:
                    continue
                im = Image.open(io.BytesIO(data)).convert("RGB")
                t, h = thumb(im), dhash(im)
                photos.append({"photo_id": p["id"], "observation_id": o["id"], "license": p.get("license_code"), "taxon": (o.get("taxon") or {}).get("name"), "size": list(im.size)})
                for f, (pt_, ph) in pt.items():
                    best[f].append((float((t * pt_).sum()), int((h != ph).sum()), p["id"], o["id"], p.get("license_code")))
        res = {"card": int(card), "observations_found": len(results), "observations_asked": len(ids), "photos_checked": len(photos), "matches": {}}
        for f, lst in best.items():
            lst.sort(reverse=True)
            top = lst[0] if lst else None
            res["matches"][f] = {"role": picks[f], "matched": bool(top and top[0] >= 0.97),
                                  "best": ({"photo_id": top[2], "observation_id": top[3], "license": top[4], "ncc": round(top[0], 4), "dhash_dist": top[1]} if top else None)}
            print(card, f, picks[f], res["matches"][f]["matched"], res["matches"][f]["best"], flush=True)
        (out / f"{card}.json").write_text(json.dumps(res, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
