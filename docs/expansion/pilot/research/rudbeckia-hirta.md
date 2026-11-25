# Research: #60 Black-Eyed Susan (*Rudbeckia hirta*)

> PROPOSAL ONLY. Not wording for publication; nothing here is imported, enabled or deployed. Retrieval date for every source: 2026-11-25. Network note: the sandbox proxy allowed only en.wikipedia.org (rate-limited) and plants.usda.gov (redirects to a blocked host). BLOCKED (403/timeout): powo.science.kew.org, wcvp.science.kew.org, api.gbif.org, www.gbif.org, pubmed.ncbi.nlm.nih.gov, eutils.ncbi.nlm.nih.gov, europepmc.org, www.fs.usda.gov, plants.sc.egov.usda.gov, www.wikidata.org, www.inaturalist.org, extension.umn.edu, www.wildflower.org, www.fda.gov, www.ipni.org, www.worldfloraonline.org, api.crossref.org, www.ars-grin.gov. All sources below were therefore read through the Exa search/fetch tool (a third-party reader that returns excerpts); most journal articles were read as abstracts or excerpts only. Search links are not citations.

Status vocabulary: **SUPPORTED** (a source says it), **TRADITIONAL_USE_ONLY** (a source records that people used it; no efficacy claim), **UNSUPPORTED** (no adequate source read; `NOT FOUND` means searched and not found, or `PRECLINICAL` means laboratory/animal only).

## (a) Taxon identity check

Accepted name: *Rudbeckia hirta* L. (Asteraceae), rank species.

| Database | Result | Retrieved | Source id |
|---|---|---|---|
| GBIF Backbone | ACCEPTED, EXACT match, confidence 100, usage key 3114225, 'Rudbeckia hirta L.' | 2026-11-25 | gbif-match-3114225 |
| GBIF Backbone synonyms (first entries only; the reader truncated the listing) | Centrocarpha gracilis (Nutt.) D.Don; Centrocarpha gracilis (Nutt.) Sweet (HETEROTYPIC_SYNONYM; GBIF remark: originally a synonym of R. hirta var. hirta; GBIF flagged CONFLICTING_BASIONYM_COMBINATION); further entries not read | 2026-11-25 | gbif-syn-3114225 |
| NRCS Plant Guide (infraspecific) | Names the plant 'Rudbeckia hirta L. var. hirta' (symbol RUHI2); common names brown eyed Susan, bristly coneflower, hairy coneflower, gloriosa daisy | 2026-11-25 | nrcs-ruhi |
| POWO / WCVP (Kew) | NOT FOUND - blocked (403 from sandbox proxy). | 2026-11-25 | NOT FOUND |

**Discrepancies / notes against the draft**

- Draft name matches the GBIF accepted name. No change proposed.
- The species has infraspecific taxa; only var. hirta appears in what was read. A provider may return an infraspecific name. Not resolved here.
- Common-name overlap: 'Brown-eyed Susan' is R. triloba in MDC and NC State sources, but the NRCS guide lists it as a name for R. hirta; do not print 'brown-eyed' as an alias without a botanist's decision.
- Pilot-plan discrepancy: the plan says #60 'shares its genus with an existing card'. No card with genus Rudbeckia exists in src/data/herbs.json or the Field Card list searched; the nearest existing card is Echinacea purpurea (a Field Card), a different genus and a frequently cited lookalike. Coordinator should correct the plan's rationale for #60.

## (b) Identification features and lookalikes

| Feature | Sources | Confidence | Note |
|---|---|---|---|
| Whole plant, including stems, bristly with stiff hairs | [mdc-bes], [illinois-bes], [sdstate-ext] | high |  |
| Leaves lance-shaped, unlobed, alternate; basal leaves long-petioled, upper leaves stalkless or clasping | [mdc-bes], [illinois-bes] | high |  |
| Solitary heads, 8-21 yellow-orange ray florets, dark brown dome-shaped disk | [mdc-bes], [illinois-bes] | high | MDC: 8-21 rays; Illinois: 8-20. |
| Annual to short-lived perennial from a taproot, spreading by seed not rhizomes | [illinois-bes], [sdstate-ext], [mdc-bes] | medium; sources differ (annual vs biennial vs short-lived perennial) | Do not print a lifespan on the card. |

**Lookalikes** (dangerous: yes / no / unknown)

| Lookalike | Dangerous? | How to tell | Sources | Note |
|---|---|---|---|---|
| Rudbeckia triloba (brown-eyed Susan) | no | Much-branched, about 1 inch heads, coarse-toothed leaves, lower leaves 3-lobed (shed before bloom). | [mdc-bes] | 'Not dangerous' means no hazard difference was found in the sources read; neither is a food plant. |
| Rudbeckia fulgida (orange coneflower) | unknown | Rhizomatous perennial, less hairy and more rounded leaves, blooms later, shorter rounded style tips. | [illinois-bes], [sdstate-ext], [mdc-bes] |  |
| Rudbeckia laciniata (cutleaf coneflower) | YES | Tall to 9 ft; green disk and only 6-10 rays; deeply 3-7-lobed leaves. | [mdc-bes], [poison-org], [nmsu-cr636] | Named in livestock-poisoning literature (swine and sheep; poison.org cites a 1932 veterinary paper) - LIVESTOCK ONLY; no human case found. |
| Rudbeckia missouriensis; R. subtomentosa | unknown | R. missouriensis: smaller, upper leaves linear. R. subtomentosa: taller, branched, large-toothed, larger heads. | [mdc-bes] |  |
| Echinacea purpurea | unknown | NOT FOUND beyond being 'often confused' (needs a flora). It is an existing Field Card in this app. | [ncsu-ruhi] |  |
| Coreopsis, Anacis tripteris | unknown | Listed as 'often confused with'; distinguishing features NOT FOUND. | [ncsu-ruhi] |  |

**NOT FOUND:** Distinguishing features for Echinacea/Coreopsis/Anacis from a flora.; Any toxic lookalike from a different genus (not found; search was limited).

## (c) Safety caution

Question: Are the seeds toxic (draft card claim), and what do sources actually say?

- **Not known to poison humans; not for eating** ([poison-org]): Poison-centre article: no evidence the flowers poison humans when swallowed; should not be eaten; two small ingestions in children produced no symptoms.
- **Skin and respiratory irritant** ([poison-org]): Plant hairs can irritate skin (redness to blistering and hives); reported to trigger asthma in sensitive people.
- **Livestock poisoning reported, toxin unknown** ([nmsu-cr636], [illinois-bes], [mdc-bes], [duke-ruhi]): Cattle and pigs affected per NMSU and Illinois Wildflowers; Duke's database carries a bare 'Poison' label; MDC says some Rudbeckia species implicated and livestock usually avoid them.

**Where sources disagree / what is unresolved:** No source disagrees outright. But NO source read says seeds specifically are toxic: that part of the draft is NOT FOUND. The sources support 'not a food plant', 'skin/respiratory irritation', and 'livestock poisoning reported, cause unknown'.

**Draft card warning:** "Seeds may be toxic; not a food plant." - 'Not a food plant': SUPPORTED (poison.org). 'Seeds may be toxic': UNSUPPORTED - no source names seeds; printing it would invent a hazard location. The retrieved hazards (skin hairs, asthma, livestock poisoning) are not on the card.

**Draft guide caution:** 'Seeds are toxic; not a culinary plant.' Stronger than the card and equally unsupported on seeds.

**Proposed site caution:** PROPOSED DRAFT FOR REVIEW, NOT FINAL WORDING: 'Not a food plant. Its bristly hairs can irritate skin and may trigger allergy or asthma symptoms in sensitive people. Some plants in this genus have poisoned livestock; the cause is not established.'

**Open safety questions**

- Should the draft's seed-toxicity sentence be removed from the card? (Recommendation: yes, unless a source is found.)
- Should 'Snakebite aid' be dropped altogether even as a traditional-use phrase? A snakebite is an emergency; the only support is a historical Cherokee wash. Recommend an owner decision to omit.
- Is a hazard line about livestock appropriate on a human-facing card?

## (d) Review of the draft's traits, compounds, taste, preparations, usable parts

| Field | Draft item | Status | Sources | Note |
|---|---|---|---|---|
| healingTraits | Wound support | **TRADITIONAL_USE_ONLY** | [nrcs-ruhi], [naeb-ruhi] | Cherokee root infusion to bathe sores (Moerman via NRCS/NAEB). Historical use only. |
| healingTraits | Skin soothing | **TRADITIONAL_USE_ONLY** | [naeb-ruhi], [nrcs-ruhi] | Same Cherokee dermatological-aid entry. 'Soothing' is not stated by the source; 'to bathe sores' is. |
| healingTraits | Cold support | **TRADITIONAL_USE_ONLY** | [naeb-ruhi], [nrcs-ruhi] | Potawatomi root infusion for colds. |
| healingTraits | Fever aid | **UNSUPPORTED** | none | NOT FOUND in what was read. |
| healingTraits | Immune aid | **UNSUPPORTED** | [curtis2023] | Only in-vitro 'immunomodulatory' findings on flower extracts; not human evidence and not a traditional-use record. Do not render. |
| healingTraits | Snakebite aid | **TRADITIONAL_USE_ONLY** | [naeb-ruhi], [curtis2023] | Cherokee wash for snakebites. Strongly recommend NOT rendering as a card trait (see open questions). |
| compounds | Flavonoids | **SUPPORTED** | [curtis2023] | Flavonol glycosides in flower extracts. |
| compounds | Phenolic acid | **UNSUPPORTED** | [curtis2023] | Source says 'phenolic metabolites' generally; 'phenolic acid' NOT FOUND by name. |
| compounds | Tannins | **UNSUPPORTED** | none | NOT FOUND. |
| taste | Bitter / Green / Earthy | **UNSUPPORTED** | [mdc-bes], [poison-org] | Only 'disagreeable flavor' (genus-level, MDC) and 'disagreeable taste' (poison.org). Specific words NOT FOUND. |
| aromatic | Green / Grassy / Mild | **UNSUPPORTED** | [illinois-bes] | Illinois says the flower has no noticeable scent; the card words are NOT FOUND. |
| preparations | Wash | **TRADITIONAL_USE_ONLY** | [naeb-ruhi], [nrcs-ruhi] | Leaf and root washes are documented historically. |
| preparations | Poultice | **UNSUPPORTED** | none | NOT FOUND for R. hirta in what was read. |
| preparations | Dye | **TRADITIONAL_USE_ONLY** | [nrcs-ruhi], [naeb-ruhi] | Yellow and green dyes from blooms (NRCS); Potawatomi yellow dye (NAEB). |
| usableParts | Root / Flower / Leaf | **TRADITIONAL_USE_ONLY** | [nrcs-ruhi], [naeb-ruhi] | Root infusions, leaf wash and bloom dyes are documented. This is not a statement that any part is safe to take internally. |
| uses (tags) | wound / topical | **TRADITIONAL_USE_ONLY** | [nrcs-ruhi] | As for Wound support. |

## Scanner / matching notes

- No existing card shares the genus Rudbeckia (see discrepancy), so sibling-species matching is not exercised by this card as the plan assumed; the nearest case is a different genus (Echinacea) and cannot be genus-matched.
- R. hirta has infraspecific taxa; confirm they normalise to the same card, or that this is deliberately exact-only.

## Remaining uncertainty

- Taxon: POWO/WCVP not reachable. Infraspecific names not verified.
- Moerman (2015), Foster & Duke (2000) and the 1932 veterinary paper cited second-hand only.

## Source register

| Id | Publisher | Title | URL | Retrieved | Supporting passage (paraphrased) | Caveat |
|---|---|---|---|---|---|---|
| gbif-match-3114225 | GBIF Secretariat | GBIF Backbone Taxonomy species match: Rudbeckia hirta | https://api.gbif.org/v1/species/match?name=Rudbeckia%20hirta&kingdom=Plantae | 2026-11-25 | Exact match; usage key 3114225; scientific name 'Rudbeckia hirta L.'; status ACCEPTED; family Asteraceae; match confidence 100. | Fetched through the Exa web-fetch tool (a third-party reader), not directly from the sandbox, because the sandbox proxy returns 403 for api.gbif.org. GBIF is a backbone aggregator, not a primary nomenclatural authority. |
| gbif-syn-3114225 | GBIF Secretariat | GBIF synonyms of usage key 3114225 | https://api.gbif.org/v1/species/3114225/synonyms?limit=20 | 2026-11-25 | Lists Centrocarpha gracilis combinations as synonyms of Rudbeckia hirta. | Fetched through the Exa web-fetch tool (a third-party reader), not directly from the sandbox, because the sandbox proxy returns 403 for api.gbif.org. GBIF is a backbone aggregator, not a primary nomenclatural authority. Listing truncated. |
| mdc-bes | Missouri Department of Conservation | Black-eyed Susan field guide | https://mdc.mo.gov/discover-nature/field-guide/black-eyed-susan | 2026-11-25 | Usually an annual, unbranched, very hairy herb; leaves hairy, sessile except a few basal ones, lance-shaped, unlobed; flower heads solitary or in loose clusters, 8-21 rich yellow-orange rays, hemispherical deep-brown disk; blooms May-October; lists look-alikes R. triloba, R. laciniata, R. missouriensis, R. subtomentosa, R. fulgida. States some Rudbeckia species have been implicated in livestock poisoning but livestock usually avoid them because of disagreeable flavour. | The livestock statement is about 'some species' of the genus, not R. hirta specifically. |
| illinois-bes | Illinois Wildflowers (John Hilty) | Black-eyed Susan (Rudbeckia hirta) | https://www.illinoiswildflowers.info/prairie/plantx/be_susanx.htm | 2026-11-25 | Biennial or short-lived perennial 1-2.5 ft; stems with long white hairs; alternate grey-green leaves with stiff hairs, basal leaves long-petioled, upper leaves short-petioled or clasping; 8-20 bright yellow rays around a dark brown flattened cone; taproot, no rhizomes. Reports occasional poisoning of cattle and pigs; distinguishes it from R. fulgida (similar, usually blooms later, shorter rounded style tips). | Individual-authored regional site; detailed, but not institutional. |
| sdstate-ext | SDSU Extension (Lang) | Rudbeckia brighten the garden from summer through fall | https://extension.sdstate.edu/rudbeckia-brighten-garden-summer-through-fall | 2026-11-25 | R. hirta is typically annual or short-lived with short bristly hairs on leaves and stems; R. fulgida is a rhizomatous perennial whose stems and leaves are less hairy and leaves more rounded. |  |
| ncsu-ruhi | NC State Extension Plant Toolbox | Rudbeckia hirta | https://plants.ces.ncsu.edu/plants/rudbeckia-hirta/ | 2026-11-25 | Lists plants it is often confused with: Anacis tripteris, Coreopsis gladiata, Echinacea purpurea, and Rudbeckia x Echinacea; species epithet refers to stiff short hairs. |  |
| poison-org | America's Poison Centers (poison.org), Liu & Troutman, 2025 | Allergic reactions to the black-eyed Susan flower | https://www.poison.org/articles/black-eyed-susan-allergic-reactions-213 | 2026-11-25 | Black-eyed Susans have not been known to poison humans but should not be eaten; contact with the hairs can irritate skin (redness, itching, blistering, hives); reported to trigger asthma in sensitive people; no evidence the flowers poison humans when swallowed, but they have poisoned grazing animals; disagreeable taste could limit amounts eaten. Two child tasting cases without symptoms. |  |
| nmsu-cr636 | New Mexico State University (Circular 636, rev. 2010) | An annotated checklist of poisonous or injurious range plants of New Mexico | https://pubs.nmsu.edu/_circulars/CR636/index.html | 2026-11-25 | Lists Rudbeckia hirta with toxin 'unknown', animals affected cattle and swine; R. laciniata listed for swine and sheep. | Livestock only; no human statement; toxin unknown. |
| duke-ruhi | USDA Dr. Duke's Phytochemical and Ethnobotanical Databases | Ethnobotanical plant Rudbeckia hirta | https://phytochem.nal.usda.gov/ethnobotanical-plant-rudbeckia-hirta | 2026-11-25 | Single entry: activity 'Poison', US, citing Lewis and Elvin-Lewis, Medical Botany, ca. 1977. | A bare label with no part, dose, species affected or mechanism. |
| nrcs-ruhi | USDA NRCS East Texas Plant Materials Center (Brakie 2019) | Plant guide: black-eyed Susan (Rudbeckia hirta) | https://plants.sc.egov.usda.gov/DocumentLibrary/plantguide/pdf/pg_ruhi2.pdf | 2026-11-25 | Native American tribes used the whole plant; yellow and green dyes from blooms; Cherokee leaf wash for swelling caused by worms, root infusion to bathe sores, root ooze for earache; Iroquois root infusion for children with worms and root decoction for heart medicine; Potawatomi root infusion for colds (citing Moerman 2015, Tyrl et al. 2008). |  |
| naeb-ruhi | Native American Ethnobotany Database (BRIT; Moerman) | Rudbeckia hirta documented uses | http://naeb.brit.org/uses/species/3476/ | 2026-11-25 | Records 14 documented uses by Cherokee (anthelmintic, dermatological aid, ear medicine, gynecological aid, kidney aid, snake bite remedy, venereal aid), Chippewa, Iroquois (anthelmintic, heart medicine, pediatric aid), Potawatomi (cold remedy, yellow dye) and Shuswap (eye medicine); the Cherokee snake-bite entry reads 'used as wash for snakebites' (Hamel & Chiltoskey 1975). | Records that people used it, not that it works. |
| curtis2023 | Curtis's Botanical Magazine (Wiley), Hind & Lambkin | 1082. Rudbeckia hirta L. | https://onlinelibrary.wiley.com/doi/10.1111/curt.12539 | 2026-11-25 | Notes flavonol glycosides among phenolic metabolites in flower extracts, with laboratory studies of 5-LOX inhibitory, immunomodulatory and antioxidant activity cited as supporting ethnopharmacological use in inflammatory conditions; quotes Foster & Duke 2000 that American Indians used root tea for worms and colds and an external wash for sores, snakebites and swellings. | Laboratory (in vitro) findings; not human evidence. |
