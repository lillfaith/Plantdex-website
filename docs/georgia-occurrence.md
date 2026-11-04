# Georgia occurrence research — the printed deck

**Read-only research. Nothing was written to any database and no migration was applied.**

**Source:** GBIF occurrence search (`api.gbif.org/v1/occurrence/search`), queried
2026-11-04 against GADM boundary `USA.11_1` (Georgia, US — resolved by name, not
hard-coded). Produced by `scripts/ga_occurrence.py` via the
`Georgia occurrence research` workflow; the full JSON is that run's artifact.

**Invasive listings were not used.** `REGIONAL_STATUS` in `src/lib/invasive-status.ts`
records Georgia Invasive Species Council listings, which are a different fact: a species can
be listed and locally scarce, or abundant and unlisted. None of it informs the table below.

## The rule, applied uniformly

| Class | Rule |
|---|---|
| `confirmed` | ≥5 preserved specimens **or** ≥100 human observations in Georgia |
| `likely` | ≥1 record, below those thresholds |
| `insufficient` | no records — **not** evidence of absence |
| `unlikely` | **never assigned by this survey.** It is a positive claim and needs an authority |

A herbarium specimen weighs more than an observation because it is a physical sheet,
determined by a botanist and re-checkable; an app record's identification may never have been
reviewed. Both are evidence, not the same weight.

## Result across the deck

36 species carry a binomial (the nine `Genus spp.` cards name no species and cannot have an
occurrence record). Of those: **31 confirmed, 4 likely, 1 insufficient.**

## Recommended launch collection — 12 species

Every one is `confirmed` occurrence, `strong` or `mixed` card evidence, and spread across
four accessible habitats and all four rarities.

| # | Card | Accepted name | Herbarium | Observations | Occurrence | Evidence | Habitat | Rarity | Months recorded |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Dandelion | *Taraxacum officinale* | 21 | 18 | `confirmed` | strong | wayside | Common | spring,winter |
| 13 | Chickweed | *Stellaria media* | 37 | 471 | `confirmed` | strong | garden | Common | spring,winter |
| 14 | Broad Leaf Plantain | *Plantago major* | 11 | 62 | `confirmed` | strong | wayside | Common | spring,summer,winter |
| 5 | Lamb's Quarters | *Chenopodium album* | 23 | 51 | `confirmed` | strong | garden | Common | spring,summer,autumn |
| 6 | Purslane | *Portulaca oleracea* | 9 | 164 | `confirmed` | strong | garden | Common | summer,autumn |
| 26 | Self-Heal | *Prunella vulgaris* | 51 | 1052 | `confirmed` | strong | meadow | Uncommon | spring,summer |
| 27 | Mullein | *Verbascum thapsus* | 24 | 838 | `confirmed` | strong | wayside | Uncommon | spring,summer,autumn |
| 33 | Yarrow | *Achillea millefolium* | 19 | 161 | `confirmed` | strong | meadow | Rare | spring,summer |
| 43 | Passion Flower | *Passiflora incarnata* | 76 | 2117 | `confirmed` | strong | wayside | Epic | spring,summer,autumn |
| 12 | Wild Violet | *Viola sororia* | 76 | 27 | `confirmed` | mixed | woodland | Common | spring |
| 15 | Cleavers | *Galium aparine* | 29 | 553 | `confirmed` | mixed | woodland | Common | spring |
| 10 | Red Clover | *Trifolium pratense* | 18 | 586 | `confirmed` | mixed | meadow | Common | spring,summer |

**Habitats:** wayside 4, garden 3, meadow 3, woodland 2.
**Rarities:** Common 8, Uncommon 2, Rare 1, Epic 1 — a pyramid, with Passion Flower as the
one genuinely exciting find (76 specimens and 2,117 observations: abundant *and* striking).

**Wetland is deliberately absent.** The four wetland species are Jewelweed (`revise`),
Horsetail (6 specimens, 1 observation), Stinging Nettle (`likely`, 3 records) and Wild Mint
(zero records). None is a good first-board entry, and sending beginners into wetlands is a
safety and habitat-disturbance question we do not need to open at launch.

## Everything else, and why it is not in the launch set

| # | Card | Accepted name | Herbarium | Observations | Occurrence | Evidence | Habitat | Rarity | Months recorded |
|---|---|---|---|---|---|---|---|---|---|
| 40 | Honeysuckle | *Lonicera japonica* | 43 | 2157 | `confirmed` | mixed | woodland | Rare | spring |
| 34 | Jewelweed | *Impatiens capensis* | 27 | 1405 | `confirmed` | revise | wetland | Rare | spring,summer,autumn |
| 16 | Ground Ivy | *Glechoma hederacea* | 8 | 1018 | `confirmed` | mixed | garden | Common | spring |
| 11 | Purple Dead Nettle | *Lamium purpureum* | 23 | 1000 | `confirmed` | hold | garden | Common | spring,winter |
| 39 | Wild Geranium | *Geranium maculatum* | 40 | 827 | `confirmed` | mixed | woodland | Rare | spring |
| 4 | Ragweed | *Ambrosia artemisiifolia* | 72 | 741 | `confirmed` | revise | wayside | Common | spring,summer,autumn |
| 29 | Field Garlic | *Allium vineale* | 13 | 372 | `confirmed` | revise | meadow | Uncommon | spring,summer |
| 36 | Bee Balm | *Monarda fistulosa* | 22 | 340 | `confirmed` | mixed | meadow | Rare | spring,summer |
| 35 | Lemon Balm | *Melissa officinalis* | 0 | 186 | `confirmed` | strong | garden | Rare | spring,summer |
| 2 | Broadleaf Dock | *Rumex obtusifolius* | 6 | 98 | `confirmed` | mixed | meadow | Common | spring,summer |
| 21 | Chicory | *Cichorium intybus* | 6 | 78 | `confirmed` | hold | wayside | Uncommon | summer,autumn |
| 25 | Shepherd's Purse | *Capsella bursa-pastoris* | 14 | 64 | `confirmed` | mixed | garden | Uncommon | spring,winter |
| 9 | Wood Sorrel | *Oxalis stricta* | 53 | 21 | `confirmed` | revise | garden | Common | spring,summer |
| 44 | Prickly Lettuce | *Lactuca serriola* | 5 | 60 | `confirmed` | mixed | wayside | Epic | spring,summer |
| 30 | Wild Strawberry | *Fragaria virginiana* | 18 | 44 | `confirmed` | mixed | meadow | Uncommon | spring |
| 19 | Sheep's Sorrel | *Rumex acetosella* | 23 | 29 | `confirmed` | hold | meadow | Uncommon | spring |
| 32 | St. John's Wort | *Hypericum perforatum* | 7 | 15 | `confirmed` | strong | meadow | Uncommon | spring,summer |
| 3 | Goldenrod | *Solidago canadensis* | 9 | 1 | `confirmed` | strong | meadow | Common | summer,autumn |
| 28 | Horsetail | *Equisetum arvense* | 6 | 1 | `confirmed` | mixed | wetland | Uncommon | spring,summer |
| 24 | Catnip | *Nepeta cataria* | 2 | 35 | `likely` | mixed | garden | Uncommon | spring,summer |
| 7 | Garlic Mustard | *Alliaria petiolata* | 1 | 25 | `likely` | mixed | woodland | Common | spring |
| 8 | Stinging Nettle | *Urtica dioica* | 1 | 2 | `likely` | strong | wetland | Common | spring,summer |
| 22 | Burdock | *Arctium lappa* | 0 | 1 | `likely` | strong | wayside | Uncommon | spring |
| 23 | Wild Mint | *Mentha canadensis* | 0 | 0 | `insufficient` | mixed | wetland | Uncommon | — |

### Excluded for occurrence

- **Wild Mint (#23) — zero GBIF records in Georgia.** The card names *Mentha canadensis*, a
  largely northern species. This is the one deck plant a Georgia board should not contain,
  and the survey is what found it. Whether the card's scope should be revisited is a
  content question, not a board question.
- **Stinging Nettle (#08), Burdock (#22), Catnip (#24), Garlic Mustard (#07)** — `likely`
  only. Nettle and burdock are both northern species at the edge of their range here (3 and
  1 records). Not absent; not reliably findable.

### Excluded for evidence, despite good occurrence

- **Purple Dead Nettle (#11)** — 23 specimens, **1,000 observations**, and **zero sources in
  the repository**. On occurrence alone it would be the single best starter plant on the
  board. It is the highest-value research target in the whole deck: one afternoon of sourcing
  turns an abundant, unmistakable spring weed into a launch species.
- **Sheep's Sorrel (#19)** and **Chicory (#21)** — same shape, `hold`, no sources.
- **Ragweed (#04), Wood Sorrel (#09), Field Garlic (#29), Jewelweed (#34)** — `revise`. Their
  *eligibility* is probably straightforward; their printed claims need work first, and a
  launch board is the wrong place to carry a card flagged for revision.

## Caveats — read these before using the seasons column

1. **The months column is when records were MADE, not when the plant is findable.** It is a
   histogram of collection and observation dates, and those track recording effort: 22 of the
   24 best candidates show "spring" because spring is when people in Georgia go out and
   record. **Do not drive availability from it.** Your decision to run a year-round board
   with seasonal quests as featured challenges sidesteps this entirely, which is the right
   call for a reason the data only made visible after the fact.
2. **Only a few species have a seasonal signal strong enough to use:** Purslane, Chicory and
   Goldenrod (summer/autumn) and Passion Flower (summer/autumn) stand out against the spring
   bias. Those are candidates for featured seasonal challenges; the rest are not.
3. **Lemon Balm (#35) has zero herbarium specimens** and 186 observations — a cultivated
   escape rather than a wild population. Honest to include as a garden plant; not a wild find.
4. **Goldenrod (#03) carries `pendingCuration` genus scope** in the matcher, so an
   identification of another *Solidago* unlocks it via `legacyGenus`. That is a known,
   deliberate, temporary state documented in CLAUDE.md — worth knowing before it appears on a
   board where unlock behaviour is visible.
5. **Counts are all-time, not recent.** A species recorded heavily in 1950 and never since
   would read as `confirmed`. For this deck — common weeds with modern observation counts in
   the hundreds — that is not a live risk, but it is a real limit of the method.
6. **Occurrence is not eligibility.** Every one of the 36 species is `medicinal_eligibility
   = 'pending'`. Nothing in this survey touches that, and no pipeline may.

## What this changes in the design

The earlier design said the occurrence pass was the critical path at 10–14 hours. **It took
one workflow run.** What remains is the human half: reviewing these classifications and
writing the rows, which is hours rather than days because the evidence is now in front of a
person instead of needing to be gathered.
