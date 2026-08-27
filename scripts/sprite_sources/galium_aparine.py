"""Cleavers (Galium aparine) - creature portrait sprite.

THE DESIGN HOOK: cleavers is the plant children throw at each other's backs. It is
covered in tiny hooked bristles, it scrambles up through everything else rather than
standing on its own, and it grows in whorls - rings of narrow leaves spaced up a square
stem like rungs. Its other names are sticky willy, goosegrass and catchweed, all of them
about the same trick.

Its silhouette is therefore LONG rather than tall or round, and it is the only sprite in
the deck that does not fit inside its own frame at rest.

WHERE THE FACE GOES: in the leading whorl, at the growing tip - the end of the plant
that is going somewhere.

PERSONALITY: overfamiliar. Its trademark gesture is THE REACH - it telescopes bodily
sideways across the frame and out of it, whorl after whorl, hooks out, and snaps back
when it fails to catch. It is the only sprite that changes its own extent, and the only
one whose gesture leaves the frame.

Deliberately not the burdock's grab: burdock reaches with two leaves and stays where it
is, and this one sends its whole body.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps

PALETTE = {
    **FACE_PALETTE,
    "G": (189, 223, 103, 255),   # whorl highlight
    "g": (142, 182, 76, 255),    # whorl mid
    "d": (101, 135, 55, 255),     # whorl deep
    "n": (70, 93, 47, 255),      # whorl shadow
    "H": (235, 244, 200, 255),   # the hooked bristles, pale so the catch reads
    "V": (244, 248, 230, 255),   # the tiny white flowers
}

HEAD_W, HEAD_H = 15, 14


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Eight narrow lobes: a whorl is a ring of narrow leaves radiating from one point,
    # and the lobes are doing exactly that job.
    return flower_head(
        HEAD_W, HEAD_H, 7.0, 6.5, 6.6, 6.2, 8, 0.20, 4.4, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.3, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.3, light=(-1.25, -0.65))

# One whorl - a ring of narrow leaves round the stem. The body is a CHAIN of these, and
# stretching means putting more space between them, which is exactly how the plant grows.
WHORL = [
    " o o o ",
    "oGoGoGo",
    "ogggggo",
    "odoдodo".replace("д", "d"),
    " o o o ",
]

# The square stem the whorls thread onto, drawn as a long run so the parts between the
# whorls never show a gap however far apart they are pulled.
STEM = [
    "ogGgggggggggggggggggggggo",
    "odgddddddddddddddddddddgo",
]

# The hooks. They only ever appear on the reach - a sprite showing its hooks at rest
# would be threatening rather than overfamiliar.
HOOKS_NONE = [
    " ",
]

HOOKS = [
    "H  H   H  H",
    " H  H   H  H",
]

# The tiny four-petalled white flowers, in the leaf axils where they belong.
FLOWERS = [
    "V  V",
    " V   V",
]

HEAD_AT = (2, 8)

# How far the face slides inside a turned head, measured rather than estimated. The
# features travel the head's own offset plus this, and adding the two by hand is what put
# the eyes off the face on exactly the frames the creature turns to look at something.
TURN_L = face_shift(HEAD, HEAD_LEFT)[0]
TURN_R = face_shift(HEAD, HEAD_RIGHT)[0]
# The reach stops where the FACE would leave the canvas, not where the head would:
# a whorl clipped by the frame edge reads as reaching past it, but an eye clipped by
# the frame edge just reads as a bug.
HEAD_DX = [0, 2, -1, -3, -4, -5, -5, 2, 3, 1, 0, 0, 0, 0]
TURN = [0, TURN_R, TURN_L, TURN_L, TURN_L, TURN_L, TURN_L, 0, TURN_R, 0, 0, 0, 0, 0]
FACE_DX = [head + turn for head, turn in zip(HEAD_DX, TURN)]

# --- Growth stages -----------------------------------------------------------
#
# THE REACH IS THE BODY, so the reach grows when the body does. Cleavers scrambles by
# adding whorls, and a plant with one whorl behind it has nothing to telescope: this is
# the only sprite in the deck whose gesture is limited by how much of it there IS.
#
#   sprout    one whorl and a short stem. It gathers, leans out barely, and stays inside
#             its own frame — which is notable, because staying inside the frame is the
#             one thing the adult never does.
#   growing   two whorls and a longer stem, hooks out, and it reaches to the edge and
#             stops there.
#   flowering three whorls, out of frame entirely, and the snap back. Unchanged.
#
# THE WHORLS GAIN LEAVES AS THEY GO, which is real: a cleavers seedling's lower whorls
# carry six narrow leaves and the upper ones carry eight, so the lobe count climbs with
# the stage rather than the shape merely scaling.
#
# THE HOOKS ARRIVE WITH THE REACH, not with the plant. Cleavers is bristled from
# germination — that is how a seedling clings at all — but the adult shows its hooks only
# while it is reaching, and drawing them on a creature that is not reaching would make it
# threatening instead of overfamiliar.

BUD_PALETTE = {
    "k": (176, 206, 128, 255),   # the flower buds — green knots, no white yet
}

# --- Sprout: one whorl, and it stays in frame -------------------------------
YOUNG_HEAD_AT = (4, 13)


def _young_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        14, 9, 6.5, 4.4, 6.6, 4.4, 6, 0.16, 5.4, 2.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG_HEAD = _young_head()
YOUNG_HEAD_LEFT = _young_head(face_dx=-1.2, light=(-0.35, -0.65))
YOUNG_HEAD_RIGHT = _young_head(face_dx=1.2, light=(-1.25, -0.65))

WHORL_SMALL = [
    " o o ",
    "oGoGo",
    "ogggo",
    " o o ",
]

STEM_SHORT = [
    "ogGgggggggo",
    "odgddddddgo",
]

# --- Growing: two whorls, and the hooks come out ----------------------------
MID_HEAD_AT = (3, 11)


def _mid_head(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        15, 11, 7.0, 5.4, 7.0, 5.4, 7, 0.18, 5.4, 3.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID_HEAD = _mid_head()
MID_HEAD_LEFT = _mid_head(face_dx=-1.2, light=(-0.35, -0.65))
MID_HEAD_RIGHT = _mid_head(face_dx=1.2, light=(-1.25, -0.65))

WHORL_MID = [
    " o o o",
    "oGoGoGo",
    "oggggdo",
    " o o o",
]

STEM_MID = [
    "ogGggggggggggggggo",
    "odgdddddddddddddgo",
]

HOOKS_SMALL = [
    "H  H  H",
    " H  H  H",
]

BUDS = [
    "k  k",
    " k   k",
]

S_TURN_L = face_shift(YOUNG_HEAD, YOUNG_HEAD_LEFT)[0]
S_TURN_R = face_shift(YOUNG_HEAD, YOUNG_HEAD_RIGHT)[0]
S_HEAD_DX = [0, 1, -1, -2, -2, -1, 0, 0]
S_TURN = [0, S_TURN_R, S_TURN_L, S_TURN_L, S_TURN_L, 0, 0, 0]
S_FACE_DX = [h + t for h, t in zip(S_HEAD_DX, S_TURN)]

G_TURN_L = face_shift(MID_HEAD, MID_HEAD_LEFT)[0]
G_TURN_R = face_shift(MID_HEAD, MID_HEAD_RIGHT)[0]
G_HEAD_DX = [0, 1, -1, -2, -3, -3, 1, 1, 0, 0]
G_TURN = [0, G_TURN_R, G_TURN_L, G_TURN_L, G_TURN_L, G_TURN_L, 0, G_TURN_R, 0, 0]
G_FACE_DX = [h + t for h, t in zip(G_HEAD_DX, G_TURN)]

SPRITE = {
    "herbId": "galium-aparine",
    "personality": "overfamiliar",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(10, "sprout"),
            # One whorl. No hooks, because it never reaches far enough to need them, and
            # no flowers, because it has not made any.
            "hide": ["whorlB", "whorlC", "flowers", "hooks"],
            "swap": {
                "head": YOUNG_HEAD,
                "whorlA": WHORL_SMALL,
                "stem": STEM_SHORT,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": YOUNG_HEAD_LEFT, "right": YOUNG_HEAD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "wide": YOUNG_EYES["wide"]},
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
            },
            "origins": {
                "head": YOUNG_HEAD_AT,
                "whorlA": (18, 16),
                "stem": (14, 17),
                **seat_young(
                    YOUNG_HEAD_AT, YOUNG_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            "motion": {
                "head": {
                    "art": [None, "right", "left", "left", "left", None, None, None],
                    "dx": S_HEAD_DX,
                    "dy": [0, 0, 1, 1, 1, 0, 0, 0],
                },
                "eyes": {
                    "art": [None, None, "wide", "wide", "wide", None, "blink", None],
                    "dx": S_FACE_DX,
                    "dy": [0, 0, 1, 1, 1, 0, 0, 0],
                },
                "mouth": {"dx": S_FACE_DX, "dy": [0, 0, 1, 1, 1, 0, 0, 0]},
                "whorlA": {"dx": [0, 1, 0, -1, -1, 0, 0, 0]},
                "stem": {"dx": [0, 0, 0, -1, -1, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(10, "growing"),
            "palette": BUD_PALETTE,
            "hide": ["whorlC"],
            "swap": {
                "head": MID_HEAD,
                "whorlA": WHORL_MID,
                "whorlB": WHORL_MID,
                "stem": STEM_MID,
                "flowers": BUDS,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "head": {"left": MID_HEAD_LEFT, "right": MID_HEAD_RIGHT},
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "wide": YOUNG_EYES["wide"],
                    "half": YOUNG_EYES["half"],
                },
                "mouth": {"wide": YOUNG_MOUTH["wide"]},
                "hooks": {"out": HOOKS_SMALL},
            },
            "origins": {
                "head": MID_HEAD_AT,
                "whorlA": (16, 14),
                "whorlB": (23, 14),
                "stem": (13, 15),
                "flowers": (19, 17),
                "hooks": (11, 13),
                **seat_young(
                    MID_HEAD_AT, MID_HEAD, cheeks=False, eye_dy=1, mouth_dy=3
                ),
            },
            # It reaches to the edge and stops. Leaving the frame is the last thing it
            # learns, and it is the whole point of the adult.
            "motion": {
                "head": {
                    "art": [None, "right", "left", "left", "left", "left", None,
                            "right", None, None],
                    "dx": G_HEAD_DX,
                    "dy": [0, 0, 1, 2, 2, 2, 0, -1, 0, 0],
                },
                "eyes": {
                    "art": [None, None, "wide", "wide", "wide", "wide", "half", None,
                            "blink", None],
                    "dx": G_FACE_DX,
                    "dy": [0, 0, 1, 2, 2, 2, 0, -1, 0, 0],
                },
                "mouth": {
                    "art": [None, None, "wide", "wide", "wide", "wide", None, None,
                            None, None],
                    "dx": G_FACE_DX,
                    "dy": [0, 0, 1, 2, 2, 2, 0, -1, 0, 0],
                },
                "whorlA": {"dx": [0, 1, -1, -2, -3, -3, 1, 1, 0, 0]},
                "whorlB": {"dx": [0, 1, 0, -1, -2, -2, 1, 0, 0, 0]},
                "flowers": {"dx": [0, 1, 0, -1, -2, -2, 1, 0, 0, 0]},
                "hooks": {
                    "art": [None, None, "out", "out", "out", "out", None, None, None,
                            None],
                    "dx": [0, 0, -1, -2, -3, -3, 0, 0, 0, 0],
                    "dy": [0, 0, 1, 2, 2, 2, 0, 0, 0, 0],
                },
                "stem": {"dx": [0, 0, 0, -1, -1, -1, 0, 1, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    # Stem first, whorls threaded on it, head at the leading end, hooks over everything.
    "parts": [
        {"name": "stem", "origin": (6, 14), "rows": STEM},
        {"name": "whorlA", "origin": (12, 12), "rows": WHORL},
        {"name": "whorlB", "origin": (18, 12), "rows": WHORL},
        {"name": "whorlC", "origin": (24, 12), "rows": WHORL},
        {"name": "flowers", "origin": (16, 16), "rows": FLOWERS},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="small", eye_dy=2, mouth_dy=5,
            # No blush. This face is the narrowest in the deck and a blush sits by
            # definition at the rim, so on a turn it slides straight off - and cleavers
            # is not a creature that blushes anyway.
            cheeks=False,
            extra_mouths={"grin": ["ooo", "oFo"]},
        ),
        {
            "name": "hooks",
            "origin": (8, 10),
            "rows": HOOKS_NONE,
            "variants": {"out": HOOKS},
        },
    ],
    #
    #  0    1     2      3      4      5      6     7      8     9    10   11   12    13
    # rest gather REACH  REACH  REACH  STRAIN miss  snap  recoil settle rest rest blink rest
    #
    # The reach is frames 2-6 and it is this sprite's trademark: the head leaves the
    # frame on the left while the whorls behind it pull apart to follow, hooks out. On
    # frame 7 it fails to catch anything and the whole chain snaps back in one frame,
    # which is faster than it went out - the recoil is what makes it read as elastic
    # rather than as a sprite sliding. Frame 0 is the rest pose reduced motion freezes on:
    # gathered up, hooks in, nothing reaching for anybody.
    "motion": {
        # The head goes furthest and arrives first. Everything behind it is being dragged.
        "head": {
            "art": [None, "right", "left", "left", "left", "left", "left", None,
                    "right", None, None, None, None, None],
            "dx": HEAD_DX,
            "dy": [0, 0, 1, 2, 2, 2, 2, 0, -1, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "wide", "wide", "wide", "wide", "wide", "half",
                    None, None, None, None, "blink", None],
            "dx": FACE_DX,
            "dy": [0, 0, 1, 2, 2, 2, 2, 0, -1, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "grin", "grin", "grin", "grin", "grin", None, None,
                    None, None, None, None, None],
            "dx": FACE_DX,
            "dy": [0, 0, 1, 2, 2, 2, 2, 0, -1, 0, 0, 0, 0, 0],
        },
        # The whorls pull apart in sequence, each one a beat behind the one ahead of it.
        # Moving them together would be a sprite sliding sideways; moving them in order is
        # a plant extending.
        "whorlA": {"dx": [0, 1, -1, -2, -4, -5, -5, 1, 2, 1, 0, 0, 0, 0]},
        "whorlB": {"dx": [0, 1, 0, -1, -2, -3, -3, 1, 1, 0, 0, 0, 0, 0]},
        "whorlC": {"dx": [0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
        "flowers": {"dx": [0, 1, 0, -1, -2, -3, -3, 1, 1, 0, 0, 0, 0, 0]},
        # Hooks out for the reach and gone the instant it fails.
        "hooks": {
            "art": [None, None, "out", "out", "out", "out", "out", None, None, None,
                    None, None, None, None],
            "dx": [0, 0, -1, -3, -5, -6, -6, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 1, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0],
        },
        "stem": {"dx": [0, 0, 0, -1, -2, -2, -2, 0, 1, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
