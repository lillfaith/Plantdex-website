#!/usr/bin/env python3
"""Adapter: register an OWNER-APPROVED preview from a preview-only workspace into the central PlantDex version history. APPEND-ONLY.

It never edits an existing central record, never overwrites a file, never pins anything by itself and never marks anything approved in the central history.
The central `plantdex_history.py` is imported and used as-is (its own add_asset validation applies).

  preview_to_central.py plan        --preview-root P --central-root C --card N [--license-manifest M.json]
  preview_to_central.py register    --preview-root P --central-root C --card N [--license-manifest M.json] --apply
  preview_to_central.py compose-back --central-root C --card N [--out back.png]
  preview_to_central.py verify      --preview-root P --central-root C --card N

WHY THIS IS NOT JUST `plantdex_history.py assemble`: the central assembler places a preview with its own rule (bottom-anchored in a fixed rectangle, the gradient
squeezed into that rectangle). The preview pipeline centres the plant in the oval and maps the gradient over the whole 390x630 card. The two give different pixels,
so the approved overlay (S06) is registered as a `gradient_overlay` asset and `compose-back` reproduces the approved card exactly; `assemble` must not be used to rebuild
an approved preview. test_preview_to_central.py measures the difference.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
import uuid
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import plantdex_history as H  # noqa: E402

ADAPTER_VERSION = "preview-to-central-1"
ROLE = "preview"
# S01_crop is NOT registered: it is an opaque photo crop, and the central history's detect_info() requires every non-source `preview` asset to carry alpha. It stays in the
# preview workspace (hash and review recorded in the provenance sidecar) and the central S02 cutout takes the central S00 source as its parent.
STAGE_MAP = {"S00_source": "source", "S02_raw_cutout": "cutout", "S03_refined_cutout": "refined",
             "S04_upright": "render_layer", "S05_positioned": "render_layer", "S06_gradient": "gradient_overlay"}
CHAIN = ["S00_source", "S02_raw_cutout", "S03_refined_cutout", "S04_upright", "S05_positioned", "S06_gradient"]
REVIEWED = ("S01_crop", "S03_refined_cutout", "S04_upright", "S05_positioned", "S06_gradient")


class Refused(ValueError):
    pass


def sha(p) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def loadj(p):
    return json.loads(Path(p).read_text(encoding="utf-8"))


def savej(p, v):
    p = Path(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_name("." + p.name + "-" + uuid.uuid4().hex[:8])
    tmp.write_text(json.dumps(v, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(tmp, p)


def stage_of(vid: str) -> str:
    return vid.split("/")[0]


def run_verify(tool: Path, args: list[str]) -> str:
    r = subprocess.run([sys.executable, str(tool), *args], capture_output=True, text=True)
    if r.returncode != 0:
        raise Refused(f"{tool.name} {' '.join(args)} failed:\n{r.stdout}{r.stderr}")
    return r.stdout.strip().splitlines()[-1]


def sidecar_path(central: Path, card: int) -> Path:
    return central / "cards" / f"{int(card):03d}" / ROLE / "preview_provenance.json"


def gather(preview: Path, central: Path, card: int, license_manifest: str | None, allow_unverified: bool) -> dict:
    """Every check that must hold BEFORE anything is written. Raises Refused with the first problem."""
    pp = HERE / "preview_pipeline.py"
    ph = HERE / "plantdex_history.py"
    out = {"preview_verify": run_verify(pp, ["verify", "--root", str(preview)]), "central_verify_before": run_verify(ph, ["verify", "--root", str(central)])}
    pj, hist = loadj(preview / "project.json"), loadj(preview / "history.json")
    cj = H.verify_orig(central)
    if int(pj["card"]) != int(card):
        raise Refused(f"preview workspace is for card {pj['card']}, not {card}")
    if pj["locked"]["back_template"]["sha256"] != cj["originals"]["back"]["sha256"]:
        raise Refused("the preview's locked back template differs from the central back template (the overlay is only valid on the template it was built against)")
    if pj["locked"]["gradient"]["sha256"] != cj["originals"]["gradient"]["sha256"]:
        raise Refused("the preview's locked gradient differs from the central gradient")
    vers = {v["id"]: v for v in hist["versions"]}
    # the approved production card: an OWNER approval whose checksum still matches the asset
    approvals = [a for a in hist["owner_approval"] if a.get("reviewer") == "owner" and stage_of(a["version"]) == "S07_card"]
    if not approvals:
        raise Refused("no OWNER approval of an S07_card in the preview history: nothing may be registered as approved")
    ap = approvals[-1]
    s07 = vers.get(ap["version"])
    if s07 is None or s07["sha256"] != ap["sha256"] or sha(preview / s07["path"]) != ap["sha256"]:
        raise Refused("the approved S07 card does not match its recorded checksum")
    chain, cur = {}, s07
    while cur:
        chain[stage_of(cur["id"])] = cur
        cur = vers.get(cur["parent"]) if cur["parent"] else None
    missing = [s for s in CHAIN + ["S01_crop"] if s not in chain]
    if missing:
        raise Refused(f"ancestry of the approved card lacks {missing}")
    for s in REVIEWED:                       # latest review of exactly this asset must be a pass
        rs = [r for r in hist["reviews"] if r["version"] == chain[s]["id"] and r["asset_sha256"] == chain[s]["sha256"]]
        if not rs or rs[-1]["decision"] != "pass":
            raise Refused(f"{chain[s]['id']} has no passing visual review for its current bytes")
    # photo licence and identity: S00's bytes must be the bytes a verified manifest describes
    s00 = chain["S00_source"]
    extra = s00.get("extra") or {}
    lic = {"photo_id": extra.get("photo_id"), "verified": False, "manifest": None}
    if license_manifest:
        m = loadj(license_manifest)
        rows = [r for r in m.get("rows", []) if str(r.get("photo_id")) == str(extra.get("photo_id"))]
        if not rows:
            raise Refused(f"photo {extra.get('photo_id')} is not in the licence manifest")
        r = rows[0]
        if str(r.get("license_code", "")).lower() != "cc0":
            raise Refused(f"manifest licence for photo {r.get('photo_id')} is {r.get('license_code')!r}, not cc0")
        if r.get("taxon_check") not in ("exact", "beneath requested species (infraspecific)"):
            raise Refused(f"manifest taxon check is {r.get('taxon_check')!r}")
        if r.get("sha256") != s00["sha256"]:
            raise Refused("S00 source bytes differ from the manifest's original (not the verified file)")
        lic.update({"verified": True, "manifest": str(license_manifest), "manifest_sha256": sha(license_manifest), "license_code": r["license_code"],
                    "observation_id": r.get("observation_id"), "photographer": r.get("photographer"), "verified_at": r.get("verified_at"), "source_url": r.get("source_url")})
    elif not allow_unverified:
        raise Refused("no --license-manifest: the source photograph's CC0 licence and taxon are not independently verified (use --allow-unverified-license to record that explicitly)")
    return {"checks": out, "chain": chain, "approval": ap, "s07": s07, "license": lic, "reviews": [r for r in hist["reviews"] if r["version"] in {c["id"] for c in chain.values()}]}


def plan(a, apply: bool) -> dict:
    preview, central = Path(a.preview_root).resolve(), Path(a.central_root).resolve()
    g = gather(preview, central, a.card, a.license_manifest, a.allow_unverified_license)
    h = H.history(central, a.card, ROLE)
    have = {v["sha256"]: v["id"] for v in h["versions"]}
    mapping, todo, prev_central = {}, [], None
    for s in CHAIN:
        rec = g["chain"][s]
        if rec["sha256"] in have:                                      # idempotent: this exact asset is already registered
            mapping[rec["id"]] = {"central": have[rec["sha256"]], "new": False}
            prev_central = have[rec["sha256"]]
        else:
            mapping[rec["id"]] = {"central": None, "new": True, "parent_central": prev_central}
            todo.append(rec)
            prev_central = "(new)"
    report = {"card": a.card, "approved_s07": g["s07"]["id"], "approved_s07_sha256": g["s07"]["sha256"], "license": g["license"], "mapping": mapping,
              "to_register": [r["id"] for r in todo], "checks": g["checks"]}
    if not apply:
        return report
    parent = None
    new_ids = {}
    for s in CHAIN:
        rec = g["chain"][s]
        m = mapping[rec["id"]]
        if not m["new"]:
            parent = m["central"]
            continue
        note = f"preview {rec['id']} sha256 {rec['sha256'][:12]}; owner-approved card {g['s07']['id']}; photo {g['license'].get('photo_id')}"
        r = H.add_asset(central, a.card, ROLE, preview / rec["path"], STAGE_MAP[s], parent=parent, note=note, method=rec.get("method") or "programmatic")
        if r["sha256"] != rec["sha256"]:
            raise Refused("registered bytes differ from the preview asset")
        new_ids[rec["id"]] = r["id"]
        mapping[rec["id"]] = {"central": r["id"], "new": True}
        parent = r["id"]
    sc = sidecar_path(central, a.card)
    side = loadj(sc) if sc.exists() else {"format": ADAPTER_VERSION, "card": int(a.card), "role": ROLE, "registrations": []}
    side["registrations"].append({                                    # APPEND ONLY: earlier entries are never rewritten
        "registered_utc": H.now(), "adapter": ADAPTER_VERSION, "preview_root_name": preview.name, "approved_s07": g["s07"]["id"], "approved_s07_sha256": g["s07"]["sha256"],
        "owner_approval": g["approval"], "license": g["license"], "mapping": {k: v["central"] for k, v in mapping.items()},
        "central_approved_overlay": mapping[g["chain"]["S06_gradient"]["id"]]["central"],
        "central_refined_cutout": mapping[g["chain"]["S03_refined_cutout"]["id"]]["central"],
        "asset_sha256": {k: g["chain"][stage_of(k)]["sha256"] for k in mapping}, "reviews": g["reviews"],
        "not_registered": {g["chain"]["S01_crop"]["id"]: {"sha256": g["chain"]["S01_crop"]["sha256"], "crop_xyxy": (g["chain"]["S01_crop"].get("extra") or {}).get("crop_xyxy"),
                           "reason": "opaque photo crop; the central history requires alpha on every non-source preview asset (kept in the preview workspace)"}},
        "central_back_sha256": H.readj(central / "project.json")["originals"]["back"]["sha256"],
        "note": "Approved composition = the S06 overlay alpha-composited on the central back. Do not rebuild it with plantdex_history.py assemble."})
    savej(sc, side)
    report["registered"] = new_ids
    report["central_verify_after"] = run_verify(HERE / "plantdex_history.py", ["verify", "--root", str(central)])
    return report


def compose_back(central: Path, card: int, out: Path | None) -> tuple[Image.Image, dict]:
    sc = sidecar_path(central, card)
    if not sc.exists():
        raise Refused("no preview_provenance.json for this card")
    reg = loadj(sc)["registrations"][-1]
    v, p = H.must_version(central, card, ROLE, reg["central_approved_overlay"])
    proj = H.verify_orig(central)
    back = Image.open(central / proj["originals"]["back"]["path"]).convert("RGBA")
    result = Image.alpha_composite(back, Image.open(p).convert("RGBA")).convert("RGB")
    if out:
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        result.save(out)
    return result, reg


def verify_all(a) -> dict:
    preview, central = Path(a.preview_root).resolve(), Path(a.central_root).resolve()
    central_line = run_verify(HERE / "plantdex_history.py", ["verify", "--root", str(central)])
    preview_line = run_verify(HERE / "preview_pipeline.py", ["verify", "--root", str(preview)])
    sc = loadj(sidecar_path(central, a.card))
    hist = loadj(preview / "history.json")
    vers = {v["id"]: v for v in hist["versions"]}
    for reg in sc["registrations"]:
        for pid, cid in reg["mapping"].items():
            v, p = H.must_version(central, a.card, ROLE, cid)
            if v["sha256"] != reg["asset_sha256"][pid] or pid in vers and vers[pid]["sha256"] != v["sha256"]:
                raise Refused(f"central {cid} no longer matches preview {pid}")
    img, reg = compose_back(central, a.card, None)
    s07 = vers[reg["approved_s07"]]
    ref = Image.open(preview / s07["path"]).convert("RGB")
    if not np.array_equal(np.asarray(img), np.asarray(ref)):
        raise Refused("the central overlay + back does NOT reproduce the owner-approved S07 card")
    return {"central": central_line, "preview": preview_line, "reproduces_approved_card": True, "registrations": len(sc["registrations"])}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("plan", "register", "verify", "compose-back"):
        p = sub.add_parser(name)
        p.add_argument("--central-root", required=True)
        p.add_argument("--card", type=int, required=True)
        if name != "compose-back":
            p.add_argument("--preview-root", required=True)
        if name in ("plan", "register"):
            p.add_argument("--license-manifest")
            p.add_argument("--allow-unverified-license", action="store_true")
        if name == "register":
            p.add_argument("--apply", action="store_true", help="without this flag register only reports what it would do")
        if name == "compose-back":
            p.add_argument("--out")
    a = ap.parse_args()
    try:
        if a.cmd == "plan":
            r = plan(a, False)
        elif a.cmd == "register":
            r = plan(a, bool(a.apply))
        elif a.cmd == "verify":
            r = verify_all(a)
        else:
            img, reg = compose_back(Path(a.central_root).resolve(), a.card, Path(a.out) if a.out else None)
            r = {"composed": a.out, "size": list(img.size), "from_overlay": reg["central_approved_overlay"]}
        print(json.dumps(r, indent=2, default=str))
    except (Refused, ValueError, OSError) as e:
        print("REFUSED:", e, file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
