"""Builds a lobed organ - flower head, umbel, spike or body - as a character grid.

Shared by every species: `chars` maps the five shading roles onto whichever palette
letters the caller uses, so the same curve renders a gold dandelion mane, a white yarrow
umbel or a green nettle body. `lobes=0` gives a plain ellipse for bodies.

Not a sprite: the leading underscore keeps `build_sprites.py` from loading it as one.

WHY THIS IS GENERATED. Hand-authoring 25-wide rows produced a rectangular face and a
vertical seam down the mane, twice. A polar curve carved with a face oval and lit by
position gets both right, and - the reason it earns its keep - it makes the pseudo-3D
poses nearly free: a squash, a stretch or a head turned to one side is the same curve
with different radii, a shifted face and a moved light, rather than four more grids to
draw and keep in sync.

WHAT MAKES A TURN READ AS 3D. Two things together, and neither works alone: the face
slides across the head, AND the highlight slides the other way. Moving only the face
looks like the eyes wandering on a flat disc; moving only the light looks like the sun
moved. Together the head appears to rotate.
"""

import math


def flower_head(
    width: int,
    height: int,
    cx: float,
    cy: float,
    rx: float,
    ry: float,
    lobes: int,
    amp: float,
    face_rx: float,
    face_ry: float,
    face_dx: float = 0.0,
    face_dy: float = 0.0,
    light: tuple[float, float] = (-0.85, -0.65),
    trim_tail: bool = True,
    chars: str = "HMDSFo",
) -> list[str]:
    """One head pose as rows of palette characters.

    `face_dx`/`face_dy` slide the face within the head; `light` is the direction the
    highlight comes from. Turning a head means changing both.

    `chars` is highlight, mid, deep, shadow, face, outline - the palette letters this
    species uses for those five roles. `face_rx <= 0` draws no face at all, which is what
    a crown, a spike or an umbel worn above a face wants.
    """
    c_hi, c_mid, c_deep, c_shadow, c_face, c_line = chars
    fcx, fcy = cx + face_dx, cy + face_dy

    def in_head(x: float, y: float) -> bool:
        dx, dy = (x - cx) / rx, (y - cy) / ry
        r = math.hypot(dx, dy)
        if r == 0:
            return True
        return r <= 1 + amp * math.cos(lobes * math.atan2(dy, dx))

    def in_face(x: float, y: float) -> bool:
        if face_rx <= 0 or face_ry <= 0:
            return False
        return math.hypot((x - fcx) / face_rx, (y - fcy) / face_ry) <= 1

    grid = [[" "] * width for _ in range(height)]
    for y in range(height):
        for x in range(width):
            if in_head(x, y):
                grid[y][x] = "F" if in_face(x, y) else "M"

    def neighbours(x: int, y: int):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            yield grid[ny][nx] if (0 <= nx < width and 0 <= ny < height) else " "

    out = [row[:] for row in grid]
    for y in range(height):
        for x in range(width):
            cell = grid[y][x]
            # Outline the mane only where it meets empty space, and the face only where
            # it meets mane. Outlining both sides of that seam costs 2px of a ring only
            # about 4px thick, and the mane breaks into a necklace of dashes.
            if cell == "M" and " " in neighbours(x, y):
                out[y][x] = c_line
            elif cell == "F" and "M" in neighbours(x, y):
                out[y][x] = c_line

    lx, ly = light

    def shade(x: int, y: int) -> str:
        level = -(lx * (x - cx) / rx + ly * (y - cy) / ry)
        if level > 0.72:
            return c_hi
        if level > -0.30:
            return c_mid
        if level > -0.72:
            return c_deep
        return c_shadow

    rows = [
        "".join(
            shade(x, y) if out[y][x] == "M" else (c_face if out[y][x] == "F" else out[y][x])
            for x in range(width)
        ).rstrip()
        for y in range(height)
    ]
    rows = [r for r in rows if r.strip()]
    if trim_tail:
        # The curve tapers to a spike at the bottom; a stem part replaces it.
        while rows and c_mid not in rows[-1] and c_hi not in rows[-1]:
            rows.pop()
    return rows
