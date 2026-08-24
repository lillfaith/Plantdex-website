"""Jewelweed (Impatiens capensis) - creature portrait sprite.

THE DESIGN HOOK: jewelweed is the touch-me-not. Its ripe seed pods are under tension and
burst at a touch, flinging seeds several feet. Nothing else in this deck DOES anything -
so this one gets the deck's only gesture with a consequence: a pod that swells, pops, and
throws seeds out of the frame.

Measured from the card panel, its orange runs 10.7% of the crop in a tall narrow band -
the dangling trumpet flowers hung along a stem. So the silhouette is a PENDANT one: the
flower hangs down from a hook, which no other sprite does. Everything else in the set
sits on top of its body.

WHERE THE FACE GOES: in the hanging flower, which is the recognisable structure and is
round enough to hold one. It hangs BELOW the stem it grows from, so this face sits lower
and looks slightly up - the opposite posture to the mullein's.

PERSONALITY: jumpy and ticklish, and startled by its own reflex. Its trademark gesture is
THE POP - the pod swells, bursts, seeds fly, and the flower recoils from the bang it just
made itself. It is the only sprite that surprises itself.

A nice pairing the deck supplies for free: jewelweed is the traditional field remedy for
a nettle sting, and the two often grow within reach of each other. The set now has the
plant that stings and the plant that answers it.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits apart
from the card's identification content, which stays the reference for anyone actually
looking at a plant outdoors.
"""

from _face import on_face
from _flowerhead import flower_head

# Authored at 32x28, the house size.
PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "O": (255, 198, 132, 255),   # flower highlight
    "R": (247, 156, 78, 255),    # flower mid - the orange the card actually carries
    "r": (206, 112, 54, 255),    # flower deep
    "u": (158, 80, 44, 255),     # flower shadow
    "p": (140, 62, 48, 255),     # the throat freckles jewelweed is spotted with
    "F": (255, 240, 224, 255),   # face
    "E": (86, 58, 104, 255),     # eye
    "W": (255, 255, 255, 255),   # eye glint
    "c": (244, 158, 158, 255),   # cheek
    "G": (166, 216, 138, 255),   # stem light - jewelweed stems are famously translucent
    "g": (118, 178, 100, 255),   # stem mid
    "d": (78, 130, 74, 255),     # stem dark
    "S": (250, 236, 168, 255),   # seeds
}

FLOWER_W, FLOWER_H = 19, 17


def _flower(face_dx=0.0, light=(-0.85, -0.65), rx=8.0, ry=7.6):
    return flower_head(
        FLOWER_W, FLOWER_H, 9.0, 8.0, rx, ry, 5, 0.16, 5.4, 4.8,
        face_dx=face_dx, light=light, trim_tail=False, chars="ORruFo",
    )


FLOWER = _flower()
FLOWER_LEFT = _flower(face_dx=-1.6, light=(-0.35, -0.65))
FLOWER_RIGHT = _flower(face_dx=1.6, light=(-1.25, -0.65))
# Recoiled: squashed back and up, the flower flinching from its own bang.
FLOWER_RECOIL = _flower(rx=8.6, ry=6.9)

# The spotted throat. Jewelweed is freckled inside, and it is the detail that stops the
# flower reading as a plain orange bell.
FRECKLES = [
    "p   p",
    " p p",
]

# The hook the flower hangs from. This is the part that makes the silhouette pendant:
# the stem arcs over and the head dangles UNDER it.
HOOK = [
    "  ooooo",
    " ooGGGdo",
    "ooGGoodo",
    "odGo  oo",
    "odGo",
    "odgo",
    "oddo",
]

# The seed pod, hanging opposite the flower. It swells, bursts, and is spent.
POD_CLOSED = [
    " oo ",
    "oGGo",
    "oGgo",
    "odgo",
    " oo ",
]

POD_SWOLLEN = [
    " oo ",
    "oGGo",
    "oGGGo",
    "oGGGo",
    "odgo",
    " oo ",
]

POD_BURST = [
    "o  o",
    " oo ",
    "o  o",
]

POD_SPENT = [
    " oo ",
    "odo",
    " o  ",
]

# Seeds, flung. Two frames only, travelling out and up before leaving the frame.
SEEDS_NEAR = [
    "S   S",
    "  S  ",
    "S   S",
]

SEEDS_FAR = [
    "S       S",
    "    S    ",
    "S       S",
]

SEEDS_NONE = [
    " ",
]

EYES_OPEN = [
    "WE   WE",
    "EE   EE",
]

# Startled: the pop catches it out every single time.
EYES_SHOCK = [
    "EE   EE",
    "EE   EE",
]

EYES_CLOSED = [
    "       ",
    "EE   EE",
]

EYES_HALF = [
    "oo   oo",
    "EE   EE",
]

CHEEKS = [
    "c     c",
]

MOUTH_SMALL = [
    " oo ",
]

# Open, because something just went off next to its ear.
MOUTH_OH = [
    "oooo",
    "oFFo",
]

FLOWER_AT = (7, 8)

SPRITE = {
    "herbId": "impatiens-capensis",
    "personality": "jumpy",
    "size": (32, 28),
    "frames": 14,
    "fps": 12,
    # The hook first, then the flower hanging under it, then the pod alongside, then the
    # face. Seeds last, over everything, because they are in front of the plant.
    "parts": [
        {"name": "hook", "origin": (11, 4), "rows": HOOK},
        {
            "name": "flower",
            "origin": FLOWER_AT,
            "rows": FLOWER,
            "variants": {
                "left": FLOWER_LEFT,
                "right": FLOWER_RIGHT,
                "recoil": FLOWER_RECOIL,
            },
        },
        {"name": "freckles", "origin": (14, 21), "rows": FRECKLES},
        {
            "name": "pod",
            "origin": (24, 10),
            "rows": POD_CLOSED,
            "variants": {
                "swollen": POD_SWOLLEN,
                "burst": POD_BURST,
                "spent": POD_SPENT,
            },
        },
        {
            "name": "eyes",
            "origin": on_face(FLOWER_AT, FLOWER, EYES_OPEN, dy=2),
            "rows": EYES_OPEN,
            "variants": {"blink": EYES_CLOSED, "half": EYES_HALF, "shock": EYES_SHOCK},
        },
        {"name": "cheeks", "origin": on_face(FLOWER_AT, FLOWER, CHEEKS, dy=4), "rows": CHEEKS},
        {
            "name": "mouth",
            "origin": on_face(FLOWER_AT, FLOWER, MOUTH_SMALL, dy=5),
            "rows": MOUTH_SMALL,
            "variants": {"oh": MOUTH_OH},
        },
        {
            "name": "seeds",
            "origin": (22, 8),
            "rows": SEEDS_NONE,
            "variants": {"near": SEEDS_NEAR, "far": SEEDS_FAR},
        },
    ],
    #
    #  0    1    2     3      4     5      6      7      8     9    10   11   12  13
    # rest sway swell swell TENSE POP!  recoil recoil settle sway blink rest rest rest
    #
    # The pop is frames 4-7 and it is this sprite's trademark: the pod tenses, bursts,
    # seeds fly out of frame, and the flower flinches from a bang it made itself. It is
    # the only gesture in the set with a consequence. Frame 0 is the rest pose reduced
    # motion freezes on - pod closed, nothing in flight.
    "motion": {
        # The flower dangles, so it swings rather than bobs - and it swings AWAY from the
        # pod on the pop, which is the recoil.
        "flower": {
            "art": [None, "right", None, None, None, None, "recoil", "recoil",
                    None, "left", None, None, None, None],
            "dx": [0, 1, 0, 0, -1, -3, -3, -2, -1, -1, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "freckles": {
            "dx": [0, 1, 0, 0, -1, -3, -3, -2, -1, -1, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        # The pod swells for two frames, tenses, bursts, and stays spent for the rest of
        # the loop. Re-closing it inside the loop would read as a glitch, not as a plant.
        "pod": {
            "art": [None, None, "swollen", "swollen", "swollen", "burst", "burst",
                    "spent", "spent", "spent", "spent", "spent", "spent", None],
            "dx": [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, -1, -1, 0, 1, 1, 1, 1, 1, 1, 1, 0],
        },
        # Seeds exist for exactly two frames, travelling out and up out of frame.
        "seeds": {
            "art": [None, None, None, None, None, "near", "far", None, None, None,
                    None, None, None, None],
            "dx": [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 0, 0, -3, 0, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, None, "half", "shock", "shock", "shock", "shock",
                    "half", None, "blink", None, None, None],
            "dx": [0, 4, 0, 0, -1, -3, -3, -2, -1, -4, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 4, 0, 0, -1, -3, -3, -2, -1, -4, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, "oh", "oh", "oh", "oh", None, None,
                    None, None, None, None],
            "dx": [0, 4, 0, 0, -1, -3, -3, -2, -1, -4, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0],
        },
        # The hook barely moves: it is the anchor everything else swings from, and a
        # dangling thing only reads as dangling if what it hangs from stays put.
        "hook": {"dy": [0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
