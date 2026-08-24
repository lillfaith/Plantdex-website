"""Blackberry (Rubus spp.) - creature portrait sprite.

THE DESIGN HOOK: blackberry is the bargain plant. It hands you the best fruit in the
hedge and charges you in blood for it. Measured from the card panel its dark mass sits
upper right, y84-185 of a 276 crop, over a tangle of warm cane - so the creature is a
heavy berry cluster riding on armed canes.

WHERE THE FACE GOES: in the berry cluster, the only round structure here and the one
everybody recognises. Deep purple, so the face patch has to be genuinely pale to read.

PERSONALITY: generous and prickly, in that order and in quick succession. Its trademark
gesture is THE BARGAIN - it holds a berry out to you, beaming, and the instant you reach
for it every thorn on the cane snaps upright and the berry is snatched back. It is the
only gesture in the set that REVERSES: two beats that contradict each other, which is
the whole character of the plant.

Deliberately not the burdock's grab, though both reach: burdock wants to come with you
and never changes its mind.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "B": (138, 106, 168, 255),   # drupelet highlight
    "b": (100, 70, 132, 255),    # drupelet mid
    "u": (68, 46, 98, 255),      # drupelet deep
    "U": (46, 32, 70, 255),      # drupelet shadow - the darkest note on the card
    "R": (196, 132, 148, 255),   # a drupelet still ripening red
    "T": (232, 214, 176, 255),   # thorn - pale, so the snap actually reads
    "G": (140, 192, 108, 255),   # leaf light
    "g": (98, 152, 84, 255),     # leaf mid
    "d": (66, 110, 64, 255),     # leaf deep
    "r": (162, 118, 84, 255),    # cane
}

HEAD_W, HEAD_H = 21, 19


def _cluster(face_dx=0.0, light=(-0.85, -0.65), amp=0.11):
    # Many shallow lobes: a blackberry is a knot of drupelets, but driven hard the lobes
    # separate into a ring of spikes and the head stops being a berry at all.
    return flower_head(
        HEAD_W, HEAD_H, 10.0, 9.0, 9.2, 8.6, 10, amp, 5.0, 4.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="BbuUFo",
    )


HEAD = _cluster()
HEAD_LEFT = _cluster(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _cluster(face_dx=1.5, light=(-1.25, -0.65))
# Drawn tight: the cluster pulling in on itself as it takes the offer back.
HEAD_TIGHT = _cluster(amp=0.04)

# A few drupelets caught still red. Without them the head is a plum.
UNRIPE = [
    "R      R",
    "   RR",
]

# The berry it offers, on the end of a cane. Three states: held close, held out, gone.
BERRY_NEAR = [
    " oo ",
    "oBbo",
    "ouUo",
    " oo ",
]

BERRY_OUT = [
    " oo ",
    "oBBo",
    "obuo",
    " oo ",
]

BERRY_GONE = [
    " ",
]

# The canes, held like arms. Their thorns are drawn as a separate part so they can snap
# out without the arm moving - the snap has to be faster than the limb.
CANE_L = [
    "     oooo",
    "  ooorrrro",
    "oorrrrrroo",
    "orrrroooo",
    "oooo",
]

CANE_R = [
    "oooo",
    "orrrrooo",
    "oorrrrrroo",
    " oorrrrrro",
    "     oooo",
]

# Thorns lie flat, then stand straight up. Pale, and the only pale thing down there.
THORNS_FLAT = [
    " T  T   T",
]

THORNS_UP = [
    "T  T   T",
    "oT oT  oT",
]

LEAF = [
    "  ooo",
    " oGGGo",
    "oGgGGdo",
    "oggddddo",
    " oddddo",
    "  ooo",
]

HEAD_AT = (5, 2)

SPRITE = {
    "herbId": "rubus-spp",
    "personality": "generous",
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "leaf", "origin": (23, 17), "rows": LEAF},
        {"name": "caneL", "origin": (0, 20), "rows": CANE_L},
        {"name": "caneR", "origin": (21, 20), "rows": CANE_R},
        {
            "name": "thorns",
            "origin": (2, 21),
            "rows": THORNS_FLAT,
            "variants": {"up": THORNS_UP},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT, "tight": HEAD_TIGHT},
        },
        {"name": "unripe", "origin": (9, 6), "rows": UNRIPE},
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=2, mouth_dy=5,
            # Guarded: the eyes it wears the moment the bargain turns.
            extra_eyes={"narrow": ["oo  oo", "EE  EE"]},
        ),
        {
            "name": "berry",
            "origin": (4, 22),
            "rows": BERRY_NEAR,
            "variants": {"out": BERRY_OUT, "gone": BERRY_GONE},
        },
    ],
    #
    #  0    1     2      3      4     5     6     7     8     9    10   11   12    13
    # rest notice OFFER OFFER  hold  hold  SNAP! guard guard settle rest rest blink rest
    #
    # The bargain is frames 2-8: the berry goes out on a beaming grin, and on frame 6
    # every thorn snaps upright, the berry vanishes and the smile is gone. Frame 0 is the
    # rest pose reduced motion freezes on - berry held close, thorns down, nobody hurt.
    "motion": {
        "head": {
            "art": [None, "right", None, None, None, None, "tight", "tight", "tight",
                    None, "left", None, None, None],
            "dx": [0, 1, 1, 2, 2, 2, -1, -2, -2, -1, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "unripe": {
            "dx": [0, 1, 1, 2, 2, 2, -1, -2, -2, -1, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "wide", "wide", "wide", "wide", "narrow", "narrow",
                    "narrow", None, None, None, "blink", None],
            "dx": [0, 1, 1, 2, 2, 2, -1, -2, -2, -1, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 1, 2, 2, 2, -1, -2, -2, -1, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        # Beaming for the whole offer, flat the instant the thorns go up. The mouth is
        # where the reversal lands hardest.
        "mouth": {
            "art": [None, None, "grin", "grin", "grin", "grin", "flat", "flat", "flat",
                    None, None, None, None, None],
            "dx": [0, 1, 1, 2, 2, 2, -1, -2, -2, -1, 0, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        # The berry travels out on a cane and is simply GONE on the snap frame. Watching
        # it retract would soften the joke; vanishing is the point.
        "berry": {
            "art": [None, None, "out", "out", "out", "out", "gone", "gone", "gone",
                    "gone", None, None, None, None],
            "dx": [0, 0, -1, -2, -2, -2, 0, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -2, -2, -2, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # One frame from flat to upright, and they stay up for three. Thorns do not ease.
        "thorns": {
            "art": [None, None, None, None, None, None, "up", "up", "up", "up",
                    None, None, None, None],
            "dy": [0, 0, 0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 0],
        },
        "caneL": {"dx": [0, 0, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
        "caneR": {"dx": [0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]},
        "leaf": {"dy": [0, 0, 0, -1, -1, 0, 0, 1, 1, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
