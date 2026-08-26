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

A part may also carry named VARIANTS - alternate art selected per frame by its `art`
track. That is how a sprite blinks: the eyes are their own part, and two frames of the
loop draw the closed pair instead of the open one. Offsets alone cannot do that, and a
blink is most of what separates a creature portrait from a decorated icon.

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
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = Path(__file__).resolve().parent / "sprite_sources"
OUT_DIR = ROOT / "public" / "cards" / "animated"
MANIFEST = ROOT / "src" / "data" / "sprites.json"

# Rendered scale. Sprites are authored at ~32x28 and shipped at 5x, so the PNG holds
# whole pixels and `image-rendering: pixelated` handles any further scaling without the
# browser ever resampling.
#
# 5x rather than 4x is what makes the art read as PIXEL art: dropping the authored grid
# to three quarters of its old size only reduces the pixel COUNT. Raising the scale with
# it keeps the portrait about the same size on the card while each authored pixel lands
# a quarter larger, which is the part the eye reads as chunky.
SCALE = 5

# Frame counts globals.css has a `steps()` class for. `steps()` cannot read a CSS custom
# property, so the count must resolve to a literal class - a sheet outside this set would
# slide smoothly instead of snapping frame to frame, quietly losing the retro feel. Fail
# the build rather than ship that.
SUPPORTED_FRAME_COUNTS = (4, 6, 8, 10, 12, 14, 16, 18)

# Growth stages, matching `src/lib/garden.ts`. `flowering` is not listed because it is not
# derived: it IS the authored sprite, and a species that stages nothing still resolves
# every stage to that one portrait.
DERIVED_STAGES = ("sprout", "growing")


def apply_stage(sprite: dict, stage: str, recipe: dict) -> dict:
    """Derive an earlier-stage creature from the authored (flowering) one.

    WHY A RECIPE RATHER THAN THREE DRAWINGS. A species' portrait is a whole performance -
    sixteen frames, five head poses, arms that lag the body. Authoring that three times per
    species is 135 character animations, which is not a thing that gets finished, and a
    half-finished one is worse than none. A stage is instead a short declaration of what is
    DIFFERENT about the creature when it is younger, applied to art that already exists.

    WHAT MAKES A CREATURE READ AS YOUNGER, and why these are the knobs:

      hide     Parts it has not grown yet. A dandelion's arms ARE its basal leaves, so a
               seedling simply has none - which is botany, not stylisation.
      swap     Rows to replace: a closed green bud where the open bloom goes, sleepier
               eyes, a smaller mouth. This is where a stage earns its keep, because a
               bud is a different ORGAN, not a smaller copy of a flower.
      variants Poses for a swapped part, since the adult's no longer fit its new rows.
      origins  Where a part sits, for when a shorter creature needs its face lower.
      frames   A calmer loop. A seedling that performs the adult's whole jump is an adult
               drawn small; breathing instead is what reads as young.
      motion   The loop itself, when `frames` changes.
      palette  Extra colours a bud needs and the open flower does not.

    The face is deliberately NOT removable. The whole point of staging these sprites is
    that the player's own creature grows up, so it has to stay recognisably itself at
    every stage - same character, younger.
    """
    staged = dict(sprite)
    staged["herbId"] = f"{sprite['herbId']}-{stage}"
    staged["stageOf"] = sprite["herbId"]
    staged["stage"] = stage

    if "size" in recipe:
        staged["size"] = recipe["size"]
    if "fps" in recipe:
        staged["fps"] = recipe["fps"]
    if "palette" in recipe:
        staged["palette"] = {**sprite["palette"], **recipe["palette"]}

    hidden = set(recipe.get("hide", ()))
    swaps = recipe.get("swap", {})
    origins = recipe.get("origins", {})
    variants = recipe.get("variants", {})

    known = {part["name"] for part in sprite["parts"]}
    for name in (*hidden, *swaps, *origins, *variants):
        if name not in known:
            raise SystemExit(
                f"{sprite['herbId']} ({stage}): no part named '{name}' "
                f"(has: {sorted(known)})"
            )

    parts = []
    for part in sprite["parts"]:
        if part["name"] in hidden:
            continue
        part = dict(part)
        if part["name"] in swaps:
            part["rows"] = swaps[part["name"]]
            # A swapped part's variants describe the OPEN flower's poses and no longer
            # match the rows underneath them. Dropping them here means a stage that keeps
            # the adult's motion track fails loudly on the missing variant rather than
            # rendering a bud wearing a bloom's highlight.
            part["variants"] = {}
        if part["name"] in variants:
            part["variants"] = variants[part["name"]]
        if part["name"] in origins:
            part["origin"] = origins[part["name"]]
        parts.append(part)
    staged["parts"] = parts

    if "frames" in recipe:
        staged["frames"] = recipe["frames"]
        # A shorter loop cannot reuse tracks indexed for the long one: `render_frame`
        # wraps with `%`, so frame 3 of a 6-frame stage would silently pick up frame 3 of
        # the adult's 16-frame jump. Require the stage to say how it moves.
        if "motion" not in recipe:
            raise SystemExit(
                f"{sprite['herbId']} ({stage}): changing `frames` needs its own `motion`"
            )
    if "motion" in recipe:
        staged["motion"] = recipe["motion"]

    # Motion tracks naming a part this stage hid are dead weight, and usually mean the
    # recipe was copied and half-edited.
    live = {part["name"] for part in parts}
    for name in staged["motion"]:
        if name not in live:
            raise SystemExit(
                f"{sprite['herbId']} ({stage}): motion track for '{name}', which this "
                f"stage does not draw"
            )

    return staged


def load_sources() -> dict[str, dict]:
    """Import every sprite module in `sprite_sources/`, keyed by herb id.

    The source directory goes on `sys.path` so a sprite can import shared helpers from
    its neighbours - `_flowerhead.py` builds the lobed flower head several species need,
    and files starting with `_` are helpers rather than sprites, so they are skipped here.
    """
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
        sprite = module.SPRITE
        sources[sprite["herbId"]] = sprite
    return sources


def draw_part(
    canvas: list[list[str]],
    part: dict,
    rows: list[str],
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

        # `art` names a variant per frame; None (or no track) means the default rows.
        art_track = motion.get("art")
        variant = art_track[frame % len(art_track)] if art_track else None
        if variant:
            variants = part.get("variants", {})
            if variant not in variants:
                raise SystemExit(
                    f"{sprite['herbId']}: part '{part['name']}' frame {frame} asks for "
                    f"variant '{variant}', which it does not define "
                    f"(has: {sorted(variants) or 'none'})"
                )
            rows = variants[variant]
        else:
            rows = part["rows"]

        draw_part(canvas, part, rows, dx, dy, lean, width, height)

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


def staged_sprites(sprite: dict) -> dict[str, dict]:
    """Every derived stage a species declares, keyed by stage name."""
    recipes = sprite.get("stages", {})
    unknown = set(recipes) - set(DERIVED_STAGES)
    if unknown:
        raise SystemExit(
            f"{sprite['herbId']}: unknown stage(s) {sorted(unknown)}; "
            f"derived stages are {DERIVED_STAGES} ('flowering' is the authored sprite)"
        )
    return {stage: apply_stage(sprite, stage, recipes[stage])
            for stage in DERIVED_STAGES if stage in recipes}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--preview", help="herb id to print as text instead of building")
    parser.add_argument("--frame", type=int, default=0)
    parser.add_argument(
        "--stage", choices=DERIVED_STAGES,
        help="preview a derived stage instead of the authored sprite",
    )
    args = parser.parse_args()

    sources = load_sources()
    if not sources:
        raise SystemExit(f"No sprite sources found in {SOURCE_DIR}")

    if args.preview:
        if args.preview not in sources:
            raise SystemExit(f"Unknown sprite: {args.preview}")
        sprite = sources[args.preview]
        if args.stage:
            staged = staged_sprites(sprite)
            if args.stage not in staged:
                raise SystemExit(f"{args.preview} declares no '{args.stage}' stage")
            sprite = staged[args.stage]
        preview(sprite, args.frame)
        return

    manifest = {}
    staged_count = 0
    for herb_id, sprite in sorted(sources.items()):
        entry = compile_sprite(sprite)
        stages = {}
        for stage, staged in staged_sprites(sprite).items():
            # Each stage is a sheet of its own, so nothing about the adult portrait
            # changes and a species with no stage art keeps resolving every stage to it.
            stages[stage] = compile_sprite(staged)
            staged_count += 1
        if stages:
            entry["stages"] = stages
        manifest[herb_id] = entry

    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Built {len(manifest)} sprite sheet(s) (+{staged_count} stage) into {OUT_DIR}")
    for herb_id, entry in manifest.items():
        extra = f"  + {', '.join(entry['stages'])}" if "stages" in entry else ""
        print(f"  {herb_id}: {entry['frames']} frames @ {entry['fps']}fps{extra}")


if __name__ == "__main__":
    main()
