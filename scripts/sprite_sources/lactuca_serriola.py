"""Prickly Lettuce (Lactuca serriola) - creature portrait sprite.

THE DESIGN HOOK: prickly lettuce is the compass plant. Its leaves twist at the base until
the blades stand vertical and line up north-south, which shades them at midday and catches
the low sun morning and evening. A whole field of it points the same way, and people have
navigated by it. `Lactuca` is from lac, milk, for the white sap that runs out of a cut
stem, and there is a row of spines down the underside of every midrib.

WHERE THE FACE GOES: in the leaf, in profile, so the alignment is visible - which is the
only sprite in this deck whose whole gesture would be invisible from any other angle.

PERSONALITY: orienting. Its trademark gesture is THE BEARING - the whole plant swings
like a compass needle, overshoots, swings back short, and settles pointing. Nothing else
in this deck has direction as a personality trait, and nothing else overshoots and
corrects.

An Epic card, and the reason this one earns it is that its trick is invisible until
somebody tells you about it. Then you cannot stop seeing it in car parks.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (192, 208, 161, 255),   # leaf highlight - a grey-green, not a salad green
    "g": (152, 166, 132, 255),   # leaf mid
    "d": (118, 134, 100, 255),     # leaf deep
    "n": (72, 83, 63, 255),      # leaf shadow
    "S": (237, 242, 228, 255),   # the spines down the midrib, carried on the stem - drawn
                                 # across the leaf as well they ended up through the face
    "M": (249, 250, 244, 255),   # the milky sap `Lactuca` is named for
    "Y": (226, 220, 194, 255),   # the small pale yellow flowers
    "N": (225, 230, 216, 255),   # the bearing marks, which appear only while it swings
}

HEAD_W, HEAD_H = 17, 17


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Tall rather than wide: these leaves stand on EDGE, which is the entire point of the
    # species, and a round head would be drawing a plant that had given up on it.
    return flower_head(
        HEAD_W, HEAD_H, 8.0, 8.0, 6.8, 8.0, 6, 0.16, 4.8, 4.4,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))

# A bead of milky sap at a broken edge. It appears once, low down, and it is the only
# white in the sprite that is not a spine.
SAP_NONE = [
    " ",
]

SAP = [
    "M",
    "M",
]

# The bearing marks: two small ticks either side, present only while it is swinging. They
# are the sprite saying "this is a direction" without a compass rose, which would be a
# machine rather than a plant.
MARKS_NONE = [
    " ",
]

MARKS = [
    "N" + " " * 24 + "N",
]

# The stem leaves, clasping the stem and standing on edge like everything else here.
BLADE_L = [
    "  ooo",
    " oGGgo",
    "oGgggdo",
    " ogddno",
    "  ooo",
]

BLADE_R = [
    "ooo",
    "ogGGo",
    "odgggGo",
    " onddgo",
    "  ooo",
]

FLOWERS = [
    "oYo oYo",
    "YYY YYY",
    " o   o",
]

STEM = [
    "ogSdo",
    "ogSdo",
    "ogSdo",
    " ooo ",
]

HEAD_AT = (7, 4)
TURN_L = face_shift(HEAD, HEAD_LEFT)[0]
TURN_R = face_shift(HEAD, HEAD_RIGHT)[0]
# A needle finding north: a big swing one way, a smaller correction back, a smaller one
# again, and rest. Each overshoot is about half the last, which is what makes it read as
# settling rather than as rocking.
HEAD_ART = [None, "right", "right", "left", "left", "left", "right", "right", "left",
            None, None, None, None, None]
SWING = [0, 4, 5, -4, -5, -3, 2, 3, -1, 0, 0, 0, 0, 0]
_SLIDE = {"left": TURN_L, "right": TURN_R}
FACE_DX = [dx + _SLIDE.get(art, 0) for dx, art in zip(SWING, HEAD_ART)]

SPRITE = {
    "herbId": "lactuca-serriola",
    "personality": "orienting",
    "size": (32, 28),
    "frames": 14,
    "fps": 10,
    "parts": [
        {"name": "stem", "origin": (14, 20), "rows": STEM},
        {"name": "bladeL", "origin": (6, 18), "rows": BLADE_L},
        {"name": "bladeR", "origin": (19, 18), "rows": BLADE_R},
        {"name": "flowers", "origin": (12, 3), "rows": FLOWERS},
        {
            "name": "marks",
            # Far enough out that the head never covers them however far it swings.
            "origin": (2, 13),
            "rows": MARKS_NONE,
            "variants": {"on": MARKS},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        *feature_parts(HEAD_AT, HEAD, eyes="narrow", mouth="line", eye_dy=2, mouth_dy=5),
        {
            "name": "sap",
            "origin": (23, 21),
            "rows": SAP_NONE,
            "variants": {"on": SAP},
        },
    ],
    #
    #  0     1     2     3      4      5     6     7     8     9    10   11   12    13
    # rest SWING SWING BACK   BACK   back  over  over  settle rest rest rest blink rest
    #
    # The bearing is frames 1-8 and it is this sprite's trademark: a full swing, an
    # overshoot the other way, a smaller correction, and rest. Each overshoot is about
    # half the one before it, which is the only thing that makes a needle read as
    # settling rather than as swaying. Frame 0 is the rest pose reduced motion freezes on:
    # pointing, and level.
    "motion": {
        "head": {"art": HEAD_ART, "dx": SWING},
        "eyes": {
            "art": [None, "wide", "wide", "wide", "wide", None, None, None, None,
                    None, None, None, "blink", None],
            "dx": FACE_DX,
        },
        "cheeks": {"dx": [dx // 2 + s for dx, s in
                          zip(SWING, [_SLIDE.get(a, 0) for a in HEAD_ART])]},
        "mouth": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None],
            "dx": [dx // 2 + s for dx, s in
                   zip(SWING, [_SLIDE.get(a, 0) for a in HEAD_ART])],
        },
        # The marks show only while it is actually turning, and they are gone the moment
        # it settles - which is what makes them a reading rather than a decoration.
        "marks": {
            "art": [None, "on", "on", "on", "on", "on", "on", "on", None, None,
                    None, None, None, None],
        },
        # One bead of milky sap, once, near the end - the plant's own name, mentioned
        # quietly rather than made into the gesture.
        "sap": {
            "art": [None, None, None, None, None, None, None, None, None, "on",
                    "on", None, None, None],
            "dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
        },
        "flowers": {"dx": SWING, "lean": [0, -2, -2, 2, 2, 1, -1, -1, 1, 0, 0, 0, 0, 0]},
        "bladeL": {"dx": [dx // 2 for dx in SWING]},
        "bladeR": {"dx": [dx // 2 for dx in SWING]},
    },
    "palette": PALETTE,
}
