# Creature growth stages

**Status: 35 of 45 species staged.** The other 10 show their single adult portrait at every
stage, which is what the whole site did before this existed — so shipping this partial makes
nothing worse than it was, and `spriteFor` resolves the fallback silently.

Every card's animated portrait is a creature. Staging gives thirty-five of them a **sprout** and a
**growing** version, so the character a player sees grows up with their own progress: on the
card page, in the Garden, and anywhere else a portrait is drawn.

## What a stage means

**Botanically** — the plant's own life, not three sizes of one picture:

| Stage | Mastery | What is drawn |
|---|---|---|
| `sprout` | discovered | Vegetative only. Leaves, and **no flower structure of any kind** — not a small one, not a pale one. A seedling has not made one, and drawing one anyway is inventing botany. |
| `growing` | learned | **In bud.** The flower exists and is closed: tight, green or only just showing colour through the bracts. This is the stage that earns the sequence, because a bud is a different *organ* from an open flower. |
| `flowering` | mastered | Open. The authored adult portrait, unchanged. |

**As a character** — the same creature throughout. Its face never goes and its personality
never changes; only its nerve and its strength. A younger stage performs the adult's own
gesture with the follow-through taken out. Whatever a species does that nothing else in the
set does — dandelion's full spin, clover's fourth leaflet — **stays with the open flower**,
so mastery buys something a player can actually see.

## Two things grow, and both are enforced

- **Height.** 60% → 80% → 100% of the adult's drawn height, in even steps, measured from the
  **ink** rather than the canvas (every stage shares one canvas, so the canvas says nothing).
- **Frame rate.** 60% → 80% → 100% of the adult's fps. Speed is strength: a young plant moves
  tentatively, a mature one with conviction, and that reads as the same creature growing
  *into* itself rather than as three different animations.

`build_sprites.py` fails the build on either — across 45 species this is exactly the sort of
consistency that drifts one plant at a time and is invisible until two are side by side.

## How a stage is authored

A **recipe**, not a third drawing. Authoring 16-frame performances three times over for 45
species is 135 character animations; that does not get finished, and half-finished is worse
than none. A stage declares only what is *different*:

```python
"stages": {
    "sprout": {
        "frames": 8,
        "fps": stage_fps(12, "sprout"),
        "hide": ["armL", "armR"],          # parts it has not grown
        "swap": {"head": ROSETTE, ...},    # organs that differ
        "variants": {...},                 # poses for a swapped part
        "origins": {**seat_young(AT, ROSETTE)},
        "motion": {...},                   # its own calmer loop
        "palette": BUD_PALETTE,            # colours only a bud needs
    },
}
```

Rules the build enforces rather than trusts:

- **Feature origins are measured**, via `_stages.seat_young` → `_face.on_face`. `flower_head`
  trims empty rows and shading moves the face patch, so the radii that produced a head do not
  tell you where its face landed. A stage reseats the whole face onto a *different organ*,
  which is precisely where a guessed origin puts an eye in a leaf.
- **Changing `frames` requires declaring `motion`.** `render_frame` wraps tracks with `%`, so
  a 6-frame stage would silently borrow frame 3 of the adult's 16-frame jump — plausible, and
  wrong.
- **A swapped part loses the adult's variants**, because they describe the open flower's
  poses and no longer fit the rows underneath them.
- `audit_sprites.py` renders every frame of every stage and fails on a feature pixel that
  landed off its face, or a resting pose drawn in more than one piece.

### The young face

`_stages.YOUNG_EYES` is `EYES["round"]`, **not** `EYES["big"]`. Big eyes on a small head is
the oldest shorthand for "young", but `big` needs 10px of face, and on a 15px seedling that
leaves the organ as a rim of green around a face — four species drawn that way came out as
four near-identical pale discs, which breaks the rule the deck rests on. Youth is carried by
**proportion** instead: a large head on a short plant. That leaves room for the leaf, bud or
frond that says which plant this is.

## Staged — 35 species

| Card | Species | Sprout | Growing |
|---|---|---|---|
| 01 | Dandelion | basal rosette, toothed from the start | one plump green bud on a hollow scape |
| 10 | Red Clover | trifoliate leaves, pale chevron already on them | the head closed — a green-white knot, before any pink |
| 33 | Yarrow | feathery basal rosette | the corymb formed and closed, flat-topped already |
| 12 | Wild Violet | heart leaves; the face rides a leaf, since there is no flower | the bud **nodding** on its hooked stalk |
| 14 | Broad Leaf Plantain | a flat rosette of small ribbed leaves, no spike | the spikes up but short and **green** |
| 08 | Stinging Nettle | two leaves and a stem, stinging already | catkins forming in the leaf axils, short and tight |
| 26 | Self-Heal | leaves only; the bitten notch already there | the club up and still **green**, before the hooded florets |
| 27 | Mullein | the **first-year rosette** — woolly, low, no spike at all | the spike up but short and grey-green, florets closed |
| 30 | Wild Strawberry | trifoliate leaves and a runner, no flower, no fruit | the flower closed, green-white — never a reddening berry |
| 32 | St John's Wort | leaves only; the face rides the **perforate** leaf | a narrow pointed bud, black dots already on the sepals |
| 13 | Chickweed | sprigs on a hairy stem — the **hairline** field mark from the start | three green ovoid buds on the same long pedicels the stars ride |
| 39 | Wild Geranium | the face rides the deeply cut **7-lobe palmate** leaf | the bud closed; **no beak**, because the cranesbill is the spent flower |
| 11 | Purple Dead Nettle | the purple flush already on the upper leaves | whorls of closed green-purple buds in the leaf axils |
| 21 | Chicory | the **first-year rosette**, toothed almost to the midrib | tight green spindles pressed close against the stem |
| 09 | Wood Sorrel | three notched heart leaflets and nothing else | a closed spindle bud upright on its own pedicel |
| 02 | Broadleaf Dock | the rosette, red midrib already on it, no seed stalk | the stalk up carrying **green** whorls, before any rust |
| 03 | Goldenrod | a leafy shoot — no plume, and nothing gold | the panicle formed and still **green**, folding only halfway |
| 04 | Ragweed | ferny dissected leaves; it itches, it cannot sneeze | the raceme up, nubs tight and green — it sneezes, nothing comes out |
| 05 | Lamb's Quarters | strap **cotyledons**, so it has no feet and cannot waddle | the goosefoot arrives: one step, not two |
| 06 | Purslane | two fat seed leaves; it swells barely and holds nothing | a real swell, one frame of holding it, one wobble |
| 07 | Garlic Mustard | the **first-year rosette**; it smells of garlic already, and does not creep | the cloud spreads and it leans — but it comes all the way back |
| 15 | Cleavers | one whorl, and it stays inside its own frame | two whorls, hooks out, reaching to the edge and stopping |
| 16 | Ground Ivy | one kidney leaf; no runner, so no company | the **runner goes out and nothing stands up on it** |
| 17 | Maple | one lobed leaf; a maple is years from fruiting | the keys paired and **green**, so it holds one out and cannot let go |
| 18 | Blackberry | the **first-year cane**: leaves, thorns, and nothing to offer | it offers a closed **bud** instead of a berry, and snatches that back |
| 19 | Sheep's Sorrel | arrowhead leaves, and **one** pucker instead of two | the spray up and still **green**, before the fruit rusts a hillside |
| 20 | Sumac | pinnate fronds, and no torch to raise | the panicle up in the cone's place, **greenish-yellow**; it does not light |
| 22 | Burdock | the **first-year rosette**: eager, and with no hooks at all | the burr **green**, hooks formed but soft, so nothing holds |
| 23 | Wild Mint | **one** frame of frost — green again before it can shiver | three frames and one shiver; the whorls still green knots |
| 24 | Catnip | it tips, and catches itself | all the way onto its **side**, and back — never onto its back |
| 25 | Shepherd's Purse | the rosette; no stalk, no purses, nothing to rattle | the stalk up, the flower head shut — it shakes it, and **nothing rattles** |
| 28 | Horsetail | **one** segment, so there is nothing to telescope | two segments, one hard click, and a short **shut** spore cone |
| 29 | Field Garlic | tubular leaves and no scape — the startle with no cause | the umbel still inside its papery **spathe**, hair and all |
| 31 | Elderberry | pinnate fronds and no hat, so the courtesy is a bare nod | the umbel **shut** and held up; it tips as far as a stiff hat goes |
| 34 | Jewelweed | face on a **leaf**, no pod — it flinches at nothing at all | the flower in bud, green with orange showing; still nothing to go off |

Yarrow's fronds are finely cut at *every* stage deliberately: its printed card warns about a
poisonous lookalike, and featheriness is what separates it from hemlock.

Three species wear their face **on the flower**, so a stage with no flower has to move it
onto the plant they do have. Violet's rides a heart leaf; St John's Wort's rides the
*perforate* leaf, which is luckier than it sounds — the pinprick translucent glands are the
trait the species is named for, so the seedling is arguably more on-species than the flower.
Wild Geranium's rides its deeply cut palmate leaf, drawn smaller than the adult's: at the
adult leaf's size the face simply swallowed the lobes, and the lobing is the identification.

Mullein is the species that stages itself: it is a **biennial**, so year one genuinely is a
woolly rosette and nothing else. Chicory is the second, and its rosette carries an extra
burden — a first-year chicory is routinely mistaken for a dandelion, so the toothing is cut
almost to the midrib from the start rather than softened into a generic seedling leaf.

Nettle is the opposite awkwardness — its flowers are inconspicuous green catkins in the leaf
axils rather than a bloom, so its middle stage grows them where they actually grow instead of
inventing a bud to fill the slot. Purple Dead Nettle and Chickweed take the same treatment
for the same reason: dead nettle's buds sit in axillary whorls, and chickweed's ride the same
long pedicels its open stars do.

Strawberry carries the one rule worth stating twice: **ripeness is the thing a picture of a
plant can get dangerously wrong**, so no stage before the last carries reddening fruit. Wild
Geranium is the same rule pointed backwards in time: its beak — the cranesbill it is named
for — is the *spent* flower, so it is hidden at **both** earlier stages. A seedling wearing a
seed pod is exactly as wrong as a seedling wearing a ripe berry.

A gesture grows into itself rather than appearing from nowhere. Wood Sorrel is the clearest
case: its trademark is folding its leaflets down over its own face and being *gone* for three
frames, and seedlings genuinely do fold too — just less. So the sprout tips half over for two
frames and never covers the face, the growing stage holds half-folded for four with the crown
leaflet shut on top, and only the adult disappears.

Four organs are **hand-drawn** rather than generated, and the reason generalises:
`flower_head` builds rounded, radial shapes, so anything that is neither comes out wrong.
Yarrow's corymb is a *flat plate* of tight buttons and a high lobe count fragments it; a
violet leaf is notched at its base and an ellipse has nowhere to put the notch; St John's
Wort's perforate leaf and Wild Geranium's seven-lobe palmate are both shapes whose whole
point is that they are not a circle. A hand-drawn grid with a plain `F` patch works
identically — `face_box` measures it the same way — so reach for one whenever the generator
is being bent out of shape.

## Still to stage — 10 species

A species is staged by adding a `"stages"` key to its module in `scripts/sprite_sources/`
and re-running `python3 scripts/build_sprites.py`; no component changes, because
`spriteFor(herbId, stage)` already resolves whatever exists.

| Card | Species | Herb id |
|---|---|---|
| 35 | Lemon Balm | `melissa-officinalis` |
| 36 | Bee Balm | `monarda-fistulosa` |
| 37 | Wild Rose | `rosa-spp` |
| 38 | Willow | `salix-spp` |
| 40 | Honeysuckle | `lonicera-japonica` |
| 41 | Pine | `pinus-spp` |
| 42 | Mulberry | `morus-spp` |
| 43 | Passion Flower | `passiflora-incarnata` |
| 44 | Prickly Lettuce | `lactuca-serriola` |
| 45 | Oak | `quercus-spp` |

```bash
python3 scripts/build_sprites.py
python3 scripts/build_sprites.py --preview taraxacum-officinale --stage sprout --frame 0
python3 scripts/audit_sprites.py            # every species, every stage, every frame
```
