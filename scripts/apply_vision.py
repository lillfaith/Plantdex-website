#!/usr/bin/env python3
"""Re-rank candidates using the vision verdicts, and print before vs after.

The cheap pipeline's ranking is the input, not the answer. A verdict of
`meets_brief: false` REMOVES a candidate however well it scored on pixels -- that is the
whole point, since the errors being corrected (a flower facing away, a crop that lost the
identifying spike) are invisible to every cheap measurement. Among survivors the model's
quality score breaks ties the pixel score could not.

    python3 scripts/apply_vision.py --species matricaria_chamomilla
"""
from __future__ import annotations

import argparse, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
VISION_WEIGHT = 6.0            # points per quality point; enough to reorder, not to dominate


def apply(species: str) -> dict | None:
    base = ROOT / "evidence" / "candidates" / species
    cand, vis = base / "candidates.json", base / "vision.json"
    if not cand.exists() or not vis.exists():
        return None
    doc = json.loads(cand.read_text())
    verdicts = {r["photo_id"]: r for r in json.loads(vis.read_text())["rows"]}
    before = [(s["photo_id"], s["score"]) for s in doc["selected"]]
    after = []
    for s in doc["selected"]:
        v = verdicts.get(s["photo_id"])
        if v is None:
            after.append((s["photo_id"], s["score"], "not reviewed", None))
            continue
        if not v["meets_brief"]:
            after.append((s["photo_id"], None, "REJECTED by vision: " + v["why"], v))
            continue
        after.append((s["photo_id"], round(s["score"] + (v.get("quality") or 0) * VISION_WEIGHT, 1),
                      v["why"], v))
    kept = sorted([a for a in after if a[1] is not None], key=lambda a: -a[1])
    dropped = [a for a in after if a[1] is None]
    return {"species": species, "before": before, "kept": kept, "dropped": dropped,
            "usd": json.loads(vis.read_text()).get("usd", 0.0)}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--species", nargs="+", required=True)
    a = ap.parse_args()
    total = 0.0
    for sp in a.species:
        r = apply(sp)
        if r is None:
            print(f"\n{sp}: no candidates or no vision pass")
            continue
        total += r["usd"]
        print(f"\n=== {sp} ===")
        print("  BEFORE (pixels only):")
        for i, (pid, sc) in enumerate(r["before"], 1):
            print(f"     {i}. {sc:6.1f}  {pid}")
        print("  AFTER (vision applied):")
        for i, (pid, sc, why, v) in enumerate(r["kept"], 1):
            print(f"     {i}. {sc:6.1f}  {pid}  q={v.get('quality')} "
                  f"orientation={v.get('orientation')}")
        for pid, _, why, v in r["dropped"]:
            print(f"     --  DROPPED {pid}: {why}")
    print(f"\ntotal vision spend across {len(a.species)} species: ${total:.4f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
