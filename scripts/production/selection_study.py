#!/usr/bin/env python3
"""Compare the owner's hand-picked photographs (#62-66) with what the ranking pipeline chose.

RESEARCH ONLY. Reads the search run's own records (species-result.json) and the candidate originals; writes a
report. It changes no card, asset, ranking weight or database row, and it fits nothing: every number below is a
direct readout of a measurement the pipeline already made, so the study cannot flatter the pipeline by tuning it.

Inputs   --species <dir with the v2-species-* artifacts>   --request evidence/photo-fetch/request.json
         --picks evidence/selection-study/picks            --out <dir>
Outputs  results.json, TABLES.md, sheets/<card>_<role>.jpg (owner pick | pipeline #1 | #2 | #3, with ids and scores)
"""
from __future__ import annotations

import glob
import json
import pathlib
import statistics as st
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROLES = ("main", "pixel", "tall")
PICK_ROLE = {"main": "main", "pixel": "pixel", "preview": "tall"}
PICK_CARD = {"buckwheat": 62, "wildquinine": 63, "sweeteverlasting": 64, "americanlotus": 65, "annualfleabane": 66}


def flat(prefix: str, o, out: dict):
    if isinstance(o, dict):
        for k, v in o.items():
            flat(f"{prefix}.{k}" if prefix else k, v, out)
    elif isinstance(o, bool):
        out[prefix] = float(o)
    elif isinstance(o, (int, float)):
        out[prefix] = float(o)


def load_species(root: pathlib.Path) -> dict[int, dict]:
    res = {}
    for f in root.rglob("species-result.json"):
        d = json.loads(f.read_text())
        d["_dir"] = f.parent
        res[d["card"]] = d
    return res


def original_path(sp: dict, c: dict) -> pathlib.Path | None:
    for sub in ("originals", "approved-sources"):
        hit = glob.glob(str(sp["_dir"] / sub / f"*{c['photo_id']}*"))
        if hit:
            return pathlib.Path(hit[0])
    return None


def features(c: dict, role: str) -> dict:
    out: dict = {}
    sc = c["scores"][role]
    out["score"] = sc.get("score", 0.0)
    flat("part", sc.get("parts", {}), out)
    flat("m", c.get("measure") or {}, out)
    if role == "pixel":
        flat("px", c.get("pixel_test") or {}, out)
    out["flag_count"] = float(len(sc.get("flags", [])))
    out["agreements"] = float(c.get("identification_agreements") or 0)
    out["long_edge"] = float(max(c.get("width") or 0, c.get("height") or 0))
    return out


def match_pick(pick: pathlib.Path, cands: list[tuple[dict, pathlib.Path]]):
    """Which candidate original is this (resized/cropped) picture? ORB features + RANSAC inliers."""
    orb = cv2.ORB_create(2500)
    def prep(p):
        im = cv2.imread(str(p), cv2.IMREAD_GRAYSCALE)
        s = 900 / max(im.shape)
        return cv2.resize(im, None, fx=s, fy=s, interpolation=cv2.INTER_AREA) if s < 1 else im
    kp, des = orb.detectAndCompute(prep(pick), None)
    best = (0, None)
    bf = cv2.BFMatcher(cv2.NORM_HAMMING)
    for c, path in cands:
        k2, d2 = orb.detectAndCompute(prep(path), None)
        if des is None or d2 is None or len(k2) < 8:
            continue
        good = [m for m, n in (p for p in bf.knnMatch(des, d2, k=2) if len(p) == 2) if m.distance < 0.75 * n.distance]
        if len(good) < 10:
            continue
        src = np.float32([kp[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
        dst = np.float32([k2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
        _, mask = cv2.findHomography(src, dst, cv2.RANSAC, 6.0)
        inl = int(mask.sum()) if mask is not None else 0
        if inl > best[0]:
            best = (inl, c)
    return best


def font(n):
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", n)
    except OSError:
        return ImageFont.load_default()


def sheet(cells: list[tuple[pathlib.Path | None, str]], out: pathlib.Path):
    cw, ch = 360, 520
    W = Image.new("RGB", (cw * len(cells), ch + 60), "white")
    d = ImageDraw.Draw(W)
    for i, (p, cap) in enumerate(cells):
        if p and p.exists():
            im = Image.open(p).convert("RGB"); im.thumbnail((cw - 8, ch))
            W.paste(im, (i * cw + 4, 56))
        for j, line in enumerate(cap.split("\n")):
            d.text((i * cw + 6, 4 + j * 15), line, fill="black", font=font(12))
    W.save(out, quality=82)


def main() -> int:
    a = sys.argv
    arg = lambda k: a[a.index(k) + 1]  # noqa: E731
    species = load_species(pathlib.Path(arg("--species")))
    request = json.load(open(arg("--request")))
    picks = pathlib.Path(arg("--picks"))
    out = pathlib.Path(arg("--out")); (out / "sheets").mkdir(parents=True, exist_ok=True)
    results: dict = {"cards": {}, "aggregate": {}, "picks_matched": []}
    paired: dict[str, list[tuple[dict, dict]]] = {r: [] for r in ROLES}   # (owner-pick features, pipeline-top features)
    gaps: dict[str, list[float]] = {r: [] for r in ROLES}
    for row in request["cards"]:
        n = row["card"]
        sp = species[n]
        by_id = {c["photo_id"]: c for c in sp["candidates"]}
        card = {"scientific": row["scientific"], "pool": sp.get("pool"), "roles": {}}
        # the same photograph recommended for several roles = repeated selection
        card["role_overlap"] = {c["photo_id"]: c["shortlisted_for"] for c in sp["candidates"] if len(c["shortlisted_for"]) > 1}
        for role in ROLES:
            pid = row["photos"][role]
            short = sorted([c for c in sp["candidates"] if role in c["shortlisted_for"]], key=lambda c: -c["scores"][role]["score"])
            pick = by_id.get(pid)
            info: dict = {"owner_photo": pid, "shortlist_size": len(short),
                          "pipeline_top3": [{"photo_id": c["photo_id"], "score": c["scores"][role]["score"], "observation_url": c.get("observation_url")} for c in short[:3]]}
            if pick is None:
                info["owner_in_candidate_pool"] = False
            else:
                sc = pick["scores"][role]
                rank = next((i for i, c in enumerate(short, 1) if c["photo_id"] == pid), None)
                info.update({"owner_in_candidate_pool": True, "owner_shortlisted_for_this_role": rank is not None,
                             "owner_rank_in_role": rank, "owner_score": sc.get("score"), "owner_rejected_for_role": sc.get("rejected"),
                             "owner_hard_reasons": sc.get("hard"), "owner_flags": sc.get("flags"), "owner_parts": sc.get("parts"),
                             "owner_reason": pick["reasons"].get(role), "owner_shortlisted_for": pick["shortlisted_for"],
                             "owner_observation_url": pick.get("observation_url"), "owner_long_edge": max(pick.get("width") or 0, pick.get("height") or 0)})
                if short:
                    top = short[0]
                    info["pipeline_top_reason"] = top["reasons"].get(role)
                    gaps[role].append(top["scores"][role]["score"] - (sc.get("score") or 0))
                    paired[role].append((features(pick, role), features(top, role)))
                    info["shortlist_percentile_of_owner_score"] = round(100 * sum(1 for c in short if c["scores"][role]["score"] <= (sc.get("score") or 0)) / len(short))
            card["roles"][role] = info
            cells = []
            pp = original_path(sp, pick) if pick else None
            cells.append((pp, f"OWNER PICK {role.upper()}\nphoto {pid}\n" + (f"pipeline rank {info.get('owner_rank_in_role')}/{len(short)} score {info.get('owner_score')}" if pick else "NOT IN CANDIDATE POOL")))
            for i, c in enumerate(short[:3], 1):
                cells.append((original_path(sp, c), f"PIPELINE #{i}\nphoto {c['photo_id']}\nscore {c['scores'][role]['score']}"))
            sheet(cells, out / "sheets" / f"{n}_{role}.jpg")
        results["cards"][str(n)] = card
        # match every supplied picture to a candidate original (recovers ids for alternates that were not in the table)
        cands = [(c, p) for c in sp["candidates"] if (p := original_path(sp, c))]
        slug = {v: k for k, v in PICK_CARD.items()}[n]
        for f in sorted(picks.glob(f"{slug}*")):
            role = PICK_ROLE[next(k for k in PICK_ROLE if k in f.stem)]
            inl, c = match_pick(f, cands)
            results["picks_matched"].append({"file": f.name, "card": n, "role": role, "inliers": inl,
                                             "photo_id": c["photo_id"] if c and inl >= 25 else None,
                                             "is_table_choice": bool(c and inl >= 25 and c["photo_id"] == row["photos"][role])})
    # --- aggregate: direction of every measurement, owner pick minus pipeline #1, per role --------------------------
    for role in ROLES:
        keys = sorted({k for o, t in paired[role] for k in o if k in t})
        rows = []
        for k in keys:
            d = [o[k] - t[k] for o, t in paired[role]]
            if all(abs(x) < 1e-9 for x in d):
                continue
            rows.append({"feature": k, "n": len(d), "mean_owner": round(st.mean(o[k] for o, _ in paired[role]), 3),
                         "mean_pipeline_top": round(st.mean(t[k] for _, t in paired[role]), 3),
                         "owner_higher_in": sum(x > 0 for x in d), "owner_lower_in": sum(x < 0 for x in d)})
        rows.sort(key=lambda r: -abs(r["owner_higher_in"] - r["owner_lower_in"]))
        results["aggregate"][role] = {"mean_score_gap_pipeline_minus_owner": round(st.mean(gaps[role]), 2) if gaps[role] else None, "features": rows}
    (out / "results.json").write_text(json.dumps(results, indent=1, default=str))
    md = ["# Selection study: tables (generated; read with TABLES caveats: n=5 species per role)", ""]
    md += ["## Where the owner's picks sit in the pipeline's own ranking", "", "| card | role | owner photo | in pool | rank in role | of | owner score | pipeline #1 score |", "|---|---|---|---|---|---|---|---|"]
    for n, c in results["cards"].items():
        for role, i in c["roles"].items():
            top = i["pipeline_top3"][0]["score"] if i["pipeline_top3"] else None
            md.append(f"| {n} | {role} | {i['owner_photo']} | {i['owner_in_candidate_pool']} | {i.get('owner_rank_in_role')} | {i['shortlist_size']} | {i.get('owner_score')} | {top} |")
    md += ["", "## Picture-to-photo matching (zip pictures vs candidate originals)", "", "| file | card | role | inliers | matched photo | is the table choice |", "|---|---|---|---|---|---|"]
    for m in results["picks_matched"]:
        md.append(f"| {m['file']} | {m['card']} | {m['role']} | {m['inliers']} | {m['photo_id']} | {m['is_table_choice']} |")
    for role in ROLES:
        ag = results["aggregate"][role]
        md += ["", f"## {role}: owner pick vs pipeline #1 (mean score gap {ag['mean_score_gap_pipeline_minus_owner']})", "", "| feature | mean owner | mean pipeline #1 | owner higher in | owner lower in |", "|---|---|---|---|---|"]
        for r in ag["features"][:40]:
            md.append(f"| {r['feature']} | {r['mean_owner']} | {r['mean_pipeline_top']} | {r['owner_higher_in']} | {r['owner_lower_in']} |")
    (out / "TABLES.md").write_text("\n".join(md) + "\n")
    print("\n".join(md[:60]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
