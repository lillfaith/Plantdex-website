"""Chickweed (Stellaria media) - creature portrait sprite.

THE DESIGN HOOK: `Stellaria` is "of the stars", for flowers barely five millimetres
across whose five petals are so deeply notched that they look like ten - a white star
scattered over a low green mat. Chickweed is one of the smallest plants in this deck and
the sprite leans all the way into that: it is the SMALLEST creature in the set, well
short of filling its frame, and the empty space around it is doing the work.

There is one other thing everyone knows about it, which is that chickens go mad for it,
and that is where the character comes from: something small, quick and constantly
pleased.

WHERE THE FACE GOES: in the leaf mat itself. The flowers are far too small to hold a
face - and keeping them small is the whole identification.

PERSONALITY: delighted. Its trademark gesture is THE TWINKLE - its star flowers wink on
and off around it in no particular order while it shakes with silent laughter. Nothing
else in this set has a gesture made of something OTHER than the creature's own body
moving, and nothing else laughs.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "G": (169, 228, 114, 255),   # leaf highlight - chickweed is a soft light green
    "g": (125, 192, 80, 255),   # leaf mid
    "d": (87, 142, 58, 255),     # leaf deep
    "n": (61, 105, 43, 255),      # leaf shadow
    "S": (253, 252, 240, 255),   # star flower
    "s": (223, 237, 211, 255),   # star flower, dimmer
}

HEAD_W, HEAD_H = 15, 13


def _head(face_dx=0.0, light=(-0.85, -0.65), ry=5.8):
    return flower_head(
        HEAD_W, HEAD_H, 7.0, 6.0, 6.6, ry, 6, 0.12, 4.6, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.3, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.3, light=(-1.25, -0.65))
# Shaking with laughter: fractionally squatter, twice, out of phase with the twinkle.
HEAD_SHAKE = _head(ry=5.3)

# The stars. Five notched petals reading as ten points, at the only size honest for a
# five-millimetre flower: three pixels across - each on the long thin pedicel chickweed
# really carries them on. The pedicel is not decoration: without it the flowers hung in
# the air beside the plant instead of growing out of it.
STAR_ON = [
    "oSo",
    "SSS",
    "oSo",
    " o ",
    " o ",
    " o ",
    " o ",
]

STAR_DIM = [
    " s ",
    "s s",
    " s ",
    " o ",
    " o ",
    " o ",
    " o ",
]

# Even unlit, the pedicel stays: a stalk that vanished with its flower would leave a hole
# in the plant every time a star blinked off.
STAR_OFF_STALK = [
    " o ",
    " o ",
    " o ",
    " o ",
]

STAR_OFF = STAR_OFF_STALK

# Small opposite leaves in pairs down a line of stem, which is how chickweed grows.
SPRIG_L = [
    " ooo",
    "oGGGo",
    "oggdo",
    " ooo",
]

SPRIG_R = [
    "ooo",
    "oGGGo",
    "odggo",
    "ooo",
]

# The single line of hairs running up one side of the stem - chickweed's field mark, and
# the thing that tells it from every other small white-flowered weed.
HAIRLINE = [
    "s",
    "s",
    "s",
    "s",
]

STEM = [
    "ogdo",
    "ogdo",
    " oo ",
]

HEAD_AT = (9, 10)

# --- Growth stages -----------------------------------------------------------
#
# THE SAME DELIGHTED CHICKWEED, YOUNGER. Its trademark is the stars coming on around it,
# and that stays with the open flower — a seedling has nothing to light up yet, which is
# what makes the adult's moment worth reaching.
#
# THE LINE OF HAIRS IS ON EVERY STAGE. Chickweed's field mark is a single line of hairs
# running up ONE side of the stem, and it is what tells it from every other small
# white-flowered weed in a lawn — including ones you would not want to eat. A seedling
# without it would be a drawing of nothing in particular.
#
#   sprout    paired sprigs on a hairy stem, no flowers at all.
#   growing   the buds up: tight green ovoids on the same long pedicels the open stars
#             ride, because chickweed carries its buds exactly where it carries its
#             flowers and a bud that appeared somewhere else would be a different plant.
#   flowering the stars, unchanged.

BUD_PALETTE = {
    "K": (176, 214, 138, 255),   # bud highlight — sepal green, chickweed's own soft tone
    "k": (128, 176, 104, 255),   # bud mid
}

# --- Sprout: sprigs on a hairy stem -----------------------------------------
YOUNG_HEAD_AT = (9, 14)


def _young_head(rx=5.6, ry=4.6, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        13, 11, 6.0, 5.0, rx, ry, 6, 0.12, 5.0, 3.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.1, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.1, light=(-1.25, -0.65))

SEED_SPRIG_L = [
    " oo",
    "oGGo",
    "oggo",
    " oo",
]
SEED_SPRIG_R = [
    "oo",
    "oGGo",
    "oddo",
    "oo",
]
SEED_STEM = [
    "ogdo",
    "ogdo",
    " oo ",
]

# --- Growing: buds on their pedicels ----------------------------------------
#
# The same long thin pedicel the open star rides. Without it the buds hang in the air
# beside the plant instead of growing out of it — the note the adult's own art carries,
# and it applies to a bud exactly as much.
BUD_STAR = [
    "oko",
    "oKo",
    "oko",
    " o ",
    " o ",
    " o ",
    " o ",
]

BUD_HEAD_AT = (8, 11)


def _bud_head(rx=6.2, ry=5.2, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 13, 7.0, 5.8, rx, ry, 6, 0.12, 5.2, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


BUD_HEAD = _bud_head()
BUD_HEAD_LEFT = _bud_head(face_dx=-1.3, light=(-0.35, -0.65))
BUD_HEAD_RIGHT = _bud_head(face_dx=1.3, light=(-1.25, -0.65))

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(BUD_HEAD, BUD_HEAD_LEFT)
G_R_DX, _ = face_shift(BUD_HEAD, BUD_HEAD_RIGHT)

# Looking about for something to be delighted by, and not finding it yet.
S_BOB = [0, 0, -1, -1, -1, 0, 0, 0]
S_HEAD = [None, "left", "left", None, "right", None, None, None]
S_DX = [0, S_L_DX, S_L_DX, 0, S_R_DX, 0, 0, 0]
S_BLINK = [None, None, None, None, None, None, "blink", None]

G_BOB = [0, 0, -1, -1, -1, -1, 0, 0, 0, 0]
G_HEAD = [None, "left", "left", None, None, None, "right", "right", None, None]
G_DX = [0, G_L_DX, G_L_DX, 0, 0, 0, G_R_DX, G_R_DX, 0, 0]
G_BLINK = [None] * 8 + ["blink", None]


SPRITE = {
    "herbId": "stellaria-media",
    "personality": "delighted",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(12, "sprout"),
            "hide": ["starA", "starB", "starC", "starD", "starE", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "sprigL": SEED_SPRIG_L,
                "sprigR": SEED_SPRIG_R,
                "stem": SEED_STEM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "sprigL": (9, 21),
                "sprigR": (20, 21),
                "hairline": (18, 21),
                "stem": (15, 22),
                **seat_young(YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "head": {"dy": S_BOB, "art": S_HEAD},
                "eyes": {"dy": S_BOB, "dx": S_DX, "art": S_BLINK},
                "mouth": {"dy": S_BOB, "dx": S_DX},
                "sprigL": {"dy": [0] * 8},
                "sprigR": {"dy": [0] * 8},
                "hairline": {"dy": [0] * 8},
                "stem": {"dy": [0] * 8},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(12, "growing"),
            "palette": BUD_PALETTE,
            # Three buds rather than five stars: a plant coming into flower does not do it
            # all at once, and the two it has not made yet are what the last stage adds.
            "hide": ["starD", "starE"],
            "swap": {
                "head": BUD_HEAD,
                "starA": BUD_STAR,
                "starB": BUD_STAR,
                "starC": BUD_STAR,
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
                "starA": (7, 12),
                "starB": (21, 13),
                "starC": (14, 10),
                "sprigL": (8, 19),
                "sprigR": (21, 19),
                "hairline": (19, 19),
                "stem": (15, 21),
                **seat_young(BUD_HEAD_AT, BUD_HEAD, eye_dy=2, mouth_dy=5),
            },
            "motion": {
                "head": {"dy": G_BOB, "art": G_HEAD},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_BLINK},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "starA": {"dy": [0] * 10},
                "starB": {"dy": [0] * 10},
                "starC": {"dy": [0] * 10},
                "sprigL": {"dy": [0] * 10},
                "sprigR": {"dy": [0] * 10},
                "hairline": {"dy": [0] * 10},
                "stem": {"dy": [0] * 10},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 12,
    "parts": [
        {"name": "stem", "origin": (15, 21), "rows": STEM},
        {"name": "hairline", "origin": (19, 17), "rows": HAIRLINE},
        {"name": "sprigL", "origin": (8, 19), "rows": SPRIG_L},
        {"name": "sprigR", "origin": (21, 19), "rows": SPRIG_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT, "shake": HEAD_SHAKE},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="beam", eye_dy=1, mouth_dy=4,
            # Eyes squeezed shut with laughing, which is different from a blink: a blink
            # is flat, this is arched.
            extra_eyes={"laugh": ["oo  oo", "      "]},
            # Two rows rather than three: this face is the smallest in the deck and a
            # three-row mouth simply runs off the bottom of it.
            extra_mouths={"laughing": ["ooooo", "oFFFo"]},
        ),
        # Four stars at the corners of the sprite, each on its own schedule. Twinkling
        # them together would read as one light switching, not as a scattering of stars.
        # The unlit stalks start three rows lower, because that is where the pedicel
        # begins once the flower above it is gone.
        {"name": "starA", "origin": (7, 8), "rows": STAR_OFF,
         "variants": {"on": STAR_ON, "dim": STAR_DIM}},
        {"name": "starB", "origin": (22, 11), "rows": STAR_OFF,
         "variants": {"on": STAR_ON, "dim": STAR_DIM}},
        {"name": "starC", "origin": (14, 6), "rows": STAR_OFF,
         "variants": {"on": STAR_ON, "dim": STAR_DIM}},
        {"name": "starD", "origin": (25, 20), "rows": STAR_OFF,
         "variants": {"on": STAR_ON, "dim": STAR_DIM}},
        {"name": "starE", "origin": (7, 16), "rows": STAR_OFF,
         "variants": {"on": STAR_ON, "dim": STAR_DIM}},
    ],
    #
    # The twinkle runs the whole loop rather than occupying a slice of it, which makes it
    # the only trademark here that is always happening. Each star has its own offset
    # rhythm and none of them line up. Frame 0 has three of the five lit, so the pose
    # reduced motion freezes on is a plant with stars on it rather than a bare mat.
    "motion": {
        "head": {
            "art": [None, "shake", None, "shake", None, "right", None, "left",
                    None, "shake", None, "shake", None, None],
            "dy": [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
        },
        "eyes": {
            "art": ["laugh", "laugh", None, "laugh", "laugh", None, None, None,
                    "laugh", "laugh", None, "laugh", "blink", None],
            "dx": [0, 0, 0, 0, 0, 2, 0, -2, 0, 0, 0, 0, 0, 0],
            "dy": [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
        },
        # The mouth is open for most of the loop. It is laughing; that is the resting
        # state, not the event.
        "mouth": {
            "art": ["laughing", "laughing", None, "laughing", "laughing", None, None,
                    None, "laughing", "laughing", None, "laughing", None, None],
            "dx": [0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
        },
        "starA": {"art": ["on", "on", "dim", None, None, None, "dim", "on", "on",
                          "on", "dim", None, None, "dim"]},
        "starB": {"art": [None, "dim", "on", "on", "on", "dim", None, None, None,
                          "dim", "on", "on", "dim", None]},
        "starC": {"art": ["on", "dim", None, None, "dim", "on", "on", "on", "dim",
                          None, None, "dim", "on", "on"]},
        "starD": {"art": [None, None, "dim", "on", "on", "on", "on", "dim", None,
                          None, "dim", "on", "on", "dim"]},
        "starE": {"art": ["on", "on", "on", "dim", None, None, "dim", "on", "on",
                          "dim", None, None, "dim", "on"]},
        "sprigL": {"dy": [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0]},
        "sprigR": {"dy": [0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0]},
    },
    "palette": PALETTE,
}
