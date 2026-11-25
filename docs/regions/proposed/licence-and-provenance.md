# Licence and provenance of every dataset used (PROPOSAL, docs only)

Checked 2026-11-24/25. **Licence is not legal advice and none of the entries below has been confirmed by the owner or counsel before a derivative ships.**
"Not confirmed" means I could read a statement in the dataset's own metadata and no more.

## 1. Datasets used

### 1.1 EPA Level III Ecoregions of the Conterminous United States (the source of every boundary)
| | |
|---|---|
| Dataset | "Level III Ecoregions of the Conterminous United States" (`us_eco_l3`) |
| Origin / publisher (metadata) | US Environmental Protection Agency; U.S. EPA Office of Research and Development (ORD), National Health and Environmental Effects Research Laboratory (NHEERL), Corvallis, OR |
| Version | metadata `pubdate` 20130416 ("This file differs from the previous file in that Arizona ecoregions were updated"); hosted object `Last-Modified` 2024-11-14 17:09:20 GMT |
| Exact URL fetched | `https://dmap-prod-oms-edc.s3.us-east-1.amazonaws.com/ORD/Ecoregions/us/us_eco_l3.zip` (EPA landing page: `https://www.epa.gov/eco-research/ecoregions-north-america`) |
| Hashes | zip 28,424,315 B, sha256 `9a65f63cf10d7386aa0d2b0f39c9d0ac3d51bf742eb59d750abcf65ecc12f633`; `us_eco_l3.shp` 41,469,852 B, sha256 `b7519b2cbd5a82d9641ed8e353bb5d3c1a0708acd8e9eb7059f1efd9744f778d`; `us_eco_l3.dbf` sha256 `8f9a58a3839df4e96caf19ed5846b36d26ded7fd5a08c16fe4b6c7c33faf9801` |
| Extent / CRS | CONUS only (bounding box -127.89..-65.35, 22.90..51.60 per metadata); USA Contiguous Albers Equal Area Conic (USGS version), GRS 1980 |
| Licence statement (verbatim from the file's metadata) | Access constraints: "None." Use constraints: "None. Please check sources, scale, accuracy, currentness and other available information. Please confirm that you are using the most recent copy of both data and metadata.  Acknowledgement of the EPA would be appreciated." Liability: "no warranty expressed or implied ... The U.S. Environmental Protection Agency shall not be held liable for improper or incorrect use of the data". |
| Reading | EPA is a US federal agency, and this reads as a US-government work with no use restriction and a request for acknowledgement. **Not confirmed**: no explicit licence identifier (CC0 or similar) appears in the metadata or on the landing page text I could read. Counsel/owner should confirm before shipping a derived asset. |
| Citation text | The metadata's own request is acknowledgement of the EPA. Suggested attribution: "Ecoregion boundaries: U.S. EPA, Level III Ecoregions of the Conterminous United States (2013), Office of Research and Development, NHEERL, Corvallis, OR." The scholarly reference EPA's programme usually points to is Omernik, J.M. and Griffith, G.E. (2014), "Ecoregions of the conterminous United States: evolution of a hierarchical spatial framework", *Environmental Management* 54(6):1249-1266. **I recalled that reference from memory; it was not in the metadata or the page text I fetched, so verify it before printing.** |
| Known limits (from the metadata) | collected with "unknown accuracy (EPA National Geospatial Data Policy Tier 10)"; except for the Great Lakes, waterbodies were merged into surrounding ecoregion polygons, especially along coastlines |
| Used for | every boundary, the 85 unit names, area and the Level II/I labels. The shipped candidates are **derivatives** (simplified, quantised polygons; a 0.1 degree grid) |

### 1.2 EPA Level IV Ecoregions of the Conterminous United States (inspection only)
`https://dmap-prod-oms-edc.s3.us-east-1.amazonaws.com/ORD/Ecoregions/us/us_eco_l4.zip`, 66,167,640 B, sha256 `7d01a1a5802af0da0f7afbb0a8cd04d1e1756ac4d143f1a3efe73ab694051acd`
(`us_eco_l4_no_st.shp` sha256 `37042646175e8556c601c48d3fd8744377730f2ae319d1fe5fe12b30fc060b32`), metadata `pubdate` 20130416, `Last-Modified` 2024-11-14, same access and use
constraints as 1.1. Used **only** to read the 968 sub-unit names inside each Level III unit (`region-mapping-review.md` s3). Nothing in any asset derives from it.

### 1.3 EPA / CEC "Ecological Regions of North America" Level III (first report, not used for any v2 asset)
`.../ORD/Ecoregions/cec_na/NA_CEC_Eco_Level3.zip`, sha256 `413f6024448918eafe9bf5ff8de58a141a90cbad256be9b7d81c45e6801a71a8` (from the first report). Metadata "2010 update", "considered draft and subject
to further refinements". Covers Canada, the US including **Alaska**, and Mexico; no Hawaii, no Puerto Rico. **Not re-downloaded this session**, and no v2 asset uses it. It is the only dataset
reached that covers Alaska.

### 1.4 PlantDex owner's own region definition and per-card regions
`expansion/source/PlantDex_85_All_Requested_Corrections.json` (sha256 `7a2061e1ca7a6c2044e69dae358d976535feede2ae120f191006a37ea336bf67`) and `PlantDex_85_ALL_Corrections_Claude_Master.xlsx`
(sha256 `a38a930a3cb561b4a159c2fa8d72bee611b675cb5da8c95d03042f920dff1637`), on `claude/plantdex-v0-3-supabase-verify-iic8pz`, introduced in commit `a9953722` (2026-11-17). Owner-supplied; used for names and
the diagnostic only. Extracted to `recovered-card-regions-139.csv`.

### 1.5 GBIF occurrence search (diagnostic only)
`https://api.gbif.org/v1/species/match` and `https://api.gbif.org/v1/occurrence/search`, queried 2026-11-25 with only a species name, a taxon key and fixed filters (no PlantDex or user data). Records carry
**individual licences** (CC0, CC BY, CC BY-NC are all present in GBIF); the research committed here holds only per-species region percentages and **no record, coordinate or observer**. The raw responses
are cached outside the repo and are not committed. This is a sampled API query, not a GBIF download with a DOI, so **a published use would need a proper download and its citation**; do not present these
counts as a GBIF-cited result. Sampling is effort-biased, includes cultivated and escaped plants, and is limited to the first 9,000 records per species (deep paging stalls).

## 2. Datasets tried and not reachable (exact hosts)
Connection refused by the session's network policy (curl code 000, re-tested 2026-11-25): `data.fs.usda.gov` (USDA Bailey ecoregions), `files.worldwildlife.org` (WWF Terrestrial Ecoregions),
`www.naturalearthdata.com` and `naciscdn.org` (land mask), `geodata.epa.gov`, `www.cec.org`. Consequence: no independent coastline, so "land" means "inside an EPA polygon", and no
second ecoregion framework to cross-check against.

## 3. Alaska, Hawaii, Puerto Rico and unsupported locations (decision for the owner; behaviour proposed)
The mapped area is the contiguous US plus the near coast. Everything else returns **`status: "no-region-yet"` with `region: null`, never an error and never a guess**:

| Place | Result | Why |
|---|---|---|
| Alaska (Anchorage, Fairbanks, Juneau tested) | no-region-yet | outside the CONUS polygons; the CEC file covers Alaska but is a different, older, draft framework and is not mapped to the ten regions |
| Hawaii (Honolulu, Hilo) | no-region-yet | no dataset reached covers it |
| Puerto Rico, US Virgin Islands | no-region-yet | same |
| Canada, Mexico, Cuba, Bahamas | no-region-yet; **nearRegions** lists a US region when one is within 10 km (Tijuana: PC; Windsor: MW; Niagara Falls ON: NE) | the app must not claim a country check |
| Open water, Great Lakes mid-lake | no-region-yet | outside any polygon; a point within 10 km of shore gets `nearRegions` |
| Just off the coast | no-region-yet + `nearRegions` | so a coastal resident is offered the right region instead of silence |

All 29 named places outside coverage (stratum D) resolve this way on the polygon resolver (`v2/resolver-point-results.csv`); the grid instead returns a region for 20 of the 54 points that are outside coverage (13 of 25
within 6 km, and Tijuana, Nogales Sonora, Matamoros, Niagara Falls, Windsor, Padre Island, mid-Lake Superior), with no flag at all.
Giving Alaska, Hawaii or Puerto Rico a region needs (a) a boundary dataset covering them and (b) a decision on which of the ten regions they fall into, **or** an eleventh and twelfth region; neither is
recoverable from the owner's model, which lists ten regions of the "US" with no statement about territories.
