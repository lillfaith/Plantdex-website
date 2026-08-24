"""Pine (Pinus spp.) - creature portrait sprite.

THE DESIGN HOOK: pine is the deck's ONLY winter card, and measured from its panel it is
the only species whose crop carries a real dark mass - 10.9% below 30% value, where
every other plant here is light. So this sprite is the dark one, and the only triangle.

A TRIANGLE, HAND-AUTHORED. Every other species in the set is built from the shared polar
curve in `_flowerhead.py`, because every other species is round. A conifer is not, and
forcing one through that generator would have produced a lumpy circle pretending to be a
tree. Layered boughs are drawn here directly - it is the one place the shared helper is
the wrong tool.

WHERE THE FACE GOES: in the trunk gap between the lower boughs, which is the only part of
a conifer silhouette that is not needles. It sits lower in frame than any other sprite's,
which is itself a character note - this one looks out from under something.

PERSONALITY: ancient and unbothered. Its trademark gesture is SHAKING OFF SNOW - snow
settles on the boughs, it gives one hard shiver, and the snow drops away. Nothing else in
the set sheds anything, and nothing else has weather.

Where the mullein stands and the yarrow watches, this one ENDURES. It is the slowest
sprite in the deck at 6fps, tied with the mullein, but it spends most of its loop
completely motionless - the shiver is three frames out of sixteen.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits apart
from the card's identification content, which stays the reference for anyone actually
looking at a plant outdoors.
"""

# Authored at 32x28, the house size.
PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "N": (127, 160, 149, 255),    # needle highlight
    "n": (78, 129, 116, 255),     # needle mid
    "m": (41, 73, 67, 255),      # needle deep
    "M": (28, 52, 48, 255),      # needle shadow - the darkest colour in the deck
    "T": (165, 127, 96, 255),    # trunk light
    "t": (126, 94, 71, 255),     # trunk dark
    "F": (222, 236, 226, 255),   # face
    "E": (58, 44, 74, 255),      # eye
    "c": (206, 148, 148, 255),   # cheek - muted; nothing about this one is rosy
    "W": (255, 255, 255, 255),   # snow
    "w": (226, 234, 242, 255),   # snow shadow
}

# Layered boughs, drawn rather than generated. Each tier overhangs the one below, which
# is what makes a conifer read as a conifer rather than as a green triangle.
TREE = [
    "         o",
    "        oNo",
    "       oNnMo",
    "      oNnnmMo",
    "     ooNnmMMoo",
    "   ooNnnnmmMMoo",
    "      oNnmMo",
    "     oNnnmMMo",
    "    ooNnnmMMoo",
    "  ooNnnnnmmMMMoo",
    "     oNnnmMo",
    "    oNnnnmMMo",
    "   ooNnnnmMMMoo",
    " ooNnnnnnmmmMMMoo",
    "     oNnnnmMMo",
    "   ooNnnnnmMMMoo",
    "ooNnnnnnnmmmMMMMoo",
    "      otTto",
    "      otTto",
    "     ooTtto",
]

# Shivered: every tier shifted a pixel the other way. Two frames of this, alternating,
# is a whole-body shudder - the boughs cannot bend individually at 32px, so the tree
# shakes as one and the snow is what shows it worked.
TREE_SHAKE = [
    "        o",
    "       oNo",
    "      oNnMo",
    "     oNnnmMo",
    "    ooNnmMMoo",
    "  ooNnnnmmMMoo",
    "     oNnmMo",
    "    oNnnmMMo",
    "   ooNnnmMMoo",
    " ooNnnnnmmMMMoo",
    "    oNnnmMo",
    "   oNnnnmMMo",
    "  ooNnnnmMMMoo",
    "ooNnnnnnmmmMMMoo",
    "    oNnnnmMMo",
    "  ooNnnnnmMMMoo",
    " ooNnnnnnnmmmMMMMoo",
    "     otTto",
    "     otTto",
    "    ooTtto",
]

# Snow sitting on the bough tips. It thins across the loop and is gone after the shake,
# which is the only way a 32px sprite can show that the shiver did something.
SNOW_FULL = [
    "    WW       WW",
    "  WWww       wwWW",
    "   WW         WW",
    " WWww         wwWW",
    "  WW           WW",
    "Wwww           wwWW",
]

SNOW_HALF = [
    "    WW       WW",
    "   Ww         wW",
    "   WW         WW",
    "  Ww           wW",
    "               ",
    " Www            wW",
]

SNOW_NONE = [
    " ",
]

# Falling flakes, for the two frames after the shake. They only ever appear then.
FLAKES = [
    "  W       W",
    "     W  ",
    "W        W ",
]

FLAKES_NONE = [
    " ",
]

# A pale patch in the boughs for the face to sit on. Without it the eyes were dark
# pixels on the darkest colour in the deck, which is no face at all.
FACE = [
    "  ooooo  ",
    " oFFFFFo ",
    "oFFFFFFFo",
    "oFFFFFFFo",
    "oFFFFFFFo",
    " oFFFFFo ",
    "  ooooo  ",
]

EYES_OPEN = [
    "E   E",
    "E   E",
]

EYES_HALF = [
    "o   o",
    "E   E",
]

EYES_CLOSED = [
    "     ",
    "E   E",
]

# Braced: shut tight for the shiver itself.
EYES_SHUT = [
    "oo  oo",
    "     ",
]

CHEEKS = [
    "c     c",
]

MOUTH_LEVEL = [
    "ooo",
]

SPRITE = {
    "herbId": "pinus-spp",
    "personality": "ancient",
    "size": (32, 28),
    "frames": 16,
    "fps": 6,
    # The face sits UNDER the boughs: tree first, then the face in the trunk gap, then
    # snow over everything because snow lands on top of what it lands on.
    "parts": [
        {
            "name": "tree",
            "origin": (7, 1),
            "rows": TREE,
            "variants": {"shake": TREE_SHAKE},
        },
        {"name": "face", "origin": (11, 16), "rows": FACE},
        {
            "name": "eyes",
            "origin": (13, 19),
            "rows": EYES_OPEN,
            "variants": {"blink": EYES_CLOSED, "half": EYES_HALF, "shut": EYES_SHUT},
        },
        {"name": "cheeks", "origin": (12, 21), "rows": CHEEKS},
        {"name": "mouth", "origin": (14, 22), "rows": MOUTH_LEVEL},
        {
            "name": "snow",
            "origin": (7, 4),
            "rows": SNOW_FULL,
            "variants": {"half": SNOW_HALF, "none": SNOW_NONE},
        },
        {
            "name": "flakes",
            "origin": (10, 14),
            "rows": FLAKES_NONE,
            "variants": {"fall": FLAKES},
        },
    ],
    #
    #  0    1    2    3    4     5      6      7     8     9    10   11   12   13  14  15
    # laden hold hold hold brace SHAKE SHAKE SHAKE clear fall settle hold hold blink hold hold
    #
    # The shake is frames 5-7 and it is this sprite's trademark: three frames of movement
    # in sixteen, and the snow coming off is the only evidence it happened. Everything
    # else is a tree standing still in the cold. Frame 0 is the rest pose reduced motion
    # freezes on - laden with snow, which is the honest resting state of a winter card.
    "motion": {
        "tree": {
            "art": [None, None, None, None, None, "shake", None, "shake", None, None,
                    None, None, None, None, None, None],
            "dx": [0, 0, 0, 0, 0, 1, -1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # Snow: full, full, full, full, full, then knocked loose, then gone for the rest
        # of the loop. It does not come back - a loop that re-snows itself would look
        # like a glitch rather than like weather.
        "snow": {
            "art": [None, None, None, None, None, "half", "half", "none", "none",
                    "none", "none", "none", "none", "none", "none", None],
            "dx": [0, 0, 0, 0, 0, 1, -1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        # The flakes exist only in the two frames after the shake, falling and fading.
        "flakes": {
            "art": [None, None, None, None, None, None, None, "fall", "fall", "fall",
                    None, None, None, None, None, None],
            "dy": [0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, None, "half", "shut", "shut", "shut", "shut", "half",
                    None, None, None, None, "blink", None, None],
            "dx": [0, 0, 0, 0, 0, 1, -1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "face": {
            "dx": [0, 0, 0, 0, 0, 1, -1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 0, 0, 0, 0, 1, -1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "dx": [0, 0, 0, 0, 0, 1, -1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
    },
    "palette": PALETTE,
}
