"""Wild Mint (Mentha canadensis) - creature portrait sprite.

THE DESIGN HOOK: mint does not lower its own temperature by a single degree. Menthol
binds to TRPM8, the receptor that reports cold, and the nerve sends the message anyway -
so the cool is entirely real as an experience and entirely false as a fact. That is a
lovely thing for a sprite to act out: the plant does not get cold, it just goes cold, and
everything about it says so.

So this one changes COLOUR. For three frames its whole palette shifts to ice - the same
drawing, rendered in frost - and then it warms back to green. Nothing else in this deck
recolours itself; the sumac lights one prop, and this recolours the entire creature.

WHERE THE FACE GOES: in the leaf pair at the top of the square stem, which with the
whorls of small flowers in the axils is what identifies a mint.

PERSONALITY: refreshing, and quietly pleased about the trick. Its trademark gesture is
THE CHILL - a breath in, the frost, a genuine shiver, and a satisfied thaw.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (75, 221, 166, 255),   # leaf highlight
    "g": (48, 175, 136, 255),    # leaf mid
    "d": (32, 118, 100, 255),     # leaf deep
    "n": (30, 102, 92, 255),      # leaf shadow
    # The ice set. Same four roles, shifted the whole way to blue-white - this is the
    # gesture, so the shift has to be unmistakable at a glance rather than a tint.
    "I": (229, 248, 253, 255),   # frosted highlight
    "i": (171, 223, 249, 255),   # frosted mid
    "j": (86, 163, 223, 255),   # frosted deep
    "J": (50, 113, 181, 255),   # frosted shadow
    "V": (200, 169, 249, 255),   # the small pale flowers in the whorls
    "K": (247, 252, 254, 255),   # frost sparks
    "t": (51, 201, 147, 255),   # square stem
}

HEAD_W, HEAD_H = 19, 15


def _head(face_dx=0.0, light=(-0.85, -0.65), chars="GgdnFo", ry=6.6):
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, 8.4, ry, 7, 0.14, 5.0, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars=chars,
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
# Frosted: the identical curve, drawn in ice. Building it from the same call is the point
# - it must be recognisably the SAME creature, gone cold, not a second creature.
HEAD_FROST = _head(chars="IijJFo")
# Frosted mid-shiver, a pixel squatter. Two of these alternating is a shudder.
HEAD_SHIVER = _head(chars="IijJFo", ry=6.1)

# The paired leaves down the stem, toothed the way a mint's are, in both palettes.
LEAF_L = [
    "  ooooo",
    " oGoGoGgo",
    "oGGgggggdo",
    " oggdddno",
    "  ooooo",
]

LEAF_L_FROST = [
    "  ooooo",
    " oIoIoIjo",
    "oIIijjjjJo",
    " oijjjJJo",
    "  ooooo",
]

LEAF_R = [
    "ooooo",
    "ogGoGoGo",
    "oddgggggGo",
    " onddddgo",
    "  ooooo",
]

LEAF_R_FROST = [
    "ooooo",
    "oiIoIoIo",
    "oJJijjjjIo",
    " oJjjjjio",
    "  ooooo",
]

# The whorls of tiny flowers in the leaf axils, which is where a mint puts them and how
# you tell one from a dead nettle.
WHORLS = [
    "oVo   oVo",
    " V     V",
]

# Frost sparks, for the two frames the chill lands. Small and few - a blizzard would be
# claiming the plant is actually cold.
SPARKS_NONE = [
    " ",
]

SPARKS = [
    "K     K",
    "  K K",
    "K     K",
]

STEM = [
    "otto",
    "otto",
    "otto",
    " oo ",
]

HEAD_AT = (6, 8)

# --- Growth stages -----------------------------------------------------------
#
# THE MENTHOL IS THERE FROM THE FIRST LEAF — young mint is if anything the strongest — so
# every stage gets to go cold. Withholding the chill would be drawing a mint that is not
# minty, which is the one thing this species cannot be. What grows is how long it holds:
#
#   sprout    ONE frame of frost. It breathes in, goes white, and is green again before
#             it has time to shiver.
#   growing   three frames, and one shiver.
#   flowering five frames, two shivers, sparks twice, and the satisfied thaw. Unchanged.
#
# The cold still arrives at the middle and spreads outward at every stage — the leaves
# frost a frame after the head and thaw a frame before it — because that order is what
# reads as the creature going cold rather than as two drawings being swapped.
#
# The whorls of tiny flowers sit in the leaf axils, which is where a mint puts them and
# how you tell one from a dead nettle. In bud they are tight green knots in exactly the
# same axils, so the middle stage keeps the field mark and loses only the colour.

BUD_PALETTE = {
    "K": (144, 206, 178, 255),   # calyx knot highlight — green, before the pale flowers
    "k": (98, 158, 134, 255),    # calyx knot mid
}

# --- Sprout: one frame of cold ----------------------------------------------
YOUNG_HEAD_AT = (10, 15)


def _young_head(face_dx=0.0, light=(-0.85, -0.65), chars="GgdnFo"):
    return flower_head(
        15, 11, 7.0, 5.4, 7.0, 5.2, 7, 0.14, 5.4, 3.2,
        face_dx=face_dx, light=light, trim_tail=False, chars=chars,
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))
YOUNG_HEAD_FROST = _young_head(chars="IijJFo")

LEAF_L_YOUNG = [
    "  oooo",
    " oGoGogo",
    "oGGggggdo",
    "  ooooo",
]

LEAF_L_YOUNG_FROST = [
    "  oooo",
    " oIoIojo",
    "oIIijjjJo",
    "  ooooo",
]

LEAF_R_YOUNG = [
    "oooo",
    "ogGoGo",
    "oddggggGo",
    " ooooo",
]

LEAF_R_YOUNG_FROST = [
    "oooo",
    "oiIoIo",
    "oJJijjjIo",
    " ooooo",
]

# One node shorter than the adult's, which is the row that keeps the sprout inside its
# 60% height band — the stem is what was overrunning it, not the leaves.
STEM_SHORT = [
    "otto",
    "otto",
    " oo ",
]

# --- Growing: three frames, and a shiver ------------------------------------
MID_HEAD_AT = (8, 12)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65), chars="GgdnFo", ry=6.2):
    return flower_head(
        17, 13, 8.0, 6.4, 7.6, ry, 7, 0.14, 5.4, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars=chars,
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))
MID_HEAD_FROST = _mid_head(chars="IijJFo")
MID_HEAD_SHIVER = _mid_head(chars="IijJFo", ry=5.7)

# The same axils, the same field mark, and no colour in them yet.
BUDS = [
    "oKo   oKo",
    " k     k",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "mentha-canadensis",
    "personality": "refreshing",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(10, "sprout"),
            # No whorls and no sparks: nothing has flowered, and one frame of frost is
            # too brief to throw anything off.
            "hide": ["whorls", "sparks", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "leafL": LEAF_L_YOUNG,
                "leafR": LEAF_R_YOUNG,
                "stem": STEM_SHORT,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {
                    "left": YOUNG_HEAD_LEFT,
                    "right": YOUNG_HEAD_RIGHT,
                    "frost": YOUNG_HEAD_FROST,
                },
                "leafL": {"frost": LEAF_L_YOUNG_FROST},
                "leafR": {"frost": LEAF_R_YOUNG_FROST},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "shut": YOUNG_EYES["shut"],
                    "wide": YOUNG_EYES["wide"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "leafL": (3, 20),
                "leafR": (21, 20),
                "stem": (15, 23),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            "motion": {
                "head": {
                    "art": [None, None, "right", "frost", None, "left", None, None],
                    "dy": [0, -1, -1, 0, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "half", "wide", "shut", "happy", None, "blink", None],
                    "dx": [0, 0, S_R_DX, 0, 0, S_L_DX, 0, 0],
                    "dy": [0, -1, -1, 0, 0, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, "wide", "wide", "wide", None, None, None, None],
                    "dx": [0, 0, S_R_DX, 0, 0, S_L_DX, 0, 0],
                    "dy": [0, -1, -1, 0, 0, 0, 0, 0],
                },
                # A frame behind the head, exactly as in the adult — and gone again just
                # as fast.
                "leafL": {"art": [None, None, None, None, "frost", None, None, None]},
                "leafR": {"art": [None, None, None, None, "frost", None, None, None]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(10, "growing"),
            "palette": BUD_PALETTE,
            "hide": ["cheeks"],
            "swap": {
                "head": MID_HEAD,
                "whorls": BUDS,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {
                    "left": MID_HEAD_LEFT,
                    "right": MID_HEAD_RIGHT,
                    "frost": MID_HEAD_FROST,
                    "shiver": MID_HEAD_SHIVER,
                },
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "shut": YOUNG_EYES["shut"],
                    "wide": YOUNG_EYES["wide"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "leafL": (1, 19),
                "leafR": (22, 19),
                "whorls": (11, 22),
                "stem": (14, 22),
                "sparks": (10, 10),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            "motion": {
                "head": {
                    "art": [None, None, "frost", "shiver", "frost", None, "right",
                            None, None, None],
                    "dx": [0, 0, -1, 1, -1, 0, 0, 0, 0, 0],
                    "dy": [0, -1, 0, 1, 0, 0, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "half", "wide", "shut", "wide", "half", "happy",
                            "happy", "blink", None],
                    "dx": [0, 0, -1, 1, -1, 0, G_R_DX, 0, 0, 0],
                    "dy": [0, -1, 0, 1, 0, 0, 0, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, "wide", "wide", "wide", "wide", None, None, None,
                            None, None],
                    "dx": [0, 0, -1, 1, -1, 0, G_R_DX, 0, 0, 0],
                    "dy": [0, -1, 0, 1, 0, 0, 0, 0, 0, 0],
                },
                "leafL": {
                    "art": [None, None, None, "frost", "frost", None, None, None, None,
                            None],
                    "dx": [0, 0, 0, 1, -1, 0, 0, 0, 0, 0],
                },
                "leafR": {
                    "art": [None, None, None, "frost", "frost", None, None, None, None,
                            None],
                    "dx": [0, 0, 0, -1, 1, 0, 0, 0, 0, 0],
                },
                "sparks": {
                    "art": [None, None, None, "on", None, None, None, None, None, None],
                },
                "whorls": {"dy": [0, -1, 0, 1, 0, 0, 0, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "stem", "origin": (14, 22), "rows": STEM},
        {
            "name": "leafL",
            "origin": (0, 18),
            "rows": LEAF_L,
            "variants": {"frost": LEAF_L_FROST},
        },
        {
            "name": "leafR",
            "origin": (22, 18),
            "rows": LEAF_R,
            "variants": {"frost": LEAF_R_FROST},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "frost": HEAD_FROST,
                "shiver": HEAD_SHIVER,
            },
        },
        {"name": "whorls", "origin": (11, 21), "rows": WHORLS},
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="small", eye_dy=2, mouth_dy=5,
            extra_mouths={"breathe": ["oo", "FF"], "content": ["o  o", " oo "]},
        ),
        {
            "name": "sparks",
            "origin": (10, 6),
            "rows": SPARKS_NONE,
            "variants": {"on": SPARKS},
        },
    ],
    #
    #  0    1     2      3      4      5      6      7     8      9      10   11   12    13
    # rest breathe in    CHILL  SHIVER CHILL  SHIVER thaw  content content rest rest blink rest
    #
    # The chill is frames 3-7 and it is this sprite's trademark: five frames in which the
    # entire creature is drawn in a different palette. The shiver alternates two frosted
    # poses rather than moving the sprite, so the shudder happens in the drawing rather
    # than in the offsets - the same reason a real shiver is not a wobble. Frame 0 is the
    # rest pose reduced motion freezes on: green, which is what a mint looks like.
    "motion": {
        "head": {
            "art": [None, None, "right", "frost", "shiver", "frost", "shiver", "frost",
                    None, "left", None, None, None, None],
            "dx": [0, 0, 0, -1, 1, -1, 1, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, -1, -1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "half", "wide", "wide", "shut", "wide", "shut", "half",
                    "happy", "happy", None, None, "blink", None],
            "dx": [0, 0, 2, -1, 1, -1, 1, 0, 0, -2, 0, 0, 0, 0],
            "dy": [0, -1, -1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, 1, -1, 1, -1, 1, 0, 0, -1, 0, 0, 0, 0],
            "dy": [0, -1, -1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, "breathe", "breathe", "wide", "wide", "wide", "wide", None,
                    "content", "content", None, None, None, None],
            "dx": [0, 0, 1, -1, 1, -1, 1, 0, 0, -1, 0, 0, 0, 0],
            "dy": [0, -1, -1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        },
        # The leaves frost a frame AFTER the head and thaw a frame before it. Cold arrives
        # at the middle and spreads outward, which is the only order that reads as the
        # creature going cold rather than as two drawings being swapped.
        "leafL": {
            "art": [None, None, None, None, "frost", "frost", "frost", None, None,
                    None, None, None, None, None],
            "dx": [0, 0, 0, -1, 1, -1, 1, 0, 0, 0, 0, 0, 0, 0],
        },
        "leafR": {
            "art": [None, None, None, None, "frost", "frost", "frost", None, None,
                    None, None, None, None, None],
            "dx": [0, 0, 0, 1, -1, 1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "sparks": {
            "art": [None, None, None, "on", None, "on", None, None, None, None,
                    None, None, None, None],
            "dy": [0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "whorls": {"dy": [0, -1, -1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
