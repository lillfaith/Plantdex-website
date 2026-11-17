#!/usr/bin/env python3
"""For each of the owner's 19 pictures: how many photos does its observation have, and which position is the chosen one? RESEARCH ONLY.
  pick_position_probe.py --picks evidence/blind-test/owner-picks-62-66.json --out <dir>"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import fetch_inat_photos as F  # noqa: E402

a = sys.argv
picks = json.load(open(a[a.index("--picks") + 1]))["picks"]
out = pathlib.Path(a[a.index("--out") + 1]); out.mkdir(parents=True, exist_ok=True)
rows = []
for pk in picks:
    obs = ((F.get(f"{F.API}/observations/{pk['observation_id']}") or {}).get("results") or [{}])[0]
    ids = [p["id"] for p in obs.get("photos", [])]
    rows.append({**pk, "photos_on_observation": len(ids), "position_of_pick": ids.index(pk["photo_id"]) + 1 if pk["photo_id"] in ids else None,
                 "faves": obs.get("faves_count"), "comments": obs.get("comments_count"), "annotated_flowering": any(
                     x.get("controlled_attribute_id") == 12 and x.get("controlled_value_id") == 13 for x in obs.get("annotations", [])),
                 "num_agreements": obs.get("num_identification_agreements")})
    print(pk["card"], pk["role"], "photos", len(ids), "pos", rows[-1]["position_of_pick"], "faves", rows[-1]["faves"], "flowering-annotated", rows[-1]["annotated_flowering"], "agree", rows[-1]["num_agreements"])
(out / "pick-positions.json").write_text(json.dumps(rows, indent=1))
