# The ten PlantDex ecological regions: what was recovered (PROPOSAL, docs only)

Researched 2026-11-24. Nothing here is imported into `src/`, `supabase/`, a workflow or production.

## 0. Correction of an earlier finding

My first report (`datasets.md` s0, `region-mapping-methods.md` s2) said the ten regions' definitions "are not present on any branch this
session can reach" and substituted **assumed** names. That was wrong, and the cause was mine: I searched only `integration` and
`claude/botanical-catalog-stage-1`. The regions are on **`claude/plantdex-v0-3-supabase-verify-iic8pz`**, which I had not fetched.
The assumed names (for example "Northern Forest", "Northeast (coastal and Great Lakes lowland)", "Appalachian", "Midwest", "Rocky Mountains &
Intermountain West", "Southwest (Desert Southwest)", "Pacific Coast & California") are withdrawn. Every one of them differs from the owner's
names, and two differ in substance (MW is *Great Lakes & Central Woodlands*, not a state-based "Midwest"; AP is *Appalachian-Ozark
Highlands*, so the Ozarks and Ouachitas I had put in MW belong with the Appalachians by name; see `region-mapping-review.md`).

## 1. Where the definition lives (all reachable refs searched)

Refs searched with `git grep` for `Northern Forests`, `regionNames`, `ecological region`, `boreal`, `ten region`, `PlantDex US`: every remote branch
(`integration`, `claude/*`, `exp`, `prep-expansion`, `backup/*`, `coord/*`, `agent/*` heads that exist). Hits that define regions:

| Source | Commit / hash | What it holds |
|---|---|---|
| `expansion/source/PlantDex_85_All_Requested_Corrections.json` key `regionalModel` | blob in `a9953722` ("Rebuild expansion import on the corrected 85-card master", 2026-11-17); file sha256 `7a2061e1ca7a6c2044e69dae358d976535feede2ae120f191006a37ea336bf67` | **the canonical definition**: model name, `allowMultipleRegions`, ten names, `regionCounts`, `status`, `sourceCoverage` |
| `src/data/expansion-cards.json` key `regionalModel` | same commit; head of the branch is `26e9dea` | generated copy of the above (name, flag, names only; counts and status are dropped by `scripts/import_expansion_cards.py`) |
| `expansion/source/PlantDex_85_ALL_Corrections_Claude_Master.xlsx`, sheet **All 139 Regions** | blob sha256 `a38a930a...` (recorded in the JSON `source.files`) | per-card region codes **for all 139 cards**: 45 original deck, 9 Field Cards ("XP"), 85 expansion. Extracted verbatim to `recovered-card-regions-139.csv` |
| `docs/expansion-cards.md`, `src/lib/expansion-cards.ts`, `src/lib/expansion-cards.test.ts` | branch head | only say "the master's ten-region model"; the test requires every card's regions to be in `regionNames` |
| `docs/regions/ecoregion-data-contract.md` s1 (our own branch) | `4315bb1a` | the ten codes, "PlantDex's own classification", "ecological, not political" |

The workbook also names a file `PlantDex_139_All_Cards_Regions.csv` (`regionalModel.allCardRegionsFile`). **It is not in the repository on any
branch**; the workbook sheet appears to be the same table (same 139 rows, same columns as that name implies), but the CSV itself is NOT RECOVERED.

## 2. The model, quoted

```
regionalModel.modelName          "PlantDex US Ten Ecological Regions"
regionalModel.allowMultipleRegions  true
regionalModel.status             "EDITORIAL ESTIMATES: not verified state-by-state; broad spp genus records not species-specific"
regionalModel.sourceCoverage     "Each expansion has supplied guide page and carried-over URLs where available; these do not establish all claims."
per card  regionalConfidence     "Provisional ecology-based; confirm range before quest release"   (all 85 expansion cards)
per card  claimCoverage.regionalPresence  "provisional ecological assignment, not independently range-verified"
```

Important: these are statements about **which regions a plant is listed for**. Nothing in the source says where a region's **boundary** is.

| Abbrev | Name (exact, from `regionNames`) | Recovered geographic scope | Recovered ecological rationale | Plants listed (all 139 / original 45 / XP 9 / expansion 85) |
|---|---|---|---|---|
| NF | Northern Forests & Boreal | NOT RECOVERED | NOT RECOVERED (the name implies northern conifer-hardwood and boreal forest) | 23 / 10 / 1 / 12 |
| NE | Northeast & Atlantic Woodlands | NOT RECOVERED | NOT RECOVERED | 94 / 44 / 8 / 42 |
| AP | Appalachian–Ozark Highlands (en dash) | NOT RECOVERED | NOT RECOVERED (the name says Appalachians **and** Ozark-Ouachita interior highlands are one region) | 91 / 45 / 8 / 38 |
| SE | Southeast Piedmont & Inland Plains | NOT RECOVERED | NOT RECOVERED | 97 / 45 / 9 / 43 |
| GC | Gulf & Atlantic Coastal Plains | NOT RECOVERED | NOT RECOVERED (the name says the coastal plains of **both** coasts form one region) | 85 / 42 / 8 / 35 |
| MW | Great Lakes & Central Woodlands | NOT RECOVERED | NOT RECOVERED | 97 / 44 / 8 / 45 |
| GP | Great Plains & Prairie Transitions | NOT RECOVERED | NOT RECOVERED ("transitions" implies the wooded and desert margins of the prairies belong here) | 67 / 33 / 5 / 29 |
| RM | Rockies & Intermountain Highlands | NOT RECOVERED | NOT RECOVERED | 56 / 30 / 4 / 22 |
| SW | Southwest Deserts & Drylands | NOT RECOVERED | NOT RECOVERED | 26 / 6 / 0 / 20 |
| PC | Pacific Forests & California | NOT RECOVERED | NOT RECOVERED | 49 / 24 / 2 / 23 |

(`regionCounts` quoted from the JSON; the split `original/xp/expansion` sums to `all`. 45 + 9 + 85 = 139 = `totalUniqueCardsIncludingOriginalAndXP`.)

Four older, non-authoritative traces, kept only so nobody rediscovers them and takes them for a definition:
- `evidence/expansion-86.json` (`pdf_group`, stage-1 branch): seven **card-sheet groupings** of the earlier 86-card draft ("Eastern & Central U.S.", "Pacific
  Coast & California", "Desert Southwest", "Rocky Mountains & Intermountain West", "Great Plains & Prairies", "Gulf Coast & Subtropical South", "Northern &
  Boreal"). These group *cards on a PDF page*; they are a superseded 86-card numbering and are not regions.
- `src/lib/regions.ts` on `claude/georgia-quest-mvp` and others: the quest-lane region model (country, state, ecoregion, county kinds; only `us-ga`
  launched). It is **state-scale and unrelated to the ten regions**.
- `docs/regions/location-detection-design.md` s1: example UI text using two of the names.
- `docs/regions/ecoregion-data-contract.md` s1: the ten codes.

## 3. NOT RECOVERED, and exactly what the owner must provide

1. For **each of the ten regions, a boundary description** in a form that can be turned into a map. Any one of these would do: (a) a list of EPA Level III
   (or Level IV) units; (b) a list of states and the line within them; (c) a map image or polygon file; (d) the rule used when the cards were assigned
   (the workbook says only "ecology-based"). Without one of these, any boundary is **my proposal**, not PlantDex's definition.
2. **The rationale** per region: what ecological character it is meant to capture (forest type, floristic province, climate) and why the pairs below are
   one region and not two. These specific questions decide the map:
   - Are the **Ozarks, Ouachitas, Boston Mountains and Arkansas Valley** in AP (the name says so) or MW?
   - Does **GC** include the whole Atlantic Coastal Plain from New Jersey south (the name says Atlantic coastal plains), or only the Southeast? Where does the
     **Middle Atlantic coastal plain / New Jersey Pine Barrens / Long Island / Cape Cod** belong, GC or NE ("Atlantic Woodlands")?
   - Where is the **NE / SE** line around Washington DC, Baltimore and Philadelphia (the fall line, the Potomac, the state line)?
   - **Where does the Southeast Piedmont & *Inland Plains* end**: is the Mississippi Valley Loess Plains / Memphis in SE or GC; are Texas east of the Blackland
     Prairies and the Arkansas-Louisiana-East Texas plains SE or GC?
   - Does **GP** extend into Texas coastal prairies, the Cross Timbers and the Edwards Plateau ("transitions")? Does it take the Western Corn Belt (Iowa,
     Nebraska) or MW?
   - **Colorado Plateau and Arizona/New Mexico plateaus**: RM ("Intermountain Highlands") or SW ("Deserts & Drylands")? **Great Basin**: RM ("Intermountain") or SW?
   - **East slope of the Cascades and Sierra Nevada**: PC ("Pacific Forests") or RM?
   - Is the **Puget/Willamette/California Central Valley** in PC? **Southern California deserts**: SW or PC?
3. **Alaska, Hawaii, Puerto Rico and US territories**: the model says "US" in its name but no scope. This research assumes *no region yet* (s4 of
   `licence-and-provenance.md`); the owner decides whether Hawaii/Alaska/PR get regions or stay unsupported.
4. Whether the regions are **exclusive for a location** (a point has one region) or only **overlapping for a plant** (`allowMultipleRegions` is stated for
   cards, i.e. a plant may belong to several regions; it does not say a location may). This research assumes each location resolves to one primary region
   plus uncertainty flags.
5. Whether "provisional ecology-based" assignments of the 139 cards are meant to be **derived from** the final boundary map (re-run later) or to **define** it.
   If the cards define it, the boundaries should be fitted to the cards (see s5, a diagnostic only).

## 4. What this research does about the gaps

It proposes a mapping and a resolver anyway, because the product asked for one, and labels every row so a reviewer can see what was inferred from the
**name** of a region (a recovered fact) and what from **geography** (my judgement). It never claims the proposal is PlantDex's definition. See
`region-mapping-review.md` (row-by-row, with uncertainty and split states) and `region-resolver-validation.md`.

## 5. Consistency diagnostic: cards vs mapping ("draft provisional, not evidence")

The 139 per-card assignments are the owner's own *draft, provisional* estimates (`status`: "not verified state-by-state"). They are used below only to
ask whether my map and the cards describe the same ten regions; **agreement does not prove either is botanically right, and disagreement does not prove
the map is wrong**. The measurement is in `region-card-diagnostic.md`.
