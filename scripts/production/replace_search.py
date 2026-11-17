#!/usr/bin/env python3
"""Replacement photo search (v2): fresh CC0 candidates, screened per ROLE, packaged for ChatGPT.

  replace_search.py prep    --results <batch result json>... --metadata-dir <dir> --out previous-candidates.json
  replace_search.py species --request evidence/search-v2/request.json --index 0 --prev previous-candidates.json --out v2-out
  replace_search.py package --request evidence/search-v2/request.json --in v2-out --out production-out --qa-dir qa

A PRIVATE DEVELOPMENT TOOL. It generates no images, removes no backgrounds, makes no sprites, edits
no card, and approves and deploys nothing. It finds, screens, ranks and packages photographs.
api.inaturalist.org is refused by the development sandbox, so real runs happen in Actions.
"""
from __future__ import annotations

import argparse
import collections
import datetime as dt
import hashlib
import json
import pathlib
import sys

from PIL import Image, ImageOps

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import fetch_inat_photos as F                # noqa: E402
from production import batch as B            # noqa: E402
from production import ledger as L           # noqa: E402
from production import rank as R             # noqa: E402
from production import replace_pkg as PKG    # noqa: E402
from production import screen as S           # noqa: E402
from production import search2 as SE         # noqa: E402

ROLES = ("main", "pixel", "tall")
PER_ROLE = 12
SPECIES_BUDGET = 85 * 1024 * 1024      # bytes of originals per species, so the final ZIP stays usable
MAX_SCREEN = 150
now = lambda: dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")  # noqa: E731


def folder(row) -> str:
    return f"{row['card']}_{L.key_of(row['scientific'])}"


def fetch(photo: dict, dest: pathlib.Path, prefer: str) -> bool:
    """Download one size of one photo (skipping what is already on disk). Sets photo['file'] etc."""
    dest.mkdir(parents=True, exist_ok=True)
    have = sorted(dest.glob(f"inat-{photo['photo_id']}.*"))
    if have and have[0].stat().st_size > 0:
        photo["file"], photo["bytes"] = have[0].name, have[0].stat().st_size
        return True
    F.download([photo], dest, prefer=prefer)
    return bool(photo.get("file"))


def prep(a) -> int:
    results = [pathlib.Path(p) for p in a.results]
    meta = sorted(pathlib.Path(a.metadata_dir).rglob("metadata.json")) if a.metadata_dir and pathlib.Path(a.metadata_dir).exists() else []
    idx = SE.previous_index(results, meta)
    pathlib.Path(a.out).write_text(json.dumps({"built": now(), "sources": [str(p) for p in results + meta],
                                               "photos": {str(k): v for k, v in idx.items()}}, indent=1))
    print(f"previous candidates: {len(idx)} photos from {len(results)} result file(s) and {len(meta)} metadata file(s)")
    return 0


def run_species(row: dict, prev: dict, out: pathlib.Path, mask_fn=S.default_mask_fn, log=print,
                max_screen: int = MAX_SCREEN, budget: int = SPECIES_BUDGET) -> dict:
    base = pathlib.Path(out) / folder(row)
    work = pathlib.Path(out) / f"_work_{folder(row)}"
    kind = row["flower_kind"]
    needed = list(row["needed_roles"])
    retained_ids = {role: int(pid) for role, pid in (row.get("retained") or {}).items()}
    res = {"card": row["card"], "common": row["common"], "scientific": row["scientific"], "flower_kind": kind,
           "needed_roles": needed, "retained": retained_ids, "candidates": [], "notes": [], "error": None,
           "roles": {r: {"searched": r in needed, "screened": 0, "hard_rejected": 0, "reject_reasons": {}, "survivors": 0, "shortlisted": 0} for r in ROLES}}
    taxon = F.resolve_taxon(row["scientific"])
    if taxon is None:
        res["error"] = f"no exactly-matching active species taxon for {row['scientific']!r}"
        return res
    tid = taxon["id"]
    res["taxon"] = {"id": tid, "name": taxon["name"]}
    prev_photos = {int(k): v for k, v in prev.get("photos", {}).items()}
    keep_ids = set(retained_ids.values())
    mine = {pid: v for pid, v in prev_photos.items() if v.get("card") == row["card"] and pid not in keep_ids}
    ex_photos = set(mine) | {int(x) for x in row.get("never_represent", [])}
    ex_obs = {v["observation_id"] for v in mine.values() if v.get("observation_id")}
    log(f"#{row['card']} {row['scientific']}: excluding {len(ex_photos)} previously shown photos ({len(ex_obs)} observations)")

    # --- retained (approved) photographs: provenance re-verified, originals kept --------------------------
    kept: list[dict] = []
    for role, pid in retained_ids.items():
        rec = next((k for k in kept if k["photo_id"] == pid), None)
        if rec is None:
            rec = SE.retained_record(pid, tid, prev_photos, taxon["name"])
            if rec is None:
                res["notes"].append(f"RETAINED {role} photo {pid}: provenance not found in any previous manifest; original not fetched, licence UNVERIFIED")
                continue
            ok, dropped = SE.reverify([rec], tid)
            if dropped:
                res["notes"].append(f"RETAINED {role} photo {pid}: licence/taxon re-check FAILED ({dropped[0]['reason']}); kept out of the package")
                continue
            rec = ok[0]
            if not fetch(rec, base / "approved-sources", "original"):
                res["notes"].append(f"RETAINED {role} photo {pid}: original could not be downloaded")
                continue
            with Image.open(base / "approved-sources" / rec["file"]) as im:
                rec["width"], rec["height"] = im.size
            rec["orig_long"] = max(rec["width"], rec["height"])
            rec["retained_roles"] = []
            kept.append(rec)
        rec["retained_roles"].append(role)

    # --- fresh pool -------------------------------------------------------------------------------------
    pool = SE.build_pool(tid, ex_photos, ex_obs, limit=max_screen, log=log)
    log(f"   pool: {len(pool)} new CC0 photographs to screen")
    res["pool"] = len(pool)
    rows: list[dict] = []
    for p in kept + pool:
        is_keep = "retained_roles" in p
        src = (base / "approved-sources" / p["file"]) if is_keep else None
        if not is_keep:
            if not fetch(p, work / "large", "large"):
                continue
            src = work / "large" / p["file"]
        try:
            rgb = S.load_work(src)
            ev = S.evaluate(rgb, p["orig_long"], kind, mask_fn)
            h = B.dhash(src)
        except Exception as e:  # noqa: BLE001
            ev, h = {"error": f"{type(e).__name__}: {str(e)[:80]}"}, None
        scores = {r_: R.score_role(r_, ev, p, p["orig_long"], kind) for r_ in ROLES}
        rows.append({"photo": p, "ev": ev, "scores": scores, "hash": h, "keep": is_keep})
    new_rows = [r_ for r_ in rows if not r_["keep"]]
    for role in ROLES:
        info = res["roles"][role]
        info["screened"] = len(new_rows)
        rej = [r_ for r_ in new_rows if r_["scores"][role]["rejected"]]
        info["hard_rejected"] = len(rej)
        info["survivors"] = len([r_ for r_ in new_rows if not r_["scores"][role]["rejected"] and r_["scores"][role]["score"] >= R.MIN_SCORE])
        cnt = collections.Counter(h_.split(":")[0] for r_ in rej for h_ in r_["scores"][role]["hard"])
        info["reject_reasons"] = dict(cnt.most_common())

    # --- shortlists, licence re-check, originals within budget --------------------------------------------
    near = lambda a_, b_: B.hamming(a_, b_) <= B.NEAR_DUP_BITS  # noqa: E731
    short = {role: R.shortlist(new_rows, role, n=PER_ROLE, near_dup=near) for role in needed}
    uniq: dict[int, dict] = {}
    for role in needed:
        for r_ in short[role]:
            uniq.setdefault(r_["photo"]["photo_id"], r_)
    ok_photos, dropped = SE.reverify([r_["photo"] for r_ in uniq.values()], tid)
    for d_ in dropped:
        res["notes"].append(f"dropped photo {d_['photo_id']}: {d_['reason']}")
    ok_ids = {p["photo_id"] for p in ok_photos}
    order = sorted((r_ for pid, r_ in uniq.items() if pid in ok_ids),
                   key=lambda r_: -max(r_["scores"][ro]["score"] for ro in needed if r_ in short[ro]))
    got, spent = {}, 0
    for r_ in order:
        p = r_["photo"]
        if not fetch(p, base / "originals", "original"):
            continue
        size = (base / "originals" / p["file"]).stat().st_size
        if spent + size > budget:
            (base / "originals" / p["file"]).unlink()
            res["notes"].append("original-size budget reached; weaker candidates were left out so the final ZIP stays usable")
            break
        spent += size
        with Image.open(base / "originals" / p["file"]) as im:
            p["width"], p["height"] = im.size
        p["sha256"] = L.sha256_file(base / "originals" / p["file"])
        p["downloaded_from"] = (p.get("urls") or {}).get(p.get("downloaded_size"))
        got[p["photo_id"]] = r_

    # --- labels and candidate records ---------------------------------------------------------------------
    final_short = {role: [r_ for r_ in short[role] if r_["photo"]["photo_id"] in got] for role in needed}
    ranked = sorted(got.values(), key=lambda r_: -max([r_["scores"][ro]["score"] for ro in needed if r_ in final_short[ro]] or [0]))
    pix_dir = base / "pixel-tests"
    cands: list[dict] = []

    def save_pixel_test(r_, c):
        imgs = r_["ev"].get("_pixel_images")
        if imgs and ("pixel" in c["shortlisted_for"] or "pixel" in c.get("retained_roles", [])):
            pix_dir.mkdir(parents=True, exist_ok=True)
            imgs[0].save(pix_dir / f"{c['photo_id']}_24.png")
            imgs[1].save(pix_dir / f"{c['photo_id']}_x6.png")

    for n, r_ in enumerate(ranked, 1):
        p = r_["photo"]
        label = f"{row['card']}-{n:02d}"
        final = base / "originals" / f"{label}__{p['photo_id']}{pathlib.Path(p['file']).suffix}"
        (base / "originals" / p["file"]).replace(final)
        c = _record(p, r_, label, "NEW_CANDIDATE", f"originals/{folder(row)}/{final.name}", final, [ro for ro in needed if r_ in final_short[ro]])
        cands.append(c)
        save_pixel_test(r_, c)
    keep_rows = [r_ for r_ in rows if r_["keep"]]
    for n, r_ in enumerate(keep_rows, 1):
        p = r_["photo"]
        label = f"{row['card']}-K{n}"
        dst = base / "approved-sources" / f"KEEP_APPROVED__{'-'.join(p['retained_roles'])}__{p['photo_id']}{pathlib.Path(p['file']).suffix}"
        (base / "approved-sources" / p["file"]).replace(dst)
        p["file"] = dst.name
        c = _record(p, r_, label, "KEEP_APPROVED", f"approved-sources/{folder(row)}/{dst.name}", dst, list(p["retained_roles"]))
        c["retained_roles"] = p["retained_roles"]
        cands.append(c)
        save_pixel_test(r_, c)
    res["candidates"] = cands
    for role in ROLES:
        res["roles"][role]["shortlisted"] = len([c for c in cands if c["decision"] == "NEW_CANDIDATE" and role in c["shortlisted_for"]])
        if res["roles"][role]["searched"] and res["roles"][role]["shortlisted"] == 0:
            res["notes"].append(f"NO suitable {role} candidate survived screening")
    # --- contact sheets, by role ----------------------------------------------------------------------------
    for role in ROLES:
        items = [c for c in cands if c["decision"] == "KEEP_APPROVED" and role in c.get("retained_roles", [])]
        items += sorted([c for c in cands if c["decision"] == "NEW_CANDIDATE" and role in c["shortlisted_for"]],
                        key=lambda c: -c["scores"][role]["score"])
        if items or res["roles"][role]["searched"]:
            PKG.role_sheets(row, role, items, base / "contact-sheets" / role, pix_dir)
    (base / "species-result.json").write_text(json.dumps(res, indent=1, default=str))
    log(f"   shortlisted: " + ", ".join(f"{r_}={res['roles'][r_]['shortlisted']}" for r_ in needed) + f"; originals {spent / 1e6:.0f} MB")
    return res


def _record(p, r_, label, decision, zip_path, file_path, roles) -> dict:
    return {"label": label, "decision": decision, "photo_id": p["photo_id"], "observation_id": p["observation_id"],
            "observation_url": p.get("observation_url"), "license_code": p["license_code"], "photographer": p.get("photographer"),
            "observed_on": p.get("observed_on"), "place": p.get("place"), "width": p.get("width"), "height": p.get("height"),
            "bytes": p.get("bytes"), "sha256": p.get("sha256") or L.sha256_file(file_path), "downloaded_from": p.get("downloaded_from"),
            "license_verified_at": p.get("license_verified_at"), "identification_agreements": p.get("identification_agreements"),
            "identification_disagreements": p.get("identification_disagreements"), "flowering_annotation": p.get("flowering_annotation"),
            "found_by": p.get("found_by"), "zip_path": zip_path, "file_path": str(file_path), "shortlisted_for": roles if decision == "NEW_CANDIDATE" else [],
            "recommended_roles": roles,
            "scores": {ro: {k: v for k, v in r_["scores"][ro].items()} for ro in ROLES},
            "reasons": {ro: r_["scores"][ro].get("reason", "") for ro in ROLES},
            "measure": r_["ev"].get("measure"), "pixel_test": r_["ev"].get("pixel_test")}


def species_cmd(a) -> int:
    req = json.loads(pathlib.Path(a.request).read_text())
    row = req["species"][a.index]
    prev = json.loads(pathlib.Path(a.prev).read_text()) if a.prev and pathlib.Path(a.prev).exists() else {"photos": {}}
    res = run_species(row, prev, pathlib.Path(a.out), max_screen=a.max_screen)
    if res.get("error"):
        print("ERROR:", res["error"])
        return 1
    return 0


def package_cmd(a) -> int:
    req = json.loads(pathlib.Path(a.request).read_text())
    inp = pathlib.Path(a.inp)
    dirs, results = [], []
    for row in req["species"]:
        d = inp / folder(row)
        f = d / "species-result.json"
        if f.exists():
            dirs.append(d)
            results.append(json.loads(f.read_text()))
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    zp = out / f"plantdex-photo-search-v2-{req.get('tag', 'cards-57-61')}.zip"
    summary = PKG.build_zip(req, dirs, results, zp, now())
    print(f"ZIP: {zp}  ({zp.stat().st_size / 1e6:.1f} MB)")
    if a.qa_dir:
        qa = pathlib.Path(a.qa_dir)
        for d in dirs:
            for sheet in sorted((d / "contact-sheets").rglob("*.jpg")):
                dst = qa / d.name / sheet.relative_to(d / "contact-sheets").parent / sheet.name
                dst.parent.mkdir(parents=True, exist_ok=True)
                with Image.open(sheet) as im:
                    im.thumbnail((1500, 1500))
                    im.save(dst, quality=72)
        (qa / "summary.json").write_text(json.dumps({**summary, "zip_bytes": zp.stat().st_size}, indent=1, default=str))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("prep"); p.add_argument("--results", nargs="+", required=True); p.add_argument("--metadata-dir"); p.add_argument("--out", required=True)
    p.set_defaults(fn=prep)
    p = sub.add_parser("species"); p.add_argument("--request", required=True); p.add_argument("--index", type=int, required=True)
    p.add_argument("--prev"); p.add_argument("--out", required=True); p.add_argument("--max-screen", type=int, default=MAX_SCREEN)
    p.set_defaults(fn=species_cmd)
    p = sub.add_parser("package"); p.add_argument("--request", required=True); p.add_argument("--in", dest="inp", required=True)
    p.add_argument("--out", required=True); p.add_argument("--qa-dir")
    p.set_defaults(fn=package_cmd)
    a = ap.parse_args()
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
