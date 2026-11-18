#!/usr/bin/env python3
"""PlantDex Preview-Only Version Gates v1.

Image generation is deliberately absent. The CLI reads the card back ONLY for
assembly/verification and never exports templates to image-edit input jobs.
Each operation creates an immutable asset version, with stage validation and
explicit recorded visual QA before advancing past a stage that needs it.
Requires Pillow. No OpenCV, cloud APIs, or connectors.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import sys
import uuid
from pathlib import Path
from PIL import Image, ImageOps

CARD_SIZE = (390, 630)
STAGES = [
    "S00_source", "S01_crop", "S02_raw_cutout", "S03_refined_cutout",
    "S04_upright", "S05_positioned", "S06_gradient", "S07_card",
]
NEEDS_REVIEW = {
    "S01_crop": "composition-ok",
    "S03_refined_cutout": "background-clear,anatomy-intact,stems-connected,silhouette-readable",
    "S04_upright": "orientation-ok",
    "S05_positioned": "fits-oval",
    "S06_gradient": "gradient-appearance-ok",
}
# These coordinates refer to existing oval in original PlantDex back, NOT a drawn oval.
DEFAULT_OVAL = [130, 193, 260, 443]
SOURCES_FOR_GENERATIVE_CLEANUP = ("S01_crop", "S02_raw_cutout", "S03_refined_cutout")
ALLOWED_CUTOUT_METHODS = {
    "adobe-background-removal", "manual-photo-edit", "opencv-mask", "rembg",
    "photo-only-ai-cleanup", "manual-mask", "other-photo-edit",
}


def utc():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def digest(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def loadj(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def savej(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name("." + path.name + "-" + uuid.uuid4().hex[:8])
    tmp.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    os.replace(tmp, path)


def rootpath(arg):
    p = Path(arg).expanduser().resolve()
    if not (p / "project.json").is_file():
        raise ValueError(f"Not initialized: {p}")
    return p


def paths(root):
    return loadj(root / "project.json"), loadj(root / "history.json")


def verify_lock(root):
    project, _ = paths(root)
    for name, meta in project["locked"].items():
        p = root / meta["path"]
        if not p.is_file() or digest(p) != meta["sha256"]:
            raise ValueError(f"LOCK TAMPER: {name} missing or checksum changed")
    return project


def stage_of(version):
    s = version.split("/")[0]
    if s not in STAGES:
        raise ValueError(f"Bad version stage {version!r}")
    return s


def next_id(hist, stage):
    n = 1 + sum(1 for v in hist["versions"] if stage_of(v["id"]) == stage)
    return f"{stage}/v{n:04d}"


def getrec(root, vid):
    verify_lock(root)
    _, hist = paths(root)
    for v in hist["versions"]:
        if v["id"] == vid:
            p = root / v["path"]
            if not p.exists() or digest(p) != v["sha256"]:
                raise ValueError(f"ASSET TAMPER: {vid}")
            return v, p
    raise ValueError(f"Unknown version: {vid}")


def view_ok(root, vid):
    s = stage_of(vid)
    if s not in NEEDS_REVIEW:
        return True
    _, hist = paths(root)
    for entry in reversed(hist["reviews"]):
        if entry["version"] == vid:
            return entry["decision"] == "pass"
    return False


def require_stage(root, vid, stage, require_review=True):
    record, p = getrec(root, vid)
    if stage_of(vid) != stage:
        raise ValueError(f"Expected parent {stage}, got {vid}")
    if require_review and not view_ok(root, vid):
        raise ValueError(f"VISUAL REVIEW GATE: {vid} is not marked pass; use review")
    return record, p


def png_info(path, stage):
    with Image.open(path) as im:
        im.load()
        fmt, mode, size = im.format, im.mode, im.size
        if stage != "S00_source" and fmt != "PNG":
            raise ValueError(f"{stage} requires PNG")
        if stage in ("S02_raw_cutout", "S03_refined_cutout", "S04_upright", "S05_positioned", "S06_gradient"):
            if mode != "RGBA":
                raise ValueError(f"{stage} requires real RGBA, not RGB")
            lo, hi = im.getchannel("A").getextrema()
            if lo != 0 or hi < 128:
                raise ValueError("No genuine transparency or insufficient opaque foreground")
            if stage in ("S02_raw_cutout", "S03_refined_cutout") and size == CARD_SIZE:
                raise ValueError("Cutout matches full card size; do not import flattened cards")
        if stage in ("S05_positioned", "S06_gradient", "S07_card") and size != CARD_SIZE:
            raise ValueError(f"{stage} must be 390x630")
        if stage == "S07_card" and mode not in ("RGB", "RGBA"):
            raise ValueError("Card mode invalid")
        return {"size": list(size), "mode": mode, "format": fmt}


def add(root, stage, srcfile, parent=None, method="programmatic", notes="", extra=None):
    root = rootpath(root)
    verify_lock(root)
    _, hist = paths(root)
    if stage not in STAGES:
        raise ValueError(f"Unknown stage: {stage}")
    if stage == "S00_source" and parent is not None:
        raise ValueError("Source must not have a parent")
    if stage != "S00_source":
        idx = STAGES.index(stage)
        if not parent or stage_of(parent) != STAGES[idx - 1]:
            raise ValueError(f"{stage} must descend from {STAGES[idx-1]}")
        require_stage(root, parent, STAGES[idx-1])
    file = Path(srcfile).resolve()
    if not file.is_file():
        raise ValueError(f"File not found: {file}")
    project = verify_lock(root)
    if digest(file) in {x["sha256"] for x in project["locked"].values()}:
        raise ValueError("You cannot import the card template or gradient as plant artwork")
    tech = png_info(file, stage)
    vid = next_id(hist, stage)
    ext = file.suffix.lower()
    final_rel = Path("history") / vid / ("asset" + ext)
    target = root / final_rel
    target.parent.mkdir(parents=True, exist_ok=False)
    shutil.copyfile(file, target)
    target.chmod(0o444)
    rec = {"id": vid, "stage": stage, "parent": parent, "path": str(final_rel),
           "sha256": digest(target), "method": method, "created_utc": utc(),
           "notes": notes, "technical": {"pass": True, **tech}, "extra": extra or {}}
    hist["versions"].append(rec)
    savej(root / "history.json", hist)
    print(f"CREATED {vid}\n{target}")
    return vid


def cmd_init(a):
    root = Path(a.root).expanduser().resolve()
    if root.exists() and list(root.iterdir()):
        raise ValueError("Refusing to overwrite existing directory")
    root.mkdir(parents=True, exist_ok=True)
    items = {}
    for name, src in [("back_template", a.back), ("gradient", a.gradient)]:
        p = Path(src).resolve()
        if not p.is_file():
            raise ValueError(f"Missing {p}")
        with Image.open(p) as im:
            im.load()
            if name == "back_template" and im.size != CARD_SIZE:
                raise ValueError("Back template must be exactly 390x630")
        target = root / "locked" / (name + p.suffix.lower())
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, target)
        target.chmod(0o444)
        items[name] = {"path": str(target.relative_to(root)), "sha256": digest(target)}
    savej(root / "project.json", {"format": "preview-only-v1", "card": a.card,
          "species": a.species, "created_utc": utc(), "locked": items,
          "oval_bbox": DEFAULT_OVAL, "policy": {"never_generate_card": True,
          "never_generate_gradient": True, "edit_inputs_only": list(SOURCES_FOR_GENERATIVE_CLEANUP),
          "required_visual_checks": NEEDS_REVIEW}})
    savej(root / "history.json", {"versions": [], "reviews": [], "owner_approval": []})
    vid = add(root, "S00_source", a.photo, notes=f"photo ID: {a.photo_id or 'unprovided'}; license metadata: {a.license or 'unprovided'}", method="original-photo", extra={"photo_id": a.photo_id, "license": a.license, "license_independently_verified": False})
    print(f"Initialized card {a.card} preview. Source is {vid}. NO PHOTO EDIT PERFORMED.")


def cmd_crop(a):
    root = rootpath(a.root)
    _, p = require_stage(root, a.parent, "S00_source")
    with Image.open(p) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        xy = tuple(a.box)
        if len(xy) != 4 or not (0 <= xy[0] < xy[2] <= im.width and 0 <= xy[1] < xy[3] <= im.height):
            raise ValueError("Invalid crop coordinates")
        out = im.crop(xy)
    d = root / "work" / uuid.uuid4().hex[:10]
    d.mkdir(parents=True)
    dst = d / "crop.png"
    out.save(dst)
    add(root, "S01_crop", dst, a.parent, notes=a.note or "Photo selection crop; requires visual review", extra={"crop_xyxy": xy})


def cmd_import_cutout(a):
    root = rootpath(a.root)
    stage = a.stage
    if stage not in ("S02_raw_cutout", "S03_refined_cutout"):
        raise ValueError("Only transparent S02/S03 photo cutouts may be imported")
    expected = "S01_crop" if stage == "S02_raw_cutout" else "S02_raw_cutout"
    require_stage(root, a.parent, expected)
    if a.method not in ALLOWED_CUTOUT_METHODS:
        raise ValueError("Method unrecognized; use a photo-editing method, never full-card generation")
    add(root, stage, a.file, a.parent, method=a.method, notes=a.note or "Photo-first isolated plant asset", extra={"ai_changes_documented": a.note if a.method == "photo-only-ai-cleanup" else None})


def cmd_review(a):
    root = rootpath(a.root)
    rec, _ = getrec(root, a.version)
    stage = stage_of(a.version)
    if a.reviewer not in ("agent", "owner", "botanical-reviewer"):
        raise ValueError("Reviewer must be agent, owner, or botanical-reviewer")
    if stage == "S00_source" or stage == "S02_raw_cutout":
        raise ValueError(f"{stage} has technical-only gate; review S01 or refined S03 instead")
    required = set(NEEDS_REVIEW.get(stage, "").split(",")) - {""}
    supplied = set(a.checks or [])
    if a.decision == "pass" and not required.issubset(supplied):
        raise ValueError("Missing explicit visual checks: " + ", ".join(sorted(required - supplied)))
    if not a.note.strip():
        raise ValueError("A meaningful observation note is required (not just 'pass')")
    _, hist = paths(root)
    hist["reviews"].append({"version": a.version, "asset_sha256": rec["sha256"], "decision": a.decision,
                           "reviewer": a.reviewer, "checks": sorted(supplied), "note": a.note,
                           "created_utc": utc()})
    savej(root / "history.json", hist)
    print(f"RECORDED {a.decision} for {a.version} by {a.reviewer}")


def cmd_export_editor(a):
    root = rootpath(a.root)
    rec, src = getrec(root, a.version)
    if stage_of(a.version) not in SOURCES_FOR_GENERATIVE_CLEANUP:
        raise ValueError("Cannot export positioned, gradient, card, or locked originals to image generation")
    folder = root / "work" / ("edit-job-" + uuid.uuid4().hex[:10])
    folder.mkdir(parents=True, exist_ok=False)
    dst = folder / ("isolated_photo_input" + src.suffix)
    shutil.copyfile(src, dst)
    savej(folder / "EDIT_JOB.json", {"version": a.version, "sha256": rec["sha256"],
                                   "input": str(dst), "allowed": "ISOLATED PHOTO OR CUTOUT ONLY",
                                   "forbidden": "ANY CARD OR GRADIENT INPUT"})
    print(str(dst))


def cmd_rotate(a):
    root = rootpath(a.root)
    _, p = require_stage(root, a.parent, "S03_refined_cutout")
    if abs(a.degrees) > 15:
        raise ValueError("Rotate <= 15 degrees only; select a more suitable photo otherwise")
    with Image.open(p) as im:
        im = im.convert("RGBA")
        bb = im.getchannel("A").getbbox()
        if not bb:
            raise ValueError("Empty alpha")
        im = im.crop(bb)
        im = im.rotate(a.degrees, expand=True, resample=Image.Resampling.BICUBIC)
        bb2 = im.getchannel("A").getbbox()
        im = im.crop(bb2)
    path = root / "work" / ("rotated-" + uuid.uuid4().hex[:10] + ".png")
    im.save(path)
    add(root, "S04_upright", path, a.parent, notes=f"Deterministic rotation {a.degrees} degrees; {a.note}", extra={"rotation_deg": a.degrees})


def ellipse_inside(x, y, bbox, margin=5):
    l, t, r, b = bbox
    cx, cy = (l+r)/2, (t+b)/2
    rx, ry = (r-l)/2 - margin, (b-t)/2 - margin
    return ((x-cx)/rx)**2 + ((y-cy)/ry)**2 <= 1


def ensure_positioned_inside(im, ellipse):
    from PIL import ImageDraw
    m = Image.new("L", CARD_SIZE, 0)
    d = ImageDraw.Draw(m)
    l,t,r,b = ellipse
    d.ellipse((l+5,t+5,r-5,b-5), fill=255)
    alpha = im.getchannel("A")
    aa, mm = alpha.load(), m.load()
    outside = 0
    for y in range(CARD_SIZE[1]):
        for x in range(CARD_SIZE[0]):
            if aa[x,y] > 16 and mm[x,y] == 0:
                outside += 1
    return outside


def cmd_place(a):
    root = rootpath(a.root)
    _, p = require_stage(root, a.parent, "S04_upright")
    project = verify_lock(root)
    with Image.open(p) as im:
        im = im.convert("RGBA")
        bb = im.getchannel("A").getbbox()
        if not bb:
            raise ValueError("No subject")
        im = im.crop(bb)
        l, t, r, b = project["oval_bbox"]
        # Search biggest proportional fit without letting any visible plant pixel escape the oval.
        maxscale = min((r-l-12)/im.width, (b-t-12)/im.height)
        if maxscale <= 0:
            raise ValueError("Bad fit")
        selected = None
        for i in range(70):
            factor = maxscale * (0.985 ** i)
            tw, th = max(1, round(im.width*factor)), max(1, round(im.height*factor))
            if (tw, th) == (0, 0):
                continue
            scaled = im.resize((tw, th), Image.Resampling.LANCZOS)
            frame = Image.new("RGBA", CARD_SIZE, (0, 0, 0, 0))
            x = round((l+r-tw)/2)
            y = round((t+b-th)/2)
            frame.alpha_composite(scaled, (x, y))
            if ensure_positioned_inside(frame, project["oval_bbox"]) == 0:
                selected = (frame, x, y, tw, th, factor)
                break
        if selected is None:
            raise ValueError("Unable to fit cutout within oval; select different source/crop")
        frame, x, y, tw, th, factor = selected
    dest = root / "work" / ("positioned-" + uuid.uuid4().hex[:10] + ".png")
    frame.save(dest)
    add(root, "S05_positioned", dest, a.parent, notes=a.note or "Proportional centered placement; no clipping", extra={"xy": [x,y], "size": [tw,th], "scale": factor, "outside_oval_alpha_gt16": 0})


def gradient_overlay(src, gradient):
    import numpy as np
    a = np.array(src.convert("RGBA"), dtype=np.uint8)[:, :, 3]
    g = np.array(gradient.convert("RGB").resize(CARD_SIZE, Image.Resampling.BILINEAR), dtype=np.uint8)
    rgba = np.empty((CARD_SIZE[1], CARD_SIZE[0], 4), dtype=np.uint8)
    rgba[:,:,:3] = g
    rgba[:,:,3] = a
    return Image.fromarray(rgba, "RGBA")


def cmd_gradient(a):
    root = rootpath(a.root)
    _, p = require_stage(root, a.parent, "S05_positioned")
    project = verify_lock(root)
    with Image.open(p) as cutout, Image.open(root / project["locked"]["gradient"]["path"]) as g:
        out = gradient_overlay(cutout, g)
    dest = root / "work" / ("gradient-" + uuid.uuid4().hex[:10] + ".png")
    out.save(dest)
    add(root, "S06_gradient", dest, a.parent, notes="Exact source-gradient pixel mapping; no synthesis", extra={"gradient_sha256": project["locked"]["gradient"]["sha256"], "mapping": "supplied 500x500 source resized to 390x630 BILINEAR; RGB from gradient, alpha from positioned cutout"})


def cmd_assemble(a):
    import numpy as np
    root = rootpath(a.root)
    _, overlay_file = require_stage(root, a.parent, "S06_gradient")
    project = verify_lock(root)
    with Image.open(overlay_file) as im, Image.open(root / project["locked"]["back_template"]["path"]) as orig:
        fg = im.convert("RGBA")
        bg = orig.convert("RGBA")
        result = Image.alpha_composite(bg, fg)
        # Assert exact preservation of pixels wherever overlay is fully transparent.
        b = np.asarray(bg)
        f = np.asarray(fg)
        r = np.asarray(result)
        outside = f[:,:,3] == 0
        if not np.array_equal(b[outside], r[outside]):
            raise ValueError("Base changed outside plant overlay")
        if ensure_positioned_inside(fg, project["oval_bbox"]) != 0:
            raise ValueError("Plant overlay escaped oval")
        with Image.open(root / project["locked"]["gradient"]["path"]) as gradient:
            expected = np.asarray(gradient_overlay(fg, gradient))
        active = f[:,:,3] > 0
        if not np.array_equal(f[active,:3], expected[active,:3]):
            raise ValueError("Gradient RGB does not match supplied source mapping")
        result = result.convert("RGB")
    dest = root / "work" / ("card-" + uuid.uuid4().hex[:10] + ".png")
    result.save(dest)
    add(root, "S07_card", dest, a.parent, notes="Reassembled ONLY by exact alpha compositing onto immutable original card", extra={"base_changes_outside_alpha": 0, "gradient_rgb_mismatch_pixels": 0, "outside_oval_alpha_gt16": 0, "status": "DRAFT UNTIL OWNER APPROVES"})


def cmd_status(a):
    root = rootpath(a.root)
    _, hist = paths(root)
    print("Card preview history (never overwrite images):")
    for v in hist["versions"]:
        visual = ('PASS' if view_ok(root,v['id']) else 'PENDING/FAIL') if stage_of(v['id']) in NEEDS_REVIEW else 'n/a'
        print(f"  {v['id']:29s} parent={v['parent'] or '-':29s} tech=PASS  visual={visual}")
    print("Owner-approved:", [x["version"] for x in hist["owner_approval"]])


def cmd_approve(a):
    root = rootpath(a.root)
    v,p = require_stage(root, a.version, "S07_card")
    if a.reviewer != "owner":
        raise ValueError("Only owner can approve production card")
    if not a.note.strip():
        raise ValueError("Owner approval note required")
    _, hist = paths(root)
    hist["owner_approval"].append({"version": a.version, "sha256": v["sha256"], "reviewer":"owner", "note": a.note, "at": utc()})
    savej(root / "history.json", hist)
    print("Owner approval recorded:", a.version)


def cmd_verify(a):
    import numpy as np
    root = rootpath(a.root)
    project = verify_lock(root)
    _, hist = paths(root)
    errors = []
    seen = set()
    for r in hist["versions"]:
        try:
            if r["id"] in seen:
                raise ValueError("duplicate version ID")
            seen.add(r["id"])
            p = root / r["path"]
            if not p.exists() or digest(p) != r["sha256"]:
                raise ValueError("asset checksum mismatch")
            png_info(p, r["stage"])
            if r["parent"] and r["parent"] not in seen:
                raise ValueError("parent missing or after child")
            if r["stage"] == "S05_positioned":
                with Image.open(p) as im:
                    if ensure_positioned_inside(im.convert("RGBA"), project["oval_bbox"]) != 0:
                        raise ValueError("placed pixels outside oval")
            if r["stage"] == "S06_gradient":
                parent = next(x for x in hist["versions"] if x["id"] == r["parent"])
                with Image.open(p) as im, Image.open(root / parent["path"]) as placed, Image.open(root / project["locked"]["gradient"]["path"]) as g:
                    candidate = np.asarray(im.convert("RGBA"))
                    expected = np.asarray(gradient_overlay(placed, g))
                    if not np.array_equal(candidate, expected):
                        raise ValueError("exact gradient mapping mismatch")
            if r["stage"] == "S07_card":
                parent = next(x for x in hist["versions"] if x["id"] == r["parent"])
                with Image.open(p) as im, Image.open(root / parent["path"]) as layer, Image.open(root / project["locked"]["back_template"]["path"]) as bg:
                    expected = Image.alpha_composite(bg.convert("RGBA"), layer.convert("RGBA")).convert("RGB")
                    if not np.array_equal(np.asarray(im.convert("RGB")), np.asarray(expected)):
                        raise ValueError("card not exactly reproducible from base+overlay")
        except Exception as e:
            errors.append(f"{r['id']}: {e}")
    for item in hist["reviews"]:
        if item["version"] not in seen:
            errors.append(f"Review references missing version: {item['version']}")
        else:
            rec=next(x for x in hist["versions"] if x["id"] == item["version"])
            if rec["sha256"] != item["asset_sha256"]:
                errors.append(f"Review points to altered asset: {item['version']}")
    if errors:
        for err in errors: print("FAIL",err)
        raise ValueError(f"Verification failed: {len(errors)} errors")
    print(f"PASS: immutable originals and {len(seen)} versions verified, gradient, card reproduction and history hashes checked")


def build_parser():
    p = argparse.ArgumentParser(description="PlantDex preview-only versioned editing gates (never generates card or gradient)")
    sub = p.add_subparsers(dest="cmd", required=True)
    def common(cmd, helptext=""):
        a = sub.add_parser(cmd, help=helptext)
        a.add_argument("--root", required=True)
        return a
    a=common("init");a.add_argument("--card",type=int,required=True);a.add_argument("--species",required=True);a.add_argument("--photo",required=True);a.add_argument("--back",required=True);a.add_argument("--gradient",required=True);a.add_argument("--photo-id",default="");a.add_argument("--license",default="");a.set_defaults(fn=cmd_init)
    a=common("crop");a.add_argument("--parent",required=True);a.add_argument("--box",nargs=4,type=int,required=True);a.add_argument("--note",default="");a.set_defaults(fn=cmd_crop)
    a=common("import-cutout");a.add_argument("--parent",required=True);a.add_argument("--file",required=True);a.add_argument("--stage",choices=["S02_raw_cutout","S03_refined_cutout"],required=True);a.add_argument("--method",choices=sorted(ALLOWED_CUTOUT_METHODS),required=True);a.add_argument("--note",default="");a.set_defaults(fn=cmd_import_cutout)
    a=common("review");a.add_argument("--version",required=True);a.add_argument("--decision",choices=["pass","fail"],required=True);a.add_argument("--reviewer",choices=["agent","owner","botanical-reviewer"],required=True);a.add_argument("--checks",nargs="*",default=[]);a.add_argument("--note",required=True);a.set_defaults(fn=cmd_review)
    a=common("export-editor");a.add_argument("--version",required=True);a.set_defaults(fn=cmd_export_editor)
    a=common("rotate");a.add_argument("--parent",required=True);a.add_argument("--degrees",type=float,required=True);a.add_argument("--note",default="");a.set_defaults(fn=cmd_rotate)
    a=common("place");a.add_argument("--parent",required=True);a.add_argument("--note",default="");a.set_defaults(fn=cmd_place)
    a=common("gradient");a.add_argument("--parent",required=True);a.set_defaults(fn=cmd_gradient)
    a=common("assemble");a.add_argument("--parent",required=True);a.set_defaults(fn=cmd_assemble)
    a=common("approve");a.add_argument("--version",required=True);a.add_argument("--reviewer",choices=["owner","agent"],required=True);a.add_argument("--note",required=True);a.set_defaults(fn=cmd_approve)
    a=common("status");a.set_defaults(fn=cmd_status)
    a=common("verify");a.set_defaults(fn=cmd_verify)
    return p


def main():
    args = build_parser().parse_args()
    try:
        args.fn(args)
    except (ValueError, OSError) as e:
        print("REJECTED:", str(e), file=sys.stderr)
        sys.exit(2)


if __name__ == "__main__":
    main()
