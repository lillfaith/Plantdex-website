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
    phase: float = 0.0,
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

    `phase` rotates where the lobes fall, in radians. It exists for the maple: a leaf with
    a lobe pointing straight UP reads as a maple leaf and the same shape rotated by half a
    lobe reads as a blob, and that is a difference of one number rather than a hand-drawn
    grid.
    """
    c_hi, c_mid, c_deep, c_shadow, c_face, c_line = chars
    fcx, fcy = cx + face_dx, cy + face_dy

    def in_head(x: float, y: float) -> bool:
        dx, dy = (x - cx) / rx, (y - cy) / ry
        r = math.hypot(dx, dy)
        if r == 0:
            return True
        return r <= 1 + amp * math.cos(lobes * (math.atan2(dy, dx) - phase))

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


def petal_ring(
    width: int,
    height: int,
    cx: float,
    cy: float,
    ring: float,
    petal_rx: float,
    petal_ry: float,
    petals: int,
    face_rx: float,
    face_ry: float,
    face_dx: float = 0.0,
    face_dy: float = 0.0,
    phase: float = 0.0,
    squash: float = 1.0,
    light: tuple[float, float] = (-0.85, -0.65),
    chars: str = "HMDSFo",
) -> list[str]:
    """A ring of SEPARATE petals around a face, rather than one lobed disc.

    WHY THIS EXISTS ALONGSIDE `flower_head`. That function deforms a single ellipse, so its
    "petals" are bumps on one outline and there is never a gap between them. For a rosette,
    an umbel or a packed floret head that is right — those really are one mass. For a flower
    whose identification IS its separate petals, it is wrong at any lobe depth: pushed
    shallow it reads as a disc, pushed deep it tears into detached fragments. St John's Wort
    went round that loop before this existed.

    Each petal is its own ellipse laid on the ring, so they touch near the centre and part
    at the rim — which is what a five-petalled flower actually looks like. `squash` flattens
    the ring for a flower seen at an angle rather than face on.

    The face is carved last and outlined against the petals, exactly as `flower_head` does,
    so a species can move between the two without its features moving.
    """
    c_hi, c_mid, c_deep, c_shadow, c_face, c_line = chars
    fcx, fcy = cx + face_dx, cy + face_dy
    start = phase - math.pi / 2  # petal 0 points UP, which is how a flower is read

    centres = []
    for i in range(petals):
        angle = start + i * 2 * math.pi / petals
        centres.append((cx + ring * math.cos(angle), cy + ring * math.sin(angle) * squash))

    def in_petals(x: float, y: float) -> bool:
        return any(
            math.hypot((x - px) / petal_rx, (y - py) / petal_ry) <= 1 for px, py in centres
        )

    def in_face(x: float, y: float) -> bool:
        if face_rx <= 0 or face_ry <= 0:
            return False
        return math.hypot((x - fcx) / face_rx, (y - fcy) / face_ry) <= 1

    grid = [[" "] * width for _ in range(height)]
    for y in range(height):
        for x in range(width):
            if in_face(x, y):
                grid[y][x] = "F"
            elif in_petals(x, y):
                grid[y][x] = "M"

    def neighbours(x: int, y: int):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            yield grid[ny][nx] if (0 <= nx < width and 0 <= ny < height) else " "

    out = [row[:] for row in grid]
    for y in range(height):
        for x in range(width):
            cell = grid[y][x]
            if cell == "M" and " " in neighbours(x, y):
                out[y][x] = c_line
            elif cell == "F" and ("M" in neighbours(x, y) or " " in neighbours(x, y)):
                # Outlined against EMPTY SPACE as well as against petal, which
                # `flower_head` never has to do: there the face is carved out of a solid
                # disc and can only ever meet the disc. Here the petals part at the rim, so
                # a face pushed off centre by a turn can reach the gap between two of them
                # — and an unoutlined face pixel on the background reads as the creature
                # leaking out of its own flower.
                out[y][x] = c_line

    lx, ly = light

    def shade(x: int, y: int) -> str:
        # Lit per PETAL, not across the whole flower. Shading the ring as one object makes
        # the far petals uniformly dark and the near ones uniformly bright, which reads as
        # a disc again; lighting each petal separately is what keeps them reading as five
        # things rather than one.
        best = min(
            centres,
            key=lambda c: math.hypot((x - c[0]) / petal_rx, (y - c[1]) / petal_ry),
        )
        level = -(lx * (x - best[0]) / petal_rx + ly * (y - best[1]) / petal_ry)
        if level > 0.60:
            return c_hi
        if level > -0.20:
            return c_mid
        if level > -0.70:
            return c_deep
        return c_shadow

    return [
        "".join(
            shade(x, y) if out[y][x] == "M" else (c_face if out[y][x] == "F" else out[y][x])
            for x in range(width)
        ).rstrip()
        for y in range(height)
    ]
