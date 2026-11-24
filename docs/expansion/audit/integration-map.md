# Gameplay integration map: what changes when cards #57-141 are added

Companion to `profile-structure.md`. Same rules: read-only audit, no `src/` edits, no import, no artwork, no invented botany.

## 1. Method, and what "added" was taken to mean

Three placements were simulated in a **scratch copy** (`repro/README.md`), each running the **entire** unmodified suite (140 files,
2,240 tests, all green before any change). The 85 drafts were mapped to the smallest legitimate `Herb`: identity, front, back and the
conventional art paths. No field notes, habitat, sources, sprites or artwork were invented, because those are exactly what the audit
is measuring.

| Run | Placement | Collection | Failing tests | Failing files |
|---|---|---|---|---|
| **A1** | digital-only (appended beside the Field Cards in `DIGITAL_ONLY_ENTRIES`) | **not declared** | 13 | 9 |
| **A2** | digital-only | declared as a new digital collection `expansion` | 12 | 9 |
| **B** | printed (appended to the `PRINTED_CARDS` list) | not declared | 36 | 20 |

A test that **passes** is evidence of what the suite does *not* cover as well as of what is safe, so section 3 says which passes are
real and which are the suite not looking.

Two caveats stated plainly:

- The `edge-shared.test` failure in every run names `deck.ts`; that is partly an artefact, because the simulation had to edit
  `deck.ts` in the copy. The *real* mechanism is the same and is certain: `catalogue.ts`, `field-cards.ts`, `deck.ts`/`herbs.json`
  and `plant-match.ts` are mirrored into `supabase/functions/_shared/herbdex/`, so any of those changing fails that test until
  `npm run sync:edge-shared` runs (and the functions are redeployed).
- No Playwright or live-Supabase suite was run (`verify:supabase`, `e2e/`), since they need credentials. Items that only those
  would catch are marked **(unverified here)**.

## 2. Failures by run, with the reason each fails

### A2 - digital-only, collection declared (12)

| Test | Why it fails | What has to happen |
|---|---|---|
| `card-art.test` (3 assertions) | no `chip`, `thumb`, `image`, `back` file for 85 ids | the four art variants must exist **before** merge (A3) |
| `card-field-notes.test` "gives every Field Card the same kind of entry a printed card gets" | requires `FIELD_NOTES` for every digital entry | identification, habitat and lookalikes for all 85 must be written first: **the botanical-research critical path** |
| `catalogue.test` "holds the Field Cards, and they widen the catalogue without widening the deck" | asserts the digital set is exactly the nine | a literal to update; deliberate, not a bug |
| `edge-shared.test` | mirrored modules drifted | run the sync; redeploy functions (owner for production) |
| `field-cards.test` "is reachable through the catalogue, which is the only widened set" | asserts 54 catalogue entries | literal to update |
| `leaderboard-integrity.test` "every catalogue card, and nothing else, is a valid herb id" | the SQL allow-list in migration 0013 is 54 ids | **a new migration**, see section 4 |
| `plant-match.live.test` "does not make the other Rumex species loggable" | *Rumex crispus* becomes an exact card | reverses a recorded policy |
| `plant-match.live.test` "names both Rumex cards rather than picking one by deck order" | the Rumex candidate list now has a third confirmable card | same |
| `card-coverage.test` "keeps the two Rumex cards separate and refuses a third dock" | *R. crispus* now `exact`, was pinned `sameGenus` | same |
| `seed-shelf.test` "accepts a close relative of a card" | *Plantago lanceolata* is the test's example of a relative; it becomes a card | a better example species; the *rule* is unaffected |

A1 adds one more: `catalogue.test` "requires any future digital entry to name its collection". Without a declared collection
`collectionOf()` falls back to Collection 01, a **printed** collection, silently.

### B - printed (36), in addition to the above

| Group | Tests | Meaning |
|---|---|---|
| Counts that were 45 | `deck.test` (contains the full deck; contiguous numbers from 1; art exists), `catalogue.test` (x2), `field-cards.test` (x2), `plant-match.live.test` "covers all 45", `card-coverage.test` "classifies all 45", `habitat.test` (x5), `findability.test`, `scan-spoilers.test` | every printed-deck invariant counts 45; the card count is also what a buyer is told |
| Data every printed card must have | `card-field-notes` ("covers every card in the deck"), `card-sources` (x2: the "exactly three uncited by decision" and "keeps the deck first"), `sources.test` ("cites the physical card it was transcribed from"), `compounds.test` ("resolves every compound string printed anywhere"), `pixel-icons.test` (x2), `plant-sprites.test` ("has a portrait for every card in the deck") | the printed standard needs sources, compounds, icons and sprites for each |
| Changes meaning for existing players | `achievements.test` "epic-finder needs every Epic herb" | five new Epics would withdraw an achievement from anyone who holds it |
| Commerce | `shop.test` "counts the cards from the deck", "divides the owner's own price by the real card count" | `$0.53` per card becomes `$0.19` on a 45-card physical deck |

## 3. What the suite does NOT catch (passes that mean "nobody looked")

These all pass in A2 with 85 more cards and none of the assets, which is the finding:

- **No test requires a habitat, occurrence, evidence label, coverage entry or sprite for a digital entry.** The Field Cards have none
  of those, so the suite encodes "a digital card may lack them". `plant-sprites.test` scopes coverage to `PRINTED_CARDS`; a
  digital-only card with no sheet renders a gap in the hero (`PlantSprite` returns `null`), not a failure.
- **No test gates publication.** There is no `status`, `reviewed` or `draft` on `Herb`. The one existing gate pattern is
  `reviewed: true` for reference photographs and `CHALLENGE_REVIEWS` for Boss Form items. Healing traits and preparations for
  species whose editorial status is "internal use not approved without review" would render the moment an entry is in `CATALOGUE`.
- **No grid test.** `/herbdex` lists `PRINTED_CARDS` plus an explicit `FIELD_CARDS` strip; nothing asserts every catalogue entry is
  reachable from it.
- **Hardcoded literals** in tests (9 Field Cards, 54 catalogue entries) are why those two fail loudly rather than adapt; a future
  tenth digital set would trip them again.

## 4. Gameplay integration map

"Tier" = `agents/ownership.json` owner of the file(s) that change. **Digital-only** means the same shape as the nine Field Cards.

| # | Integration | Mechanism today | Digital-only (A) | Printed (B) | Files / owner | Tests affected |
|---|---|---|---|---|---|---|
| 1 | **Catalogue / deck membership** | `CATALOGUE = PRINTED_CARDS + DIGITAL_ONLY_ENTRIES`. `generateStaticParams` reads `CATALOGUE`. | +85 pages, Learn library (`/learn/plants`), Journal picker, scanner results | `herbs.json` is regenerated by `build_deck.py` from a `DECK` table - a Tier 0 file the owner runs | `catalogue.ts`, `field-cards.ts` (coord); `herbs.json`, `build_deck.py` (human) | see section 2 |
| 2 | **Collection identity** | `collectionOf()` defaults to Collection 01 | must declare `collectionId` + a digital collection | n/a | `collection.ts` (coord) | `collection.test`, `catalogue.test` |
| 3 | **Discovery / XP / level** | `applyDiscovery` resolves through the catalogue; **XP resolves through the printed deck only** | discoverable, pays **0 XP** (Field Card property) | pays 100/175/300/500; `MAX_COLLECTION_XP`, level ladder context and the Field Card unlock thresholds shift for everyone | `herbdex-reducer.ts`, `progression.ts` (coord) | `herbdex-reducer.test`, `progression.test`, `field-cards.test` |
| 4 | **Collection and mastery** | `tracksMastery` = printed only; mastery stored, never revoked | no track; card can stay "discovered" forever | three-stage track; completion % denominator 45 -> 130 retroactively | `mastery.ts` (coord) | `mastery.test` |
| 5 | **Scanner matcher** | `plant-match` indexes the whole catalogue; `scopeFor` read for printed cards only | species binomial resolves `exact`; relatives `sameGenus`; **4 flips today** (below) | same, plus scope decisions | `plant-match.ts` (scan, mirrored), `card-coverage.ts` (coord) | `plant-match(.live).test`, `card-coverage.test`, `seed-shelf.test` |
| 6 | **Eligibility and genus-level cards** | `genus` scope for 9 `spp.` cards; `acceptedGroup` for 2; default species | all 85 species-level: no entry required | same | `card-coverage.ts` | `card-coverage.test`, `goldenrod-scope.test` |
| 7 | **Seed Shelf** | `isShelfEligible` = no confirmable card; a held shelf entry "grows" via `cardFor` | all 85 are shelf-eligible **today** (85/85) and become ineligible; any saved entry for them sprouts and writes a discovery backdated to the find | same, with XP credited at the backdated date | `seed-shelf.ts`, `seed-packet.ts` (scan) | `seed-shelf.test`, `species-registry.test` |
| 8 | **Quests / regions / habitats** | `regions.ts` launches only `us-ga`; `GEORGIA` lists 36 of 45; `habitat.ts` is `PRINTED_CARDS`-scoped | cards appear in none: no habitat, no region membership (Field Card precedent) | each printed card needs one primary habitat; `habitat.test` fails otherwise | `region-species.ts`, `quest-board.ts` (quests), `habitat.ts` (coord) | `habitat.test`, `quest-board.test`, `region-*.test` |
| 9 | **Field Research supply** | `RESEARCH_POOL = PRINTED_CARDS`; one winter card sizes every seasonal target | unaffected | targets (`research.test` masters the whole deck and asserts every task completes) stay completable but get easier; draft has exactly 1 winter card too | `research.ts` (coord) | `research.test` |
| 10 | **Knowledge-check pool** | `KNOWLEDGE_CHECK_POOL = PRINTED_CARDS`; asks only what the card prints; never identification or safety | not offered | draft copy errors become exam questions; distractors drawn from 130 | `knowledge-check.ts` (coord) | `knowledge-check.test` |
| 11 | **Garden sprites and growth** | `garden.ts` maps mastery -> growth; GardenView iterates printed cards | cannot be planted | needs A4 (sprout, growing, flowering, still) for each | `garden.ts` (lane-b), `plant-sprites.ts` (ui), `sprite_sources/` (ui) | `plant-sprites.test`, `garden.test` |
| 12 | **Leaderboard / Board** | SQL `is_catalogue_herb(herb_id)` is a hard-coded **54-id** list (migration 0013), mirrored by test | the DB **refuses** a new discovery or sighting for the 85 until a **new** migration lists them | same | `0013_*.sql` (coord, migration needs owner approval) | `leaderboard-integrity.test` |
| 13 | **Achievements, frames, titles** | predicates over printed totals | unaffected | `collection-complete`, `epic-finder` etc. change meaning retroactively | `achievements.ts` (coord) | `achievements.test` |
| 14 | **Chemistry structures** | name -> `compounds.ts` -> generated `structures.tsx` | 96 of 130 distinct compound names unknown, rendered as plain names | `compounds.test` fails | `compounds.ts`, `build_structures.py` (human) | `compounds.test`, `structures.generated.test` |
| 15 | **Sitemap / static params** | `generateStaticParams` over `CATALOGUE`; **no sitemap or robots file exists** | +85 static pages, indexable | same | `[herbId]/page.tsx` (coord) | `field-cards.test` |
| 16 | **Image variants (800 / 400 / 112px)** | `image`, `thumb`, `backImage`, `chip` + 276px `sprite` crop | all required; `card-art.test` lists every missing id | same | `public/cards/**` (human) | `card-art.test`, `deck.test` |
| 17 | **Edge-function mirrors** | `sync:edge-shared` copies modules + `herbs.json`; `deploy-function.yml` | catalogue/field-cards/plant-match copies change; `herbdex-action`, `identify-plant`, `seed-packet`, `challenge-submit` need redeploy | also `herbs.json` and `deck.ts` | `scripts/sync-edge-shared.mjs`; `_shared/herbdex/*` GENERATED | `edge-shared.test`, `npm run check:edge` |
| 18 | **Account export / deletion** | table lists compared in both directions | unaffected (no new table) | unaffected | `export-account-data.ts`, `delete-account` | `account-security.test` |
| 19 | **Free-collection cap** | trigger on `discoveries`; **disabled**; interlocked | counts digital finds toward the cap if ever enabled | same | migration 0008 | `supabase/tests/0008_*` (unverified here) |
| 20 | **Botanical catalog (DB layers A/B/C)** | migration 0010: species, collectible cards, medicinal claims; `unlock_basis`; `published` | **not wired to the app**; the app reads static data | same | `catalog-schema.ts`, `0010_*.sql` | `catalog-schema.test` |

### The four scanner flips, measured (before any card exists)

| Draft species | Today | After the card exists | Existing card it touches |
|---|---|---|---|
| *Rumex crispus* | `sameGenus` | `exact` | #02 Broadleaf Dock, #19 Sheep's Sorrel; **overturns the pinned "third dock is refused"** |
| *Plantago lanceolata* | `sameGenus` | `exact` | #14 Plantain (the live card names it as a lookalike) |
| *Trifolium repens* | `sameGenus` | `exact` | #10 Red Clover |
| *Echinacea angustifolia* | `sameGenus` | `exact` | #48 Purple Coneflower (Field Card) |

All 85 are **currently shelf-eligible** (`isShelfEligible` true for 85/85, because none has a confirmable card). The other 81 resolve
`none`, so their scans go to the Seed Shelf today.

## 5. The five things most likely to break when cards are added

**1. The database refuses the new ids.** Migration 0013 constrains `discoveries`, `learned`, `mastered` and `sightings` with
`is_catalogue_herb(herb_id)`, a literal list of 54 ids in `CATALOGUE` order. Until a **new** migration replaces that function, every
signed-in player who finds one of the 85 gets a rejected write. `import-local-progress` sends each table in **one** upsert, so a
single unknown id fails the whole batch and the dialog does not spend its offer (CLAUDE.md, "failed import"). The failure is silent
to a signed-out player and loud to a signed-in one. Ordering rule from migration 0007: **apply the migration before any deployment
that can issue the value.** Applying migrations needs the owner (`decisions.md`). Pinned by `leaderboard-integrity.test`.

**2. The printed-versus-digital fork rewrites existing players' denominators, and a forgotten `collectionId` does it silently.**
Printed: completion % goes from N/45 to N/130 retroactively, "collection complete" and "every Epic" achievements change meaning
for people who already hold them, `MAX_COLLECTION_XP` and the shop's per-card price move (`$0.53` to `$0.19` on a 45-card box), and
the landing page, `/start` and `/shop` print `PRINTED_DECK_SIZE` ("130 illustrated species" for a box that holds 45). Digital-only avoids all of that, but a digital card that omits `collectionId`
falls back to Collection 01 and is labelled as part of the physical deck (A1 vs A2). Owner decision, not an implementation detail.

**3. A merge-green card needs field notes for all 85, and the draft has none.** `card-field-notes.test` requires identification,
and the live standard is lookalikes with hazard `risk`, plus habitat prose. These are safety information shown *before* discovery.
That, not the 85 data rows, is the long pole: it is botanical research (per species, cited to verified sources; today 127 verified
references cover 45 cards) and it is Tier 0. The art is the other hard gate: `card-art.test` fails until 85 x 4 image variants exist.

**4. Nothing stops unreviewed medicinal and safety text going live.** There is no draft or reviewed flag on `Herb`, and card data
ships in the JS bundle, so hiding it behind a screen is not a gate (CLAUDE.md makes the same point for the Boss Form bank and uses a
build-time dead-code flag). The draft marks itself `EDITORIAL_DRAFT_NOT_PUBLICATION_VERIFIED`; 85/85 compounds
"PROVISIONAL"; internal use "not approved without review" on cards such as *Eupatorium perfoliatum*. Also unresolved: whether
`review.cardSafetyWarning` becomes `herb.warning` (claims a printed warning that does not exist, 85x the live rate) or a site caution.

**5. The scanner and Seed Shelf cascade, plus the one irreversible write.** Adding the species changes `plant-match`, and the
deployed `seed-packet` function runs a **mirrored** copy of it. If the frontend ships before the functions are re-synced and
redeployed, the old function still judges all 85 shelf-eligible and can mint a **canonical, global, immutable, undeletable**
`species_packets` row for a species that now has a card. Also: four existing relatives flip from `sameGenus` to `exact`, one of
them reversing a recorded decision (*Rumex crispus*), and any player who already shelved one of the 85 species will have it
"sprout" into a discovery on next read. Order: sync, redeploy functions to test, then frontend. **(Live behaviour unverified here.)**

Honourable mentions: the hard-coded 9 and 54 in `catalogue.test` and `field-cards.test`; 79 of 126 healing-trait names with no
icon rule (falls back to a leaf) and 98 of 109 preparation names with no pixel art (falls back to generic); 85 sprite modules
needing their own botanical gesture; and the sprite hue-spacing rule, which assumes ~45 species in the foliage band.

## 6. Suggested order (for the owner and coordinator; none of it is done here)

1. Owner decisions: placement (printed vs digital), collection name, A1 definition, fate of draft warnings, `Rumex crispus`.
2. A publication gate, so data can merge without being served (a build-time flag in the pattern `NEXT_PUBLIC_BOSS_FORMS` uses).
3. Migration for the id list, applied to the test project first, then production on the owner's approval.
4. Per-species research (field notes, lookalikes, sources) in batches, with the existing review states (`retrieved` ->
   `approved`, `generated-card.ts`) rather than a parallel scheme.
5. Art: A3 per card, then `build_chips.py`; A4 only if the Garden is in scope for these cards.
6. Then, and only then, `sync:edge-shared`, `check:edge`, redeploy to test, `verify:supabase`, frontend.
