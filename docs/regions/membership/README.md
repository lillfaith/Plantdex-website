<!-- PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW -->
# Region membership research, 45 original cards

**PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW.** Nothing here is authoritative or wired into the app.

## Status

- **Phase 1 (evidence): done** with the limits below. `evidence-45.csv` (513 rows), `evidence-summary.md`, raw API responses in `raw/`.
- **Phase 2 (proposed membership): NOT RUN.** It needs `docs/regions/proposed/region-mapping.csv` on `origin/coord/region-boundaries-research`, and that branch does not exist (`git ls-remote --heads origin 'coord/*'`, 2026-11-24). So `proposed-membership-45.csv` and `method.md` do not exist, and no species has been assigned to any region. A rule written now, without the mapping, would be guessed.
- **Georgia validation:** only the Phase-1 form was possible (see the summary). The check "every confirmed/likely Georgia species is proposed in a region Georgia intersects" needs Phase 2.

## Sources that could not be reached

| Source | What happened |
|---|---|
| POWO | 403 Cloudflare challenge on every path. |
| Flora of North America (efloras.org) | 403 Cloudflare challenge; `www.efloras.org` does not resolve. |
| USDA PLANTS | `plants.usda.gov` 301s to `plants.sc.egov.usda.gov`, refused by the proxy (403). |

No challenge was bypassed and no gap was filled from memory. WCVP (the checklist POWO publishes) was read through GBIF's copy and is labelled as such everywhere. It is not a POWO retrieval.

## Reproduce

```bash
python3 scripts/regions/membership/collect_evidence.py     # ~4 min, api.gbif.org only
python3 scripts/regions/membership/summarize_evidence.py
```

## Method notes a reviewer should know

- Card names are kept verbatim; WCVP accepted-name differences are recorded, never applied (e.g. card 1, 8, 13, 34, 40 have different WCVP statuses; see the CSV `name_status` rows).
- WCVP via GBIF has no explicit "native" flag: rows without `establishmentMeans=INTRODUCED` are read as native. Please confirm that reading against POWO once it is reachable.
- GBIF counts use `speciesKey` (subspecies folded in) and genus keys for the nine `spp.` cards. Counts are recording effort, not range.
- The GADM-id-to-name map is read from the occurrence records themselves (`raw/gadm-level1-names.json`).
