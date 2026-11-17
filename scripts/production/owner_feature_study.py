#!/usr/bin/env python3
"""Measure the owner's picks, the v2/v3 top picks and a random sample of the pool with the SAME instrument, for one species.

RESEARCH ONLY. For every photograph: observation metadata (faves, annotations, agreements, photo position) and the pipeline's full-frame measurements plus the
finished-asset proxies it can compute without generating anything: cutout (mask) coherence/solidity/edge contact and the real 24x24 reduction of the
detected feature (colours, pieces, fill, legibility). Groups: owner, v3_top5, v2_top5, sample.
  owner_feature_study.py --picks <json> --retro <dir> --card 62 --sample 80 --out <dir>
"""
from __future__ import annotations

import json
import pathlib
import random
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F        # noqa: E402
from production import screen as S   # noqa: E402

ROLES = ("main", "pixel", "tall")
KIND = {62: "white", 63: "white", 64: "white", 65: "yellow", 66: "white"}


def flat(prefix, o, out):
    if isinstance(o, dict):
        for k, v in o.items():
            if k in ("touch", "box"):
                if k == "touch" and isinstance(v, dict):
                    out[f"{prefix}.n_touch"] = float(sum(bool(x) for x in v.values()))
                continue
            flat(f"{prefix}.{k}" if prefix else k, v, out)
    elif isinstance(o, bool):
        out[prefix] = float(o)
    elif isinstance(o, (int, float)):
        out[prefix] = float(o)


def main() -> int:
    a = sys.argv
    arg = lambda k, d=None: a[a.index(k) + 1] if k in a else d  # noqa: E731
    card = int(arg("--card"))
    picks = [p for p in json.load(open(arg("--picks")))["picks"] if p["card"] == card]
    rd = pathlib.Path(arg("--retro"))
    v3 = json.load(open(next(rd.glob(f"{card}_v3/result.json"))))
    v2 = json.load(open(next(rd.glob(f"{card}_v2/result.json"))))
    groups: dict[int, set] = {}
    obs_of: dict[int, int] = {}
    def add(pid, oid, g):
        groups.setdefault(pid, set()).add(g); obs_of[pid] = oid
    for p in picks:
        add(p["photo_id"], p["observation_id"], f"owner:{p['role']}")
    for pol, res in (("v3", v3), ("v2", v2)):
        for r in ROLES:
            for x in res["top12"][r][:5]:
                add(x["photo_id"], x["observation_id"], f"{pol}_top5:{r}")
    rng = random.Random(card)
    pool = [x for x in v3["pool_scores"] if x["photo_id"] not in groups]
    for x in rng.sample(pool, min(int(arg("--sample", 80)), len(pool))):
        add(x["photo_id"], x["observation_id"], "sample")
    # observation metadata + real photo urls in batches
    oids = sorted(set(obs_of.values()))
    obs = {}
    for i in range(0, len(oids), 100):
        ans = F.get(f"{F.API}/observations/{','.join(map(str, oids[i:i + 100]))}?per_page=200") or {}
        for o in ans.get("results", []):
            obs[o["id"]] = o
    work = pathlib.Path("_work") / str(card)
    rows = []
    for n, (pid, gs) in enumerate(sorted(groups.items())):
        o = obs.get(obs_of[pid])
        ph = next((x for x in (o or {}).get("photos", []) if x["id"] == pid), None)
        if not o or not ph:
            print("  missing metadata for", pid)
            continue
        ann = {(x.get("controlled_attribute_id"), x.get("controlled_value_id")) for x in o.get("annotations", [])}
        dims = ph.get("original_dimensions") or {}
        meta = {"photo_id": pid, "observation_id": o["id"], "groups": sorted(gs), "faves": o.get("faves_count") or 0,
                "flowering_annotated": (12, 13) in ann, "fruiting_annotated": (12, 14) in ann, "agreements": o.get("num_identification_agreements") or 0,
                "photos_on_observation": len(o.get("photos", [])), "position_in_observation": [x["id"] for x in o["photos"]].index(pid) + 1,
                "width": dims.get("width"), "height": dims.get("height")}
        p = {"photo_id": pid, "urls": {s: F.photo_url(ph, s) for s in F.SIZES}}
        F.download([p], work, prefer="large")
        if not p.get("file"):
            continue
        try:
            rgb = S.load_work(work / p["file"])
            ev = S.evaluate(rgb, max(meta["width"] or 0, meta["height"] or 0) or 2048, KIND[card], S.default_mask_fn, policy="v3")
        except Exception as e:  # noqa: BLE001
            print("  error", pid, str(e)[:80]); continue
        feats: dict = {}
        flat("m", ev.get("measure") or {}, feats)
        flat("px", {k: v for k, v in (ev.get("pixel_test") or {}).items()}, feats)
        feats["hands.frac"] = float((ev.get("hands") or {}).get("frac") or 0.0)
        feats["frame.aspect_w_over_h"] = round(rgb.shape[1] / rgb.shape[0], 3)
        rows.append({**meta, "features": feats, "common_hard": ev.get("common_hard"), "no_subject": any("no_subject" in h for h in ev.get("common_hard", []))})
        if n % 20 == 0:
            print(f"  {n}/{len(groups)}", flush=True)
    out = pathlib.Path(arg("--out")); out.mkdir(parents=True, exist_ok=True)
    (out / f"features_{card}.json").write_text(json.dumps({"card": card, "rows": rows}, indent=1))
    print("rows", len(rows))
    return 0


if __name__ == "__main__":
    sys.exit(main())
