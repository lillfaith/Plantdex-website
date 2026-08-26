# Garden growth art — the asset manifest

**Status: 5 of 45 species authored. The other 40 are listed at the bottom and still need
drawing.** This document is the honest ledger of that; nothing in the app pretends the set
is finished, and nothing in the repo is a placeholder dressed up as art.

The Garden used to draw every species as its creature portrait at three sizes — one plant
pretending to grow. Growth art replaces that with three separately drawn stages per species,
so a dandelion spreads sideways and stays low while a pine gains a trunk.

## Where the pieces live

| | |
|---|---|
| Authored source | `scripts/garden_sources/<scientific_name>.py` |
| Builder | `scripts/build_garden_sprites.py` |
| Output sheets | `public/cards/garden/<herb-id>.png` — **generated, never hand-edited** |
| Output manifest | `src/data/garden-sprites.json` — **generated** |
| Lookup | `src/lib/garden-sprites.ts` |
| Renderer | `src/components/garden/GrowthSprite.tsx` |
| Tests | `src/lib/garden-sprites.test.ts` |

```bash
python3 scripts/build_garden_sprites.py
python3 scripts/build_garden_sprites.py --preview taraxacum-officinale --stage growing
```

Adding a species is **one new file in `garden_sources/` and one re-run**. No component
changes, no path added anywhere — `GrowthSprite` asks the manifest by herb id and the
manifest answers or doesn't.

## The canvas

- **24 × 24 authored pixels**, shipped at **5×**, so one authored pixel is a 5 × 5 block and
  `image-rendering: pixelated` handles every size above that with no resampling.
- **Three stages on one horizontal sheet**, in `GROWTH_STAGES` order (`sprout`, `growing`,
  `flowering`). The renderer walks it with `background-position`; `background-size` is a
  percentage, so the same asset works in today's small Garden tile and, later, at any size
  in a larger Garden scene.
- **Bottom-anchored.** A species writes only the rows its plant occupies and the builder pads
  the top, so a tall pine and a low wood sorrel stand on the same ground line. This is what
  makes a row of different species read as one planting rather than a row of stickers.
- **Centred once, by the widest row of the whole stage** — never per row, which shears the
  drawing and puts a kink in a stem that was authored straight.

## The rules

- **No sprite draws its own ground, background, border, frame or text.** A sprite is the
  plant alone on transparency. A shared base bar counts as ground: stalks get their own
  small feet and connect to each other through the plant, not through a shelf.
- **Every stage must be ONE CONNECTED PIECE**, four-connected — a diagonal touch is not a
  join. Enforced by `check_connected()` in the builder, which fails the build. This is not
  optional politeness: the art is a list of strings, so a flower stalk that stops two rows
  above the leaves reads perfectly fine as text and looks broken as a picture. It has caught
  two real defects already.
- **These are not the portraits, scaled.** A portrait shrunk to a third is a blurry
  portrait; a portrait at three sizes is one plant pretending to grow. Each stage is drawn
  separately, showing what that species actually looks like at that point in its life.
- **The habit is the point.** If two species' silhouettes are interchangeable, one of them
  is wrong. Dandelion spreads flat, yarrow goes straight up, pine builds a trunk, violet
  stays low and gets denser, bramble arches. That difference is the entire reason this
  system exists.
- **The identifying trait appears from stage 1.** Yarrow is feathery at seven pixels tall;
  violet's leaf is heart-shaped in its first leaf; bramble has a prickle before it has a
  cane. A generic green sprout in stage 1 wastes a third of the sequence.
- **Palette comes from the species' own portrait**, so the Garden and the Herbdex are
  visibly the same universe, and the shared outline `(74, 48, 92)` stays shared.
- **No invented botany, and no gesture that implies a medicinal effect** — same rule as the
  deck data. Ripeness is the sharp edge here: no half-coloured fruit at an early stage that
  could read as "ready".
- **"Flowering" is the Garden's word for the mature stage across all 45.** A species that
  does not flower marks maturity with its own true equivalent — pine gets a cone.

## Authoring a species

A source module exports one `GARDEN` dict:

```python
GARDEN = {
    "herbId": "taraxacum-officinale",   # must match the deck; a typo silently does nothing
    "palette": {"o": (74, 48, 92, 255), ...},   # char -> RGBA
    "note": "One line on the sequence. Internal; never rendered.",
    "stages": {"sprout": [...], "growing": [...], "flowering": [...]},
}
```

Each stage is a list of equal-purpose strings, one character per pixel, `" "` transparent.
Preview as text, then **always run the plain build before committing** — `--preview` renders
without writing, so it is entirely possible to tweak a sprite, preview it, and commit the
previous PNG. That already shipped a strawberry two pixels out of place in the portrait set.

## Authored — 5 species

| Card | Species | Herb id | Why it was chosen |
|---|---|---|---|
| 01 | Dandelion | `taraxacum-officinale` | Flat rosette — spreads sideways, never gains height |
| 12 | Wild Violet | `viola-sororia` | Stemless clump — gets denser rather than taller |
| 18 | Blackberry | `rubus-spp` | Arching cane — a curve, not a vertical |
| 33 | Yarrow | `achillea-millefolium` | Upright stem, flat-topped corymb |
| 41 | Pine | `pinus-spp` | Woody — the only one that becomes a tree |

Five deliberately different habits, to prove the system can tell them apart before the other
forty are drawn to it.

## Still to draw — 40 species

Until a species appears here as authored, the Garden falls back to what it showed before
this system existed: the card crop (`herb.sprite`), scaled by stage. That fallback is not
good — it carries the printed card's purple background baked into the image, so it sits
beside a transparent growth sprite like a sticker on the bed. It is kept anyway, because
both alternatives are worse. A shared generic sprout would make forty species identical,
which is the exact failure this system exists to end; and the animated portrait, though
transparent, is a *creature with a face*, which this brief rules out. Leaving the fallback
untouched is also what makes it safe to ship five species instead of forty-five: nothing
looks worse than it did yesterday.

| Card | Species | Herb id |
|---|---|---|
| 02 | Broadleaf Dock | `rumex-obtusifolius` |
| 03 | Goldenrod | `solidago-canadensis` |
| 04 | Ragweed | `ambrosia-artemisiifolia` |
| 05 | Lamb's Quarters | `chenopodium-album` |
| 06 | Purslane | `portulaca-oleracea` |
| 07 | Garlic Mustard | `alliaria-petiolata` |
| 08 | Stinging Nettle | `urtica-dioica` |
| 09 | Wood Sorrel | `oxalis-stricta` |
| 10 | Red Clover | `trifolium-pratense` |
| 11 | Purple Dead Nettle | `lamium-purpureum` |
| 13 | Chickweed | `stellaria-media` |
| 14 | Broad Leaf Plantain | `plantago-major` |
| 15 | Cleavers | `galium-aparine` |
| 16 | Ground Ivy | `glechoma-hederacea` |
| 17 | Maple | `acer-spp` |
| 19 | Sheep's Sorrel | `rumex-acetosella` |
| 20 | Sumac | `rhus-spp` |
| 21 | Chicory | `cichorium-intybus` |
| 22 | Burdock | `arctium-lappa` |
| 23 | Wild Mint | `mentha-canadensis` |
| 24 | Catnip | `nepeta-cataria` |
| 25 | Shepherd's Purse | `capsella-bursa-pastoris` |
| 26 | Self-Heal | `prunella-vulgaris` |
| 27 | Mullein | `verbascum-thapsus` |
| 28 | Horsetail | `equisetum-arvense` |
| 29 | Field Garlic | `allium-vineale` |
| 30 | Wild Strawberry | `fragaria-virginiana` |
| 31 | Elderberry | `sambucus-spp` |
| 32 | St. John's Wort | `hypericum-perforatum` |
| 34 | Jewelweed | `impatiens-capensis` |
| 35 | Lemon Balm | `melissa-officinalis` |
| 36 | Bee Balm | `monarda-fistulosa` |
| 37 | Wild Rose | `rosa-spp` |
| 38 | Willow | `salix-spp` |
| 39 | Wild Geranium | `geranium-maculatum` |
| 40 | Honeysuckle | `lonicera-japonica` |
| 42 | Mulberry | `morus-spp` |
| 43 | Passion Flower | `passiflora-incarnata` |
| 44 | Prickly Lettuce | `lactuca-serriola` |
| 45 | Oak | `quercus-spp` |

## Animation

One, and only on the last stage: a 1.6° sway over 4.2s, pivoting at the soil — a plant
settling in a draught, not a plant waving. A seedling holds perfectly still, so movement is
also a signal that a plant is finished. Disabled entirely under `prefers-reduced-motion`;
`background-position` must **not** be reset there the way the portraits' is, because it is
what selects the growth stage.
