#!/usr/bin/env python3
"""Retro report: where did each of the owner's 19 photographs rank under v2 and v3, and why were the misses misses?
Reads evidence/blind-test/retro/<card>_<policy>/result.json. RESEARCH ONLY; nothing here is a weight or a rule.
  retro_report.py --dir evidence/blind-test/retro --probe evidence/blind-test/retrieval-probe/retrieval-probe.json --out <file.md>
"""
from __future__ import annotations

import json
import pathlib
import statistics as st
import sys

ROLES = ("main", "pixel", "tall")
KS = (1, 5, 20)


def survives(p: dict) -> bool:
    return p.get("rank") is not None          # `survives` was serialised as a string for numpy booleans; rank is authoritative


def cls(p: dict) -> str:
    if not p.get("in_pool"):
        return "retrieval"          # never in the candidate pool
    if not survives(p):
        return "stage-A" if p.get("hard") else "below-minimum-score"
    return "hit" if p["rank"] <= 20 else "ranking"


def main() -> int:
    a = sys.argv
    arg = lambda k: a[a.index(k) + 1]  # noqa: E731
    d = pathlib.Path(arg("--dir"))
    res = {}
    for pol in ("v2", "v3", "v4"):
        res[pol] = []
        for f in sorted(d.glob(f"*_{pol}/result.json")):
            r = json.load(open(f))
            for p in r.get("owner_picks", []):
                res[pol].append({**p, "species": r["scientific"], "pool_size": r["pool"], "survivors": r["survivors"]})
    probe = json.load(open(arg("--probe")))
    md = ["# Retro report: the owner's 19 photographs under v2 and v3", "",
          "Training batch (#62-66): v3's rules were chosen after seeing these picks, so this measures whether the changes repair the failures they were",
          "designed against. It does NOT show that v3 generalises; only the sealed blind batch can.", ""]
    n = len(res["v3"])
    pols = [x for x in ("v2", "v3", "v4") if res[x]]
    md += ["## Per-photograph ranks (rank among survivors for the role it was picked for; `-` = not in pool / rejected)", "",
           "| card | role | photo | v2 outcome | v2 rank | v3 outcome | v3 rank | v4 outcome | v4 rank | v4 view | v4 pool |", "|---|---|---|---|---|---|---|---|---|---|---|"]
    by = {pol: {(p["card"], p["picture"]): p for p in res[pol]} for pol in res}
    for key, p3 in sorted(by["v3"].items()):
        p2 = by["v2"].get(key, {})
        r2 = (f"{p2.get('rank')}/{p2.get('of')}" + ("" if p2.get("in_pool") else " (if retrieved)")) if p2.get("rank") else "-"
        r3 = (f"{p3.get('rank')}/{p3.get('of')}" + ("" if p3.get("in_pool") else " (if retrieved)")) if p3.get("rank") else "-"
        p4 = by["v4"].get(key, {})
        r4 = (f"{p4.get('rank')}/{p4.get('of')}" + ("" if p4.get("in_pool") else " (if retrieved)")) if p4.get("rank") else "-"
        md.append(f"| {p3['card']} | {p3['role']} | {p3['photo_id']} | {cls(p2) if p2 else '?'} | {r2} | {cls(p3)} | {r3} | {cls(p4) if p4 else '?'} | {r4} | {p4.get('view')} | {p4.get('pool_size')} |")
    md += ["", "## Top-k performance. END-TO-END counts a pick only if it was retrieved into the pool AND ranked within k among the role's survivors;",
           "## IF-RETRIEVED additionally scores the picks the pool missed (injected afterwards), so it isolates ranking from retrieval.", "",
           "| method | n | retrieved into pool | end-to-end top-1 | top-5 | top-20 | if-retrieved top-1 | top-5 | top-20 | median percentile (if retrieved) |", "|---|---|---|---|---|---|---|---|---|---|"]
    for pol in pols:
        P = res[pol]
        e2e = {k: sum(1 for p in P if p.get("in_pool") and survives(p) and p["rank"] <= k) for k in KS}
        cond = {k: sum(1 for p in P if survives(p) and p["rank"] <= k) for k in KS}
        pct = [p["percentile_from_top"] for p in P if p.get("percentile_from_top") is not None]
        md.append(f"| {pol} | {len(P)} | {sum(1 for p in P if p.get('in_pool'))} | {e2e[1]} | {e2e[5]} | {e2e[20]} | {cond[1]} | {cond[5]} | {cond[20]} | {st.median(pct):.2f} |")
    # baselines
    exp = {k: sum(min(k, p["of"]) / p["of"] for p in res["v3"] if survives(p)) for k in KS}
    md.append(f"| random order over v3 survivors (expected, if retrieved) | {n} | n/a | n/a | n/a | n/a | {exp[1]:.1f} | {exp[5]:.1f} | {exp[20]:.1f} | 0.50 |")
    pos = [v for s in probe["species"].values() for k, v in s["orderings"]["research | votes"]["positions"].items()]
    md.append(f"| iNaturalist vote order (observation level, not photo level) | {len(pos)} | 19/19 within 300 | n/a | n/a | n/a | {sum(1 for x in pos if x <= 1)} | {sum(1 for x in pos if x <= 5)} | {sum(1 for x in pos if x <= 20)} | n/a |")
    md += ["", "## Why each miss happened (v4)", "", "| failure stage | count | photos |", "|---|---|---|"]
    for stage in ("retrieval", "stage-A", "below-minimum-score", "ranking", "hit"):  # first match wins: a retrieval miss is not also a ranking miss
        ps = [p for p in res["v4"] if cls(p) == stage]
        md.append(f"| {stage} | {len(ps)} | {', '.join(f'{p['card']}/{p['role']}/{p['photo_id']}' for p in ps)} |")
    md += ["", "'retrieval' = never in the pool; 'stage-A' = hard-rejected; 'ranking' = survived but ranked beyond 20. Downstream failure (a photograph that ranks well but cannot",
           "be cut out or reduced to 24px) is not visible in these ranks; it is measured separately (owner feature study).", "",
           "## By role", "", "| role | v2 top-20 | v3 top-20 | v4 top-20 | v2 survives | v3 survives | v4 survives |", "|---|---|---|---|---|---|---|"]
    for r in ROLES:
        row = []
        for pol in ("v2", "v3", "v4"):
            P = [p for p in res[pol] if p["role"] == r]
            row.append((sum(1 for p in P if survives(p) and p["rank"] <= 20), sum(1 for p in P if survives(p)), len(P)))
        md.append(f"| {r} | {row[0][0]}/{row[0][2]} | {row[1][0]}/{row[1][2]} | {row[2][0]}/{row[2][2]} | {row[0][1]}/{row[0][2]} | {row[1][1]}/{row[1][2]} | {row[2][1]}/{row[2][2]} |")
    pathlib.Path(arg("--out")).write_text("\n".join(md) + "\n")
    print("\n".join(md))
    return 0


if __name__ == "__main__":
    sys.exit(main())
