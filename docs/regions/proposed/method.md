<!-- PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW -->
# Method note: occurrence evidence for the 45 cards (phase 1 only)

Date checked: 2026-11-24. Nothing here is imported into the app, database or production. `src/data` region-species data and `docs/georgia-occurrence.md` are untouched.

## What this is and is not

- It records, per card, taxonomy and occurrence evidence: source, range statement, native/introduced reading, date checked. See `membership/occurrence-evidence-45.csv` (one row per card) and the row-level `membership/evidence-45.csv`.
- **No card is assigned to any ecological region.** Every row has `region_assignment_status = awaiting-boundaries` and an empty `assigned_regions`. Assignment needs `docs/regions/proposed/region-mapping.csv` from `coord/region-boundaries-research`, which does not exist yet (checked 2026-11-24). Phase 2 is a later session.

## Source roles

| Source | Used for | Not used for |
|---|---|---|
| GBIF backbone | accepted-name check | range |
| WCVP via GBIF (provisional) | accepted name, synonyms, native/introduced range as published at TDWG level 3/4 | **establishing ecological-region occurrence** |
| GBIF occurrences | recording-effort counts per US state / Canadian province | range, nativity |
| GRIIS US via GBIF | introduced-status claim for 36 species | native status (absence means nothing) |
| POWO, Flora of North America, USDA PLANTS | **not reachable** (403 / proxy refusal, retried 2026-11-24); no content was filled from memory | |

WCVP is a coarse, state/province-scale checklist; it cannot say which ecological region inside a state a species occurs in. It is also GBIF's copy and not a POWO retrieval. It has no explicit native flag, so rows without `establishmentMeans=INTRODUCED` are read as native: please confirm against POWO when reachable.

## Genus cards

The nine `spp.` cards (acer, rubus, rhus, sambucus, rosa, salix, pinus, morus, quercus) stay genus-level. They have no WCVP range (WCVP is per species). Evidence is GBIF counts for the whole genus, labelled `evidence_scope=genus`: it describes the genus, not any species a player may meet, and no species or species-level identity is chosen or implied.

## Known disagreements (not reconciled)

Four species WCVP lists with no Georgia unit although the Georgia survey says confirmed or likely (solidago-canadensis, alliaria-petiolata, hypericum-perforatum, achillea-millefolium), and mentha-canadensis (WCVP Georgia native, survey insufficient). Absence from a checklist is not absence from the state. Card names are kept verbatim; WCVP name differences (e.g. Taraxacum "spec.") are recorded, never applied.

## Reproduce

`python3 scripts/regions/membership/collect_evidence.py && python3 scripts/regions/membership/summarize_evidence.py && python3 scripts/regions/membership/build_occurrence_table.py`
