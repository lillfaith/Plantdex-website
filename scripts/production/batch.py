"""Collection batches, the ChatGPT hand-off, and selection import.

REUSES scripts/fetch_inat_photos.py (search, exact-taxon match, CC0-only, per-photo licence
filter, provenance, original-size download) and scripts/photo_collector.py (second licence
re-read, contact sheets). This module adds: duplicate removal, resume, the two archives and
the selection import. It never pads a species with anything to reach a quota.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import pathlib
import shutil
import sys
import zipfile

import numpy as np
from PIL import Image, ImageOps

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import fetch_inat_photos as F          # noqa: E402  (existing, tested)
import photo_collector as PC           # noqa: E402  (existing: licence re-read, contact sheets)
from production import ledger as L     # noqa: E402
from production import assets as A     # noqa: E402

TIERS = PC.MIN_EDGE_TIERS
REVIEW_EDGE = 1600
NEAR_DUP_BITS = 5


# --- de-duplication ----------------------------------------------------------------------

def dhash(path: pathlib.Path) -> int:
    with Image.open(path) as im:
        im.draft("L", (64, 64))
        g = ImageOps.exif_transpose(im).convert("L").resize((9, 8), Image.LANCZOS)
    a = np.asarray(g, dtype=int)
    bits = (a[:, 1:] > a[:, :-1]).flatten()
    return int("".join("1" if b else "0" for b in bits), 2)


def hamming(a: int, b: int) -> int:
    return bin(a ^ b).count("1")


def group_diversify(photos: list[dict], cap: int) -> list[dict]:
    """At most 2 per observation AND at most 2 per (photographer, date, place) event, because
    one outing is routinely uploaded as several observations of the same plant."""
    per_obs: dict = {}
    per_event: dict = {}
    out = []
    for p in photos:
        ek = (p.get("photographer"), p.get("observed_on"), (p.get("place") or "")[:24])
        if per_obs.get(p["observation_id"], 0) >= PC.MAX_PER_OBSERVATION or per_event.get(ek, 0) >= 2:
            continue
        per_obs[p["observation_id"]] = per_obs.get(p["observation_id"], 0) + 1
        per_event[ek] = per_event.get(ek, 0) + 1
        out.append(p)
        if len(out) >= cap:
            break
    return out


def download_missing(photos: list[dict], orig_dir: pathlib.Path) -> int:
    """Skip anything already on disk (resume, and no duplicate downloads). Returns fetched."""
    orig_dir.mkdir(parents=True, exist_ok=True)
    fetched = 0
    for p in photos:
        have = sorted(orig_dir.glob(f"inat-{p['photo_id']}.*"))
        if have and have[0].stat().st_size > 0:
            p["file"], p["bytes"], p["downloaded_size"] = have[0].name, have[0].stat().st_size, p.get("downloaded_size") or "cached"
            continue
        F.download([p], orig_dir, prefer="original")
        fetched += 1
    return fetched


# --- one species -------------------------------------------------------------------------

def collect_species(row: dict, orig_dir: pathlib.Path, lo: int, hi: int) -> dict:
    sci = row["scientific"]
    res = {"card": row["card"], "common": row["common"], "scientific": sci, "taxon": None, "photos": [],
           "dropped": [], "notes": [], "min_edge_used": None, "shortfall": False, "downloaded": 0}
    photos: list[dict] = []
    for edge in TIERS:
        h = F.harvest(sci, ("cc0",), hi + 20, min_edge=edge)
        if h["taxon"] is None:
            res["notes"].append(h.get("note") or "taxon not found on iNaturalist")
            res["shortfall"] = True
            return res
        res["taxon"] = h["taxon"]
        cand = group_diversify(h["photos"], hi + 10)
        cand, dropped = PC.verify_licenses(cand, h["taxon"]["id"])
        res["dropped"] += dropped
        res["min_edge_used"] = edge
        photos = cand
        if len(photos) >= lo:
            break
        res["notes"].append(f"only {len(photos)} CC0 candidates at min edge {edge}px")
    res["downloaded"] = download_missing(photos, orig_dir)
    kept, hashes, seen_sha = [], [], set()
    for p in photos:
        f = orig_dir / p.get("file", "")
        if not p.get("file") or not f.exists():
            res["dropped"].append({"photo_id": p["photo_id"], "reason": "download failed"})
            continue
        try:
            with Image.open(f) as im:
                p["width"], p["height"] = im.size
            p["dhash"] = dhash(f)
        except Exception as e:  # noqa: BLE001
            res["dropped"].append({"photo_id": p["photo_id"], "reason": f"unreadable image: {e}"})
            continue
        p["sha256"] = L.sha256_file(f)
        p["downloaded_from"] = (p.get("urls") or {}).get(p.get("downloaded_size"))
        if p["sha256"] in seen_sha:
            res["dropped"].append({"photo_id": p["photo_id"], "reason": "identical file to an earlier candidate"})
            continue
        near = next((q for q in kept if hamming(q["dhash"], p["dhash"]) <= NEAR_DUP_BITS), None)
        if near:
            res["dropped"].append({"photo_id": p["photo_id"],
                                   "reason": f"near-duplicate of {near['photo_id']} (perceptual hash)"})
            continue
        seen_sha.add(p["sha256"])
        kept.append(p)
        if len(kept) >= hi:
            break
    for i, p in enumerate(kept, 1):
        p["label"] = f"{row['card']}-{i:02d}"
        p["dhash"] = format(p["dhash"], "016x")
    res["photos"] = kept
    if len(kept) < lo:
        res["shortfall"] = True
        res["notes"].append(f"SHORTFALL: {len(kept)} CC0 photographs available (wanted {lo}-{hi}). Nothing was added "
                            "to fill the gap and the licence set was not widened.")
    return res


def review_copy(src: pathlib.Path, dest: pathlib.Path) -> None:
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((REVIEW_EDGE, REVIEW_EDGE), Image.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, quality=88)


# --- ChatGPT hand-off --------------------------------------------------------------------

def chatgpt_readme(batch: str, results: list[dict]) -> str:
    sp = A.spec()
    mi, px, tp = sp["main_image"], sp["pixel_icon"], sp["tall_preview"]
    lines = [f"# PlantDex photo review - batch {batch}", "",
             "You are helping choose source photographs for botanical card artwork. Look at the contact sheets",
             "(`<card>_<species>/contact-sheets/*.jpg`) and, where you need detail, the full-size review",
             "images (`<card>_<species>/candidates/<label>__<photo_id>.jpg`).", "",
             "Every photo has a LABEL such as `62-07`. Refer to photos by label or by photo id; both are accepted.", "",
             "## What to choose, per species (three roles)", "",
             "- `main_photo`: the photograph the transparent, enlarged main botanical image will be made from.",
             "  Prefer a complete, healthy plant showing the identifying structures (flower/fruit AND leaves AND a",
             "  stem that can run off the bottom of the card), sharp, uncluttered, nothing clipped at the top or sides.",
             "- `pixel_source`: the photograph the small pixel-art icon will be drawn from. It needs a",
             "  readable silhouette and a clear colour identity, more than detail.",
             "- `tall_preview`: the photograph for the tall portrait preview. Needs vertical composition.",
             "The same photo may be used for more than one role. If NO photo is good enough for a role, say so",
             "(use `null` and give a reason); do not pick the least-bad one silently.", "",
             "## Card style it must suit", "",
             "The plant fills about the full height of the art window, is horizontally centred, and its stem is",
             "cropped by the BOTTOM edge (44 of 45 printed cards). Sides are almost never cropped. Edges are soft.",
             "Placement is height-driven, so a photo whose plant is tiny in the frame needs heavy enlargement:",
             "prefer photos where the plant already fills most of the frame.", "",
             "## Return this JSON (a filled-in `selection-template.json`)", "",
             "```json",
             '{"batch": "%s", "selections": [' % batch,
             '  {"card": 62, "main_photo": "62-07", "pixel_source": "62-03", "tall_preview": "62-12",',
             '   "notes": "why, in one line"}',
             "]}", "```", "",
             "## When you later generate the artwork, the files are checked automatically", "",
             f"- main image: PNG with REAL transparency (not a checkerboard drawn into pixels), plant subject at least",
             f"  {mi['min_subject_height_px']}px tall ({mi['recommended_subject_height_px']}px+ preferred), background fully transparent.",
             f"- pixel icon: PNG, native {px['min_px']}-{px['max_px']} px per side (NOT an enlarged or shrunk file), transparent",
             "  background, hard 1-pixel edges with no anti-aliasing, a small flat-colour palette. Genuine pixel art, not a blurred photo.",
             f"- tall preview: at least {tp['min_width_px']}x{tp['min_height_px']} px and portrait ({tp['min_aspect_h_over_w']}+ height/width)."
             + ("  (provisional numbers)" if not tp.get("confirmed") else ""), "",
             "## Rules", "",
             "- Generated artwork is an AI derivative of the original photograph, not the photograph. Do not invent",
             "  botanical detail (petal counts, leaf shape, flower colour) the source photo does not show.",
             "- Every generated detail will be checked against the real plant by a person before approval.",
             "- All photographs here are CC0 per iNaturalist; photographer and observation links are in `manifest.json`.", "",
             "## Species in this batch", ""]
    for r in results:
        lines.append(f"- #{r['card']} {r['common']} ({r['scientific']}): {len(r['photos'])} photos"
                     + (f"  **[{'; '.join(r['notes'])}]**" if r["notes"] else ""))
    return "\n".join(lines) + "\n"


def selection_template(batch: str, results: list[dict]) -> dict:
    return {"batch": batch, "selections": [
        {"card": r["card"], "common": r["common"], "main_photo": None, "pixel_source": None, "tall_preview": None,
         "notes": "", "available_labels": [p["label"] for p in r["photos"]]} for r in results if r["photos"]]}


def public_candidate(p: dict) -> dict:
    keys = ["label", "photo_id", "observation_id", "observation_url", "license_code", "photographer", "observed_on",
            "place", "width", "height", "bytes", "sha256", "dhash", "file", "downloaded_from", "license_verified_at",
            "identification_agreements"]
    out = {k: p.get(k) for k in keys}
    out["identification_agreements"] = p.get("identification_agreements")
    return out


def run_request(request_path: pathlib.Path, work_root: pathlib.Path, out_root: pathlib.Path,
                force: bool = False, log=print) -> dict:
    req = json.loads(pathlib.Path(request_path).read_text())
    batch, lo, hi = req["batch"], req.get("min", 20), req.get("max", 30)
    work = pathlib.Path(work_root) / f"batch-{batch}"
    results = []
    for row in req["species"]:
        base = work / f"{row['card']}_{L.key_of(row['scientific'])}"
        ck = base / "collection.json"
        if ck.exists() and not force:
            res = json.loads(ck.read_text())
            log(f"#{row['card']} {row['scientific']}: resumed from checkpoint ({len(res['photos'])} photos)")
        else:
            log(f"#{row['card']} {row['scientific']} ...")
            res = collect_species(row, base / "originals", lo, hi)
            PC.make_sheets(res, base / "originals", base / "contact-sheets")
            for p in res["photos"]:
                review_copy(base / "originals" / p["file"], base / "candidates" / f"{p['label']}__{p['photo_id']}.jpg")
            L.write_json(ck, res)
            log(f"   {len(res['photos'])} photos, {len(res['dropped'])} dropped, downloaded {res['downloaded']} new")
        results.append(res)
    out_root = pathlib.Path(out_root)
    out_root.mkdir(parents=True, exist_ok=True)
    review_zip = out_root / f"plantdex-batch-{batch}-review.zip"
    orig_zip = out_root / f"plantdex-batch-{batch}-originals.zip"
    manifest = {"batch": batch, "built_at": L.now(), "licence_policy": "CC0 only, checked per photo, twice",
                "species": [{"card": r["card"], "common": r["common"], "scientific": r["scientific"], "taxon": r["taxon"],
                             "shortfall": r["shortfall"], "notes": r["notes"], "dropped": r["dropped"],
                             "candidates": [public_candidate(p) for p in r["photos"]]} for r in results]}
    rroot, oroot = f"plantdex-batch-{batch}-review", f"plantdex-batch-{batch}-originals"
    with zipfile.ZipFile(review_zip, "w", zipfile.ZIP_STORED) as z:
        z.writestr(f"{rroot}/README_FOR_CHATGPT.md", chatgpt_readme(batch, results))
        z.writestr(f"{rroot}/selection-template.json", json.dumps(selection_template(batch, results), indent=1))
        z.writestr(f"{rroot}/manifest.json", json.dumps(manifest, indent=1))
        for r in results:
            base = work / f"{r['card']}_{L.key_of(r['scientific'])}"
            for f in sorted((base / "contact-sheets").glob("*.jpg")):
                z.write(f, f"{rroot}/{base.name}/contact-sheets/{f.name}")
            for f in sorted((base / "candidates").glob("*.jpg")):
                z.write(f, f"{rroot}/{base.name}/candidates/{f.name}")
    cols = ["label", "card", "scientific", "photo_id", "observation_id", "license_code", "photographer", "observed_on",
            "place", "width", "height", "bytes", "sha256", "file", "observation_url", "downloaded_from", "license_verified_at"]
    with zipfile.ZipFile(orig_zip, "w", zipfile.ZIP_STORED) as z:
        buf = io.StringIO()
        w = csv.DictWriter(buf, fieldnames=cols)
        w.writeheader()
        for r in results:
            for p in r["photos"]:
                w.writerow({**{k: p.get(k) for k in cols}, "card": r["card"], "scientific": r["scientific"]})
        z.writestr(f"{oroot}/licenses.csv", buf.getvalue())
        z.writestr(f"{oroot}/manifest.json", json.dumps(manifest, indent=1))
        for r in results:
            base = work / f"{r['card']}_{L.key_of(r['scientific'])}"
            for p in r["photos"]:          # candidates only: dropped duplicates are not shipped
                z.write(base / "originals" / p["file"], f"{oroot}/{base.name}/originals/{p['file']}")
    result = {"batch": batch, "built_at": manifest["built_at"],
              "zips": {"review": {"name": review_zip.name, "bytes": review_zip.stat().st_size},
                       "originals": {"name": orig_zip.name, "bytes": orig_zip.stat().st_size}},
              "species": {str(s["card"]): {"shortfall": s["shortfall"], "notes": s["notes"], "dropped": len(s["dropped"]),
                                           "candidates": s["candidates"]} for s in manifest["species"]}}
    return result


# --- picking the next batch ----------------------------------------------------------------

def package_next(led: L.Ledger, n: int = 10, new: bool = False, retry: bool = False) -> tuple[pathlib.Path, dict, bool]:
    """Write the next batch request. Returns (path, request, resumed).

    Resumes an unfinished request rather than starting another (so an interrupted run is
    continued, not duplicated). Safety-flagged species sort last, as agreed.
    """
    led.sync()
    reqs = led.batch_requests()
    open_ = [r for r in reqs if not r["_complete"]]
    if open_ and not new:
        r = open_[-1]
        return pathlib.Path(r["_file"]), r, True
    already = {s["card"] for r in reqs for s in r["species"]}
    pool = [c for c in led.cards() if not c["stages"]["photos_collected"].get("done")
            and (retry or c["card"] not in already)]
    pool.sort(key=lambda c: (bool(c.get("safety_flag")), c["card"]))
    pick = pool[:n]
    if not pick:
        raise L.LedgerError("no uncompleted species left to package")
    num = f"{len(reqs) + 1:03d}"
    req = {"batch": num, "created": L.now(), "min": 20, "max": 30,
           "species": [{k: c[k] for k in ("card", "common", "scientific") if k in c} | {"safety_flag": bool(c.get("safety_flag"))}
                       for c in pick]}
    led.batches.mkdir(parents=True, exist_ok=True)
    path = led.batches / f"batch-{num}.request.json"
    L.write_json(path, req)
    return path, req, False


# --- selection import ----------------------------------------------------------------------

class Originals:
    """The originals, from an unzipped folder or straight from the originals ZIP."""
    def __init__(self, src: pathlib.Path):
        self.src = pathlib.Path(src)
        self.zip = zipfile.ZipFile(self.src) if self.src.is_file() else None

    def find(self, folder: str, file: str) -> bytes | None:
        if self.zip:
            for n in self.zip.namelist():
                if n.endswith(f"/{folder}/originals/{file}"):
                    return self.zip.read(n)
            return None
        for p in self.src.rglob(file):
            if p.parent.name == "originals" and p.parent.parent.name == folder:
                return p.read_bytes()
        return None


def resolve_photo(c: dict, ref) -> dict | None:
    for p in c["collection"]["candidates"]:
        if ref in (p["photo_id"], p["label"]) or str(ref) == str(p["photo_id"]):
            return p
    return None


def import_selection(led: L.Ledger, selection_path: pathlib.Path, originals: pathlib.Path, assets_root: pathlib.Path,
                     by: str, revise: bool = False, allow_partial: bool = False) -> list[str]:
    sel = json.loads(pathlib.Path(selection_path).read_text())
    src = Originals(originals)
    assets_root = pathlib.Path(assets_root)
    done: list[str] = []
    problems: list[str] = []
    for s in sel["selections"]:
        n = s["card"]
        c = led.card(n)
        if not c.get("collection"):
            problems.append(f"#{n}: photos have not been collected yet")
            continue
        if c.get("approval"):
            problems.append(f"#{n}: approved; withdraw the approval before changing its selection")
            continue
        chosen, bad = {}, []
        for role in L.ROLE_OF_ASSET.values():
            ref = s.get(role)
            if ref in (None, ""):
                bad.append(f"{role} missing") if not allow_partial else None
                continue
            p = resolve_photo(c, ref)
            if p is None:
                bad.append(f"{role}: {ref!r} is not one of #{n}'s candidates")
            else:
                chosen[role] = p
        if bad:
            problems.append(f"#{n}: " + "; ".join(bad))
            continue
        prev = c.get("selection") or {}
        changed = [r for r, p in chosen.items() if prev.get(r) and prev[r] != p["photo_id"]]
        if changed and not revise:
            problems.append(f"#{n}: already selected {changed}; pass --revise to change (the old choice is kept in history)")
            continue
        dest = assets_root / L.folder(c) / "original_selected"
        dest.mkdir(parents=True, exist_ok=True)
        for role, p in chosen.items():
            data = src.find(L.folder(c), p["file"])
            if data is None:
                problems.append(f"#{n}: original {p['file']} not found in {originals}")
                break
            if hashlib.sha256(data).hexdigest() != p["sha256"]:
                problems.append(f"#{n}: {p['file']} does not match its recorded hash; refusing")
                break
            (dest / f"{role}__{p['photo_id']}{pathlib.Path(p['file']).suffix}").write_bytes(data)
        else:
            if prev:
                c["selection"].setdefault("history", []).append({k: prev.get(k) for k in L.ROLE_OF_ASSET.values()} | {"replaced_at": L.now()})
            c["selection"] = {**(c.get("selection") or {}), **{r: p["photo_id"] for r, p in chosen.items()},
                              "by": by, "at": L.now(), "notes": s.get("notes", "")}
            for r in changed:     # a changed source invalidates only THAT role's derivative, and only if one exists
                asset = c["assets"][L.ASSET_OF_ROLE[r]]
                if asset["versions"]:
                    asset["regenerate"] = {"reason": f"{r} selection changed", "by": by, "at": L.now()}
                    asset["review"] = None
            c["preview"] = None
            L.write_json(assets_root / L.folder(c) / "provenance.json", {
                "card": c["card"], "scientific": c["scientific"],
                "originals": {r: {"kind": "original_photograph", **{k: p.get(k) for k in
                              ("photo_id", "label", "observation_url", "license_code", "photographer", "observed_on", "place", "sha256", "file")}}
                              for r, p in chosen.items()},
                "note": "Originals are CC0 iNaturalist photographs. Generated files live in generated/ and are AI derivatives."})
            led.event(c, "selection_imported", by=by, **{r: p["photo_id"] for r, p in chosen.items()})
            led.recompute(c)
            done.append(f"#{n}")
    led.save()
    if problems:
        raise L.LedgerError("selection import had problems:\n  - " + "\n  - ".join(problems)
                            + (f"\n(imported OK: {', '.join(done)})" if done else ""))
    return done
