<!-- PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW -->

# Evidence summary, 45 original cards (Phase 1)

**PROPOSED, NOT IMPORTED, FOR BOTANICAL REVIEW.** Retrieved 2026-11-24. Nothing here is authoritative. Row-level evidence: `evidence-45.csv`; raw API responses: `raw/`.

## Sources: what was and was not reachable

| Source | Result |
|---|---|
| POWO (powo.science.kew.org) | **Not retrieved.** HTTP 403, Cloudflare "Attention Required", on `/`, `/api/2/search` and `/taxon/...`. |
| Flora of North America (efloras.org) | **Not retrieved.** HTTP 403, Cloudflare "Just a moment", on every path; `www.efloras.org` does not resolve. No FNA range or habitat quotes exist in this evidence set. |
| USDA PLANTS (plants.usda.gov) | **Not retrieved.** HTTP 301 to `plants.sc.egov.usda.gov:443`, which the proxy refuses (CONNECT 403). The GBIF-hosted USDA PLANTS checklist (dataset 705922f7-5ba5-49ab-a75d-722e3090e690) returned zero name usages for the cards queried. No USDA native status or state distribution exists in this evidence set. |
| **WCVP via GBIF** (dataset f382f0ce-323a-4091-bb9f-add557f3a9a2) | Retrieved. WCVP is the checklist POWO publishes, but this is GBIF's copy, **not** a POWO retrieval and not a TDWG-region statement from POWO's own pages. Distribution rows carry an area (US state or Canadian province, TDWG level 3/4) and `establishmentMeans`; WCVP has no native flag, so a row without `INTRODUCED` is read as native. Genus (`spp.`) cards have no WCVP range. |
| GRIIS United States via GBIF (dataset 32ad19ed-6b89-447a-9242-795c0897f345) | Retrieved. Lists introduced/invasive taxa for "conterminous 48 United States" only; absence from it is **not** evidence of native status. |
| GBIF occurrences | Retrieved. Facet `gadmLevel1Gid` (GADM level-1 unit) mapped to names from the records themselves. `PRESERVED_SPECIMEN` and `HUMAN_OBSERVATION`, `hasCoordinate=true`, `hasGeospatialIssue=false`, country US and CA. Species-level key (`speciesKey`); genus key for `spp.` cards. **Counts are recording effort, not range.** |

"Strong GBIF evidence" below reuses the Georgia survey's own thresholds so the two are comparable: at least 5 preserved specimens or at least 100 human observations in the unit. That is a convenience threshold, not a botanical one.

## Georgia cross-check (Phase 1 form)

Phase 2 (region membership) was not run, because the boundaries branch does not exist. The full validation the task describes therefore could not be done. What can be checked now is whether this pipeline agrees with the Georgia survey on Georgia itself.

| Card | Species | Survey class | GBIF GA specimens / obs (this run) | Would survey rule give | WCVP Georgia |
|---|---|---|---|---|---|
| 1 | taraxacum-officinale | confirmed | 21 / 18 | confirmed | introduced |
| 2 | rumex-obtusifolius | confirmed | 6 / 99 | confirmed | introduced |
| 3 | solidago-canadensis | confirmed | 9 / 1 | confirmed | not listed |
| 4 | ambrosia-artemisiifolia | confirmed | 70 / 754 | confirmed | native |
| 5 | chenopodium-album | confirmed | 23 / 51 | confirmed | native |
| 6 | portulaca-oleracea | confirmed | 9 / 169 | confirmed | introduced |
| 7 | alliaria-petiolata | likely | 1 / 25 | likely | not listed |
| 8 | urtica-dioica | likely | 1 / 2 | likely | introduced |
| 9 | oxalis-stricta | confirmed | 53 / 21 | confirmed | native |
| 10 | trifolium-pratense | confirmed | 18 / 600 | confirmed | introduced |
| 11 | lamium-purpureum | confirmed | 24 / 1023 | confirmed | introduced |
| 12 | viola-sororia | confirmed | 77 / 27 | confirmed | native |
| 13 | stellaria-media | confirmed | 37 / 489 | confirmed | introduced |
| 14 | plantago-major | confirmed | 11 / 63 | confirmed | introduced |
| 15 | galium-aparine | confirmed | 30 / 564 | confirmed | introduced |
| 16 | glechoma-hederacea | confirmed | 8 / 1033 | confirmed | introduced |
| 19 | rumex-acetosella | confirmed | 23 / 30 | confirmed | introduced |
| 21 | cichorium-intybus | confirmed | 6 / 79 | confirmed | introduced |
| 22 | arctium-lappa | likely | 0 / 1 | likely | introduced |
| 23 | mentha-canadensis | insufficient | 0 / 0 | insufficient | native |
| 24 | nepeta-cataria | likely | 2 / 35 | likely | introduced |
| 25 | capsella-bursa-pastoris | confirmed | 14 / 64 | confirmed | introduced |
| 26 | prunella-vulgaris | confirmed | 51 / 1076 | confirmed | native |
| 27 | verbascum-thapsus | confirmed | 24 / 854 | confirmed | introduced |
| 28 | equisetum-arvense | confirmed | 5 / 1 | confirmed | native |
| 29 | allium-vineale | confirmed | 13 / 397 | confirmed | introduced |
| 30 | fragaria-virginiana | confirmed | 18 / 47 | confirmed | native |
| 32 | hypericum-perforatum | confirmed | 7 / 15 | confirmed | not listed |
| 33 | achillea-millefolium | confirmed | 19 / 162 | confirmed | not listed |
| 34 | impatiens-capensis | confirmed | 27 / 1440 | confirmed | native |
| 35 | melissa-officinalis | confirmed | 0 / 186 | confirmed | introduced |
| 36 | monarda-fistulosa | confirmed | 22 / 348 | confirmed | native |
| 39 | geranium-maculatum | confirmed | 40 / 851 | confirmed | native |
| 40 | lonicera-japonica | confirmed | 43 / 2212 | confirmed | introduced |
| 43 | passiflora-incarnata | confirmed | 76 / 2169 | confirmed | native |
| 44 | lactuca-serriola | confirmed | 5 / 63 | confirmed | introduced |

Survey class and this run's class differ for 0 of 36 binomials. Counts are largely identical to the survey's, which is **not independent confirmation**: both read the same GBIF index with the same rule. It shows the pipeline reproduces the survey, nothing more.

### WCVP and the Georgia survey disagree

- **solidago-canadensis** (survey: confirmed): WCVP lists no Georgia unit, native or introduced. Absence from a checklist is not absence from the state; flagged for a botanist.
- **alliaria-petiolata** (survey: likely): WCVP lists no Georgia unit, native or introduced. Absence from a checklist is not absence from the state; flagged for a botanist.
- **hypericum-perforatum** (survey: confirmed): WCVP lists no Georgia unit, native or introduced. Absence from a checklist is not absence from the state; flagged for a botanist.
- **achillea-millefolium** (survey: confirmed): WCVP lists no Georgia unit, native or introduced. Absence from a checklist is not absence from the state; flagged for a botanist.
- **mentha-canadensis** (survey: insufficient, zero GBIF records): WCVP lists Georgia as **native**. The survey comment calls it "a largely northern species"; the two sources point in opposite directions and neither is reconciled here.

## Per species

### 1. taraxacum-officinale

- GBIF backbone: Taraxacum officinale Weber ex F.H.Wigg. (ACCEPTED); key 5394163.
- WCVP accepted name: Taraxacum spec. F.H.Wigg.
- WCVP native, US units (0): none.
- WCVP introduced, US units (50): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Northwest Territories, Nova Scotia, Nunavut, Ontario, Québec, Saskatchewan, Yukon.
- **GBIF strong, WCVP silent** (1): Rhode Island (5/179). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 5475 specimens, 45459 observations.
- GBIF strong US units (51): Alabama (37/423), Alaska (84/838), Arizona (182/186), Arkansas (28/269), California (622/3096), Colorado (435/1795), Connecticut (39/434), Delaware (7/91), District of Columbia (20/296), Florida (72/27), Georgia (21/18), Hawaii (11/46), Idaho (202/708), Illinois (36/1670), Indiana (76/1303), Iowa (26/296), Kansas (249/243), Kentucky (13/473), Louisiana (14/222), Maine (23/336), Maryland (98/1429), Massachusetts (30/2528), Michigan (152/1262), Minnesota (157/1001), Mississippi (51/124), Missouri (92/432), Montana (75/373), Nebraska (84/123), Nevada (88/182), New Hampshire (69/333), New Jersey (75/2382), New Mexico (183/603), New York (71/4066), North Carolina (158/1413), North Dakota (13/65), Ohio (12/2351), Oklahoma (13/447), Oregon (140/1161), Pennsylvania (488/2114), Rhode Island (5/179), South Carolina (27/181), South Dakota (71/172), Tennessee (34/761), Texas (177/3423), Utah (106/680), Vermont (26/847), Virginia (93/1330), Washington (110/1401), West Virginia (17/292), Wisconsin (508/843), Wyoming (54/189).
- GBIF strong Canadian units: Alberta (50/1207), British Columbia (114/2829), Manitoba (21/814), New Brunswick (35/309), Newfoundland and Labrador (5/117), Northwest Territories (13/31), Nova Scotia (36/1029), Ontario (116/3549), Prince Edward Island (3/160), Québec (386/811), Saskatchewan (27/205), Yukon (19/242).

### 2. rumex-obtusifolius

- GBIF backbone: Rumex obtusifolius L. (ACCEPTED); key 2889011.
- WCVP accepted name: Rumex obtusifolius L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (45): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, New Hampshire, New Jersey, New Mexico, New York, North Carolina, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, Tennessee, Texas, Utah, Virginia, Washington, West Virginia, Wisconsin.
- WCVP Canadian provinces: native none; introduced British Columbia, New Brunswick, Nova Scotia, Ontario, Québec.
- **GBIF strong, WCVP silent** (2): Rhode Island (9/71), Vermont (36/324). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 2086 specimens, 10686 observations.
- GBIF strong US units (42): Alaska (7/64), Arizona (38/14), Arkansas (9/37), California (148/44), Colorado (15/0), Connecticut (65/301), District of Columbia (14/85), Florida (11/1), Georgia (6/99), Hawaii (7/14), Idaho (7/6), Illinois (43/137), Indiana (69/126), Kansas (27/3), Kentucky (10/201), Maine (13/51), Maryland (42/519), Massachusetts (48/820), Michigan (93/449), Minnesota (21/11), Mississippi (7/2), Missouri (60/51), Montana (11/4), Nebraska (6/1), New Hampshire (39/158), New Jersey (40/1123), New Mexico (16/1), New York (79/1433), North Carolina (43/290), Ohio (155/410), Oklahoma (6/6), Oregon (103/660), Pennsylvania (411/961), Rhode Island (9/71), Tennessee (21/106), Texas (6/19), Utah (5/8), Vermont (36/324), Virginia (59/524), Washington (74/1213), West Virginia (19/179), Wisconsin (174/88).
- GBIF strong Canadian units: British Columbia (16/1266), New Brunswick (20/27), Newfoundland and Labrador (5/13), Nova Scotia (37/100), Ontario (43/481), Québec (277/192).

### 3. solidago-canadensis

- GBIF backbone: Solidago canadensis L. (ACCEPTED); key 5389029.
- WCVP accepted name: Solidago canadensis L.
- WCVP native, US units (43): Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP introduced, US units (1): Hawaii.
- WCVP Canadian provinces: native Alberta, British Columbia, Manitoba, New Brunswick, Nova Scotia, Nunavut, Ontario, Québec, Saskatchewan; introduced none.
- **GBIF strong, WCVP silent** (6): Florida (12/0), Georgia (9/1), Louisiana (15/0), Missouri (56/9), Oregon (32/52), Rhode Island (7/11). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- **WCVP lists, GBIF has no georeferenced record** (1): Hawaii.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 4854 specimens, 2869 observations.
- GBIF strong US units (48): Alaska (38/0), Arizona (72/0), Arkansas (13/7), California (34/2), Colorado (262/54), Connecticut (112/28), Delaware (14/2), District of Columbia (54/2), Florida (12/0), Georgia (9/1), Idaho (117/73), Illinois (148/289), Indiana (108/71), Iowa (47/50), Kansas (77/13), Kentucky (13/17), Louisiana (15/0), Maine (49/102), Maryland (59/20), Massachusetts (80/145), Michigan (223/557), Minnesota (293/238), Mississippi (117/2), Missouri (56/9), Montana (52/11), Nebraska (87/31), New Hampshire (109/43), New Jersey (98/49), New Mexico (37/0), New York (138/178), North Carolina (13/19), North Dakota (16/6), Ohio (325/198), Oklahoma (20/12), Oregon (32/52), Pennsylvania (633/118), Rhode Island (7/11), South Carolina (10/4), South Dakota (85/2), Tennessee (11/13), Texas (62/4), Utah (132/5), Vermont (81/84), Virginia (112/16), Washington (39/41), West Virginia (20/8), Wisconsin (681/279), Wyoming (26/2).
- GBIF strong Canadian units: Alberta (192/3), British Columbia (91/21), Manitoba (51/83), New Brunswick (89/116), Newfoundland and Labrador (7/8), Northwest Territories (14/0), Nova Scotia (114/202), Ontario (585/952), Prince Edward Island (9/69), Québec (1429/321), Saskatchewan (43/41).

### 4. ambrosia-artemisiifolia

- GBIF backbone: Ambrosia artemisiifolia L. (ACCEPTED); key 8002952.
- WCVP accepted name: Ambrosia artemisiifolia L.
- WCVP native, US units (48): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP introduced, US units (1): Hawaii.
- WCVP Canadian provinces: native Alberta, British Columbia, Manitoba, New Brunswick, Northwest Territories, Nova Scotia, Ontario, Québec, Saskatchewan; introduced none.
- **GBIF strong, WCVP silent** (2): Rhode Island (17/199), South Dakota (90/65). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- **WCVP lists, GBIF has no georeferenced record** (1): Alaska.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 4554 specimens, 39845 observations.
- GBIF strong US units (50): Alabama (45/720), Arizona (32/3), Arkansas (67/630), California (70/25), Colorado (99/38), Connecticut (102/525), Delaware (24/115), District of Columbia (22/61), Florida (270/3485), Georgia (70/754), Hawaii (15/0), Idaho (64/7), Illinois (72/3024), Indiana (109/1637), Iowa (42/507), Kansas (183/221), Kentucky (13/736), Louisiana (49/379), Maine (20/524), Maryland (124/1076), Massachusetts (37/2072), Michigan (139/1953), Minnesota (201/1971), Mississippi (94/244), Missouri (178/850), Montana (45/3), Nebraska (83/142), Nevada (23/0), New Hampshire (48/587), New Jersey (112/1349), New Mexico (26/1), New York (103/3005), North Carolina (146/1097), North Dakota (38/38), Ohio (27/2454), Oklahoma (31/198), Oregon (54/11), Pennsylvania (582/2214), Rhode Island (17/199), South Carolina (63/306), South Dakota (90/65), Tennessee (30/1046), Texas (137/988), Utah (38/13), Vermont (39/560), Virginia (111/1430), Washington (35/7), West Virginia (32/248), Wisconsin (490/2321), Wyoming (13/4).
- GBIF strong Canadian units: Alberta (16/10), British Columbia (12/18), Manitoba (17/88), New Brunswick (28/250), Nova Scotia (45/364), Ontario (109/5226), Québec (745/10255), Saskatchewan (11/7).

### 5. chenopodium-album

- GBIF backbone: Chenopodium album L. (ACCEPTED); key 3083838.
- WCVP accepted name: Chenopodium album L.
- WCVP native, US units (29): Alabama, Arkansas, Connecticut, Delaware, District of Columbia, Florida, Georgia, Illinois, Indiana, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Mississippi, Nebraska, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Pennsylvania, South Carolina, Tennessee, Vermont, Virginia.
- WCVP introduced, US units (21): Alaska, Arizona, California, Colorado, Hawaii, Idaho, Iowa, Kansas, Minnesota, Missouri, Montana, Nevada, Oklahoma, Oregon, South Dakota, Texas, Utah, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Northwest Territories, Nova Scotia, Nunavut, Ontario, Québec, Saskatchewan, Yukon.
- **GBIF strong, WCVP silent** (1): Rhode Island (15/45). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 6052 specimens, 11231 observations.
- GBIF strong US units (51): Alabama (8/38), Alaska (91/128), Arizona (95/41), Arkansas (47/64), California (986/305), Colorado (162/320), Connecticut (135/142), Delaware (14/28), District of Columbia (25/201), Florida (79/22), Georgia (23/51), Hawaii (7/5), Idaho (148/61), Illinois (116/652), Indiana (124/197), Iowa (33/117), Kansas (156/138), Kentucky (8/176), Louisiana (6/3), Maine (33/142), Maryland (61/440), Massachusetts (33/602), Michigan (157/506), Minnesota (253/287), Mississippi (38/13), Missouri (328/197), Montana (38/44), Nebraska (96/99), Nevada (57/12), New Hampshire (65/106), New Jersey (88/552), New Mexico (92/56), New York (82/2027), North Carolina (43/121), North Dakota (36/31), Ohio (221/283), Oklahoma (23/128), Oregon (115/118), Pennsylvania (683/495), Rhode Island (15/45), South Carolina (40/26), South Dakota (69/29), Tennessee (7/53), Texas (126/792), Utah (73/50), Vermont (39/210), Virginia (88/421), Washington (149/132), West Virginia (21/31), Wisconsin (608/437), Wyoming (12/57).
- GBIF strong Canadian units: Alberta (41/268), British Columbia (129/419), Manitoba (82/68), New Brunswick (51/83), Northwest Territories (26/8), Nova Scotia (54/112), Ontario (155/827), Prince Edward Island (9/50), Québec (921/303), Saskatchewan (40/69), Yukon (12/50).

### 6. portulaca-oleracea

- GBIF backbone: Portulaca oleracea L. (ACCEPTED); key 3084719.
- WCVP accepted name: Portulaca oleracea L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (49): Alabama, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Nova Scotia, Ontario, Québec, Saskatchewan.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 2029 specimens, 24722 observations.
- GBIF strong US units (46): Alabama (12/183), Arizona (231/593), Arkansas (15/137), California (350/3193), Colorado (114/761), Connecticut (23/264), District of Columbia (3/114), Florida (59/1661), Georgia (9/169), Hawaii (26/457), Idaho (24/129), Illinois (25/967), Indiana (22/448), Iowa (9/272), Kansas (79/245), Kentucky (0/299), Louisiana (5/349), Maine (9/154), Maryland (12/448), Massachusetts (20/858), Michigan (50/692), Minnesota (56/510), Mississippi (19/107), Missouri (36/287), Montana (33/76), Nebraska (21/217), Nevada (16/93), New Hampshire (14/69), New Jersey (19/822), New Mexico (106/398), New York (13/1499), North Carolina (39/232), Ohio (5/736), Oklahoma (15/230), Oregon (66/387), Pennsylvania (115/918), South Carolina (5/80), South Dakota (17/57), Tennessee (5/230), Texas (121/3143), Utah (23/306), Vermont (17/118), Virginia (24/500), Washington (57/410), West Virginia (10/78), Wisconsin (66/585).
- GBIF strong Canadian units: British Columbia (15/409), New Brunswick (5/27), Nova Scotia (5/37), Ontario (18/1059), Québec (60/289).

### 7. alliaria-petiolata

- GBIF backbone: Alliaria petiolata (M.Bieb.) Cavara & Grande (ACCEPTED); key 5376075.
- WCVP accepted name: Alliaria petiolata (M.Bieb.) Cavara & Grande
- WCVP native, US units (0): none.
- WCVP introduced, US units (36): Alabama, Colorado, Connecticut, Delaware, District of Columbia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Maine, Maryland, Massachusetts, Michigan, Minnesota, Missouri, Montana, Nebraska, New Hampshire, New Jersey, New York, North Carolina, Ohio, Oklahoma, Oregon, Pennsylvania, South Dakota, Tennessee, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced British Columbia, Ontario.
- **GBIF strong, WCVP silent** (3): Alaska (5/183), Arkansas (14/161), Rhode Island (5/467). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 2260 specimens, 98278 observations.
- GBIF strong US units (35): Alaska (5/183), Arkansas (14/161), Colorado (14/469), Connecticut (98/3252), Delaware (3/474), District of Columbia (39/1546), Illinois (58/4927), Indiana (66/2231), Iowa (4/1339), Kansas (100/785), Kentucky (24/1400), Maine (6/384), Maryland (155/6289), Massachusetts (26/9401), Michigan (82/4545), Minnesota (73/2195), Missouri (70/1281), Nebraska (15/320), New Hampshire (17/622), New Jersey (120/7451), New York (92/14896), North Carolina (33/1041), Ohio (18/6055), Oklahoma (5/41), Oregon (56/467), Pennsylvania (569/11710), Rhode Island (5/467), South Dakota (10/94), Tennessee (20/659), Utah (9/120), Vermont (15/1833), Virginia (91/5874), Washington (28/365), West Virginia (61/1212), Wisconsin (247/4101).
- GBIF strong Canadian units: British Columbia (22/732), New Brunswick (6/85), Nova Scotia (9/125), Ontario (106/16531), Québec (117/1625).

### 8. urtica-dioica

- GBIF backbone: Urtica dioica L. (ACCEPTED); key 7960979.
- WCVP accepted name: Urtica dioica L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (25): Alabama, Alaska, California, Connecticut, Delaware, District of Columbia, Florida, Georgia, Maine, Maryland, Massachusetts, Michigan, Missouri, New Hampshire, New Jersey, New York, North Carolina, Ohio, Oklahoma, Oregon, Pennsylvania, Tennessee, Virginia, Washington, West Virginia.
- WCVP Canadian provinces: native none; introduced British Columbia, New Brunswick, Nova Scotia, Ontario, Québec.
- **GBIF strong, WCVP silent** (16): Arizona (17/0), Colorado (60/16), Idaho (106/10), Illinois (18/7), Iowa (6/0), Minnesota (17/0), Montana (16/0), Nebraska (5/1), Nevada (17/4), New Mexico (14/0), North Dakota (5/0), Rhode Island (13/6), South Dakota (19/0), Utah (29/1), Wisconsin (86/2), Wyoming (8/1). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 1193 specimens, 1373 observations.
- GBIF strong US units (34): Alaska (35/14), Arizona (17/0), California (117/88), Colorado (60/16), Connecticut (16/38), District of Columbia (14/1), Idaho (106/10), Illinois (18/7), Iowa (6/0), Maryland (17/32), Massachusetts (47/96), Michigan (105/157), Minnesota (17/0), Missouri (12/10), Montana (16/0), Nebraska (5/1), Nevada (17/4), New Hampshire (8/14), New Jersey (38/32), New Mexico (14/0), New York (38/315), North Carolina (8/22), North Dakota (5/0), Ohio (12/67), Oregon (27/52), Pennsylvania (167/166), Rhode Island (13/6), South Dakota (19/0), Utah (29/1), Virginia (24/13), Washington (39/144), West Virginia (9/11), Wisconsin (86/2), Wyoming (8/1).
- GBIF strong Canadian units: Alberta (8/1), British Columbia (35/139), Manitoba (6/0), New Brunswick (12/13), Newfoundland and Labrador (6/48), Nova Scotia (14/25), Ontario (27/397), Québec (81/455).

### 9. oxalis-stricta

- GBIF backbone: Oxalis stricta L. (ACCEPTED); key 9823072.
- WCVP accepted name: Oxalis stricta L.
- WCVP native, US units (37): Alabama, Arkansas, Colorado, Connecticut, Delaware, District of Columbia, Georgia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Nebraska, New Hampshire, New Jersey, New York, North Carolina, North Dakota, Ohio, Oklahoma, Pennsylvania, South Carolina, South Dakota, Tennessee, Vermont, Virginia, West Virginia, Wisconsin.
- WCVP introduced, US units (5): Arizona, Montana, New Mexico, Washington, Wyoming.
- WCVP Canadian provinces: native British Columbia, Manitoba, New Brunswick, Ontario, Québec, Saskatchewan; introduced Nova Scotia.
- **GBIF strong, WCVP silent** (3): Florida (5/3), Rhode Island (24/55), Texas (151/13). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 4829 specimens, 4852 observations.
- GBIF strong US units (43): Alabama (32/8), Arizona (42/1), Arkansas (124/24), Colorado (49/5), Connecticut (186/93), Delaware (7/10), District of Columbia (30/28), Florida (5/3), Georgia (53/21), Idaho (9/1), Illinois (153/335), Indiana (181/114), Iowa (65/41), Kansas (221/20), Kentucky (9/73), Louisiana (11/1), Maine (53/110), Maryland (119/179), Massachusetts (32/308), Michigan (149/303), Minnesota (220/176), Mississippi (57/5), Missouri (180/56), Nebraska (37/16), New Hampshire (112/98), New Jersey (172/180), New Mexico (23/0), New York (146/888), North Carolina (77/123), North Dakota (10/3), Ohio (34/340), Oklahoma (35/6), Pennsylvania (1011/268), Rhode Island (24/55), South Carolina (24/8), South Dakota (33/17), Tennessee (66/64), Texas (151/13), Vermont (49/284), Virginia (218/177), Washington (14/23), West Virginia (46/35), Wisconsin (546/328).
- GBIF strong Canadian units: British Columbia (9/148), Manitoba (13/13), New Brunswick (71/78), Nova Scotia (69/164), Ontario (51/812), Prince Edward Island (6/56), Québec (400/512).

### 10. trifolium-pratense

- GBIF backbone: Trifolium pratense L. (ACCEPTED); key 8324121.
- WCVP accepted name: Trifolium pratense L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (49): Alabama, Alaska, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Northwest Territories, Nova Scotia, Ontario, Québec, Saskatchewan, Yukon.
- **GBIF strong, WCVP silent** (2): Arizona (25/17), Rhode Island (12/399). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 4543 specimens, 65047 observations.
- GBIF strong US units (50): Alabama (21/441), Alaska (33/528), Arizona (25/17), Arkansas (42/495), California (261/1054), Colorado (262/1888), Connecticut (121/1233), Delaware (22/244), District of Columbia (21/344), Florida (13/12), Georgia (18/600), Idaho (141/517), Illinois (65/3144), Indiana (95/1477), Iowa (36/994), Kansas (202/485), Kentucky (14/942), Louisiana (17/318), Maine (27/1479), Maryland (144/2382), Massachusetts (22/3361), Michigan (124/2536), Minnesota (198/2185), Mississippi (58/123), Missouri (144/1123), Montana (66/489), Nebraska (90/347), Nevada (31/35), New Hampshire (61/1750), New Jersey (105/2009), New Mexico (124/334), New York (100/5499), North Carolina (127/2460), North Dakota (10/54), Ohio (25/3564), Oklahoma (4/142), Oregon (108/1781), Pennsylvania (559/3493), Rhode Island (12/399), South Carolina (12/152), South Dakota (96/333), Tennessee (51/2063), Texas (23/103), Utah (32/169), Vermont (49/1917), Virginia (142/2955), Washington (150/2422), West Virginia (28/803), Wisconsin (375/3443), Wyoming (33/379).
- GBIF strong Canadian units: Alberta (37/2157), British Columbia (46/5507), Manitoba (38/767), New Brunswick (74/1010), Newfoundland and Labrador (6/522), Nova Scotia (68/2540), Ontario (99/8451), Prince Edward Island (7/250), Québec (337/2868), Saskatchewan (4/186), Yukon (6/70).

### 11. lamium-purpureum

- GBIF backbone: Lamium purpureum L. (ACCEPTED); key 2926682.
- WCVP accepted name: Lamium purpureum L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (42): Alabama, Alaska, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New York, North Carolina, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, Tennessee, Texas, Vermont, Virginia, Washington, West Virginia, Wisconsin.
- WCVP Canadian provinces: native none; introduced British Columbia, New Brunswick, Nova Scotia, Ontario, Québec.
- **GBIF strong, WCVP silent** (2): Rhode Island (0/232), Utah (12/197). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- **WCVP lists, GBIF has no georeferenced record** (2): Alaska, Nevada.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 1768 specimens, 56920 observations.
- GBIF strong US units (35): Alabama (24/684), Arkansas (33/888), California (74/1352), Colorado (5/7), Connecticut (19/702), Delaware (14/402), District of Columbia (28/809), Georgia (24/1023), Idaho (30/175), Illinois (40/1660), Indiana (88/1583), Kansas (110/285), Kentucky (21/1716), Louisiana (12/77), Maryland (129/3969), Massachusetts (9/1378), Michigan (40/2121), Mississippi (42/227), Missouri (101/1267), New Jersey (27/2754), New York (32/5579), North Carolina (71/3316), Ohio (18/3948), Oklahoma (23/529), Oregon (109/2962), Pennsylvania (302/5042), Rhode Island (0/232), South Carolina (16/298), Tennessee (24/2254), Texas (37/442), Utah (12/197), Virginia (72/4574), Washington (123/3216), West Virginia (32/827), Wisconsin (15/184).
- GBIF strong Canadian units: British Columbia (16/5351), Nova Scotia (8/39), Ontario (4/1352), Québec (30/19).

### 12. viola-sororia

- GBIF backbone: Viola sororia Willd. (ACCEPTED); key 5331238.
- WCVP accepted name: Viola sororia Willd.
- WCVP native, US units (37): Alabama, Arkansas, Connecticut, Delaware, District of Columbia, Florida, Georgia, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Nebraska, New Hampshire, New Jersey, New York, North Carolina, North Dakota, Ohio, Oklahoma, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Vermont, Virginia, West Virginia, Wisconsin.
- WCVP introduced, US units (0): none.
- WCVP Canadian provinces: native Manitoba, New Brunswick, Nova Scotia, Ontario, Québec, Saskatchewan; introduced none.
- **GBIF strong, WCVP silent** (3): Colorado (58/0), Rhode Island (8/2), Washington (12/0). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 6429 specimens, 959 observations.
- GBIF strong US units (39): Alabama (92/14), Arkansas (113/11), Colorado (58/0), Connecticut (275/18), Delaware (10/1), District of Columbia (48/2), Florida (267/2), Georgia (77/27), Illinois (131/84), Indiana (180/34), Iowa (63/15), Kansas (139/15), Kentucky (47/26), Louisiana (34/7), Maine (76/3), Maryland (204/27), Massachusetts (176/26), Michigan (255/34), Minnesota (359/37), Mississippi (51/3), Missouri (183/31), Nebraska (62/5), New Hampshire (107/4), New Jersey (30/20), New York (296/143), North Carolina (280/33), Ohio (33/46), Oklahoma (34/7), Pennsylvania (1217/105), Rhode Island (8/2), South Carolina (51/21), South Dakota (12/3), Tennessee (132/36), Texas (102/14), Vermont (90/10), Virginia (264/46), Washington (12/0), West Virginia (36/7), Wisconsin (802/39).
- GBIF strong Canadian units: Manitoba (17/6), New Brunswick (64/3), Nova Scotia (45/2), Ontario (145/64), Québec (418/47).

### 13. stellaria-media

- GBIF backbone: Stellaria media (L.) Vill. (ACCEPTED); key 5384604.
- WCVP accepted name: Stellaria media (L.) Vill.
- WCVP native, US units (0): none.
- WCVP introduced, US units (50): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Northwest Territories, Nova Scotia, Ontario, Québec, Saskatchewan, Yukon.
- **GBIF strong, WCVP silent** (1): Rhode Island (6/30). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 4327 specimens, 16850 observations.
- GBIF strong US units (49): Alabama (39/204), Alaska (80/132), Arizona (57/2), Arkansas (49/321), California (1103/2988), Colorado (43/13), Connecticut (65/78), Delaware (7/51), District of Columbia (23/154), Florida (76/98), Georgia (37/489), Hawaii (8/10), Idaho (86/37), Illinois (39/446), Indiana (95/184), Iowa (15/29), Kansas (166/77), Kentucky (13/545), Louisiana (21/147), Maine (25/10), Maryland (113/754), Massachusetts (20/197), Michigan (88/289), Minnesota (76/51), Mississippi (50/84), Missouri (83/169), Montana (80/8), Nebraska (36/18), Nevada (7/1), New Hampshire (33/20), New Jersey (62/869), New Mexico (20/7), New York (54/1038), North Carolina (70/619), Ohio (30/477), Oklahoma (29/277), Oregon (112/506), Pennsylvania (462/796), Rhode Island (6/30), South Carolina (29/102), South Dakota (7/5), Tennessee (33/279), Texas (268/2727), Utah (9/14), Vermont (13/25), Virginia (142/688), Washington (203/512), West Virginia (23/129), Wisconsin (118/137).
- GBIF strong Canadian units: Alberta (7/159), British Columbia (65/1219), Manitoba (28/9), New Brunswick (22/11), Newfoundland and Labrador (16/11), Northwest Territories (19/9), Nova Scotia (39/50), Ontario (51/211), Québec (279/28), Saskatchewan (11/40), Yukon (5/12).

### 14. plantago-major

- GBIF backbone: Plantago major L. (ACCEPTED); key 3189767.
- WCVP accepted name: Plantago major L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (50): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Northwest Territories, Nova Scotia, Nunavut, Ontario, Québec, Saskatchewan, Yukon.
- **GBIF strong, WCVP silent** (1): Rhode Island (12/52). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 3751 specimens, 16807 observations.
- GBIF strong US units (48): Alaska (119/464), Arizona (191/97), California (798/3665), Colorado (197/520), Connecticut (93/117), Delaware (10/16), District of Columbia (2/117), Florida (53/220), Georgia (11/63), Hawaii (30/27), Idaho (127/156), Illinois (24/605), Indiana (14/132), Iowa (8/127), Kansas (22/33), Kentucky (1/166), Louisiana (6/190), Maine (20/236), Maryland (37/369), Massachusetts (18/484), Michigan (131/503), Minnesota (148/437), Mississippi (9/50), Missouri (16/79), Montana (114/168), Nebraska (73/46), Nevada (45/36), New Hampshire (41/214), New Jersey (56/584), New Mexico (120/120), New York (60/1301), North Carolina (9/250), North Dakota (64/56), Ohio (7/317), Oregon (161/949), Pennsylvania (287/559), Rhode Island (12/52), South Carolina (9/55), South Dakota (47/93), Tennessee (3/253), Texas (36/234), Utah (57/135), Vermont (31/330), Virginia (15/312), Washington (149/1230), West Virginia (7/51), Wisconsin (218/423), Wyoming (38/46).
- GBIF strong Canadian units: Alberta (89/1297), British Columbia (79/4162), Manitoba (35/617), New Brunswick (67/298), Newfoundland and Labrador (8/102), Northwest Territories (36/75), Nova Scotia (53/1698), Ontario (138/2206), Prince Edward Island (5/178), Québec (370/1273), Saskatchewan (27/347), Yukon (31/164).

### 15. galium-aparine

- GBIF backbone: Galium aparine L. (ACCEPTED); key 2913548.
- WCVP accepted name: Galium aparine L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (50): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Nova Scotia, Ontario, Québec, Saskatchewan.
- **GBIF strong, WCVP silent** (1): Rhode Island (11/42). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 7511 specimens, 30987 observations.
- GBIF strong US units (50): Alabama (34/182), Alaska (60/91), Arizona (306/92), Arkansas (53/201), California (2085/3666), Colorado (129/242), Connecticut (67/176), Delaware (11/84), District of Columbia (16/220), Florida (60/95), Georgia (30/564), Idaho (282/107), Illinois (104/1343), Indiana (160/583), Iowa (25/222), Kansas (287/218), Kentucky (11/611), Louisiana (27/279), Maine (13/2), Maryland (96/1076), Massachusetts (14/542), Michigan (165/878), Minnesota (187/345), Mississippi (81/105), Missouri (140/260), Montana (86/42), Nebraska (73/166), Nevada (152/4), New Hampshire (18/20), New Jersey (119/911), New Mexico (50/19), New York (67/2133), North Carolina (61/935), North Dakota (18/4), Ohio (19/1221), Oklahoma (53/347), Oregon (294/1073), Pennsylvania (572/1730), Rhode Island (11/42), South Carolina (27/107), South Dakota (26/54), Tennessee (33/415), Texas (323/5533), Utah (106/85), Vermont (28/65), Virginia (119/1454), Washington (334/1470), West Virginia (30/87), Wisconsin (419/878), Wyoming (28/7).
- GBIF strong Canadian units: British Columbia (43/2467), Manitoba (8/11), New Brunswick (10/2), Nova Scotia (14/39), Ontario (69/594), Québec (29/16).

### 16. glechoma-hederacea

- GBIF backbone: Glechoma hederacea L. (ACCEPTED); key 2926557.
- WCVP accepted name: Glechoma hederacea L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (45): Alabama, Alaska, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, New Hampshire, New Jersey, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced none.
- **GBIF strong, WCVP silent** (1): Rhode Island (10/360). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 3089 specimens, 79143 observations.
- GBIF strong US units (41): Alabama (10/517), Arkansas (20/466), California (46/86), Colorado (17/27), Connecticut (124/1409), Delaware (2/350), District of Columbia (19/823), Florida (7/5), Georgia (8/1033), Idaho (28/39), Illinois (84/5325), Indiana (126/2783), Iowa (22/1211), Kansas (60/447), Kentucky (8/1754), Maine (35/690), Maryland (146/4693), Massachusetts (50/4630), Michigan (115/3843), Minnesota (115/3124), Mississippi (22/118), Missouri (90/1472), Montana (21/20), Nebraska (29/611), New Hampshire (63/760), New Jersey (84/4397), New York (87/6793), North Carolina (63/3618), Ohio (28/5829), Oklahoma (5/121), Oregon (71/251), Pennsylvania (790/7516), Rhode Island (10/360), South Carolina (14/245), South Dakota (6/97), Tennessee (29/2043), Vermont (39/1206), Virginia (126/4655), Washington (97/581), West Virginia (27/1281), Wisconsin (331/3733).
- GBIF strong Canadian units: Alberta (4/203), British Columbia (19/661), Manitoba (8/560), New Brunswick (40/316), Nova Scotia (47/620), Ontario (39/5342), Prince Edward Island (10/143), Québec (229/1933), Saskatchewan (7/69).

### 17. acer-spp

- GBIF backbone: Acer L. (ACCEPTED); key 3189834 (GENUS key; card names a genus, no species).
- WCVP: not applicable (genus card; any membership must come from a species-level decision the owner has not made).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 37762 specimens, 658224 observations.
- GBIF strong US units (50): Alabama (591/2470), Alaska (25/79), Arizona (596/1924), Arkansas (621/1652), California (2978/14310), Colorado (895/4209), Connecticut (915/3132), Delaware (57/662), District of Columbia (339/2090), Florida (627/5203), Georgia (498/3784), Idaho (998/1371), Illinois (766/6423), Indiana (826/3818), Iowa (200/774), Kansas (562/484), Kentucky (118/2801), Louisiana (212/1424), Maine (251/6376), Maryland (784/8018), Massachusetts (439/15366), Michigan (1307/11607), Minnesota (1238/8514), Mississippi (395/772), Missouri (726/2315), Montana (362/973), Nebraska (296/417), Nevada (208/197), New Hampshire (897/11624), New Jersey (717/9330), New Mexico (518/1421), New York (1447/409453), North Carolina (1451/9075), North Dakota (143/263), Ohio (223/9181), Oklahoma (187/854), Oregon (1091/10323), Pennsylvania (4585/15151), Rhode Island (156/1043), South Carolina (408/1374), South Dakota (152/329), Tennessee (402/5319), Texas (669/8606), Utah (854/4397), Vermont (463/13098), Virginia (883/10041), Washington (1408/14690), West Virginia (393/2638), Wisconsin (2746/8488), Wyoming (137/329).
- GBIF strong Canadian units: Alberta (74/1666), British Columbia (586/21308), Manitoba (168/2743), New Brunswick (377/3278), Newfoundland and Labrador (32/579), Northwest Territories (6/5), Nova Scotia (323/8774), Ontario (1780/38372), Prince Edward Island (34/1075), Québec (2775/17772), Saskatchewan (78/516), USA.20_1 (6/12), USA.24_1 (9/28), USA.48_1 (47/1).

### 18. rubus-spp

- GBIF backbone: Rubus L. (ACCEPTED); key 2988638 (GENUS key; card names a genus, no species).
- WCVP: not applicable (genus card; any membership must come from a species-level decision the owner has not made).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 50817 specimens, 247042 observations.
- GBIF strong US units (51): Alabama (374/1551), Alaska (1250/6443), Arizona (527/1420), Arkansas (659/622), California (4144/35454), Colorado (831/3896), Connecticut (2273/3414), Delaware (69/630), District of Columbia (123/1307), Florida (600/3509), Georgia (410/1487), Hawaii (163/1877), Idaho (1025/1214), Illinois (519/3478), Indiana (965/1978), Iowa (231/912), Kansas (1046/270), Kentucky (89/664), Louisiana (151/1501), Maine (1085/1505), Maryland (969/8587), Massachusetts (1056/4296), Michigan (1496/7280), Minnesota (2142/7478), Mississippi (246/580), Missouri (1217/651), Montana (349/1635), Nebraska (114/165), Nevada (107/136), New Hampshire (2304/1967), New Jersey (1222/7504), New Mexico (436/516), New York (1851/15500), North Carolina (939/3702), North Dakota (25/18), Ohio (270/4116), Oklahoma (184/449), Oregon (1456/26339), Pennsylvania (4786/12166), Rhode Island (170/871), South Carolina (285/1019), South Dakota (165/301), Tennessee (233/1494), Texas (935/12127), Utah (308/762), Vermont (2110/4511), Virginia (755/8159), Washington (1959/32193), West Virginia (2124/2047), Wisconsin (3968/6499), Wyoming (99/812).
- GBIF strong Canadian units: Alberta (336/4710), British Columbia (950/57313), Manitoba (314/1510), New Brunswick (507/1005), Newfoundland and Labrador (254/1376), Northwest Territories (315/368), Nova Scotia (604/1546), Nunavut (86/33), Ontario (1365/20004), Prince Edward Island (55/374), Québec (3656/8354), Saskatchewan (134/720), USA.20_1 (6/2), USA.27_1 (9/0), USA.48_1 (8/8), Yukon (261/971).

### 19. rumex-acetosella

- GBIF backbone: Rumex acetosella L. (ACCEPTED); key 2888995.
- WCVP accepted name: Rumex acetosella L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (50): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Nova Scotia, Ontario, Québec, Saskatchewan, Yukon.
- **GBIF strong, WCVP silent** (1): Rhode Island (19/150). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- **WCVP lists, GBIF has no georeferenced record** (1): North Dakota.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 6554 specimens, 10717 observations.
- GBIF strong US units (50): Alabama (14/15), Alaska (99/145), Arizona (155/12), Arkansas (38/68), California (1235/2200), Colorado (226/117), Connecticut (123/337), Delaware (11/24), District of Columbia (17/9), Florida (7/18), Georgia (23/30), Hawaii (12/114), Idaho (351/82), Illinois (102/159), Indiana (106/47), Iowa (20/7), Kansas (71/1), Kentucky (9/21), Louisiana (8/1), Maine (39/343), Maryland (139/245), Massachusetts (94/893), Michigan (167/446), Minnesota (193/173), Mississippi (41/1), Missouri (116/12), Montana (152/42), Nebraska (39/6), Nevada (58/3), New Hampshire (104/268), New Jersey (94/544), New Mexico (118/46), New York (111/672), North Carolina (117/173), Ohio (196/83), Oklahoma (16/4), Oregon (278/868), Pennsylvania (551/355), Rhode Island (19/150), South Carolina (18/40), South Dakota (24/0), Tennessee (30/50), Texas (15/13), Utah (60/6), Vermont (44/205), Virginia (131/187), Washington (324/1049), West Virginia (13/48), Wisconsin (598/345), Wyoming (27/39).
- GBIF strong Canadian units: Alberta (15/7), British Columbia (85/2513), Manitoba (10/1), New Brunswick (72/218), Newfoundland and Labrador (26/88), Nova Scotia (79/358), Ontario (229/800), Prince Edward Island (5/103), Québec (800/243).

### 20. rhus-spp

- GBIF backbone: Rhus L. (ACCEPTED); key 3190534 (GENUS key; card names a genus, no species).
- WCVP: not applicable (genus card; any membership must come from a species-level decision the owner has not made).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 19291 specimens, 154520 observations.
- GBIF strong US units (51): Alabama (150/2942), Arizona (1353/3019), Arkansas (352/1764), California (3482/32712), Colorado (741/3101), Connecticut (272/1658), Delaware (19/487), District of Columbia (55/111), Florida (290/5858), Georgia (166/2287), Hawaii (19/23), Idaho (142/216), Illinois (196/3638), Indiana (300/2100), Iowa (73/452), Kansas (814/1131), Kentucky (49/1441), Louisiana (76/516), MEX.26_1 (5/2), Maine (68/1899), Maryland (252/2477), Massachusetts (120/7152), Michigan (372/3975), Minnesota (381/2929), Mississippi (177/690), Missouri (503/3181), Montana (199/311), Nebraska (301/452), Nevada (141/214), New Hampshire (180/1447), New Jersey (338/3662), New Mexico (863/2001), New York (309/9815), North Carolina (474/4209), North Dakota (44/124), Ohio (94/3725), Oklahoma (242/1859), Oregon (60/98), Pennsylvania (1422/4391), Rhode Island (51/648), South Carolina (99/1243), South Dakota (193/270), Tennessee (140/2969), Texas (1643/18985), Utah (422/1380), Vermont (150/2636), Virginia (307/4226), Washington (129/343), West Virginia (98/515), Wisconsin (854/3093), Wyoming (107/100).
- GBIF strong Canadian units: Alberta (21/456), British Columbia (50/1389), Manitoba (27/247), New Brunswick (6/412), Nova Scotia (18/526), Ontario (432/15701), Prince Edward Island (0/101), Québec (348/4442), Saskatchewan (23/70).

### 21. cichorium-intybus

- GBIF backbone: Cichorium intybus L. (ACCEPTED); key 5392252.
- WCVP accepted name: Cichorium intybus L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (48): Alabama, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Nova Scotia, Ontario, Québec, Saskatchewan.
- **GBIF strong, WCVP silent** (1): Rhode Island (9/254). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 2549 specimens, 57245 observations.
- GBIF strong US units (44): Arizona (28/69), Arkansas (23/289), California (316/3779), Colorado (95/1353), Connecticut (81/579), Delaware (8/288), District of Columbia (18/358), Georgia (6/79), Idaho (51/430), Illinois (42/3539), Indiana (55/1251), Iowa (9/374), Kansas (90/287), Kentucky (9/1067), Louisiana (5/15), Maine (5/559), Maryland (51/2826), Massachusetts (25/2926), Michigan (111/3518), Minnesota (23/328), Mississippi (10/11), Missouri (82/1366), Montana (37/46), Nebraska (41/196), Nevada (15/115), New Hampshire (25/176), New Jersey (69/1908), New Mexico (30/224), New York (86/6514), North Carolina (27/736), Ohio (14/4665), Oregon (56/1945), Pennsylvania (461/3974), Rhode Island (9/254), South Carolina (5/36), South Dakota (25/66), Tennessee (16/934), Texas (19/130), Utah (29/455), Vermont (38/1474), Virginia (101/3224), Washington (79/1516), West Virginia (16/735), Wisconsin (200/2498).
- GBIF strong Canadian units: British Columbia (29/2969), New Brunswick (28/171), Nova Scotia (25/673), Ontario (67/10132), Prince Edward Island (3/100), Québec (263/2432).

### 22. arctium-lappa

- GBIF backbone: Arctium lappa L. (ACCEPTED); key 7353729.
- WCVP accepted name: Arctium lappa L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (35): Alabama, Arizona, California, Colorado, Connecticut, Delaware, Georgia, Idaho, Illinois, Indiana, Iowa, Maine, Maryland, Massachusetts, Michigan, Minnesota, Montana, Nevada, New Hampshire, New Jersey, New York, North Carolina, North Dakota, Ohio, Oregon, Pennsylvania, South Carolina, South Dakota, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Ontario, Québec, Saskatchewan.
- **GBIF strong, WCVP silent** (2): Hawaii (10/0), Rhode Island (9/8). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- **WCVP lists, GBIF has no georeferenced record** (2): Arizona, South Carolina.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 374 specimens, 3404 observations.
- GBIF strong US units (20): California (19/0), Colorado (8/8), Connecticut (31/81), Hawaii (10/0), Illinois (10/179), Maine (8/56), Massachusetts (19/159), Michigan (7/75), Minnesota (6/270), Montana (7/18), Nevada (10/2), New Hampshire (10/52), New York (30/611), Ohio (4/246), Pennsylvania (78/466), Rhode Island (9/8), South Dakota (7/15), Vermont (40/544), Washington (7/27), Wisconsin (28/211).
- GBIF strong Canadian units: British Columbia (7/74), Manitoba (15/105), New Brunswick (11/58), Ontario (14/941), Québec (56/504).

### 23. mentha-canadensis

- GBIF backbone: Mentha canadensis L. (ACCEPTED); key 2927198.
- WCVP accepted name: Mentha canadensis L.
- WCVP native, US units (44): Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, Florida, Georgia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Maine, Maryland, Massachusetts, Michigan, Minnesota, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP introduced, US units (0): none.
- WCVP Canadian provinces: native Alberta, British Columbia, Manitoba, New Brunswick, Northwest Territories, Nova Scotia, Ontario, Québec, Saskatchewan, Yukon; introduced none.
- **GBIF strong, WCVP silent** (1): District of Columbia (8/1). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- **WCVP lists, GBIF has no georeferenced record** (5): Florida, Georgia, North Carolina, Oklahoma, Tennessee.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 3457 specimens, 2636 observations.
- GBIF strong US units (36): Alaska (6/8), Arizona (33/6), California (477/206), Colorado (33/48), Connecticut (62/22), District of Columbia (8/1), Idaho (113/49), Illinois (107/161), Indiana (127/17), Iowa (11/9), Kansas (9/11), Maine (29/146), Maryland (18/16), Massachusetts (41/38), Michigan (239/460), Minnesota (364/251), Missouri (46/4), Montana (55/64), Nebraska (81/26), Nevada (11/14), New Hampshire (37/34), New Jersey (37/22), New Mexico (95/69), New York (94/100), North Dakota (19/18), Ohio (120/82), Oregon (224/74), Pennsylvania (48/64), South Dakota (29/26), Utah (22/36), Vermont (69/97), Virginia (22/24), Washington (244/153), West Virginia (8/7), Wisconsin (487/232), Wyoming (18/27).
- GBIF strong Canadian units: Alberta (21/770), British Columbia (17/756), Manitoba (25/212), New Brunswick (54/134), Newfoundland and Labrador (8/17), Northwest Territories (25/34), Nova Scotia (13/74), Ontario (81/1213), Québec (308/258), Saskatchewan (31/241), Yukon (11/35).

### 24. nepeta-cataria

- GBIF backbone: Nepeta cataria L. (ACCEPTED); key 5341499.
- WCVP accepted name: Nepeta cataria L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (48): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Georgia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Nova Scotia, Ontario, Québec, Saskatchewan.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 2571 specimens, 12745 observations.
- GBIF strong US units (38): Arizona (47/35), California (80/83), Colorado (174/1204), Connecticut (56/54), District of Columbia (7/16), Idaho (94/363), Illinois (81/1038), Indiana (54/257), Iowa (41/380), Kansas (156/109), Maine (18/37), Maryland (31/241), Massachusetts (13/150), Michigan (100/1154), Minnesota (124/1353), Missouri (24/87), Montana (64/203), Nebraska (162/389), Nevada (36/13), New Hampshire (32/30), New Jersey (20/167), New Mexico (20/47), New York (61/557), North Carolina (27/89), North Dakota (27/119), Ohio (17/439), Oregon (43/139), Pennsylvania (176/649), South Dakota (153/323), Tennessee (8/51), Texas (13/54), Utah (80/398), Vermont (25/101), Virginia (46/416), Washington (130/323), West Virginia (13/88), Wisconsin (287/1369), Wyoming (13/42).
- GBIF strong Canadian units: Alberta (2/151), British Columbia (13/797), Nova Scotia (13/11), Ontario (43/2111), Québec (109/108), Saskatchewan (6/20).

### 25. capsella-bursa-pastoris

- GBIF backbone: Capsella bursa-pastoris (L.) Medik. (ACCEPTED); key 5375388.
- WCVP accepted name: Capsella bursa-pastoris (L.) Medik.
- WCVP native, US units (0): none.
- WCVP introduced, US units (49): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Northwest Territories, Nova Scotia, Nunavut, Ontario, Québec, Saskatchewan, Yukon.
- **GBIF strong, WCVP silent** (2): Hawaii (5/10), Rhode Island (10/18). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 5880 specimens, 18143 observations.
- GBIF strong US units (51): Alabama (46/124), Alaska (104/147), Arizona (193/229), Arkansas (53/131), California (1013/3410), Colorado (270/425), Connecticut (89/82), Delaware (25/28), District of Columbia (20/72), Florida (69/68), Georgia (14/64), Hawaii (5/10), Idaho (157/199), Illinois (68/780), Indiana (98/179), Iowa (39/136), Kansas (359/282), Kentucky (6/66), Louisiana (20/42), Maine (27/69), Maryland (128/276), Massachusetts (87/378), Michigan (108/323), Minnesota (165/384), Mississippi (37/53), Missouri (114/219), Montana (89/107), Nebraska (86/161), Nevada (40/33), New Hampshire (58/47), New Jersey (72/439), New Mexico (122/140), New York (69/1776), North Carolina (32/126), North Dakota (15/45), Ohio (20/247), Oklahoma (44/512), Oregon (124/265), Pennsylvania (410/407), Rhode Island (10/18), South Carolina (16/37), South Dakota (60/59), Tennessee (31/103), Texas (410/4156), Utah (96/322), Vermont (35/130), Virginia (74/140), Washington (231/315), West Virginia (9/20), Wisconsin (384/331), Wyoming (29/31).
- GBIF strong Canadian units: Alberta (73/376), British Columbia (224/816), Manitoba (48/248), New Brunswick (46/56), Newfoundland and Labrador (29/14), Northwest Territories (59/15), Nova Scotia (55/108), Ontario (152/820), Prince Edward Island (9/21), Québec (457/316), Saskatchewan (43/155), Yukon (26/39).

### 26. prunella-vulgaris

- GBIF backbone: Prunella vulgaris L. (ACCEPTED); key 5341297.
- WCVP accepted name: Prunella vulgaris L.
- WCVP native, US units (49): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP introduced, US units (1): Hawaii.
- WCVP Canadian provinces: native Alberta, British Columbia, Manitoba, New Brunswick, Nova Scotia, Ontario, Québec, Saskatchewan; introduced none.
- **GBIF strong, WCVP silent** (1): Rhode Island (13/275). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 6996 specimens, 74595 observations.
- GBIF strong US units (51): Alabama (51/648), Alaska (43/228), Arizona (157/73), Arkansas (61/995), California (793/6226), Colorado (208/242), Connecticut (162/1026), Delaware (14/140), District of Columbia (10/106), Florida (13/29), Georgia (51/1076), Hawaii (13/145), Idaho (273/413), Illinois (127/2201), Indiana (142/1263), Iowa (39/311), Kansas (218/155), Kentucky (19/903), Louisiana (29/575), Maine (66/1696), Maryland (141/1979), Massachusetts (37/2308), Michigan (228/3847), Minnesota (224/1819), Mississippi (74/458), Missouri (156/959), Montana (138/535), Nebraska (51/47), Nevada (26/8), New Hampshire (84/1418), New Jersey (125/2159), New Mexico (197/211), New York (122/5925), North Carolina (110/3537), North Dakota (6/1), Ohio (31/3853), Oklahoma (35/325), Oregon (363/4353), Pennsylvania (866/4196), Rhode Island (13/275), South Carolina (47/374), South Dakota (37/36), Tennessee (56/1883), Texas (79/2090), Utah (67/61), Vermont (72/1842), Virginia (165/3230), Washington (307/4358), West Virginia (42/879), Wisconsin (577/2973), Wyoming (31/193).
- GBIF strong Canadian units: Alberta (26/283), British Columbia (97/7524), Manitoba (8/113), New Brunswick (63/690), Newfoundland and Labrador (10/273), Nova Scotia (24/2037), Ontario (122/10032), Prince Edward Island (2/276), Québec (440/3038).

### 27. verbascum-thapsus

- GBIF backbone: Verbascum thapsus L. (ACCEPTED); key 3171949.
- WCVP accepted name: Verbascum thapsus L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (50): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Nova Scotia, Ontario, Québec, Saskatchewan.
- **GBIF strong, WCVP silent** (1): Rhode Island (8/424). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 3821 specimens, 92345 observations.
- GBIF strong US units (49): Alabama (18/537), Arizona (164/2566), Arkansas (31/730), California (385/5241), Colorado (208/7811), Connecticut (72/1143), Delaware (1/243), District of Columbia (7/110), Florida (8/28), Georgia (24/854), Hawaii (9/392), Idaho (128/2212), Illinois (49/2452), Indiana (77/1269), Iowa (19/793), Kansas (158/622), Kentucky (7/813), Louisiana (7/41), Maine (14/782), Maryland (55/2189), Massachusetts (54/4551), Michigan (118/4240), Minnesota (137/3977), Mississippi (26/92), Missouri (70/1341), Montana (65/1206), Nebraska (66/667), Nevada (43/668), New Hampshire (48/902), New Jersey (75/3104), New Mexico (167/2628), New York (66/5793), North Carolina (27/1806), Ohio (16/2553), Oklahoma (8/614), Oregon (73/2277), Pennsylvania (359/4131), Rhode Island (8/424), South Carolina (34/364), South Dakota (136/796), Tennessee (17/1263), Texas (86/5254), Utah (49/1413), Vermont (37/1375), Virginia (73/2940), Washington (120/2291), West Virginia (15/693), Wisconsin (376/3626), Wyoming (9/496).
- GBIF strong Canadian units: Alberta (14/552), British Columbia (31/5659), Manitoba (5/191), New Brunswick (24/463), Nova Scotia (24/987), Ontario (78/10289), Prince Edward Island (0/137), Québec (153/2084).

### 28. equisetum-arvense

- GBIF backbone: Equisetum arvense L. (ACCEPTED); key 7924597.
- WCVP accepted name: Equisetum arvense L.
- WCVP native, US units (47): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Georgia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP introduced, US units (0): none.
- WCVP Canadian provinces: native Alberta, British Columbia, Manitoba, New Brunswick, Northwest Territories, Nova Scotia, Nunavut, Ontario, Québec, Saskatchewan, Yukon; introduced none.
- **GBIF strong, WCVP silent** (1): Rhode Island (26/60). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 9502 specimens, 19020 observations.
- GBIF strong US units (46): Alaska (862/980), Arizona (166/52), Arkansas (14/7), California (632/869), Colorado (531/1061), Connecticut (134/359), Delaware (9/32), District of Columbia (13/46), Georgia (5/1), Idaho (264/308), Illinois (270/671), Indiana (136/344), Iowa (64/91), Kansas (109/8), Kentucky (43/101), Maine (83/519), Maryland (129/445), Massachusetts (212/971), Michigan (534/1275), Minnesota (668/783), Mississippi (7/0), Missouri (124/44), Montana (222/242), Nebraska (128/37), Nevada (63/53), New Hampshire (185/464), New Jersey (141/579), New Mexico (166/72), New York (200/1921), North Carolina (79/44), North Dakota (80/6), Ohio (163/841), Oklahoma (5/0), Oregon (184/480), Pennsylvania (898/1197), Rhode Island (26/60), South Dakota (155/56), Tennessee (36/66), Texas (9/0), Utah (160/327), Vermont (172/1147), Virginia (137/207), Washington (391/1060), West Virginia (50/201), Wisconsin (716/812), Wyoming (121/178).
- GBIF strong Canadian units: Alberta (325/1604), British Columbia (576/3553), Manitoba (274/383), New Brunswick (119/379), Newfoundland and Labrador (92/140), Northwest Territories (302/97), Nova Scotia (78/817), Nunavut (267/40), Ontario (371/4621), Prince Edward Island (10/99), Québec (2095/1790), Saskatchewan (65/160), USA.27_1 (6/0), USA.48_1 (5/0), Yukon (162/309).

### 29. allium-vineale

- GBIF backbone: Allium vineale L. (ACCEPTED); key 7792960.
- WCVP accepted name: Allium vineale L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (33): Alabama, Alaska, Arkansas, California, Connecticut, Delaware, District of Columbia, Florida, Georgia, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Mississippi, Missouri, New Hampshire, New Jersey, New York, Ohio, Oklahoma, Pennsylvania, South Carolina, Tennessee, Vermont, Virginia, West Virginia, Wisconsin.
- WCVP Canadian provinces: native none; introduced Ontario, Québec.
- **GBIF strong, WCVP silent** (5): North Carolina (50/749), Oregon (33/222), Texas (9/128), Utah (7/0), Washington (22/32). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- **WCVP lists, GBIF has no georeferenced record** (1): Alaska.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 1174 specimens, 12919 observations.
- GBIF strong US units (30): Alabama (9/273), Arkansas (36/210), California (29/28), Connecticut (64/214), District of Columbia (18/91), Georgia (13/397), Illinois (35/274), Indiana (59/236), Kansas (55/85), Kentucky (15/335), Maryland (62/597), Massachusetts (6/333), Michigan (41/340), Mississippi (39/76), Missouri (53/279), New Jersey (50/2270), New York (36/1973), North Carolina (50/749), Ohio (6/725), Oklahoma (6/146), Oregon (33/222), Pennsylvania (216/1199), South Carolina (22/129), Tennessee (25/428), Texas (9/128), Utah (7/0), Vermont (7/10), Virginia (107/802), Washington (22/32), West Virginia (17/152).
- GBIF strong Canadian units: British Columbia (7/341).

### 30. fragaria-virginiana

- GBIF backbone: Fragaria virginiana Duchesne (ACCEPTED); key 7950792.
- WCVP accepted name: Fragaria virginiana Mill.
- WCVP native, US units (49): Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP introduced, US units (0): none.
- WCVP Canadian provinces: native Alberta, British Columbia, Manitoba, New Brunswick, Northwest Territories, Nova Scotia, Nunavut, Ontario, Québec, Saskatchewan, Yukon; introduced none.
- **GBIF strong, WCVP silent** (1): Rhode Island (8/38). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- **WCVP lists, GBIF has no georeferenced record** (1): Louisiana.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 6186 specimens, 17618 observations.
- GBIF strong US units (47): Alabama (17/17), Alaska (37/66), Arizona (73/152), Arkansas (30/73), California (233/403), Colorado (431/1806), Connecticut (136/224), District of Columbia (11/0), Georgia (18/47), Idaho (343/230), Illinois (114/1028), Indiana (98/163), Iowa (33/66), Kansas (179/95), Kentucky (6/64), Maine (63/656), Maryland (105/161), Massachusetts (81/526), Michigan (185/1482), Minnesota (369/1312), Mississippi (5/33), Missouri (151/124), Montana (204/777), Nebraska (47/13), Nevada (10/6), New Hampshire (135/829), New Jersey (97/237), New Mexico (106/215), New York (142/1000), North Carolina (120/362), North Dakota (23/11), Ohio (18/300), Oklahoma (16/13), Oregon (209/761), Pennsylvania (706/442), Rhode Island (8/38), South Carolina (6/9), South Dakota (112/137), Tennessee (33/150), Texas (16/2), Utah (69/99), Vermont (66/689), Virginia (113/295), Washington (324/792), West Virginia (29/52), Wisconsin (752/1214), Wyoming (104/436).
- GBIF strong Canadian units: Alberta (239/4260), British Columbia (180/4658), Manitoba (184/941), New Brunswick (102/552), Newfoundland and Labrador (20/196), Northwest Territories (52/74), Nova Scotia (79/930), Ontario (161/5360), Prince Edward Island (5/218), Québec (676/1497), Saskatchewan (38/493), Yukon (39/464).

### 31. sambucus-spp

- GBIF backbone: Sambucus L. (ACCEPTED); key 2888721 (GENUS key; card names a genus, no species).
- WCVP: not applicable (genus card; any membership must come from a species-level decision the owner has not made).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 13710 specimens, 94048 observations.
- GBIF strong US units (50): Alabama (68/1088), Alaska (146/1942), Arizona (457/532), Arkansas (85/495), California (3175/23113), Colorado (487/1168), Connecticut (238/691), Delaware (13/114), District of Columbia (22/71), Florida (276/4915), Georgia (76/1319), Hawaii (26/104), Idaho (621/496), Illinois (135/2950), Indiana (199/1071), Iowa (45/344), Kansas (214/196), Kentucky (42/711), Louisiana (27/1732), Maine (82/1185), Maryland (147/1278), Massachusetts (56/2345), Michigan (349/2829), Minnesota (395/3570), Mississippi (94/602), Missouri (123/696), Montana (190/355), Nebraska (43/129), Nevada (254/301), New Hampshire (182/1272), New Jersey (212/749), New Mexico (243/365), New York (215/3691), North Carolina (321/1696), Ohio (34/2322), Oklahoma (28/145), Oregon (543/3828), Pennsylvania (1250/2462), Rhode Island (29/163), South Carolina (63/328), South Dakota (72/108), Tennessee (58/1321), Texas (185/4090), Utah (320/1076), Vermont (105/2431), Virginia (149/2318), Washington (679/5315), West Virginia (75/498), Wisconsin (804/3446), Wyoming (56/70).
- GBIF strong Canadian units: Alberta (47/1205), British Columbia (168/9397), Manitoba (30/184), New Brunswick (115/728), Newfoundland and Labrador (8/216), Nova Scotia (114/1733), Ontario (442/9301), Prince Edward Island (10/630), Québec (580/2732), Saskatchewan (15/152), Yukon (5/6).

### 32. hypericum-perforatum

- GBIF backbone: Hypericum perforatum L. (ACCEPTED); key 3189486.
- WCVP accepted name: Hypericum perforatum L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (43): Alabama, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Maine, Maryland, Massachusetts, Michigan, Minnesota, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced British Columbia, Manitoba, New Brunswick, Nova Scotia, Ontario, Québec.
- **GBIF strong, WCVP silent** (5): Alaska (6/38), Georgia (7/15), Mississippi (11/15), Rhode Island (11/158), Utah (10/8). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- **WCVP lists, GBIF has no georeferenced record** (1): North Dakota.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 4052 specimens, 17802 observations.
- GBIF strong US units (43): Alabama (10/20), Alaska (6/38), Arkansas (18/47), California (566/1611), Colorado (72/291), Connecticut (150/225), District of Columbia (14/10), Georgia (7/15), Idaho (204/439), Illinois (44/544), Indiana (80/101), Iowa (20/38), Kansas (158/97), Kentucky (11/32), Maine (55/453), Maryland (92/302), Massachusetts (96/1105), Michigan (183/1220), Minnesota (64/514), Mississippi (11/15), Missouri (92/156), Montana (40/186), Nebraska (33/31), Nevada (24/9), New Hampshire (115/372), New Jersey (119/405), New York (103/1661), North Carolina (24/28), Ohio (31/357), Oklahoma (5/90), Oregon (243/1823), Pennsylvania (486/584), Rhode Island (11/158), South Carolina (8/0), South Dakota (29/48), Tennessee (12/14), Texas (27/74), Utah (10/8), Vermont (67/681), Virginia (105/334), Washington (219/2296), West Virginia (27/74), Wisconsin (348/1223).
- GBIF strong Canadian units: British Columbia (39/2095), New Brunswick (76/375), Newfoundland and Labrador (4/153), Nova Scotia (63/920), Ontario (98/4977), Prince Edward Island (5/185), Québec (543/1394).

### 33. achillea-millefolium

- GBIF backbone: Achillea millefolium L. (ACCEPTED); key 3120060.
- WCVP accepted name: Achillea millefolium L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (6): Hawaii, Massachusetts, New Jersey, New York, Pennsylvania, Texas.
- WCVP Canadian provinces: native none; introduced Nova Scotia.
- **GBIF strong, WCVP silent** (45): Alabama (16/36), Alaska (458/2408), Arizona (364/811), Arkansas (83/436), California (2655/21573), Colorado (976/4293), Connecticut (182/867), Delaware (9/184), District of Columbia (20/35), Florida (19/17), Georgia (19/162), Idaho (808/1386), Illinois (101/1908), Indiana (143/559), Iowa (62/273), Kansas (481/555), Kentucky (16/541), Louisiana (8/18), Maine (41/1501), Maryland (166/1800), Michigan (245/2930), Minnesota (414/3091), Mississippi (24/23), Missouri (163/708), Montana (423/1634), Nebraska (174/184), Nevada (254/373), New Hampshire (123/1383), New Mexico (490/939), North Carolina (171/1053), North Dakota (131/214), Ohio (31/1574), Oklahoma (74/1169), Oregon (646/4341), Rhode Island (27/391), South Carolina (23/53), South Dakota (287/364), Tennessee (59/432), Utah (419/1317), Vermont (89/1188), Virginia (153/2342), Washington (637/4827), West Virginia (33/419), Wisconsin (862/2991), Wyoming (255/1075). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 14283 specimens, 90506 observations.
- GBIF strong US units (51): Alabama (16/36), Alaska (458/2408), Arizona (364/811), Arkansas (83/436), California (2655/21573), Colorado (976/4293), Connecticut (182/867), Delaware (9/184), District of Columbia (20/35), Florida (19/17), Georgia (19/162), Hawaii (8/50), Idaho (808/1386), Illinois (101/1908), Indiana (143/559), Iowa (62/273), Kansas (481/555), Kentucky (16/541), Louisiana (8/18), Maine (41/1501), Maryland (166/1800), Massachusetts (74/3350), Michigan (245/2930), Minnesota (414/3091), Mississippi (24/23), Missouri (163/708), Montana (423/1634), Nebraska (174/184), Nevada (254/373), New Hampshire (123/1383), New Jersey (149/2030), New Mexico (490/939), New York (156/3639), North Carolina (171/1053), North Dakota (131/214), Ohio (31/1574), Oklahoma (74/1169), Oregon (646/4341), Pennsylvania (819/3097), Rhode Island (27/391), South Carolina (23/53), South Dakota (287/364), Tennessee (59/432), Texas (241/3952), Utah (419/1317), Vermont (89/1188), Virginia (153/2342), Washington (637/4827), West Virginia (33/419), Wisconsin (862/2991), Wyoming (255/1075).
- GBIF strong Canadian units: Alberta (254/3252), British Columbia (469/13453), Manitoba (259/857), New Brunswick (152/596), Newfoundland and Labrador (59/517), Northwest Territories (85/153), Nova Scotia (158/1522), Nunavut (36/3), Ontario (321/9385), Prince Edward Island (8/272), Québec (1460/2496), Saskatchewan (101/953), USA.27_1 (8/1), USA.48_1 (8/0), Yukon (121/838).

### 34. impatiens-capensis

- GBIF backbone: Impatiens capensis Meerb. (ACCEPTED); key 2891774.
- WCVP accepted name: Impatiens capensis Meerb.
- WCVP native, US units (38): Alabama, Arkansas, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Nebraska, New Hampshire, New Jersey, New York, North Carolina, North Dakota, Ohio, Oklahoma, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Vermont, Virginia, West Virginia, Wisconsin.
- WCVP introduced, US units (4): California, Idaho, Oregon, Washington.
- WCVP Canadian provinces: native Alberta, Manitoba, New Brunswick, Nova Scotia, Ontario, Québec, Saskatchewan; introduced British Columbia.
- **GBIF strong, WCVP silent** (1): Rhode Island (15/471). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 4771 specimens, 73994 observations.
- GBIF strong US units (41): Alabama (19/728), Arkansas (61/644), Colorado (12/113), Connecticut (136/1494), Delaware (8/326), District of Columbia (18/437), Georgia (27/1440), Idaho (17/20), Illinois (120/2985), Indiana (147/2543), Iowa (34/380), Kansas (103/113), Kentucky (32/1495), Louisiana (20/229), Maine (47/1564), Maryland (140/2991), Massachusetts (53/4378), Michigan (192/3820), Minnesota (365/2787), Mississippi (64/161), Missouri (140/1099), Nebraska (84/82), New Hampshire (89/1529), New Jersey (146/2025), New York (126/8025), North Carolina (109/4060), North Dakota (29/3), Ohio (230/5255), Oklahoma (19/102), Oregon (77/1168), Pennsylvania (878/5326), Rhode Island (15/471), South Carolina (34/420), South Dakota (12/52), Tennessee (33/2380), Texas (15/13), Vermont (66/2596), Virginia (151/4332), Washington (156/2027), West Virginia (46/920), Wisconsin (693/3439).
- GBIF strong Canadian units: Alberta (40/270), British Columbia (25/808), Manitoba (78/377), New Brunswick (73/796), Newfoundland and Labrador (14/95), Nova Scotia (80/1294), Ontario (173/11382), Prince Edward Island (3/285), Québec (455/3207), Saskatchewan (23/123).

### 35. melissa-officinalis

- GBIF backbone: Melissa officinalis L. (ACCEPTED); key 5341501.
- WCVP accepted name: Melissa officinalis L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (32): Alabama, Arkansas, California, Connecticut, Delaware, District of Columbia, Georgia, Idaho, Illinois, Indiana, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Missouri, Montana, New Jersey, New York, North Carolina, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, Tennessee, Vermont, Virginia, Washington, West Virginia.
- WCVP Canadian provinces: native none; introduced British Columbia, Manitoba, Ontario, Québec.
- **GBIF strong, WCVP silent** (1): Utah (5/1). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 529 specimens, 7932 observations.
- GBIF strong US units (23): Arkansas (12/58), California (172/753), Connecticut (23/107), District of Columbia (5/87), Georgia (0/186), Idaho (7/75), Illinois (4/332), Indiana (12/185), Maryland (5/265), Massachusetts (1/252), Michigan (7/401), Missouri (19/142), New Jersey (8/203), New York (18/544), North Carolina (4/313), Ohio (4/522), Oregon (74/1294), Pennsylvania (71/453), Tennessee (10/163), Utah (5/1), Virginia (13/318), Washington (25/663), West Virginia (9/34).
- GBIF strong Canadian units: British Columbia (5/587), Ontario (3/585), Québec (6/320).

### 36. monarda-fistulosa

- GBIF backbone: Monarda fistulosa L. (ACCEPTED); key 5341411.
- WCVP accepted name: Monarda fistulosa L.
- WCVP native, US units (43): Alabama, Arizona, Arkansas, Colorado, Connecticut, District of Columbia, Florida, Georgia, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Dakota, Tennessee, Texas, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP introduced, US units (0): none.
- WCVP Canadian provinces: native Alberta, British Columbia, Manitoba, Ontario, Québec, Saskatchewan; introduced none.
- **GBIF strong, WCVP silent** (2): Rhode Island (2/112), Utah (20/2). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 4593 specimens, 46307 observations.
- GBIF strong US units (42): Alabama (24/258), Arizona (260/348), Arkansas (191/653), Colorado (280/1664), Connecticut (166/389), District of Columbia (5/81), Georgia (22/348), Idaho (12/24), Illinois (138/5926), Indiana (121/1360), Iowa (57/1560), Kansas (232/496), Kentucky (24/618), Louisiana (21/126), Maine (13/146), Maryland (21/864), Massachusetts (15/816), Michigan (200/3227), Minnesota (240/4099), Mississippi (76/122), Missouri (184/1410), Montana (174/768), Nebraska (155/303), New Hampshire (17/154), New Jersey (37/959), New Mexico (218/475), New York (74/2606), North Carolina (59/621), North Dakota (75/248), Ohio (25/3164), Oklahoma (59/383), Pennsylvania (211/2295), Rhode Island (2/112), South Dakota (211/629), Tennessee (76/692), Texas (124/746), Utah (20/2), Vermont (44/333), Virginia (73/1322), West Virginia (31/233), Wisconsin (542/5411), Wyoming (55/186).
- GBIF strong Canadian units: Alberta (40/1854), British Columbia (28/178), Manitoba (52/702), Ontario (89/5266), Québec (48/461), Saskatchewan (22/386).

### 37. rosa-spp

- GBIF backbone: Rosa L. (ACCEPTED); key 8395064 (GENUS key; card names a genus, no species).
- WCVP: not applicable (genus card; any membership must come from a species-level decision the owner has not made).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 27157 specimens, 139550 observations.
- GBIF strong US units (52): Alabama (96/554), Alaska (309/2302), Arizona (416/833), Arkansas (282/971), CAN.9_1 (5/3), California (4080/13273), Colorado (1190/1287), Connecticut (691/3018), Delaware (24/571), District of Columbia (108/511), Florida (208/367), Georgia (91/1019), Hawaii (25/45), Idaho (1103/403), Illinois (552/4331), Indiana (682/2913), Iowa (278/635), Kansas (664/543), Kentucky (56/1868), Louisiana (24/335), Maine (319/5424), Maryland (324/5379), Massachusetts (392/10447), Michigan (844/5063), Minnesota (1036/1058), Mississippi (188/466), Missouri (986/1793), Montana (605/307), Nebraska (407/302), Nevada (375/457), New Hampshire (289/1565), New Jersey (338/7272), New Mexico (553/512), New York (529/12310), North Carolina (322/4477), North Dakota (186/206), Ohio (99/8818), Oklahoma (116/403), Oregon (1158/3076), Pennsylvania (1562/8113), Rhode Island (104/1958), South Carolina (137/393), South Dakota (487/270), Tennessee (117/2705), Texas (357/2872), Utah (441/584), Vermont (288/1490), Virginia (421/6424), Washington (1575/6068), West Virginia (99/1097), Wisconsin (1437/2293), Wyoming (181/127).
- GBIF strong Canadian units: Alberta (283/4578), British Columbia (629/6127), Manitoba (172/409), New Brunswick (348/946), Newfoundland and Labrador (39/406), Northwest Territories (203/183), Nova Scotia (313/3171), Ontario (814/9876), Prince Edward Island (33/346), Québec (1471/2741), Saskatchewan (233/1953), USA.20_1 (10/1), USA.27_1 (13/0), USA.48_1 (7/0), Yukon (125/1085).

### 38. salix-spp

- GBIF backbone: Salix L. (ACCEPTED); key 3039576 (GENUS key; card names a genus, no species).
- WCVP: not applicable (genus card; any membership must come from a species-level decision the owner has not made).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 108902 specimens, 50444 observations.
- GBIF strong US units (53): Alabama (175/273), Alaska (11214/2009), Arizona (3419/1165), Arkansas (478/311), CAN.13_1 (29/0), California (19740/10345), Colorado (6243/2260), Connecticut (1340/328), Delaware (68/21), District of Columbia (361/17), Florida (776/2329), Georgia (163/174), Hawaii (5/0), Idaho (4096/291), Illinois (2122/1085), Indiana (1580/257), Iowa (358/132), Kansas (1303/107), Kentucky (65/121), Louisiana (132/404), MEX.3_1 (7/0), Maine (592/545), Maryland (417/217), Massachusetts (2436/1483), Michigan (2694/1590), Minnesota (4390/1346), Mississippi (215/144), Missouri (1151/175), Montana (2965/375), Nebraska (822/212), Nevada (1936/428), New Hampshire (1338/1493), New Jersey (871/188), New Mexico (2154/344), New York (1657/2058), North Carolina (448/508), North Dakota (413/103), Ohio (1684/1595), Oklahoma (284/261), Oregon (4388/1763), Pennsylvania (4214/575), Rhode Island (257/174), South Carolina (74/89), South Dakota (1165/312), Tennessee (138/376), Texas (1353/6623), Utah (1887/474), Vermont (1070/1216), Virginia (479/427), Washington (5081/1621), West Virginia (230/85), Wisconsin (7020/1855), Wyoming (1392/148).
- GBIF strong Canadian units: Alberta (3269/4673), British Columbia (5970/4407), Manitoba (3047/596), New Brunswick (821/337), Newfoundland and Labrador (1580/661), Northwest Territories (4275/306), Nova Scotia (609/419), Nunavut (2992/1099), Ontario (5846/6329), Prince Edward Island (59/114), Québec (14576/2347), Saskatchewan (1772/457), USA.20_1 (18/2), USA.24_1 (8/9), USA.27_1 (31/0), USA.2_1 (10/0), USA.48_1 (12/0), Yukon (3207/1758).

### 39. geranium-maculatum

- GBIF backbone: Geranium maculatum L. (ACCEPTED); key 7808016.
- WCVP accepted name: Geranium maculatum L.
- WCVP native, US units (36): Alabama, Arkansas, Connecticut, Delaware, District of Columbia, Florida, Georgia, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Nebraska, New Hampshire, New Jersey, New York, North Carolina, North Dakota, Ohio, Oklahoma, Pennsylvania, South Carolina, South Dakota, Tennessee, Vermont, Virginia, West Virginia, Wisconsin.
- WCVP introduced, US units (0): none.
- WCVP Canadian provinces: native Manitoba, Ontario, Québec; introduced none.
- **GBIF strong, WCVP silent** (1): Rhode Island (11/208). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- **WCVP lists, GBIF has no georeferenced record** (1): North Dakota.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 3613 specimens, 51333 observations.
- GBIF strong US units (32): Alabama (55/378), Arkansas (47/392), Connecticut (147/1432), Delaware (8/131), District of Columbia (9/59), Georgia (40/851), Illinois (120/4744), Indiana (150/1653), Iowa (55/640), Kansas (49/24), Kentucky (17/863), Maine (23/376), Maryland (103/1504), Massachusetts (48/3292), Michigan (175/3489), Minnesota (222/2861), Mississippi (28/21), Missouri (123/902), New Hampshire (33/242), New Jersey (103/1207), New York (80/4640), North Carolina (98/2084), Ohio (38/4411), Oklahoma (21/30), Pennsylvania (824/3739), Rhode Island (11/208), South Carolina (34/195), Tennessee (96/1720), Vermont (28/224), Virginia (88/3322), West Virginia (45/732), Wisconsin (686/4945).
- GBIF strong Canadian units: Ontario (64/4074), Québec (7/5).

### 40. lonicera-japonica

- GBIF backbone: Lonicera japonica Thunb. (ACCEPTED); key 5334240.
- WCVP accepted name: Lonicera japonica Thunb.
- WCVP native, US units (0): none.
- WCVP introduced, US units (39): Alabama, Arizona, Arkansas, California, Connecticut, Delaware, District of Columbia, Florida, Georgia, Hawaii, Illinois, Indiana, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Mississippi, Missouri, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, Ohio, Oklahoma, Pennsylvania, South Carolina, Tennessee, Texas, Utah, Virginia, Washington, West Virginia, Wisconsin.
- WCVP Canadian provinces: native none; introduced Ontario.
- **GBIF strong, WCVP silent** (3): Colorado (7/13), Oregon (6/32), Rhode Island (5/260). Recording, cultivation or escape are all possible; WCVP is not evidence of absence at state scale.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 2560 specimens, 52120 observations.
- GBIF strong US units (37): Alabama (72/1706), Arizona (8/10), Arkansas (127/1129), California (139/1236), Colorado (7/13), Connecticut (72/602), Delaware (19/402), District of Columbia (21/418), Florida (86/427), Georgia (43/2212), Hawaii (20/169), Illinois (33/584), Indiana (66/555), Kansas (95/206), Kentucky (18/1204), Louisiana (44/942), Maryland (157/3358), Massachusetts (7/639), Michigan (24/82), Mississippi (88/692), Missouri (84/804), Nebraska (5/10), New Hampshire (5/7), New Jersey (150/4472), New York (50/2727), North Carolina (164/4423), Ohio (16/1508), Oklahoma (11/826), Oregon (6/32), Pennsylvania (380/3074), Rhode Island (5/260), South Carolina (54/1193), Tennessee (70/2499), Texas (204/8694), Virginia (180/4456), Washington (10/52), West Virginia (13/383).
- GBIF strong Canadian units: Ontario (5/174).

### 41. pinus-spp

- GBIF backbone: Pinus L. (ACCEPTED); key 2684241 (GENUS key; card names a genus, no species).
- WCVP: not applicable (genus card; any membership must come from a species-level decision the owner has not made).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 65088 specimens, 268056 observations.
- GBIF strong US units (51): Alabama (491/2820), Alaska (34/503), Arizona (6836/10181), Arkansas (550/728), California (13717/36278), Colorado (3629/11319), Connecticut (242/2245), Delaware (74/501), District of Columbia (104/60), Florida (1394/13120), Georgia (491/2709), Hawaii (88/86), Idaho (2789/3792), Illinois (236/1259), Indiana (61/1136), Iowa (41/153), Kansas (86/14), Kentucky (69/870), Louisiana (188/657), Maine (141/5116), Maryland (512/3223), Massachusetts (366/25717), Michigan (543/9233), Minnesota (957/4728), Mississippi (425/901), Missouri (217/197), Montana (2335/3012), Nebraska (207/265), Nevada (2225/4538), New Hampshire (296/10390), New Jersey (428/3998), New Mexico (6781/11841), New York (534/15276), North Carolina (917/8171), North Dakota (53/21), Ohio (39/2064), Oklahoma (65/167), Oregon (6401/19064), Pennsylvania (1613/6291), Rhode Island (34/988), South Carolina (362/2056), South Dakota (259/736), Tennessee (905/1750), Texas (766/3667), Utah (2437/5222), Vermont (135/6130), Virginia (509/5634), Washington (1762/7952), West Virginia (176/1001), Wisconsin (1118/6516), Wyoming (445/3745).
- GBIF strong Canadian units: Alberta (142/2236), British Columbia (580/16387), Manitoba (149/985), New Brunswick (138/1643), Newfoundland and Labrador (17/258), Northwest Territories (71/91), Nova Scotia (144/6614), Ontario (623/23359), Prince Edward Island (8/670), Québec (1336/5420), Saskatchewan (25/283), USA.27_1 (6/3), USA.33_1 (5/19), Yukon (49/556).

### 42. morus-spp

- GBIF backbone: Morus L. (ACCEPTED); key 2984545 (GENUS key; card names a genus, no species).
- WCVP: not applicable (genus card; any membership must come from a species-level decision the owner has not made).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 5713 specimens, 30714 observations.
- GBIF strong US units (44): Alabama (62/520), Arizona (329/449), Arkansas (95/531), California (165/152), Colorado (20/25), Connecticut (104/197), Delaware (17/80), District of Columbia (43/172), Florida (190/561), Georgia (72/772), Idaho (30/46), Illinois (239/1331), Indiana (190/964), Iowa (64/254), Kansas (567/362), Kentucky (23/744), Louisiana (44/204), Maryland (117/787), Massachusetts (17/707), Michigan (95/1625), Minnesota (83/1016), Mississippi (179/173), Missouri (368/586), Nebraska (128/296), New Hampshire (17/15), New Jersey (165/849), New Mexico (119/175), New York (118/5592), North Carolina (181/826), Ohio (36/1059), Oklahoma (56/866), Oregon (24/59), Pennsylvania (368/1073), Rhode Island (5/86), South Carolina (62/177), South Dakota (16/108), Tennessee (44/503), Texas (615/3769), Utah (20/44), Vermont (42/48), Virginia (241/1013), Washington (64/117), West Virginia (38/72), Wisconsin (233/1666).
- GBIF strong Canadian units: British Columbia (8/15), Ontario (96/2940), Québec (15/89).

### 43. passiflora-incarnata

- GBIF backbone: Passiflora incarnata L. (ACCEPTED); key 2874218.
- WCVP accepted name: Passiflora incarnata L.
- WCVP native, US units (20): Alabama, Arkansas, Florida, Georgia, Illinois, Indiana, Kansas, Kentucky, Louisiana, Mississippi, Missouri, North Carolina, Ohio, Oklahoma, Pennsylvania, South Carolina, Tennessee, Texas, Virginia, West Virginia.
- WCVP introduced, US units (4): Delaware, District of Columbia, Maryland, New Jersey.
- WCVP Canadian provinces: native none; introduced none.
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 1360 specimens, 27444 observations.
- GBIF strong US units (21): Alabama (73/1280), Arkansas (115/1290), District of Columbia (12/55), Florida (180/3131), Georgia (76/2169), Illinois (24/311), Indiana (0/121), Kansas (45/63), Kentucky (21/906), Louisiana (39/681), Maryland (19/454), Mississippi (86/507), Missouri (97/650), North Carolina (91/2518), Ohio (1/257), Oklahoma (54/870), Pennsylvania (4/147), South Carolina (78/1187), Tennessee (65/2815), Texas (198/6140), Virginia (73/1635).

### 44. lactuca-serriola

- GBIF backbone: Lactuca serriola L. (ACCEPTED); key 3140490.
- WCVP accepted name: Lactuca serriola L.
- WCVP native, US units (0): none.
- WCVP introduced, US units (49): Alabama, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, District of Columbia, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming.
- WCVP Canadian provinces: native none; introduced Alberta, British Columbia, Manitoba, New Brunswick, Northwest Territories, Nova Scotia, Ontario, Québec, Saskatchewan.
- GRIIS US: conterminous 48 United States:None:PRESENT (introduced-status claim).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 4141 specimens, 22745 observations.
- GBIF strong US units (45): Alabama (5/56), Arizona (290/657), Arkansas (26/158), California (1003/5226), Colorado (218/1148), Connecticut (47/81), District of Columbia (13/106), Florida (14/8), Georgia (5/63), Idaho (129/488), Illinois (43/728), Indiana (74/270), Iowa (27/195), Kansas (224/375), Kentucky (6/203), Maryland (31/403), Massachusetts (19/309), Michigan (59/220), Minnesota (61/324), Mississippi (73/15), Missouri (78/339), Montana (88/254), Nebraska (74/202), Nevada (82/249), New Hampshire (15/19), New Jersey (59/395), New Mexico (110/361), New York (35/1177), North Carolina (76/179), North Dakota (17/37), Ohio (14/400), Oklahoma (32/342), Oregon (78/609), Pennsylvania (280/563), South Carolina (16/36), South Dakota (28/93), Tennessee (13/239), Texas (235/3543), Utah (64/555), Vermont (15/70), Virginia (60/447), Washington (132/862), West Virginia (8/44), Wisconsin (127/468), Wyoming (32/66).
- GBIF strong Canadian units: Alberta (26/444), British Columbia (34/489), Manitoba (4/174), New Brunswick (6/18), Nova Scotia (8/25), Ontario (51/578), Québec (90/130), Saskatchewan (29/116).

### 45. quercus-spp

- GBIF backbone: Quercus L. (ACCEPTED); key 2877951 (GENUS key; card names a genus, no species).
- WCVP: not applicable (genus card; any membership must come from a species-level decision the owner has not made).
- USDA PLANTS, FNA, POWO site: not retrieved (see sources table).
- GBIF US totals: 93693 specimens, 554374 observations.
- GBIF strong US units (50): Alabama (1735/5951), Arizona (4400/10924), Arkansas (2435/5408), California (22987/105397), Colorado (1077/2496), Connecticut (1185/1785), Delaware (275/672), District of Columbia (851/819), Florida (4386/19073), Georgia (1758/8108), Idaho (52/21), Illinois (4505/6317), Indiana (2205/2159), Iowa (370/719), Kansas (1790/966), Kentucky (623/2897), Louisiana (725/2946), MEX.26_1 (6/7), Maine (188/1592), Maryland (1642/8497), Massachusetts (874/18534), Michigan (1689/5008), Minnesota (1282/5277), Mississippi (2484/2387), Missouri (2981/3251), Montana (13/5), Nebraska (244/288), Nevada (218/1021), New Hampshire (437/3105), New Jersey (1870/7924), New Mexico (2632/3633), New York (1649/196657), North Carolina (2471/13855), North Dakota (51/118), Ohio (434/6210), Oklahoma (914/3292), Oregon (887/6664), Pennsylvania (4098/8516), Rhode Island (188/857), South Carolina (1072/4233), South Dakota (228/441), Tennessee (1037/4968), Texas (5296/39905), Utah (750/4242), Vermont (347/3634), Virginia (2458/14540), Washington (328/2681), West Virginia (409/1360), Wisconsin (3094/4885), Wyoming (56/109).
- GBIF strong Canadian units: Alberta (6/146), British Columbia (230/7818), Manitoba (146/2540), New Brunswick (72/744), Nova Scotia (87/2872), Ontario (1028/16007), Prince Edward Island (8/483), Québec (901/4679), Saskatchewan (10/92), USA.24_1 (11/15), USA.48_1 (6/1).

## Thin or conflicting evidence, flagged for review

- **taraxacum-officinale**: WCVP accepted name differs from the card (Taraxacum spec. F.H.Wigg.); card kept verbatim.
- **acer-spp**: genus card; no species-level range exists in this evidence; GBIF genus counts cover every species in the genus, so they say nothing about which species a player will meet.
- **rubus-spp**: genus card; no species-level range exists in this evidence; GBIF genus counts cover every species in the genus, so they say nothing about which species a player will meet.
- **rhus-spp**: genus card; no species-level range exists in this evidence; GBIF genus counts cover every species in the genus, so they say nothing about which species a player will meet.
- **sambucus-spp**: genus card; no species-level range exists in this evidence; GBIF genus counts cover every species in the genus, so they say nothing about which species a player will meet.
- **rosa-spp**: genus card; no species-level range exists in this evidence; GBIF genus counts cover every species in the genus, so they say nothing about which species a player will meet.
- **salix-spp**: genus card; no species-level range exists in this evidence; GBIF genus counts cover every species in the genus, so they say nothing about which species a player will meet.
- **pinus-spp**: genus card; no species-level range exists in this evidence; GBIF genus counts cover every species in the genus, so they say nothing about which species a player will meet.
- **morus-spp**: genus card; no species-level range exists in this evidence; GBIF genus counts cover every species in the genus, so they say nothing about which species a player will meet.
- **quercus-spp**: genus card; no species-level range exists in this evidence; GBIF genus counts cover every species in the genus, so they say nothing about which species a player will meet.

## Not found, not guessed

- No USDA PLANTS native status or state distribution for any card.
- No Flora of North America text for any card.
- No POWO page statement; WCVP (via GBIF) only.
- No infraspecific, hybrid or cultivar analysis; GBIF `speciesKey` folds subspecies into the species.
- No territories, Alaska/Hawaii or Mexico analysis beyond what appears in the CSV rows.
