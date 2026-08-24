"""Purslane (Portulaca oleracea) - creature portrait sprite.

THE DESIGN HOOK: purslane is a succulent. Its leaves are fat little water tanks, its
stems are red and rubbery, and it lies flat against hot bare ground looking entirely
untroubled while everything around it wilts. It also carries more omega-3 than any other
leafy plant anybody has bothered to measure, which is a fact it would absolutely mention.

Its silhouette is therefore ROUND and LOW - no spike, no plume, no crown. It is the
plumpest sprite in the set and the only one with no vertical element at all.

WHERE THE FACE GOES: in the fattest leaf pad, which is most of the plant.

PERSONALITY: smug. Its trademark gesture is THE PUFF - it draws water up, swells until
it is visibly rounder than it started, holds the pose, and then wobbles like set jelly
when it lets go. It is the only sprite that changes its own volume, and the only one
whose gesture is pure self-satisfaction with nothing happening to it at all.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (152, 224, 92, 255),   # pad highlight - succulents are glossy, so this is bright
    "g": (103, 204, 43, 255),   # pad mid
    "d": (69, 137, 37, 255),     # pad deep
    "n": (44, 96, 26, 255),      # pad shadow
    "R": (218, 82, 62, 255),   # the red stem purslane is known by
    "r": (168, 43, 33, 255),     # stem shadow
    "Y": (230, 207, 124, 255),   # the small yellow flower
}

HEAD_W, HEAD_H = 21, 17


def _pad(face_dx=0.0, light=(-0.85, -0.65), rx=9.6, ry=7.8):
    # Very shallow lobes: a succulent pad is smooth. What varies here is the RADII, which
    # is the whole gesture - this sprite acts by changing size.
    return flower_head(
        HEAD_W, HEAD_H, 10.0, 8.5, rx, ry, 4, 0.08, 5.2, 4.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _pad()
HEAD_LEFT = _pad(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _pad(face_dx=1.5, light=(-1.25, -0.65))
# Drawing water: fractionally taller before it goes wide, the breath in.
HEAD_DRAW = _pad(rx=9.2, ry=8.3)
# Full: visibly rounder than rest in both directions. This is the pose it is proud of.
HEAD_FULL = _pad(rx=10.4, ry=8.6)
# The wobble either side of letting go. Two frames of overshoot, opposite ways.
HEAD_WOBBLE_A = _pad(rx=10.2, ry=8.0)
HEAD_WOBBLE_B = _pad(rx=9.4, ry=8.4)

# Fat little leaf pads either side, held low. Blunt, thick and rounded - a purslane leaf
# has no point on it anywhere.
PAD_L = [
    "  ooo",
    " oGGGo",
    "oGGgggo",
    "oGggddo",
    " oddno",
    "  ooo",
]

PAD_R = [
    "ooo",
    "oGGGo",
    "oggGGGo",
    "oddggGo",
    " onddo",
    "  ooo",
]

# The small yellow flower purslane opens for a few hours of morning sun and no longer.
FLOWER = [
    "oYo",
    "YYY",
    "oYo",
]

# Red rubbery stems, sprawling sideways rather than standing up.
STEM_L = [
    "    ooo",
    "oooRRRo",
    "oRRRoo",
    "ooo",
]

STEM_R = [
    "ooo",
    "  oRRRo",
    "   oRRRooo",
    "     ooo",
]

HEAD_AT = (5, 6)

SPRITE = {
    "herbId": "portulaca-oleracea",
    "personality": "smug",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "stemL", "origin": (0, 21), "rows": STEM_L},
        {"name": "stemR", "origin": (22, 21), "rows": STEM_R},
        {"name": "padL", "origin": (0, 16), "rows": PAD_L},
        {"name": "padR", "origin": (24, 16), "rows": PAD_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "draw": HEAD_DRAW,
                "full": HEAD_FULL,
                "wobbleA": HEAD_WOBBLE_A,
                "wobbleB": HEAD_WOBBLE_B,
            },
        },
        {"name": "flower", "origin": (14, 4), "rows": FLOWER},
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4,
            # Pleased with itself, eyes closed. Smugness is a closed-eye expression.
            extra_eyes={"smug": ["oo  oo", "EE  EE"]},
        ),
    ],
    #
    #  0    1    2     3     4     5     6     7      8      9     10   11   12    13
    # rest draw draw  PUFF  PUFF  FULL  FULL  hold  wobble wobble sag rest blink rest
    #
    # The puff is frames 1-9 and it is this sprite's trademark: it swells, holds the pose
    # for three frames with its eyes shut, and then wobbles - two frames of overshoot in
    # opposite directions, because a bag of water does not stop moving when it stops
    # being squeezed. Frame 0 is the rest pose reduced motion freezes on - fat, but not
    # yet showing off.
    "motion": {
        "head": {
            "art": [None, "draw", "draw", "full", "full", "full", "full", "full",
                    "wobbleA", "wobbleB", None, "right", None, None],
            "dy": [0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "wide", "wide", "smug", "smug", "smug", "smug", "smug",
                    None, None, None, None, "blink", None],
            "dy": [0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 1, -1, 0, 2, 0, 0],
        },
        "cheeks": {
            "dy": [0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 1, -1, 0, 1, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, "grin", "grin", "grin", "grin", "grin", None,
                    None, None, None, None, None],
            "dy": [0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 1, -1, 0, 1, 0, 0],
        },
        # The side pads get pushed OUT by the swelling body rather than moving themselves.
        # They are being displaced, which is what sells the volume.
        "padL": {"dx": [0, 0, 0, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0]},
        "padR": {"dx": [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]},
        "flower": {"dy": [0, -1, -2, -1, -1, -1, -1, -1, 0, 0, 1, 0, 0, 0]},
        "stemL": {"dx": [0, 0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0]},
        "stemR": {"dx": [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
