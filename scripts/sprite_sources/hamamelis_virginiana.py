"""Witch Hazel (Hamamelis virginiana) - creature portrait sprite.

THE DESIGN HOOK is a catapult. The woody capsules dry, tension builds in the walls, and
they split and fling their seeds hard enough to clear several metres - the plant's own
common epithet in some places is "snapping hazel" because of it. Nothing else in this set
throws anything. Ragweed sneezes and dandelion lets go; those are releases. This one is a
mechanism under load.

A SHRUB, NOT A FLOWER, so the face-bearing organ is the canopy and it is a `flower_head`
with seven shallow lobes - at 25 pixels across that reads as a bush with a bumpy edge
rather than a disc. Under it, THREE stems from one base, which is what tells a witch hazel
from a small tree, and the ribbon flowers hang either side.

THE RIBBONS ARE THE OTHER HALF OF THE IDENTITY and they are drawn as four splayed strands
rather than as petals. Hamamelis opens in autumn, on twigs that are losing or have lost
their leaves, with four crumpled yellow straps per flower - the reason the card's season is
autumn and the reason a yellow-flowered shrub in October is almost certainly this. Solid
blobs of yellow read as forsythia; strands read as witch hazel.

WHERE THE FACE GOES: in the canopy, carved out of the generator itself, never a patch hung
on the front of one.

PERSONALITY: deadpan. Its trademark gesture is THE SNAP - a capsule draws tight, fires its
seed clean off the canvas, the whole shrub rocks with the recoil, and then the creature
looks straight ahead as though nothing had happened. The comedy is entirely in the last
two frames: the plant does something violent and declines to acknowledge it.

THIS ILLUSTRATES A MECHANISM AND NOT AN EFFECT. The same card prints skin care, astringent,
anti-inflammatory and anorectal relief under healing traits, and not one of them appears
here in any form. A gesture may show what a plant DOES; it may never show it treating
anything - the line self-heal keeps by mending a notch in its OWN leaf. The seed is the
plant's own and hits nobody: it leaves the canvas upward and to the side, and the frames
that follow are the shrub, not its target.

Frame 0 has NO seed in the air and both capsules shut. A gesture may fling things loose and
this one exists to, but at rest a plant is one plant, and a seed parked mid-flight at the
end of the loop would restart as ambient motion.

COLOUR: leaves at ~107 deg, in the gap between broadleaf dock and stinging nettle, taking a
lower saturation than either so neighbours in hue still separate on a second axis. The
ribbons sit at ~52 and the twigs at ~26 - the ribbons are 55 deg off the foliage, well
clear of the 34 deg either side of its own flower that the set forbids, which matters more
here than usual because a yellow-green witch hazel would be one warm smudge. Midtones stay
under the saturation cap.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits apart
from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts
from _flowerhead import flower_head
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks

PALETTE = {
    **FACE_PALETTE,
    "G": (157, 201, 146, 255),   # leaf highlight
    "g": (119, 177, 104, 255),   # leaf mid
    "d": (82, 137, 67, 255),     # leaf deep
    "n": (56, 92, 46, 255),      # leaf shadow
    "Y": (239, 224, 128, 255),   # ribbon petal, lit
    "y": (224, 202, 62, 255),    # ribbon petal, deep
    "b": (173, 127, 92, 255),    # woody stem
    "B": (119, 88, 64, 255),     # stem shadow
    "C": (206, 198, 178, 255),   # capsule — bone, deliberately cooler than the stems
    "K": (152, 143, 124, 255),   # capsule shadow
    "S": (60, 41, 32, 255),      # the seed
}

# --- The canopy --------------------------------------------------------------
#
# SEVEN SHALLOW LOBES, same reasoning as spicebush: deep lobes make petals and this is not
# a flower. The face is carved out of the generator rather than laid over it.
CANOPY_W, CANOPY_H = 25, 17


def _canopy(rx=10.5, ry=7.0, face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        CANOPY_W, CANOPY_H, 12.0, 8.0, rx, ry, 7, 0.14, 5.4, 4.2,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


CANOPY = _canopy()
CANOPY_LEFT = _canopy(face_dx=-1.5, light=(-0.35, -0.65))
CANOPY_RIGHT = _canopy(face_dx=1.5, light=(-1.25, -0.65))
# The brace before the shot, and the flinch after it. Both are the same shape at different
# widths, because a recoil that changed the canopy's outline would read as a second gesture.
CANOPY_TIGHT = _canopy(rx=10.0, ry=6.6)

CANOPY_AT = (3, 3)

L_DX, _ = face_shift(CANOPY, CANOPY_LEFT)
R_DX, _ = face_shift(CANOPY, CANOPY_RIGHT)

# --- The stems ---------------------------------------------------------------
#
# THREE FROM ONE BASE. Multi-stemmed is the one structural fact about this shrub a
# silhouette can carry, and it is what separates it from a young tree.
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

# --- The ribbons -------------------------------------------------------------
#
# FOUR STRANDS, SPLAYED, on a stalk that REACHES THE CANOPY. Four is the flower's own
# count. The strands are deliberately not symmetrical about the stalk: a witch hazel
# flower is crumpled, and a tidy cross reads as a snowflake.
# THE FIRST DRAFT WAS A LADDER. `oYoYo` over `oyYyo` over `oYoYo` puts an outline column
# down the middle of the flower, and at five pixels across that is not a spider of straps —
# it is a capital H in yellow, which is what the sheet rendered. Strands have to be SEPARATED
# BY EMPTY SPACE rather than by outline, so the eye reads four things radiating from a point
# instead of one thing with a hole in it.
RIBBON = [
    " ogo ",
    "Y Y Y",
    " oyo ",
    "Y Y Y",
    "  Y  ",
]

# Blown to one side. The straps are the lightest thing on the shrub, so they are the last
# to settle and they travel further than anything else — which is what sells a recoil that
# the woody parts can only hint at.
RIBBON_SWEPT = [
    " ogo ",
    "   YY",
    " oyYY",
    "   YY",
    "   Y ",
]

# Pulled in tight against the twig on the brace, one frame before the shot.
RIBBON_TIGHT = [
    " ogo ",
    "  Y  ",
    " oyo ",
    "  Y  ",
    "     ",
]

# At the canopy's shoulders, where the flowers actually open — on the twigs, level with the
# leaves. Hung below with the capsules they competed with them and the whole lower half of
# the sprite became a row of small brown-and-yellow lumps.
RIBBON_L_AT = (3, 6)
RIBBON_R_AT = (25, 6)

# --- The capsules ------------------------------------------------------------
#
# TWO, AND ONLY THE RIGHT ONE FIRES. A pair going off together would read as the shrub
# doing something deliberate with both hands; one of them going while the other sits shut
# is a mechanism, which is what this is. Each hangs on a stalk that reaches the canopy, so
# frame 0 is one connected piece.
CAPSULE = [
    " ogo ",
    "oCCCo",
    "oCKCo",
    " oKo ",
    "  o  ",
]

# Drawn tight: the walls have dried and are pulling against themselves.
CAPSULE_TENSE = [
    " ogo ",
    " oCo ",
    " oCo ",
    " oKo ",
    "  o  ",
]

# Split. The two valves have sprung apart and there is nothing between them any more.
# Two valves sprung apart with nothing between them. Rows stay the same width as the shut
# capsule: a variant one character wider shifts the whole part left on the frames it plays.
CAPSULE_OPEN = [
    " ogo ",
    "C o C",
    "K o K",
    " o o ",
    "  o  ",
]

# HANGING UNDER THE CANOPY, not standing beside the stems. At stem level the capsules and
# the trunks were the same warm brown at the same height and read as clods of earth at the
# base of the plant; up here they are clearly suspended from the shrub, which is what a
# capsule on a stalk is.
CAPSULE_L_AT = (6, 15)
CAPSULE_R_AT = (22, 15)

# --- The seed ----------------------------------------------------------------
#
# Its own part, defaulting to NOTHING, the same trick spicebush's scent uses. It leaves
# upward and to the right and is gone by the end of the loop.
SEED_NONE = [" "]

SEED = [
    "oSo",
    "oSo",
]

SEED_AT = (22, 14)

# --- Growth stages -----------------------------------------------------------
#
#   sprout    one small canopy on a single stem, no flowers and no capsules. A seedling
#             witch hazel is a twig with leaves on it; it has nothing to throw and takes
#             years to reach flowering size, so this stage having neither is the truth
#             rather than a simplification.
#   growing   a fuller canopy, two stems, and the ribbons arrive - a shrub flowers before
#             it sets much fruit, so the flowers are what a half-grown one gains.
#   flowering full canopy, three stems, ribbons, two capsules, and the snap.

YOUNG_W, YOUNG_H = 19, 11


def _young(rx=8.0, ry=4.8, light=(-0.85, -0.65)):
    return flower_head(
        YOUNG_W, YOUNG_H, 9.0, 5.4, rx, ry, 7, 0.14, 5.6, 3.4,
        face_dy=0.7, light=light, trim_tail=False, chars="GgdnFo",
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

# The young loops. A seedling looks about; a half-grown shrub sways with its new flowers.
# The snap stays with the adult, because whatever a species does that nothing else does is
# what mastery should buy a player.
S_BOB = [0, 0, -1, -1, 0, 0, 0, 0]
S_EYES = [None, None, "half", "half", None, None, "blink", None]

G_BOB = [0, 0, 1, -1, -1, -1, 0, 0, 0, 0]
G_HEAD = [None, None, None, "right", "right", "left", None, None, None, None]
G_DX = [0, 0, 0, G_R_DX, G_R_DX, G_L_DX, 0, 0, 0, 0]
G_EYES = [None, None, "half", None, None, None, None, "blink", None, None]


SPRITE = {
    "herbId": "hamamelis-virginiana",
    "personality": "deadpan",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            "hide": ["ribbonL", "ribbonR", "capsuleL", "capsuleR", "seed", "cheeks"],
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
            "hide": ["capsuleL", "capsuleR", "seed"],
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
                "ribbonL": (4, 8),
                "ribbonR": (22, 8),
                **seat_young(MID_AT, MID, eye_dy=1, mouth_dy=4),
            },
            "motion": {
                "canopy": {"dy": G_BOB, "art": G_HEAD},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_EYES},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "ribbonL": {"dy": G_BOB},
                "ribbonR": {"dy": G_BOB},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    # Stems and capsules behind, canopy over them so the stalks emerge from the leaves,
    # and the seed last of all because it passes in front of everything on its way out.
    "parts": [
        {"name": "stems", "origin": STEMS_AT, "rows": STEMS},
        {
            "name": "capsuleL",
            "origin": CAPSULE_L_AT,
            "rows": CAPSULE,
            "variants": {"tense": CAPSULE_TENSE, "open": CAPSULE_OPEN},
        },
        {
            "name": "capsuleR",
            "origin": CAPSULE_R_AT,
            "rows": CAPSULE,
            "variants": {"tense": CAPSULE_TENSE, "open": CAPSULE_OPEN},
        },
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
            "name": "ribbonL",
            "origin": RIBBON_L_AT,
            "rows": RIBBON,
            "variants": {"swept": RIBBON_SWEPT, "tight": RIBBON_TIGHT},
        },
        {
            "name": "ribbonR",
            "origin": RIBBON_R_AT,
            "rows": RIBBON,
            "variants": {"swept": RIBBON_SWEPT, "tight": RIBBON_TIGHT},
        },
        {
            "name": "seed",
            "origin": SEED_AT,
            "rows": SEED_NONE,
            "variants": {"a": SEED},
        },
        *feature_parts(CANOPY_AT, CANOPY, eyes="round", mouth="smile", eye_dy=1, mouth_dy=4),
    ],
    #
    #  0    1     2      3     4     5      6      7      8       9      10    11   12    13
    # rest rest  brace  SNAP  fly   fly   gone  recoil settle  deadpan deadpan rest blink rest
    #
    # THE SNAP. The right capsule draws tight on frame 2 and splits on 3; the seed is
    # already clear of it on 3 and off the canvas by 6, travelling up and to the right
    # rather than straight up, because a catapult throws on an arc and a vertical line
    # reads as something rising under its own power.
    #
    # The recoil arrives ONE FRAME LATE, on 7, and that delay is the whole joke: the shrub
    # does not flinch as it fires, it flinches afterwards. Then frames 9-10 hold a flat
    # mouth and level eyes - not a grin, which would be spicebush being pleased with
    # itself. This one denies everything.
    "motion": {
        # THE SHRUB LEANS LEFT AS THE SEED GOES RIGHT, and that is the whole of the recoil.
        # The first pass moved the canopy one pixel down and back; a catapult that fires
        # something off the canvas and rocks by one pixel reads as a plant with a twitch.
        # Two pixels of lift, a pixel of lean AGAINST the shot, and a second smaller
        # rebound — Newton drawn at sprite scale.
        "canopy": {
            "art": [None, None, "tight", "tight", None, None, None, "tight", None, None,
                    None, None, None, None],
            "dy": [0, 0, 2, -2, -1, 0, 0, 2, -1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, -2, -2, -1, 0, -1, 0, 0, 0, 0, 0, 0],
        },
        "capsuleR": {
            "art": [None, None, "tense", "open", "open", "open", "open", "open", None,
                    None, None, None, None, None],
            "dy": [0, 0, 2, -1, 0, 0, 0, 2, -1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, -1, -1, 0, 0, -1, 0, 0, 0, 0, 0, 0],
        },
        # Further and faster. It clears the frame by 6 rather than drifting off it, and the
        # horizontal travel accelerates — a thrown thing does not move at a constant rate.
        "seed": {
            "art": [None, None, None, "a", "a", "a", "a", None, None, None,
                    None, None, None, None],
            "dy": [0, 0, 0, -3, -9, -15, -21, 0, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 0, 2, 5, 9, 13, 0, 0, 0, 0, 0, 0, 0],
        },
        # The eyes widen on the shot and are level again by the time anyone looks. They do
        # NOT track the seed: a creature watching its own projectile is a creature taking
        # responsibility for it, and this one does not.
        "eyes": {
            "art": [None, None, "half", "wide", "wide", None, None, None, None,
                    None, None, None, "blink", None],
            "dy": [0, 0, 2, -2, -1, 0, 0, 2, -1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, -2, -2, -1, 0, -1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dy": [0, 0, 2, -2, -1, 0, 0, 2, -1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, -2, -2, -1, 0, -1, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, "flat", "flat", "flat", None, None, None, None,
                    "flat", "flat", None, None, None],
            "dy": [0, 0, 2, -2, -1, 0, 0, 2, -1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, -2, -2, -1, 0, -1, 0, 0, 0, 0, 0, 0],
        },
        # THE STRAPS ARE THE LOUDEST THING IN THE LOOP, because they are the only part light
        # enough to be thrown about by it. They pull in tight on the brace, blow sideways for
        # four frames, and are still settling two frames after the woody parts have stopped.
        "ribbonL": {
            "art": [None, None, "tight", "swept", "swept", "swept", "swept", "swept",
                    "swept", None, None, None, None, None],
            "dy": [0, 0, 2, -2, -2, -1, -1, 1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, -3, -3, -2, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "ribbonR": {
            "art": [None, None, "tight", "swept", "swept", "swept", "swept", "swept",
                    "swept", None, None, None, None, None],
            "dy": [0, 0, 2, -2, -2, -1, -1, 1, 0, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, -3, -3, -2, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        # The shut capsule swings a beat behind everything else — the movement reaches it
        # through the twig rather than happening to it.
        "capsuleL": {
            "dy": [0, 0, 1, 2, -2, -1, 0, 1, 1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, 0, -2, -2, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        # And the trunks barely move at all. A woody shrub is anchored; if the stems swung
        # with the canopy the whole plant would read as a flag rather than a catapult.
        "stems": {
            "dx": [0, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
    },
    "palette": PALETTE,
}
