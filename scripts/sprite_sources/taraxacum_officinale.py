"""Dandelion (Taraxacum officinale) - creature portrait sprite.

THE DESIGN HOOK: dandelion is "dent de lion", lion's tooth. So the ray florets become a
golden MANE around a face and the plant reads as a small sun-lion. That is a creature
the species itself supplies rather than one bolted onto a flower, and every identifying
trait does double duty: the mane IS the ray-floret head, the arms ARE the deeply toothed
basal leaves, and the palette is the plant's own gold and green.

An earlier pass stayed close to the card panel and came out a stiff botanical icon with
motion. What fixed it: a head/body distinction, a face with eyes that blink, limbs, and
- most of all - a LOBED silhouette. A circle reads as a blob at any size; the petal
points are what make it legible as a flower creature in a small portrait.

RESOLUTION. Authored at 32x28, about three quarters of the previous pass, so the pixels read
as pixels. Two things had to change with it, because they do not survive scaling down:
the eyes became single-pixel dots (2x2 blocks with a glint merged into one dark band,
and outlined eyes turn to mush, once the face interior is only seven pixels across), and the mane's inner seam lost its outline - outlining both sides of a seam costs
2px, which is half a ring only 4px thick.

The head silhouette and its shading are generated rather than hand-counted: a lobed
polar curve carved with a face oval, then lit from the upper left by position.
Hand-authoring wide rows produced a vertical seam down the mane and a rectangular face,
twice. RX now equals RY, so the flower is round rather than a wide oval - that plus
shorter arms is what narrowed the sprite.

PERSONALITY: energetic and resilient - the weed that comes back through tarmac. A
springy bounce with overshoot, arms that lag a beat behind the body, a curious head
tilt, and a blink late in the loop so it reads as alive rather than mechanical.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference for anyone
actually looking at a plant outdoors.
"""

# Authored at 32x28. Softened palette: the golds are desaturated, the outline is a plum
# rather than near-black, and the greens are gentler - the previous set read as poster
# paint against the deck's violet.
PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "H": (255, 236, 186, 255),   # mane highlight
    "M": (247, 205, 106, 255),   # mane mid
    "D": (219, 165, 84, 255),    # mane deep
    "S": (178, 126, 66, 255),    # mane shadow
    "F": (255, 247, 224, 255),   # face
    "E": (86, 58, 104, 255),     # eye
    "W": (255, 255, 255, 255),   # eye glint
    "c": (240, 168, 180, 255),   # cheek
    "G": (150, 205, 120, 255),   # leaf light
    "g": (108, 166, 92, 255),    # leaf mid
    "d": (74, 122, 68, 255),     # leaf dark
}

HEAD = [
    "            ooo",
    "            oMo",
    "           oMMMo",
    "     oo    oMMMo    oo",
    "    oHHoo  oMMMo  ooMMo",
    "    oHHHHooMMMMMooMMMMo",
    "     oHHHMMMMMMMMMMMMo",
    "     oHHMMMMoooMMMMMMo",
    "      oHMMooFFFooMMMo",
    "      oMMoFFFFFFFoMMo",
    "   oooMMoFFFFFFFFFoDDooo",
    " ooHHMMMoFFFFFFFFFoDDDDSoo",
    " oHHHMMMoFFFFFFFFFoDDDSSSo",
    " ooHMMMMoFFFFFFFFFoDDDSSoo",
    "   oooMMoFFFFFFFFFoDDooo",
    "      oMMoFFFFFFFoDDo",
    "      oMMMooFFFooDDSo",
    "     oMMMMMMoooDDDDSSo",
    "     oMMMMMMMDDDDDSSSo",
    "    oMMMMooMDDDDooSSSSo",
    "    oMMoo  oDDDo  ooSSo",
]

# Two-pixel eyes with a glint, three pixels apart. At a narrower face they merged into
# one dark band, and single-pixel dots vanished against the cream - nine pixels of face
# is what it takes for a readable pair.
EYES_OPEN = [
    "WE   WE",
    "EE   EE",
]

EYES_CLOSED = [
    "       ",
    "EE   EE",
]

CHEEKS = [
    "c     c",
]

# The head's own taper ends in gold; this green stem and base replaces it, so the
# flower sits on something that is plainly a plant.
BODY = [
    "ogGgo",
    "ogGgo",
    "odgdo",
    " ooo ",
]

# The toothed basal leaves, doing duty as arms. Drawn BEHIND the head so each blade
# emerges from among the petals - out beside the flower they read as loose green slivers
# with background showing through the join.
ARM_L = [
    "      ooo",
    "  ooooGGGGo",
    "oGGGGGGGGGo",
    "oGdoggdGGGo",
    " oo ooooooo",
]

ARM_R = [
    "ooo",
    "oGGGGoooo",
    "oGGGGGGGGGo",
    "oGGGdggodGo",
    "ooooooo oo",
]

SPRITE = {
    "herbId": "taraxacum-officinale",
    "personality": "energetic",
    "size": (32, 28),
    "frames": 10,
    "fps": 10,
    # Back to front: base, arms, head, then face details on top.
    "parts": [
        {"name": "body", "origin": (14, 22), "rows": BODY},
        {"name": "armL", "origin": (1, 18), "rows": ARM_L},
        {"name": "armR", "origin": (21, 18), "rows": ARM_R},
        {"name": "head", "origin": (3, 3), "rows": HEAD},
        {
            "name": "eyes",
            "origin": (13, 14),
            "rows": EYES_OPEN,
            "variants": {"blink": EYES_CLOSED},
        },
        {"name": "cheeks", "origin": (13, 17), "rows": CHEEKS},
    ],
    # Frame 0 is the rest pose - what reduced motion freezes on - so it is eyes open and
    # level, never mid-bounce and never mid-blink.
    "motion": {
        "head": {
            "dy": [0, -1, -2, -2, -1, 0, 0, 0, 0, 0],
            "dx": [0, 0, 1, 1, 0, 0, -1, -1, 0, 0],
        },
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
