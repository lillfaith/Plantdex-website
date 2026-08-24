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
# Three-quarter: the face is nearly at the rim and the light has swung right round.
HEAD_FAR_LEFT = _pose(face_dx=-3.6, light=(0.35, -0.55))
HEAD_FAR_RIGHT = _pose(face_dx=3.6, light=(-1.75, -0.55))
# The back of the head - no face at all. This is the frame that turns a wobble into a
# spin: without it the face merely slides to one side and slides back.
HEAD_BACK = flower_head(
    HEAD_W, HEAD_H, CX, CY, RX, RY, LOBES, AMP, 0, 0, light=(0.0, -0.9),
)

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

EYES_HIDDEN = [
    "       ",
]

CHEEKS = [
    "c     c",
]

# The mouth carries the expression the eyes cannot: a small smile at rest, an open grin
# on the landing, and nothing at all while the head is turned away.
MOUTH_SMILE = [
    "o   o",
    " ooo ",
]

MOUTH_GRIN = [
    "ooooo",
    "oMMMo",
    " ooo ",
]

MOUTH_HIDDEN = [
    "     ",
]

# The blush goes with the face when the head turns away.
CHEEKS_HIDDEN = [
    "       ",
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
    "size": (44, 32),
    "frames": 16,
    "fps": 12,
    # Back to front: base, arms, head, then face details on top.
    "parts": [
        {"name": "body", "origin": (19, 25), "rows": BODY},
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
                "farLeft": HEAD_FAR_LEFT,
                "farRight": HEAD_FAR_RIGHT,
                "back": HEAD_BACK,
            },
        },
        {
            "name": "eyes",
            "origin": (13, 14),
            "rows": EYES_OPEN,
            "variants": {"blink": EYES_CLOSED, "half": EYES_HALF, "hidden": EYES_HIDDEN},
        },
        {
            "name": "cheeks",
            "origin": (13, 17),
            "rows": CHEEKS,
            "variants": {"hidden": CHEEKS_HIDDEN},
        },
        {
            "name": "mouth",
            "origin": (15, 19),
            "rows": MOUTH_SMILE,
            "variants": {"grin": MOUTH_GRIN, "hidden": MOUTH_HIDDEN},
        },
    ],
    #
    #  0     1      2      3      4     5      6      7     8     9    10    11    12   13   14  15
    # rest crouch launch peak  SPIN> SPIN>> BACK  <SPIN <SPIN land  GRIN  grin settle look blink rest
    #
    # The spin is frames 4-8 and it is this sprite's trademark: nothing else in the set
    # turns all the way round. Frame 0 is the rest pose reduced motion freezes on.
    "motion": {
        "head": {
            "art": [None, "squash", "stretch", None, "right", "farRight", "back",
                    "farLeft", "left", "squash", None, None, None, "right", None, None],
            "dy": [0, 1, -2, -4, -4, -4, -4, -4, -3, 1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
        },
        # The face rides round with the head and vanishes for the frames it is facing
        # away. Hiding it is what makes the back of the head land as a back of a head.
        "eyes": {
            "art": [None, None, None, None, None, None, "hidden", None, None, None,
                    None, None, None, None, "blink", "half"],
            "dy": [0, 1, -2, -4, -4, -4, -4, -4, -3, 1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 2, 4, 0, -4, -2, 0, 0, 0, 0, 3, 0, 0],
        },
        "cheeks": {
            "art": [None, None, None, None, None, None, "hidden", None, None, None,
                    None, None, None, None, None, None],
            "dy": [0, 1, -2, -4, -4, -4, -4, -4, -3, 1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 2, 4, 0, -4, -2, 0, 0, 0, 0, 3, 0, 0],
        },
        # Open-mouthed on the landing: the payoff the whole jump is for.
        "mouth": {
            "art": [None, None, "hidden", "hidden", "hidden", "hidden", "hidden",
                    "hidden", "hidden", "grin", "grin", "grin", None, None, None, None],
            "dy": [0, 1, -2, -4, -4, -4, -4, -4, -3, 1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 2, 4, 0, -4, -2, 0, 0, 0, 0, 3, 0, 0],
        },
        "body": {"dy": [0, 1, 0, -1, -1, -1, -1, -1, -1, 1, 1, 0, 0, 0, 0, 0]},
        # Both arms fly up for the spin - it is the one moment this creature commits
        # completely - then trail on the way down.
        "armL": {
            "art": [None, None, "up", "up", "up", "up", "up", "up", "up", None, None,
                    None, None, None, None, None],
            "dy": [0, 1, -1, -3, -3, -3, -3, -3, -2, 1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, -1, 0, 0],
        },
        "armR": {
            "art": [None, None, None, "up", "up", "up", "up", "up", "up", None, None,
                    None, None, None, None, None],
            "dy": [0, 1, 0, -2, -3, -3, -3, -3, -2, 1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0],
        },
    },
    "palette": PALETTE,
}
