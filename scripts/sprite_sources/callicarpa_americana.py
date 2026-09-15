"""Beautyberry (Callicarpa americana) - creature portrait sprite.

THE DESIGN HOOK is where the fruit sits. Almost everything that fruits in this deck hangs
its berries at a branch tip or dangles them on a stalk; beautyberry wraps them in tight
RINGS CLASPED AROUND THE STEM at each leaf node, and that is the one thing about this shrub
a 32-pixel silhouette can carry. The card's own field notes lead on it. So the berries are
not drupes hung beside the plant - they are collars threaded onto it, and the stem runs
visibly through each one.

A SHRUB, NOT A FLOWER. The face-bearing organ is the canopy, a `flower_head` with seven
shallow lobes at low amplitude - a rounded mass with a bumpy edge, which at this size reads
as a bush rather than a disc. The face is carved out of the generator, never a patch laid
over one. Same composition spicebush uses, for the same reason: both are woody, and a
woody plant with a daisy for a head is a daisy.

GREEN ABOVE, PURPLE BELOW, WHICH IS WHAT THE CARD SHOWS. The front artwork carries unripe
green clusters high on the stem and ripe violet ones lower down, because that is the order
a beautyberry ripens in. Frame 0 keeps it: the top ring is green, the two below are violet.
That is a real state of a real plant on a real day, not a composite.

PERSONALITY: lustrous. Its trademark gesture is THE GLINT - beautyberry fruit is glossy to
the point of looking lacquered, and a highlight runs UP the stacked rings one at a time,
bottom to top. The creature follows it up, catches it at the top, and preens: eyes half
shut, small pleased mouth. Nothing else in the set has a travelling highlight, and nothing
else admires itself for a colour.

THE GESTURE IS LOOP-SAFE BY CONSTRUCTION. The glint is its own part defaulting to NOTHING,
so it arrives and leaves and frame 0 is untouched - the ripening itself never advances. A
gesture that actually ripened the top ring would end somewhere frame 0 is not, and the loop
would play it backwards on the next pass as un-ripening.

THIS ILLUSTRATES AN APPEARANCE AND NOT AN EFFECT. The same card prints skin care, insect
repellent, antibacterial and fever aid under healing traits, and not one of them appears
here in any form - no swatting, no mosquito, no glow of health. A gesture may show what a
plant LOOKS like; it may never show it doing something to anybody. The shine is the plant's
own and reaches nobody.

COLOUR: leaves at ~118 deg, taking a higher saturation and lower lightness than its
neighbours in that band so no two separate on hue alone. The fruit sits at ~296 - far
outside the 34 deg either side of its own foliage the set forbids, which is the whole point
of a plant known for violet berries on green leaves. Unripe fruit at ~86 stays close enough
to the leaves to read as not-yet-ripe rather than as a second flower. Midtones stay under
the saturation cap; the fruit highlight is the brightest thing here and is one pixel wide.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits apart
from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "G": (150, 199, 141, 255),   # leaf highlight
    "g": (108, 169, 102, 255),   # leaf mid
    "d": (70, 124, 69, 255),     # leaf deep
    "n": (46, 84, 48, 255),      # leaf shadow
    "P": (206, 116, 214, 255),   # ripe fruit highlight
    "p": (168, 62, 184, 255),    # ripe fruit mid
    "u": (116, 38, 132, 255),    # ripe fruit deep
    "V": (176, 197, 120, 255),   # unripe fruit highlight
    "v": (138, 162, 84, 255),    # unripe fruit mid
    "b": (140, 108, 78, 255),    # woody stem
    "B": (92, 69, 52, 255),      # stem shadow
    "K": (247, 233, 252, 255),   # the glint running up the fruit
}

# --- The canopy --------------------------------------------------------------
#
# SEVEN SHALLOW LOBES at 0.13: the rim is merely uneven, which at 25 across is a bush.
CANOPY_W, CANOPY_H = 25, 17


def _canopy(rx=10.5, ry=7.0, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        CANOPY_W, CANOPY_H, 12.0, 8.0, rx, ry, 7, 0.13, 5.4, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


CANOPY = _canopy()
CANOPY_LEFT = _canopy(face_dx=-1.5, light=(-0.35, -0.65))
CANOPY_RIGHT = _canopy(face_dx=1.5, light=(-1.25, -0.65))

CANOPY_AT = (3, 2)

L_DX, _ = face_shift(CANOPY, CANOPY_LEFT)
R_DX, _ = face_shift(CANOPY, CANOPY_RIGHT)

# --- The stem ----------------------------------------------------------------
#
# ONE trunk, running from under the canopy to the ground, and the rings thread ONTO it.
# It has to be continuous behind them or the collars become floating bracelets - frame 0
# is flood-filled by the audit and a gap there fails.
STEM = [
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "oBBo",
    "oooo",
]

STEM_AT = (14, 16)

# --- The fruit rings ---------------------------------------------------------
#
# A COLLAR, NOT A BUNCH. The stem shows through the middle of each row, which is what makes
# these read as clasping the stem rather than hanging beside it. Wider than the stem on both
# sides and only three rows tall, so three of them stack inside the canopy's shadow.
RING_RIPE = [
    "opppppo",
    "pPupuPp",
    "oupppuo",
]

RING_UNRIPE = [
    "ovvvvvo",
    "vVvvvVv",
    "ovvvvvo",
]

# Lit: one pixel of near-white on the shoulder of the ring the glint is passing.
RING_RIPE_LIT = [
    "opppppo",
    "pKupuPp",
    "oupppuo",
]

RING_UNRIPE_LIT = [
    "ovvvvvo",
    "vKvvvVv",
    "ovvvvvo",
]

RING_TOP_AT = (12, 16)
RING_MID_AT = (12, 20)
RING_LOW_AT = (12, 24)

# --- Growth stages -----------------------------------------------------------
#
#   sprout    a small canopy on a short stem, NO fruit. A beautyberry seedling is a leafy
#             twig; fruit is years away and is the last thing to arrive.
#   growing   a fuller canopy, a longer stem, ONE ripe ring. The rings arrive one at a
#             time, so the stack itself is what mastery buys.
#   flowering full canopy, three rings, and the glint running up them.

YOUNG_W, YOUNG_H = 19, 11


def _young(rx=8.0, ry=4.8, light=(-0.85, -0.65)):
    return flower_head(
        YOUNG_W, YOUNG_H, 9.0, 5.4, rx, ry, 7, 0.13, 5.6, 3.4,
        face_dy=0.7, light=light, trim_tail=False, chars="GgdnFo",
    )


YOUNG = _young()
YOUNG_AT = (6, 10)

YOUNG_STEM = [
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "oBBo",
    "oooo",
]

MID_W, MID_H = 21, 15


def _mid(rx=9.0, ry=6.2, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        MID_W, MID_H, 10.0, 7.0, rx, ry, 7, 0.13, 5.4, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


MID = _mid()
MID_LEFT = _mid(face_dx=-1.3, light=(-0.35, -0.65))
MID_RIGHT = _mid(face_dx=1.3, light=(-1.25, -0.65))

MID_AT = (5, 4)

G_L_DX, _ = face_shift(MID, MID_LEFT)
G_R_DX, _ = face_shift(MID, MID_RIGHT)

MID_STEM = [
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "obbo",
    "oBBo",
    "oooo",
]

S_BOB = [0, 0, -1, -1, 0, 0, 0, 0]
S_EYES = [None, None, "half", "half", None, None, "blink", None]

G_BOB = [0, 0, 1, -1, -1, -1, 0, 0, 0, 0]
G_HEAD = [None, None, None, "right", "right", "left", None, None, None, None]
G_DX = [0, 0, 0, G_R_DX, G_R_DX, G_L_DX, 0, 0, 0, 0]
G_EYES = [None, None, "half", None, None, None, None, "blink", None, None]


SPRITE = {
    "herbId": "callicarpa-americana",
    "personality": "lustrous",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "hide": ["ringLow", "ringMid", "ringTop", "cheeks"],
            "swap": {
                "canopy": YOUNG,
                "stem": YOUNG_STEM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "eyes": {"blink": YOUNG_EYES["blink"], "half": YOUNG_EYES["half"]},
            },
            "origins": {
                "canopy": YOUNG_AT,
                "stem": (14, 18),
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
            "hide": ["ringMid", "ringTop"],
            "swap": {
                "canopy": MID,
                "stem": MID_STEM,
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
                "stem": (14, 16),
                "ringLow": (12, 21),
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
    # Stem first so the rings thread over it; the canopy last of the body so the stem
    # emerges from the leaves. Features last of all - nothing here crosses the face, which
    # is the ordering bug the cattail's falling pollen taught this set.
    "parts": [
        {"name": "stem", "origin": STEM_AT, "rows": STEM},
        {
            "name": "ringLow",
            "origin": RING_LOW_AT,
            "rows": RING_RIPE,
            "variants": {"lit": RING_RIPE_LIT},
        },
        {
            "name": "ringMid",
            "origin": RING_MID_AT,
            "rows": RING_RIPE,
            "variants": {"lit": RING_RIPE_LIT},
        },
        {
            "name": "ringTop",
            "origin": RING_TOP_AT,
            "rows": RING_UNRIPE,
            "variants": {"lit": RING_UNRIPE_LIT},
        },
        {"name": "canopy", "origin": CANOPY_AT, "rows": CANOPY,
         "variants": {"left": CANOPY_LEFT, "right": CANOPY_RIGHT}},
        *feature_parts(CANOPY_AT, CANOPY, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
    ],
    #
    #  0    1     2      3     4     5      6      7      8      9     10    11   12    13
    # rest rest  look   low   low    mid    mid    top    top   preen preen rest blink rest
    #
    # THE GLINT. It lights one ring at a time from the bottom up over frames 3-8, and the
    # eyes track it: down first (frame 2, looking at its own feet), then back up with it.
    # By 9 the highlight is gone and the creature is pleased with itself - eyes half, mouth
    # grinning - and by 11 it has let it go. Nothing is left lit at the end of the loop.
    "motion": {
        "canopy": {
            "dy": [0, 0, 1, 1, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0],
        },
        "ringLow": {
            "art": [None, None, None, "lit", "lit", None, None, None, None, None,
                    None, None, None, None],
        },
        "ringMid": {
            "art": [None, None, None, None, None, "lit", "lit", None, None, None,
                    None, None, None, None],
        },
        "ringTop": {
            "art": [None, None, None, None, None, None, None, "lit", "lit", None,
                    None, None, None, None],
        },
        # The eyes carry a dip the rest of the face does not: that difference IS the look
        # down at its own stem, and then the climb back up after the glint.
        "eyes": {
            "art": [None, None, "half", None, None, None, None, None, None,
                    "half", "half", None, "blink", None],
            "dy": [0, 0, 2, 2, 1, 1, 0, -1, -1, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dy": [0, 0, 1, 1, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, None, None, None, None, None,
                    "grin", "grin", None, None, None],
            "dy": [0, 0, 1, 1, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0],
        },
    },
    "palette": PALETTE,
}
