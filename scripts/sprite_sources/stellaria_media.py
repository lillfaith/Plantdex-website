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

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

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

SPRITE = {
    "herbId": "stellaria-media",
    "personality": "delighted",
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
