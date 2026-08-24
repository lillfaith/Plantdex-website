"""Sheep's Sorrel (Rumex acetosella) - creature portrait sprite.

THE DESIGN HOOK: `acetosella` is from acetum, vinegar. Sheep's sorrel is startlingly sour
- oxalic acid, the same tang as rhubarb - and its leaves are shaped like little arrowheads
with the barbs flared backwards, which is the field mark that separates it from every
other small dock. Sour and arrow-shaped is a whole character in two facts.

WHERE THE FACE GOES: in the leaf mass, low, with the rust-red seed spray above it. It
turns red across a whole hillside in late summer, which is why the palette warms as it
goes up.

PERSONALITY: sour, and unable to leave it alone. Its trademark gesture is THE PUCKER -
it tastes itself, the whole body scrunches inward, eyes screwed shut and mouth drawn to a
point, it recovers... and then goes back for another. It is the only sprite whose gesture
happens TWICE in one loop, and the repeat is the joke.

Deliberately not the wood sorrel's fold, though both plants are sour: that one closes on
the sun's schedule and this one is reacting to its own flavour.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (227, 223, 105, 255),   # leaf highlight
    "g": (178, 183, 77, 255),    # leaf mid
    "d": (128, 136, 56, 255),     # leaf deep
    "n": (93, 102, 42, 255),      # leaf shadow
    "R": (224, 109, 90, 255),   # the rust-red seed spray
    "r": (185, 64, 55, 255),     # seed spray deep
    "Y": (247, 224, 147, 255),   # the sour flash, which is the only yellow here
}

HEAD_W, HEAD_H = 17, 15


def _head(face_dx=0.0, light=(-0.85, -0.65), rx=7.6, ry=6.8):
    return flower_head(
        HEAD_W, HEAD_H, 8.0, 7.0, rx, ry, 6, 0.12, 4.8, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))
# Scrunched: drawn in on both axes. A pucker is the whole face contracting, not just a
# mouth shape, and doing it with radii is what makes the body join in.
HEAD_PUCKER = _head(rx=6.8, ry=6.2)

# The arrowhead leaves, barbs flared back. This outline is the identification, so both
# leaves carry it and neither is allowed to be a generic blade.
ARROW_L = [
    "    ooo",
    "   oGGGo",
    "  oGGGgo",
    " oGGgggo",
    "oGgggddo",
    "oo ogddo",
    "    oddo",
    "     oo",
]

ARROW_R = [
    "ooo",
    "oGGGo",
    "ogGGGo",
    "ogggGGo",
    "oddgggGo",
    "oddgo oo",
    "oddo",
    "oo",
]

# The rust-red seed spray sheep's sorrel turns a whole field with.
SPRAY = [
    "oRo oRo",
    "oRooRRo",
    " oRRRo",
    "  oro",
    "  oro",
    "  oro",
    "  oro",
    "  oro",
    "  oro",
]

# The sour flash - two small marks either side of the head, for the frame the taste
# lands. Nothing else in the deck has a reaction line.
FLASH_NONE = [
    " ",
]

FLASH = [
    "Y         Y",
    " Y       Y",
]

STEM = [
    "ogdo",
    "ogdo",
    " oo ",
]

HEAD_AT = (7, 11)
# Two puckers, not one. Frames 2-4 and 8-10, with a recovery between them.
SCRUNCH = [0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0]

SPRITE = {
    "herbId": "rumex-acetosella",
    "personality": "sour",
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "stem", "origin": (14, 24), "rows": STEM},
        {"name": "spray", "origin": (12, 2), "rows": SPRAY},
        {"name": "arrowL", "origin": (0, 15), "rows": ARROW_L},
        {"name": "arrowR", "origin": (24, 15), "rows": ARROW_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT, "pucker": HEAD_PUCKER},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="small", eye_dy=2, mouth_dy=5,
            # Screwed shut, and a mouth drawn to a single point. A pucker is the smallest
            # mouth in the set, which is why it needs the whole body scrunching with it.
            extra_eyes={"pucker": ["oo  oo", "      "]},
            extra_mouths={"pucker": ["o"], "recover": ["ooo"]},
        ),
        {
            "name": "flash",
            "origin": (5, 12),
            "rows": FLASH_NONE,
            "variants": {"on": FLASH},
        },
    ],
    #
    #  0    1     2       3       4      5      6      7     8       9      10     11   12    13
    # rest taste PUCKER  PUCKER  PUCKER recover recover taste PUCKER  PUCKER PUCKER rest blink rest
    #
    # It puckers TWICE, which is the whole characterisation: it tastes itself, hates it,
    # recovers, and immediately goes back for another. The second pucker is one frame
    # longer than the first, because it knew what was coming and did it anyway. Frame 0 is
    # the rest pose reduced motion freezes on: an ordinary face, before any of this.
    "motion": {
        "head": {
            "art": [None, None, "pucker", "pucker", "pucker", None, None, None,
                    "pucker", "pucker", "pucker", None, None, None],
            "dy": SCRUNCH,
        },
        "eyes": {
            "art": [None, "half", "pucker", "pucker", "pucker", "half", None, "half",
                    "pucker", "pucker", "pucker", None, "blink", None],
            "dy": SCRUNCH,
        },
        "cheeks": {"dy": SCRUNCH},
        "mouth": {
            "art": [None, None, "pucker", "pucker", "pucker", "recover", "recover",
                    None, "pucker", "pucker", "pucker", None, None, None],
            "dy": SCRUNCH,
        },
        # The flash exists for exactly the frame the taste arrives, both times.
        "flash": {
            "art": [None, None, "on", None, None, None, None, None, "on", None,
                    None, None, None, None],
        },
        # The arrows fold in with the pucker and flare back out on the recovery, which is
        # what keeps the scrunch from reading as the head simply shrinking.
        "arrowL": {"dx": [0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 0, 0, 0], "dy": SCRUNCH},
        "arrowR": {"dx": [0, 0, -1, -2, -2, -1, 0, 0, -1, -2, -2, 0, 0, 0], "dy": SCRUNCH},
        "spray": {"lean": [0, 0, 1, 1, 0, -1, 0, 0, 1, 1, 0, 0, 0, 0], "dy": SCRUNCH},
    },
    "palette": PALETTE,
}
