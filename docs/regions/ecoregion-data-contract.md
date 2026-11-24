# Ecological-region data contract (DRAFT for owner review)

**Status: DRAFT. Nothing here is implemented, imported, enabled or deployed.** It defines the shapes, counting rules and review gates
that the region research, the detection logic, the Quests lane and the Habitats interface must share. Where a number or assignment is
not yet known it says so; nothing is invented.

## 1. The hierarchy
`Ecological region (one of ten)  ->  Habitat (Woodland, Meadow, Wetland, Wayside, Garden)  ->  regional plant collection`

The ten regions are PlantDex's own classification (names and codes: NF, NE, AP, SE, GC, MW, GP, RM, SW, PC). They are ecological, not
political. **A state is never a region.** Georgia stays a **state-level filter** or an optional collection, distinct from region choice.

## 2. What exists today (audited 2026-11-24)
- The ten regions exist only as data on the card-production branch (`src/data/expansion-cards.json`, `regionalModel`, with
  `allowMultipleRegions: true`) and as provisional per-card `review.regions` for 85 DRAFT expansion cards (57-141), marked "Provisional
  ecology-based; confirm range before quest release". Not in `integration` or production.
- `src/lib/regions.ts` offers only `us` (country) and `us-ga` (state, launched). `REGION_KINDS` already includes `ecoregion`.
- `catalog_regions` and `catalog_species_regions` (migration 0010) can hold ecoregions, parents, and species-to-region occurrence with
  nativity, invasive listing, encounter rate, record count and sources. No ecoregion rows exist.
- The 45 printed cards have **no** ecoregion membership anywhere. Their only regional data is the Georgia survey
  (`region-species.ts`: 31 confirmed, 4 likely, 1 insufficient of 36). There is no overlap with the 85 expansion drafts.
- Region choice exists only on `/quests` (`RegionPicker`), one id, stored per account scope under `plantdex.region.v1:<scope>`. There is no
  onboarding step. The code states "A REGION IS CHOSEN, NEVER DETECTED"; see `product-decision-location-detection.md`.

## 3. Entities
| Entity | Fields | Notes |
|---|---|---|
| `Region` | `id`, `kind: 'ecoregion'`, `name`, `parentId: 'us'`, `launched` | ten rows; ids are stable lower-case codes (`ecoregion-se`); only `launched` regions are offered |
| `RegionPreference` (per account scope, local first) | `home: RegionId \| null`, `extras: RegionId[]`, `homeSource: 'detected' \| 'suggested' \| 'manual'`, `neighbours: RegionId[]` (offered at detection, not selected), `locationAsk: 'never' \| 'declined' \| 'granted'` | **region ids only. No coordinates, no timestamps finer than a date, no accuracy value.** `home` may be null (region is a lens, never a gate) |
| `StateFilter` | `stateId: string \| null` | independent of the preference above; `us-ga` is the only launched state |
| `SpeciesRegion` | `speciesKey`, `regionId`, `occurrence`, `nativity`, `support`, `sourceIds[]`, `checkedOn`, `reviewStatus: 'proposed' \| 'reviewed' \| 'published'` | `reviewStatus` is new; `support` records the strength of evidence and is never rounded up |
| `HabitatMembership` | `speciesKey -> habitats[]` | already `habitat.ts`; kept separate from region membership |

## 4. Counting rules (pinned by tests before any UI)
1. **Union once.** The collection for a selection (home + extras) is the set union of the species of each selected region. A species in two
   selected regions is counted once.
2. **Habitats are separate and overlap.** A species in two habitats appears in both habitat views. Per-habitat counts therefore may overlap;
   **a total is never the sum of habitat counts.** Region total = number of unique species in the union.
3. **Collected** = the player holds that card (`discoveries`), unchanged. It is never derived from location.
4. **State filter is an intersection applied last** and never replaces region choice. Until regional membership data is reviewed and
   published, the Georgia survey is the only list available, so the Georgia filter alone drives the Habitats screen, labelled "Georgia
   records", and its totals are never presented as a region total.
5. **No region data for a species** means the species is absent from that region's list, not "unlikely". Absence of a record is not proof of
   absence; copy must say so.
6. **Uncovered places** (Alaska, Hawaii, Puerto Rico, territories, open water) resolve to "no region yet". Scanning and the core app are
   unaffected.

## 5. Data flow and review gates
`research proposals (docs/regions/**, never imported)  ->  owner + botanical review  ->  promoted into a Tier 0 data file (human-only)  ->
statically bundled  ->  later mirrored to catalog_species_regions by a reviewed migration`.
- **No provisional assignment is imported into production.** Proposals carry provenance, support strength and uncertainty.
- The Georgia occurrence data (`region-species.ts`, `docs/georgia-occurrence.md`) is **unchanged** and remains the working data.
- The classification itself (the ten regions and their boundaries) is reviewed before any of this is treated as authoritative.
- Dataset and mapping versions are recorded so a boundary revision cannot silently change a player's region.

## 6. Ownership (per `agents/ownership.json`)
| Work | Owner |
|---|---|
| Region ids, `RegionPreference`, multi-region union and filter logic (`src/lib/region*`) | Quests lane (after this contract is approved) |
| Ecoregion rows, `reviewStatus`, any migration, `src/data` membership file | Coordinator, with the owner's approval; data file is Tier 0 |
| Lookup asset generator (`scripts/regions/**`) | Coordinator |
| Habitats interface | the owner's supervised UI session |
| Privacy and terms copy | owner (Tier 0) |

## 7. Invariants to pin in tests
- Union dedupes; sum-of-habitats is never used as a total; state filter never changes which regions are selected.
- The preference type has no field capable of holding coordinates; storage writes contain only ids and enum strings.
- A null home region leaves every existing screen exactly as today.
- With the feature flag off, the app is byte-for-byte today's behaviour and Georgia continues to work.
