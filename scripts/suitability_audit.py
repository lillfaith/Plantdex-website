#!/usr/bin/env python3
"""Look at what the suitability screen threw away, before trusting it at scale.

A SCREEN THAT REJECTS 92 OF 96 PHOTOGRAPHS IS EITHER A GOOD SCREEN OR A BROKEN ONE, and
the numbers it prints cannot tell you which. This renders the rejected SOURCES at a size a
person can judge, each with its photo id and the exact reason it was refused, beside the
candidates that survived. The question it exists to answer is the false-rejection rate:
are these photographs genuinely missing the structure, or is a colour rule too strict?

The sample is SEEDED, so the same twenty come back on a re-run and a disagreement can be
pointed at by id. Nothing is changed by looking: this script writes one image.

    python3 scripts/suitability_audit.py --species sambucus_canadensis --sample 20
"""
from __future__ import annotations

import argparse, json, pathlib, random, sys

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import suitability                                    # noqa: E402

PHOTOS = ROOT / "evidence" / "photos"
CANDS = ROOT / "evidence" / "candidates"
CELL, PAD, CAPTION, COLS = 240, 12, 62, 6
PAPER, INK, DIM = (247, 245, 241), (26, 22, 34), (104, 100, 112)
BAD, GOOD = (156, 36, 46), (16, 104, 70)


def font(sz: int):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(p, sz) if pathlib.Path(p).exists() else ImageFont.load_default()


def wrap(d: ImageDraw.ImageDraw, text: str, f, width: int) -> list[str]:
    out, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if d.textlength(trial, font=f) > width and line:
            out.append(line)
            line = word
        else:
            line = trial
    out.append(line)
    return out


def main() -> int:
    a = argparse.ArgumentParser(description=__doc__)
    a.add_argument("--species", required=True)
    a.add_argument("--sample", type=int, default=20)
    a.add_argument("--seed", type=int, default=7)
    a.add_argument("--out")
    args = a.parse_args()

    sp = args.species
    brief = suitability.brief_for(sp)
    doc = json.loads((PHOTOS / sp / "photos.json").read_text())
    files = [(str(e["photo_id"]), PHOTOS / sp / e["file"])
             for e in doc["photos"] if (PHOTOS / sp / e.get("file", "")).exists()]

    shortlisted = set()
    cf = CANDS / sp / "candidates.json"
    if cf.exists():
        shortlisted = {str(r["photo_id"])
                       for r in json.loads(cf.read_text()).get("selected", [])}

    rejected, survived = [], []
    for pid, f in files:
        r = suitability.screen(f, brief)
        row = {"pid": pid, "file": f, **r}
        (rejected if r["verdict"] == "unsuitable" else survived).append(row)

    random.Random(args.seed).shuffle(rejected)
    sample = rejected[:args.sample]
    cells = [{**c, "kept": False} for c in sample] + [{**c, "kept": True} for c in survived]

    rows = (len(cells) + COLS - 1) // COLS
    W = PAD + COLS * (CELL + PAD)
    H = PAD + 58 + rows * (CELL + CAPTION + PAD)
    sheet = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(sheet)
    d.text((PAD, PAD), f"{sp.replace('_', ' ')} - suitability audit", font=font(21), fill=INK)
    d.text((PAD, PAD + 26),
           f"{len(rejected)} of {len(files)} refused before segmentation. "
           f"{len(sample)} sampled at random (seed {args.seed}), shown with the reason. "
           f"The {len(survived)} that survived are at the end, in green.",
           font=font(12), fill=DIM)
    d.text((PAD, PAD + 42),
           f"brief for this card requires: {brief.get('mandatory') or 'nothing specific'}"
           f"   -- a card-specific brief, not a universal rule for the species",
           font=font(12), fill=DIM)

    for i, c in enumerate(cells):
        x = PAD + (i % COLS) * (CELL + PAD)
        y = PAD + 58 + (i // COLS) * (CELL + CAPTION + PAD)
        im = Image.open(c["file"]).convert("RGB")
        im.thumbnail((CELL, CELL), Image.LANCZOS)
        sheet.paste(im, (x + (CELL - im.width) // 2, y + (CELL - im.height) // 2))
        colour = GOOD if c["kept"] else BAD
        d.rectangle((x, y, x + CELL, y + CELL), outline=colour, width=2)
        mark = ("SURVIVED" if c["kept"] else "refused")
        star = "  [shortlisted]" if c["pid"] in shortlisted else ""
        d.text((x, y + CELL + 3), f"#{c['pid']}  {mark}{star}", font=font(11), fill=colour)
        why = (c["reasons"][0] if c["reasons"] else
               f"berry {c['shares'].get('berry_dark', 0):.3f}  "
               f"foliage {c['shares'].get('foliage', 0):.3f}")
        for j, ln in enumerate(wrap(d, why, font(10), CELL)[:3]):
            d.text((x, y + CELL + 18 + j * 12), ln, font=font(10), fill=DIM)

    out = ROOT / (args.out or f"evidence/candidates/{sp}-suitability-audit.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(f"{len(rejected)}/{len(files)} refused; {len(survived)} survived")
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
