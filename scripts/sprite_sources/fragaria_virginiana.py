"""Wild Strawberry (Fragaria virginiana) - creature portrait sprite.

THE DESIGN HOOK: a wild strawberry is a fraction of the size of the shop kind and tastes
more of strawberry than any of them. This is the species behind half the ancestry of
every cultivated strawberry on earth - carried from North America to Europe, crossed with
a Chilean one, and the result is what everybody now means by the word.

WHAT MAKES IT READ AS A STRAWBERRY. Three things, and the sprite needs all of them or it
is just a green plant with a red dot:

  1. The TRIFOLIATE LEAF - three leaflets, each strongly saw-toothed. The teeth are what
     tells it from a clover at a glance, which is why they are drawn rather than implied.
  2. The FRUIT SHAPE - conical, shouldered at the top and tapering to a point, never a
     circle. A round red berry is a currant.
  3. The HULL and the SEEDS - a green star of sepals sitting on the shoulders, and pale
     achenes pitted across the surface. A strawberry is the only fruit anybody can name
     that keeps its seeds on the OUTSIDE, and leaving them off costs the whole likeness.

WHERE THE FACE GOES: in the crown, below the leaves, which is where a strawberry plant's
growing point actually is - it is a low rosette, not a bush.

PERSONALITY: sweet, and quietly proud. Its trademark gesture is THE RIPEN - a young fruit
swells and colours through four states while the creature's own blush deepens to match.
It is the only sprite whose gesture is a gradual colour change, and the only one where
the creature and its prop come to colour together.

THE HERO BERRY NEVER CHANGES. A second, fully ripe fruit hangs there through every frame,
because frame 0 is what a still card shows and a card whose resting state was an unripe
green nub would not read as a strawberry at all. A real plant carries fruit at several
stages at once, so this costs nothing in honesty and buys the whole identification.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "G": (116, 178, 73, 255),    # leaf highlight
    "g": (84, 138, 56, 255),     # leaf mid
    "d": (60, 102, 42, 255),     # leaf deep
    "n": (42, 74, 33, 255),      # leaf shadow
    "v": (150, 200, 96, 255),    # the pale midrib down every leaflet
    "H": (96, 168, 62, 255),     # hull sepals - a shade brighter than the leaves
    "W": (255, 255, 255, 255),   # eye glint
    "P": (246, 246, 232, 255),   # an unripe fruit, still white
    "p": (214, 216, 196, 255),   # white fruit shade
    "R": (238, 74, 84, 255),     # fruit highlight
    "r": (206, 40, 58, 255),     # fruit mid
    "u": (152, 26, 46, 255),     # fruit deep
    "S": (252, 232, 152, 255),   # achenes - the seeds on the OUTSIDE
    "t": (104, 156, 66, 255),    # stalks and runner
}

HEAD_W, HEAD_H = 19, 15


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # The crown: low, wide and shallow, because a strawberry plant is a ground rosette.
    # The leaves do the identifying above it, so this stays a plain support for the face.
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.5, 8.4, 7.0, 4, 0.10, 5.2, 4.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))

# The trifoliate leaf, worn above the face. Three leaflets, each with a saw-toothed top
# edge and a pale midrib, merging into one base - which is exactly one strawberry leaf,
# and the single feature that separates this plant from a clover in a lawn.
LEAVES = [
    "  ooo   ooo   ooo    ",
    " oGoGo oGoGo oGoGo   ",
    "oGGGGGooGGGGGooGGGGGo",
    "oGvGGGooGvGGGooGvGGGo",
    "oGgvgGooGgvgGooGgvgGo",
    " oggddooogddoooddggo ",
    "  oodddddddddddddoo  ",
    "    ooooooooooooo    ",
]

# The hero fruit: ripe, and there in every single frame. Conical and shouldered, hulled
# with a star of green sepals, and pitted all over with pale seeds.
BERRY = [
    "  oHoHo  ",
    " oHHoHHo ",
    "oHoHHHoHo",
    " oRRRRRo ",
    "oRSRRSRRo",
    "oRRSRRRSo",
    "oRSRRSRRo",
    " orSrrSro",
    " oruSruo ",
    "  oruro  ",
    "   ouo   ",
    "    o    ",
]

# The second fruit, going through it. It SWELLS as it colours, because that is what a
# setting fruit does - four states that change size as well as hue, which is why the
# ripening reads as growth rather than as a recolour.
YOUNG_GREEN = [
    " oo ",
    "oGgo",
    "oggo",
    "ogdo",
    " oo ",
]

YOUNG_WHITE = [
    " oHo ",
    "oHoHo",
    "oPPPo",
    "oPPPo",
    "oPpPo",
    " opo ",
    "  o  ",
]

YOUNG_TURNING = [
    " oHoHo ",
    "oHoHHoo",
    "oPPPPPo",
    "oPPSPPo",
    "oRPRPRo",
    "oRRSRRo",
    " oruro ",
    "  ouo  ",
]

YOUNG_RIPE = [
    "  oHoHo  ",
    " oHHoHHo ",
    "oHoHHHoHo",
    " oRRRRRo ",
    "oRSRRSRRo",
    "oRRSRRRSo",
    " oRSRRSo ",
    " orSrruo ",
    "  oruro  ",
    "   ouo   ",
]

# The stalks. Strawberries hold their fruit out on their own long stems, so these are
# structure - and each reaches back to the crown, so nothing here hangs in mid-air.
STALK_L = [
    "   oto",
    "   oto",
    "  ooto",
    " ootoo",
    "ootoo ",
    "otoo  ",
]

STALK_R = [
    "oto   ",
    "oto   ",
    "otoo  ",
    "ootoo ",
    " ootoo",
    "  otoo",
]


# The runner every strawberry throws out sideways, leaving the crown rather than lying
# beside it.
RUNNER = [
    "oo",
    "ootoo",
    "  ooooooo",
    "    ottttto",
    "     ooooo",
]

HEAD_AT = (6, 7)

# --- Growth stages -----------------------------------------------------------
#
# THE SAME SWEET STRAWBERRY, YOUNGER. Its trademark is offering the ripe berry, and that
# stays with the last stage — a seedling has nothing to give yet, which is a better reason
# for the offer to land than any change of expression.
#
# RIPENESS IS THE ONE THING A PICTURE OF THIS PLANT CAN GET DANGEROUSLY WRONG, so no
# earlier stage carries reddening fruit. The sprout has none at all and the middle stage
# has a closed white-green flower bud, which is what the plant is actually doing then.
#
#   sprout    trifoliate leaves and a runner, no flower and no fruit. A strawberry
#             seedling spreads before it does anything else, which is why it takes over a
#             bed — so the runner is on it from the first stage.
#   growing   in bud: the flower closed, green with the white only just showing at the
#             seams. Not a small berry, and not a pale one.
#   flowering the open plant with its fruit, unchanged.

BUD_PALETTE = {
    "K": (216, 236, 198, 255),   # bud highlight — green-white sepals
    "k": (168, 200, 146, 255),   # bud mid
    "j": (118, 154, 104, 255),   # bud deep
    "J": (82, 110, 76, 255),     # bud shadow
}

# --- Sprout: leaves and a runner --------------------------------------------
YOUNG_HEAD_AT = (8, 15)


def _young_head(rx=6.6, ry=5.0, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 11, 7.0, 5.2, rx, ry, 5, 0.12, 5.2, 3.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.2, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.2, light=(-1.25, -0.65))

# Three leaflets, toothed, because that is what says strawberry before any fruit does.
SEED_LEAVES = [
    "  o o o o o  ",
    " ooGoGoGoGoo ",
    "oGGGGGGGGGGGo",
    " oggdgddgdgo ",
    "  ooooooooo  ",
]

# --- Growing: the flower in bud ---------------------------------------------
BUD_FLOWER = [
    " oo ",
    "oKko",
    "oKko",
    "okjo",
    " oJo",
]

BUD_HEAD_AT = (7, 11)


def _bud_head(rx=7.6, ry=5.8, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        17, 13, 8.0, 6.2, rx, ry, 5, 0.12, 5.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


BUD_HEAD = _bud_head()
BUD_HEAD_LEFT = _bud_head(face_dx=-1.4, light=(-0.35, -0.65))
BUD_HEAD_RIGHT = _bud_head(face_dx=1.4, light=(-1.25, -0.65))

BUD_LEAVES = [
    "  o o o o o o  ",
    " ooGoGoGoGoGoo ",
    "oGGGGGGGGGGGGGo",
    " oggdgddgddgdo ",
    "  ooooooooooo  ",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(BUD_HEAD, BUD_HEAD_LEFT)
G_R_DX, _ = face_shift(BUD_HEAD, BUD_HEAD_RIGHT)

S_BOB = [0, 0, -1, -1, -1, 0, 0, 0]
S_HEAD = [None, "left", "left", None, "right", None, None, None]
S_DX = [0, S_L_DX, S_L_DX, 0, S_R_DX, 0, 0, 0]
S_BLINK = [None, None, None, None, None, None, "blink", None]

G_BOB = [0, 0, -1, -1, -1, -1, 0, 0, 0, 0]
G_HEAD = [None, "left", "left", None, None, None, "right", "right", None, None]
G_DX = [0, G_L_DX, G_L_DX, 0, 0, 0, G_R_DX, G_R_DX, 0, 0]
G_BLINK = [None] * 8 + ["blink", None]


SPRITE = {
    "herbId": "fragaria-virginiana",
    "personality": "sweet",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            # No fruit of any colour, and no flower either.
            "hide": ["berry", "young", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "leaves": SEED_LEAVES,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "leaves": (9, 11),
                "stalkL": (5, 20),
                "stalkR": (21, 20),
                "runner": (13, 22),
                **seat_young(YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "head": {"dy": S_BOB, "art": S_HEAD},
                "eyes": {"dy": S_BOB, "dx": S_DX, "art": S_BLINK},
                "mouth": {"dy": S_BOB, "dx": S_DX},
                "leaves": {"dy": S_BOB},
                "stalkL": {"dy": [0] * 8},
                "stalkR": {"dy": [0] * 8},
                "runner": {"dy": [0] * 8},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": BUD_PALETTE,
            "hide": ["berry"],
            "swap": {
                "head": BUD_HEAD,
                "leaves": BUD_LEAVES,
                "young": BUD_FLOWER,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": young_cheeks(face_box(BUD_HEAD)[2]),
            },
            "variants": {
                "head": {"left": BUD_HEAD_LEFT, "right": BUD_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"]},
            },
            "origins": {
                "head": BUD_HEAD_AT,
                "leaves": (8, 6),
                "stalkL": (4, 17),
                "stalkR": (21, 17),
                "runner": (13, 21),
                "young": (24, 18),
                **seat_young(BUD_HEAD_AT, BUD_HEAD, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "head": {"dy": G_BOB, "art": G_HEAD},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_BLINK},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "leaves": {"dy": G_BOB},
                "young": {"dy": [0] * 10},
                "stalkL": {"dy": [0] * 10},
                "stalkR": {"dy": [0] * 10},
                "runner": {"dy": [0] * 10},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "leaves", "origin": (5, 1), "rows": LEAVES},
        {"name": "stalkL", "origin": (3, 12), "rows": STALK_L},
        {"name": "stalkR", "origin": (21, 13), "rows": STALK_R},
        {"name": "runner", "origin": (13, 20), "rows": RUNNER},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4,
            # A deeper blush for the frames the young fruit finishes. The creature and the
            # berry come to colour together, which is the whole idea.
            extra_cheeks={"deep": ["r      r"]},
        ),
        {"name": "berry", "origin": (1, 15), "rows": BERRY},
        {
            "name": "young",
            "origin": (24, 17),
            "rows": YOUNG_GREEN,
            "variants": {
                "white": YOUNG_WHITE,
                "turning": YOUNG_TURNING,
                "ripe": YOUNG_RIPE,
            },
        },
    ],
    #
    #  0     1      2      3      4       5       6     7     8     9    10   11   12    13
    # green notice WHITE  WHITE TURNING TURNING RIPE  RIPE  RIPE  beam  beam rest blink rest
    #
    # The ripening is frames 2-8: four states in order, none skipped, with the
    # white-shouldered one given as much time as the others - skipping it is what makes
    # drawn fruit look like a coloured ball. The creature's blush deepens on the frame the
    # fruit finishes. Frame 0 is the rest pose reduced motion freezes on, and it shows the
    # hero berry ripe and the young one just set, which is a real strawberry plant in June.
    "motion": {
        "young": {
            "art": [None, None, "white", "white", "turning", "turning", "ripe",
                    "ripe", "ripe", "ripe", "ripe", "ripe", "ripe", None],
            # It rises as it swells, so the fruit grows off its stalk rather than
            # sinking through it.
            "dx": [0, 0, -1, -1, -2, -2, -3, -3, -3, -3, -3, -3, -3, 0],
            "dy": [0, 0, -1, -1, -2, -2, -3, -3, -3, -3, -3, -3, -3, 0],
        },
        "head": {
            "art": [None, "right", "right", "right", "right", "right", "right",
                    "right", None, None, None, None, None, None],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, None, None, None, None, "wide", "wide", None,
                    "half", "half", None, "blink", None],
            "dx": [0, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "art": [None, None, None, None, None, None, "deep", "deep", "deep",
                    "deep", "deep", None, None, None],
            "dx": [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, None, None, "grin", "grin", "grin",
                    "grin", "grin", None, None, None],
            "dx": [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "leaves": {"dy": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
        # The hero berry sways a little and takes no part in any of it. It is already done.
        "berry": {"dx": [0, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
