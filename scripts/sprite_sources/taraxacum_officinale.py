"""Dandelion (Taraxacum officinale) - creature portrait sprite.

THE DESIGN HOOK: dandelion is "dent de lion", lion's tooth. So the ray florets become a
golden MANE around a face and the plant reads as a small sun-lion. That is a creature
the species itself supplies rather than one bolted onto a flower, and every identifying
trait does double duty: the mane IS the ray-floret head, the arms ARE the deeply toothed
basal leaves, and the palette is the plant's own gold and green.

PSEUDO-3D. Offsetting a flat drawing up and down is a bobbing sticker; this head has
five poses and the loop moves between them:

  neutral / squash / stretch / turned left / turned right

Squash and stretch are the head genuinely widening as it lands and narrowing as it
leaves - weight, not just position. The turns work because two things move at once: the
face slides across the head AND the highlight slides the other way. Move only the face
and the eyes look like they are wandering on a flat disc; move only the light and it
looks like the sun moved. Together the head reads as rotating.

All five come from the same generator in `_flowerhead.py` - a lobed polar curve carved
with a face oval and lit by position - so a pose is a few numbers rather than another
grid to draw and keep in sync. That is what makes this affordable across 45 species.

PERSONALITY: energetic and resilient, the weed that comes back through tarmac. The loop
is a performance rather than a cycle: it crouches, springs, hangs at the top looking
about, lands heavily, then glances around and blinks. Arms lag the body a beat, and they
move asymmetrically - both arms doing the same thing on the same frame is what makes a
sprite look mechanical.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference for anyone
actually looking at a plant outdoors.
"""

from _flowerhead import flower_head

# Authored at 32x28. Softened palette: desaturated golds, a plum outline rather than
# near-black, gentler greens - the previous set read as poster paint against the deck's
# violet.
PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "H": (255, 236, 186, 255),   # mane highlight
    "M": (247, 205, 106, 255),   # mane mid
    "D": (219, 165, 84, 255),    # mane deep
    "S": (178, 126, 66, 255),    # mane shadow
    "F": (255, 247, 224, 255),   # face
    "E": (86, 58, 104, 255),     # eye
    "W": (255, 255, 255, 255),   # eye glint
    "c": (240, 168, 180, 255),   # cheek
    "G": (150, 205, 120, 255),   # leaf light
    "g": (108, 166, 92, 255),    # leaf mid
    "d": (74, 122, 68, 255),     # leaf dark
}

HEAD_W, HEAD_H = 27, 25
CX, CY = 13.0, 12.0
RX, RY = 10.5, 10.5
LOBES, AMP = 8, 0.20
FACE_RX, FACE_RY = 5.9, 5.3


def _pose(rx=RX, ry=RY, face_dx=0.0, face_dy=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, CX, CY, rx, ry, LOBES, AMP, FACE_RX, FACE_RY,
        face_dx=face_dx, face_dy=face_dy, light=light,
    )


HEAD = _pose()
# Wider and shorter, face settling low: the head carrying its own weight on landing.
HEAD_SQUASH = _pose(rx=RX + 0.8, ry=RY - 1.0, face_dy=0.8)
# Narrower and taller, face riding high: the head pulling away as it leaves the ground.
HEAD_STRETCH = _pose(rx=RX - 0.7, ry=RY + 1.1, face_dy=-0.7)
# Turns: face one way, highlight the other.
HEAD_LEFT = _pose(face_dx=-1.8, light=(-0.35, -0.65))
HEAD_RIGHT = _pose(face_dx=1.8, light=(-1.25, -0.65))

# Two-pixel eyes with a glint, three pixels apart. At a narrower face they merged into
# one dark band, and single-pixel dots vanished against the cream - nine pixels of face
# is what it takes for a readable pair.
EYES_OPEN = [
    "WE   WE",
    "EE   EE",
]

EYES_CLOSED = [
    "       ",
    "EE   EE",
]

# Half-lidded, for the frame either side of a blink. A blink that snaps straight from
# open to shut reads as a glitch; one frame of lid on the way down is all it takes.
EYES_HALF = [
    "oE   oE",
    "EE   EE",
]

CHEEKS = [
    "c     c",
]

# The head's own taper ends in gold; this green stem and base replaces it, so the flower
# sits on something plainly a plant.
BODY = [
    "ogGgo",
    "ogGgo",
    "odgdo",
    " ooo ",
]

# The toothed basal leaves, doing duty as arms. Drawn BEHIND the head so each blade
# emerges from among the petals - out beside the flower they read as loose green slivers
# with background showing through the join.
ARM_L = [
    "      ooo",
    "  ooooGGGGo",
    "oGGGGGGGGGo",
    "oGdoggdGGGo",
    " oo ooooooo",
]

# Raised: the blade swept up, for the frames where the arm throws itself into the jump.
ARM_L_UP = [
    "        ooo",
    "     oooGGGo",
    "  oooGGGGGGo",
    "oGGGGGGGGGGo",
    " oGdoggdGGGo",
    "  oo ooooooo",
]

ARM_R = [
    "ooo",
    "oGGGGoooo",
    "oGGGGGGGGGo",
    "oGGGdggodGo",
    "ooooooo oo",
]

ARM_R_UP = [
    "ooo",
    "oGGGooo",
    "oGGGGGGooo",
    "oGGGGGGGGGo",
    "oGGGdggodGo",
    "ooooooo oo",
]

SPRITE = {
    "herbId": "taraxacum-officinale",
    "personality": "energetic",
    "size": (32, 28),
    "frames": 12,
    "fps": 10,
    # Back to front: base, arms, head, then face details on top.
    "parts": [
        {"name": "body", "origin": (14, 23), "rows": BODY},
        {
            "name": "armL",
            "origin": (1, 19),
            "rows": ARM_L,
            "variants": {"up": ARM_L_UP},
        },
        {
            "name": "armR",
            "origin": (21, 19),
            "rows": ARM_R,
            "variants": {"up": ARM_R_UP},
        },
        {
            "name": "head",
            "origin": (3, 4),
            "rows": HEAD,
            "variants": {
                "squash": HEAD_SQUASH,
                "stretch": HEAD_STRETCH,
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
            },
        },
        {
            "name": "eyes",
            "origin": (13, 15),
            "rows": EYES_OPEN,
            "variants": {"blink": EYES_CLOSED, "half": EYES_HALF},
        },
        {"name": "cheeks", "origin": (13, 18), "rows": CHEEKS},
    ],
    #
    #  frame   0     1      2       3     4      5      6     7      8     9    10    11
    #        rest  crouch launch  peak  hang  look-R  fall  land  settle look-L blink  --
    #
    # Frame 0 is the rest pose reduced motion freezes on: neutral, level, eyes open.
    "motion": {
        "head": {
            "art": [None, "squash", "stretch", None, None, "right", None, "squash",
                    None, "left", "left", None],
            "dy": [0, 1, -2, -4, -4, -3, -1, 1, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 1, 1, 1, 0, 0, -1, -1, 0],
        },
        # Face details ride the head. The extra dx on the turn frames is the face sliding
        # across the head, on top of the whole head's own drift.
        "eyes": {
            "dy": [0, 1, -2, -4, -4, -3, -1, 1, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 1, 3, 1, 0, 0, -3, -3, 0],
            "art": [None, None, None, None, None, None, None, "half", None, None,
                    "blink", "half"],
        },
        "cheeks": {
            "dy": [0, 1, -2, -4, -4, -3, -1, 1, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 1, 3, 1, 0, 0, -3, -3, 0],
        },
        # The base compresses on the crouch and the landing, a frame behind the head.
        "body": {"dy": [0, 1, 0, -1, -1, -1, 0, 1, 1, 0, 0, 0]},
        # Asymmetric on purpose: the left arm leads the jump and the right trails, and
        # they glance in different directions on the look frames. Both arms doing the
        # same thing on the same frame is what makes a sprite look mechanical.
        "armL": {
            "art": [None, None, "up", "up", "up", None, None, None, None, None, None, None],
            "dy": [0, 1, -1, -3, -3, -2, 0, 1, 0, 0, 0, 0],
            "dx": [0, 0, -1, -1, -1, 0, 0, 0, 0, -1, -1, 0],
        },
        "armR": {
            "art": [None, None, None, "up", "up", "up", None, None, None, None, None, None],
            "dy": [0, 1, 0, -2, -3, -3, -1, 1, 0, 0, 0, 0],
            "dx": [0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0],
        },
    },
    "palette": PALETTE,
}
