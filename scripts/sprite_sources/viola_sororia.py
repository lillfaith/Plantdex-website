"""Wild Violet (Viola sororia) - creature portrait sprite.

THE DESIGN HOOK: "shrinking violet" is one of the oldest character descriptions in the
language, and unusually for folk botany it matches the plant - violets flower low, under
their own heart-shaped leaves, and are easy to walk past. They also cheat: alongside the
showy purple flowers they produce cleistogamous ones that never open at all and set seed
in private, which is a plant being shy on purpose.

WHERE THE FACE GOES: in the flower, low in frame, with a heart-shaped leaf beside it big
enough to hide behind.

PERSONALITY: bashful. Its trademark gesture is THE PEEK - it ducks fully behind its own
leaf, waits, and comes back out one eye at a time. It is the only sprite that leaves the
frame it is standing in.

Deliberately not the wood sorrel's fold, though both disappear: sorrel closes on a
schedule the sun sets and never looks at you, while this one is hiding FROM you and
checks whether you are still there. One is botany, the other is stage direction.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, face_box, face_shift, feature_parts, on_face
from _stages import YOUNG_EYES, YOUNG_MOUTH, seat_young, stage_fps, young_cheeks
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "V": (204, 177, 249, 255),   # petal highlight
    "v": (135, 89, 223, 255),   # petal mid
    "q": (87, 45, 183, 255),    # petal deep
    "Q": (59, 29, 125, 255),     # petal shadow
    "Y": (232, 214, 133, 255),   # the pale throat every violet has
    "G": (60, 218, 95, 255),   # leaf highlight
    "g": (44, 165, 79, 255),    # leaf mid
    "d": (31, 113, 61, 255),     # leaf deep
    "n": (33, 99, 60, 255),      # leaf shadow
}

HEAD_W, HEAD_H = 17, 15


def _head(face_dx=0.0, light=(-0.85, -0.65)):
    # Five lobes: a violet has five petals, two up and three down, and five is the count
    # the eye actually checks when it decides what it is looking at.
    return flower_head(
        HEAD_W, HEAD_H, 8.0, 7.0, 7.6, 6.8, 5, 0.18, 4.8, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars="VvqQFo",
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.4, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.4, light=(-1.25, -0.65))

# The pale throat, which every violet carries and which stops the flower reading as a
# flat purple disc.
THROAT = [
    " Y Y ",
    "  Y  ",
]

# The heart-shaped leaf it hides behind. Big enough to cover the whole flower, because a
# hiding place that leaves the head showing is not a hiding place.
SHIELD = [
    "  ooo   ooo  ",
    " oGGGGoGGGGo ",
    "oGGGGGGGGGGGo",
    "oGGGgggggGGGo",
    "oGgggggggggdo",
    "ogggggdddddno",
    " oggdddddnno",
    "  oddddnnno",
    "   oddnno",
    "    ono",
]

# The second leaf, which stays put - one leaf hides, one holds the plant up.
LEAF = [
    " ooo ooo",
    "oGGGoGGGo",
    "oGGgggGGo",
    " oggdddo",
    "  oddno",
    "   oo",
]

STEM = [
    "odgo",
    "odgo",
    "odgo",
    "odgo",
    " oo ",
]

HEAD_AT = (8, 6)

# --- Growth stages -----------------------------------------------------------
#
# THE SAME BASHFUL VIOLET, YOUNGER — and this is the one species where being shy at every
# stage is the whole character rather than a stage effect. Its trademark is hiding its
# whole face behind a leaf, and that stays with the open flower: a younger violet has not
# got the nerve to make the joke yet, so it only half-ducks.
#
# THE BOTANY DECIDES WHAT IS DRAWN, and violet is the awkward case: the adult wears its
# FACE ON THE FLOWER. A seedling has no flower, so the face has to move onto the plant it
# does have — the heart-shaped leaf, which is the identifying trait anyway.
#
#   sprout    heart leaves only, no flower. The face rides on a leaf, notched at the top
#             the way a violet leaf is, so the stage still says "violet" without one.
#   growing   in bud: a violet's bud NODS — it hangs closed and downturned on a hooked
#             stalk, which is one of the most recognisable things the plant does. Green,
#             with the purple only just showing at the tip.
#   flowering the open five-petalled flower with its pale throat, unchanged.

BUD_PALETTE = {
    "K": (150, 206, 130, 255),   # bud highlight
    "k": (104, 160, 96, 255),    # bud mid
    "j": (70, 116, 72, 255),     # bud deep
    "J": (48, 82, 54, 255),      # bud shadow
}

# --- Sprout: a heart leaf wearing the face ----------------------------------
#
# HAND-DRAWN rather than generated. `flower_head` makes rounded organs, and a violet leaf
# is not round — it is broad at the shoulders, blunt at the tip and NOTCHED at the base
# where its stalk joins. That notch is the whole identification, and a generated ellipse
# has nowhere to put it. Drawn as a circle with a face in it, this stage read as a green
# blob and said nothing about which plant it was.
#
# The face is a plain `F` patch inside the grid. `_face.face_box` measures it the same way
# it measures a generated head, so seating the features is unchanged.
LEAF_HEAD_AT = (6, 13)

# Wider than the face needs, deliberately. The narrow version left the leaf as a thin
# green rim and read as a face with a border rather than a face ON a leaf — the shoulders
# and the notched base are the whole shape, so they have to have room.
LEAF_HEAD = [
    "      ooooooo      ",
    "   oooGGGGGGGooo   ",
    "  oGGGGGGGGGGGGGo  ",
    " oGGoFFFFFFFFFoGGo ",
    "oGGGoFFFFFFFFFoGGGo",
    "oGGGoFFFFFFFFFoGGGo",
    "oGGGoFFFFFFFFFoGGGo",
    " oGGooooooooooooGo ",
    "  ogggggggggggggo  ",
    "   oddddddddddo    ",
    "     odd o ddo     ",
]

# A violet is bashful, so it looks away rather than turning its whole head — the eyes do
# the work, which also means the leaf never has to be redrawn three times.
SEED_LEAF = [
    " ooo ooo ",
    "oGGGoGGGo",
    " oGgggGo ",
    "  oddno  ",
]
SEED_STEM = [
    "odgo",
    "odgo",
    " oo ",
]

# --- Growing: the bud, nodding ----------------------------------------------
BUD_W, BUD_H = 15, 14
BUD_AT = (9, 9)


def _bud(rx=7.0, ry=6.6, face_dx=0.0, face_dy=0.6, light=(-0.85, -0.65)):
    # Bigger than the first attempt, with a SMALLER face in it. That version gave the bud
    # one row of green above the eyes, so it read as a tiny hat on a large pale head
    # rather than as a face inside a bud.
    return flower_head(
        BUD_W, BUD_H, 7.0, 7.0, rx, ry, 4, 0.10, 5.2, 3.2,
        face_dx=face_dx, face_dy=face_dy, light=light, chars="KkjJFo",
    )


BUD = _bud()
BUD_LEFT = _bud(face_dx=-1.2, light=(-0.32, -0.66))
BUD_RIGHT = _bud(face_dx=1.2, light=(-1.34, -0.66))

# The hooked stalk a violet bud hangs from, and the nod IS the identification — a violet
# in bud hangs its head, and nothing else in the deck does that. So the hook is drawn
# large enough to read: up, over, and back down onto the bud, rather than a vertical stem
# with a two-pixel kink at the top that reads as a stick.
CROOK = [
    "     ooooo ",
    "   oodggdo ",
    "  odggoodo ",
    "  odgo  oo ",
    "  odgo     ",
    "  odgo     ",
    "   odgo    ",
    "    oo     ",
]

G_L_DX, _ = face_shift(BUD, BUD_LEFT)
G_R_DX, _ = face_shift(BUD, BUD_RIGHT)

# Half a duck. The adult vanishes behind its leaf entirely; this one only looks away and
# comes back, because it has not learned the trick yet.
S_BOB = [0, 0, -1, -1, -1, -1, 0, 0]
S_EYES = [None, "look_left", "look_left", None, None, "look_right", "blink", None]

G_BOB = [0, 0, -1, -1, -1, -1, -1, 0, 0, 0]
G_HEAD = [None, "left", "left", None, None, None, "right", "right", None, None]
G_DX = [0, G_L_DX, G_L_DX, 0, 0, 0, G_R_DX, G_R_DX, 0, 0]
G_BLINK = [None] * 8 + ["blink", None]


SPRITE = {
    "herbId": "viola-sororia",
    "personality": "bashful",
    "stages": {
        "sprout": {
            "frames": 8,
            "fps": stage_fps(8, "sprout"),
            # No flower, so no throat. The big hiding leaf goes too: the trick belongs to
            # the adult, and a seedling that already hides has nothing left to learn.
            "hide": ["throat", "shield", "cheeks"],
            "swap": {
                "head": LEAF_HEAD,
                "leaf": SEED_LEAF,
                "stem": SEED_STEM,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
            },
            "variants": {
                "eyes": {
                    "blink": YOUNG_EYES["blink"],
                    "look_left": YOUNG_EYES["look_left"],
                    "look_right": YOUNG_EYES["look_right"],
                },
            },
            "origins": {
                "head": LEAF_HEAD_AT,
                "stem": (14, 22),
                "leaf": (18, 20),
                **seat_young(LEAF_HEAD_AT, LEAF_HEAD, cheeks=False, eye_dy=0, mouth_dy=3),
            },
            "motion": {
                "head": {"dy": S_BOB},
                "eyes": {"dy": S_BOB, "art": S_EYES},
                "mouth": {"dy": S_BOB},
                "leaf": {"dy": [0, 0, 0, 0, 0, 0, 0, 0]},
                "stem": {"dy": [0, 0, 0, 0, 0, 0, 0, 0]},
            },
        },
        "growing": {
            "frames": 10,
            "fps": stage_fps(8, "growing"),
            "palette": BUD_PALETTE,
            "hide": ["throat", "shield"],
            "swap": {
                "head": BUD,
                "stem": CROOK,
                "eyes": YOUNG_EYES["rows"],
                "mouth": YOUNG_MOUTH["rows"],
                "cheeks": young_cheeks(face_box(BUD)[2]),
            },
            "variants": {
                "head": {"left": BUD_LEFT, "right": BUD_RIGHT},
                "eyes": {"blink": YOUNG_EYES["blink"]},
            },
            "origins": {
                "head": BUD_AT,
                "stem": (13, 17),
                "leaf": (17, 18),
                **seat_young(BUD_AT, BUD, mouth_dy=4),
            },
            "motion": {
                "head": {"dy": G_BOB, "art": G_HEAD},
                "eyes": {"dy": G_BOB, "dx": G_DX, "art": G_BLINK},
                "cheeks": {"dy": G_BOB, "dx": G_DX},
                "mouth": {"dy": G_BOB, "dx": G_DX},
                "leaf": {"dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
                "stem": {"dy": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
            },
        },
    },
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    # The shield leaf is drawn LAST, over everything, because the whole gesture is it
    # passing in front of the face.
    "parts": [
        {"name": "stem", "origin": (14, 20), "rows": STEM},
        {"name": "leaf", "origin": (20, 17), "rows": LEAF},
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT},
        },
        {"name": "throat", "origin": on_face(HEAD_AT, HEAD, THROAT, dy=6), "rows": THROAT},
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="small", eye_dy=2, mouth_dy=5,
            # One eye open and the other still screwed shut. This is the frame the whole
            # gesture is for, and it only works asymmetrically.
            extra_eyes={"peek": ["EE    ", "EE  oo"]},
        ),
        {"name": "shield", "origin": (2, 16), "rows": SHIELD},
    ],
    #
    #  0    1    2     3     4     5     6     7     8     9     10   11   12    13
    # rest sway DUCK  HIDE  HIDE  HIDE  peek  peek  emerge back  rest rest blink rest
    #
    # The peek is frames 2-8 and it is this sprite's trademark: the leaf comes up over
    # the face for three frames, then drops just far enough for one eye, then all the way.
    # The half-frame of one eye is the whole character - a creature that reappeared all at
    # once would merely have been briefly obscured. Frame 0 is the rest pose reduced
    # motion freezes on: out in the open, which is what a card should show.
    "motion": {
        # The leaf travels UP and across rather than sideways: a violet hides under its
        # own leaves, which grow above the flowers, so the cover comes down over it.
        "shield": {
            # Measured against the face, not guessed: fully raised the leaf has to clear
            # the whole face, and on the peek frames it has to sit low enough to uncover
            # the eyes and nothing else.
            "dx": [0, 0, 3, 5, 5, 5, 4, 4, 2, 0, 0, 0, 0, 0],
            "dy": [0, 0, -3, -6, -7, -7, -2, -2, -1, 0, 0, 0, 0, 0],
        },
        "head": {
            "art": [None, "right", None, None, None, None, None, None, "left",
                    "left", None, None, None, None],
            "dy": [0, -1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "throat": {"dy": [0, -1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0]},
        "eyes": {
            "art": [None, None, "shut", "shut", "shut", "shut", "peek", "peek",
                    "half", None, None, None, "blink", None],
            "dx": [0, 2, 0, 0, 0, 0, 0, 0, -2, -2, 0, 0, 0, 0],
            "dy": [0, -1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0],
            "dy": [0, -1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    None, None, None, None],
            "dx": [0, 1, 0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0],
            "dy": [0, -1, 1, 2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "leaf": {"lean": [0, 1, 1, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0]},
        "stem": {"lean": [0, 0, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
