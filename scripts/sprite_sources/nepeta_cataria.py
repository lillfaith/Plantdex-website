"""Catnip (Nepeta cataria) - creature portrait sprite.

THE DESIGN HOOK: nepetalactone. About two thirds of cats carry the gene that responds to
it, and the response is famous - rolling, rubbing, and about ten minutes of complete loss
of dignity. Catnip is the only plant in this deck whose defining property is what it does
to somebody else's behaviour, and the joke this sprite runs on is that the plant is not
immune to its own supply.

WHERE THE FACE GOES: in the grey-green leafy head, under the spike of pale hooded
flowers. Catnip is a mint and looks it - furred, toothed, silvery.

PERSONALITY: giddy. Its trademark gesture is THE ZOOMIES - it tips over, rolls all the
way onto its side, kicks, and rights itself looking slightly embarrassed. It is the only
sprite that loses its footing, the only one that goes upside down, and the only one
whose face is not level for most of its own loop.

Deliberately the opposite number to the lemon balm, which is the other mint in this deck
and whose whole gesture is calming down.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_shift, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "G": (209, 211, 186, 255),   # leaf highlight - catnip is grey-green and furred
    "g": (169, 171, 151, 255),   # leaf mid
    "d": (133, 138, 115, 255),     # leaf deep
    "n": (104, 109, 91, 255),      # leaf shadow
    "V": (238, 235, 245, 255),   # the pale hooded flowers
    "v": (211, 207, 222, 255),   # flower shade
    "S": (229, 224, 201, 255),   # the giddy sparks, and nothing else uses them
    "t": (181, 182, 163, 255),   # square stem
}

HEAD_W, HEAD_H = 19, 17


def _head(face_dx=0.0, face_dy=0.0, light=(-0.85, -0.65)):
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 8.0, 8.4, 7.6, 7, 0.15, 5.0, 4.2,
        face_dx=face_dx, face_dy=face_dy, light=light, trim_tail=False, chars="GgdnFo",
    )


HEAD = _head()
# The roll, drawn as the face travelling right round the head while the light stays put.
# That is the same trick the dandelion's spin uses, turned on its side: here the face
# goes DOWN and across, which reads as the whole creature tipping over rather than
# turning to look at something.
HEAD_TIP = _head(face_dx=2.0, face_dy=1.0, light=(-1.25, -0.35))
HEAD_SIDE = _head(face_dx=3.4, face_dy=2.2, light=(-1.6, 0.2))
HEAD_OVER = _head(face_dx=2.2, face_dy=3.4, light=(-1.2, 0.8))
HEAD_BACK_UP = _head(face_dx=-1.6, face_dy=1.2, light=(-0.2, -0.4))

# The spike of pale hooded flowers.
SPIKE = [
    " oVo ",
    "oVVVo",
    " oVo ",
    "ovVvo",
    " ovo ",
    " ovo ",
]

# Toothed, furred leaves. They flail during the roll, which is most of what makes it read
# as a roll and not a lean.
LEAF_L = [
    "  ooooo",
    " oGoGoGo",
    "oGGgggggo",
    " oggdddno",
    "  ooooo",
]

LEAF_R = [
    "ooooo",
    "oGoGoGo",
    "oggggggGo",
    "ondddggo",
    "ooooo",
]

# The sparks of pure delight. Only during the roll, and they are the only thing in this
# sprite that is not a plant.
SPARKS_NONE = [
    " ",
]

SPARKS = [
    "S   S",
    " S S ",
    "S   S",
]

STEM = [
    "otto",
    "otto",
    " oo ",
]

HEAD_AT = (6, 6)

# The roll, driven off MEASURED face shifts rather than typed offsets. The features have
# to travel the head's own movement plus however far the face slid inside it, and over
# nine frames of rolling those two numbers stack differently every frame - which is
# exactly the arithmetic nobody does correctly by eye.
ROLL_ART = [None, None, None, "tip", "tip", "side", "over", "over", "side", "tip",
            "backUp", "backUp", None, None, None, None]
HEAD_DX = [0, 0, 1, 2, 3, 4, 4, 4, 3, 2, -1, -1, 0, 0, 0, 0]
HEAD_DY = [0, -1, -1, 1, 2, 3, 4, 4, 3, 2, 0, 0, 0, 0, 0, 0]
_POSE = {
    "tip": HEAD_TIP,
    "side": HEAD_SIDE,
    "over": HEAD_OVER,
    "backUp": HEAD_BACK_UP,
}
_SHIFT = [face_shift(HEAD, _POSE[a]) if a else (0, 0) for a in ROLL_ART]
FACE_DX = [dx + sx for dx, (sx, _) in zip(HEAD_DX, _SHIFT)]
FACE_DY = [dy + sy for dy, (_, sy) in zip(HEAD_DY, _SHIFT)]

SPRITE = {
    "herbId": "nepeta-cataria",
    "personality": "giddy",
    "size": (32, 28),
    "frames": 16,
    "fps": 12,
    "parts": [
        {"name": "stem", "origin": (14, 23), "rows": STEM},
        {"name": "spike", "origin": (13, 0), "rows": SPIKE},
        {"name": "leafL", "origin": (0, 19), "rows": LEAF_L},
        {"name": "leafR", "origin": (21, 19), "rows": LEAF_R},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {
                "tip": HEAD_TIP,
                "side": HEAD_SIDE,
                "over": HEAD_OVER,
                "backUp": HEAD_BACK_UP,
            },
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="beam", eye_dy=1, mouth_dy=4,
            # Spiralled: the one pair of eyes in the deck that are not looking anywhere.
            extra_eyes={"spiral": ["oo  oo", "EE  EE"], "dizzy": ["Eo  oE", "oE  Eo"]},
            # Two rows. Nine frames of rolling put this face at every angle it has, and a
            # three-row mouth falls off the bottom of it at most of them.
            extra_mouths={"laughing": ["ooooo", "oFFFo"]},
        ),
        {
            "name": "sparks",
            "origin": (2, 4),
            "rows": SPARKS_NONE,
            "variants": {"on": SPARKS},
        },
    ],
    #
    #  0    1    2    3     4     5      6      7      8      9     10    11    12   13   14    15
    # rest sniff SNIFF tip  TIP   ROLL   OVER   OVER   kick  right right  wobble rest rest blink rest
    #
    # The zoomies are frames 3-11 and this is the deck's only loss of composure: nine
    # frames of a plant on its side. The face travels right round the head while the light
    # stays where it is, which is what makes it read as the creature rolling rather than
    # as the drawing sliding. Frame 0 is the rest pose reduced motion freezes on - upright
    # and, for the moment, dignified.
    "motion": {
        "head": {
            "art": ROLL_ART,
            "dx": HEAD_DX,
            "dy": HEAD_DY,
            # No shear on the head. A lean moves each ROW by a different amount, so the
            # face inside it stops being where `face_shift` measured it and the features
            # come adrift. The roll is carried by the face travelling round the head
            # instead, which is the part that actually reads as rolling.
        },
        # The features go with the face inside the head as well as with the head itself,
        # which is two offsets stacked - the only place in this deck that is necessary,
        # and the reason the roll works at all.
        "eyes": {
            "art": [None, "wide", "wide", "spiral", "spiral", "dizzy", "dizzy",
                    "dizzy", "spiral", "spiral", "half", None, None, None, "blink", None],
            "dx": FACE_DX,
            "dy": FACE_DY,
        },
        # No blush on the roll frames: it sits on the rim of the face by definition, and
        # a face turned this far has no rim left facing the viewer.
        "cheeks": {
            "art": [None, None, None, None, None, "hidden", "hidden", "hidden",
                    "hidden", None, None, None, None, None, None, None],
            "dx": FACE_DX,
            "dy": FACE_DY,
        },
        "mouth": {
            "art": [None, None, "laughing", "laughing", "laughing", "laughing",
                    "laughing", "laughing", "laughing", "laughing", "laughing", None,
                    None, None, None, None],
            "dx": FACE_DX,
            "dy": FACE_DY,
        },
        # The leaves flail in opposite directions and never in step, which is what stops
        # nine frames of movement resolving into a rocking chair.
        "leafL": {
            "dx": [0, 0, 1, 3, 4, 5, 5, 4, 3, 1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, -1, -2, -1, 1, 2, 1, -1, -2, 0, 0, 0, 0, 0, 0],
        },
        "leafR": {
            "dx": [0, 0, 1, 2, 4, 5, 6, 6, 5, 3, 1, 0, 0, 0, 0, 0],
            "dy": [0, 0, 1, 2, 1, -1, -2, -1, 1, 2, 0, 0, 0, 0, 0, 0],
        },
        "spike": {
            "lean": [0, 0, 2, 4, 6, 8, 9, 9, 7, 5, -2, -1, 0, 0, 0, 0],
            "dx": [0, 0, 1, 2, 3, 4, 4, 4, 3, 2, -1, 0, 0, 0, 0, 0],
        },
        "sparks": {
            "art": [None, None, None, None, "on", "on", None, "on", "on", None,
                    None, None, None, None, None, None],
            "dx": [0, 0, 0, 0, 0, 20, 0, 2, 22, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 0, 2, 0, 14, 12, 0, 0, 0, 0, 0, 0, 0],
        },
    },
    "palette": PALETTE,
}
