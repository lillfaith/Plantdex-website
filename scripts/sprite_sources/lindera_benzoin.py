"""Spicebush (Lindera benzoin) - creature portrait sprite.

THE DESIGN HOOK is a smell. Snap a twig of this and you get a warm, citrusy, peppery lift
that is the way the shrub is identified in the field - the card's own back prints
`aromatic: [Spicy, Citrusy, Woody]` and `taste: [Spicy, Peppery, Warm]`. Everything else in
the deck is drawn from a shape. This one is drawn from what it does to the air.

A SHRUB, NOT A FLOWER. The face-bearing organ is the canopy, and it is a `flower_head` with
seven shallow lobes - which at this size is a bush: a rounded mass with a bumpy edge, not a
disc. Under it, THREE stems from one base, because multi-stemmed is what tells a spicebush
from a small tree, and two red drupes hanging on their own stalks.

WHERE THE FACE GOES: in the canopy, carved out of the generator itself, never a patch hung
on the front of one.

PERSONALITY: peppery. Its trademark gesture is THE WAFT - the shrub gathers, a curl of warm
air lifts off it, and the creature follows it up and then shuts its eyes, pleased with
itself. Nothing else in the set has an updraft, and nothing else watches something leave.

THIS ILLUSTRATES A SMELL AND NOT AN EFFECT, and the line matters. The same card prints fever
aid, digestive support, antiparasitic and warming under healing traits, and not one of them
appears here in any form. A gesture may show what a plant smells and tastes like; it may
never show it treating anything - the rule self-heal keeps by mending a notch in its OWN
leaf. The scent is also the plant's own and reaches nobody.

Frame 0 has NO scent in the air. A gesture may fling things loose and often should, but at
rest a plant is one plant, and a permanent curl overhead would be ambient motion drawn in.

COLOUR: leaves at ~129 deg, the gap between Japanese honeysuckle and passionflower, taking a
lower saturation and higher lightness than either so no two neighbours in hue separate on one
axis alone. Drupes sit at ~5 and the stems at ~28, both far outside the 34 deg either side of
its own foliage that the set forbids. Midtones stay under the saturation cap.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "G": (147, 200, 155, 255),   # leaf highlight
    "g": (111, 174, 121, 255),   # leaf mid
    "d": (71, 133, 81, 255),     # leaf deep
    "n": (48, 90, 54, 255),      # leaf shadow
    "R": (229, 110, 97, 255),    # drupe
    "r": (203, 52, 42, 255),     # drupe deep
    "b": (148, 110, 76, 255),    # woody stem
    "B": (96, 71, 52, 255),      # stem shadow
    "K": (237, 223, 192, 255),   # the warm air coming off it
}

# --- The canopy --------------------------------------------------------------
#
# SEVEN SHALLOW LOBES. Deep lobes make petals and this is not a flower; at 0.14 the rim
# is merely uneven, which at 25 pixels across is a bush. The face is carved out of the
# generator, never laid over it.
CANOPY_W, CANOPY_H = 25, 17


def _canopy(rx=10.5, ry=7.0, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        CANOPY_W, CANOPY_H, 12.0, 8.0, rx, ry, 7, 0.14, 5.4, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


CANOPY = _canopy()
CANOPY_LEFT = _canopy(face_dx=-1.5, light=(-0.35, -0.65))
CANOPY_RIGHT = _canopy(face_dx=1.5, light=(-1.25, -0.65))
# The gather before the waft: the whole bush draws in a little, then lets go.
CANOPY_TIGHT = _canopy(rx=10.0, ry=6.6)

CANOPY_AT = (3, 3)

L_DX, _ = face_shift(CANOPY, CANOPY_LEFT)
R_DX, _ = face_shift(CANOPY, CANOPY_RIGHT)

# --- The stems ---------------------------------------------------------------
#
# THREE FROM ONE BASE. Multi-stemmed is what separates a spicebush from a small tree, and
# it is the one structural thing about this plant a silhouette can carry.
STEMS = [
    "obbo obbo obbo",
    "obbo obbo obbo",
    "obbo obbo obbo",
    "obbo obbo obbo",
    "obbo obbo obbo",
    "oBBo oBBo oBBo",
    "oooo oooo oooo",
]

STEMS_AT = (9, 18)

# --- The drupes --------------------------------------------------------------
#
# On their own stalks, and the stalks REACH THE CANOPY. A berry floating beside a leaf is
# the bug twenty-five sprites in this set once shipped, and it is invisible while authoring
# because parts are a list and the gap only exists in the render.
DRUPE = [
    " ogo ",
    " ogo ",
    "oRRro",
    "oRrro",
    " ooo ",
]

DRUPE_L_AT = (6, 14)
DRUPE_R_AT = (21, 14)

# --- The scent ---------------------------------------------------------------
#
# Its own part, defaulting to NOTHING, the same trick horsetail's fertile shoot uses. It
# rises and thins; warm air does not travel in a straight line, so neither does this.
SCENT_NONE = [" "]

WISP_A = [
    " K",
    "K ",
]

WISP_B = [
    "  K",
    " K ",
    "K  ",
]

WISP_C = [
    "K  ",
    " K ",
    "  K",
    " K ",
]

WISP_D = [
    "  K",
    " K ",
    "K  ",
    "   ",
]

SCENT_AT = (22, 7)

# --- Growth stages -----------------------------------------------------------
#
#   sprout    one small canopy on a single stem and no fruit. A seedling shrub is a twig
#             with leaves on it, and it has nothing to give off yet.
#   growing   a fuller canopy, two stems, still no drupes - Lindera is dioecious and only
#             some plants ever fruit at all, so berries are the last thing to arrive and
#             never the thing that defines a young one.
#   flowering full canopy, three stems, two drupes, and air coming off it.

YOUNG_W, YOUNG_H = 19, 11


def _young(rx=8.0, ry=4.8, light=(-0.85, -0.65)):
    return flower_head(
        YOUNG_W, YOUNG_H, 9.0, 5.4, rx, ry, 7, 0.14, 5.6, 3.4,
        face_dy=0.7,
        light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG = _young()
YOUNG_AT = (6, 12)

YOUNG_STEM = [
    "obbo",
    "oBBo",
    "oooo",
]

MID_W, MID_H = 21, 15


def _mid(rx=9.0, ry=6.2, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        MID_W, MID_H, 10.0, 7.0, rx, ry, 7, 0.14, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID = _mid()
MID_LEFT = _mid(face_dx=-1.3, light=(-0.35, -0.65))
MID_RIGHT = _mid(face_dx=1.3, light=(-1.25, -0.65))

MID_AT = (5, 6)

G_L_DX, _ = face_shift(MID, MID_LEFT)
G_R_DX, _ = face_shift(MID, MID_RIGHT)

MID_STEMS = [
    "obbo obbo",
    "obbo obbo",
    "obbo obbo",
    "oBBo oBBo",
    "oooo oooo",
]

# The young loops. A seedling can look about and a half-grown shrub can gather, but only a
# full one gives anything off - whatever a species does that nothing else does stays with
# the adult, so mastery buys something a player can see.
S_BOB = [0, 0, -1, -1, 0, 0, 0, 0]
S_EYES = [None, None, "half", "half", None, None, "blink", None]

G_BOB = [0, 0, 1, -1, -1, -1, 0, 0, 0, 0]
G_HEAD = [None, None, None, "right", "right", "left", None, None, None, None]
G_DX = [0, 0, 0, G_R_DX, G_R_DX, G_L_DX, 0, 0, 0, 0]
G_EYES = [None, None, "half", None, None, None, None, "blink", None, None]


SPRITE = {
    "herbId": "lindera-benzoin",
    "personality": "peppery",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "hide": ["drupeL", "drupeR", "scent", "cheeks"],
            "swap": {
                "canopy": YOUNG,
                "stems": YOUNG_STEM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "canopy": YOUNG_AT,
                "stems": (14, 21),
                **seat_young(YOUNG_AT, YOUNG, cheeks=False, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "canopy": {"dy": S_BOB},
                "eyes": {"dy": S_BOB, "art": S_EYES},
                "mouth": {"dy": S_BOB},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "hide": ["drupeL", "drupeR", "scent"],
            "swap": {
                "canopy": MID,
                "stems": MID_STEMS,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": young_cheeks(face_box(MID)[2]),
            },
            "variants": {
                "canopy": {"left": MID_LEFT, "right": MID_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "canopy": MID_AT,
                "stems": (12, 18),
                **seat_young(MID_AT, MID, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "canopy": {"dy": G_BOB, "art": G_HEAD},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_EYES},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    # Stems and drupes behind, canopy over them so the stalks emerge from the leaves, and
    # the scent last of all because it passes in front of everything on its way up.
    "parts": [
        {"name": "stems", "origin": STEMS_AT, "rows": STEMS},
        {"name": "drupeL", "origin": DRUPE_L_AT, "rows": DRUPE},
        {"name": "drupeR", "origin": DRUPE_R_AT, "rows": DRUPE},
        {
            "name": "canopy",
            "origin": CANOPY_AT,
            "rows": CANOPY,
            "variants": {
                "left": CANOPY_LEFT,
                "right": CANOPY_RIGHT,
                "tight": CANOPY_TIGHT,
            },
        },
        {
            "name": "scent",
            "origin": SCENT_AT,
            "rows": SCENT_NONE,
            "variants": {"a": WISP_A, "b": WISP_B, "c": WISP_C, "d": WISP_D},
        },
        *feature_parts(CANOPY_AT, CANOPY, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
    ],
    #
    #  0    1     2      3     4     5     6      7      8      9    10   11    12   13
    # rest still gather release rise  rise  rise  follow follow pleased pleased rest blink rest
    #
    # THE WAFT. The bush draws in on frame 2 and lets go on 3; the curl lifts away over
    # 4-8 while the eyes track it UP - which is why they carry a dy of their own that the
    # mouth does not share. Then the eyes shut and the mouth grins: it did that on purpose
    # and it knows.
    #
    # The scent RISES AND DRIFTS, never in a straight line, and thins as it goes - a
    # straight column of pixels reads as steam from a kettle. It is gone by frame 9,
    # because a curl still hanging at the end of the loop would restart as ambient motion.
    "motion": {
        "canopy": {
            "art": [None, None, "tight", None, None, None, None, None, None, None,
                    None, None, None, None],
            "dy": [0, 0, 1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "scent": {
            "art": [None, None, None, "a", "b", "c", "c", "d", "d", None,
                    None, None, None, None],
            "dy": [0, 0, 0, 0, -2, -4, -6, -7, -8, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 0, 1, 1, 2, 2, 0, 0, 0, 0, 0],
        },
        # The eyes carry a lift the rest of the face does not: that difference IS the
        # look upward, and without it the creature ignores its own scent.
        "eyes": {
            "art": [None, None, "half", None, None, None, None, None, None,
                    "shut", "shut", None, "blink", None],
            # ONE PIXEL, and it has to stay one RELATIVE to the canopy, which is moving
            # under it. Two walked the eyes straight off the top of the face and the audit
            # caught it in four frames; a look upward is a pixel of difference, not a leap.
            "dy": [0, 0, 1, -2, -2, -1, -1, -1, -1, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dy": [0, 0, 1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "flat", None, None, None, None, None, None,
                    "grin", "grin", None, None, None],
            "dy": [0, 0, 1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # The drupes swing a beat behind the canopy, which is what makes the gather read
        # as travelling through the whole shrub rather than happening to the leaves.
        "drupeL": {"dy": [0, 0, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
        "drupeR": {"dy": [0, 0, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
