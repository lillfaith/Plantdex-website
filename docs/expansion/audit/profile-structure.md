# Digital card profile: what one card generates today, and what the 85 new cards need

**Audit, read-only.** Nothing in `src/`, `public/`, `supabase/`, workflows or `next.config.ts` was touched; no cards were imported; no
artwork was generated; no botany was written. Every statement below comes from the code on `integration` (`e74197a`), from running the
real modules against the real data, or from reading the draft file with `git show` (never modified).

- Draft under audit: `origin/claude/plantdex-v0-3-supabase-verify-iic8pz:src/data/expansion-cards.json` (version 2, 85 cards, #57-#141,
  `EDITORIAL_DRAFT_NOT_PUBLICATION_VERIFIED`).
- Companion files in this folder: `field-matrix.csv` (one row per component, field, asset and integration, with the eight questions
  asked of each), `per-card-variation.csv` (the 54 live cards, one row each), `draft-85-gaps.csv` (the 85 drafts measured against
  today's tables), `integration-map.md` (gameplay integrations, simulated test impact, the five likeliest breakages) and `repro/`
  (how every number was measured).
- **How the numbers were taken.** A scratch copy of the repo ran the unmodified code over all 54 live cards (45 printed, 9 Field
  Cards) and over the 85 drafts. Baseline: 140 test files, 2,240 tests, all green. Then the 85 drafts were mapped to minimal `Herb`
  objects (identity, front, back and the conventional file paths; nothing else) and the whole suite re-run under three placements.
  See `integration-map.md`.

## 1. How a card page is assembled

One route: `/herbdex/[herbId]`, statically generated from `CATALOGUE` (`src/app/herbdex/[herbId]/page.tsx`). `HerbDetail` decides
what a viewer sees from three independent facts, which is the thing a new card's data has to fit:

| Viewer state | How they get it | What opens |
|---|---|---|
| `locked` | not discovered, not revealed, not XP-unlocked | `LockedHerb` + Field Identification and Sources only + brief safety notice. A printed `warning` and any `SITE_CAUTION` show here too. |
| `readable` | discovered **or** revealed **or** XP-unlocked (Field Card) | the card's own back content (Herbalism) as well |
| `discovered` | a find is recorded | Challenges and Progress as well |

Order down the page (discovered view): breadcrumb, `SpeciesHero`, warnings block (`herb.warning`, `CARD_CORRECTIONS`, `SITE_CAUTIONS`,
`KNOWN_CARD_ISSUES`, in that order), `InvasiveBadge`, `DiscoverPanel`, the four-tab `ProfileTabs`, research teaser, deck CTA, safety
notice. Tab membership and gating live in `src/lib/profile-sections.ts` (12 sections, 4 tabs); the renderers are in `ProfileTabs.tsx`.

## 2. What a profile generates, tab by tab

Source column: **P** = printed on the card and transcribed by `scripts/build_deck.py` into generated `herbs.json`; **C** = curated
per-species file (most are Tier 0, human-only per `agents/ownership.json`); **D** = derived by code; **A** = asset on disk.

### Hero and chrome (all states)
| Output | Source | Notes |
|---|---|---|
| Title, metadata, OpenGraph image | P `commonName`, `scientificName`, `rarity`, `season`; A `image` | `generateMetadata` reads the catalogue entry only |
| Card art, flip to back | A `image`, `backImage` (800px) | no fallback image |
| Growth portrait | A `animated/*.png` via `spriteFor`; stage from mastery | `PlantSprite` returns `null` when no sheet exists, so a card with no sprite renders a gap, not an error |
| Printed warning / correction / caution / issue notes | P `warning`; C `CARD_CORRECTIONS`, `SITE_CAUTIONS`, `KNOWN_CARD_ISSUES` | four different layers, deliberately; see section 4 |
| Invasive badge | C `invasive-status.ts` | verified claims only |
| Discover panel | D, XP from the ledger | pays 0 for a digital-only card |

### Tab 1 - Identify (`field-identification`, always visible, even locked)
Habitat chips (D from `habitat.ts`), reference photographs (C/A `reference-photos.ts`), identification trait rows, lookalikes (with
hazard-weight `risk` box), lookalike photo comparison, habitat prose, and the field-data strip (D from season/stats/rarity). All of
identification, lookalikes and habitat are `C` data in `card-field-notes.ts`, with `sourceIds` resolved against `src/data/sources.json`
(only `verified: true` references ever render).

### Tab 2 - Herbalism (`herbal-knowledge`, needs readable)
Use badges (P `uses`), Healing Traits with non-claim framing (P), Signature Compounds with molecule or ghosted scaffold (P name,
C `compounds.ts`, generated `structures.tsx`), Usable Parts + Preparations (P, with shared pixel illustrations by regex), Taste and
Aroma (P), Foraging-safety footer (global), optional `TraitEvidence` (C, one card), Sources section (C `card-sources.ts`, `sources.json`).

### Tab 3 - Challenges (`mastery-challenges`, needs discovered)
`MasteryTrack` (discovered, learned, mastered), `KnowledgeCheck` (generated from the card's own back), Boss Form challenges (Dandelion
pilot, flag off). Printed-deck-scoped by `tracksMastery()`.

### Tab 4 - Progress (`your-progress`, needs discovered)
`JourneyPanel`, `MySightings` (journal), Field Research row.

## 3. The 54 live cards are not identical. Measured variation

From `per-card-variation.csv` (54 rows: 45 printed, 9 Field Cards). Every count is from the real modules, not from reading prose.

| Dimension | Variation across the 54 | Consequence for the 85 |
|---|---|---|
| **Printed warning** (`herb.warning`) | 1 card (#33 Yarrow). `deck.test` pins it to that card | The draft carries a "card safety warning" on **85/85**. Treating each as printed would be 85 times the live rate and claims a printing that has not happened |
| **Site caution** (`SITE_CAUTIONS`) | 4 cards: #03, #31, #32, #41 | Draft has three caution-like strings per card; none is in the single-sentence, documented-risk shape this file holds |
| **Digital correction** (`CARD_CORRECTIONS`) | 1 card (#31 Elderberry) | n/a: nothing is printed yet, so nothing can be misprinted |
| **Known card issue** | 3 cards (#02, #31, #38) | n/a |
| **Genus-level cards** (`spp.`) | 9 cards; each shows the genus notice | none: all 85 are species binomials |
| **Species cards whose traits are genus-wide** (`genusTraitsNote`) | 4 cards (#23, #29, #36, #40) | draft species such as the four *Artemisia* and two *Aralia* are candidates for this; only research can say |
| **Coverage scope** (`CARD_COVERAGE`) | 34 species, 9 genus, 2 `acceptedGroup` (#01 Dandelion, #03 Goldenrod); Field Cards have no entry | 85 species-level, default scope needs no entry. Any widening is a Tier 1 research decision |
| **Lookalikes** | 43 cards list 1, 11 list 2; 11 carry a hazard `risk` | 0/85 supplied |
| **Identification trait rows** | 27 cards have 5, 24 have 4, 3 have 3 | 0/85 supplied |
| **Field-note sources** | 46 cards have **none**; 4 have 2, 2 have 4, 1 has 1, 1 has 3. **Habitat sources: 0 on all 54** | 7 drafts list 3 unverified references each; 78 list none |
| **Habitat class** | 45 printed cards: wayside 10, meadow 10, woodland 10, garden 9, wetland 6. **The 9 Field Cards have none** | draft carries ecoregions, not habitats |
| **Georgia occurrence** | 36 printed: 13 featured, 18 confirmed, 4 likely, 1 insufficient. 18 cards, including every Field Card, absent | draft `regions` is provisional ecology, not Georgia evidence |
| **Compound drawing** | per card: 0-4 molecules, 0-3 scaffolds, 0-4 known-but-undrawn, 0-4 not in table (4 cards resolve no compound) | 22 of 85 draft cards resolve none of their 3 compounds |
| **Reference photographs** | 1 card (Dandelion): 6 photos, 0 reviewed, 1 comparison | 0/85 |
| **Trait evidence** (`trait-evidence.ts`) | 1 card (#56 Beautyberry) | 0/85 |
| **Evidence label** | 20 "Well sourced", 18 "Evidence varies", 16 none (9 Field Cards + printed #04, #09, #11, #19, #21, #29, #34) | 85 would start with none |
| **Sprites** | 54/54 have sprout, growing and flowering sheets; 54 distinct personality labels; 1 has a Boss Form | 0/85 |
| **Rarity / season** | Common 19, Uncommon 18, Rare 14, Epic 3; summer 28, spring 15, autumn 10, winter 1 | draft: Common 47, Uncommon 23, Rare 10, Epic 5; winter 1 |

**The Field Cards (#48-56) are the precedent for a digital-only card, and they are thinner than a printed card in specific, testable
ways**: no habitat class, no Georgia occurrence, no coverage entry, no evidence label, no `sources` entry on the herb record, no
mastery, no knowledge check, no garden slot. They do have field notes (a test requires it), sprites, and chips.

## 4. The variation that matters most: safety layers are separate on purpose

CLAUDE.md records four distinct things a card page can say about risk, each answering a different question, and `card-cautions.test`
pins all three halves of the #31 case:

| Layer | Answers | Where |
|---|---|---|
| `herb.warning` | "this is printed on your physical card" | `herbs.json`, built from the card |
| `CARD_CORRECTIONS` / `KNOWN_CARD_ISSUES` | "your printed card is wrong" | Tier 0 |
| `SITE_CAUTIONS` | "here is the risk the card does not carry" | Tier 0, high bar |
| `InvasiveBadge` | "a fact about the plant that changes how you harvest" | Tier 0 |

The draft has a **fifth** thing with no home: `review.cardSafetyWarning` (85/85, "SHORT CARD COPY - final botanical/safety
review pending"), `guideCaution`, `preparationSafetyReview`, `healingEvidenceNote`. Example from the draft itself: *Eupatorium
perfoliatum* carries a short "Possible liver toxins; avoid long-term use" while its long note says "Pyrrolizidine-alkaloid status
disputed; internal use not approved without review". Whether each becomes a printed warning, a site caution, or a withheld section is
an **owner decision**, and there is currently **no publication gate** in the code: a card is live the moment it is in `CATALOGUE`.
Nothing reads a `status: draft` field. The draft's own `master.safetyReviewNotice` says "do not print without review".

## 5. What the 85-card draft supplies, and what it does not

Measured against the live `Herb` contract (`src/lib/types.ts`) and the profile above.

**Maps directly (85/85, no loss):** `id`, `cardNumber`, `commonName`, `scientificName`, `rarity`, `xp`, `season`, `uses` (all inside the
12 allowed keys, always 2), `stats` (water/sun/temperature, 1-5), and all six `back` lists (shape-compatible: healingTraits 3-5,
compounds 3, taste 3, aromatic 3, preparations 1-4, usableParts 1-4). No id or scientific-name collisions with the 54 live cards.

**Supplied but with no live consumer:** `review.regions` (ten ecoregions, "provisional ecology-based"), `review.editorial.*` (12
keys, all "needs verification" statuses), `researchLinks` (7 cards list 3 unverified direct references, 78 list none),
`supplied.stats.heat`. Regions are an unlaunched model: `regions.ts` launches only `us-ga`; the ten-region contract
(`docs/regions/ecoregion-data-contract.md`) is a DRAFT awaiting owner review.

**Not supplied at all (and required for a profile at the live standard):** artwork of any kind, `collectionId`, identification
traits, habitat prose, lookalikes (and therefore hazard risks), any `sources.json` id, a habitat class, a coverage decision, a
sprite, compound drawings for 96 of 130 distinct compound names, trait icons for 79 of 126 distinct healing traits, art rules for 98
of 109 distinct preparations and 9 of 22 distinct parts, and (for the Georgia lens) any occurrence record.

## 6. The four asset types, kept separate

The brief asks for four asset kinds. The repository only defines three of them, and the first is not found as described:

| # | Asset | What the code shows | Generator / pipeline | Exists for the draft? | Approval |
|---|---|---|---|---|---|
| **A1** | "Native approved 21-24px photo-derived icons" | **No asset with that name, size or approval status exists in the repo.** Nearest things: the card front's pixel panel, which `scripts/card_art.py` builds as a **28x28** mosaic (`PIXEL_GRID = 28`, measured from `docs/assets/card-kit/reference-pixel-icon.png`), and the 112px chip. The 12 use icons are shared, harvested once by `extract_card_icons.py` | n/a | no | **Owner to define A1** before anything depends on it. This audit does not guess a pipeline |
| **A2** | Main / preview photography | Reviewed reference photographs (`public/reference/`, `reference-photos.ts`) and the card-front photograph (`photo_pipeline.py`, `fetch_inat_photos.py`, `segment_plant.py`; `docs/plantdex-photo-style.md`). Production shows only `reviewed: true`; today that is **zero photographs for 54 cards** | offline pipeline, small CC0 pool (8 usable for chamomile), colonies cannot be segmented | no | licence check + botanist review per photograph |
| **A3** | Digital card artwork | `image` 800px, `thumb` 400px, `backImage` 800px, `chip` 112px, `sprite` 276px crop. Printed: `build_deck.py` from PDFs. Digital-only precedent: `build_field_card_art.py` (PDF to the five variants, re-counts stat pips from the artwork) then `build_chips.py`. Generated route: `render_generated_card.py` paints into slots on `docs/assets/cardbase.pdf` | exists | no | card art is Tier 0 |
| **A4** | Garden creature + growth sprites | `scripts/sprite_sources/<id>.py` (54 modules), compiled by `build_sprites.py` into `public/cards/animated/` (3 stages + still per species) and `src/data/sprites.json`; checked by `audit_sprites.py` | exists | no | Tier 3 / UI-owned; every species needs its own botanical gesture |

The A3 `sprite` crop and the A4 creature are different files serving different surfaces: Journal and Seasons show the crop; Garden,
profile avatar, sidekick and the hero portrait show the creature. A digital-only card renders a page without A4; it needs A4 only
to appear in the Garden or on a profile, and Garden is printed-deck-scoped regardless.

## 7. Variation between a digital-only and a printed card, by pipeline

| Concern | Printed (herbs.json) | Digital-only (field-cards.ts precedent) |
|---|---|---|
| Source of truth | `DECK` table in `build_deck.py`, validated against the artwork | hand-written TypeScript beside the reasoning |
| Page | yes | yes |
| Collection grid | yes | no (explicit `FIELD_CARDS` list on `/herbdex`) |
| XP for discovery | face value | 0 |
| Mastery / knowledge check / research / garden / achievements | yes | no |
| Scanner and Seed Shelf | yes | yes (matcher indexes the whole catalogue) |
| Leaderboard | yes | yes (id list is catalogue-wide) |
| Habitat / occurrence | yes | none today |

## 8. Questions only the owner can answer (the audit found these, did not decide them)

1. Printed or digital-only for #57-141 (the single biggest fork; see `integration-map.md`). The audit's measurement favours
   digital-only for a first release: 12 failing tests that change nothing about XP, progression or any existing player's
   record (though scanner and Seed Shelf outcomes for four relatives do change), versus 36 failing tests and a wrong per-card
   price on the shop.
2. Which collection id and name. The code refuses to let a second *printed* collection be implied.
3. Whether any draft warning is printed, or becomes a site caution, or the card is withheld.
4. Whether `Rumex crispus` becomes a card. It is today an explicitly tested *refusal*.
5. What A1 is.
6. Whether the ten-region model is promoted ahead of the cards or after.
