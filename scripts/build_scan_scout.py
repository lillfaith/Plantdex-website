#!/usr/bin/env python3
"""Build the scan page's scout: a pixel creature looking around with a magnifying glass.

WHY THIS IS A SHEET AND NOT AN SVG ANY MORE
-------------------------------------------
The scout used to be an inline SVG swaying under a CSS `rotate` transform. A sway is a
smooth tween, and every other creature in this app SNAPS between authored frames — so the
one decorative creature on the site was the one thing moving in a different idiom, next to
a nav and a grid full of sprites that do not.

Fourteen frames of run-length `<rect>`s is about 3,900 DOM nodes, and this is a static
export, so all of it lands in `/scan/index.html` — several hundred KB added to a 78 KB
page, for dressing. A sheet is one element and a few KB, and it reaches the snap through
exactly the mechanism `build_sprites.py` output uses: one horizontal row of frames walked
by `background-position` under `steps()`, with `image-rendering: pixelated`.

WHY IT IS STILL NOT IN `sprites.json`
-------------------------------------
Unchanged, and the reason is the same as when it was an SVG: that manifest is keyed by herb
id, every entry is a species with an authored trademark gesture, and `audit_sprites.py`
checks all 54 against the deck. A magnifying glass in there means either handing one species
a prop the other 53 lack, or minting a 55th "species" that is not a plant. So this borrows
the sprite SYSTEM's rendering and stays out of its DATA. `scan-scout.test.ts` pins that it
never appears in the manifest.

IT IS DRESSING, AND IT IS NOT A SPECIES
---------------------------------------
Same rule the Seed Shelf's potted plants keep: the ban on invented botany does not stop at
data, and a decorative creature shaped like a recognisable plant would read as a claim about
that plant — on the one page whose whole job is telling somebody that a photograph is a
SUGGESTION and not an identification. So it is an archetype: a round leafy head, two leaves,
a stem. Nothing you could look up.

HOW THE FRAMES ARE DERIVED, RATHER THAN DRAWN
---------------------------------------------
`REST` below is the authored resting pose, carried over UNCHANGED from the SVG that shipped
before this script existed — four hand-drawn attempts had already produced a face that read
as a skull and a lens that read as a lollipop, and none of that tuning is worth redoing by
hand thirteen more times. So the other frames are COMPUTED from it: the lens assembly, the
handle and the pupils are lifted out, moved by whole pixels, and the dark edge is laid back
down by one automatic pass.

That pass is the load-bearing part. `_outline` fills every empty cell touching ink on any of
its EIGHT neighbours, and reproducing `REST` from its own stripped ink is asserted below --
0 of 952 cells differ. Four-neighbour adjacency misses 44 of them, which is what a hand-drawn
frame would quietly get wrong somewhere nobody checks.

Run: `npm run build:scout` (or `python3 scripts/build_scan_scout.py`).
Preview without writing: `python3 scripts/build_scan_scout.py --preview [frame ...]`.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
GLOBALS_CSS = ROOT / 'src' / 'app' / 'globals.css'
OUT_PNG = ROOT / 'public' / 'scan' / 'scout.png'

# The authored cell every plant sprite is drawn on, and the factor `build_sprites.py` emits
# at. Matching both is what keeps the scout's pixels the same size as a plant's when the two
# are on screen together — drawn 26x22 once, its pixels came out ~30% larger and the
# difference is invisible in an ASCII preview and obvious in a browser.
CELL_W, CELL_H = 34, 28
SCALE = 5

#   l/d  leaf, lit and shadowed      m  lens rim (metal), and the mouth
#   s    stem                        g  lens glass
#   a    arm                         F  face, and the specular streak on the glass
#   h    handle                      e  pupil
#                                    o  outline (never authored -- see `_outline`)
REST = [
    '..................................',
    '....................ooo...........',
    '................ooooodooooo.......',
    '...ooooooooo...oodddddddddoo......',
    '..oommmmmmmoooooddlllllllddooo....',
    '..omFFggggmmooddlllllllllllddo....',
    '.oomFggggggmoodllllllllllllldoo...',
    '.ommgggggggmmddlllllllllllllddo...',
    '.omgggggggggmdlllllFFFFFllllldo...',
    '.ommgggggggmmdlllFFFFFFFFFllldoo..',
    '.oomgggggggmddlllFFFFFFFFFlllddo..',
    '..ommgggggmmodllFFeeFFFeeFFlldoo..',
    '..oommmmmmmoodllFFeeFFFeeFFlldo...',
    '...ooooooohhoddlFFFFFFFFFFFlddo...',
    '.........ohhhodllFFFmmmFFFlldoo...',
    '.........oohhhddllFFFFFFFllddo....',
    '..........oohhhoddlFFFFFlddooo....',
    '...........oohhhodddddddddoo......',
    '............oohhaaaosdsoooo.......',
    '.............ooaaaaassso..........',
    '..............ooooaasssooooo......',
    '............oooollllssslllloooo...',
    '..........ooollllllosssollllllooo.',
    '..........ollllllloosssoolllllllo.',
    '..........ollllllooosssooollllllo.',
    '..........ooddddoooosssooooddddoo.',
    '...........oodddddddooodddddddoo..',
    '............ooooooooo.ooooooooo...',
]

# THE LENS IS EVERYTHING LEFT OF THE HEAD. `m` is also the mouth and `F` is also the face, so
# these two glyphs cannot be lifted by name -- the split is positional, and 12 is the last
# column the glass occupies with the head's first dark column at 13.
LENS_MAX_X = 12

# The handle runs as a 3-wide diagonal band from the lens down to the arm. Only its TOP end
# travels with the lens; the bottom stays welded to the arm, which is welded to the body, so
# the creature never ends up holding a glass attached to nothing.
HANDLE_TOP = (10, 13)
HANDLE_BOTTOM = (14, 18)

#: Pupils are 2x2 and the face is eleven wide, so one authored pixel is about half a pupil --
#: which at the 64px this renders at is the difference between an eye that moved and one that
#: did not. They travel UP but never DOWN: the mouth sits at row 14, and a pupil at row 13 is
#: an eye resting on a lip.
EYE_CELLS = ((18, 11), (19, 11), (18, 12), (19, 12), (23, 11), (24, 11), (23, 12), (24, 12))

# LOOKING AROUND IS GLANCES WITH HOLDS, NOT AN ORBIT.
#
# A lens travelling a smooth circle reads as somebody twirling it. What reads as LOOKING is
# arriving somewhere and staying: two glances, each held for three frames, with the pupils
# tracking the glass because the creature is looking THROUGH it. Frames 0-1 and 12-13 are the
# resting pose, so the loop settles before it starts again instead of snapping round.
#
# `dx` is bounded at -1 because the lens rim sits at column 2 and its outline needs column 1;
# at -2 the dark edge falls off the canvas and the glass reads as cropped rather than raised.
# It is bounded at +1 because the head's first dark column is 13 and the glass is meant to
# pass in FRONT of the shoulder, not eat it.
FRAMES = (
    # lens (dx, dy), pupils (dx, dy)
    ((0, 0), (0, 0)),       # 0  rest -- what `prefers-reduced-motion` freezes on
    ((0, 0), (0, 0)),       # 1  rest, held
    ((-1, -1), (-1, 0)),    # 2  the glass comes up
    ((-1, -2), (-1, -1)),   # 3  and over to the left
    ((-1, -2), (-1, -1)),   # 4  HOLD -- looking
    ((-1, -2), (-1, -1)),   # 5  HOLD
    ((0, -1), (0, -1)),     # 6  back down
    ((0, 0), (0, 0)),       # 7  through the middle
    ((1, 1), (1, 0)),       # 8  and out to the right
    ((1, 1), (1, 0)),       # 9  HOLD -- looking
    ((1, 1), (1, 0)),       # 10 HOLD
    ((1, 0), (1, 0)),       # 11 lifting away
    ((0, 0), (0, 0)),       # 12 settled
    ((0, 0), (0, 0)),       # 13 settled
)

# Leaf and stem come from the same tokens the shelf decor and the packets draw from, so the
# dressing across the app stays one world. The lens is gold-on-glass rather than a grey metal:
# grey is the one family this palette does not own, and a grey prop beside a violet page reads
# as clip art from somewhere else.
#
# Every entry names a deck token or a mix of two, and both are RESOLVED FROM `globals.css` at
# build time rather than written here as hex. A sheet bakes its colours in, and a second copy
# of the palette is a second copy free to drift -- the whole reason the SVG used `var()`.
PALETTE: dict[str, tuple[str, str, int] | str] = {
    'l': 'band-leaf',
    'd': ('band-leaf', 'plum-950', 62),
    'a': ('band-leaf', 'wood-700', 55),
    's': 'band-moss',
    'F': 'paper-cream',
    'e': 'plum-950',
    'm': 'gold-400',
    'h': ('gold-400', 'wood-600', 60),
    'g': ('mystery-violet', 'paper-cream', 45),
    'o': ('plum-950', 'violet-900', 78),
}


def _tokens() -> dict[str, tuple[int, int, int]]:
    """Read `--color-*: #rrggbb` out of globals.css."""
    css = GLOBALS_CSS.read_text()
    found: dict[str, tuple[int, int, int]] = {}
    for name, hex6 in re.findall(r'--color-([a-z0-9-]+):\s*#([0-9a-fA-F]{6})\s*;', css):
        found.setdefault(name, (int(hex6[0:2], 16), int(hex6[2:4], 16), int(hex6[4:6], 16)))
    return found


def _resolve(spec, tokens) -> tuple[int, int, int]:
    """A token, or `color-mix(in srgb, A pct%, B)` computed the way the browser computes it.

    `color-mix` in the sRGB space with two opaque colours is a straight per-channel lerp, so
    this is not an approximation of what the stylesheet did -- it is the same arithmetic.
    """
    if isinstance(spec, str):
        if spec not in tokens:
            raise SystemExit(f'globals.css has no --color-{spec}')
        return tokens[spec]
    a_name, b_name, pct = spec
    for name in (a_name, b_name):
        if name not in tokens:
            raise SystemExit(f'globals.css has no --color-{name}')
    a, b = tokens[a_name], tokens[b_name]
    return tuple(round((a[i] * pct + b[i] * (100 - pct)) / 100) for i in range(3))  # type: ignore[return-value]


def _blank() -> list[list[str]]:
    return [['.'] * CELL_W for _ in range(CELL_H)]


def _strip_outline(grid: list[list[str]]) -> list[list[str]]:
    return [['.' if cell == 'o' else cell for cell in row] for row in grid]


def _outline(grid: list[list[str]]) -> list[list[str]]:
    """Lay a dark cell against every drawn edge -- EIGHT neighbours, not four.

    Four-neighbour adjacency leaves the diagonal corners of every curve bare, which is 44 of
    the 952 cells in `REST`: the lens would shed its rim at the compass points and the leaf
    tips would go bald. Asserted against `REST` itself in `_check`.
    """
    out = [row[:] for row in grid]
    for y in range(CELL_H):
        for x in range(CELL_W):
            if grid[y][x] != '.':
                continue
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < CELL_H and 0 <= nx < CELL_W and grid[ny][nx] not in '.o':
                        out[y][x] = 'o'
                        break
                else:
                    continue
                break
    return out


def _handle(grid: list[list[str]], top_x: int, top_y: int) -> None:
    """A 3-wide band from the moving lens to the arm, mitred at both ends.

    The bottom is FIXED, so the band's slope changes as the lens travels rather than the whole
    arm sliding off the body. Integer arithmetic throughout -- there is no trig here and so
    nothing for a host's libm to have an opinion about, the failure `build_structures.py`
    records at length.
    """
    bot_x, bot_y = HANDLE_BOTTOM
    span = bot_y - top_y
    if span <= 0:
        return
    for y in range(top_y, bot_y + 1):
        x = top_x + (y - top_y) * (bot_x - top_x) // span
        cells = [x, x + 1, x + 2]
        if y in (top_y, bot_y):
            # BOTH ENDS ARE TWO WIDE, AND BOTH DROP THE RIGHTMOST CELL. Measured off the
            # authored pose rather than assumed symmetric -- tapering the top from the other
            # side is the one thing that stopped frame 0 reproducing `REST`, and it moved the
            # grip two pixels along the glass where nothing but the check would have caught it.
            cells = cells[:2]
        for cx in cells:
            if 0 <= cx < CELL_W and 0 <= y < CELL_H:
                grid[y][cx] = 'h'


def _frame(rest_ink: list[list[str]], lens: tuple[int, int], eyes: tuple[int, int]) -> list[list[str]]:
    """Compose one frame: the static creature, then the parts that travel, then the edge."""
    grid = _blank()

    # The static layer. Vacated lens and handle cells become EMPTY; vacated pupils become
    # FACE, because an eye that moves leaves a cheek behind rather than a hole.
    for y in range(CELL_H):
        for x in range(CELL_W):
            cell = rest_ink[y][x]
            if cell == '.':
                continue
            if cell == 'h':
                continue
            if cell in 'mgF' and x <= LENS_MAX_X:
                continue
            grid[y][x] = 'F' if cell == 'e' else cell

    ldx, ldy = lens
    for y in range(CELL_H):
        for x in range(CELL_W):
            cell = rest_ink[y][x]
            if cell in 'mgF' and x <= LENS_MAX_X:
                nx, ny = x + ldx, y + ldy
                if 0 <= nx < CELL_W and 0 <= ny < CELL_H:
                    grid[ny][nx] = cell

    _handle(grid, HANDLE_TOP[0] + ldx, HANDLE_TOP[1] + ldy)

    edx, edy = eyes
    for x, y in EYE_CELLS:
        nx, ny = x + edx, y + edy
        if 0 <= nx < CELL_W and 0 <= ny < CELL_H:
            grid[ny][nx] = 'e'

    return _outline(grid)


def _connected(grid: list[list[str]]) -> bool:
    """Frame 0 must be ONE piece -- the same flood fill `audit_sprites.py` runs on the deck."""
    ink = {(x, y) for y in range(CELL_H) for x in range(CELL_W) if grid[y][x] != '.'}
    if not ink:
        return False
    start = min(ink)
    seen, stack = {start}, [start]
    while stack:
        x, y = stack.pop()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                nb = (x + dx, y + dy)
                if nb in ink and nb not in seen:
                    seen.add(nb)
                    stack.append(nb)
    return seen == ink


def _check(frames: list[list[list[str]]]) -> None:
    rest = [list(row) for row in REST]

    rebuilt = _outline(_strip_outline(rest))
    differing = sum(
        1 for y in range(CELL_H) for x in range(CELL_W) if rebuilt[y][x] != rest[y][x]
    )
    if differing:
        raise SystemExit(f'the outline pass no longer reproduces REST: {differing} cells differ')

    # FRAME 0 IS THE POSE THAT SHIPPED, AND THAT IS CHECKED RATHER THAN TRUSTED. It is what
    # `prefers-reduced-motion` freezes on and what a reader sees while the sheet loads, so a
    # derivation that quietly moved the lens one pixel would ship a different creature at rest.
    if frames[0] != rest:
        raise SystemExit('frame 0 no longer reproduces the authored resting pose')

    if not _connected(frames[0]):
        raise SystemExit('frame 0 is not one connected piece')

    for index, grid in enumerate(frames):
        used = {cell for row in grid for cell in row if cell != '.'}
        unpainted = sorted(cell for cell in used if cell not in PALETTE)
        if unpainted:
            raise SystemExit(f'frame {index} uses unpainted cells: {unpainted}')


def _preview(frames: list[list[list[str]]], wanted: list[int]) -> int:
    """Print frames as text WITHOUT writing the sheet.

    `FRAMES` is the one table anybody will want to tune, and the difference between a glance
    and a twirl is which rows hold. Reading that off a 4 KB PNG means opening it; reading it
    here costs nothing. Writes nothing, so always run the plain build before committing —
    `build_sprites.py` records shipping a strawberry two pixels out of place exactly this way.
    """
    for index in wanted:
        if not 0 <= index < len(frames):
            raise SystemExit(f'no frame {index}; the sheet has {len(frames)}')
        lens, eyes = FRAMES[index]
        print(f'frame {index}  lens{lens}  pupils{eyes}')
        for row in frames[index]:
            print('  ' + ''.join(row).replace('o', '\u00b7').replace('.', ' '))
        print()
    return 0


def main() -> int:
    argv = sys.argv[1:]
    preview = '--preview' in argv
    wanted = [int(arg) for arg in argv if arg.isdigit()]

    tokens = _tokens()
    fills = {glyph: _resolve(spec, tokens) for glyph, spec in PALETTE.items()}

    rest_ink = _strip_outline([list(row) for row in REST])
    frames = [_frame(rest_ink, lens, eyes) for lens, eyes in FRAMES]
    _check(frames)

    if preview:
        return _preview(frames, wanted or list(range(len(frames))))

    sheet = Image.new('RGBA', (CELL_W * SCALE * len(frames), CELL_H * SCALE), (0, 0, 0, 0))
    pixels = sheet.load()
    assert pixels is not None
    for index, grid in enumerate(frames):
        origin = index * CELL_W * SCALE
        for y in range(CELL_H):
            for x in range(CELL_W):
                cell = grid[y][x]
                if cell == '.':
                    continue
                r, g, b = fills[cell]
                for sy in range(SCALE):
                    for sx in range(SCALE):
                        pixels[origin + x * SCALE + sx, y * SCALE + sy] = (r, g, b, 255)

    OUT_PNG.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT_PNG, optimize=True)
    print(
        f'{OUT_PNG.relative_to(ROOT)}  {sheet.width}x{sheet.height}  '
        f'{len(frames)} frames of {CELL_W * SCALE}x{CELL_H * SCALE}  '
        f'{OUT_PNG.stat().st_size / 1024:.1f} KB'
    )
    return 0


if __name__ == '__main__':
    sys.exit(main())
