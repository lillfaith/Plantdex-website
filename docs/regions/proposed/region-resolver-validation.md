# Resolver validation: simplified polygons versus the 0.1 degree grid (PROPOSAL, evidence only)

Researched 2026-11-25. Nothing here is imported into `src/`, `supabase/`, a workflow or production. Both resolvers are judged against the **unsimplified
EPA Level III polygons** mapped through the v2 table (`region-mapping-v2.csv`). That measures how well each *reproduces the map*; it says nothing about
whether the map's ten-region grouping is right (`region-mapping-review.md`), and 28% of land area is in units whose region the owner has to decide.

## 1. The two methods

| | Polygon resolver | Grid resolver |
|---|---|---|
| What ships | the 85 unit polygons, simplified (Douglas-Peucker, integer arithmetic) and stored once per shared border | a 585 x 250 array of 16-bit words |
| Lookup | exact integer even-odd point-in-polygon, then distance to region borders | one array read |
| Source | `scripts/regions/polygon_resolver.py` | `scripts/regions/region_grid.py` (rebuilt from the v2 mapping) |
| Size | **tol 0.005 deg: 222,672 B raw / 187,839 B gzip**; tol 0.003: 302,555 / 258,745; tol 0.01: 141,470 / 120,681; tol 0.02: 90,340 / 78,630; tol 0.04: 60,374 / 53,210 | **29,828 B raw / 12,198 B gzip** |
| Neighbour flag | true distance (km) to the nearest border with a different region, listed per region | a 10 km + half-cell-diagonal bitmask, so coarse (about 16 km in effect) |
| Also returns | unit number, unit state (`assigned`, `assigned-near`, `uncertain`) and the alternatives; `nearCoverageEdgeKm`; for a point outside, `nearRegions` | primary, neighbour bits, 2-bit unit uncertainty |

Tolerance is in 1e-4 degree (so `50` = 0.005 degree, about 550 m) and is a header field; a coarser asset is a different build, not different code.

## 2. How the test was made so neither method could be favoured

`scripts/regions/make_test_points.py` was written, run and **committed (`resolver-test-points.csv`) before either resolver file existed**. It reads only the official polygons and
the unit-to-region table, with seed 20261124 and a fixed draw order. 245 points:

| Stratum | n | How chosen |
|---|---|---|
| A uniform land | 70 | uniform over the lower-48 box, kept if inside an official polygon |
| B near a region boundary | 70 | as A, kept only if a unit in a *different* region lies within 12 km (boundary-biased on purpose) |
| C1 land at coverage edge | 25 | inside a polygon, within 4 km of the coast or border |
| C2 outside within 6 km | 25 | outside every polygon, within 6 km of one (truth: none) |
| D named places | 55 | public cities, borders, islands, Alaska, Hawaii, Puerto Rico, offshore and lakes, listed in the script |

Because B is boundary-biased, headline percentages over all 245 points **overstate** the error rate for a typical user; stratum A is the representative one. Truth is exact (integer polygon
containment is the same test the lookup code uses, and the lookup code was checked against shapely on the decoded geometry for 1,500 random land cells with **0 mismatches** at every tolerance).

A second, **non-blind** set is the first report's 54 places (`validation-points.csv`), chosen after seeing the grid fail: `v2/legacy-validation-results.csv`.

## 3. Results

### 3.1 The 245 blind points (`v2/resolver-evaluation.json`, per-point `v2/resolver-point-results.csv`)

| Method | Bytes | Correct | Wrong region on land | Land lost (no region) | Region claimed outside coverage | Every error carries a flag? |
|---|---|---|---|---|---|---|
| Grid 0.1 deg | 29,828 | 211 / 245 | 11 | 3 | **20 of 54 outside points** | land errors: 14 / 14 flagged; **outside claims: 0 / 20 flagged** |
| Polygon tol 0.003 | 302,555 | 244 / 245 | 0 | 1 | 0 | 1 / 1 |
| **Polygon tol 0.005** | **222,672** | **242 / 245** | 2 | 1 | 0 | **3 / 3** |
| Polygon tol 0.01 | 141,470 | 239 / 245 | 2 | 2 | 2 | 6 / 6 |
| Polygon tol 0.02 | 90,340 | 235 / 245 | 3 | 5 | 2 | 10 / 10 |
| Polygon tol 0.04 | 60,374 | 231 / 245 | 3 | 7 | 4 | 14 / 14 |

"Flagged" means the truth region appears in the neighbour list (`neighbours` or, for a point just outside, `nearRegions`), or for a false claim outside coverage that `nearCoverageEdgeKm` is set. The
three tol 0.005 errors: P075 (truth AP, answered SE, AP flagged), P090 (truth GC, answered SE, GC flagged), P155 (a coastal NF point answered "no region", NF offered in `nearRegions`).

Stratum A (representative land): grid 69 / 70, **every** polygon tolerance 70 / 70. Stratum B (within 12 km of another region): grid 61 / 70, polygon tol 0.005 68 / 70.
Share of uniform-land points carrying any flag (neighbour, uncertain unit, or coverage edge): grid 31%, polygon 33% (the polygon figure includes its coverage-edge flag and the unit's `uncertain` state). A flag that fires for one point in three is informative; the 91-100% in stratum B
shows what the boundary-biased sample looks like, not what users will see.

### 3.2 Area-weighted, a 6 km equal-area raster of the lower 48 (216,403 land cells, 7.79 million km2)

| Method | Land correct | Wrong region | No region on land | Wrong cells whose true region was flagged |
|---|---|---|---|---|
| Grid 0.1 deg | 98.730% | 1.244% | 0.026% | 2,748 / 2,748 |
| Polygon tol 0.003 | 99.927% | 0.046% | 0.028% | 159 / 159 |
| **Polygon tol 0.005** | **99.872%** | 0.078% | 0.049% | 276 / 276 |
| Polygon tol 0.01 | 99.774% | 0.139% | 0.087% | 489 / 489 |
| Polygon tol 0.02 | 99.562% | 0.289% | 0.149% | 948 / 948 |
| Polygon tol 0.04 | 99.207% | 0.553% | 0.239% | 1,714 / 1,715 (the one exception, near 38.27, -77.03, is a cell where my shapely decode and the pure lookup disagree; the lookup answers GC, the truth) |

The grid is wrong about **16 times** as much land as the 0.005 polygon (1.24% against 0.08%). Both keep the flag honest: in neither case does a wrong primary hide the true region, with one
exception at the coarsest polygon. The grid, however, also claims land it does not have: for **37% of the points that are outside coverage** it names a region and says nothing (Tijuana PC, Nogales Sonora
SW, Matamoros GC, Niagara Falls ON NE, Windsor ON MW, Padre Island TX GC, mid-Lake Superior NF).

### 3.3 The first report's known failures (non-blind, `v2/legacy-validation-results.csv`)

| Place | Truth | Grid 0.1 | Polygon tol 0.005 |
|---|---|---|---|
| Washington DC | SE | **NE** (SE flagged) | SE (NE flagged) |
| Memphis TN | SE | **GC** (SE flagged) | SE (GC flagged) |
| Little Rock AR | SE | **GC** (AP, SE flagged) | SE (AP, GC flagged) |
| Tijuana MX | none | **PC**, no flag | none, PC offered in `nearRegions` |

All four reproduce on the grid, and all four are correct on the polygon resolver. 54 places: grid 4 wrong, polygon 0 wrong.

### 3.4 Other required cases
- **Cross-border** (Tijuana, Ciudad Juarez, Nogales, Matamoros, Niagara Falls ON, Windsor ON, Vancouver, Montreal, Sault Ste Marie): polygon resolver returns "no region" for all, with the neighbouring US region offered where it is within 10 km. The grid names a region for five of them.
- **Alaska, Hawaii, Puerto Rico, US Virgin Islands** (Anchorage, Fairbanks, Juneau, Honolulu, Hilo, San Juan, Ponce, Charlotte Amalie): "no region yet" on both, as designed (`licence-and-provenance.md` s3).
- **Offshore and lakes** (Gulf, Atlantic, Pacific, Lake Michigan, Lake Erie): "no region" on both. Mid-Lake Superior: grid says NF; polygon says none (nearRegions NF).
- **Coastal strips and islands** (Key West, Cape Hatteras, Outer Banks, Cape Cod, Nantucket, Block Island, Long Island, Santa Catalina, Isle Royale, Mackinac): all correct on the polygon resolver at tol 0.005; the grid loses Galveston (returns no region, GC flagged). At the coarsest polygon tolerances small islands are lost (see s4).
- **Boundary points** (stratum B and the Memphis / Philadelphia / Baltimore / Little Rock points): see s3.1.

## 4. What the evidence says, and the failure modes

1. **Polygon wins on accuracy by a wide margin** and by construction cannot answer outside its coverage. At 0.005 degree it reproduces 99.87% of land and every miss is flagged.
2. **It is 7.5 times larger** (223 KB against 30 KB raw; 188 KB against 12 KB gzipped, because varint coordinates compress poorly). It would be a lazy-loaded asset, not part of the first bundle. I am **not**
   recommending it because it is accurate "for free": the cost is real and the owner should weigh it.
3. **Simplification loses small things.** Mackinac Island and a handful of barrier-island slivers disappear at 0.01 degree and coarser; at tol 0.005 one coastal NF point still returns "no region". The
   `nearRegions` hint exists for exactly this case, and it is why a coastal user is offered a region instead of silence.
4. **A 0.005 degree border is not the true border.** A point 500 m from a region line can fall on either side (P075, P090 at 0.005). That is inherent in a generalised source map (EPA says so) and is what the
   neighbour flag is for.
5. **Neither method is better than the map.** If the owner moves Memphis's unit from SE to GC, both are wrong in the same way until regenerated.
6. **The grid's flag can mislead in the other direction**: with a 16 km effective radius it flags broadly; the polygon flag uses the real distance and a stated band (`band_km`, default 10).

## 5. Determinism and provenance

`scripts/regions/verify_determinism.py` built the 0.005 asset five ways: normally; under `PYTHONHASHSEED` 1 and 777 in fresh interpreters; and in-process with `sin`, `cos`, `atan2`, `log`, `sqrt` and `asin`
replaced by versions returning the next float up, and then the next float down (the kind of difference a different libm makes). **All five sha256 are identical (`c927f213528a8da1...`).** This is
engineered rather than lucky: after one hand-written inverse projection the pipeline is integers only (quantise to 1e-4 degree, noding by shared edges, Douglas-Peucker with exact integer cross
products, ties to the lowest index, canonical arc direction, LEB128 output, no GEOS, no compressor, no timestamp). **What was not measured:** a different machine, CPU or Python build (this sandbox has one), and a
Python/JS lookup parity (no TypeScript port was written). The lookup uses `sqrt`/`hypot` only for the distance flag, never to choose the primary region.

The grid generator still uses GEOS predicates (the first report said so); two hash-seed builds matched, a second machine was not tested. That is a determinism disadvantage of the grid, not of the idea.

Source provenance for every number: `licence-and-provenance.md`. Asset headers record tolerance; `v2/region-grid-0.1-v2-manifest.json` records the grid's toolchain and the source hashes.

## 6. Recommendation (the owner decides)

1. **Do not choose the grid because it is small.** Its 1.24% wrong land is not a rounding error: every error is flagged, but it also claims regions outside the country with no flag.
2. **Recommend the simplified-polygon resolver at tolerance 0.005 degree (223 KB raw)**, shipped lazily, with the `unitState` and `nearRegions` outputs surfaced to the UI: an `uncertain` unit is a question,
   not an answer.
3. If a size budget under about 100 KB is a hard requirement, the honest fallbacks are polygon tol 0.02 (90 KB; 99.56%) or the 0.1 grid **plus** a coverage test against the polygon outline, never the grid alone.
4. **Gate on the owner's decisions first**: the boundary rule for the 16 `uncertain` units (28% of land is in OWNER-basis rows) matters more to correctness than any choice between these resolvers.
5. Before anything is imported: add the generator to CI as a byte comparison, port `lookup` to TypeScript and test parity on `resolver-test-points.csv`, and confirm the EPA licence for a derivative.
