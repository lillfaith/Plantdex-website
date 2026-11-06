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
status -- so a reviewer edits a file rather than typing ids. A row's verdict is appended to
the ledger in scripts/decisions.py, which gates.py reads and which nothing in the pipeline
may overwrite.

THE OWNER MAY CHANGE HIS MIND, AND THE OLD READING IS KEPT. A row that would overwrite an
existing verdict is refused unless it also carries "revise": true, in which case the new
verdict takes effect and the previous one stays in that photo id's history. Both halves
matter: without the guard, a re-run or a stale template could silently flip a decision;
without the revision, a judgement made from a thumbnail could never be corrected once the
finished card was on a sheet, which is the whole purpose of a contact sheet.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import decisions  # noqa: E402

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
        "owner_preferred": bool(row.get("owner_preferred")),
        "owner_alternative": bool(row.get("owner_alternative")),
        "art_direction": g.get("art_direction", ""),
    }


def every(species: str, limit: int) -> list[dict]:
    """Every candidate for one species, best first -- the 20-25 preview sheet.

    `leading` shows one cell per species, which is the right sheet for scanning a catalogue.
    This is the right sheet for CHOOSING: five species at four candidates each is nineteen
    previews, and the question "which of these four" cannot be asked of a sheet that shows
    one of them.
    """
    gf, cf = BASE / species / "gates.json", BASE / species / "candidates.json"
    if not gf.exists() or not cf.exists():
        return []
    g = json.loads(gf.read_text())
    cands = {str(c["photo_id"]): c for c in json.loads(cf.read_text())["selected"]}
    out = []
    for row in g["candidates"][:limit]:
        src = cands.get(str(row["photo_id"]))
        if not src:
            continue
        out.append({
            "species": species, "photo_id": row["photo_id"], "status": row["status"],
            "preview": BASE / species / src["preview"],
            "why": (row["hard_failures"] or row["soft_notes"] or [""])[0],
            "had_alternatives": len(g["candidates"]),
            "any_passing": any(r["status"] != "REJECTED" for r in g["candidates"]),
            "genuine_api_vision": g["any_genuine_api_vision"],
            "owner_preferred": bool(row.get("owner_preferred")),
            "owner_alternative": bool(row.get("owner_alternative")),
            "art_direction": g.get("art_direction", ""),
        })
    return out


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
    n_sp = len({c["species"] for c in cells})
    d.text((PAD, PAD),
           f"PlantDex photo review - {len(cells)} previews across {n_sp} species",
           font=font(22), fill=INK)
    d.text((PAD, PAD + 26),
           f"genuine API vision on {n_api}/{len(cells)}; nothing auto-approves without it",
           font=font(13), fill=(96, 92, 104))

    for i, c in enumerate(cells):
        cx = PAD + (i % cols) * (CELL_W + PAD)
        cy = PAD + 46 + (i // cols) * (cell_h + PAD)
        d.text((cx, cy), c["species"].replace("_", " "), font=font(14), fill=INK)
        pin = ("  * owner's preferred" if c["owner_preferred"]
               else "  + owner's alternative" if c.get("owner_alternative") else "")
        d.text((cx, cy + 17), f"#{c['photo_id']}{pin}", font=font(12),
               fill=(18, 86, 140) if pin else (110, 106, 118))
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
    have = decisions.current()
    out.write_text(json.dumps({
        "_how": "Set decision to approved, rejected or preferred and give a reason, then "
                "run scripts/contact_sheet.py --record FILE. Rows left as 'open' change "
                "nothing.",
        "_decisions": {
            "approved": "you approve this card; gates.py reports HUMAN_APPROVED",
            "rejected": "never use this photograph; needs a reason",
            "preferred": "pin it as the leader WITHOUT approving the card; stays "
                         "NEEDS_REVIEW",
        },
        "_revising": "To change a verdict you already gave, set \"revise\": true and give "
                     "the new reason. The previous verdict is kept in that photo id's "
                     "history and is never deleted.",
        "rows": [{"species": c["species"], "photo_id": c["photo_id"],
                  "current_status": c["status"],
                  "existing_decision": have.get(str(c["photo_id"]), {}).get("decision", ""),
                  "decision": "open", "reason": "", "revise": False}
                 for c in cells],
    }, indent=2) + "\n")


def record(tpl: Path) -> int:
    """Fold a reviewed template into the ledger.

    APPEND-ONLY, NOT IMMUTABLE. scripts/decisions.py keeps every verdict ever given for a
    photo id and treats the newest as the one in force, so a revision supersedes without
    erasing. This function therefore never has to choose between protecting the owner's
    judgement and letting him change it: it passes `revise` through and the ledger keeps
    the trail.
    """
    doc = json.loads(tpl.read_text())
    changed = 0
    for r in doc["rows"]:
        if r.get("decision") not in decisions.VALUES:
            continue
        ok, msg = decisions.record(r["photo_id"], r.get("species", ""), r["decision"],
                                   r.get("reason", ""), by="owner, batch review",
                                   revise=bool(r.get("revise")))
        print(("  " if ok else "  SKIPPED ") + msg)
        changed += int(ok)
    print(f"{changed} verdict(s) applied; {len(decisions.current())} in force")
    return 0


def show_history(photo_id: str) -> int:
    trail = decisions.history(photo_id)
    if not trail:
        print(f"no verdict has ever been recorded for {photo_id}")
        return 0
    for i, h in enumerate(trail, 1):
        mark = "  (in force)" if i == len(trail) else "  (superseded)"
        print(f"{i}. {h.get('at', '?')}  {h['decision'].upper():10} by "
              f"{h.get('by', '?')}{mark}")
        print(f"   {h['reason']}")
    return 0


def main() -> int:
    a = argparse.ArgumentParser()
    a.add_argument("--species", nargs="*")
    a.add_argument("--out", default="evidence/candidates/contact-sheet.png")
    a.add_argument("--record", metavar="TEMPLATE")
    a.add_argument("--history", metavar="PHOTO_ID")
    a.add_argument("--per-species", type=int, default=0,
                   help="show this many candidates per species instead of only the leader")
    args = a.parse_args()
    if args.history:
        return show_history(args.history)
    if args.record:
        return record(Path(args.record))
    names = args.species or sorted(p.name for p in BASE.iterdir()
                                   if (p / "gates.json").exists())
    if args.per_species and len(names) * args.per_species > 25:
        keep = max(1, 25 // max(1, args.per_species))
        print(f"{len(names)} species x {args.per_species} is over 25 cells -- showing the "
              f"first {keep} species; review in batches", file=sys.stderr)
        names = names[:keep]
    if len(names) > 25:
        print(f"{len(names)} species; a sheet holds 25 -- review in batches", file=sys.stderr)
        names = names[:25]
    if args.per_species:
        cells = [c for n in names for c in every(n, args.per_species)]
    else:
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
        pin = ("  [owner's preferred]" if c["owner_preferred"]
               else "  [owner's alternative]" if c.get("owner_alternative") else "")
        print(f"  {c['status']:15} {c['species']:24} #{c['photo_id']}{pin}{mark}")
        if c["art_direction"]:
            print(f"                  art direction: {c['art_direction'][:96]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
