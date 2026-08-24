"""Ragweed (Ambrosia artemisiifolia) - creature portrait sprite.

THE DESIGN HOOK: ragweed is the one actually responsible. Its pollen is light, dry and
wind-borne by the billion, and it is the single largest cause of late-summer hay fever -
while the goldenrod flowering beside it, showy and blameless, takes the accusation. The
deck carries both cards and these two sprites are built as a pair: goldenrod is grand and
innocent, ragweed is drab and guilty.

Its flowers are the least showy thing in this deck - small green nubs on a raceme, no
petals worth the name - and its leaves are finely divided and ferny. That drabness IS the
identifying feature, so the palette is deliberately the dullest here: no gold, no
magenta, nothing above a muted olive.

WHERE THE FACE GOES: in the leafy body, since there is no flower to speak of.

PERSONALITY: sheepish. Its trademark gesture is THE SNEEZE - it winds up, throws its
whole head forward, and blows a cloud of pollen out across the frame, then looks
distinctly like it hopes nobody saw. It is the only sprite that produces something the
viewer is meant to find annoying.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (150, 176, 122, 255),   # leaf highlight - grey-green, not fresh green
    "g": (110, 138, 94, 255),    # leaf mid
    "d": (78, 100, 70, 255),     # leaf deep
    "n": (56, 74, 54, 255),      # leaf shadow
    "K": (168, 176, 128, 255),   # the drab flower nubs
    "P": (226, 226, 198, 255),   # pollen
    "p": (198, 200, 168, 255),   # pollen, thinner
}

HEAD_W, HEAD_H = 17, 16


def _head(face_dx=0.0, light=(-0.85, -0.65), rx=8.0, ry=7.4):
    # Many shallow lobes: ragweed's leaves are cut almost to the midrib, and a ragged
    # outline is the only thing making this drab shape recognisable. Driven any harder
    # the lobes cut into the face itself and the head breaks into pieces.
    return flower_head(
        HEAD_W, HEAD_H, 8.0, 7.5, rx, ry, 7, 0.13, 4.8, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))
# Wound up: drawn back and tall, the breath before it goes.
HEAD_WINDUP = _head(rx=7.4, ry=8.1)
# Blown out: squashed forward and wide.
HEAD_BLOW = _head(rx=8.8, ry=6.7)

# The raceme of drab flower nubs. No petals, because it has none - this is the whole
# point of the species and the reason nobody blames it.
RACEME = [
    " oKo",
    "oKKKo",
    " oKo",
    "oKKKo",
    " oKo",
    " oo",
]

# The pollen. Near, spreading, and dispersed - three frames only, travelling out of the
# frame the way the real thing travels out of the county.
POLLEN_NONE = [
    " ",
]

POLLEN_NEAR = [
    " P p",
    "pPPp",
    " p P",
]

POLLEN_MID = [
    "p  P  p",
    " P p P ",
    "p  P  p",
]

POLLEN_FAR = [
    "p    p    P",
    "  P     p  ",
    "p    P    p",
]

# Ferny, deeply cut leaves. Their raggedness is doing the identifying work the flowers
# refuse to do.
LEAF_L = [
    "  o o o",
    " oGoGoGo",
    "oGgGgGggo",
    " ogdgdgdo",
    "  ondndno",
    "   o o o",
]

LEAF_R = [
    "o o o",
    "oGoGoGo",
    "oggGgGgGo",
    "odgdgdgo",
    "ondndno",
    "o o o",
]

STEM = [
    "odgdo",
    "odgdo",
    " ooo ",
]

HEAD_AT = (8, 9)

SPRITE = {
    "herbId": "ambrosia-artemisiifolia",
    "personality": "sheepish",
    "size": (32, 28),
    "frames": 14,
    "fps": 12,
    "parts": [
        {"name": "stem", "origin": (14, 24), "rows": STEM},
        {"name": "raceme", "origin": (14, 2), "rows": RACEME},
        {"name": "leafL", "origin": (1, 17), "rows": LEAF_L},
        {"name": "leafR", "origin": (22, 17), "rows": LEAF_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "left": HEAD_LEFT,
                "right": HEAD_RIGHT,
                "windup": HEAD_WINDUP,
                "blow": HEAD_BLOW,
            },
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="line", eye_dy=1, mouth_dy=4,
            # Screwed shut for the sneeze itself, which is what everyone's face does.
            extra_eyes={"scrunch": ["oo  oo", "      "]},
            # Two rows, not three: a sneeze is over before a mouth gets all the way open,
            # and a third row hangs off the bottom of a face this small.
            extra_mouths={"sneeze": ["ooo", "oFo"]},
        ),
        {
            "name": "pollen",
            "origin": (23, 13),
            "rows": POLLEN_NONE,
            "variants": {"near": POLLEN_NEAR, "mid": POLLEN_MID, "far": POLLEN_FAR},
        },
    ],
    #
    #  0    1     2      3      4     5      6     7     8     9    10    11    12   13
    # rest itch  windup windup HOLD  AH-CHOO blow  blow  spent look  look  rest blink rest
    #
    # The sneeze is frames 2-8 and it is this sprite's trademark: three frames of winding
    # up, one hard forward throw, and a cloud that goes on travelling for two frames after
    # the head has stopped. Frames 9-10 are the plant glancing left and right to see
    # whether anyone noticed, which is the joke. Frame 0 is the rest pose reduced motion
    # freezes on - nothing in the air.
    "motion": {
        "head": {
            "art": [None, None, "windup", "windup", "windup", "blow", "blow", None,
                    None, "left", "right", None, None, None],
            "dx": [0, 0, -1, -2, -2, 3, 3, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, -1, -1, -1, -1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "half", "wide", "wide", "wide", "scrunch", "scrunch",
                    "scrunch", "half", "look_left", "look_right", None, "blink", None],
            "dx": [0, 0, -1, -2, -2, 3, 3, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, -1, -1, -1, -1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, -1, -2, -2, 3, 3, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, -1, -1, -1, -1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        # Open on the sneeze itself and shut immediately after. Two frames of open mouth
        # is all a sneeze gets; any longer and it becomes a shout.
        "mouth": {
            "art": [None, None, None, None, None, "sneeze", "sneeze", None, None, None,
                    None, None, None, None],
            "dx": [0, 0, -1, -2, -2, 3, 3, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, -1, -1, -1, -1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        # The cloud outlives the sneeze by two frames and keeps travelling. That lag is
        # the entire characterisation: the plant has stopped, the pollen has not.
        "pollen": {
            "art": [None, None, None, None, None, "near", "mid", "far", None, None,
                    None, None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 2, 5, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 0, 0, -1, -2, 0, 0, 0, 0, 0, 0],
        },
        # The raceme whips forward with the head and keeps nodding afterwards.
        "raceme": {
            "lean": [0, 0, 2, 3, 3, -3, -2, -1, 1, 1, 0, 0, 0, 0],
            "dy": [0, -1, -1, -1, -1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "leafL": {"dx": [0, 0, 1, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
        "leafR": {"dx": [0, 0, -1, -1, -1, 1, 1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
