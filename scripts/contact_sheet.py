"""A contact sheet for BATCH ART REVIEW: one cell per species, the leading candidate's
finished card preview, with the gate verdict printed on it.

Why a sheet rather than one preview at a time: art direction is a COMPARATIVE judgement.
Whether a specimen reads as a deck card is answerable only against the other cards, and
reviewing them one by one is how a batch drifts -- each one looks acceptable beside the
last, and the twentieth no longer belongs with the first.

A cell shows the verdict it ALREADY has, from scripts/gates.py. This script decides
nothing; it is a viewer. Rejected leaders are drawn too, struck through, because a species
whose best candidate failed is exactly the one that needs another photo search, and
omitting it would make the sheet look complete when a species has nothing.

It also writes a decisions TEMPLATE -- one row per cell, pre-filled with the current
status -- so a reviewer edits a file rather than typing ids. Accepting a row writes a
HUMAN_APPROVED into evidence/human-decisions.json, which gates.py reads and which
nothing in the pipeline may overwrite.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "evidence" / "candidates"

COLS = 5
CELL_W = 260          # the card art is 800x1293; 260 wide keeps a 420px tall card
PAD = 14
BAND = 58             # the status band under each card
LABEL = 34            # species + photo id above it

INK = (28, 24, 38)
PAPER = (246, 244, 240)
STATUS_COLOUR = {
    "AUTO_APPROVED": (14, 110, 70),
    "HUMAN_APPROVED": (18, 86, 140),
    "NEEDS_REVIEW": (150, 96, 10),
    "REJECTED": (150, 28, 40),
}


def font(size: int):
    for p in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def leading(species: str) -> dict | None:
    """The cell for one species: its best candidate, rejected or not.

    Deliberately NOT 'its best candidate that passed'. A sheet that silently drops a
    failing species reads as a clean batch with fewer rows, and nobody counts rows.
    """
    gf = BASE / species / "gates.json"
    cf = BASE / species / "candidates.json"
    if not gf.exists() or not cf.exists():
        return None
    g = json.loads(gf.read_text())
    cands = {str(s["photo_id"]): s for s in json.loads(cf.read_text())["selected"]}
    rows = g["candidates"]
    if not rows:
        return None
    passing = [r for r in rows if r["status"] in ("AUTO_APPROVED", "HUMAN_APPROVED",
                                                  "NEEDS_REVIEW")]
    row = (passing or rows)[0]
    src = cands.get(str(row["photo_id"]))
    if not src:
        return None
    return {
        "species": species,
        "photo_id": row["photo_id"],
        "status": row["status"],
        "preview": BASE / species / src["preview"],
        "why": (row["hard_failures"] or row["soft_notes"] or [""])[0],
        "had_alternatives": len(rows),
        "any_passing": bool(passing),
        "genuine_api_vision": g["any_genuine_api_vision"],
    }


def draw(cells: list[dict], out: Path) -> None:
    card_h = int(CELL_W * 1293 / 800)
    cell_h = LABEL + card_h + BAND
    cols = min(COLS, max(1, len(cells)))
    rows = (len(cells) + cols - 1) // cols
    W = PAD + cols * (CELL_W + PAD)
    H = PAD + 46 + rows * (cell_h + PAD)
    sheet = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(sheet)
    n_api = sum(1 for c in cells if c["genuine_api_vision"])
    d.text((PAD, PAD), f"PlantDex photo review - {len(cells)} species", font=font(22), fill=INK)
    d.text((PAD, PAD + 26),
           f"genuine API vision on {n_api}/{len(cells)}; nothing auto-approves without it",
           font=font(13), fill=(96, 92, 104))

    for i, c in enumerate(cells):
        cx = PAD + (i % cols) * (CELL_W + PAD)
        cy = PAD + 46 + (i // cols) * (cell_h + PAD)
        d.text((cx, cy), c["species"].replace("_", " "), font=font(14), fill=INK)
        d.text((cx, cy + 17), f"#{c['photo_id']}", font=font(12), fill=(110, 106, 118))
        art = Image.open(c["preview"]).convert("RGB").resize((CELL_W, card_h), Image.LANCZOS)
        sheet.paste(art, (cx, cy + LABEL))
        colour = STATUS_COLOUR[c["status"]]
        if c["status"] == "REJECTED":
            # struck through, so a rejected leader cannot be mistaken for a shortlist entry
            d.line((cx, cy + LABEL, cx + CELL_W, cy + LABEL + card_h), fill=colour, width=3)
            d.line((cx + CELL_W, cy + LABEL, cx, cy + LABEL + card_h), fill=colour, width=3)
        by = cy + LABEL + card_h
        d.rectangle((cx, by, cx + CELL_W, by + BAND), fill=colour)
        d.text((cx + 6, by + 4), c["status"], font=font(13), fill=(255, 255, 255))
        words, line, lines = c["why"].split(), "", []
        for w in words:
            if len(line) + len(w) > 44:
                lines.append(line)
                line = w
            else:
                line = f"{line} {w}".strip()
        lines.append(line)
        for j, ln in enumerate(lines[:2]):
            d.text((cx + 6, by + 21 + j * 14), ln, font=font(11), fill=(255, 255, 255))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)


def template(cells: list[dict], out: Path) -> None:
    out.write_text(json.dumps({
        "_how": "Set decision to approved or rejected and give a reason, then run "
                "scripts/contact_sheet.py --record. Rows left as 'open' change nothing.",
        "rows": [{"species": c["species"], "photo_id": c["photo_id"],
                  "current_status": c["status"], "decision": "open", "reason": ""}
                 for c in cells],
    }, indent=2) + "\n")


def record(tpl: Path) -> int:
    """Fold a reviewed template into evidence/human-decisions.json.

    ADDITIVE ONLY. An existing decision is never rewritten and never deleted by this
    script: the owner's verdicts are the one input in this pipeline that no automated
    step may overturn, which is the whole reason they live in a file of their own.
    """
    doc = json.loads(tpl.read_text())
    hf = ROOT / "evidence" / "human-decisions.json"
    have = json.loads(hf.read_text()) if hf.exists() else {}
    added = 0
    for r in doc["rows"]:
        if r["decision"] not in ("approved", "rejected"):
            continue
        key = str(r["photo_id"])
        if key in have:
            print(f"  kept existing decision for {key} ({have[key]['decision']})")
            continue
        if r["decision"] == "rejected" and not r.get("reason", "").strip():
            print(f"  SKIPPED {key}: a rejection needs a reason")
            continue
        have[key] = {"species": r["species"], "decision": r["decision"],
                     "by": "owner, batch review", "reason": r.get("reason", "")}
        added += 1
    hf.write_text(json.dumps(have, indent=2) + "\n")
    print(f"recorded {added} new decision(s); {len(have)} total")
    return 0


def main() -> int:
    a = argparse.ArgumentParser()
    a.add_argument("--species", nargs="*")
    a.add_argument("--out", default="evidence/candidates/contact-sheet.png")
    a.add_argument("--record", metavar="TEMPLATE")
    args = a.parse_args()
    if args.record:
        return record(Path(args.record))
    names = args.species or sorted(p.name for p in BASE.iterdir()
                                   if (p / "gates.json").exists())
    if len(names) > 25:
        print(f"{len(names)} species; a sheet holds 25 -- review in batches", file=sys.stderr)
        names = names[:25]
    cells = [c for c in (leading(n) for n in names) if c]
    if not cells:
        print("nothing to review", file=sys.stderr)
        return 1
    out = ROOT / args.out
    draw(cells, out)
    tpl = out.with_suffix(".decisions.json")
    template(cells, tpl)
    print(f"{out}  ({len(cells)} cells)")
    print(f"{tpl}")
    for c in cells:
        mark = "" if c["any_passing"] else "   <- needs another photo search"
        print(f"  {c['status']:15} {c['species']:24} #{c['photo_id']}{mark}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
