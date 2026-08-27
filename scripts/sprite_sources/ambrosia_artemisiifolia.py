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

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (181, 178, 117, 255),   # leaf highlight - grey-green, not fresh green
    "g": (140, 142, 90, 255),    # leaf mid
    "d": (100, 103, 67, 255),     # leaf deep
    "n": (73, 77, 51, 255),      # leaf shadow
    "K": (180, 170, 124, 255),   # the drab flower nubs
    "P": (227, 220, 197, 255),   # pollen
    "p": (203, 194, 165, 255),   # pollen, thinner
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

# --- Growth stages -----------------------------------------------------------
#
# THE POLLEN IS THE POINT, so the pollen is gated on the flower. This is the one species
# in the deck where the gesture carries a factual claim: ragweed causes the hay fever
# goldenrod is blamed for, and this sprite's cloud is that claim drawn. A plant that has
# not made its racemes yet sheds nothing, so neither earlier stage releases a grain —
# `pollen` is hidden at both, and that is botany rather than restraint.
#
#   sprout    ferny dissected leaves and nothing above them. It itches. It cannot sneeze.
#   growing   the raceme up, its nubs still tight and GREEN — the state before they dry
#             to the drab tan this card's portrait wears. It winds up, it sneezes, and
#             nothing comes out, which is both the gag and the correct answer.
#   flowering the full sneeze, and the cloud that goes on travelling after it. Unchanged.
#
# The drabness is deliberate at every stage and is not a shortcut: ragweed's flowers being
# too dull to notice is exactly why the wrong plant gets accused, so nothing here is
# allowed to brighten as it grows except the leaves' own green.

NUB_PALETTE = {
    "K": (146, 162, 98, 255),   # nub highlight — green, before it dries to tan
    "k": (104, 120, 72, 255),   # nub mid
}

# --- Sprout: ferny leaves, nothing above them -------------------------------
YOUNG_HEAD_AT = (9, 13)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 13, 7.0, 6.2, 7.2, 6.2, 7, 0.13, 5.4, 3.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

# Still cut almost to the midrib. The raggedness is the only thing identifying a plant
# this drab, so it is the last property that would ever be simplified away.
LEAF_L_YOUNG = [
    "  o o o",
    " oGoGoGo",
    "oGgGgGgo",
    " ogdgdgo",
    "  o o o",
]

LEAF_R_YOUNG = [
    "o o o",
    "oGoGoGo",
    "ogGgGgGo",
    "odgdgdo",
    "o o o",
]

# --- Growing: the raceme up, still green ------------------------------------
MID_HEAD_AT = (8, 12)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        16, 14, 7.5, 6.6, 7.6, 6.6, 7, 0.13, 5.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))

RACEME_TIGHT = [
    " oko",
    "okKo",
    " oko",
    "okKo",
    " oo",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "ambrosia-artemisiifolia",
    "personality": "sheepish",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(12, "sprout"),
            # No raceme, and therefore no pollen. The sprout is the one creature here
            # that is genuinely innocent.
            "hide": ["raceme", "pollen", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "leafL": LEAF_L_YOUNG,
                "leafR": LEAF_R_YOUNG,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "shut": YOUNG_EYES["shut"],
                },
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "leafL": (3, 18),
                "leafR": (21, 18),
                "stem": (14, 24),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # An itch and a shrug. The wind-up has nowhere to go.
            "motion": {
                "head": {
                    "dy": [0, -1, -1, 0, 0, 0, 0, 0],
                    "dx": [0, 0, -1, 0, 0, 0, 0, 0],
                    "art": [None, None, "left", None, "right", None, None, None],
                },
                "eyes": {
                    "dy": [0, -1, -1, 0, 0, 0, 0, 0],
                    "dx": [0, 0, S_L_DX, 0, S_R_DX, 0, 0, 0],
                    "art": [None, "half", "shut", "half", None, None, "blink", None],
                },
                "mouth": {
                    "dy": [0, -1, -1, 0, 0, 0, 0, 0],
                    "dx": [0, 0, S_L_DX, 0, S_R_DX, 0, 0, 0],
                },
                "leafL": {"dx": [0, 0, 1, 1, 0, 0, 0, 0]},
                "leafR": {"dx": [0, 0, -1, -1, 0, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(12, "growing"),
            "palette": NUB_PALETTE,
            # The raceme exists; what it holds does not shed yet.
            "hide": ["pollen", "cheeks"],
            "swap": {
                "head": MID_HEAD,
                "raceme": RACEME_TIGHT,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "shut": YOUNG_EYES["shut"],
                    "wide": YOUNG_EYES["wide"],
                },
                "mouth": {"open": YOUNG_MOUTH["open"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "raceme": (14, 9),
                "leafL": (2, 18),
                "leafR": (22, 18),
                "stem": (14, 24),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # The whole sneeze, and an empty frame where the cloud should be. Then it
            # checks anyway, which is the most ragweed thing in the sprite.
            "motion": {
                "head": {
                    "art": [None, None, None, None, None, None, None, "left", "right",
                            None],
                    "dx": [0, 0, -1, -2, 2, 2, 1, 0, 0, 0],
                    "dy": [0, -1, -1, -1, 1, 1, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, "half", "wide", "wide", "shut", "shut", "half",
                            None, None, "blink"],
                    "dx": [0, 0, -1, -2, 2, 2, 1, G_L_DX, G_R_DX, 0],
                    "dy": [0, -1, -1, -1, 1, 1, 0, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, None, None, None, "open", "open", None, None, None,
                            None],
                    "dx": [0, 0, -1, -2, 2, 2, 1, G_L_DX, G_R_DX, 0],
                    "dy": [0, -1, -1, -1, 1, 1, 0, 0, 0, 0],
                },
                "raceme": {
                    "lean": [0, 0, 2, 3, -3, -2, 1, 0, 0, 0],
                    "dy": [0, -1, -1, -1, 1, 1, 0, 0, 0, 0],
                },
                "leafL": {"dx": [0, 0, 1, 1, -1, -1, 0, 0, 0, 0]},
                "leafR": {"dx": [0, 0, -1, -1, 1, 1, 0, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 12,
    "parts": [
        {"name": "stem", "origin": (14, 24), "rows": STEM},
        {"name": "raceme", "origin": (14, 4), "rows": RACEME},
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
