"""Chicory (Cichorium intybus) - creature portrait sprite.

THE DESIGN HOOK: chicory keeps time. Its sky-blue flowers open around five in the
morning and are shut by midday, every day, reliably enough that Linnaeus put it in his
flower clock as one of the fixed hours. It is also the roadside plant whose roasted root
became coffee during every shortage anyone can name, which makes an early riser that
runs on chicory a joke the plant set up itself.

Its blue is worth having on its own terms: nothing else in this deck is blue at all.

WHERE THE FACE GOES: in the flower, which is a flat open ray disc - the one flower shape
in this set with real room for a face across it.

PERSONALITY: an early riser. Its trademark gesture is THE YAWN - it wakes, the ray
petals unstick one at a time, and it yawns with the widest open mouth in the deck before
shutting again at noon. It is the only sprite that is tired, and the only one that opens
and shuts on a clock rather than on a mood.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "B": (196, 216, 246, 255),   # ray petal highlight
    "b": (170, 197, 243, 255),   # ray petal mid - the deck's only blue
    "q": (123, 150, 207, 255),   # petal deep
    "Q": (77, 109, 178, 255),     # petal shadow
    "Y": (242, 227, 166, 255),   # the pale anthers at the centre
    "G": (136, 210, 155, 255),   # leaf light
    "g": (102, 175, 126, 255),    # leaf mid
    "d": (74, 141, 102, 255),     # leaf deep
    "n": (50, 78, 63, 255),      # leaf shadow
}

HEAD_W, HEAD_H = 21, 17


def _head(face_dx=0.0, light=(-0.85, -0.65), rx=9.6, ry=7.6, amp=0.22):
    # Deep, many lobes: chicory's ray florets are strap-shaped with SQUARE, toothed ends,
    # which is what gives the flower its ragged wheel outline.
    return flower_head(
        HEAD_W, HEAD_H, 10.0, 8.0, rx, ry, 11, amp, 5.4, 4.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="BbqQFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
# Opening: the rays still half stuck together, shorter and rounder.
HEAD_WAKING = _head(rx=8.0, ry=6.8, amp=0.10)
# Stretched wide on the yawn itself, which is where the flower reaches its full spread.
HEAD_WIDE = _head(rx=10.2, ry=8.0, amp=0.26)

# Shut: the rays furled into a narrow blue bud, closed for the afternoon. Hand-drawn,
# because a shut chicory is a spindle and the generator makes discs.
HEAD_SHUT = [
    "  ooo  ",
    " oBbqo ",
    " oBbqo ",
    " oBbqo ",
    " obqQo ",
    " obqQo ",
    "  ooo  ",
]

# The anthers at the centre of an open flower.
ANTHERS = [
    "Y Y Y",
]

ANTHERS_NONE = [
    " ",
]

# Chicory's stem leaves clasp it and are small and sparse; the big ones are all at the
# base. Two low ones is the honest arrangement.
LEAF_L = [
    "   oooo",
    " ooGGGgo",
    "oGGgggddo",
    " oggddnno",
    "  oooooo",
]

LEAF_R = [
    "oooo",
    "ogGGGoo",
    "oddgggGGo",
    " onnddggo",
    "  oooooo",
]

STEM = [
    "ogdo",
    "ogdo",
    "ogdo",
    "ogdo",
    " oo ",
]

HEAD_AT = (5, 4)

# --- Growth stages -----------------------------------------------------------
#
# THE SAME EARLY RISER, YOUNGER. Its trademark is waking up — chicory opens at dawn and
# shuts by afternoon, which is why the adult's loop is a yawn and a stretch — and there is
# nothing to open until there is a flower, so that stays with the last stage.
#
# CHICORY IS A BIENNIAL, like mullein, and spends its first year as a flat rosette of
# deeply toothed leaves that looks so much like a dandelion's that the two are routinely
# confused. So the sprout is that rosette, and the toothing is on it from the start.
#
#   sprout    the first-year rosette, no stem and no flower.
#   growing   the buds up: chicory holds tight green SPINDLES pressed close against a
#             tough stem, which is a shape nothing else in this deck has and is quite
#             unlike the ragged blue wheel it opens into.
#   flowering the sky-blue rays, unchanged.

BUD_PALETTE = {
    "K": (162, 200, 156, 255),   # spindle highlight — chicory's own grey-green
    "k": (118, 160, 118, 255),   # spindle mid
    "j": (84, 120, 90, 255),     # spindle deep
    "J": (58, 84, 66, 255),      # spindle shadow
}

# --- Sprout: the first-year rosette -----------------------------------------
YOUNG_HEAD_AT = (8, 14)


def _young_head(rx=7.0, ry=5.2, face_dx=0.0, light=(-0.85, -0.65)):
    # Toothed hard, like the adult's rays but in green: a chicory rosette leaf is cut
    # almost to the midrib, and that is the whole reason it gets mistaken for dandelion.
    return flower_head(
        15, 12, 7.0, 5.6, rx, ry, 9, 0.24, 5.2, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.2, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.2, light=(-1.25, -0.65))

SEED_LEAF_L = [
    "  ooooo",
    " oGGGGgo",
    "oGgoggdno",
    " oooddno",
]
SEED_LEAF_R = [
    "ooooo  ",
    "ogGGGGo",
    "onddggogo",
    " onddooo",
]

# --- Growing: the spindle buds ----------------------------------------------
BUD_W, BUD_H = 13, 14
BUD_AT = (10, 8)


def _bud(rx=4.6, ry=6.4, face_dx=0.0, light=(-0.85, -0.65)):
    # Narrow and upright, barely lobed. A chicory bud is a spindle held tight against the
    # stem — the plant looks like a bare green switch until the morning it opens.
    return flower_head(
        BUD_W, BUD_H, 6.0, 7.0, rx, ry, 6, 0.10, 5.0, 3.4,
        face_dx=face_dx, light=light, chars="KkjJFo",
    )


BUD = _bud()
BUD_LEFT = _bud(face_dx=-1.1, light=(-0.32, -0.66))
BUD_RIGHT = _bud(face_dx=1.1, light=(-1.34, -0.66))

# A second spindle further down the stem, because chicory carries several at once and one
# alone reads as a flower that failed rather than a plant coming into bloom.
BUD_SIDE = [
    " oo ",
    "oKko",
    "okjo",
    "okjo",
    " oJo",
    " oo ",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(BUD, BUD_LEFT)
G_R_DX, _ = face_shift(BUD, BUD_RIGHT)

# Still waking, and with less to wake up for. The adult yawns and opens; these two only
# get as far as the yawn.
S_BOB = [0, 1, 0, -1, -1, 0, 0, 0]
S_HEAD = [None, None, "left", None, "right", None, None, None]
S_DX = [0, 0, S_L_DX, 0, S_R_DX, 0, 0, 0]
S_EYES = [None, "shut", "shut", None, None, None, "blink", None]

G_BOB = [0, 1, 0, -1, -1, -1, 0, 0, 0, 0]
G_HEAD = [None, None, "left", "left", None, None, "right", None, None, None]
G_DX = [0, 0, G_L_DX, G_L_DX, 0, 0, G_R_DX, 0, 0, 0]
G_EYES = [None, "shut", "shut", None, None, None, None, None, "blink", None]



SPRITE = {
    "herbId": "cichorium-intybus",
    "personality": "early riser",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            # A first-year rosette has no stem to speak of and nothing to hold anthers on.
            "hide": ["anthers", "stem", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "leafL": SEED_LEAF_L,
                "leafR": SEED_LEAF_R,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "shut": YOUNG_EYES["shut"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "leafL": (3, 21),
                "leafR": (21, 21),
                **seat_young(YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "head": {"dy": S_BOB, "art": S_HEAD},
                "eyes": {"dy": S_BOB, "dx": S_DX, "art": S_EYES},
                "mouth": {"dy": S_BOB, "dx": S_DX},
                "leafL": {"dy": [0] * 8},
                "leafR": {"dy": [0] * 8},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": BUD_PALETTE,
            # No anthers: they are inside the spindle until the morning it opens.
            "hide": ["anthers", "cheeks"],
            "swap": {
                "head": BUD,
                "leafL": BUD_SIDE,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": BUD_LEFT, "right": BUD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "shut": YOUNG_EYES["shut"]},
            },
            "origins": {
                "head": BUD_AT,
                "leafL": (9, 18),
                "leafR": (19, 19),
                "stem": (14, 20),
                **seat_young(BUD_AT, BUD, cheeks=False, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "head": {"dy": G_BOB, "art": G_HEAD},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_EYES},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "leafL": {"dy": [0] * 10},
                "leafR": {"dy": [0] * 10},
                "stem": {"dy": [0] * 10},
            },
        },
    },
    "size": (32, 28),
    "frames": 16,
    "fps": 8,
    "parts": [
        {"name": "stem", "origin": (14, 20), "rows": STEM},
        {"name": "leafL", "origin": (1, 19), "rows": LEAF_L},
        {"name": "leafR", "origin": (20, 19), "rows": LEAF_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "waking": HEAD_WAKING,
                "wide": HEAD_WIDE,
                "shut": HEAD_SHUT,
            },
        },
        {
            "name": "anthers",
            "origin": (13, 8),
            "rows": ANTHERS,
            "variants": {"none": ANTHERS_NONE},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="sleepy", mouth="line", eye_dy=1, mouth_dy=4,
            # The widest open mouth in the deck, and it earns it: this is a yawn, and a
            # yawn drawn small is just an "oh".
            extra_mouths={"yawn": [" ooo ", "oFFFo", "oFFFo", " ooo "]},
        ),
    ],
    #
    #  0    1    2     3      4     5     6     7     8     9    10   11   12   13    14   15
    # open sway blink stretch YAWN  YAWN  YAWN  settle sway  sway furl furl SHUT SHUT  open open
    #
    # The yawn is frames 3-6 and it is this sprite's trademark: the flower spreads to its
    # widest exactly while the mouth is open, so the yawn and the bloom are one movement.
    # Frames 10-13 are noon - it furls and shuts, and stays shut for two frames, which is
    # the only time in this deck a creature is simply not awake. Frame 0 is the rest pose
    # reduced motion freezes on: open, which is the flower everyone has seen.
    "motion": {
        "head": {
            "art": [None, "right", None, "waking", "wide", "wide", "wide", None,
                    "left", None, "waking", "waking", "shut", "shut", "waking", None],
            "dx": [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 7, 7, 1, 0],
            "dy": [0, 0, 1, 1, -1, -1, -1, 0, 0, 0, 1, 1, 5, 5, 1, 0],
        },
        # The anthers are the flower's centre, so they are simply gone while it is shut.
        "anthers": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    "none", "none", "none", "none", "none", None],
            "dy": [0, 0, 1, 1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "blink", "half", "shut", "shut", "shut", "wide",
                    None, None, "half", "half", "hidden", "hidden", "hidden", "half"],
            "dx": [0, 2, 0, 0, 0, 0, 0, 0, -2, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, -1, -1, -1, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        },
        "cheeks": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    None, None, "hidden", "hidden", "hidden", None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, -1, -1, -1, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, "yawn", "yawn", "yawn", None, None, None,
                    None, None, "hidden", "hidden", "hidden", None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, -1, -1, -1, 0, 0, 0, 1, 1, 0, 0, 0, 0],
        },
        "leafL": {"lean": [0, 1, 1, 0, -1, -1, -1, 0, 0, 1, 1, 0, 0, 0, 0, 0]},
        "leafR": {"lean": [0, -1, -1, 0, 1, 1, 1, 0, 0, -1, -1, 0, 0, 0, 0, 0]},
        "stem": {"lean": [0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
