# Research: #67 Curly Dock (*Rumex crispus*)

> PROPOSAL ONLY. Not wording for publication; nothing here is imported, enabled or deployed. Retrieval date for every source: 2026-11-25. Network note: the sandbox proxy allowed only en.wikipedia.org (rate-limited) and plants.usda.gov (redirects to a blocked host). BLOCKED (403/timeout): powo.science.kew.org, wcvp.science.kew.org, api.gbif.org, www.gbif.org, pubmed.ncbi.nlm.nih.gov, eutils.ncbi.nlm.nih.gov, europepmc.org, www.fs.usda.gov, plants.sc.egov.usda.gov, www.wikidata.org, www.inaturalist.org, extension.umn.edu, www.wildflower.org, www.fda.gov, www.ipni.org, www.worldfloraonline.org, api.crossref.org, www.ars-grin.gov. All sources below were therefore read through the Exa search/fetch tool (a third-party reader that returns excerpts); most journal articles were read as abstracts or excerpts only. Search links are not citations.

Status vocabulary: **SUPPORTED** (a source says it), **TRADITIONAL_USE_ONLY** (a source records that people used it; no efficacy claim), **UNSUPPORTED** (no adequate source read; `NOT FOUND` means searched and not found, or `PRECLINICAL` means laboratory/animal only).

## (a) Taxon identity check

Accepted name: *Rumex crispus* L. (Polygonaceae), rank species.

| Database | Result | Retrieved | Source id |
|---|---|---|---|
| GBIF Backbone | ACCEPTED, EXACT match, confidence 99, usage key 8195144, 'Rumex crispus L.' | 2026-11-25 | gbif-match-8195144 |
| GBIF Backbone synonyms (first entries; reader truncated the list) | Lapathum crispum (L.) Moench; Lapathum crispum (L.) Scop.; at least one further entry not read | 2026-11-25 | gbif-syn-8195144 |
| Flora of North America vol. 5 (efloras.org) | Rumex crispus Linnaeus, Sp. Pl. 1: 335. 1753; 'Lapathum crispum (Linnaeus) Scopoli' given as synonym; common names curly or yellow dock | 2026-11-25 | fna-rumex |
| POWO / WCVP (Kew) | NOT FOUND - blocked (403). | 2026-11-25 | NOT FOUND |

**Discrepancies / notes against the draft**

- Draft binomial matches GBIF and FNA. No change proposed.
- Common names: sources use 'curly dock', 'curled dock', 'yellow dock' and 'narrow dock' for the same species (FNA, Drugs.com). 'Yellow dock' is also used of the root in herbal literature; the card name 'Curly Dock' is fine.
- Deck context: the printed deck already holds Rumex obtusifolius (#2) and Rumex acetosella (#19) (src/data/herbs.json). Both species are the closest relatives of concern; see the matching analysis.

## (b) Identification features and lookalikes

| Feature | Sources | Confidence | Note |
|---|---|---|---|
| Leaf blades lanceolate/narrow with margins strongly crisped and undulate (wavy-curly); base cuneate/tapering to the petiole | [fna-rumex], [umd-dock], [bsbi-crispus], [calipc-dock] | high |  |
| Membranous papery sheath (ocrea) at leaf bases; swollen nodes | [umd-dock], [calipc-dock] | high; true for the whole family/genus, not a species discriminator |  |
| Fruit: 3 enlarged inner tepals (valves) with entire or nearly entire margins, usually 3 tubercles with one larger | [fna-rumex], [bsbi-crispus], [idseed-rumex] | high; requires ripe fruit and often a close look |  |
| Thick yellow-centred taproot; tall flowering stem with dense whorls turning rusty-brown | [umd-dock], [calipc-dock] | medium |  |

**Lookalikes** (dangerous: yes / no / unknown)

| Lookalike | Dangerous? | How to tell | Sources | Note |
|---|---|---|---|---|
| Rumex obtusifolius (broadleaf dock; existing card #2) | no | Wider, flatter leaves with smooth or finely ruffled margins and a heart-shaped base; valves with spiny/long teeth. | [umd-dock], [calipc-dock], [idseed-rumex], [ncsu-dock], [bsbi-obtusifolius] | 'Not dangerous' here means the sources report the same oxalate caution for both; both are edible-with-caution per extension sources, and the BSBI says not recommended as food. |
| Hybrids: R. x pratensis (R. crispus x R. obtusifolius); R. x confusus (R. crispus x R. patientia); R. x acutus (parentage and authorship not verified) | unknown | Intermediate morphology; best told on ripe valves and fertility; basal leaves often gone at fruiting. | [fna-rumex], [idseed-rumex], [bsbi-crib], [weedsau-obtusifolius] | Hazard is the same oxalate class as the parents; no source suggests a separate hazard. |
| Rumex acetosella (sheep sorrel; existing card #19) and other Rumex | unknown | Not described in the sources read beyond RHS's note that about 20 docks occur in Britain; distinguishing features NOT FOUND here. | [rhs-docks] | Same genus, oxalate-rich; hazard class likely similar but not sourced in what was read. |
| Other plants with basal rosettes (e.g. Plantago, Digitalis) | unknown | NOT FOUND - no authoritative source in this pass lists rosette-stage lookalikes of curly dock. | none | One low-authority herb site compares narrowleaf plantain to curly dock; it was not adopted. Needs a botanist. |

**NOT FOUND:** Any authoritative list of dangerous lookalikes for curly dock at the rosette stage.; Independent verification of R. x acutus parentage and authorship (only IDseed read).; A flora treatment of R. acetosella versus R. crispus differences (not needed for the card but relevant to scanner QA).

## (c) Safety caution

Question: How serious is the oxalate caution, and does 'cook and eat in moderation' match the sources?

- **Edible in small quantities; cooking advised** ([rhs-docks], [ncsu-dock], [drugs-yellowdock]): RHS: young leaves edible, only small quantities, may aggravate some medical conditions. NC State: edible for people but oxalates can have toxic effects if excessive. Drugs.com: avoid uncooked leaves as a wild vegetable.
- **Serious poisoning reported; not recommended as food** ([bsbi-crispus], [bsbi-obtusifolius], [gohar2025], [qian2024]): A fatal human case of oxalate poisoning after culinary use of R. crispus is cited (Reig et al. 1990). BSBI says dietary use is 'very definitely not recommended'. Reviews list kidney stones, hypocalcaemia and kidney/liver injury as possible outcomes at large ingestions and add rare thrombocytopenia and allergy.
- **Cooking water** ([gohar2025]): Oxalate concentrates in cooking water; do not drink it. Cooking does not make dock free of oxalate.

**Where sources disagree / what is unresolved:** Extension/horticultural sources treat young dock leaves as an ordinary edible green in small amounts; the BSBI, citing a fatality, says use as food is not recommended. These are different risk postures about the same facts, not a factual conflict. The oxalate content itself (6.6-11.1% of leaf dry weight in one study) is not disputed.

**Draft card warning:** "High oxalate; cook and eat in moderation." - PARTLY SUPPORTED. 'High oxalate' SUPPORTED. 'Cook' is half-supported (cooking is advised against raw use, but it does not remove oxalate and the cooking water is hazardous). 'Eat in moderation' presents eating as a normal, safe-in-moderation activity while the sources include a fatal case; no source defines a safe amount (NOT FOUND). The wording reads as preparation advice, which AGENTS-style rules treat as a safety risk.

**Draft guide caution:** 'Contains oxalic acid; best cooked and eaten in moderation.' Same verdict.

**Proposed site caution:** PROPOSED DRAFT FOR REVIEW, NOT FINAL WORDING: 'Docks contain oxalic acid. Eating them in quantity has caused serious poisoning, including a death reported in the medical literature, and no safe amount has been established. Do not drink the water they are cooked in. Plantdex does not recommend eating this plant.'

**Open safety questions**

- Should the card keep Cooked Greens / Flour / Roasted Seed as preparations at all given the fatality and the absence of any source for flour or seed?
- Does the owner want a caution that also names people with kidney stones, gout or arthritis (Gohar 2025)?
- Reig et al. 1990 should be read directly before final wording.

## (d) Review of the draft's traits, compounds, taste, preparations, usable parts

| Field | Draft item | Status | Sources | Note |
|---|---|---|---|---|
| healingTraits | Laxative | **TRADITIONAL_USE_ONLY** | [qian2024], [drugs-yellowdock], [gohar2025] | Traditional laxative use of the ROOT is recorded; Drugs.com says no clinical data support any use. Render only with non-claim framing. |
| healingTraits | Digestive aid | **UNSUPPORTED** | [qian2024] | NOT FOUND as such; 'laxative', 'astringent' and 'cholagogue' are the recorded traditional terms. |
| healingTraits | Anti-parasitic | **UNSUPPORTED** | none | NOT FOUND in anything read. Do not render. |
| healingTraits | Iron source | **UNSUPPORTED** | none | NOT FOUND. (Oxalate binds minerals per Gohar 2025, which cuts against a mineral-source claim.) |
| healingTraits | Antimicrob. | **UNSUPPORTED** | [qian2024] | PRECLINICAL: laboratory antimicrobial activity of extracts only. Not a traditional-use record and not human evidence. Do not render. |
| compounds | Emodin / Chrysophanol / Physcion | **SUPPORTED** | [drugs-yellowdock], [li2022], [gohar2025] | Anthraquinones identified in R. crispus (Drugs.com) and the three named as common quality markers across Rumex (Li 2022); concentrated in the root, not the leaf. The card should not imply they are in the greens. |
| taste | Sour / Tart / Bitter | **SUPPORTED** | [rhs-docks], [drugs-yellowdock] | RHS: bitter, lemony; Drugs.com: tart sour-sweet. Descriptive only. |
| aromatic | Earthy / Grassy / Mild | **UNSUPPORTED** | none | NOT FOUND. |
| preparations | Cooked Greens | **TRADITIONAL_USE_ONLY** | [rhs-docks], [ncsu-dock], [drugs-yellowdock] | Documented as a wild vegetable in small quantities; see safety discussion. |
| preparations | Flour | **UNSUPPORTED** | none | NOT FOUND. |
| preparations | Roasted Seed | **UNSUPPORTED** | none | NOT FOUND. (One tertiary page mentions boiled seed use by one nation; not adopted.) |
| preparations | Dye | **UNSUPPORTED** | none | NOT FOUND in what was read. |
| usableParts | Leaf | **TRADITIONAL_USE_ONLY** | [rhs-docks], [drugs-yellowdock] | Young leaves; stalks also used as potherb per Drugs.com. |
| usableParts | Root | **TRADITIONAL_USE_ONLY** | [drugs-yellowdock], [qian2024] | Medicinal root use recorded traditionally. |
| usableParts | Stem | **UNSUPPORTED** | [drugs-yellowdock] | Only 'leaf stalks' (petioles) are mentioned; stem NOT FOUND. |
| usableParts | Seed | **UNSUPPORTED** | none | NOT FOUND. |
| uses (tags) | digestive / edible | **TRADITIONAL_USE_ONLY** | [rhs-docks], [qian2024] | 'Edible' is supported only with the oxalate caveats above; 'digestive' as for Laxative. |

## (e) Safe-matching analysis for Rumex crispus

**Facts the analysis rests on**

- R. crispus and R. obtusifolius hybridise; the hybrid is R. x pratensis Mertens & Koch (FNA, Weeds Australia, IDseed). It is the most common hybrid in the genus at least in Europe and reported from North America (FNA).
- R. x acutus is given by IDseed as a hybrid with R. obtusifolius; its authorship ('L.') and parentage were not independently verified. R. x confusus (R. crispus x R. patientia) is reported from New York (FNA). FNA says North American Rumex hybrids 'need careful revision'.
- Hybrids are intermediate in morphology; the discriminating characters are the ripe valves and fertility, and basal leaves are often gone by fruiting (BSBI crib). A leaf photograph in summer cannot settle it.
- The existing printed deck already contains R. obtusifolius (#2) and R. acetosella (#19), so any dock scan can already resolve to #2.

**What an exact-only rule (exact binomial + checked synonyms; hybrids, sameGenus and 'listed' never confirm) WOULD catch**

- A provider answer that is a named hybrid (x or U+00D7 sign): not an exact species, so it never opens #67 (or #2).
- A genus-only or 'Rumex sp.' answer, and any answer for another Rumex (e.g. R. acetosella resolves to #19, R. patientia to nothing).
- Relatives that are not exact: R. obtusifolius resolves to #2 only on an exact match, not by being 'close to' R. crispus.
- The synonym Lapathum crispum (GBIF, FNA) only if the checked synonym table includes it; otherwise it silently does not resolve.

**What an exact-only rule would NOT catch (residual risk)**

- A hybrid or backcross plant that the provider labels with a pure parent name, in either direction (R. x pratensis returned as R. crispus opens #67; returned as R. obtusifolius opens #2). The rule only acts on the name returned; it cannot see morphology.
- R. x confusus and other crispus-involving hybrids returned as R. crispus, for the same reason.
- Two close scores: if R. crispus and R. obtusifolius are the top two answers with similar confidence, exact-only still confirms the top one. A 'near-tie between two Rumex' => `uncertain` rule is a possible addition, but it is matcher logic and needs coordinator/owner decision (outside this research lane).
- Infraspecific or segregate names (FNA says numerous infraspecific taxa and segregates exist); behaviour depends on how normalizeName treats them.
- A bad identification of a non-Rumex plant. The rule is about naming, not about what the player is actually standing next to.
- Safety consequence is small for the dock-versus-dock confusion because both parents carry the same oxalate caution (NC State, BSBI). The meaningful safety risk is a wrong plant, which exact-only does not touch.

**Proposed rule and tests (for the coordinator; not implemented here)**

- Keep the pilot rule as written in the plan: exact binomial and checked synonyms only; replace the standing refusal test with one that asserts exactly this rather than deleting it.
- Fixtures to add or confirm: R. x pratensis, R. x acutus, R. x confusus (all must NOT confirm); R. obtusifolius -> #2 only; R. acetosella -> #19; Lapathum crispum -> #67 only if the synonym is deliberately added; ASCII ' x ' and U+00D7 forms of the hybrid sign both refused.
- Card copy for #67 should not say or imply that Plantdex can tell curly dock from broadleaf dock or from their hybrids from a photograph.
- Open: whether to add the near-tie => uncertain rule (owner decision).


## Scanner / matching notes

- See section (e). R. obtusifolius is already card #2; this makes a clean R. crispus / R. obtusifolius / hybrid story more important than the plan's 'refusal case' suggests.

## Remaining uncertainty

- POWO/WCVP, IPNI, PubMed direct access blocked. R. x acutus parentage unverified. Reig et al. 1990 (fatal case) and Panciera et al. 1990 read second-hand only.

## Source register

| Id | Publisher | Title | URL | Retrieved | Supporting passage (paraphrased) | Caveat |
|---|---|---|---|---|---|---|
| gbif-match-8195144 | GBIF Secretariat | GBIF Backbone Taxonomy species match: Rumex crispus | https://api.gbif.org/v1/species/match?name=Rumex%20crispus&kingdom=Plantae | 2026-11-25 | Exact match; usage key 8195144; scientific name 'Rumex crispus L.'; status ACCEPTED; family Polygonaceae; match confidence 99. | Fetched through the Exa web-fetch tool (a third-party reader), not directly from the sandbox, because the sandbox proxy returns 403 for api.gbif.org. GBIF is a backbone aggregator, not a primary nomenclatural authority. |
| gbif-syn-8195144 | GBIF Secretariat | GBIF synonyms of usage key 8195144 | https://api.gbif.org/v1/species/8195144/synonyms?limit=20 | 2026-11-25 | Lists Lapathum crispum (L.) Moench and (L.) Scop. as synonyms of the accepted name. | Fetched through the Exa web-fetch tool (a third-party reader), not directly from the sandbox, because the sandbox proxy returns 403 for api.gbif.org. GBIF is a backbone aggregator, not a primary nomenclatural authority. Listing truncated. |
| fna-rumex | Flora of North America (efloras.org) | Rumex crispus (taxon 47) | http://efloras.org/florataxon.aspx?flora_id=1&taxon_id=200006746 | 2026-11-25 | Leaf blades lanceolate to narrowly lanceolate, base cuneate/truncate/weakly cordate, margins strongly crisped and undulate; inner tepals (valves) 3.5-6 x 3-5 mm with margins entire to weakly erose, usually 3 tubercles with at least one distinctly larger; hybridises with many species of subgenus Rumex; the hybrid with R. obtusifolius (R. x pratensis Mertens & Koch) is the most common in the genus, at least in Europe, and reported from several North American localities; R. crispus x R. patientia (R. x confusus Simonkai) reported from New York; says hybrids of Rumex in North America 'need careful revision' and that spontaneous hybrids are usually less fertile and ecologically successful than their parents. |  |
| idseed-rumex | IDseed seed identification guide (Canadian), fact sheet for R. crispus | Rumex crispus L. | https://seedidguide.idseed.org/fact_sheets/34273/ | 2026-11-25 | States R. crispus hybridises with many species in the subgenus, with hybrids with R. obtusifolius including R. x pratensis Mertens & Koch and R. x acutus L. being common in Europe and North America (citing FNA, Brouillet et al., USDA-NRCS); significant morphological variation in the field results; contrasts R. obtusifolius valves (narrow triangular with long teeth) with R. crispus (entire margins). | The 'x acutus L.' authorship and its parentage are given as printed on this page and are NOT independently verified (FNA excerpt read does not mention R. x acutus). |
| umd-dock | University of Maryland Extension | Curly and broadleaf dock: identification and management | https://www.extension.umd.edu/resource/curly-and-broadleaf-dock-identification-and-management | 2026-11-25 | Curly dock: basal rosette, lance-shaped leaves tapering to the petiole, wavy crumpled margins, membranous ocrea sheath at the petiole base, 3-winged papery fruit covering, thick yellow-centred taproot. Broadleaf dock: flatter wider leaves with smooth margins, heart-shaped leaf base, fruit covering with spiny-toothed margins. |  |
| ncsu-dock | NC State / Center for Environmental Farming Systems (Freeman et al.) | Weed focus: dock | https://cefs.ncsu.edu/wp-content/uploads/2020_01_07_Dock.pdf | 2026-11-25 | Leaves are the distinguishing feature: curly dock narrower, more lanceolate, curly edges; broadleaf dock broader leaves, less curly. Says both are edible for people but contain oxalates, which bind calcium and can have toxic effects if consumed excessively; oxalates can damage kidneys at high levels; risk greater in drought. |  |
| bsbi-crispus | Botanical Society of Britain & Ireland (Fermanagh species account) | Rumex crispus | https://bsbi.org/in-your-area/local-botany/co-fermanagh/fermanagh-species-accounts/rumex-crispus-l | 2026-11-25 | Basal leaves narrower and more wavy/crisped than R. obtusifolius, base wedge-shaped; ripe fruit valves with almost entire margins. Toxicity: curled dock has caused fatal poisoning in sheep (Panciera et al. 1990) and humans (Reig et al. 1990); toxic substances include oxalic acid, oxalates and anthraquinone glycosides; leaf samples measured 6.6-11.1% oxalic acid on a dry-weight basis. | Reig et al. 1990 read second-hand only. |
| bsbi-obtusifolius | Botanical Society of Britain & Ireland (Fermanagh species account) | Rumex obtusifolius | https://bsbi.org/in-your-area/local-botany/co-fermanagh/fermanagh-species-accounts/rumex-obtusifolius-l | 2026-11-25 | Reports that in 1990 a Spanish family suffered acute oxalate poisoning after culinary use of R. crispus, with one fatality (Reig et al. 1990), and says use in the human diet is 'very definitely not recommended'; both docks contain oxalates. |  |
| bsbi-crib | Botanical Society of Britain & Ireland (plant crib: Rumex) | Rumex, docks: hybrids | https://bsbi.org/learn/resources/plant-crib/rumex | 2026-11-25 | Docks are easiest to identify when the nutlets are nearly ripe; hybrids combine the morphology of both parents and often look 'scruffy' from partial sterility; most hybrid docks produce little fertile seed but R. obtusifolius x R. crispus is one of only two combinations commonly with half or more of the seed viable (still reduced fertility); the inner perianth segments (valves) are the most important character for hybrids; basal leaves are usually withered by fruiting time; docks can also look abnormal from drought, herbicide, damage or galls. |  |
| rhs-docks | Royal Horticultural Society (UK) | Docks | https://www.rhs.org.uk/weeds/docks | 2026-11-25 | Broad-leaved and curled dock are the two most widespread UK docks; hybridisation between Rumex species frequently occurs so identification can be challenging; curled dock leaves are shorter, narrower and wavier; young leaves are edible with a bitter lemony taste but contain oxalic acid so only small quantities should be eaten and eating dock can aggravate some medical conditions. |  |
| weedsau-obtusifolius | Weeds Australia (Qld Government / Atlas) | Broad-leaved dock profile | https://weeds.org.au/profiles/broad-leaved-dock/ | 2026-11-25 | States Curled Dock (R. crispus) hybridises with Broadleaf Dock; the resulting plants have been called x Rumex pratensis Mertens & Koch and look intermediate; says broadleaf dock contains oxalates and is suspected of poisoning stock. |  |
| calipc-dock | California Invasive Plant Council (Weed Control Handbook) | Curly and broadleaf dock | https://www.cal-ipc.org/wp-content/uploads/WMN/Rumex_crispus-obtusifolius.pdf | 2026-11-25 | Leaf width is the most diagnostic feature separating the two; curly dock has dark green hairless narrow leaves with curly or wavy margins, broadleaf dock wider leaves with smooth to finely ruffled margins; both have a membranous sheath at the leaf base and swollen nodes; under some conditions they accumulate soluble oxalates toxic to livestock. |  |
| qian2024 | International Immunopharmacology / PubMed 39520965 (Qian et al. 2024) | Rumex crispus L.: a comprehensive review on botany, traditional uses, phytochemistry, pharmacology, and safety | https://pubmed.ncbi.nlm.nih.gov/39520965/ | 2026-11-25 | Abstract: traditional use in various countries as astringent, laxative, diuretic, mild tonic, 'blood cleanser', spasmolytic, cholagogue; about 224 constituents including anthraquinones; crude extracts and isolates show antitumor, antimicrobial, antioxidant, anti-inflammatory and other activities (laboratory); states R. crispus is toxic with adverse effects including allergy and symptomatic thrombocytopenia; more work needed. | Abstract only (via the Exa reader). |
| gohar2025 | Food Science & Nutrition 13(12):e71300 (Gohar et al., PMC12714801) | Rumex species: phytochemistry, pharmacology and nutritional potential | https://pmc.ncbi.nlm.nih.gov/articles/PMC12714801/ | 2026-11-25 | Rumex plants contain notable oxalic acid; high intake is linked to secondary hyperoxaluria and kidney stones and reduces mineral absorption; avoid drinking cooking water where oxalate concentrates; avoid in kidney stones, gout, arthritis; Table 3 lists R. crispus with fatal oxalate poisoning after large ingestion (Reig 1990); evidence is dominated by preclinical studies, human trials 'virtually absent'. R. crispus roots contain anthraquinones used traditionally for skin complaints and constipation. |  |
| li2022 | Natural Products and Bioprospecting (Li et al. 2022) | The genus Rumex (Polygonaceae): an ethnobotanical, phytochemical and pharmacological review | https://link.springer.com/article/10.1007/s13659-022-00346-z | 2026-11-25 | Quinones accumulate particularly in the roots; chrysophanol, emodin and physcion are three anthraquinones commonly used as quality indicators for Rumex plants. | Genus-level statement, not specific to R. crispus. |
| drugs-yellowdock | Drugs.com (Natural Products database; updated Aug 2026) | Yellow dock uses, benefits and dosage | https://www.drugs.com/npp/yellow-dock.html | 2026-11-25 | Roots exert a laxative effect but no clinical data support use for any condition; oxalate content of leaves may cause GI symptoms or kidney damage and uncooked leaves as a wild vegetable should be avoided; avoid in pregnancy; root contains emodin, chrysophanic acid, physcion (about 2% anthraquinones); leaf stalks have been used as a potherb with a tart sour-sweet taste. |  |
