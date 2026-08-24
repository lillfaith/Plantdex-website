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

PALETTE = {
    **FACE_PALETTE,
    "G": (158, 202, 124, 255),   # whorl highlight
    "g": (112, 162, 96, 255),    # whorl mid
    "d": (76, 120, 70, 255),     # whorl deep
    "n": (52, 88, 54, 255),      # whorl shadow
    "H": (226, 236, 208, 255),   # the hooked bristles, pale so the catch reads
    "V": (240, 246, 232, 255),   # the tiny white flowers
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

SPRITE = {
    "herbId": "galium-aparine",
    "personality": "overfamiliar",
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
