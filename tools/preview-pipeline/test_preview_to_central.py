#!/usr/bin/env python3
"""Tests for preview_to_central.py. SYNTHETIC FIXTURES ONLY: the 'plant' is a drawn shape, the 'owner approval' is simulated for the test and is NOT an approval of anything.
    python3 test_preview_to_central.py"""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import plantdex_history as H  # noqa: E402

PP, PH, AD = HERE / "preview_pipeline.py", HERE / "plantdex_history.py", HERE / "preview_to_central.py"
PASS, FAIL = [], []


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def run(tool, *args, expect=True):
    r = subprocess.run([sys.executable, str(tool), *map(str, args)], capture_output=True, text=True)
    if (r.returncode == 0) != bool(expect):
        raise AssertionError(f"unexpected exit {r.returncode} for {tool.name} {' '.join(map(str, args))}\n{r.stdout}\n{r.stderr}")
    return r.stdout if expect else r.stderr


def check(ok, label):
    (PASS if ok else FAIL).append(label)
    print(("PASS  " if ok else "FAIL  ") + label)


def build_preview(td: Path, tamper: bool = False, approve: bool = True):
    """A complete preview workspace through S07 (synthetic) and, optionally, a simulated owner approval."""
    src = Image.new("RGB", (480, 700), (88, 80, 70))
    d = ImageDraw.Draw(src)
    d.line([(200, 620), (213, 200)], fill=(80, 170, 80), width=12)
    source = td / "source.jpg"; src.save(source)
    back = td / "back.png"; Image.new("RGB", (390, 630), (151, 90, 189)).save(back)
    g = Image.new("RGB", (500, 500)); px = g.load()
    for y in range(500):
        for x in range(500):
            px[x, y] = (int(100 + 120 * y / 499), int(110 + 45 * y / 499), int(198 - 45 * y / 499))
    gradient = td / "gradient.png"; g.save(gradient)
    front = td / "front.png"; Image.new("RGB", (390, 630), (155, 40, 245)).save(front)
    root = td / "preview_ws"
    run(PP, "init", "--root", root, "--card", 62, "--species", "Synthetic specimen", "--photo", source, "--back", back, "--gradient", gradient, "--photo-id", "synthetic-1", "--license", "synthetic")
    run(PP, "crop", "--root", root, "--parent", "S00_source/v0001", "--box", 40, 20, 430, 660)
    cut = Image.new("RGBA", (390, 640), (0, 0, 0, 0)); dr = ImageDraw.Draw(cut)
    dr.line([(165, 590), (170, 130)], fill=(35, 155, 75, 255), width=9)
    for x, y in [(169, 135), (108, 235), (225, 260), (135, 345), (205, 400)]:
        dr.line([(170, y), (x, y)], fill=(35, 155, 75, 255), width=5); dr.ellipse((x - 19, y - 16, x + 19, y + 16), fill=(230, 218, 218, 255))
    cutfile = td / "cutout.png"; cut.save(cutfile)
    run(PP, "review", "--root", root, "--version", "S01_crop/v0001", "--decision", "pass", "--reviewer", "agent", "--checks", "composition-ok", "--note", "synthetic fixture")
    run(PP, "import-cutout", "--root", root, "--parent", "S01_crop/v0001", "--stage", "S02_raw_cutout", "--file", cutfile, "--method", "adobe-background-removal")
    run(PP, "import-cutout", "--root", root, "--parent", "S02_raw_cutout/v0001", "--stage", "S03_refined_cutout", "--file", cutfile, "--method", "manual-mask", "--note", "synthetic")
    run(PP, "review", "--root", root, "--version", "S03_refined_cutout/v0001", "--decision", "pass", "--reviewer", "agent", "--checks", "background-clear", "anatomy-intact", "stems-connected", "silhouette-readable", "--note", "synthetic fixture")
    run(PP, "rotate", "--root", root, "--parent", "S03_refined_cutout/v0001", "--degrees", 5)
    run(PP, "review", "--root", root, "--version", "S04_upright/v0001", "--decision", "pass", "--reviewer", "agent", "--checks", "orientation-ok", "--note", "synthetic fixture")
    run(PP, "place", "--root", root, "--parent", "S04_upright/v0001")
    run(PP, "review", "--root", root, "--version", "S05_positioned/v0001", "--decision", "pass", "--reviewer", "agent", "--checks", "fits-oval", "--note", "synthetic fixture")
    run(PP, "gradient", "--root", root, "--parent", "S05_positioned/v0001")
    run(PP, "review", "--root", root, "--version", "S06_gradient/v0001", "--decision", "pass", "--reviewer", "agent", "--checks", "gradient-appearance-ok", "--note", "synthetic fixture")
    run(PP, "assemble", "--root", root, "--parent", "S06_gradient/v0001")
    if approve:   # SIMULATED, test-only
        run(PP, "approve", "--root", root, "--version", "S07_card/v0001", "--reviewer", "owner", "--note", "SYNTHETIC TEST APPROVAL, not an approval of anything real")
    central = td / "central_ws"
    run(PH, "init", "--root", central, "--front", front, "--back", back, "--gradient", gradient)
    return root, central, source, back, gradient


def manifest(td: Path, source: Path, **over):
    row = {"photo_id": "synthetic-1", "license_code": "cc0", "taxon_check": "exact", "sha256": sha(source), "observation_id": 1, "photographer": "test", "verified_at": "t", "source_url": "u"}
    row.update(over)
    p = td / "manifest.json"; p.write_text(json.dumps({"rows": [row]}))
    return p


with tempfile.TemporaryDirectory() as t:
    td = Path(t)
    preview, central, source, back, gradient = build_preview(td)
    man = manifest(td, source)
    # a pre-existing central MAIN history that must never change
    cutfile = td / "cutout.png"
    run(PH, "import", "--root", central, "--card", 62, "--role", "main", "--stage", "cutout", "--file", cutfile, "--note", "pre-existing main")
    before_main = (central / "cards/062/main/history.json").read_bytes()
    before_main_files = sorted(str(p.relative_to(central)) for p in (central / "cards/062/main").rglob("*") if p.is_file())

    plan = json.loads(run(AD, "plan", "--preview-root", preview, "--central-root", central, "--card", 62, "--license-manifest", man))
    check(plan["to_register"] and not (central / "cards/062/preview").exists(), "plan reports what it would register and writes nothing")
    dry = json.loads(run(AD, "register", "--preview-root", preview, "--central-root", central, "--card", 62, "--license-manifest", man))
    check(not (central / "cards/062/preview").exists(), "register without --apply writes nothing")

    out = json.loads(run(AD, "register", "--preview-root", preview, "--central-root", central, "--card", 62, "--license-manifest", man, "--apply"))
    h = json.loads((central / "cards/062/preview/history.json").read_text())
    check([v["stage"] for v in h["versions"]] == ["source", "cutout", "refined", "render_layer", "render_layer", "gradient_overlay"], "six stages registered with the mapped central stages")
    side0 = json.loads((central / "cards/062/preview/preview_provenance.json").read_text())["registrations"][0]
    check("S01_crop/v0001" in side0["not_registered"] and h["versions"][1]["parent"] == h["versions"][0]["id"], "INTEGRATION FINDING: the opaque S01 crop cannot enter the central history (alpha required); it is recorded in the sidecar and S02's central parent is the S00 source")
    check(all(v["parent"] == (h["versions"][i - 1]["id"] if i else None) for i, v in enumerate(h["versions"])), "central parent links follow the preview ancestry")
    ph = json.loads((preview / "history.json").read_text())
    pv = {v["id"]: v for v in ph["versions"]}
    check(all(v["sha256"] == pv[k]["sha256"] for k, v in zip(out["registered"].keys(), h["versions"])), "every registered asset is byte-identical to its preview asset")
    check(not any("S07" in k for k in out["registered"]), "the full-card S07 is not registered (the central history refuses full cards)")
    check(h["pins"] == {}, "nothing is pinned or marked approved in the central history by the adapter")
    check((central / "cards/062/main/history.json").read_bytes() == before_main and sorted(str(p.relative_to(central)) for p in (central / "cards/062/main").rglob("*") if p.is_file()) == before_main_files, "the existing central main history and files are untouched")
    side = json.loads((central / "cards/062/preview/preview_provenance.json").read_text())
    r0 = side["registrations"][0]
    check(r0["license"]["verified"] and r0["owner_approval"]["reviewer"] == "owner" and r0["central_back_sha256"] == sha(back), "provenance sidecar records licence verification, the owner approval and the template hash")
    v = json.loads(run(AD, "verify", "--preview-root", preview, "--central-root", central, "--card", 62))
    check(v["reproduces_approved_card"], "central overlay + central back reproduces the owner-approved S07 exactly (pixel for pixel)")

    # idempotent
    again = json.loads(run(AD, "register", "--preview-root", preview, "--central-root", central, "--card", 62, "--license-manifest", man, "--apply"))
    h2 = json.loads((central / "cards/062/preview/history.json").read_text())
    check(len(h2["versions"]) == 6 and h2["versions"] == h["versions"], "registering twice adds nothing and rewrites nothing")

    # the integration problem, measured: the central assembler does not reproduce the approved preview
    proj = H.verify_orig(central)
    refined = [v for v in h["versions"] if v["stage"] == "refined"][0]
    img = Image.open(central / refined["path"]).convert("RGBA")
    grad = Image.open(central / proj["originals"]["gradient"]["path"])
    base = Image.open(central / proj["originals"]["back"]["path"]).convert("RGBA")
    via_central = np.asarray(Image.alpha_composite(base, H.exact_preview_mask(img, grad, (390, 630), [144, 202, 102, 235])).convert("RGB"))
    via_approved = np.asarray(Image.alpha_composite(base, Image.open(central / [v for v in h["versions"] if v["stage"] == "gradient_overlay"][0]["path"]).convert("RGBA")).convert("RGB"))
    differs = int((np.abs(via_central.astype(int) - via_approved.astype(int)).sum(axis=2) > 0).sum())   # visible pixels that differ once composited on the card back
    check(differs > 0, f"INTEGRATION FINDING: the central assembler's preview differs from the approved overlay in {differs} visible pixels once composited on the back, so `assemble` must not rebuild an approved preview")

# negative cases, each on a fresh pair of workspaces
def fresh(**kw):
    td2 = Path(tempfile.mkdtemp())
    return (td2, *build_preview(td2, **kw))


def refuses(label, td2, preview, central, source, *extra, key="REFUSED"):
    r = subprocess.run([sys.executable, str(AD), "register", "--preview-root", str(preview), "--central-root", str(central), "--card", "62", "--apply", *map(str, extra)], capture_output=True, text=True)
    ok = r.returncode != 0 and key in r.stderr and not (central / "cards/062/preview").exists()
    check(ok, label)
    shutil.rmtree(td2, ignore_errors=True)


td2, pv_, ce_, src_, bk_, gr_ = fresh(approve=False)
refuses("refuses when the owner has not approved the S07 card", td2, pv_, ce_, src_, "--license-manifest", manifest(td2, src_))

td2, pv_, ce_, src_, bk_, gr_ = fresh()
refuses("refuses without a licence manifest", td2, pv_, ce_, src_)

td2, pv_, ce_, src_, bk_, gr_ = fresh()
refuses("refuses a manifest whose licence is not cc0", td2, pv_, ce_, src_, "--license-manifest", manifest(td2, src_, license_code="cc-by"))
td2, pv_, ce_, src_, bk_, gr_ = fresh()
refuses("refuses a manifest whose checksum is not the S00 source bytes", td2, pv_, ce_, src_, "--license-manifest", manifest(td2, src_, sha256="0" * 64))
td2, pv_, ce_, src_, bk_, gr_ = fresh()
refuses("refuses a manifest with a taxon mismatch", td2, pv_, ce_, src_, "--license-manifest", manifest(td2, src_, taxon_check="MISMATCH"))

td2, pv_, ce_, src_, bk_, gr_ = fresh()
shutil.rmtree(ce_); other = td2 / "other_back.png"; Image.new("RGB", (390, 630), (1, 2, 3)).save(other)
subprocess.run([sys.executable, str(PH), "init", "--root", str(ce_), "--front", str(td2 / "front.png"), "--back", str(other), "--gradient", str(gr_)], check=True, capture_output=True)
refuses("refuses when the central back template differs from the preview's locked one", td2, pv_, ce_, src_, "--license-manifest", manifest(td2, src_))

td2, pv_, ce_, src_, bk_, gr_ = fresh()
asset = pv_ / "history/S03_refined_cutout/v0001/asset.png"; asset.chmod(0o644); asset.write_bytes(asset.read_bytes() + b"x")
refuses("refuses when a preview asset was altered after its review", td2, pv_, ce_, src_, "--license-manifest", manifest(td2, src_))

td2, pv_, ce_, src_, bk_, gr_ = fresh()
hj = json.loads((pv_ / "history.json").read_text()); hj["reviews"] = [r for r in hj["reviews"] if not r["version"].startswith("S03")]; (pv_ / "history.json").write_text(json.dumps(hj))
refuses("refuses when the S03 visual review is missing", td2, pv_, ce_, src_, "--license-manifest", manifest(td2, src_))
td2, pv_, ce_, src_, bk_, gr_ = fresh()
hj = json.loads((pv_ / "history.json").read_text()); hj["owner_approval"][0]["reviewer"] = "agent"; (pv_ / "history.json").write_text(json.dumps(hj))
refuses("refuses an 'approval' that was not made by the owner", td2, pv_, ce_, src_, "--license-manifest", manifest(td2, src_))

print(f"\n{len(PASS)} passed, {len(FAIL)} failed")
sys.exit(1 if FAIL else 0)
