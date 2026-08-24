#!/usr/bin/env python3
"""Compile authored pixel-art plant sprites into sprite sheets + a manifest.

Run: python3 scripts/build_sprites.py [--preview taraxacum-officinale]

Why a build step rather than checked-in PNGs: the same rule the deck data already
follows (CLAUDE.md - "Deck data is generated"). The authored source of truth is a
Python module per species under `scripts/sprite_sources/`, holding a palette, the
sprite's parts as character grids, and a personality profile. The PNG in `public/`
is output; never hand-edit it.

HOW THE ANIMATION WORKS

A part is a character grid. A frame is that grid drawn at an INTEGER pixel offset,
optionally sheared so a stem can lean while staying rooted. There is no rotation and
no resampling anywhere in this file - that is what keeps the edges crisp and the
palette exact. Anti-aliasing would break the whole look, so nothing here is allowed
to interpolate.

Personality lives entirely in the per-species profile: how far the head bobs, how
fast the leaves flutter, whether the body leans forward eagerly or holds itself
upright. Adding species 2..45 is authoring a base sprite and a profile, not writing
new animation code.

FRAME 0 IS SPECIAL. It is the resting pose, and it is what `prefers-reduced-motion`
freezes on, so it must read as a complete, dignified sprite on its own - never a
mid-bounce stub. This mirrors the rule the loading sprout already follows.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = Path(__file__).resolve().parent / "sprite_sources"
OUT_DIR = ROOT / "public" / "cards" / "animated"
MANIFEST = ROOT / "src" / "data" / "sprites.json"

# Rendered scale. The sprite is authored at ~32x40 and shipped at 4x so it is legible
# as a portrait without the browser ever resampling it: the PNG holds whole pixels and
# `image-rendering: pixelated` handles any further scaling.
SCALE = 4

# Frame counts globals.css has a `steps()` class for. `steps()` cannot read a CSS custom
# property, so the count must resolve to a literal class - a sheet outside this set would
# slide smoothly instead of snapping frame to frame, quietly losing the retro feel. Fail
# the build rather than ship that.
SUPPORTED_FRAME_COUNTS = (4, 6, 8, 10, 12)


def load_sources() -> dict[str, dict]:
    """Import every sprite module in `sprite_sources/`, keyed by herb id."""
    sources: dict[str, dict] = {}
    for path in sorted(SOURCE_DIR.glob("*.py")):
        if path.name.startswith("_"):
            continue
        spec = importlib.util.spec_from_file_location(path.stem, path)
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        sprite = module.SPRITE
        sources[sprite["herbId"]] = sprite
    return sources


def draw_part(
    canvas: list[list[str]],
    part: dict,
    dx: int,
    dy: int,
    lean: int,
    width: int,
    height: int,
) -> None:
    """Stamp one part onto the canvas at an integer offset.

    `lean` shears the part: the top row moves by `lean` and the bottom row not at all,
    interpolating linearly between. That is what lets a stem sway while staying planted,
    and because the shift is rounded to whole pixels at every row, no pixel is ever
    blended with its neighbour.
    """
    rows = part["rows"]
    ox, oy = part["origin"]
    tall = max(1, len(rows) - 1)

    for row_index, row in enumerate(rows):
        # Rows nearer the top of the part lean furthest; the base stays put.
        shear = round(lean * (tall - row_index) / tall) if lean else 0
        for col_index, char in enumerate(row):
            if char == " ":
                continue
            x = ox + col_index + dx + shear
            y = oy + row_index + dy
            if 0 <= x < width and 0 <= y < height:
                canvas[y][x] = char


def render_frame(sprite: dict, frame: int) -> list[list[str]]:
    """Build one frame as a grid of palette characters."""
    width, height = sprite["size"]
    canvas = [[" "] * width for _ in range(height)]

    for part in sprite["parts"]:
        motion = sprite["motion"].get(part["name"], {})
        # A part with no motion track simply holds still for every frame.
        dx = motion.get("dx", [0])[frame % len(motion.get("dx", [0]))]
        dy = motion.get("dy", [0])[frame % len(motion.get("dy", [0]))]
        lean = motion.get("lean", [0])[frame % len(motion.get("lean", [0]))]
        draw_part(canvas, part, dx, dy, lean, width, height)

    return canvas


def compile_sprite(sprite: dict) -> dict:
    """Render every frame into one horizontal sheet and return its manifest entry."""
    width, height = sprite["size"]
    frames = sprite["frames"]
    if frames not in SUPPORTED_FRAME_COUNTS:
        raise SystemExit(
            f"{sprite['herbId']}: {frames} frames has no steps() class in globals.css; "
            f"use one of {SUPPORTED_FRAME_COUNTS}"
        )
    palette = {char: tuple(rgba) for char, rgba in sprite["palette"].items()}

    sheet = Image.new("RGBA", (width * frames * SCALE, height * SCALE), (0, 0, 0, 0))
    pixels = sheet.load()

    for frame in range(frames):
        grid = render_frame(sprite, frame)
        for y, row in enumerate(grid):
            for x, char in enumerate(row):
                if char == " ":
                    continue
                if char not in palette:
                    raise SystemExit(
                        f"{sprite['herbId']}: '{char}' is not in the palette"
                    )
                colour = palette[char]
                # Draw the authored pixel as a solid SCALE x SCALE block. Nearest
                # neighbour by construction - nothing is interpolated.
                base_x = (frame * width + x) * SCALE
                base_y = y * SCALE
                for sy in range(SCALE):
                    for sx in range(SCALE):
                        pixels[base_x + sx, base_y + sy] = colour

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"{sprite['herbId']}.png"
    sheet.save(out_path, "PNG", optimize=True)

    return {
        "herbId": sprite["herbId"],
        "src": f"/cards/animated/{sprite['herbId']}.png",
        "frameWidth": width * SCALE,
        "frameHeight": height * SCALE,
        "frames": frames,
        "fps": sprite["fps"],
        "personality": sprite["personality"],
    }


def preview(sprite: dict, frame: int = 0) -> None:
    """Print a frame as text, so the art can be judged without opening a file."""
    for row in render_frame(sprite, frame):
        print("".join("." if c == " " else c for c in row))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", help="herb id to print as text instead of building")
    parser.add_argument("--frame", type=int, default=0)
    args = parser.parse_args()

    sources = load_sources()
    if not sources:
        raise SystemExit(f"No sprite sources found in {SOURCE_DIR}")

    if args.preview:
        if args.preview not in sources:
            raise SystemExit(f"Unknown sprite: {args.preview}")
        preview(sources[args.preview], args.frame)
        return

    manifest = {herb_id: compile_sprite(s) for herb_id, s in sorted(sources.items())}
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Built {len(manifest)} sprite sheet(s) into {OUT_DIR}")
    for herb_id, entry in manifest.items():
        print(f"  {herb_id}: {entry['frames']} frames @ {entry['fps']}fps")


if __name__ == "__main__":
    main()
