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
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

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

# --- Growth stages -----------------------------------------------------------
#
# SOUR FROM THE START; STUPID ABOUT IT LATER. The oxalic acid is in a sheep's sorrel
# seedling exactly as much as in a flowering one, so every stage tastes itself and every
# stage regrets it. What grows is the willingness to do it again:
#
#   sprout    one pucker. It tastes itself, hates it, and stops.
#   growing   one pucker, a longer recovery, and it looks back at the leaf it just bit —
#             considering — and does not.
#   flowering two puckers, the second a frame longer than the first, because it knew what
#             was coming and went back anyway. Unchanged; the repeat is the joke.
#
# THE SPRAY TURNS RED LAST. Sheep's sorrel is famous for reddening a whole hillside, but
# that colour is the seed setting: the panicle goes up green and slender first and only
# rusts as the fruit ripens. So the middle stage carries the same spray in the colour it
# actually starts in, and the red arrives with the last stage — which is also the honest
# way round, because red-over-a-field is the thing people recognise.
#
# THE ARROWHEAD IS THE IDENTIFICATION, barbs flared backwards, and it is on the leaves
# from the seedling on. It separates this from every other small dock, so it is never the
# thing that gets simplified for the sake of a smaller drawing.

SPRAY_PALETTE = {
    "K": (186, 204, 118, 255),   # panicle highlight — green, before the fruit rusts
    "k": (136, 158, 84, 255),    # panicle mid
}

# --- Sprout: arrowheads, and one pucker -------------------------------------
YOUNG_HEAD_AT = (9, 13)


def _young_head(face_dx=0.0, light=(-0.85, -0.65), rx=7.2, ry=6.4):
    return flower_head(
        15, 14, 7.0, 6.6, rx, ry, 6, 0.12, 5.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))
YOUNG_HEAD_PUCKER = _young_head(rx=6.5, ry=5.9)

ARROW_L_YOUNG = [
    "   ooo",
    "  oGGGo",
    " oGGggo",
    "oGgggdo",
    "oo oddo",
    "   ooo",
]

ARROW_R_YOUNG = [
    "ooo",
    "oGGGo",
    "oggGGo",
    "odgggo",
    "oddo oo",
    " ooo",
]

# --- Growing: the spray up, still green -------------------------------------
MID_HEAD_AT = (8, 14)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65), rx=7.6, ry=6.8):
    return flower_head(
        16, 15, 7.5, 7.0, rx, ry, 6, 0.12, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))
MID_HEAD_PUCKER = _mid_head(rx=6.9, ry=6.3)

SPRAY_GREEN = [
    "oko oko",
    "okookKo",
    " okKko",
    "  oko",
    "  oko",
    "  oko",
    "  oko",
]

S_SCRUNCH = [0, 0, 1, 1, 1, 0, 0, 0]
G_SCRUNCH = [0, 0, 1, 1, 1, 0, 0, 0, 0, 0]

SPRITE = {
    "herbId": "rumex-acetosella",
    "personality": "sour",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(10, "sprout"),
            "hide": ["spray", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "arrowL": ARROW_L_YOUNG,
                "arrowR": ARROW_R_YOUNG,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {
                    "left": YOUNG_HEAD_LEFT,
                    "right": YOUNG_HEAD_RIGHT,
                    "pucker": YOUNG_HEAD_PUCKER,
                },
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "pucker": YOUNG_EYES["shut"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "arrowL": (2, 18),
                "arrowR": (23, 18),
                "flash": (6, 15),
                "stem": (14, 24),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            "motion": {
                "head": {
                    "art": [None, None, "pucker", "pucker", "pucker", None, None, None],
                    "dy": S_SCRUNCH,
                },
                "eyes": {
                    "art": [None, "half", "pucker", "pucker", "pucker", "half", "blink",
                            None],
                    "dy": S_SCRUNCH,
                },
                "mouth": {
                    "art": [None, None, None, None, None, "wide", None, None],
                    "dy": S_SCRUNCH,
                },
                "flash": {"art": [None, None, "on", None, None, None, None, None]},
                "arrowL": {"dx": [0, 0, 1, 2, 2, 1, 0, 0], "dy": S_SCRUNCH},
                "arrowR": {"dx": [0, 0, -1, -2, -2, -1, 0, 0], "dy": S_SCRUNCH},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(10, "growing"),
            "palette": SPRAY_PALETTE,
            "hide": ["cheeks"],
            "swap": {
                "head": MID_HEAD,
                "spray": SPRAY_GREEN,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {
                    "left": MID_HEAD_LEFT,
                    "right": MID_HEAD_RIGHT,
                    "pucker": MID_HEAD_PUCKER,
                },
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "pucker": YOUNG_EYES["shut"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "spray": (13, 7),
                "arrowL": (1, 18),
                "arrowR": (24, 18),
                "flash": (5, 16),
                "stem": (14, 24),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=2, mouth_dy=4
                ),
            },
            # One pucker, a long recovery, and then it LOOKS BACK at the leaf. Frames
            # 7-8 are the consideration. It does not go back; that is next year.
            "motion": {
                "head": {
                    "art": [None, None, "pucker", "pucker", "pucker", None, None,
                            "left", "left", None],
                    "dy": G_SCRUNCH,
                },
                "eyes": {
                    "art": [None, "half", "pucker", "pucker", "pucker", "half", None,
                            None, None, "blink"],
                    "dy": G_SCRUNCH,
                },
                "mouth": {
                    "art": [None, None, None, None, None, "wide", "wide", None, None,
                            None],
                    "dy": G_SCRUNCH,
                },
                "flash": {
                    "art": [None, None, "on", None, None, None, None, None, None, None],
                },
                "arrowL": {"dx": [0, 0, 1, 2, 2, 1, 0, 0, 0, 0], "dy": G_SCRUNCH},
                "arrowR": {"dx": [0, 0, -1, -2, -2, -1, 0, 0, 0, 0], "dy": G_SCRUNCH},
                "spray": {
                    "lean": [0, 0, 1, 1, 0, -1, 0, 0, 0, 0],
                    "dy": G_SCRUNCH,
                },
            },
        },
    },
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
