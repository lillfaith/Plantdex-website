"""Common Mallow (Malva neglecta) - creature portrait sprite.

THE DESIGN HOOK is the fruit, and the fruit is a wheel of cheese. Malva's seed head is a
flat disc that breaks into wedge-shaped segments arranged round a hub, which is why half of
Europe calls the plant cheeses, cheeseweed or cheesecakes and why children have eaten the
green ones for as long as anyone has written it down. Nothing else in this set carries a
fruit built like a diagram.

THE FACE GOES IN A LEAF, WHICH IS RARE HERE AND IS THE POINT. Almost every creature in the
set wears its face in a flower or a head; this one wears it in a nearly circular,
shallow-scalloped leaf, because that leaf is what a person actually finds - mallow is
usually met as a rosette of round leaves in a path or a pavement crack, long before anything
flowers. Eleven very shallow lobes: deep ones make a maple, and at 21 pixels across a low
amplitude is exactly the crimped rim the plant has.

LOW AND SPRAWLING, NOT UPRIGHT. Two short stems rather than three tall ones, and they are
deliberately the shortest in the set so far, because Malva neglecta runs along the ground
from a deep taproot instead of standing up. A tall mallow would read as a hollyhock, which
is a relative and a different plant.

PERSONALITY: obliging. Its trademark gesture is THE WHEEL - the cheese turns to face you,
splits into its wedges, holds them fanned for a beat and closes again, the whole thing done
squarely to camera like someone showing you how a thing comes apart. It is not offering the
wedges to anybody and nothing is taken: the plant demonstrates its own fruit and puts it
back together.

THAT DISTINCTION IS DELIBERATE. The card prints anti-inflammatory, respiratory support,
digestive support and skin aid, and none of them appears here in any form - a gesture may
show a plant's own structure, never it treating anything, which is the line self-heal keeps
by mending a notch in its OWN leaf. Nothing here says the fruit is edible, and the card's
identification content stays the reference outdoors.

Frame 0 has the wheel SHUT and square on. At rest a plant is one plant, and a fruit left
fanned at the end of the loop would restart as ambient motion.

COLOUR: leaves at ~148 deg, in the gap between clover and plantain, at a lower saturation
than either so two neighbours in hue still separate on a second axis. The petals sit at
~330 and the fruit at ~95 - the petals are far outside the 34 deg either side of the
foliage that the set forbids, and the fruit is deliberately a DIFFERENT green from the
leaves, because a wheel the same colour as the head beside it stops being a separate organ.
Midtones stay under the saturation cap.

SAFETY: a portrait, never an identification aid, and never a claim about eating anything.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "G": (140, 197, 166, 255),   # leaf highlight
    "g": (98, 172, 133, 255),    # leaf mid
    "d": (67, 132, 97, 255),     # leaf deep
    "n": (45, 88, 65, 255),      # leaf shadow
    "P": (235, 194, 214, 255),   # petal, lit
    "p": (213, 144, 178, 255),   # petal, deep
    "V": (150, 64, 121, 255),    # the dark veins and the flower's eye
    "C": (154, 183, 133, 255),   # the cheese
    "K": (113, 145, 89, 255),    # the cheese, in shadow
    "b": (139, 158, 112, 255),   # trailing stem
    "B": (99, 116, 78, 255),     # stem shadow
}

# --- The leaf ----------------------------------------------------------------
#
# ELEVEN SHALLOW LOBES at amplitude 0.09. The rim has to be visibly crimped and never
# pointed: lobes deep enough to read as fingers make a geranium, which is the confusion the
# card's own field notes exist to head off.
# TWENTY-FIVE ACROSS, NOT TWENTY-ONE, AND THAT IS ABOUT THE FACE RATHER THAN THE LEAF. A
# 10x8 face inside a 21x15 organ leaves a rim two or three pixels wide, and the sheet came
# out as a cream oval with a green fringe — the leaf had stopped being visible at all. The
# face is the deck's shared size and does not shrink; the organ carrying it grows instead.
LEAF_W, LEAF_H = 25, 17


def _leaf(rx=10.8, ry=7.2, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        LEAF_W, LEAF_H, 12.0, 8.2, rx, ry, 11, 0.09, 5.4, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


LEAF = _leaf()
LEAF_LEFT = _leaf(face_dx=-1.4, light=(-0.35, -0.65))
LEAF_RIGHT = _leaf(face_dx=1.4, light=(-1.25, -0.65))

LEAF_AT = (3, 4)

L_DX, _ = face_shift(LEAF, LEAF_LEFT)
R_DX, _ = face_shift(LEAF, LEAF_RIGHT)

# --- The stems ---------------------------------------------------------------
#
# SHORT AND TWO OF THEM. Mallow trails from a taproot rather than standing; a tall pair
# would make this a hollyhock, which is a relative and not this plant.
STEMS = [
    "obbo obbo",
    "obbo obbo",
    "oBBo oBBo",
    "oooo oooo",
]

# Seated against the leaf's own underside rather than at a chosen height: a gap of two
# empty rows between a plant and its stems is the disconnection the audit exists to catch,
# and it is invisible while authoring because the parts are a list.
STEMS_AT = (11, 18)

# --- The flowers -------------------------------------------------------------
#
# FIVE NOTCHED PETALS WITH DARK VEINS, which is the whole of a mallow flower and the half
# of it a pixel can carry. The dark centre is the vein convergence, not a disc: painting it
# as a solid eye would make this a daisy.
# ROUNDED, NOT A BLOCK. `oPpPo` over `opVpo` over `oPpPo` is a filled square with a dot in
# it, and five pink squares in a row is what the first sheet rendered. Cutting the corners
# and letting the dark vein centre sit proud is the whole difference between a flower and a
# tile at this size.
# Solid petal pink with the vein centre as the only dark pixel. The first draft alternated
# P and p across the rows, which at five pixels is a checkerboard rather than a flower, and
# then shrinking it to four rows made it a dot. Round, five across, one dark middle.
FLOWER = [
    " ogo ",
    "oPPPo",
    "oPVPo",
    "oPPPo",
    " ooo ",
]

FLOWER_L_AT = (1, 9)
FLOWER_R_AT = (26, 9)

# --- The cheese --------------------------------------------------------------
#
# SEVEN ACROSS, which is wider than anything else hanging in this set, because the gesture
# is a thing coming apart and a five-pixel disc has no room to come apart INTO. Shut, it is
# a plain wheel with a hub.
# THE HUB IS A DOT, NOT A CROSS. Shading the centre as `oCCKCCo / oCKKKCo / oCCKCCo` puts a
# dark plus sign through the middle of the disc, and a green disc with a plus through it is
# a four-leaf clover — which is what the first sheet rendered, beside a plant that is not
# one. One pixel of hub keeps the wheel a wheel.
CHEESE = [
    "  ogo  ",
    " oCCCo ",
    "oCCCCCo",
    "oCCKCCo",
    "oCCCCCo",
    " oCCCo ",
    "  ooo  ",
]

# The seams show first. Nothing has moved yet — the wheel has merely announced that it is
# made of wedges, which is what makes the split legible when it comes two frames later.
CHEESE_SEAMED = [
    "  ogo  ",
    " oCKCo ",
    "oCCKCCo",
    "oCKKKCo",
    "oCCKCCo",
    " oCKCo ",
    "  ooo  ",
]

# ONE WEDGE OUT, AND THE WHEEL KEEPS THE NOTCH IT LEFT.
#
# THE FIRST DRAFT SEPARATED ALL SIX AT ONCE — `oC C Co` stacked five deep — and at seven
# pixels across that is not a fan, it is a barcode: the disc stops being a disc and becomes
# three vertical bars. A shape this small can only lose ONE piece and still read as the
# shape it was, so the wheel keeps its rim and its hub and a single wedge travels.
CHEESE_NOTCHED = [
    "  ogo  ",
    " oCC o ",
    "oCCC  o",
    "oCCK Co",
    "oCCCCCo",
    " oCCCo ",
    "  ooo  ",
]

CHEESE_AT = (20, 15)

# --- The wedge ---------------------------------------------------------------
#
# Its own part, defaulting to NOTHING, the same construction as the witch hazel seed. It
# comes away from the wheel and goes back into it; nothing is handed over and nothing is
# taken, which is the difference between a demonstration and an offer.
WEDGE_NONE = [" "]

WEDGE = [
    "oCo",
    "oKo",
]

WEDGE_AT = (24, 13)

# --- Growth stages -----------------------------------------------------------
#
#   sprout    one small leaf on one stem. A mallow seedling IS a single round leaf on a
#             stalk, which is the one stage of this plant most people have actually seen
#             and walked past.
#   growing   a fuller leaf, two stems, and the flowers arrive — mallow flowers freely long
#             before it sets much fruit.
#   flowering full leaf, flowers, and the cheese, which is the last thing to appear and the
#             only thing that can perform.

# SIZED AGAINST THIS PLANT'S OWN ADULT, not copied from another species' sprout. Mallow's
# adult is low and wide, so the 19x11 seedling that suits a shrub stood at 71% of it — the
# stage audit wants 60%. The organ is redrawn smaller rather than the art being scaled:
# resampling pixel art is the one thing this whole pipeline exists to avoid.
YOUNG_W, YOUNG_H = 13, 9


def _young(rx=5.6, ry=3.8, light=(-0.85, -0.65)):
    return flower_head(
        YOUNG_W, YOUNG_H, 6.0, 4.2, rx, ry, 11, 0.09, 5.2, 2.9,
        face_dy=0.5, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG = _young()
YOUNG_AT = (9, 14)

YOUNG_STEM = [
    "obbo",
    "oBBo",
    "oooo",
]

MID_W, MID_H = 19, 13


def _mid(rx=8.2, ry=5.6, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        MID_W, MID_H, 9.0, 6.4, rx, ry, 11, 0.09, 5.2, 3.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID = _mid()
MID_LEFT = _mid(face_dx=-1.2, light=(-0.35, -0.65))
MID_RIGHT = _mid(face_dx=1.2, light=(-1.25, -0.65))

MID_AT = (6, 8)

G_L_DX, _ = face_shift(MID, MID_LEFT)
G_R_DX, _ = face_shift(MID, MID_RIGHT)

MID_STEMS = [
    "obbo obbo",
    "oBBo oBBo",
    "oooo oooo",
]

S_BOB = [0, 0, -1, -1, 0, 0, 0, 0]
S_EYES = [None, None, "half", "half", None, None, "blink", None]

G_BOB = [0, 0, 1, -1, -1, -1, 0, 0, 0, 0]
G_HEAD = [None, None, None, "right", "right", "left", None, None, None, None]
G_DX = [0, 0, 0, G_R_DX, G_R_DX, G_L_DX, 0, 0, 0, 0]
G_EYES = [None, None, "half", None, None, None, None, "blink", None, None]


SPRITE = {
    "herbId": "malva-neglecta",
    "personality": "obliging",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(7, "sprout"),
            "hide": ["flowerL", "flowerR", "cheese", "wedge", "cheeks"],
            "swap": {
                "leaf": YOUNG,
                "stems": YOUNG_STEM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "leaf": YOUNG_AT,
                "stems": (14, 22),
                **seat_young(YOUNG_AT, YOUNG, cheeks=False, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "leaf": {"dy": S_BOB},
                "eyes": {"dy": S_BOB, "art": S_EYES},
                "mouth": {"dy": S_BOB},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(7, "growing"),
            "hide": ["cheese", "wedge"],
            "swap": {
                "leaf": MID,
                "stems": MID_STEMS,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": young_cheeks(face_box(MID)[2]),
            },
            "variants": {
                "leaf": {"left": MID_LEFT, "right": MID_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "leaf": MID_AT,
                "stems": (11, 19),
                # Seated against the SMALLER growing leaf, not the adult's. Carried over
                # from the adult's origins the pair sat clear of it and the stage rendered
                # as three pieces — a plant and two floating flowers.
                "flowerL": (4, 11),
                "flowerR": (23, 11),
                **seat_young(MID_AT, MID, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "leaf": {"dy": G_BOB, "art": G_HEAD},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_EYES},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "flowerL": {"dy": G_BOB},
                "flowerR": {"dy": G_BOB},
            },
        },
    },
    "size": (32, 28),
    "frames": 12,
    "fps": 7,
    # Stems and cheese behind, leaf over them so the stalks emerge from under it.
    "parts": [
        {"name": "stems", "origin": STEMS_AT, "rows": STEMS},
        {
            "name": "cheese",
            "origin": CHEESE_AT,
            "rows": CHEESE,
            "variants": {"seamed": CHEESE_SEAMED, "notched": CHEESE_NOTCHED},
        },
        {
            "name": "leaf",
            "origin": LEAF_AT,
            "rows": LEAF,
            "variants": {"left": LEAF_LEFT, "right": LEAF_RIGHT},
        },
        {"name": "flowerL", "origin": FLOWER_L_AT, "rows": FLOWER},
        {"name": "flowerR", "origin": FLOWER_R_AT, "rows": FLOWER},
        {
            "name": "wedge",
            "origin": WEDGE_AT,
            "rows": WEDGE_NONE,
            "variants": {"a": WEDGE},
        },
        *feature_parts(LEAF_AT, LEAF, eyes="round", mouth="small", eye_dy=1, mouth_dy=4),
    ],
    #
    #  0    1     2      3     4     5     6     7      8     9    10   11
    # rest rest  turn  seams  open  open  open  close  rest  rest blink rest
    #
    # THE WHEEL. The head turns toward the fruit on frame 2 — it is showing you something,
    # so it has to look at it first — the seams appear on 3, the wedges separate over 4-6
    # and close on 7. The head comes back level on 8 and stays there: the demonstration is
    # over and the plant has no further comment, which is the whole of "obliging".
    #
    # The wheel LIFTS a pixel while it is open. A split disc that stays put reads as a
    # texture change on the same object; a split disc that rises reads as a thing being
    # held up, which is what turns a fruit into a demonstration.
    "motion": {
        "leaf": {
            "art": [None, None, "right", "right", "right", "right", "right", "right",
                    None, None, None, None],
            "dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheese": {
            "art": [None, None, None, "seamed", "notched", "notched", "notched", "seamed",
                    None, None, None, None],
        },
        # Out, held, and back in. It never leaves the canvas, unlike the witch hazel seed:
        # that one is thrown and this one is put back, and the loop has to say so.
        "wedge": {
            "art": [None, None, None, None, "a", "a", "a", None, None, None, None, None],
            "dy": [0, 0, 0, 0, -2, -3, -2, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 0, 1, 2, 1, 0, 0, 0, 0, 0],
        },
        # The eyes travel with the turned face and come back with it. No independent lift:
        # the fruit is beside the creature, not above it, so there is nothing to look up at.
        "eyes": {
            "art": [None, None, "half", None, None, None, None, None, None, None,
                    "blink", None],
            "dx": [0, 0, R_DX, R_DX, R_DX, R_DX, R_DX, R_DX, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, R_DX, R_DX, R_DX, R_DX, R_DX, R_DX, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, "wide", "wide", "wide", None, None, None,
                    None, None],
            "dx": [0, 0, R_DX, R_DX, R_DX, R_DX, R_DX, R_DX, 0, 0, 0, 0],
        },
        # The flowers ride the plant and do nothing. They are the identity, not the act.
        "flowerL": {"dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
        "flowerR": {"dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
