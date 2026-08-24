"""Dandelion (Taraxacum officinale) - animated portrait sprite.

SPECIES REFERENCE, NOT A COPY. The card's own pixel panel was measured for this:
roughly 18% of it is a broad golden head and about 1% a narrow central stem, with no
basal leaves at all. This redesign keeps that read - big gold head, slim stem - and
adds the deeply toothed basal rosette the card omits, because those backward-pointing
teeth are the plant's single most recognisable trait and the source of its name
("dent de lion"). Adding them makes the species MORE identifiable, not less.

The leaves double as the sprite's arms, which is where the personality lives: they
lift and flutter without the plant ever becoming a little person.

PERSONALITY: energetic and resilient. A springy two-beat bounce with a touch of
overshoot, a head that tilts as though looking around, and leaves that flick up on the
upbeat. Faster and bouncier than a mullein will be, which is the point of holding the
motion in data rather than in code.

SAFETY: this is a portrait, never an identification aid. It is deliberately stylised
and lives apart from the card's identification content, which stays the reference for
anyone actually looking at a plant outdoors.
"""

# Authored at 32x36. Rows 0-2 are deliberately empty headroom so the bounce has
# somewhere to go without the head clipping the top of the frame.
PALETTE = {
    # Outline: a deep plum rather than black, so the sprite sits in the deck's violet
    # world instead of looking cut out and pasted on.
    "o": (42, 18, 64, 255),
    # Flower golds, light to dark.
    "H": (255, 228, 130, 255),
    "M": (255, 198, 30, 255),
    "D": (224, 154, 22, 255),
    "C": (168, 106, 12, 255),
    # Foliage greens.
    "G": (111, 191, 74, 255),
    "g": (74, 145, 48, 255),
    "d": (46, 99, 32, 255),
}

# The golden head. A round pompom of ray florets - NOT a lens with a dark middle,
# which the first pass produced and which read unmistakably as a giant eye. Two rules
# keep it a flower: the silhouette stays circular rather than pointed at the sides, and
# the deeper gold appears only as short radial dashes suggesting floret separations,
# never as one central disc. The fringed crown is floret tips catching light.
HEAD = [
    "        HoHoHoH",
    "      oHHHHHHHHo",
    "    oHHHHHMMMMMHo",
    "   oHHHHMMMMMMMMDo",
    "  oHHHMMMMMMMMMMMDo",
    " oHHHMMMMMMMMMMMMDo",
    " oHHMMMMMMMMMMMMMDDo",
    "oHHMMMMMMMMMMMMMMDDo",
    "oHMMMMMMMMMMMMMMMDDo",
    "oHMMMMMMMMMMMMMMDDDo",
    "oHMMMMMMMMMMMMMDDDDo",
    " oMMMMMMMMMMMMDDDDo",
    " oMMMMMMMMMMDDDDDo",
    "  oMMMMMMMDDDDDDo",
    "   oDDMMMDDDDDDo",
    "     oDDDDDDDo",
    "       ogGGgo",
]

# Short. A long bare stem turned the first pass into a lollipop; keeping the head close
# to the rosette is what makes it read as one compact creature rather than a flower on
# a stick.
STEM = [
    "ogGgo",
    "ogGgo",
    "ogGgo",
    "ogGgo",
    "ogGgo",
    "ogGgo",
]

# The toothed basal rosette, and the sprite's arms. Diagonal blades sweeping up and
# out, not flat bars - the flat version read as grass. Teeth notch the underside,
# pointing back toward the base, which is the trait the plant is named for and the
# thing the card's own panel leaves out.
LEAF_L = [
    "           oo",
    "        oooGGo",
    "      ooGGGGGo",
    "    ooGGGGGGGo",
    "  ooGGGGGGGGgo",
    " oGGGGGGGGGGgo",
    "oGGgggggggGGgo",
    "oGdoggggggGGgo",
    " oooddggggggo",
    "    oodddddo",
]

LEAF_R = [
    "oo",
    "oGGooo",
    "oGGGGGoo",
    "oGGGGGGGoo",
    "ogGGGGGGGGoo",
    "ogGGGGGGGGGGo",
    "ogGGgggggggGGo",
    "ogGGggggggodGo",
    " oggggggddooo",
    "  odddddoo",
]

SPRITE = {
    "herbId": "taraxacum-officinale",
    "personality": "energetic",
    "size": (32, 36),
    "frames": 8,
    "fps": 10,
    # Draw order is back to front: the rosette sits behind the stem, which sits behind
    # the head, so the parts overlap into one plant rather than three floating pieces.
    "parts": [
        {"name": "stem", "origin": (14, 19), "rows": STEM},
        {"name": "leafL", "origin": (1, 21), "rows": LEAF_L},
        {"name": "leafR", "origin": (18, 21), "rows": LEAF_R},
        {"name": "head", "origin": (6, 3), "rows": HEAD},
    ],
    # One entry per part; each list is read per frame and wraps. Frame 0 is the rest
    # pose every track returns to, which is what reduced motion freezes on.
    "motion": {
        # Springy: up fast, hang, settle with a small overshoot below the rest line.
        "head": {
            "dy": [0, -1, -2, -2, -1, 0, 1, 0],
            "dx": [0, 0, 1, 1, 0, -1, -1, 0],
        },
        # The stem leans opposite to the head's drift, so the plant looks like it is
        # carrying its own weight rather than sliding sideways in one piece.
        "stem": {
            "dy": [0, -1, -1, -1, -1, 0, 0, 0],
            "lean": [0, 0, 1, 1, 0, -1, -1, 0],
        },
        # Leaves flick up on the upbeat and drop a touch late, so the whole body does
        # not move on the same beat - that lag is most of the sense of life.
        "leafL": {"dy": [0, 0, -1, -1, -1, 0, 0, 0], "dx": [0, -1, -1, 0, 0, 0, 0, 0]},
        "leafR": {"dy": [0, 0, -1, -1, -1, 0, 0, 0], "dx": [0, 1, 1, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
