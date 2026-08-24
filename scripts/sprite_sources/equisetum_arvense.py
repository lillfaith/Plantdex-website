"""Horsetail (Equisetum arvense) - creature portrait sprite.

THE DESIGN HOOK: horsetail is a survivor of the Carboniferous. Its relatives were trees
thirty metres tall three hundred million years ago, and what is left is a jointed stem
built in segments that pull apart with an audible pop, stiffened with so much silica that
people have scoured pots with it for centuries. It is the only plant in this deck that is
not a flowering plant at all - it has no flower, no seed, and reproduces by spores.

So this sprite is built out of SEGMENTS, and its gesture is the one thing a jointed stem
can do that nothing else here can: it TELESCOPES, adding one section at a time, each with
a hard stop. Nothing eases; a plant reinforced with glass does not ease.

WHERE THE FACE GOES: in the top segment, which is the growing tip.

PERSONALITY: prehistoric, and in no hurry. Its trademark gesture is THE STACK - it grows
upward one rigid segment at a time, holds at full height, and settles back down. It is the
only sprite that builds itself, and the only one with no curve anywhere in it.

SAFETY: a portrait, never an identification aid. Deliberately stylised, and it sits
apart from the card's identification content, which stays the reference outdoors.
"""

from _face import FACE_PALETTE, feature_parts

PALETTE = {
    **FACE_PALETTE,
    "G": (146, 186, 138, 255),   # segment highlight - grey-green, ancient, not fresh
    "g": (106, 146, 106, 255),   # segment mid
    "d": (74, 108, 78, 255),     # segment deep
    "n": (52, 78, 58, 255),      # segment shadow
    "K": (188, 208, 176, 255),   # the pale sheath at every joint
    "S": (216, 224, 190, 255),   # the spore cone, which is the only soft thing here
}

# The head is hand-drawn, not generated. Every other species in this set is built from a
# polar curve because every other species is round; horsetail has no curve in it anywhere,
# and forcing this through the shared generator would have produced a lumpy cylinder
# pretending to be a tube. This is the second place - after pine - the helper is wrong.
HEAD = [
    " ooooooooo ",
    "oKKKKKKKKKo",
    "oGGGGGGGGGo",
    "oGFFFFFFFGo",
    "oGFFFFFFFGo",
    "ogFFFFFFFgo",
    "ogFFFFFFFgo",
    "odFFFFFFFdo",
    "odFFFFFFFdo",
    "onnnnnnnnno",
    "oKKKKKKKKKo",
    " ooooooooo ",
]

# One stem segment, banded at both ends the way a real one is. The body is a stack of
# these, and growing means switching more of them on.
SEGMENT = [
    "oKKKKKKKo",
    "oGGGGGGdo",
    "ogggggddo",
    "ogggdddno",
    "oKKKKKKKo",
]

SEGMENT_NONE = [
    " ",
]

# The whorls of needle-fine branches horsetail carries at every joint, held stiffly out
# and slightly upward, which is the silhouette everybody recognises.
WHORL = [
    "o o o   o o o",
    " ogo     ogo",
    "  o       o",
]

WHORL_NONE = [
    " ",
]

# The spore cone, on its own separate shoot beside the green one. This is not a licence
# taken for the sake of the picture: horsetail really does send up pale unbranched
# fertile stems carrying the cones, quite separately from the green sterile shoots, and
# putting the cone on top of this creature's head would have been the invention.
CONE = [
    " oSo ",
    "oSSSo",
    "oSSSo",
    " oSo ",
    " oKo ",
    " ogo ",
    " oKo ",
    " ogo ",
    " oKo ",
    " ogo ",
    " oo  ",
]

CONE_NONE = [
    " ",
]

HEAD_AT = (10, 11)
# The stack, in exact segment heights. A jointed stem grows by whole sections, so the
# head only ever sits at one of three heights and never between them - which is what
# separates a ratchet from a stretch.
LIFT = [0, 0, -5, -5, -10, -10, -10, -10, -10, -10, -5, 0, 0, 0]

SPRITE = {
    "herbId": "equisetum-arvense",
    "personality": "prehistoric",
    "size": (32, 28),
    "frames": 14,
    "fps": 6,
    # Bottom segment up, so each new one appears to push the ones above it higher.
    "parts": [
        {"name": "segC", "origin": (11, 22), "rows": SEGMENT},
        {
            "name": "segB",
            "origin": (11, 17),
            "rows": SEGMENT,
            "variants": {"none": SEGMENT_NONE},
        },
        {
            "name": "segA",
            "origin": (11, 12),
            "rows": SEGMENT,
            "variants": {"none": SEGMENT_NONE},
        },
        {
            "name": "whorlA",
            "origin": (9, 11),
            "rows": WHORL,
            "variants": {"none": WHORL_NONE},
        },
        {
            "name": "whorlB",
            "origin": (9, 16),
            "rows": WHORL,
            "variants": {"none": WHORL_NONE},
        },
        {"name": "whorlC", "origin": (9, 21), "rows": WHORL},
        {"name": "head", "origin": HEAD_AT, "rows": HEAD},
        {
            "name": "cone",
            "origin": (25, 8),
            "rows": CONE_NONE,
            "variants": {"on": CONE},
        },
        *feature_parts(
            HEAD_AT, HEAD, eyes="beady", mouth="line", eye_dy=2, mouth_dy=4,
            # No blush. Nothing about a horsetail is warm-blooded.
            cheeks=False,
            # Two rows: this face is a rectangle six pixels deep and a three-row mouth
            # runs straight out of the bottom of it.
            extra_mouths={"ah": ["ooo", "oFo"]},
        ),
    ],
    #
    #  0    1    2      3     4      5     6     7     8     9    10    11   12    13
    # rest hold GROW   hold  GROW   hold  full  full  cone  cone  drop  drop blink rest
    #
    # The stack is frames 2-7 and it is this sprite's trademark: it grows in two hard
    # steps with a held frame between them, so the movement is a ratchet rather than a
    # stretch. At 6fps - joint slowest in the deck with the pine - each step lands on its
    # own. Frame 0 is the rest pose reduced motion freezes on: fully assembled, since a
    # still image of a half-built plant would look like a rendering error.
    "motion": {
        # The head rises in two exact segment-heights, five pixels each, and never lands
        # between them. That is what makes it read as jointed.
        "head": {"dy": LIFT},
        "eyes": {
            "art": [None, None, "wide", "wide", "wide", "wide", None, None, None,
                    None, "half", None, "blink", None],
            "dy": LIFT,
        },
        "mouth": {
            "art": [None, None, None, None, None, None, None, None, "ah", "ah",
                    None, None, None, None],
            "dy": LIFT,
        },
        # Each segment exists only once there is room for it. They appear in order and
        # vanish in reverse, which is what "telescoping" is.
        # The top segment only exists at full height; the middle one from the first step
        # onward. Because each sits at the height it will occupy, neither ever needs to
        # move - they simply are or are not there, which is what telescoping looks like.
        "segA": {
            "art": ["none", "none", "none", "none", None, None, None, None, None,
                    None, "none", "none", "none", "none"],
        },
        "whorlA": {
            "art": ["none", "none", "none", "none", None, None, None, None, None,
                    None, "none", "none", "none", "none"],
        },
        "segB": {
            "art": ["none", "none", None, None, None, None, None, None, None,
                    None, None, "none", "none", "none"],
        },
        "whorlB": {
            "art": ["none", "none", None, None, None, None, None, None, None,
                    None, None, "none", "none", "none"],
        },
        # The cone only appears at full height. Horsetail's fertile shoots come up before
        # the green ones, and this is the sprite acknowledging it has two forms.
        "cone": {
            "art": [None, None, None, None, None, None, "on", "on", "on", "on",
                    None, None, None, None],
            "dy": [0, 0, 0, 0, 0, 0, 2, 1, 0, 0, 0, 0, 0, 0],
        },
    },
    "palette": PALETTE,
}
