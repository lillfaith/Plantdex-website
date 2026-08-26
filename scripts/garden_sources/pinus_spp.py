"""Pine (Pinus spp.) — Garden growth sprite.

GROWTH HABIT: woody, and the only thing in this prototype that becomes a TREE. Its
sequence is therefore the slowest to change shape and the one that gains a trunk — a
dandelion is as tall at stage 3 as it will ever be, while a pine at stage 3 is visibly a
young tree that would keep going.

  sprout    a seedling: the whorl of needle-like cotyledons a pine germinates with
  growing   a sapling — a woody stem with two tiers of branches
  flowering a small conifer: three tiers, a leader at the top, and one cone

WHY THE SPROUT IS A STARBURST. A pine seedling does not push up two round seed leaves; it
comes up wearing a ring of narrow cotyledons, which is instantly not-a-herb and is the
cheapest way to say "this one is a tree" at seven pixels tall. Getting that right is most
of what stops all 45 species starting life as the same green sprout.

THE SILHOUETTE DOES THE WORK. Pine is read by outline before anything else — tiers of
branches narrowing to a leader — so the tiers are drawn as distinct steps rather than a
smooth triangle, and each tier droops slightly at its tips. A smooth triangle is a
Christmas-tree icon; the steps are what make it a pine.

"Flowering" is the Garden's word for the mature stage across every species, and a conifer
does not flower — so maturity is marked with a CONE, which is the true equivalent and is
also the thing a person actually finds under a pine.
"""

PALETTE = {
    "o": (74, 48, 92, 255),      # shared outline
    "N": (122, 174, 128, 255),   # needle light
    "n": (84, 132, 96, 255),     # needle mid
    "k": (56, 96, 72, 255),      # needle shadow — pine is the deck's darkest, coolest green
    "B": (150, 112, 82, 255),    # bark light
    "b": (108, 78, 58, 255),     # bark dark
    "C": (168, 130, 92, 255),    # cone light
    "c": (120, 88, 62, 255),     # cone dark
}

# The germinating whorl: narrow cotyledons radiating from one point. Not a leaf pair.
SPROUT = [
    " o  o  o ",
    "oNooNooNo",
    " onnknno ",
    "  onkno  ",
    "   oBo   ",
    "   oBo   ",
    "   ooo   ",
]

# A sapling: woody stem, two tiers, already stepped rather than conical.
GROWING = [
    "    ooo    ",
    "   oNkNo   ",
    "  onNkNno  ",
    "   okBko   ",
    "  o oBo o  ",
    " oNnokoNno ",
    "onNkkBkkNno",
    " okkkBkkko ",
    "   obBbo   ",
    "    oBo    ",
    "    obo    ",
    "    ooo    ",
]

# A young pine: leader, three tiers widening downward, one cone hanging off the middle tier.
FLOWERING = [
    "        o        ",
    "       oNo       ",
    "      onNno      ",
    "      okNko      ",
    "     ookkoo      ",
    "    oNnkkNNo     ",
    "   onNkkkkNno    ",
    "    okkkkkko     ",
    "     ooBBoo      ",
    "   o  oBBo  o    ",
    "  oNnookBkoonNo  ",
    " onNkkkkBkkkkNno ",
    "  okkkkoBkoCkko  ",
    "   oookoBkoCco   ",
    "  o    oBBo oo   ",
    " oNnoo okBko     ",
    "onNkkkkkBkkkkkno ",
    " okkkkkoBkokkko  ",
    "   oookoBBokoo   ",
    "       obBo      ",
    "       oBbo      ",
    "       obBo      ",
    "       oooo      ",
]

GARDEN = {
    "herbId": "pinus-spp",
    "palette": PALETTE,
    "note": "Woody. Cotyledon whorl, then a stepped sapling, then a tiered young tree with a cone.",
    "stages": {
        "sprout": SPROUT,
        "growing": GROWING,
        "flowering": FLOWERING,
    },
}
