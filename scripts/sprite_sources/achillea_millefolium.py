"""Yarrow (Achillea millefolium) - creature portrait sprite.

THE DESIGN HOOK: yarrow wears a flat-topped umbel of tiny white florets like a wide
brimmed hat, over foliage so finely divided the species is named for it - millefolium,
thousand leaf. So the creature is a small figure under a white canopy, peering out from
beneath the brim, with feathery fronds for arms.

Measured from the card panel: the flower is white with a trace of yellow and a trace of
pink, and there is no single round head - the umbel is broad and flat. That is why this
species does NOT reuse the dandelion's body plan, where the flower IS the face.

WHERE THE FACE GOES. On the plant's most recognisable structure where that structure can
hold one, and immediately below it where it cannot. A yarrow umbel is four pixels tall at
this resolution and could never carry a pair of eyes, so the face sits on the body under
the brim. Same rule, different answer - that is the point of having a rule.

PERSONALITY: shy and watchful. Its trademark gesture is HIDING - the brim comes down
over the face and only the lower halves of the eyes peek back out, before it decides you
are all right and smiles.

Originally: Yarrow is the deck's Rare card and a battlefield herb,
so it holds still more than the dandelion does: a slow sway, a long look out from under
the brim, and a slow blink. It never leaves the ground. Where the dandelion bounces, this
one breathes.

SAFETY: a portrait, never an identification aid. Yarrow's card carries a look-alike
warning, and this sprite is deliberately stylised - the card art and the identification
section remain the reference for anyone actually looking at a plant outdoors.
"""

from _flowerhead import flower_head

# Authored at 32x28, the house size.
PALETTE = {
    "o": (74, 48, 92, 255),      # outline
    "W": (255, 255, 255, 255),   # floret highlight, and the eye glint
    "w": (239, 232, 250, 255),   # floret mid
    "v": (201, 184, 236, 255),   # floret deep
    "V": (132, 98, 212, 255),   # floret shadow
    "y": (228, 198, 113, 255),   # floret eye, the yellow centre
    "p": (232, 136, 161, 255),   # the trace of pink the card carries
    "G": (94, 220, 70, 255),   # foliage light
    "g": (58, 178, 44, 255),    # foliage mid
    "d": (37, 123, 32, 255),     # foliage dark
    "n": (36, 106, 36, 255),      # foliage shadow
    "F": (233, 244, 226, 255),   # face, a cool pale green
    "E": (86, 58, 104, 255),     # eye
    "c": (240, 168, 180, 255),   # cheek
}

UMBEL_W, UMBEL_H = 27, 13


def _umbel(rx=9.8, ry=5.4, light=(-0.85, -0.65)):
    # lobes high and amp low: many shallow scallops, which is what a cluster of tiny
    # florets looks like in silhouette. face_rx 0 means no face - the brim wears none.
    return flower_head(
        UMBEL_W, UMBEL_H, 13.0, 5.6, rx, ry, 11, 0.19, 0, 0,
        light=light, trim_tail=False, chars="Wwv VFo".replace(" ", ""),
    )


UMBEL = _umbel()
UMBEL_TILT_L = _umbel(light=(-0.35, -0.65))
UMBEL_TILT_R = _umbel(light=(-1.25, -0.65))
# Squashed a touch for the settle at the bottom of the sway.
UMBEL_SETTLE = _umbel(rx=10.3, ry=4.9)

BODY_W, BODY_H = 15, 19


def _body(face_dx=0.0, light=(-0.85, -0.65)):
    return flower_head(
        BODY_W, BODY_H, 7.0, 9.0, 6.6, 8.8, 0, 0.0, 5.0, 5.6,
        face_dx=face_dx, light=light, trim_tail=False, chars="GgdnFo",
    )


BODY = _body()
BODY_LEFT = _body(face_dx=-1.6, light=(-0.35, -0.65))
BODY_RIGHT = _body(face_dx=1.6, light=(-1.25, -0.65))

# A trace of yellow and pink at the centre of the brim - the two accents the card
# actually carries, and the thing that stops the umbel reading as a plain white disc.
FLORET_DOTS = [
    "y p  y  p y",
]

EYES_OPEN = [
    "WE   WE",
    "EE   EE",
]

# A slow blink for a slow plant: half, closed, half.
EYES_HALF = [
    "oo   oo",
    "EE   EE",
]

EYES_CLOSED = [
    "       ",
    "EE   EE",
]

CHEEKS = [
    "c     c",
]

CHEEKS_HIDDEN = [
    "       ",
]

# Level and unbothered. The only change across the whole loop is a slight set at the
# corners once it has finished looking and is satisfied.
MOUTH_LEVEL = [
    "ooooo",
]

MOUTH_SET = [
    "o   o",
    " ooo ",
]

# Finely divided fronds - millefolium. Rendered as a spine with short teeth either side
# rather than a solid blade, which is what makes them read as feathery at 32px.
FROND_L = [
    "    ododo",
    " ododGGGGo",
    "oGGGGGGGgo",
    " odogdodo",
    "  o o o",
]

FROND_L_UP = [
    "       ododo",
    "   ododGGGGo",
    " oGGGGGGGGgo",
    "  ododogdodo",
    "   o o o o",
]

FROND_R = [
    "ododo",
    "oGGGGodo",
    "ogGGGGGGo",
    "ododgodo",
    "  o o o",
]

FROND_R_UP = [
    "ododo",
    "oGGGGodo",
    " ogGGGGGGGGo",
    "  ododgodod o",
    "     o o o o",
]

STEM = [
    "ogGgo",
    "ogGgo",
    "odgdo",
    " ooo ",
]

SPRITE = {
    "herbId": "achillea-millefolium",
    "personality": "capable",
    "size": (32, 28),
    "frames": 14,
    "fps": 8,
    # Back to front: stem, fronds, body, the brim over it, then face details. The umbel
    # is drawn AFTER the body so it genuinely overhangs the face, which is what sells the
    # figure as standing under it.
    "parts": [
        {"name": "stem", "origin": (14, 22), "rows": STEM},
        {
            "name": "frondL",
            "origin": (0, 17),
            "rows": FROND_L,
            "variants": {"up": FROND_L_UP},
        },
        {
            "name": "frondR",
            "origin": (21, 17),
            "rows": FROND_R,
            "variants": {"up": FROND_R_UP},
        },
        {
            "name": "body",
            "origin": (9, 9),
            "rows": BODY,
            "variants": {"left": BODY_LEFT, "right": BODY_RIGHT},
        },
        {
            "name": "umbel",
            "origin": (3, 1),
            "rows": UMBEL,
            "variants": {"left": UMBEL_TILT_L, "right": UMBEL_TILT_R, "settle": UMBEL_SETTLE},
        },
        {"name": "dots", "origin": (11, 6), "rows": FLORET_DOTS},
        {
            "name": "eyes",
            "origin": (13, 16),
            "rows": EYES_OPEN,
            "variants": {"blink": EYES_CLOSED, "half": EYES_HALF},
        },
        {
            "name": "cheeks",
            "origin": (13, 19),
            "rows": CHEEKS,
            "variants": {"hidden": CHEEKS_HIDDEN},
        },
        {
            "name": "mouth",
            "origin": (14, 20),
            "rows": MOUTH_LEVEL,
            "variants": {"set": MOUTH_SET},
        },
    ],
    #
    #  frame  0     1      2      3      4      5     6     7      8      9     10    11
    #       rest sway-R look-R  hold  sway-L look-L hold  settle  --   blink  --    --
    #
    # 8fps and no jump: this one breathes where the dandelion bounces.
    #
    #  0    1     2     3     4      5      6      7     8     9    10    11   12   13
    # rest sway> sway< sink  HIDE   HIDE  peek  peek  rise  smile smile bow  bow  rest
    #
    # The hide is frames 4-7 and it is this sprite's trademark: the brim comes right
    # down over the face and only the lower halves of the eyes come back out. Frame 0 is
    # the rest pose reduced motion freezes on.
    #
    #  0    1     2     3     4     5     6     7     8     9    10    11   12   13
    # rest TIP   scan> scan> HOLD  sweep sweep HOLD  level blink set   set  rest rest
    #
    # The scan is frames 1-7 and it is this sprite's trademark: the brim tips up like
    # someone shading their eyes, then a long unhurried sweep right across to left with
    # a real hold at each end. The holds are what make it read as watching rather than
    # as swaying. Frame 0 is the rest pose reduced motion freezes on.
    "motion": {
        # The brim TIPS rather than dropping: it lifts on the leading side, the way a hat
        # goes back off the brow to look at something far away.
        "umbel": {
            "art": [None, "right", "right", "right", "right", None, "left", "left",
                    None, None, None, None, None, None],
            "dx": [0, 1, 2, 3, 3, 0, -3, -3, 0, 0, 0, 0, 0, 0],
            "dy": [0, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        "dots": {
            "dx": [0, 1, 2, 3, 3, 0, -3, -3, 0, 0, 0, 0, 0, 0],
            "dy": [0, -1, -1, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0],
        },
        # The stem bends into the turn and holds it. `lean` shears rather than slides, so
        # it reads as a plant turning to face something, not a sticker dragged sideways.
        "body": {
            "art": [None, None, "right", "right", "right", None, "left", "left",
                    None, None, None, None, None, None],
            "dx": [0, 0, 1, 1, 1, 0, -1, -1, 0, 0, 0, 0, 0, 0],
            "lean": [0, 1, 1, 2, 2, 0, -2, -2, 0, 0, 0, 0, 0, 0],
        },
        # Eyes travel further than the head - looking ahead of the turn, which is what
        # makes it a scan rather than a swivel.
        "eyes": {
            "art": [None, None, None, None, None, None, None, None, None, "blink",
                    "half", None, None, None],
            "dx": [0, 1, 4, 4, 4, 0, -4, -4, 0, 0, 0, 0, 0, 0],
        },
        "cheeks": {
            "dx": [0, 1, 4, 4, 4, 0, -4, -4, 0, 0, 0, 0, 0, 0],
        },
        # Level throughout, with a small set at the end: satisfied, not delighted.
        "mouth": {
            "art": [None, None, None, None, None, None, None, None, None, None,
                    "set", "set", "set", None],
            "dx": [0, 1, 4, 4, 4, 0, -4, -4, 0, 0, 0, 0, 0, 0],
        },
        # The fronds counterbalance the turn, trailing behind it. They never pull in;
        # this creature is not making itself small.
        "frondL": {
            "art": [None, None, None, "up", "up", None, None, None, None, None, None,
                    None, None, None],
            "dx": [0, 0, 1, 1, 1, 0, -1, -1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        },
        "frondR": {
            "art": [None, None, None, None, None, None, "up", "up", None, None, None,
                    None, None, None],
            "dx": [0, 0, 1, 1, 1, 0, -1, -1, 0, 0, 0, 0, 0, 0],
            "dy": [0, 0, 0, 0, 0, 0, -1, -1, 0, 0, 0, 0, 0, 0],
        },
    },
    "palette": PALETTE,
}
