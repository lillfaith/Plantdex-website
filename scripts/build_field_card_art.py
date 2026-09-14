#!/usr/bin/env python3
"""
Card art for the Field Cards — the digital-only set unlocked by XP.

WHY THIS IS A SEPARATE SCRIPT FROM `build_deck.py`, AND WHY IT IS NOT `--only`.
`build_deck.py` owns Collection 01: it renders art AND writes `herbs.json` from the `DECK`
table, and it validates the whole printed deck as a unit. Field Cards are not in that table
and never will be — they are not printed, they carry a different `collectionId`, and their
data lives hand-written in `src/lib/field-cards.ts` beside the reasoning about what an XP
unlock is and is not. Running the deck builder over them would either demand entries in the
printed table (making a Field Card look like card #52 of a 45-card deck) or need a mode flag
threaded through every validation it performs.

So this script does the ONE thing the two sets genuinely share: turning a two-page card PDF
into the five image variants the app serves. It imports `render` and `SPRITE_BOX` from
`build_deck.py` rather than restating them, because art that is cropped a few pixels
differently from the printed 45 is art that looks wrong beside them in the same grid.

WHAT IT ALSO DOES, AND THIS IS THE POINT. It re-derives the water / sun / temperature pips
from the rendered artwork with `build_deck.py`'s own `count_stat`, and prints them. The
`stats` in `field-cards.ts` are typed by hand from a card somebody looked at; this is what
turns "I counted three suns" into a measurement. `--expect` fails the run when the artwork
disagrees with what you were about to write down, which is the same contract the printed
deck has: the table is held to the card, never the other way round.

Chips are NOT written here. `build_chips.py` derives every chip from the shipped fronts in
one pass, so running it afterwards is what keeps the chip set complete — see its docstring.

    python3 scripts/build_field_card_art.py --source <dir>
    python3 scripts/build_field_card_art.py --source <dir> --expect 52=4,3,2

Source files are named `<card number>-<herb id>.pdf`, e.g. `52-hamamelis-virginiana.pdf`.
The id is in the filename rather than derived from the PDF because the id is a decision
recorded in `field-cards.ts` — deriving it here would give two places that could disagree
about what a card is called.
"""

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    import pymupdf
    from PIL import Image
except ImportError:  # pragma: no cover - dev tooling only
    sys.exit("PyMuPDF and Pillow are required: pip3 install pymupdf pillow")

from build_deck import (  # noqa: E402  (path set above)
    CHECK_ZOOM,
    FULL_WIDTH,
    SPRITE_BOX,
    SPRITE_SCALE,
    THUMB_WIDTH,
    count_stat,
    render,
)

REPO = Path(__file__).resolve().parent.parent
OUT_ART = REPO / "public" / "cards"

# `count_stat` was calibrated against a 356x576 render; see build_deck.py's note on
# CHECK_ZOOM. Reproduced here as a name rather than a literal so the two cannot drift.
CHECK_WIDTH = 356

NAME = re.compile(r"^(\d+)-([a-z0-9-]+)\.pdf$")


def parse_expected(raw: str | None) -> dict[int, tuple[int, int, int]]:
    """`--expect 52=4,3,2` -> {52: (water, sun, temperature)}."""
    out: dict[int, tuple[int, int, int]] = {}
    if not raw:
        return out
    for chunk in raw.split():
        number, _, triple = chunk.partition("=")
        parts = [p for p in triple.split(",") if p]
        if not number.isdigit() or len(parts) != 3 or not all(p.isdigit() for p in parts):
            raise SystemExit(f"--expect wants 'NN=water,sun,temp', got {chunk!r}")
        out[int(number)] = (int(parts[0]), int(parts[1]), int(parts[2]))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--source",
        required=True,
        type=Path,
        help="Directory of two-page PDFs named <number>-<herb-id>.pdf (page 1 front, page 2 back).",
    )
    ap.add_argument(
        "--expect",
        help=(
            "Space-separated 'NN=water,sun,temp' assertions. Any card whose artwork "
            "disagrees fails the run and nothing is written for it."
        ),
    )
    ap.add_argument("--dry-run", action="store_true", help="Measure and report; write nothing.")
    args = ap.parse_args()

    if not args.source.is_dir():
        print(f"Not a directory: {args.source}", file=sys.stderr)
        return 1

    expected = parse_expected(args.expect)

    cards: list[tuple[int, str, Path]] = []
    for path in sorted(args.source.glob("*.pdf")):
        match = NAME.match(path.name)
        if not match:
            print(f"Skipping {path.name}: expected <number>-<herb-id>.pdf", file=sys.stderr)
            continue
        cards.append((int(match.group(1)), match.group(2), path))

    if not cards:
        print(f"No usable PDFs in {args.source}", file=sys.stderr)
        return 1

    numbers = [number for number, _, _ in cards]
    duplicates = {n for n in numbers if numbers.count(n) > 1}
    if duplicates:
        # The exact failure the first upload of these four cards carried: two different
        # species both printing #54. Caught here rather than at `npm test`, where the
        # message would be about an array and not about a card.
        print(f"Two PDFs share a card number: {sorted(duplicates)}", file=sys.stderr)
        return 1

    problems: list[str] = []
    measured: list[str] = []

    for number, herb_id, path in cards:
        doc = pymupdf.open(path)
        if doc.page_count != 2:
            problems.append(f"#{number} {herb_id}: expected 2 pages, got {doc.page_count}")
            doc.close()
            continue

        check_img = render(doc[0], CHECK_WIDTH)
        stats = tuple(count_stat(check_img, kind) for kind in ("water", "sun", "temp"))

        printed = doc[0].get_text()
        if f"\n{number}\n" not in f"\n{printed}\n" and str(number) not in printed:
            problems.append(f"#{number} {herb_id}: the artwork does not print {number}")

        want = expected.get(number)
        if want and tuple(want) != stats:
            problems.append(
                f"#{number} {herb_id}: expected water/sun/temp {want}, artwork shows {stats}"
            )
            doc.close()
            continue

        measured.append(
            f"  #{number:<3} {herb_id:<24} water={stats[0]} sun={stats[1]} temp={stats[2]}"
        )

        if not args.dry_run:
            for folder in ("", "thumb", "back", "sprite"):
                (OUT_ART / folder).mkdir(parents=True, exist_ok=True)
            render(doc[0], FULL_WIDTH).save(
                OUT_ART / f"{herb_id}.webp", "WEBP", quality=84, method=6
            )
            render(doc[0], THUMB_WIDTH).save(
                OUT_ART / "thumb" / f"{herb_id}.webp", "WEBP", quality=80, method=6
            )
            render(doc[1], FULL_WIDTH).save(
                OUT_ART / "back" / f"{herb_id}.webp", "WEBP", quality=84, method=6
            )
            sprite = check_img.crop(SPRITE_BOX)
            sprite = sprite.resize(
                (sprite.width * SPRITE_SCALE, sprite.height * SPRITE_SCALE), Image.NEAREST
            )
            sprite.save(OUT_ART / "sprite" / f"{herb_id}.webp", "WEBP", quality=90, method=6)

        doc.close()

    print("Measured from the artwork (not from any table):")
    print("\n".join(measured) if measured else "  (nothing)")

    if problems:
        print("\nProblems — nothing was written for these cards:", file=sys.stderr)
        for problem in problems:
            print(f"  {problem}", file=sys.stderr)
        return 1

    if args.dry_run:
        print("\nDry run: no files written.")
    else:
        print(
            f"\nWrote front/thumb/back/sprite for {len(measured)} card(s) "
            f"to {OUT_ART.relative_to(REPO)}/."
        )
        print("Now run `npm run build:chips` to derive the 112px chips.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
