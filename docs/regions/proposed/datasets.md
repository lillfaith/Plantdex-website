# Region boundary research: candidate datasets (PROPOSAL, not imported anywhere)

Researched 2026-11-24. Nothing here is imported into the app, a database or production.

## 0. Can the ten PlantDex regions be recovered from the repo?  Only partly.

`src/data/expansion-cards.json` (with `regionalModel`) is **not present on any branch this session can reach** (`integration`,
`claude/botanical-catalog-stage-1`; a text search of both found no `regionalModel`). What exists:

| Found | Where |
|---|---|
| The ten codes `NF, NE, AP, SE, GC, MW, GP, RM, SW, PC` | `docs/regions/ecoregion-data-contract.md` s1 |
| Two full names: "Southeast Piedmont & Inland Plains", "Gulf & Atlantic Coastal Plains" | `docs/regions/location-detection-design.md` s1 (UI example text) |
| Seven card-sheet group labels: Eastern & Central U.S.; Pacific Coast & California; Desert Southwest; Rocky Mountains & Intermountain West; Great Plains & Prairies; Gulf Coast & Subtropical South; Northern & Boreal | `evidence/expansion-86.json` (`pdf_group`) on the stage-1 branch |
| Per-card corrections such as `regions_corrected: ["PC","SW"]` for California Buckwheat | same file |

**Not found: the definition (boundary description) of any region.** `region-mapping.csv` therefore uses a **working expansion of the
codes that is an ASSUMPTION** (see `region-mapping-methods.md` s2). The owner must supply or approve the real definitions; the mapping
is only as good as that.

## 1. Datasets assessed

| | EPA US Level III (CONUS) | EPA/CEC North America Level III | USDA Bailey ecoregions | WWF Terrestrial Ecoregions |
|---|---|---|---|---|
| Owner | US EPA ORD, NHEERL Corvallis | EPA with Commission for Environmental Cooperation (CEC) | USDA Forest Service (Bailey 1995/2016) | World Wildlife Fund (Olson et al. 2001) |
| Licence | US federal work; metadata says use constraints "None". **Licence not independently confirmed; owner/legal to confirm before shipping a derivative** | same | not retrieved | not retrieved (WWF terms are non-trivial) |
| Version / date | Metadata pubdate 2013-04-16; shapefile files dated 2015-07-17; hosted copy last modified 2024-11-14. 85 CONUS Level III units | metadata: "2010 update"; "considered draft and subject to further refinements"; 181 Level III units for N. America | not retrieved | not retrieved |
| URL fetched | `https://dmap-prod-oms-edc.s3.us-east-1.amazonaws.com/ORD/Ecoregions/us/us_eco_l3.zip` | `https://dmap-prod-oms-edc.s3.us-east-1.amazonaws.com/ORD/Ecoregions/cec_na/NA_CEC_Eco_Level3.zip` | **BLOCKED** | **BLOCKED** |
| Landing page | `https://www.epa.gov/eco-research/ecoregions-north-america` (200) | same | | |
| CRS | USA Contiguous Albers Equal Area Conic (USGS), NAD83 | Lambert Azimuthal Equal Area, sphere R=6370997 m (no datum shift to WGS84; a few-hundred-metre ambiguity at most is irrelevant at 0.1 deg) | | |
| Size | zip 28,424,315 B; shp 41.5 MB; 1,250 polygon parts. sha256 of zip `9a65f63cf10d7386aa0d2b0f39c9d0ac3d51bf742eb59d750abcf65ecc12f633` | zip 35,596,630 B; shp 53.2 MB; 2,548 parts. sha256 `413f6024448918eafe9bf5ff8de58a141a90cbad256be9b7d81c45e6801a71a8` | | |
| Coverage | Lower 48 only | Canada, US incl. **Alaska**, Mexico; **no Hawaii, no Puerto Rico** (verified by point tests) | | |
| Known limitations | Generalised mapping scale (the metadata describes zones of gradual transition, not sharp lines); water bodies merged into neighbours; CONUS only; units are environmental, not floristic | draft status; older US revision than the CONUS file; coarser | | |

### Hosts and what was impossible (exact)
- Reachable and used: `dmap-prod-oms-edc.s3.us-east-1.amazonaws.com` (EPA data), `www.epa.gov`, `gaftp.epa.gov` (200 on `/` but the `EPADataCommons/ORD/Ecoregions/` path 404s), `pypi.org` (for `pyshp`, `shapely`, `pyproj`, `numpy`).
- **Blocked by the sandbox network policy (connection refused, curl code 000):** `data.fs.usda.gov` and `www.fs.usda.gov` (Bailey ecoregions: not downloaded), `files.worldwildlife.org` and `ecoregions.appspot.com` (WWF Terrestrial Ecoregions: not downloaded), `www.cec.org` (CEC originals and Level I/II files), `geodata.epa.gov`, `services.arcgis.com`, `www.sciencebase.gov`, `zenodo.org`, `www.naturalearthdata.com`.
- Consequences: Bailey and WWF are **not evaluated from data**; nothing about them below is measured. Level I/II zips under `cec_na/` returned 404 on the mirror; they are not needed because Level I/II codes are attributes of the Level III file.
- No coastline/land-mask dataset was reachable (Natural Earth blocked), so "land" in every measurement below means **inside an EPA Level III polygon**. EPA merges small coastal water into land, so coastal "land" is slightly generous.

## 2. Recommendation
Use **EPA US Level III (CONUS)** as the primary source: the 85 units are the finest official ecoregion framework with a clear owner and
documented method, and are small enough to map by hand. Use **NA Level III** only to *recognise* Alaska/Canada/Mexico as "outside
coverage" rather than guessing. Bailey is coarser (provinces, about 40 in the US) and WWF is global with its own US divisions; both
would need the same reviewed mapping and neither could be fetched here. Do not use state borders.
