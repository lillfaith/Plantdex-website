"""Honeysuckle (Lonicera japonica) - creature portrait sprite.

THE DESIGN HOOK: everybody who has met this plant has done the same thing - pinched off
the base of a flower, drawn the style out through it, and tasted the single drop of nectar
on the end. It is possibly the most widely shared piece of hands-on botany there is, and
it is the whole reason honeysuckle is in a foraging deck.

The flowers open white and age to gold, so a vine in flower carries both colours at once,
which is the field mark and also gives this sprite two palettes for free.

WHERE THE FACE GOES: in the paired tubular flowers, which are long and curved and quite
unlike anything else in this deck.

PERSONALITY: sweet-toothed. Its trademark gesture is THE SIP - a bead of nectar swells at
the tip of a flower, and it drinks it. It is the only sprite that consumes anything, and
the only one whose gesture is the thing a person does with the plant rather than something
the plant does by itself.

SAFETY: a portrait, never an identification aid, and this one has a real edge to it -
honeysuckle BERRIES are not the flowers and are not safe, and other vines look similar.
The card's identification and safety content are the reference.
"""

from _face import FACE_PALETTE, feature_parts
from _flowerhead import flower_head

PALETTE = {
    **FACE_PALETTE,
    "W": (255, 255, 255, 255),   # eye glint, and the newly opened white flower
    "V": (253, 251, 235, 255),   # petal highlight - opens white
    "v": (249, 232, 179, 255),   # petal mid
    "Y": (234, 212, 146, 255),   # petal aged to gold, which they all do on day two
    "y": (223, 181, 85, 255),    # gold deep
    "u": (193, 144, 51, 255),    # petal shadow
    "N": (249, 239, 177, 255),   # the nectar bead
    "G": (91, 211, 94, 255),   # leaf highlight
    "g": (68, 166, 79, 255),    # leaf mid
    "d": (50, 124, 63, 255),     # leaf deep
    "n": (41, 85, 52, 255),      # leaf shadow
    "t": (168, 118, 68, 255),    # the woody vine
    "s": (252, 247, 212, 255),   # stamens - paler than the petals so they read against them
}

HEAD_W, HEAD_H = 19, 15


def _head(face_dx=0.0, light=(-0.85, -0.65), chars="VvyuFo"):
    """The flared LIP of the flower, which is what a honeysuckle actually shows you.

    Wide and shallow rather than round, with five deep lobes - four fused into an upper
    lip and one hanging below - because that two-lipped split is the shape you recognise
    a honeysuckle by across a hedge. Drawn as a disc it was just another pale flower.
    """
    return flower_head(
        HEAD_W, HEAD_H, 9.0, 7.0, 8.6, 5.8, 5, 0.30, 5.0, 4.0,
        face_dx=face_dx, light=light, trim_tail=False, chars=chars,
    )


HEAD = _head()
HEAD_LEFT = _head(face_dx=-1.5, light=(-0.35, -0.65))
HEAD_RIGHT = _head(face_dx=1.5, light=(-1.25, -0.65))
# Aged to gold. Honeysuckle flowers open white and turn within a day or two, so a vine
# carries both at once - which is the identification, and here it is also the payoff:
# the flower it drinks from is the one that has gone gold.
HEAD_GOLD = _head(chars="YyuuFo")

# The second flower of the pair. Honeysuckle carries them in TWOS from a single leaf
# axil, which is half the identification, so this one is drawn as a full flower on its own
# long tube rather than as a blob - and its tube reaches back to the same node the first
# one grows from, which is what makes the pair a pair.
TUBE = [
    "   ooo",
    "  oVVvo",
    " oVVvvuo",
    "  ovvuo",
    "  ouuo",
    "  otto",
    "  otto",
    " oott",
    "oott",
]

TUBE_GOLD = [
    "   ooo",
    "  oYYyo",
    " oYYyyuo",
    "  oyyuo",
    "  ouuo",
    "  otto",
    "  otto",
    " oott",
    "oott",
]

# The long protruding stamens. This is the single most recognisable thing about a
# honeysuckle flower and the first version simply did not have them - five fine filaments
# curving out and up well beyond the petals, like whiskers.
STAMENS = [
    "s       s",
    "s       s",
    " s     s",
    "  s   s",
    "  os so",
    "   ooo",
]

# The flower's own tube, running from the lip back down to the vine. Without it the lip
# was a face floating beside a plant it was not attached to.
THROAT = [
    "ouuo",
    "ouuo",
    "otto",
    "otto",
    "ootto",
    " oott",
]

# The bead of nectar, swelling and then gone. It is four pixels at its largest, which is
# the correct size for the thing everybody remembers.
BEAD_NONE = [
    " ",
]

BEAD_SMALL = [
    "N",
]

BEAD_FULL = [
    "NN",
    "oN",
]

# Opposite oval leaves, clasping the vine - honeysuckle's are in pairs at every node, and
# each is drawn with a short stalk that reaches the vine rather than hanging beside it.
LEAF_L = [
    "  oooo",
    " oGGGgo",
    "oGgggddo",
    " oggddnoo",
    "  ooootto",
]

LEAF_R = [
    "  oooo",
    " oGGGgo",
    "oGgggddo",
    "ooggddno",
    "otooooo",
]

# The twining vine, running the height of the frame. Everything here hangs off it.
VINE = [
    "  ottto",
    "  ottto",
    " oottto",
    " ottto",
    "ottto",
    "ottto",
    "ottt o",
    "ottto",
]

HEAD_AT = (1, 6)

SPRITE = {
    "herbId": "lonicera-japonica",
    "personality": "sweet-toothed",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    "parts": [
        {"name": "vine", "origin": (13, 19), "rows": VINE},
        {"name": "leafL", "origin": (4, 22), "rows": LEAF_L},
        {"name": "leafR", "origin": (19, 22), "rows": LEAF_R},
        {"name": "throat", "origin": (11, 14), "rows": THROAT},
        {
            "name": "tube",
            "origin": (18, 8),
            "rows": TUBE,
            "variants": {"gold": TUBE_GOLD},
        },
        {
            "name": "head",
            "origin": HEAD_AT,
            "rows": HEAD,
            "variants": {"left": HEAD_LEFT, "right": HEAD_RIGHT, "gold": HEAD_GOLD},
        },
        {"name": "stamens", "origin": (8, 3), "rows": STAMENS},
        *feature_parts(
            HEAD_AT, HEAD, eyes="round", mouth="small", eye_dy=2, mouth_dy=5,
            extra_mouths={"sip": ["oo", "NN"], "content": ["o  o", " oo "]},
        ),
        {
            "name": "bead",
            "origin": (22, 12),
            "rows": BEAD_NONE,
            "variants": {"small": BEAD_SMALL, "full": BEAD_FULL},
        },
    ],
    #
    #  0    1     2      3      4      5     6     7     8      9      10   11   12    13
    # rest notice BEAD   BEAD   lean   lean  SIP   SIP  gone  content content rest blink rest
    #
    # The sip is frames 6-7 and it is this sprite's trademark: the bead swells over two
    # frames, the creature leans across, and on frame 8 the bead is simply GONE. Watching
    # it shrink would be watching it evaporate; vanishing is the only way to draw
    # something being drunk. Frame 0 is the rest pose reduced motion freezes on: no bead,
    # nothing being taken from anybody.
    "motion": {
        "head": {
            "art": [None, "right", "right", "right", "right", "right", "right",
                    "right", None, "gold", "gold", None, None, None],
            "dx": [0, 0, 0, 0, 1, 2, 3, 3, 1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "eyes": {
            "art": [None, None, "wide", "wide", "wide", "wide", "shut", "shut",
                    None, "happy", "happy", None, "blink", None],
            "dx": [0, 2, 2, 2, 3, 4, 5, 5, 1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 1, 1, 2, 3, 4, 4, 1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "mouth": {
            "art": [None, None, None, None, None, None, "sip", "sip", None,
                    "content", "content", "content", None, None],
            "dx": [0, 1, 1, 1, 2, 3, 4, 4, 1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        # The tube it drinks from is the one that has aged to gold, which is the older
        # flower and the one with the nectar in it. That is not decoration - it is why
        # this flower and not the other one.
        "tube": {
            "art": [None, None, "gold", "gold", "gold", "gold", "gold", "gold",
                    "gold", "gold", "gold", "gold", "gold", None],
            "dy": [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "bead": {
            "art": [None, None, "small", "full", "full", "full", "full", "full",
                    None, None, None, None, None, None],
            "dy": [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        # The throat and stamens are part of the flower's own body, so they travel with
        # the head exactly - a lip that leans while its own tube stays put would tear.
        "throat": {
            "dx": [0, 0, 0, 0, 1, 2, 3, 3, 1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "stamens": {
            "dx": [0, 0, 0, 0, 1, 2, 3, 3, 1, 0, 0, 0, 0, 0],
            "dy": [0, -1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0],
        },
        "leafL": {"lean": [0, 1, 1, 0, 0, -1, -1, 0, 0, 1, 0, 0, 0, 0]},
        "leafR": {"lean": [0, -1, -1, 0, 0, 1, 1, 0, 0, -1, 0, 0, 0, 0]},
    },
    "palette": PALETTE,
}
