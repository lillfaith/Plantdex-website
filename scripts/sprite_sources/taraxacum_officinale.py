"""Dandelion (Taraxacum officinale) - creature portrait sprite.

THE DESIGN HOOK: dandelion is "dent de lion", lion's tooth. So the ray florets become a
golden MANE around a face and the plant reads as a small sun-lion. That is a creature
the species itself supplies rather than one bolted onto a flower, and every identifying
trait does double duty: the mane IS the ray-floret head, the arms ARE the deeply toothed
basal leaves, and the palette is the plant's own gold and green.

This replaced a first pass that stayed close to the card panel and came out a stiff
botanical icon with motion. What fixed it: a head/body distinction, a face with eyes
that blink, limbs, and - most of all - a LOBED silhouette. A circle reads as a blob at
any size; the eleven petal points are what make it legible as a flower creature in a
32px portrait.

The head silhouette and its shading are generated rather than hand-counted (see
`scripts/gen_head.py` notes in the build script): a lobed polar curve carved with a face
oval, then lit from the upper left by position. Hand-authoring 33-wide rows produced a
vertical seam down the mane and a rectangular face, twice.

PERSONALITY: energetic and resilient - the weed that comes back through tarmac. A
springy bounce with overshoot, arms that lag a beat behind the body, a curious head
tilt, and a blink late in the loop so it reads as alive rather than mechanical.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference for anyone
actually looking at a plant outdoors.
"""

# Authored at 44x32.
PALETTE = {
    "o": (36, 16, 58, 255),      # outline, deep plum rather than black
    "H": (255, 233, 160, 255),   # mane highlight
    "M": (255, 201, 60, 255),    # mane mid
    "D": (232, 153, 42, 255),    # mane deep
    "S": (179, 106, 20, 255),    # mane shadow
    "F": (255, 243, 201, 255),   # face
    "E": (58, 26, 74, 255),      # eye
    "W": (255, 255, 255, 255),   # eye glint
    "c": (242, 143, 168, 255),   # cheek
    "G": (127, 209, 84, 255),    # leaf light
    "g": (79, 164, 54, 255),     # leaf mid
    "d": (46, 107, 36, 255),     # leaf dark
}

HEAD = [
    "              ooo",
    "              oHo     ooo",
    "              oHMo   oMMo",
    "       ooo    oMMo  oMMMo",
    "       oHHoo  oMMMooMMMo",
    "        oHHHooMMMMMMMMMo    ooo",
    "        oHHHMMoooooooMMMooooDDo",
    "         oHMoooooooooooMMMMDDo",
    "   ooooooHMoooFFFFFFFoooMMDDo",
    "  ooHHHHHMooFFFFFFFFFFFooDDo",
    "    ooHHMMooFFFFFFFFFFFooDDo",
    "      oMMooFFFFFFFFFFFFFooDDoooo",
    "       oMooFFFFFFFFFFFFFooDDDSSSo",
    "      oMMooFFFFFFFFFFFFFooDDoooo",
    "    ooMMMMooFFFFFFFFFFFooDDo",
    "  ooMMMMMMooFFFFFFFFFFFooDSo",
    "   ooooooMMoooFFFFFFFoooDSSSo",
    "         oMMoooooooooooDSSSSSo",
    "        oMMMMMoooooooDDSooooSSo",
    "        oMMMooMDDDDDDDSo    ooo",
    "       oMMoo  oDDDooDSSo",
    "       ooo    oDDo  oSSSo",
    "              oDDo   oSSo",
    "              oDo     ooo",
    "              ooo",
]

# Eyes are their own part so the loop can blink. Offsets alone cannot swap art, and a
# blink is most of what separates a creature portrait from a decorated icon.
EYES_OPEN = [
    " oo    oo ",
    "oEEo  oEEo",
    "oEWo  oEWo",
    "oEEo  oEEo",
    " oo    oo ",
]

# Closed: a shallow arc rather than a straight bar - a bar reads as a scowl.
EYES_CLOSED = [
    "          ",
    "          ",
    "oEEo  oEEo",
    " oo    oo ",
    "          ",
]

CHEEKS = [
    "cc      cc",
]

# A short stem and root base showing BELOW the mane, so the head sits on something.
BODY = [
    " ogGgo ",
    "odgGgdo",
    "oddgddo",
    " ooooo ",
]

# The deeply toothed basal leaves, doing duty as arms. Angled blades, not flat bars -
# flat read as grass every time it was tried. Drawn AFTER the head so they overlap the
# petals rather than hovering beside them with a gap of background between.
ARM_L = [
    "              oooo",
    "        ooooooGGGGo",
    "    ooooGGGGGGGGGGo",
    "  ooGGGGGGGGGGGGGGo",
    " oGGGgggggggggggGGo",
    "oGdoggdoggggggggGGo",
    " oo oo  oooooooooo",
]

ARM_R = [
    "oooo",
    "oGGGGoooooo",
    "oGGGGGGGGGGoooo",
    "oGGGGGGGGGGGGGGoo",
    "oGGgggggggggggGGo",
    "oGGggggggodggodGo",
    " oooooooooo  oo oo",
]

SPRITE = {
    "herbId": "taraxacum-officinale",
    "personality": "energetic",
    "size": (44, 32),
    "frames": 10,
    "fps": 10,
    # Back to front: base, then the head, then arms overlapping it, then face details.
    "parts": [
        {"name": "body", "origin": (19, 25), "rows": BODY},
        {"name": "armL", "origin": (0, 16), "rows": ARM_L},
        {"name": "armR", "origin": (26, 16), "rows": ARM_R},
        {"name": "head", "origin": (5, 2), "rows": HEAD},
        {
            "name": "eyes",
            "origin": (18, 13),
            "rows": EYES_OPEN,
            "variants": {"blink": EYES_CLOSED},
        },
        {"name": "cheeks", "origin": (17, 18), "rows": CHEEKS},
    ],
    # Frame 0 is the rest pose - what reduced motion freezes on - so it is eyes open and
    # level, never mid-bounce and never mid-blink.
    "motion": {
        "head": {
            "dy": [0, -1, -2, -2, -1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, 1, 0, 0, -1, -1, 0, 0],
        },
        # Face details ride the head exactly, or the features slide around on it.
        "eyes": {
            "dy": [0, -1, -2, -2, -1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, 1, 0, 0, -1, -1, 0, 0],
            "art": [None, None, None, None, None, None, None, "blink", "blink", None],
        },
        "cheeks": {
            "dy": [0, -1, -2, -2, -1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, 1, 0, 0, -1, -1, 0, 0],
        },
        "body": {"dy": [0, 0, -1, -1, -1, 0, 1, 0, 0, 0]},
        # Arms lag the head by a frame, which is most of the sense of life.
        "armL": {"dy": [0, 0, -1, -2, -1, 0, 0, 0, 0, 0], "dx": [0, -1, -1, 0, 0, 0, 0, 0, 0, 0]},
        "armR": {"dy": [0, 0, -1, -2, -1, 0, 0, 0, 0, 0], "dx": [0, 1, 1, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
