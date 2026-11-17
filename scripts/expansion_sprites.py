#!/usr/bin/env python3
"""Build, audit and preview HIDDEN expansion-card sprites without touching the live set.

PRIVATE DEVELOPMENT TOOL. scripts/build_sprites.py writes into public/cards/animated and src/data/sprites.json, which would
publish artwork for cards that are hidden drafts (a test forbids expansion artwork in public/). This runs the SAME compiler and
the SAME audit with their paths pointed at expansion/sprites/, so authoring is identical and nothing is published.

    python3 scripts/expansion_sprites.py build                    compile every module in expansion/sprites/src
    python3 scripts/expansion_sprites.py audit                    audit_sprites' per-sprite checks on each (and each stage)
    python3 scripts/expansion_sprites.py preview <herb-id> [--stage sprout|growing] [--frame N]
    python3 scripts/expansion_sprites.py sheet <herb-id>          a contact sheet PNG of every frame of every stage, enlarged
Authored modules live in expansion/sprites/src/<snake_case_id>.py and import the shared helpers from scripts/sprite_sources.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
HERE = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "expansion" / "sprites" / "src"
BUILD = ROOT / "expansion" / "sprites" / "_build"
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE / "sprite_sources"))

import build_sprites as B  # noqa: E402

B.SOURCE_DIR, B.OUT_DIR, B.MANIFEST = SRC, BUILD, BUILD / "manifest.json"
BUILD.mkdir(parents=True, exist_ok=True)
import audit_sprites as A  # noqa: E402  (imported AFTER the paths are redirected)


def sources() -> dict:
    return B.load_sources()


def build() -> int:
    manifest = {}
    for hid, sp in sorted(sources().items()):
        e = B.compile_sprite(sp)
        st = {s: B.compile_sprite(x) for s, x in B.staged_sprites(sp).items()}
        if st:
            e["stages"] = st
        manifest[hid] = e
        print(f"built {hid}: {e['frames']} frames @ {e['fps']}fps + {list(st)}")
    B.MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    return 0


def audit() -> int:
    bad = 0
    for hid, sp in sorted(sources().items()):
        issues = [(hid, i) for i in A.audit(sp)]
        for s, x in B.staged_sprites(sp).items():
            issues += [(f"{hid}:{s}", i) for i in A.audit(x)]
        for who, i in issues:
            print(f"FAIL {who}: {i}")
        bad += len(issues)
        print(f"{'ok  ' if not issues else 'FAIL'} {hid}")
    return 1 if bad else 0


def preview(hid, stage, frame) -> int:
    sp = sources()[hid]
    if stage:
        sp = B.staged_sprites(sp)[stage]
    B.preview(sp, frame)
    return 0


def sheet(hid) -> int:
    from PIL import Image
    sp = sources()[hid]
    rows = [("flowering", sp)] + list(B.staged_sprites(sp).items())
    img = None
    y = 0
    cells = []
    for name, s in rows:
        n = s["frames"]
        sheet_im = Image.open(BUILD / f"{s['herbId']}.png").convert("RGBA")
        cells.append((name, sheet_im, n))
    w = max(c[1].width for c in cells)
    h = sum(c[1].height + 6 for c in cells)
    bg = Image.new("RGBA", (w, h), (150, 60, 230, 255))
    for name, im, n in cells:
        bg.alpha_composite(im, (0, y))
        y += im.height + 6
    out = BUILD / f"{hid}-sheet.png"
    bg.convert("RGB").save(out)
    print(out)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("build"); sub.add_parser("audit")
    p = sub.add_parser("preview"); p.add_argument("herb"); p.add_argument("--stage"); p.add_argument("--frame", type=int, default=0)
    p = sub.add_parser("sheet"); p.add_argument("herb")
    a = ap.parse_args()
    return {"build": build, "audit": audit}.get(a.cmd, lambda: preview(a.herb, a.stage, a.frame) if a.cmd == "preview" else sheet(a.herb))()


if __name__ == "__main__":
    sys.exit(main())
