#!/usr/bin/env python3
"""Checks every authored sprite's face features actually land on its face.

Run: python3 scripts/audit_sprites.py [herb-id ...]

WHY. The one bug this set keeps producing is a feature drawn at an estimated origin:
eyes lost in the mane, a mouth hanging in empty space, a face patch too small for the
pair of eyes on it. It is invisible in the source and obvious on the page. This renders
every frame and reports which feature pixels landed on something that is not the face -
so a misplaced feature is a number in a terminal rather than something to spot by eye.

WHAT COUNTS AS MISPLACED. A feature pixel on the face is right; one on the face's own
outline is fine and often deliberate, because a wide grin is meant to span the whole
face. A pixel on the body, on a leaf or on nothing at all is the bug, and that is what
this reports.

It is a development tool, not part of `npm run verify`: `plant-sprites.test.ts` guards
the shipped manifest, and this guards the authoring.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_sprites import load_sources, render_frame  # noqa: E402

# Parts that must sit inside the face patch. Cheeks and brows ride its edge by design -
# a brow sits ON the rim - so they are held to a share rather than to every pixel.
STRICT = ("eyes", "mouth")
LOOSE = ("cheeks", "brows")

# Above this share of a loose part off the face, it is no longer riding the edge.
LOOSE_TOLERANCE = 0.6


def audit(sprite: dict) -> list[str]:
    problems: list[str] = []
    width, height = sprite["size"]
    face_char = sprite.get("faceChar", "F")
    outline_char = sprite.get("outlineChar", "o")
    names = [p["name"] for p in sprite["parts"]]
    checked = [n for n in names if n in STRICT + LOOSE]
    if not checked:
        return [f"{sprite['herbId']}: no face parts to check"]

    for frame in range(sprite["frames"]):
        # Re-render with the checked parts removed, to see what is underneath them.
        below = {
            name: render_frame({**sprite, "parts": [p for p in sprite["parts"] if p["name"] != name]}, frame)
            for name in checked
        }
        for part in sprite["parts"]:
            if part["name"] not in checked:
                continue
            motion = sprite["motion"].get(part["name"], {})
            variant = (motion.get("art") or [None])[frame % len(motion.get("art") or [None])]
            rows = part["variants"][variant] if variant else part["rows"]
            dx = motion.get("dx", [0])[frame % len(motion.get("dx", [0]))]
            dy = motion.get("dy", [0])[frame % len(motion.get("dy", [0]))]
            ox, oy = part["origin"]
            under = below[part["name"]]
            off = 0
            total = 0
            for ry, row in enumerate(rows):
                for rx, char in enumerate(row):
                    if char == " ":
                        continue
                    total += 1
                    x, y = ox + rx + dx, oy + ry + dy
                    inside = 0 <= x < width and 0 <= y < height
                    if not inside or under[y][x] not in (face_char, outline_char):
                        off += 1
            limit = 0 if part["name"] in STRICT else int(total * LOOSE_TOLERANCE)
            if off > limit:
                problems.append(
                    f"{sprite['herbId']} frame {frame}: {part['name']}"
                    f"{f' ({variant})' if variant else ''} has {off}/{total} px"
                    f" on something that is not its face"
                )
    return problems


def main() -> None:
    sources = load_sources()
    wanted = sys.argv[1:] or sorted(sources)
    failed = False
    for herb_id in wanted:
        if herb_id not in sources:
            raise SystemExit(f"Unknown sprite: {herb_id}")
        problems = audit(sources[herb_id])
        if problems:
            failed = True
            # Only the first few per sprite: one bad origin repeats across every frame.
            for line in problems[:6]:
                print(line)
            if len(problems) > 6:
                print(f"  ... and {len(problems) - 6} more for {herb_id}")
        else:
            print(f"{herb_id}: features sit on the face in all frames")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
