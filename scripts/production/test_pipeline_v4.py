#!/usr/bin/env python3
"""Offline tests for the v4 policy.   python3 scripts/production/test_pipeline_v4.py"""
from __future__ import annotations

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from production import rank as R, screen as S, search2 as SE   # noqa: E402

PASS, FAIL = [], []


def check(ok, label):
    (PASS if ok else FAIL).append(label)
    print(("PASS  " if ok else "FAIL  ") + label)


# weights: removing a term introduces no new number
check(abs(sum(R.TALL_WEIGHTS_V4.values()) - 1.0) < 1e-9 and "plain_background" not in R.TALL_WEIGHTS_V4, "v4 tall weights sum to 1 and the plain-background term is gone")
for k, v in R.TALL_WEIGHTS_V4.items():
    check(abs(v / R.TALL_WEIGHTS[k] - 1 / (1 - R.TALL_WEIGHTS["plain_background"])) < 1e-9, f"v4 tall weight '{k}' keeps its proportion")
check(abs(sum(R.TALL_WEIGHTS.values()) - 1.0) < 1e-9, "v2 tall weights are untouched")

# frame-level resolution rule: v2/v3 keep it, v4 does not apply it
m = {"coverage": 0.2, "lap_var": 100.0, "largest": {"n_touch": 0, "aspect_h_over_w": 1.5}}
h2, _ = S._common(m, 900, {"checked": True}, "v2")
h4, _ = S._common(m, 900, {"checked": True}, "v4")
check(any(x.startswith("low_resolution") for x in h2), "v2 still rejects a 900px frame")
check(not any(x.startswith("low_resolution") for x in h4), "v4 does not apply the frame-level floor")

# per-role floors come from the finished asset's geometry
ev = {"measure": {"largest": {"box": [0, 0, 100, 200]}, "flower_blob": {"box": [0, 0, 30, 30]}}, "roles": {r: {"hard": []} for r in ("main", "pixel", "tall")}}
S.role_floors(ev, (768, 576), 1536)       # scale 2: subject 200x400 px, feature 60 px
check(any("role_floor_main" in x for x in ev["roles"]["main"]["hard"]), "a 400px subject fails the 593px main floor")
check(any("role_floor_tall" in x for x in ev["roles"]["tall"]["hard"]), "a 400px-tall subject fails the 455px tall floor")
check(ev["roles"]["pixel"]["hard"] == [], "a 60px feature passes the 48px pixel floor")
ev2 = {"measure": {"largest": {"box": [0, 0, 300, 400]}, "flower_blob": {"box": [0, 0, 10, 10]}}, "roles": {r: {"hard": []} for r in ("main", "pixel", "tall")}}
S.role_floors(ev2, (768, 576), 1536)       # subject 600x800 passes main and tall; feature 20px fails pixel
check(ev2["roles"]["main"]["hard"] == [] and ev2["roles"]["tall"]["hard"] == [] and len(ev2["roles"]["pixel"]["hard"]) == 1, "large subject passes main/tall, tiny feature fails pixel")

# pixel legibility carries no weight in v4, full weight otherwise
fb = {"cropped": False, "area": 0.06, "solidity": 0.8, "n_significant": 1, "ring_delta_e": 35, "ring_green_share": 0.1}
j_lo = S.judge_pixel({"flower_blob": fb}, {"legibility": 0.0}, "v4")["suitability"]
j_hi = S.judge_pixel({"flower_blob": fb}, {"legibility": 1.0}, "v4")["suitability"]
check(abs(j_lo - j_hi) < 1e-9, "v4 pixel suitability ignores the 24px legibility proxy")
check(S.judge_pixel({"flower_blob": fb}, {"legibility": 0.0})["suitability"] < S.judge_pixel({"flower_blob": fb}, {"legibility": 1.0})["suitability"], "v2 pixel suitability still uses it")

# retrieval
check(SE.V4_SOURCES[0][1] == {"order_by": "votes"} and SE.V4_SOURCES[0][2] >= 2, "v4 reads the votes list 400 observations deep")
import inspect
check("per_obs" not in inspect.getsource(SE.build_pool_v4), "v4 has no per-observation photograph cap")
check("min_edge" in inspect.signature(SE.photos_of).parameters and SE.V4_MIN_EDGE < SE.MIN_ORIG_EDGE, "v4 pool floor is below the v2 floor and set through min_edge")
print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
sys.exit(1 if FAIL else 0)
