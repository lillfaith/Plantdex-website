# Owner picks vs available alternatives (permutation tests)

Random pool sample: 400 photographs across 5 species. Owner picks: 19.
Mean of each feature for the owner's picks vs the same statistic for random draws of the same size. p = two-sided permutation p. **Bonferroni threshold is stated per table; nominal p-values below it are chance-prone.**

## Observation and photo metadata (all 19 picks; is any of it a *signal*, or just how iNaturalist photos look?)

| field | owner mean | random-photo mean | p |
|---|---|---|---|
| flowering_annotated | 0.32 | 0.40 | 0.484 |
| fruiting_annotated | 0.00 | 0.10 | 0.236 |
| has_faves | 0.11 | 0.05 | 0.230 |
| agreements_2plus | 0.16 | 0.12 | 0.714 |
| multi_photo_observation | 0.37 | 0.75 | 0.000 |
| is_cover_photo (multi-photo observations only; owner n=7) | 0.29 | 0.53 | 0.260 |
| photos_on_observation | 1.89 | 2.66 | 0.046 |
| orig_long_edge | 1991.53 | 2031.09 | 0.036 |

## main: owner picks (n=8) vs sample; 34 features tested; Bonferroni threshold 0.0015

| feature | owner mean | sample mean | owner mean's percentile in sample | p | passes Bonferroni |
|---|---|---|---|---|---|
| m.bg_spread | 0.480 | 0.669 | 0.11 | 0.0003 | YES |
| m.largest.solidity | 0.458 | 0.618 | 0.25 | 0.0221 | no |
| m.largest.w_frac | 0.714 | 0.506 | 0.74 | 0.0304 | no |
| m.boundary_delta_e | 71.175 | 54.589 | 0.70 | 0.0872 | no |
| m.largest.coherence | 0.991 | 0.883 | 0.40 | 0.0893 | no |
| m.flower_blob.h_frac | 0.093 | 0.169 | 0.34 | 0.1105 | no |
| m.largest.h_frac | 0.642 | 0.504 | 0.63 | 0.1548 | no |
| m.flower_blob.area | 0.006 | 0.019 | 0.46 | 0.1945 | no |
| m.significant_components | 1.000 | 1.397 | 0.75 | 0.1963 | no |
| m.largest.n_touch | 1.000 | 0.607 | 0.84 | 0.2148 | no |
| m.stalk_like_components | 1.000 | 1.286 | 0.81 | 0.3001 | no |
| m.flower_blob.n_significant | 4.125 | 3.200 | 0.78 | 0.3843 | no |
| m.largest.aspect_h_over_w | 1.121 | 1.279 | 0.51 | 0.4835 | no |
| m.flower_blob.ring_delta_e | 78.812 | 72.829 | 0.60 | 0.4990 | no |

## pixel: owner picks (n=6) vs sample; 34 features tested; Bonferroni threshold 0.0015

| feature | owner mean | sample mean | owner mean's percentile in sample | p | passes Bonferroni |
|---|---|---|---|---|---|
| m.flower_share | 0.506 | 0.232 | 0.85 | 0.0019 | no |
| px.opaque_fraction | 0.296 | 0.211 | 0.83 | 0.0204 | no |
| m.flower_blob.area | 0.076 | 0.019 | 0.94 | 0.0285 | no |
| m.bg_busy | 0.160 | 0.449 | 0.26 | 0.0308 | no |
| px.bbox_fill | 0.604 | 0.483 | 0.86 | 0.0362 | no |
| m.flower_blob.h_frac | 0.290 | 0.169 | 0.85 | 0.0382 | no |
| m.flower_blob.n_significant | 1.333 | 3.208 | 0.36 | 0.0965 | no |
| hands.frac | 0.074 | 0.031 | 0.89 | 0.1117 | no |
| px.components | 1.800 | 1.313 | 0.87 | 0.1661 | no |
| m.largest.w_frac | 0.660 | 0.507 | 0.68 | 0.1726 | no |
| m.largest.h_frac | 0.640 | 0.505 | 0.63 | 0.2311 | no |
| m.largest.area | 0.171 | 0.119 | 0.75 | 0.2784 | no |
| m.flower_blob.solidity | 0.700 | 0.637 | 0.70 | 0.2840 | no |
| m.largest.solidity | 0.531 | 0.617 | 0.39 | 0.2969 | no |

## tall: owner picks (n=5) vs sample; 34 features tested; Bonferroni threshold 0.0015

| feature | owner mean | sample mean | owner mean's percentile in sample | p | passes Bonferroni |
|---|---|---|---|---|---|
| frame.aspect_w_over_h | 1.312 | 0.919 | 0.77 | 0.0065 | no |
| m.largest.solidity | 0.436 | 0.618 | 0.21 | 0.0675 | no |
| m.flower_share | 0.395 | 0.231 | 0.73 | 0.1310 | no |
| hands.frac | 0.000 | 0.031 | 0.40 | 0.1738 | no |
| m.colourfulness | 0.223 | 0.325 | 0.33 | 0.2077 | no |
| m.bg_green_share | 0.601 | 0.419 | 0.70 | 0.2569 | no |
| m.flower_blob.solidity | 0.553 | 0.637 | 0.28 | 0.2965 | no |
| m.largest.area | 0.061 | 0.118 | 0.43 | 0.3166 | no |
| m.exposure_v | 0.724 | 0.673 | 0.59 | 0.4566 | no |
| px.bbox_fill | 0.438 | 0.483 | 0.33 | 0.5077 | no |
| px.colours | 6.667 | 7.367 | 0.30 | 0.5078 | no |
| m.flower_blob.n_significant | 4.333 | 3.178 | 0.78 | 0.5574 | no |
| px.legibility | 0.350 | 0.439 | 0.13 | 0.6051 | no |
| m.largest.coherence | 0.837 | 0.883 | 0.29 | 0.6413 | no |

## Finished-asset proxies by group (cutout and real 24x24 reduction; automatic measurements, not a visual verdict)

### main

| proxy | owner | v3 top-5 | v2 top-5 | random sample |
|---|---|---|---|---|
| m.largest.coherence | 0.99 (n=8) | 1.00 (n=24) | 1.00 (n=25) | 0.88 (n=315) |
| m.largest.solidity | 0.46 (n=8) | 0.55 (n=24) | 0.52 (n=25) | 0.62 (n=315) |
| m.largest.n_touch | 1.00 (n=8) | 0.29 (n=24) | 0.40 (n=25) | 0.61 (n=315) |
| m.bg_busy | 0.37 (n=8) | 0.33 (n=24) | 0.29 (n=25) | 0.45 (n=315) |
| m.boundary_delta_e | 71.18 (n=8) | 51.10 (n=24) | 53.32 (n=25) | 54.55 (n=315) |
| m.flower_share | 0.26 (n=8) | 0.24 (n=24) | 0.30 (n=25) | 0.23 (n=315) |
| m.stalk_like_components | 1.00 (n=8) | 1.00 (n=24) | 1.00 (n=25) | 1.29 (n=315) |
| px.legibility | 0.45 (n=8) | 0.41 (n=22) | 0.40 (n=24) | 0.44 (n=204) |
| px.colours | 7.50 (n=8) | 6.77 (n=22) | 7.08 (n=24) | 7.37 (n=204) |
| px.components | 1.00 (n=8) | 1.23 (n=22) | 1.25 (n=24) | 1.30 (n=204) |
| px.bbox_fill | 0.49 (n=8) | 0.46 (n=22) | 0.47 (n=24) | 0.48 (n=204) |
| px.opaque_fraction | 0.22 (n=8) | 0.21 (n=22) | 0.21 (n=24) | 0.21 (n=204) |
| hands.frac | 0.05 (n=8) | 0.05 (n=25) | 0.03 (n=25) | 0.03 (n=400) |
| frame.aspect_w_over_h | 0.91 (n=8) | 0.96 (n=25) | 1.05 (n=25) | 0.92 (n=400) |

### pixel

| proxy | owner | v3 top-5 | v2 top-5 | random sample |
|---|---|---|---|---|
| m.largest.coherence | 0.95 (n=6) | 0.92 (n=22) | 0.96 (n=25) | 0.88 (n=315) |
| m.largest.solidity | 0.53 (n=6) | 0.58 (n=22) | 0.62 (n=25) | 0.62 (n=315) |
| m.largest.n_touch | 0.33 (n=6) | 0.32 (n=22) | 0.40 (n=25) | 0.61 (n=315) |
| m.bg_busy | 0.16 (n=6) | 0.44 (n=22) | 0.38 (n=25) | 0.45 (n=315) |
| m.boundary_delta_e | 54.23 (n=6) | 62.65 (n=22) | 58.52 (n=25) | 54.55 (n=315) |
| m.flower_share | 0.51 (n=6) | 0.28 (n=22) | 0.33 (n=25) | 0.23 (n=315) |
| m.stalk_like_components | 1.17 (n=6) | 1.18 (n=22) | 1.08 (n=25) | 1.29 (n=315) |
| px.legibility | 0.47 (n=5) | 0.74 (n=20) | 0.84 (n=25) | 0.44 (n=204) |
| px.colours | 7.20 (n=5) | 7.90 (n=20) | 8.20 (n=25) | 7.37 (n=204) |
| px.components | 1.80 (n=5) | 1.00 (n=20) | 1.00 (n=25) | 1.30 (n=204) |
| px.bbox_fill | 0.60 (n=5) | 0.58 (n=20) | 0.60 (n=25) | 0.48 (n=204) |
| px.opaque_fraction | 0.30 (n=5) | 0.29 (n=20) | 0.32 (n=25) | 0.21 (n=204) |
| hands.frac | 0.07 (n=6) | 0.02 (n=25) | 0.04 (n=25) | 0.03 (n=400) |
| frame.aspect_w_over_h | 0.80 (n=6) | 0.89 (n=25) | 0.84 (n=25) | 0.92 (n=400) |

### tall

| proxy | owner | v3 top-5 | v2 top-5 | random sample |
|---|---|---|---|---|
| m.largest.coherence | 0.84 (n=4) | 0.97 (n=25) | 1.00 (n=25) | 0.88 (n=315) |
| m.largest.solidity | 0.44 (n=4) | 0.65 (n=25) | 0.55 (n=25) | 0.62 (n=315) |
| m.largest.n_touch | 0.50 (n=4) | 0.64 (n=25) | 0.80 (n=25) | 0.61 (n=315) |
| m.bg_busy | 0.52 (n=4) | 0.09 (n=25) | 0.05 (n=25) | 0.45 (n=315) |
| m.boundary_delta_e | 51.38 (n=4) | 64.23 (n=25) | 54.00 (n=25) | 54.55 (n=315) |
| m.flower_share | 0.40 (n=4) | 0.29 (n=25) | 0.29 (n=25) | 0.23 (n=315) |
| m.stalk_like_components | 1.25 (n=4) | 1.08 (n=25) | 1.00 (n=25) | 1.29 (n=315) |
| px.legibility | 0.35 (n=3) | 0.46 (n=22) | 0.49 (n=25) | 0.44 (n=204) |
| px.colours | 6.67 (n=3) | 7.00 (n=22) | 6.76 (n=25) | 7.37 (n=204) |
| px.components | 1.00 (n=3) | 1.23 (n=22) | 1.32 (n=25) | 1.30 (n=204) |
| px.bbox_fill | 0.44 (n=3) | 0.50 (n=22) | 0.49 (n=25) | 0.48 (n=204) |
| px.opaque_fraction | 0.22 (n=3) | 0.23 (n=22) | 0.24 (n=25) | 0.21 (n=204) |
| hands.frac | 0.00 (n=5) | 0.06 (n=25) | 0.02 (n=25) | 0.03 (n=400) |
| frame.aspect_w_over_h | 1.31 (n=5) | 0.94 (n=25) | 1.02 (n=25) | 0.92 (n=400) |

No-subject rate (segmenter found nothing): owner:main 0.00, owner:pixel 0.17, owner:tall 0.20, v3_top5:main 0.08, v3_top5:pixel 0.20, v3_top5:tall 0.04, sample 0.28
