"""Honeysuckle (Lonicera japonica) - creature portrait sprite.

THE DESIGN HOOK: everybody who has met this plant has done the same thing - pinched off
the base of a flower, drawn the style out through it, and tasted the single drop of nectar
on the end. It is possibly the most widely shared piece of hands-on botany there is, and
it is the whole reason honeysuckle is in a foraging deck.

The flowers open white and age to gold, so a vine in flower carries both colours at once,
which is the field mark and also gives this sprite two palettes for free.

WHERE THE FACE GOES: in the paired tubular flowers, which are long and curved and quite
unlike anything else in this deck.

PERSONALITY: sweet-toothed. Its trademark gesture is THE SIP - a bead of nectar swells at
the tip of a flower, and it drinks it. It is the only sprite that consumes anything, and
the only one whose gesture is the thing a person does with the plant rather than something
the plant does by itself.

SAFETY: a portrait, never an identification aid, and this one has a real edge to it -
honeysuckle BERRIES are not the flowers and are not safe, and other vines look similar.
The card's identification and safety content are the reference.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "W": (255, 255, 255, 255),   # eye glint, and the newly opened white flower
    "V": (252, 250, 236, 255),   # petal highlight - opens white
    "v": (238, 226, 190, 255),   # petal mid
    "Y": (250, 220, 130, 255),   # petal aged to gold, which they all do on day two
    "y": (216, 178, 92, 255),    # gold deep
    "u": (168, 136, 76, 255),    # petal shadow
    "N": (250, 240, 176, 255),   # the nectar bead
    "G": (144, 190, 112, 255),   # leaf highlight
    "g": (100, 148, 86, 255),    # leaf mid
    "d": (68, 110, 64, 255),     # leaf deep
    "n": (46, 80, 48, 255),      # leaf shadow
    "t": (150, 118, 86, 255),    # the woody vine
}

HEAD_W, HEAD_H = 19, 15


def _head(face_dx=0.0, light=(-0.85, -0.65), chars="VvyuFo"):
    # Long lobes, few of them: a honeysuckle flower is a tube split into a few long
    # straps that curl right back, which is the shape people recognise from a distance.
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, 8.4, 6.6, 5, 0.24, 5.0, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars=chars,
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
# Aged to gold. Honeysuckle flowers open white and turn within a day or two, so a vine
# carries both at once - which is the identification, and here it is also the payoff:
# the flower it drinks from is the one that has gone gold.
HEAD_GOLD = _head(chars="YyuuFo")

# The second flower of the pair - honeysuckle carries them in twos - holding the nectar.
# It is the prop, so it is drawn simply and stays out of the face's way.
TUBE = [
    "  ooo",
    " oVVvo",
    "oVVvvuo",
    " ovvuo",
    "  ouo",
    "  oto",
]

TUBE_GOLD = [
    "  ooo",
    " oYYyo",
    "oYYyyuo",
    " oyyuo",
    "  ouo",
    "  oto",
]

# The bead of nectar, swelling and then gone. It is four pixels at its largest, which is
# the correct size for the thing everybody remembers.
BEAD_NONE = [
    " ",
]

BEAD_SMALL = [
    "N",
]

BEAD_FULL = [
    "NN",
    "oN",
]

# Opposite oval leaves down the woody vine.
LEAF_L = [
    "  oooo",
    " oGGGgo",
    "oGgggddo",
    " oggddno",
    "  oooo",
]

LEAF_R = [
    "oooo",
    "ogGGGo",
    "oddgggGo",
    " onddggo",
    "  oooo",
]

VINE = [
    "ottto",
    "oottto",
    " oottto",
    "   ooo",
]

HEAD_AT = (2, 6)

SPRITE = {
    "herbId": "lonicera-japonica",
    "personality": "sweet-toothed",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "vine", "origin": (12, 21), "rows": VINE},
        {"name": "leafL", "origin": (0, 21), "rows": LEAF_L},
        {"name": "leafR", "origin": (24, 21), "rows": LEAF_R},
        {
            "name": "tube",
            "origin": (22, 9),
            "rows": TUBE,
            "variants": {"gold": TUBE_GOLD},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT, "gold": HEAD_GOLD},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="small", eye_dy=2, mouth_dy=5,
            extra_mouths={"sip": ["oo", "NN"], "content": ["o  o", " oo "]},
        ),
        {
            "name": "bead",
            "origin": (25, 15),
            "rows": BEAD_NONE,
            "variants": {"small": BEAD_SMALL, "full": BEAD_FULL},
        },
    ],
    #
    #  0    1     2      3      4      5     6     7     8      9      10   11   12    13
    # rest notice BEAD   BEAD   lean   lean  SIP   SIP  gone  content content rest blink rest
    #
    # The sip is frames 6-7 and it is this sprite's trademark: the bead swells over two
    # frames, the creature leans across, and on frame 8 the bead is simply GONE. Watching
    # it shrink would be watching it evaporate; vanishing is the only way to draw
    # something being drunk. Frame 0 is the rest pose reduced motion freezes on: no bead,
    # nothing being taken from anybody.
    "motion": {
        "head": {
            "art": [None, "right", "right", "right", "right", "right", "right",
                    "right", None, "gold", "gold", None, None, None],
            "dx": [0, 0, 0, 0, 1, 2, 3, 3, 1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "wide", "wide", "wide", "wide", "shut", "shut",
                    None, "happy", "happy", None, "blink", None],
            "dx": [0, 2, 2, 2, 3, 4, 5, 5, 1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 1, 1, 2, 3, 4, 4, 1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, None, None, "sip", "sip", None,
                    "content", "content", "content", None, None],
            "dx": [0, 1, 1, 1, 2, 3, 4, 4, 1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        # The tube it drinks from is the one that has aged to gold, which is the older
        # flower and the one with the nectar in it. That is not decoration - it is why
        # this flower and not the other one.
        "tube": {
            "art": [None, None, "gold", "gold", "gold", "gold", "gold", "gold",
                    "gold", "gold", "gold", "gold", "gold", None],
            "dy": [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "bead": {
            "art": [None, None, "small", "full", "full", "full", "full", "full",
                    None, None, None, None, None, None],
            "dy": [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "leafL": {"lean": [0, 1, 1, 0, 0, -1, -1, 0, 0, 1, 0, 0, 0, 0]},
        "leafR": {"lean": [0, -1, -1, 0, 0, 1, 1, 0, 0, -1, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
