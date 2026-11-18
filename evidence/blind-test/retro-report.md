# Retro report: the owner's 19 photographs under v2 and v3

Training batch (#62-66): v3's rules were chosen after seeing these picks, so this measures whether the changes repair the failures they were
designed against. It does NOT show that v3 generalises; only the sealed blind batch can.

## Per-photograph ranks (rank among survivors for the role it was picked for; `-` = not in pool / rejected)

| card | role | photo | v2 outcome | v2 rank | v3 outcome | v3 rank | v3 view | v3 pool |
|---|---|---|---|---|---|---|---|---|
| 62 | main | 72518818 | retrieval | 50/124 (if retrieved) | retrieval | 82/256 (if retrieved) | full-frame | 320 |
| 62 | pixel | 281944233 | retrieval | 8/149 (if retrieved) | retrieval | 11/206 (if retrieved) | subject-crop | 320 |
| 62 | tall | 3724391 | ranking | 79/102 | ranking | 108/194 | subject-crop | 320 |
| 63 | main | 547150859 | ranking | 110/194 | hit | 13/298 | subject-crop | 320 |
| 63 | main | 127092 | ranking | 109/194 | ranking | 137/298 | full-frame | 320 |
| 63 | main | 661119321 | retrieval | - | ranking | 224/298 | full-frame | 320 |
| 63 | pixel | 231940855 | ranking | 99/201 | ranking | 117/242 | full-frame | 320 |
| 63 | tall | 149770705 | stage-A | - | retrieval | - | subject-crop | 320 |
| 64 | main | 745700906 | ranking | 107/209 | ranking | 96/308 | subject-crop | 320 |
| 64 | main | 728257757 | ranking | 27/209 | ranking | 29/308 | full-frame | 320 |
| 64 | pixel | 151903275 | retrieval | 56/251 (if retrieved) | retrieval | 61/291 (if retrieved) | subject-crop | 320 |
| 64 | pixel | 89984767 | stage-A | - | retrieval | 5/291 (if retrieved) | subject-crop | 320 |
| 64 | tall | 419948962 | retrieval | 169/196 (if retrieved) | retrieval | 237/276 (if retrieved) | subject-crop | 320 |
| 65 | main | 316785117 | ranking | 46/110 | ranking | 75/226 | subject-crop | 261 |
| 65 | pixel | 24700338 | retrieval | 9/98 (if retrieved) | retrieval | 15/150 (if retrieved) | full-frame | 261 |
| 65 | tall | 21411326 | hit | 7/120 | hit | 10/186 | subject-crop | 261 |
| 66 | main | 430695917 | retrieval | 1/142 (if retrieved) | retrieval | 1/268 (if retrieved) | full-frame | 320 |
| 66 | pixel | 53367016 | stage-A | - | hit | 13/217 | subject-crop | 320 |
| 66 | tall | 675951613 | retrieval | - | retrieval | 67/227 (if retrieved) | flower-cluster-2 | 320 |

## Top-k performance. END-TO-END counts a pick only if it was retrieved into the pool AND ranked within k among the role's survivors;
## IF-RETRIEVED additionally scores the picks the pool missed (injected afterwards), so it isolates ranking from retrieval.

| method | n | retrieved into pool | end-to-end top-1 | top-5 | top-20 | if-retrieved top-1 | top-5 | top-20 | median percentile (if retrieved) |
|---|---|---|---|---|---|---|---|---|---|
| v2 | 19 | 11 | 0 | 0 | 1 | 1 | 1 | 4 | 0.41 |
| v3 | 19 | 10 | 0 | 0 | 3 | 1 | 2 | 7 | 0.25 |
| random order over v3 survivors (expected, if retrieved) | 19 | n/a | n/a | n/a | n/a | 0.1 | 0.4 | 1.5 | 0.50 |
| iNaturalist vote order (observation level, not photo level) | 19 | 19/19 within 300 | n/a | n/a | n/a | 0 | 2 | 4 | n/a |

## Why each miss happened (v3)

| failure stage | count | photos |
|---|---|---|
| retrieval | 9 | 62/main/72518818, 62/pixel/281944233, 63/tall/149770705, 64/pixel/151903275, 64/pixel/89984767, 64/tall/419948962, 65/pixel/24700338, 66/main/430695917, 66/tall/675951613 |
| stage-A | 0 |  |
| below-minimum-score | 0 |  |
| ranking | 7 | 62/tall/3724391, 63/main/127092, 63/main/661119321, 63/pixel/231940855, 64/main/745700906, 64/main/728257757, 65/main/316785117 |
| hit | 3 | 63/main/547150859, 65/tall/21411326, 66/pixel/53367016 |

'retrieval' = never in the pool; 'stage-A' = hard-rejected; 'ranking' = survived but ranked beyond 20. Downstream failure (a photograph that ranks well but cannot
be cut out or reduced to 24px) is not visible in these ranks; it is measured separately (owner feature study).

## By role

| role | v2 top-20 | v3 top-20 | v2 survives | v3 survives |
|---|---|---|---|---|
| main | 1/8 | 2/8 | 7/8 | 8/8 |
| pixel | 2/6 | 4/6 | 4/6 | 6/6 |
| tall | 1/5 | 1/5 | 3/5 | 4/5 |
