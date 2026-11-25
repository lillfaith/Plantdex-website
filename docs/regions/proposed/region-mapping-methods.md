> **CORRECTION 2026-11-25.** The ten regions' names, codes and per-card assignments **were recovered** from `claude/plantdex-v0-3-supabase-verify-iic8pz` (see `region-taxonomy.md`). Earlier text here claiming they were not on any reachable branch was wrong (I searched the wrong branches), and every region name below that I had "assumed" is **withdrawn**. The mapping is superseded by `region-mapping-v2.csv` and `region-mapping-review.md`; resolver evidence is in `region-resolver-validation.md`.

# Region mapping and lookup grid: methods, measurements, recommendation (PROPOSAL)

**Status: PROPOSAL for owner and botanical review. Nothing here is imported into `src/`, a database, a workflow or production.** No
coordinates of any person were collected or used; the validation points are public cities and coastlines. See `datasets.md` for the data
sources and the hosts that were blocked.

Files: `region-mapping.csv` (85 rows), `region-grid-{0.5,0.25,0.1}.bin` + `region-grid-manifest.json` (candidate assets),
`region-grid-evaluation.json` (measurements), `validation-points.csv` and `validation-results.md`, generators in `scripts/regions/`.

## 1. Headline
- Source: EPA Level III ecoregions of the lower 48 (85 units, 2013 revision), mapped to the ten PlantDex regions by a **proposed,
  unreviewed** table. 51 of 85 units straddle two regions; 11 are high-uncertainty (8.8% of land area), 40 medium (49.8%), 34 low (41.4%).
- **Recommended asset: the 0.1 degree grid, 29,204 bytes as run-length data (about 11.8 KB gzipped; 292,500 bytes raw).** Against the full
  polygons it is correct for **98.75% of land area**; every wrong-region error lies within **8.5 km** of a region boundary (mean 3.4 km) and
  **100% of errors list the true region in the neighbour flag**. 14.9% of land is flagged "near a boundary" at a 10 km band.
- The size limit in the design ("a few hundred KB at most") is not a constraint: even the finest candidate is under 30 KB.
- **The accuracy figures are for the lookup, not for the mapping.** They say the grid reproduces the polygons; they cannot say the polygons
  grouped into ten regions are the right ten regions. That is the owner and botanical review, and is the largest uncertainty.

## 2. The ten regions
**Withdrawn.** This section used working names I had assumed. The recovered, exact names are in `region-legend.csv` and `region-taxonomy.md`; the review against them is `region-mapping-review.md` (four primaries changed: units 36-39 to AP). The v1 consequences listed here (no Interior Highlands region; Ozarks in MW) were artefacts of the wrong assumption.

## 3. The mapping table
`region-mapping.csv`: one row per EPA unit with primary region, optional secondary, `straddles`, `uncertainty` (low/medium/high),
a rationale and status `PROPOSED-UNREVIEWED` on every row. Nothing is inferred from state borders or from a species list. A secondary
region means "an honest reviewer could place it either way", not that the unit is split. `make_mapping_csv.py` fails if a unit is
missing or a code is wrong. **Assumptions:** the ten definitions above; that a whole Level III unit belongs to one region (units are not
split, so a true boundary running through a unit is not representable); that region membership is a lens on where a plant is likely to be
found, not a claim about range.

Primary-region land share (area weighted): GP 23.4%, RM 16.8%, MW 13.5%, SE 11.3%, SW 10.8%, PC 6.3%, GC 5.6%, AP 5.4%, NF 4.9%, NE 2.0%.
NE is tiny under this reading; if the Northeast should be larger the owner must say what belongs to it.

## 4. The lookup grid
- **Why a grid and not polygons:** the EPA polygons are 41 MB and millions of vertices; a grid is a few KB, needs no geometry library, is a
  single array read, and the cell index is already a coarsened coordinate (see s7).
- **Coverage:** longitude -125.0 to -66.5, latitude 24.5 to 49.5 (lower 48). Anything outside the extent returns "outside coverage"; Alaska,
  Hawaii and Puerto Rico are outside the extent and no dataset in this set covers Hawaii or Puerto Rico. Alaska exists in the NA Level III
  file but is not mapped (contract rule 6: "no region yet").
- **Cell value (16 bits):** bits 0-3 primary region (1-10, 0 = none); bits 4-13 neighbour mask (one bit per region); bits 14-15 mapping
  uncertainty of the cell's dominant unit (0 low, 1 medium, 2 high). A cell's primary region is the region with most sample points among
  a lattice of sub-samples (3x3 at 0.1, 5x5 at 0.25, 10x10 at 0.5), ties to the lower index. Any land makes the cell land, so a coastal
  resident resolves; the price is that cells overhanging the coast or border can claim a few kilometres of water or foreign land.
- **Encoding:** 22-byte header, then `(uint16 word, LEB128 run-length)` pairs, row-major, north row first. Decoding it once into a
  `Uint16Array` is all the app needs; the reference decoder and `lookup()` are in `region_grid.py`. A TypeScript port is for the Quests lane
  and is not written here.
- **Determinism:** coordinates are integers (1e-4 degree) until one division; projection is hand-written pure math (`albers()`, checked
  against pyproj: maximum difference 0.0 m over 20,000 points); every tie breaks on an integer; the band radius is rounded to whole metres;
  no compressor or timestamp is in the output. **Measured:** two full runs with `PYTHONHASHSEED` 1 and 777 produced byte-identical files
  (`c0739ee6...` 0.1, `c0d9a78f...` 0.25, `e3a23bf0...` 0.5, manifest `1ceee9a9...`). **Not measured:** a second machine. The generator
  depends on GEOS predicates for points near polygon edges; the manifest records Python, numpy, shapely, GEOS and pyshp versions so a
  difference is attributable, and the repo's usual generated-file test (re-run the generator in CI, compare bytes) is the thing that would
  prove cross-machine identity. Runtime was about 12 minutes for all three resolutions on one core here, so a CI check is practical but not quick.

## 5. Measurements against the full polygons
Truth = the polygon containing a point, mapped to its region. Samples are every land cell of a 3 km equal-area raster (865,516 cells,
7.79 million km2), so every figure is **area-weighted share of land**. Boundary distance is distance to the nearest *other region* (coast
and national border are not boundaries), accurate to about 3 km.

| Resolution | Cells | RLE bytes | gzip bytes | Raw bytes | Land correct | Wrong region | Wrong-region distance to boundary (mean / p95 / max km) | Errors with true region in neighbour flag | Land flagged near boundary (10 km band) |
|---|---|---|---|---|---|---|---|---|---|
| 0.5 deg | 5,850 | 4,168 | 1,775 | 11,700 | 95.54% | 4.45% | 7.6 / 18.0 / 46.7 | 100% | 31.5% |
| 0.25 deg | 23,400 | 9,879 | 4,039 | 46,800 | 97.33% | 2.65% | 5.0 / 9.5 / 19.2 | 100% | 22.0% |
| **0.1 deg** | 146,250 | 29,204 | 11,839 | 292,500 | **98.75%** | 1.22% | 3.4 / 6.0 / 8.5 | 100% | 14.9% |

Notes. (a) The remaining 0.006 / 0.017 / 0.031% of land is "coastal sliver" error: a thin barrier island or key that no sub-sample hit, so
the cell says "no region" (Cape Hatteras at 0.25 degrees); all of these list the true region in the flag, so "no region, but GC within 10 km"
is the app's cue to offer GC. (b) Accuracy more than 25 km from any boundary is 99.96-99.98% (the same slivers). (c) The flag share falls with
resolution because the band is widened by the half cell diagonal (a 0.5 degree cell is about 55 km wide); a coarse grid must claim more
uncertainty. (d) Units where *the table itself* is uncertain are separate from this: 8.8% of land is in high-uncertainty units, flagged by the
two uncertainty bits, not by the neighbour mask. An earlier run folded each unit's secondary region into the mask; that flagged 65-70% of
land as "near a boundary", which says nothing, so the two signals are kept apart.

**Share of land within a distance of another region** (area weighted, measured from the raster): 5 km 3.95%, 10 km 8.69%, 25 km 19.48%,
50 km 33.60%, 100 km 54.45%. Half of the country is within about 100 km of a boundary, which is why a boundary rule is needed at all.

## 6. Boundary-uncertainty rule (proposal)
Return `{primary, neighbours, mappingUncertainty}` from one cell read:
1. `primary` = bits 0-3. If 0, the point is outside coverage unless `neighbours` has exactly one region, in which case say "just off the coast
   of <region>" and offer it.
2. `neighbours` = every other region within **10 km of the cell centre, plus half the cell diagonal** (about 6 km at 0.1 degrees, so about
   16 km in effect). Measured: with this rule **no wrong-region or coastal-sliver error went unflagged** at any resolution, and the worst
   wrong-region error was 8.5 km from a boundary at 0.1 degrees.
3. `confidence` = `near-boundary` when `neighbours` is non-empty (14.9% of land), else `confident`. A `near-boundary` result offers "Add
   <neighbour> too?" per the design doc.
4. `mappingUncertainty` (high for 8.8% of land) is shown separately and says "the line between these two is a judgement"; it does not
   change the answer, and it is not derived from the user's position.
A band of 10 km was chosen because the finest grid's p95 error is 6 km and its maximum 8.5 km. A 25 km band would flag 22%+ of land for no
extra safety at 0.1 degrees. The band is a header field (`band_km`) so a revised value needs a regenerated asset, not a code change.

## 7. Privacy notes (for the sign-off checklist)
The cell index is itself a coarsening: a 0.1 degree cell is about 11 km tall and 8-10 km wide in the lower 48. The design's "coordinate
is rounded to the lookup resolution the instant it arrives" is therefore just taking the cell index. Nothing in these scripts reads a
user location; the only coordinates are the public places in `validation-points.csv`.

## 8. Known problems the evaluation surfaced (not fixed, by design)
- **Real misclassifications at boundaries:** Memphis resolves GC (the Mississippi Alluvial Plain cell) though its polygon is SE; Little Rock
  is SE by polygon but GC/SE/MW depending on resolution; Washington DC is SE by polygon and NE at 0.1 degrees. All three list the true region
  as a neighbour, which is exactly the case the rule exists for.
- **Border leak:** Tijuana (Mexico) resolves PC because its 0.1 degree cell also covers San Diego County. Coverage says "US only"; the app
  should not claim a country check. A one-bit "partly outside" flag would fix this and needs the 2-bit uncertainty field squeezed to 1.
- **Lake water:** Lake Michigan mid-lake is "no region", but Great Lakes shorelines can sit in cells that include open water.
- **No land mask:** Natural Earth was blocked, so coasts are EPA's own merged coastline, not an independent one.

## 9. Recommendation
1. Owner reviews the ten definitions first; then botanical review of the 51 straddling units, starting with the 11 high-uncertainty ones.
2. Adopt the **0.1 degree** grid with the 10 km band (29 KB; falls to about 12 KB over gzip with no code change). 0.25 degrees (9.9 KB, 97.3%)
   is a defensible fallback if payload matters; 0.5 degrees is not recommended (4.5% of land wrong).
3. Treat the result as a suggestion ("We think you are in...") exactly as the design says; never as a fact about a plant's range.
4. Add the generator to CI as a byte-comparison check before the asset is ever imported; confirm the licence for a derived grid.
5. Decide Alaska, Hawaii and Puerto Rico before launch (they are outside every dataset reachable here).
