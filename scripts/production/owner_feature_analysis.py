#!/usr/bin/env python3
"""Do the owner's picks differ from the AVAILABLE ALTERNATIVES, and on what? Permutation tests over the measurements from owner_feature_study.py.

RESEARCH ONLY. No weights, rules or thresholds are produced. For every metadata field and measurement, the owner's picks for a role are compared with
the random pool sample: the statistic is the mean, the null is the same statistic for random draws of the same size from the sample (20,000 draws). With
n = 3-8 picks per role and ~100 tests, most nominal p-values are chance; Bonferroni-significant results are called out and everything else is a hypothesis.
  owner_feature_analysis.py --dir evidence/blind-test/features --out <file.md>
"""
from __future__ import annotations

import json
import pathlib
import sys

import numpy as np

ROLES = ("main", "pixel", "tall")
META = ["flowering_annotated", "fruiting_annotated", "has_faves", "agreements_2plus", "multi_photo_observation", "is_cover_photo"]
SKIP = ("m.n_components", "m.coverage")


def load(d: pathlib.Path):
    rows = []
    for f in sorted(d.glob("features_*.json")):
        for r in json.load(open(f))["rows"]:
            r["card"] = json.load(open(f))["card"]
            r["features"].update({"flowering_annotated": float(r["flowering_annotated"]), "fruiting_annotated": float(r["fruiting_annotated"]),
                                  "has_faves": float(r["faves"] > 0), "agreements_2plus": float(r["agreements"] >= 2),
                                  "multi_photo_observation": float(r["photos_on_observation"] > 1), "is_cover_photo": float(r["position_in_observation"] == 1),
                                  "photos_on_observation": float(r["photos_on_observation"]), "orig_long_edge": float(max(r["width"] or 0, r["height"] or 0))})
            rows.append(r)
    return rows


def perm(owner: np.ndarray, pool: np.ndarray, n_draw: int = 20000, seed: int = 1):
    rng = np.random.default_rng(seed)
    obs = owner.mean()
    null = np.array([rng.choice(pool, size=len(owner), replace=False).mean() for _ in range(n_draw)])
    p = float((np.abs(null - null.mean()) >= abs(obs - null.mean())).mean())
    return obs, float(null.mean()), max(p, 1 / n_draw)


def main() -> int:
    a = sys.argv
    arg = lambda k: a[a.index(k) + 1]  # noqa: E731
    rows = load(pathlib.Path(arg("--dir")))
    sample = [r for r in rows if "sample" in r["groups"]]
    md = ["# Owner picks vs available alternatives (permutation tests)", "",
          f"Random pool sample: {len(sample)} photographs across 5 species. Owner picks: {sum(1 for r in rows if any(g.startswith('owner') for g in r['groups']))}.",
          "Mean of each feature for the owner's picks vs the same statistic for random draws of the same size. p = two-sided permutation p. **Bonferroni threshold is stated per table; nominal p-values below it are chance-prone.**", ""]
    # ---- observation-level metadata (all roles together: 19 picks) --------------------------------------------------------
    own_all = [r for r in rows if any(g.startswith("owner") for g in r["groups"])]
    md += ["## Observation and photo metadata (all 19 picks; is any of it a *signal*, or just how iNaturalist photos look?)", "", "| field | owner mean | random-photo mean | p |", "|---|---|---|---|"]
    keys = META + ["photos_on_observation", "orig_long_edge"]
    for k in keys:
        o = np.array([r["features"][k] for r in own_all]); s = np.array([r["features"][k] for r in sample])
        if k == "is_cover_photo":      # fair comparison: among photographs on multi-photo observations only
            o = np.array([r["features"][k] for r in own_all if r["photos_on_observation"] > 1]); s = np.array([r["features"][k] for r in sample if r["photos_on_observation"] > 1])
            label = f"{k} (multi-photo observations only; owner n={len(o)})"
        else:
            label = k
        if len(o) == 0 or len(s) == 0:
            continue
        ob, nm, p = perm(o, s)
        md.append(f"| {label} | {ob:.2f} | {nm:.2f} | {p:.3f} |")
    # ---- visual / finished-asset features, per role -----------------------------------------------------------------------
    feats = sorted({k for r in rows for k in r["features"] if k.startswith(("m.", "px.", "frame.", "hands."))} - set(SKIP))
    for role in ROLES:
        own = [r for r in rows if f"owner:{role}" in r["groups"]]
        if len(own) < 3:
            continue
        results = []
        for k in feats:
            o = np.array([r["features"][k] for r in own if k in r["features"]]); s = np.array([r["features"][k] for r in sample if k in r["features"]])
            if len(o) < 3 or len(s) < 30 or np.ptp(s) == 0:
                continue
            ob, nm, p = perm(o, s)
            results.append((p, k, ob, nm, len(o), float((s <= o.mean()).mean())))
        results.sort()
        bonf = 0.05 / max(1, len(results))
        md += ["", f"## {role}: owner picks (n={len(own)}) vs sample; {len(results)} features tested; Bonferroni threshold {bonf:.4f}", "",
               "| feature | owner mean | sample mean | owner mean's percentile in sample | p | passes Bonferroni |", "|---|---|---|---|---|---|"]
        for p, k, ob, nm, n, pc in results[:14]:
            md.append(f"| {k} | {ob:.3f} | {nm:.3f} | {pc:.2f} | {p:.4f} | {'YES' if p < bonf else 'no'} |")
    # ---- finished-asset proxies: owner vs v3 top5 vs v2 top5 vs sample, same role --------------------------------------------
    proxies = ["m.largest.coherence", "m.largest.solidity", "m.largest.n_touch", "m.bg_busy", "m.boundary_delta_e", "m.flower_share", "m.stalk_like_components",
               "px.legibility", "px.colours", "px.components", "px.bbox_fill", "px.opaque_fraction", "hands.frac", "frame.aspect_w_over_h"]
    md += ["", "## Finished-asset proxies by group (cutout and real 24x24 reduction; automatic measurements, not a visual verdict)", ""]
    for role in ROLES:
        md += [f"### {role}", "", "| proxy | owner | v3 top-5 | v2 top-5 | random sample |", "|---|---|---|---|---|"]
        for k in proxies:
            cells = []
            for g in (f"owner:{role}", f"v3_top5:{role}", f"v2_top5:{role}", "sample"):
                v = [r["features"][k] for r in rows if g in r["groups"] and k in r["features"]]
                cells.append(f"{np.mean(v):.2f} (n={len(v)})" if v else "-")
            md.append(f"| {k} | " + " | ".join(cells) + " |")
        md.append("")
    md += ["No-subject rate (segmenter found nothing): " + ", ".join(f"{g} {np.mean([r['no_subject'] for r in rows if g in r['groups']]):.2f}" for g in ("owner:main", "owner:pixel", "owner:tall", "v3_top5:main", "v3_top5:pixel", "v3_top5:tall", "sample"))]
    pathlib.Path(arg("--out")).write_text("\n".join(md) + "\n")
    print("\n".join(md))
    return 0


if __name__ == "__main__":
    sys.exit(main())
