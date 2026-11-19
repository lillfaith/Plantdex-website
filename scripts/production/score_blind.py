#!/usr/bin/env python3
"""Score every sealed pipeline version against the owner's blind-batch picks. RESEARCH ONLY: changes no weight, rule or card.
  score_blind.py --root evidence/blind-test/77-81 --picks evidence/blind-test/owner-picks-77-81/matches-browsing --out <dir>
Each pick is a photograph (identified by exact image match). Per version, card and role it is ranked among the NON-REJECTED pool photographs by that
role's score (rank 1 = best; ties share the best rank). Outcomes: `not retrieved` (never in the version's pool), `rejected` (in pool, rejected for the role),
or a rank. Percentile = rank / number ranked (lower is better). A role may have several picks: each is scored separately."""
from __future__ import annotations

import json
import pathlib
import statistics as st
import sys

VERS = ("v2", "v3", "v4", "v4.1", "v4.2", "v4.3")
ROLES = ("main", "pixel", "tall")


def load_picks(d: pathlib.Path) -> list[dict]:
    out = []
    for f in sorted(d.glob("*.json")):
        m = json.load(open(f))
        if m["card"] == 76:
            continue                      # not part of the sealed blind batch
        for fn, x in m["matches"].items():
            if x["matched"]:
                b = x["best"]
                out.append({"card": m["card"], "role": x["role"], "photo_id": b["photo_id"], "observation_id": b["observation_id"], "license": b["license"], "file": fn})
            else:
                out.append({"card": m["card"], "role": x["role"], "photo_id": None, "file": fn})
    return out


def score(res: dict, pick: dict) -> dict:
    role = pick["role"]
    rows = {r["photo_id"]: r for r in res["pool_scores"]}
    r = rows.get(pick["photo_id"])
    if r is None:
        return {"outcome": "not retrieved"}
    s = r["scores"][role]
    if s.get("rejected"):
        return {"outcome": "rejected", "hard": s.get("hard"), "score": s.get("score")}
    ranked = sorted((x["scores"][role]["score"] for x in res["pool_scores"] if not x["scores"][role].get("rejected")), reverse=True)
    rank = 1 + sum(1 for v in ranked if v > s["score"])
    return {"outcome": "ranked", "rank": rank, "of": len(ranked), "pct": round(rank / len(ranked), 4), "score": s["score"], "flags": s.get("flags")}


def main() -> int:
    a = sys.argv
    arg = lambda k: a[a.index(k) + 1]  # noqa: E731
    root = pathlib.Path(arg("--root"))
    picks = load_picks(pathlib.Path(arg("--picks")))
    out = pathlib.Path(arg("--out")); out.mkdir(parents=True, exist_ok=True)
    table = {v: [] for v in VERS}
    pools = {}
    for v in VERS:
        for card in (77, 78, 79, 80, 81):
            f = root / f"{card}_{v}" / "result.json"
            if not f.exists():
                continue
            res = json.load(open(f)); pools[(v, card)] = res["pool"]
            for p in picks:
                if p["card"] == card and p["photo_id"]:
                    table[v].append({**p, **score(res, p), "pool": res["pool"]})
    json.dump({"picks": picks, "scores": table}, open(out / "blind-scores.json", "w"), indent=1)
    md = ["# Blind batch #77-81: sealed versions scored against the owner's picks", "",
          "Picks identified by exact image match (see evidence/blind-test/owner-picks-77-81/). Rank = position among non-rejected pool photographs for the role the pick was chosen for.", ""]
    md += ["## Per-pick results", "", "| card | role | photo | " + " | ".join(VERS) + " |", "|---|---|---|" + "---|" * len(VERS)]
    keys = [(p["card"], p["role"], p["photo_id"]) for p in picks if p["photo_id"]]
    by = {v: {(r["card"], r["role"], r["photo_id"]): r for r in table[v]} for v in VERS}
    for k in keys:
        cells = []
        for v in VERS:
            r = by[v].get(k)
            cells.append("n/a" if r is None else ("not retrieved" if r["outcome"] == "not retrieved" else "rejected" if r["outcome"] == "rejected" else f"{r['rank']}/{r['of']} ({r['pct']:.0%})"))
        lic = next((p["license"] for p in picks if (p["card"], p["role"], p["photo_id"]) == k), "")
        md.append(f"| {k[0]} | {k[1]} | {k[2]} ({lic}) | " + " | ".join(cells) + " |")
    md += ["", "## Summary (all picks the version produced a result for; v4 exists only for #77-79)", "",
           "| version | picks | retrieved | ranked (not rejected) | top-1 | top-3 | top-12 | median pct (ranked) | mean pct (ranked) |", "|---|---|---|---|---|---|---|---|---|"]
    for v in VERS:
        T = table[v]
        if not T:
            continue
        ranked = [r for r in T if r["outcome"] == "ranked"]
        ret = [r for r in T if r["outcome"] != "not retrieved"]
        h = lambda k: sum(1 for r in ranked if r["rank"] <= k)  # noqa: E731
        pc = [r["pct"] for r in ranked]
        md.append(f"| {v} | {len(T)} | {len(ret)} | {len(ranked)} | {h(1)} | {h(3)} | {h(12)} | {st.median(pc):.0%} | {st.mean(pc):.0%} |" if pc else f"| {v} | {len(T)} | {len(ret)} | 0 | 0 | 0 | 0 | - | - |")
    md += ["", "## By role (top-12 hits / picks)", "", "| version | " + " | ".join(ROLES) + " |", "|---|---|---|---|"]
    for v in VERS:
        T = table[v]
        if T:
            md.append(f"| {v} | " + " | ".join(f"{sum(1 for r in T if r['role']==ro and r['outcome']=='ranked' and r['rank']<=12)}/{sum(1 for r in T if r['role']==ro)}" for ro in ROLES) + " |")
    md += ["", "## Comparable subset: #77-79 only (every version has results)", "", "| version | picks | retrieved | top-3 | top-12 | median pct |", "|---|---|---|---|---|---|"]
    for v in VERS:
        T = [r for r in table[v] if r["card"] in (77, 78, 79)]
        ranked = [r for r in T if r["outcome"] == "ranked"]
        if T:
            md.append(f"| {v} | {len(T)} | {sum(1 for r in T if r['outcome']!='not retrieved')} | {sum(1 for r in ranked if r['rank']<=3)} | {sum(1 for r in ranked if r['rank']<=12)} | {(f'{st.median([r['pct'] for r in ranked]):.0%}' if ranked else '-')} |")
    (out / "blind-report.md").write_text("\n".join(md) + "\n")
    print("\n".join(md))
    return 0


if __name__ == "__main__":
    sys.exit(main())
