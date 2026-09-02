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

It also checks that FRAME 0 IS ONE CONNECTED PIECE. A creature assembled from parts that
do not touch reads as a scatter of unrelated shapes rather than as an organism - a berry
hanging in mid-air beside a leaf, a trunk standing apart from its own canopy. Twenty-five
of the forty-five sprites had that fault and it is invisible while authoring, because the
parts are declared in a list and the gaps between them only exist in the render. A flower
or a fruit may sit anywhere it likes, as long as something connects it to the plant.

Detached elements DURING a gesture are fine and often the point - flung seeds, a pollen
cloud, a falling samara, a shed of snow. That is why this is a frame 0 rule: frame 0 is
the resting pose, and at rest a plant is one plant.

It also checks that the PNGs ON DISK match what the current sources would produce.
`--preview` renders without writing, so it is entirely possible to tweak a sprite, look
at it, and commit the previous build - which happened, and shipped a strawberry two
pixels out of place. `npm run verify` cannot catch it because it cannot run Python, so
the check lives here, where it runs every time a sprite is touched.

It is a development tool, not part of `npm run verify`: `plant-sprites.test.ts` guards
the shipped manifest, and this guards the authoring.
"""

from __future__ import annotations

import json
import re
import sys
from collections import deque
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

from build_sprites import (  # noqa: E402
    MANIFEST,
    OUT_DIR,
    load_sources,
    render_frame,
    staged_sprites,
)

ROOT = Path(__file__).resolve().parent.parent

# The built manifest, for each sheet's authored frame size. Read once: the badge check
# walks every sprite and every stage.
MANIFEST_DATA: dict = {}
if MANIFEST.exists():
    for _herb_id, _entry in json.loads(MANIFEST.read_text()).items():
        MANIFEST_DATA[_herb_id] = _entry
        for _stage, _staged in (_entry.get("stages") or {}).items():
            MANIFEST_DATA[_staged["herbId"]] = _staged

# Parts that must sit inside the face patch. Cheeks and brows ride its edge by design -
# a brow sits ON the rim - so they are held to a share rather than to every pixel.
STRICT = ("eyes", "mouth")
LOOSE = ("cheeks", "brows")

# Above this share of a loose part off the face, it is no longer riding the edge.
LOOSE_TOLERANCE = 0.6


def pieces(grid: list[list[str]]) -> list[int]:
    """Sizes of the separate blobs in a frame, largest first.

    Eight-connected, so a diagonal touch counts as joined - at this scale a stem meeting
    a leaf corner-to-corner is a join to the eye, and demanding edge contact would fail
    sprites that look perfectly solid.
    """
    height, width = len(grid), len(grid[0])
    seen = [[False] * width for _ in range(height)]
    sizes = []
    for y in range(height):
        for x in range(width):
            if grid[y][x] == " " or seen[y][x]:
                continue
            queue = deque([(x, y)])
            seen[y][x] = True
            size = 0
            while queue:
                cx, cy = queue.popleft()
                size += 1
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if (
                            0 <= nx < width
                            and 0 <= ny < height
                            and not seen[ny][nx]
                            and grid[ny][nx] != " "
                        ):
                            seen[ny][nx] = True
                            queue.append((nx, ny))
            sizes.append(size)
    return sorted(sizes, reverse=True)


def audit(sprite: dict) -> list[str]:
    problems: list[str] = []
    width, height = sprite["size"]
    face_char = sprite.get("faceChar", "F")
    outline_char = sprite.get("outlineChar", "o")
    # A blush is part of the face, so a wide grin whose corner touches one is fine.
    cheek_char = sprite.get("cheekChar", "c")
    names = [p["name"] for p in sprite["parts"]]
    checked = [n for n in names if n in STRICT + LOOSE]
    if not checked:
        return problems + [f"{sprite['herbId']}: no face parts to check"]

    blobs = pieces(render_frame(sprite, 0))
    if len(blobs) > 1:
        problems.append(
            f"{sprite['herbId']} frame 0: {len(blobs)} disconnected pieces "
            f"({', '.join(str(b) for b in blobs)} px) - at rest a plant is one plant"
        )

    for frame in range(sprite["frames"]):
        # What is UNDER a feature is whatever was drawn before it, not the whole sprite
        # minus that feature. A wood sorrel folds its leaflets down over its own face,
        # and judging the eyes against a canvas that already had the leaf on it reported
        # a correctly seated face as broken.
        order = [p["name"] for p in sprite["parts"]]
        below = {
            name: render_frame({**sprite, "parts": sprite["parts"][: order.index(name)]}, frame)
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
                    if not inside or under[y][x] not in (face_char, outline_char, cheek_char):
                        off += 1
            limit = 0 if part["name"] in STRICT else int(total * LOOSE_TOLERANCE)
            if off > limit:
                problems.append(
                    f"{sprite['herbId']} frame {frame}: {part['name']}"
                    f"{f' ({variant})' if variant else ''} has {off}/{total} px"
                    f" on something that is not its face"
                )
    return problems


def stale(sources: dict) -> list[str]:
    """Sprites whose built PNG no longer matches their source."""
    from build_sprites import compile_sprite

    problems = []
    for herb_id, sprite in sorted(sources.items()):
        path = OUT_DIR / f"{herb_id}.png"
        before = path.read_bytes() if path.exists() else None
        compile_sprite(sprite)
        if path.read_bytes() != before:
            problems.append(f"{herb_id}: the built sheet was out of date (rebuilt it)")
    return problems

def badge_fit(sources: dict) -> list[str]:
    """Sprites the sitewide avatar badge would have to crop.

    The badge is a 36px CIRCLE, and `contentFit` in `src/lib/plant-sprites.ts` scales each
    sprite so the plant - not the canvas it was drawn on - fills it. That is what stops a
    seedling being twelve pixels of green in the corner of every page, and it is only safe
    while the share it fills, `FRAME_FILL`, is one the circle can actually hold. 0.74 was
    chosen because at that value not one of the 135 sheets loses a pixel; a plant redrawn
    wider or a fill raised without re-measuring would start quietly cropping leaves, and
    nothing in `npm run verify` can see it because the cropping happens in a browser.

    So this re-measures the claim against the art, at the tightest of the avatar frames.
    """
    fill = frame_fill()
    inner = 32.0  # the badge's padding box inside its thickest (2px) frame border
    sample = 4  # supersample, so a clipped pixel is not a rounding artefact
    problems = []
    for herb_id in sorted(sources):
        path = OUT_DIR / f"{herb_id}.png"
        if not path.exists():
            continue
        sheet = Image.open(path).convert("RGBA")
        manifest = MANIFEST_DATA.get(herb_id)
        frame_w, frame_h = (
            (manifest["frameWidth"], manifest["frameHeight"])
            if manifest
            else (sheet.width, sheet.height)
        )
        frame = sheet.crop((0, 0, frame_w, frame_h))
        box = frame.getbbox()
        if box is None:
            continue
        left, top, right, bottom = (
            box[0] / frame_w,
            box[1] / frame_h,
            box[2] / frame_w,
            box[3] / frame_h,
        )
        width, height = right - left, bottom - top
        aspect = frame_w / frame_h
        scale = min(fill / width, fill * aspect / height)

        drawn_w = max(1, round(inner * scale * sample))
        drawn_h = max(1, round(inner / aspect * scale * sample))
        drawn = frame.resize((drawn_w, drawn_h), Image.NEAREST)
        alpha = drawn.split()[3].load()
        # The fit centres the ink box on the circle's centre, so that is where to measure
        # the radius from.
        centre_x = (left + width / 2) * drawn_w
        centre_y = (top + height / 2) * drawn_h
        radius = inner * sample / 2
        clipped = 0
        for y in range(drawn_h):
            for x in range(drawn_w):
                if alpha[x, y] < 8:
                    continue
                if (x + 0.5 - centre_x) ** 2 + (y + 0.5 - centre_y) ** 2 > radius**2:
                    clipped += 1
        if clipped:
            problems.append(
                f"{herb_id}: the avatar badge would crop it "
                f"({clipped / sample**2:.1f}px outside the circle at fill {fill})"
            )
    return problems


def frame_fill() -> float:
    """`FRAME_FILL` as the app actually defines it, so this cannot audit a stale number."""
    source = (ROOT / "src" / "lib" / "plant-sprites.ts").read_text()
    match = re.search(r"export const FRAME_FILL = ([0-9.]+);", source)
    if not match:
        raise SystemExit("plant-sprites.ts no longer exports FRAME_FILL")
    return float(match.group(1))


def with_stages(sources: dict) -> dict:
    """Every sprite to audit: the authored portraits plus each derived growth stage.

    A stage reseats the whole face onto a different head — a bud instead of a bloom — so
    it is exactly where a feature lands in the leaf, and auditing only the adult would
    check the one head that was never in doubt. Staged sprites key by `<herbId>-<stage>`,
    which is also the name of the sheet they build, so the stale check finds them too.
    """
    audited = dict(sources)
    for sprite in sources.values():
        for staged in staged_sprites(sprite).values():
            audited[staged["herbId"]] = staged
    return audited


def main() -> None:
    sources = with_stages(load_sources())
    wanted = sys.argv[1:] or sorted(sources)
    failed = False
    if not sys.argv[1:]:
        for line in stale(sources):
            print(line)
            failed = True
        # After the stale check, so this measures the sheets as they will ship.
        for line in badge_fit(sources):
            print(line)
            failed = True
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
