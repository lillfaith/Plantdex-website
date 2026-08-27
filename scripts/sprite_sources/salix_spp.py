"""Willow (Salix spp.) - creature portrait sprite.

THE DESIGN HOOK: willow bark contains salicin, which the body converts to salicylic acid,
which is where the word aspirin comes from and what Bayer was working from in 1897.
People chewed willow bark for pain for thousands of years before anybody knew why it
worked. It is probably the single most consequential plant in this deck.

It is also the weeping one, and its silhouette is nothing but that: long fine branches
hanging straight down, a curtain rather than a crown.

WHERE THE FACE GOES: behind the curtain of branches, half-veiled - the only face in the
deck with something hanging in front of it all the time rather than only during a gesture.

PERSONALITY: consoling. Its trademark gesture is THE WEEP - the curtain sways, a single
drop runs down and falls, and then it lifts its face and gives a small, kind, entirely
unbothered smile. The smile is the point, and it is why the gesture is not simply sad:
this is the plant people have gone to for relief for four thousand years, and it is the
one in the set that is sorry for YOU.

SAFETY: a portrait, never an identification aid, and not a claim - the card's Healing
Traits heading frames traditional use as tradition, and /safety carries the full text.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (193, 193, 123, 255),   # leaf highlight - willow leaves are grey-green
    "g": (159, 163, 77, 255),   # leaf mid
    "d": (110, 116, 54, 255),     # leaf deep
    "n": (75, 83, 40, 255),      # leaf shadow
    "t": (133, 98, 63, 255),    # bark - the salicin one
    "T": (176, 133, 87, 255),   # bark light
    "D": (155, 189, 208, 255),   # the drop
    "d2": (0, 0, 0, 0),          # unused placeholder, kept out of the art
    "S": (240, 241, 225, 255),   # catkin - willow's spring pussy-willow
}
del PALETTE["d2"]

HEAD_W, HEAD_H = 19, 15


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, 8.4, 6.6, 6, 0.12, 5.0, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))

# The curtain. Long fine strands hanging straight down, drawn as a comb rather than as
# leaves - at this size a willow is a texture, not a set of shapes. It hangs IN FRONT of
# the face, which is the whole silhouette.
CURTAIN = [
    "ogogogogogogogo",
    "ogogogogogogogo",
    "oGogoGogoGogoGo",
    " gogogogogogog ",
    " gogogogogogog ",
    "  ogogogogogo  ",
    "  ogo ogo ogo  ",
    "   o   o   o   ",
]

# Swayed, one pixel over. Two poses alternating is all a curtain of this many strands
# needs - anything more and the strands start to shimmer rather than sway.
CURTAIN_SWAY = [
    "gogogogogogogog",
    "gogogogogogogog",
    "GogoGogoGogoGog",
    "ogogogogogogogo",
    "ogogogogogogogo",
    " gogogogogogog ",
    " ogo ogo ogo o ",
    "  o   o   o    ",
]

# The drop. It gathers, hangs, falls, and is gone - four states, and it is the only water
# anywhere in this deck.
DROP_NONE = [
    " ",
]

DROP_GATHER = [
    "D",
]

DROP_HANG = [
    "D",
    "D",
]

DROP_FALL = [
    "D",
]

# The trunk, and a catkin still on it.
TRUNK = [
    "otTto",
    "otTto",
    "otTto",
    "ottto",
    " ooo ",
]

CATKIN = [
    "oSo",
    "SSS",
    "oSo",
    " o ",
]

HEAD_AT = (6, 5)

# --- Growth stages -----------------------------------------------------------
#
# A YOUNG WILLOW DOES NOT WEEP. The pendulous habit develops with age — a sapling is a
# whip of upright shoots, and the curtain that veils this creature's face is the last
# thing it grows. That gives the ladder its shape, and it also gives the sprite the only
# REVEAL in the set, run backwards: every other creature gains something you can see, and
# this one gains something that covers it up.
#
#   sprout    an unveiled face. No curtain, no drop, no catkin. It is simply a cheerful
#             young tree, and drawing it sad would be inventing a grief it has not got.
#   growing   half a curtain, a catkin still a silvery BUD — the pussy-willow stage,
#             before it opens — and a drop that gathers and hangs and does not fall.
#   flowering the full curtain, the drop, and the kind smile afterwards. Unchanged: the
#             smile is what makes the gesture consolation rather than sadness, and this
#             is the plant people have gone TO.
#
# THE BARK IS THE POINT OF THE CARD — salicin, and the word aspirin comes from it — and
# it is on every stage, because a willow whip has it as much as an old tree does. As
# everywhere else in this deck, that is traditional use rather than a claim: the card's
# Healing Traits heading frames it, and /safety carries the full text.

# --- Sprout: unveiled -------------------------------------------------------
YOUNG_HEAD_AT = (9, 14)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 12, 7.0, 5.6, 7.0, 5.4, 6, 0.12, 5.4, 3.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.3, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.3, light=(-1.25, -0.65))

TRUNK_SHORT = [
    "otTto",
    "ottto",
    " ooo ",
]

# --- Growing: half a curtain ------------------------------------------------
MID_HEAD_AT = (8, 9)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        17, 14, 8.0, 6.6, 7.8, 6.4, 6, 0.12, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.4, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.4, light=(-1.25, -0.65))

# Fewer strands and shorter ones. It veils the chin and no more, so the face is still
# mostly in the open — which is the difference between a young willow and an old one.
CURTAIN_SHORT = [
    "ogogogogogo",
    "ogogogogogo",
    "oGogoGogoGo",
    " gogogogog ",
    " ogo ogo o ",
    "  o   o    ",
]

CURTAIN_SHORT_SWAY = [
    "gogogogogog",
    "gogogogogog",
    "GogoGogoGog",
    "ogogogogogo",
    " ogo ogo o ",
    "  o   o    ",
]

# The pussy-willow stage: a silvery bud, before it lengthens into a catkin.
CATKIN_BUD = [
    "oSo",
    "oSo",
    " o ",
]

S_L_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)
S_R_DX, _ = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)
G_L_DX, _ = face_shift(MID_HEAD, MID_HEAD_LEFT)
G_R_DX, _ = face_shift(MID_HEAD, MID_HEAD_RIGHT)

SPRITE = {
    "herbId": "salix-spp",
    "personality": "consoling",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(6, "sprout"),
            "hide": ["curtain", "drop", "catkin", "cheeks"],
            "swap": {
                "head": YOUNG_HEAD,
                "trunk": TRUNK_SHORT,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"kind": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "trunk": (15, 24),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            # It looks about, and it is pleased. Nothing here is sorry for anybody yet,
            # and a sapling drawn grieving would be a grief invented for the picture.
            "motion": {
                "head": {
                    "art": [None, "right", None, None, "left", None, None, None],
                    "dy": [0, 0, -1, -1, 0, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, None, "happy", "happy", None, None, "blink", None],
                    "dx": [0, S_R_DX, 0, 0, S_L_DX, 0, 0, 0],
                    "dy": [0, 0, -1, -1, 0, 0, 0, 0],
                },
                "mouth": {
                    "art": [None, None, "kind", "kind", "kind", None, None, None],
                    "dx": [0, S_R_DX, 0, 0, S_L_DX, 0, 0, 0],
                    "dy": [0, 0, -1, -1, 0, 0, 0, 0],
                },
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(6, "growing"),
            "hide": ["cheeks"],
            "swap": {
                "head": MID_HEAD,
                "curtain": CURTAIN_SHORT,
                "catkin": CATKIN_BUD,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "curtain": {"sway": CURTAIN_SHORT_SWAY},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "half": YOUNG_EYES["half"],
                    "shut": YOUNG_EYES["shut"],
                    "happy": YOUNG_EYES["happy"],
                },
                "mouth": {"kind": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "curtain": (10, 16),
                "catkin": (24, 13),
                "drop": (13, 18),
                "trunk": (14, 22),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=4
                ),
            },
            # The drop gathers and hangs and stays hung. It never falls — the fall, and
            # the smile that answers it, are what the last stage is for.
            "motion": {
                "curtain": {
                    "art": [None, "sway", None, "sway", None, "sway", None, "sway",
                            None, None],
                    "dy": [0, 0, 0, 0, 0, 0, -1, -1, 0, 0],
                },
                "head": {
                    "art": [None, None, None, None, None, None, "right", None, "left",
                            None],
                    "dy": [0, 0, 1, 1, 1, 0, -1, -1, 0, 0],
                },
                "eyes": {
                    "art": [None, "half", "shut", "shut", "shut", "half", None,
                            "happy", None, "blink"],
                    "dx": [0, 0, 0, 0, 0, 0, G_R_DX, 0, G_L_DX, 0],
                    "dy": [0, 0, 1, 1, 1, 0, -1, -1, 0, 0],
                },
                "mouth": {
                    "art": [None, None, None, None, None, None, "kind", "kind", "kind",
                            None],
                    "dx": [0, 0, 0, 0, 0, 0, G_R_DX, 0, G_L_DX, 0],
                    "dy": [0, 0, 1, 1, 1, 0, -1, -1, 0, 0],
                },
                "drop": {
                    "art": [None, None, "gather", "hang", "hang", "hang", "hang", None,
                            None, None],
                    "dy": [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
                },
                "catkin": {"dy": [0, 0, -1, 0, 0, 1, 0, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 6,
    # The curtain is drawn after the face, because the face is BEHIND it. This is the only
    # sprite in the deck whose face is veiled in its resting pose rather than only during
    # a gesture.
    "parts": [
        {"name": "trunk", "origin": (14, 22), "rows": TRUNK},
        {"name": "catkin", "origin": (24, 12), "rows": CATKIN},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="sleepy", mouth="frown", eye_dy=1, mouth_dy=4,
            # The kind smile at the end. Small, and the only reason this sprite is not
            # simply a sad one.
            extra_mouths={"kind": ["o   o", " ooo "]},
        ),
        {
            "name": "curtain",
            # Seated so the strands hang across the CHIN and below, not across the mouth.
            # A curtain over the mouth hides the smile the whole gesture is built to
            # deliver, which is the one thing this sprite cannot afford to veil.
            "origin": (8, 15),
            "rows": CURTAIN,
            "variants": {"sway": CURTAIN_SWAY},
        },
        {
            "name": "drop",
            "origin": (12, 17),
            "rows": DROP_NONE,
            "variants": {"gather": DROP_GATHER, "hang": DROP_HANG, "fall": DROP_FALL},
        },
    ],
    #
    #  0    1     2      3      4     5     6     7     8     9    10   11   12    13
    # rest sway  gather  hang  hang  FALL  fall  lift  LOOK  SMILE SMILE rest blink rest
    #
    # The weep is frames 2-6 and the answer to it is frames 8-10: it lifts its face and
    # smiles. Those last three frames are the reason the gesture exists - a willow that
    # only wept would be a sad drawing, and this plant is the one people have gone TO. At
    # 6fps the whole thing takes over two seconds, which is the pace consolation moves at.
    # Frame 0 is the rest pose reduced motion freezes on: veiled, still, nothing falling.
    "motion": {
        "curtain": {
            "art": [None, "sway", None, "sway", None, "sway", None, "sway", None,
                    "sway", None, "sway", None, None],
            "dy": [0, 0, 0, 0, 0, 0, 0, -1, -2, -2, -2, 0, 0, 0],
        },
        "head": {
            "art": [None, None, None, None, None, None, None, None, "right", None,
                    "left", None, None, None],
            "dy": [0, 0, 1, 1, 1, 1, 0, 0, -1, -1, -1, 0, 0, 0],
        },
        "eyes": {
            "art": [None, "half", "shut", "shut", "shut", "shut", "half", None,
                    None, "half", "half", None, "blink", None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 2, 0, -2, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, 0, 0, -1, -1, -1, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, 0, 0, -1, -1, -1, 0, 0, 0],
        },
        # A frown for the weeping and a small kind smile at the end. Both are one row
        # deep, so neither reads as theatrical.
        "mouth": {
            "art": [None, None, None, None, None, None, None, "flat", "kind", "kind",
                    "kind", None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, -1, 0, 0, 0],
            "dy": [0, 0, 1, 1, 1, 1, 0, 0, -1, -1, -1, 0, 0, 0],
        },
        # One drop, once. Two would be self-pity.
        "drop": {
            "art": [None, None, "gather", "hang", "hang", "fall", "fall", None, None,
                    None, None, None, None, None],
            "dy": [0, 0, 0, 1, 2, 5, 9, 0, 0, 0, 0, 0, 0, 0],
        },
        "catkin": {"dy": [0, 0, -1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
