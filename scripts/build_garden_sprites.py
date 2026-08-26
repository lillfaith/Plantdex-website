#!/usr/bin/env python3
"""Compile authored Garden growth sprites into sheets + a manifest.

Run: python3 scripts/build_garden_sprites.py [--preview taraxacum-officinale] [--stage 2]

WHY A SECOND SPRITE SYSTEM, ALONGSIDE `build_sprites.py`.

The portraits in `public/cards/animated/` are CREATURES: a face, a personality, a
trademark gesture. They are the plant as a character. A Garden sprite is the opposite
brief — it is the plant as a PLANT, growing, with no face and nothing anthropomorphic, and
it has to read at 3 stages rather than perform one loop. Sharing a file with the creature
builder would mean every species carrying two unrelated sets of parameters, so this is its
own small pipeline with its own source directory.

What the two DO share is the rule that matters: the authored grid is the source of truth,
the PNG is output, nothing is ever resampled, and the palette comes from the species' own
portrait so the Garden and the Herbdex are visibly the same universe.

THE GROWTH SPRITES ARE NOT THE PORTRAITS, SCALED.

That was the obvious shortcut and it is explicitly not what this does. A portrait shrunk to
a third is a blurry portrait; a portrait at three sizes is one plant pretending to grow.
Each stage is drawn separately, showing what that species actually looks like at that point
in its life — a dandelion's first two toothed leaves, then its rosette, then the rosette
with a flower on a hollow stem.

THE CANVAS, and why every species shares it.

24x24 authored pixels, and every stage is BOTTOM-ANCHORED: a species writes only the rows
its plant occupies, and this file pads the top. That is what lets a pine be tall and a wood
sorrel low while both stand on the same ground line — the thing that makes a row of
different species read as one planting rather than a row of stickers.

Nothing draws its own ground, background, border or label. A sprite is the plant alone on
transparency, so the same asset works inside today's Garden list and, later, dropped into a
larger pixel Garden scene.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = Path(__file__).resolve().parent / "garden_sources"
OUT_DIR = ROOT / "public" / "cards" / "garden"
MANIFEST = ROOT / "src" / "data" / "garden-sprites.json"

# The authored grid. Square so a species can be tall (pine) or wide (a sprawling bramble)
# without a second canvas size to keep in step.
CANVAS = 24

# Shipped at 5x, matching the portraits, so one authored pixel is a 5x5 block of identical
# colour and `image-rendering: pixelated` handles everything above that with no resampling.
SCALE = 5

# Discovered / learned / mastered — `src/lib/garden.ts` owns that mapping and this file
# never re-derives it. Three frames on one sheet, in stage order.
STAGES = ("sprout", "growing", "flowering")


def load_sources() -> dict[str, dict]:
    """Import every module in `garden_sources/`, keyed by herb id."""
    if str(SOURCE_DIR) not in sys.path:
        sys.path.insert(0, str(SOURCE_DIR))
    sources: dict[str, dict] = {}
    for path in sorted(SOURCE_DIR.glob("*.py")):
        if path.name.startswith("_"):
            continue
        spec = importlib.util.spec_from_file_location(path.stem, path)
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        entry = module.GARDEN
        sources[entry["herbId"]] = entry
    return sources


def place(rows: list[str]) -> list[list[str]]:
    """Bottom-anchor and centre an authored stage on the shared canvas.

    Bottom-anchoring is the whole reason species of wildly different heights sit together
    convincingly: a sprite's last row is always the ground line, so nothing floats and
    nothing has to be nudged by hand per species.
    """
    if len(rows) > CANVAS:
        raise SystemExit(f"stage is {len(rows)} rows; the canvas is {CANVAS}")
    grid = [[" "] * CANVAS for _ in range(CANVAS)]
    top = CANVAS - len(rows)

    # Centre the STAGE, once, by its widest row — never each row on its own. Per-row
    # centring silently shears the drawing: a 19-wide row and a 21-wide row land on
    # different left edges, so a stem drawn straight comes out with a kink in it.
    span = max(len(row) for row in rows)
    if span > CANVAS:
        raise SystemExit(f"stage is {span} wide; the canvas is {CANVAS}")
    left = (CANVAS - span) // 2

    for y, row in enumerate(rows):
        for x, char in enumerate(row):
            if char != " ":
                grid[top + y][left + x] = char
    return grid


def check_connected(herb_id: str, stage: str, grid: list[list[str]]) -> None:
    """Fail if a stage is drawn in more than one piece.

    A plant is one plant. This is invisible while authoring, because the art is a list of
    strings and a gap only exists in the render: a flower stalk that stops two rows above
    the leaves reads perfectly well as text and looks broken as a picture. It happened
    once, to the violet, and was caught by squinting at a preview — which is not a system.

    Four-connected, deliberately: pixels touching only at a corner look detached at the
    sizes this ships at, so a diagonal is not a join.
    """
    filled = {
        (x, y)
        for y, row in enumerate(grid)
        for x, char in enumerate(row)
        if char != " "
    }
    if not filled:
        raise SystemExit(f"{herb_id} ({stage}): stage is empty")

    start = min(filled)
    seen = {start}
    queue = [start]
    while queue:
        x, y = queue.pop()
        for neighbour in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if neighbour in filled and neighbour not in seen:
                seen.add(neighbour)
                queue.append(neighbour)

    if seen != filled:
        stray = sorted(filled - seen)
        raise SystemExit(
            f"{herb_id} ({stage}): {len(stray)} pixel(s) are not attached to the plant, "
            f"starting at column {stray[0][0]}, row {stray[0][1]}"
        )


def compile_entry(entry: dict) -> dict:
    """Render the three stages into one horizontal sheet, and return its manifest row."""
    stages = entry["stages"]
    if list(stages) != list(STAGES):
        raise SystemExit(
            f"{entry['herbId']}: stages must be exactly {STAGES}, got {tuple(stages)}"
        )
    palette = {char: tuple(rgba) for char, rgba in entry["palette"].items()}

    sheet = Image.new("RGBA", (CANVAS * len(STAGES) * SCALE, CANVAS * SCALE), (0, 0, 0, 0))
    pixels = sheet.load()

    for index, stage in enumerate(STAGES):
        grid = place(stages[stage])
        check_connected(entry["herbId"], stage, grid)
        for y, row in enumerate(grid):
            for x, char in enumerate(row):
                if char == " ":
                    continue
                if char not in palette:
                    raise SystemExit(
                        f"{entry['herbId']} ({stage}): '{char}' is not in the palette"
                    )
                colour = palette[char]
                base_x = (index * CANVAS + x) * SCALE
                base_y = y * SCALE
                for sy in range(SCALE):
                    for sx in range(SCALE):
                        pixels[base_x + sx, base_y + sy] = colour

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT_DIR / f"{entry['herbId']}.png", "PNG", optimize=True)

    return {
        "herbId": entry["herbId"],
        "src": f"/cards/garden/{entry['herbId']}.png",
        "frameWidth": CANVAS * SCALE,
        "frameHeight": CANVAS * SCALE,
        "stages": list(STAGES),
        "note": entry.get("note", ""),
    }


def preview(entry: dict, stage: str) -> None:
    """Print one stage as text, so the art can be judged without opening a file."""
    for row in place(entry["stages"][stage]):
        print("".join("." if c == " " else c for c in row))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", help="herb id to print as text instead of building")
    parser.add_argument("--stage", default="flowering", choices=STAGES)
    args = parser.parse_args()

    sources = load_sources()
    if not sources:
        raise SystemExit(f"No garden sources found in {SOURCE_DIR}")

    if args.preview:
        if args.preview not in sources:
            raise SystemExit(f"No garden sprite for '{args.preview}'")
        preview(sources[args.preview], args.stage)
        return

    manifest = {}
    for herb_id in sorted(sources):
        manifest[herb_id] = compile_entry(sources[herb_id])

    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Built {len(manifest)} garden sprites -> {OUT_DIR}")
    for herb_id in manifest:
        print(f"  {herb_id}")


if __name__ == "__main__":
    main()
