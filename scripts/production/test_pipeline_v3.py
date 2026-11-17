#!/usr/bin/env python3
"""Offline tests for the v3 policy. No network, no segmenter: masks are synthetic.   python3 scripts/production/test_pipeline_v3.py"""
from __future__ import annotations

import pathlib
import sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from production import rank as R, screen as S, search2 as SE   # noqa: E402

PASS, FAIL = [], []


def check(ok, label):
    (PASS if ok else FAIL).append(label)
    print(("PASS  " if ok else "FAIL  ") + label)


# 1. v2 is unchanged, v3 softens exactly the six named rules and nothing else
h = ["hands: x (skin 20%)", "tall_clipped_top: y", "low_resolution: 900px", "no_subject: z", "too_soft: 3", "main_clipped: a", "dense_patch: d"]
hard2, fl2 = S.soften(list(h), [], "v2")
check(hard2 == h and fl2 == [], "v2 policy leaves every rejection in place")
hard3, fl3 = S.soften(list(h), [], "v3")
check(sorted(x.split(":")[0] for x in hard3) == ["dense_patch", "low_resolution", "no_subject", "too_soft"], "v3 keeps only resolution, sharpness, no-subject and dense-patch rejections")
check(len(fl3) == 3 and all(f.startswith("needs_crop_or_edit(") for f in fl3), "v3 turns hands, clipped-top and main-clipped into flags")

# 2. crop boxes always contain the subject box
def ev_with(box):
    return {"measure": {"largest": {"box": list(box)}}, "common_hard": []}
rgb = np.zeros((600, 900, 3), np.uint8)
for box in [(300, 100, 60, 400), (10, 10, 100, 100), (700, 450, 190, 140)]:
    crops = S.crop_boxes(rgb, ev_with(box), "white")
    ok = bool(crops) and all(c[0] <= box[0] and c[1] <= box[1] and c[0] + c[2] >= box[0] + box[2] and c[1] + c[3] >= box[1] + box[3] for _, c in crops)
    check(ok, f"subject crop contains the subject box {box}")
check(S.crop_boxes(rgb, ev_with((0, 0, 900, 600)), "white") == [], "a crop that is nearly the whole frame is not offered")

# 3. with no subject, a flower cluster yields a crop
img = np.full((600, 900, 3), (40, 90, 40), np.uint8)
img[200:260, 400:470] = (250, 250, 250)
crops = S.crop_boxes(img, {"measure": {"largest": None}, "common_hard": ["no_subject: none"]}, "white")
check(any(l.startswith("flower-cluster") and c[0] <= 400 and c[1] <= 200 and c[0] + c[2] >= 470 and c[1] + c[3] >= 260 for l, c in crops), "no-subject photos get a flower-cluster crop that contains the cluster")

# 4. joint assignment: distinct photos and observations, later triples never reuse a photo
def row(pid, obs, m, p, t):
    mk = lambda s: {"score": s, "rejected": s is None}
    return {"photo_id": pid, "observation_id": obs, "scores": {"main": mk(m or 0) if m else {"score": 0, "rejected": True}, "pixel": mk(p or 0) if p else {"score": 0, "rejected": True}, "tall": mk(t or 0) if t else {"score": 0, "rejected": True}}}
rows = [row(1, 10, 90, 88, 89), row(2, 11, 85, 80, 70), row(3, 12, 60, 86, 60), row(4, 13, 70, 60, 84), row(5, 14, 80, 70, 70), row(6, 15, 75, 75, 75), row(7, 16, 72, 72, 72), row(8, 17, 71, 71, 71)]
tr = R.joint_top3(rows)
first = tr[0]
check(len({first["main"], first["pixel"], first["tall"]}) == 3, "a triple never uses one photograph for two roles")
used = [x for t in tr for x in (t["main"], t["pixel"], t["tall"])]
check(len(used) == len(set(used)), "later triples never reuse a photograph an earlier triple took")
rows2 = [row(1, 10, 90, 90, 90), row(2, 10, 89, 89, 89), row(3, 11, 50, 50, 50)]
check(R.joint_top3(rows2) == [] or len({1, 2} & {R.joint_top3(rows2)[0]["main"], R.joint_top3(rows2)[0]["pixel"]}) <= 1, "one observation is not used twice inside a triple")

# 5. retrieval: v3 adds fruit and bud queries and does not sort flowering-first; v2 unchanged
check(len(SE.QUERIES) == 5 and len(SE.QUERIES_V3_EXTRA) == 2, "v2 keeps its five queries; v3 adds fruiting and budding")
import inspect
check("policy != \"v3\"" in inspect.getsource(SE.build_pool), "the flowering-first ordering is v2-only")

print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
sys.exit(1 if FAIL else 0)
