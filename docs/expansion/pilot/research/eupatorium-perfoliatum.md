# Research: #57 Boneset (*Eupatorium perfoliatum*)

> PROPOSAL ONLY. Not wording for publication; nothing here is imported, enabled or deployed. Retrieval date for every source: 2026-11-25. Network note: the sandbox proxy allowed only en.wikipedia.org (rate-limited) and plants.usda.gov (redirects to a blocked host). BLOCKED (403/timeout): powo.science.kew.org, wcvp.science.kew.org, api.gbif.org, www.gbif.org, pubmed.ncbi.nlm.nih.gov, eutils.ncbi.nlm.nih.gov, europepmc.org, www.fs.usda.gov, plants.sc.egov.usda.gov, www.wikidata.org, www.inaturalist.org, extension.umn.edu, www.wildflower.org, www.fda.gov, www.ipni.org, www.worldfloraonline.org, api.crossref.org, www.ars-grin.gov. All sources below were therefore read through the Exa search/fetch tool (a third-party reader that returns excerpts); most journal articles were read as abstracts or excerpts only. Search links are not citations.

Status vocabulary: **SUPPORTED** (a source says it), **TRADITIONAL_USE_ONLY** (a source records that people used it; no efficacy claim), **UNSUPPORTED** (no adequate source read; `NOT FOUND` means searched and not found, or `PRECLINICAL` means laboratory/animal only).

## (a) Taxon identity check

Accepted name: *Eupatorium perfoliatum* L. (Asteraceae), rank species.

| Database | Result | Retrieved | Source id |
|---|---|---|---|
| GBIF Backbone | ACCEPTED, EXACT match, confidence 100, usage key 5402874, 'Eupatorium perfoliatum L.' | 2026-11-25 | gbif-match-5402874 |
| GBIF Backbone synonyms (first page of 20; the listing was truncated in the reader, so this is NOT the complete list) | Cunigunda perfoliata (L.) Lunell; Eupatorium chapmanii Small (further entries not read) | 2026-11-25 | gbif-syn-5402874 |
| Flora of North America (reprint at nwwildflowers.com) | Name authority Linnaeus, Sp. Pl. 2: 838. 1753; synonyms listed: Eupatorium chapmanii, E. perfoliatum var. colpophilum, var. cuneatum | 2026-11-25 | fna-eupat |
| POWO / WCVP (Kew) | NOT FOUND - not checked. powo.science.kew.org and wcvp.science.kew.org return 403 from the sandbox proxy; the Exa fetch of the POWO search API timed out. | 2026-11-25 | NOT FOUND |

**Discrepancies / notes against the draft**

- Draft name and binomial match GBIF and FNA exactly. No change proposed.
- The Morton Arboretum page (cited below only to record the problem) heads its account 'Eutrochium perfoliatum (syn. Eupatorium perfoliatum)'. Eutrochium is the Joe-Pye weed genus (MDC, Go Botany, FNA all keep E. perfoliatum in Eupatorium). Treat that page as unreliable on nomenclature; do NOT use it as a source for the synonym list. Open question for the botanist: whether any current checklist actually treats it as Eutrochium (not found in what was read).
- FNA and the Alabama Plant Atlas record the natural hybrid Eupatorium x truncatum (E. perfoliatum x E. serotinum) and two infraspecific names (var. colpophilum, var. cuneatum). Matcher/scanner implication: a provider could return the hybrid or a variety.

## (b) Identification features and lookalikes

| Feature | Sources | Confidence | Note |
|---|---|---|---|
| Leaves opposite and the bases of each pair fused around the stem (connate-perfoliate), so the stem seems to pass through one leaf | [mdc-boneset], [fna-eupat], [missouriplants] | high; consistently reported | MDC: none of Missouri's other eupatoriums have perfoliate leaves. FNA: 'usually opposite (sometimes whorled)'. |
| Leaf blades lance-shaped to narrowly triangular with toothed margins, wrinkled upper surface, grayer and more densely hairy beneath, rough or felty, one main vein | [mdc-boneset], [missouriplants], [fna-eupat] | high |  |
| Stems with dense spreading hairs | [mdc-boneset], [missouriplants] | high |  |
| Flat-topped clusters of small dull-white discoid heads, no ray florets, blooming July-October | [mdc-boneset], [missouriplants], [fna-eupat] | high | Floret count per head is reported as 9-23 (MDC, MissouriPlants, Morton), 7-11 (FNA, Alabama Atlas excerpt). Do not print a single number on a card until the botanist chooses between them. |
| Moist ground: streambanks, marshes, wet pastures, moist roadsides | [fna-eupat], [missouriplants] | high |  |

**Lookalikes** (dangerous: yes / no / unknown)

| Lookalike | Dangerous? | How to tell | Sources | Note |
|---|---|---|---|---|
| Ageratina altissima (white snakeroot) | YES | Triangular leaf blades with a broad or rounded base, not perfoliate (per MDC's description of how it differs from thoroughworts). | [mdc-thoroughworts] | MDC states it is toxic if eaten but gives no toxin or effect; NOT FOUND in what was read. Flowers are white like boneset's, so the leaf base is the practical difference. |
| Other Eupatorium (E. serotinum, E. altissimum, E. sessilifolium, etc.) | unknown | Not perfoliate; E. altissimum has 5-floret heads and mostly sessile leaves with three main veins; E. serotinum has leaf stalks and 9-15 florets (per MDC). | [mdc-thoroughworts], [putnam] | Same genus; PA status of related species is mixed in the literature (Kopp 2020, Colegate 2018). Whether any are dangerous was not established in the sources read. |
| Eutrochium spp. (Joe-Pye weeds) | unknown | Pink-purple tinged flowers and usually whorled leaves. | [mdc-thoroughworts], [putnam], [phillips-denham] | Phillips & Denham (2016) list Eupatorium purpureum (a Eutrochium) among PA-containing herbs; practitioner paper, so unverified here. |
| Brickellia eupatorioides (false boneset) | unknown | Cream flowers, alternate narrow leaves with one obvious vein. | [mdc-thoroughworts], [putnam] |  |
| Eupatorium x truncatum (hybrid with E. serotinum) | unknown | Intermediate between its parents (MissouriPlants). | [fna-eupat], [missouriplants] | Hybrids can be returned by a provider; see scanner note. |

**NOT FOUND:** A sourced statement of which Eupatorium relatives are or are not dangerous to humans (beyond the PA literature above).; A single agreed floret count per head.; Toxin and effect of white snakeroot (MDC says only 'toxic if eaten').

## (c) Safety caution

Question: Does boneset contain pyrrolizidine alkaloids (PAs), and does it matter?

- **PAs present** ([colegate2018], [herbalgram125], [drugs-boneset], [kopp2020]): A 2018 survey of 40-49 samples found dehydropyrrolizidine alkaloids (mainly lycopsamine and intermedine) in every authenticated sample, including in infusions and tinctures; the American Herbal Pharmacopoeia's own testing agreed.
- **PAs not detectable (earlier work)** ([hensel2011], [phillips-denham]): A 2008 German summary and reviews of that era said no PAs were detectable; Phillips & Denham (2016) note this versus EFSA-commissioned work finding PAs in a boneset powder.
- **Amount and harm unresolved** ([colegate2018], [herbalgram125], [drugs-boneset], [stegelmeier2016]): All concentrations were low (0.0002-0.07%). Lycopsamine/intermedine fall in the low-toxicity group in cytotoxicity models (Stegelmeier 2016), yet AHP reports they exceed EU interim limits and suggests risk assessment or PA-free preparations. Drugs.com says no direct evidence of hepatotoxicity from boneset exists. Colegate 2018 recommends precautionary caution. Sampling issues, chemotypes, hybridisation or contamination with related species are given as possible reasons for the variation.

**Where sources disagree / what is unresolved:** (1) Whether PAs are present: older reports say no; the 2018 survey says yes in every authenticated sample (the later, larger, authenticated-sample study is more specific, but only abstracts were read). (2) Whether the amounts matter: AHP/Upton says likely low risk with short use but still above EU limits; Drugs.com and Colegate say caution; none provides a human case of boneset hepatotoxicity.

**Draft card warning:** "Possible liver toxins; avoid long-term use." - PARTLY SUPPORTED. 'Possible liver toxins' matches the sources only as 'contains compounds of a class that can injure the liver'. 'Avoid long-term use' is a duration limit NO source read supplies; the sources recommend precaution, not a defined safe period (NOT FOUND). A short-use limit implies a known safe amount that nobody established.

**Draft guide caution:** 'Contains pyrrolizidine alkaloids; traditional herbal use only - not a culinary plant.' PAs: SUPPORTED by Colegate 2018 and AHP (contested by older work). 'Not a culinary plant': no source read states it; consistent with Drugs.com calling it a toxic plant (NOT FOUND as a primary statement).

**Proposed site caution:** PROPOSED DRAFT FOR REVIEW, NOT FINAL WORDING: 'Boneset has been found to contain pyrrolizidine alkaloids, a group of plant compounds some of which can damage the liver. Research has not settled whether the small amounts in teas or tinctures are harmful. Plantdex does not recommend eating or drinking this plant.' Recommended: keep the caution above any discovery action; add a link to the sources.

**Open safety questions**

- Should 'avoid long-term use' be replaced, since no source defines a safe duration?
- Should Healing Traits be shown at all for this card given the unresolved PA question (the plan holds this card out of public release)?
- Should the white snakeroot lookalike be written into a SITE_CAUTIONS entry? Sources say it is toxic if eaten but give no detail.
- Primary EFSA/Mulder et al. 2015 and the AHP monograph itself should be read before final wording; this draft read only abstracts and secondary reports.

## (d) Review of the draft's traits, compounds, taste, preparations, usable parts

| Field | Draft item | Status | Sources | Note |
|---|---|---|---|---|
| healingTraits | Fever aid | **TRADITIONAL_USE_ONLY** | [hensel2011] | Traditional use for fever and flu is described as well documented (excerpt of Hensel et al.). No efficacy claim should be rendered; keep the non-claim framing. |
| healingTraits | Cold support | **TRADITIONAL_USE_ONLY** | [hensel2011] | Same source ('fever and flu'). |
| healingTraits | Sweat-inducing | **UNSUPPORTED** | [drugs-boneset] | NOT FOUND as a stated action. The only trace is the folk name 'sweating plant' in a list of common names. |
| healingTraits | Digestive aid | **UNSUPPORTED** | [drugs-boneset] | NOT FOUND. The one source says large amounts may cause severe diarrhoea. |
| compounds | Sesquiterpenes | **SUPPORTED** | [hensel2011] | Supported at the class level as sesquiterpene LACTONES; the card says 'sesquiterpenes'. Suggest the more precise name if the card is revised. |
| compounds | Flavonoids | **SUPPORTED** | [hensel2011] | Named in the same summary. |
| compounds | Tannins | **UNSUPPORTED** | none | NOT FOUND in anything read. |
| taste | Bitter / Sharp / Harsh | **UNSUPPORTED** | none | NOT FOUND. No taste description was retrieved from a reputable source. |
| aromatic | Herbal / Grassy / Faint | **UNSUPPORTED** | [hensel2011] | Only the statement that volatile oil is present to a very limited extent; scent words NOT FOUND. |
| preparations | Dried Herb / Infusion / Tincture | **TRADITIONAL_USE_ONLY** | [colegate2018], [drugs-boneset] | These forms exist: the 2018 study tested dried herb, alcoholic tinctures, infusions and decoctions, and Drugs.com records a traditional 2 g leaf-and-flower dose. Their existence is not safety evidence; the same study found alkaloids in infusions and tinctures. |
| usableParts | Leaf / Flower / Stem | **TRADITIONAL_USE_ONLY** | [drugs-boneset], [herbalgram125] | Leaves and flowers (Drugs.com) and 'aerial parts' (AHP) are named. 'Stem' alone is NOT FOUND. The reported PA sample that included root is a different part. |
| uses (tags) | immune / tea | **UNSUPPORTED** | none | 'Immune' is an efficacy-flavoured tag: NOT FOUND as a supported statement; 'tea' is a traditional preparation form only. |

## Scanner / matching notes

- E. x truncatum and the two infraspecific names appear in FNA/Alabama; a provider could return them. Under the pilot rule (exact binomial and checked synonyms only) they would not confirm; confirm that is intended.

## Remaining uncertainty

- No direct access to POWO/WCVP, IPNI, PubMed, USDA, or the full text of any journal article; abstracts and aggregator excerpts only.
- Hensel 2011 and Mulder 2015 not read directly.

## Source register

| Id | Publisher | Title | URL | Retrieved | Supporting passage (paraphrased) | Caveat |
|---|---|---|---|---|---|---|
| gbif-match-5402874 | GBIF Secretariat | GBIF Backbone Taxonomy species match: Eupatorium perfoliatum | https://api.gbif.org/v1/species/match?name=Eupatorium%20perfoliatum&kingdom=Plantae | 2026-11-25 | Exact match; usage key 5402874; scientific name 'Eupatorium perfoliatum L.'; status ACCEPTED; family Asteraceae; match confidence 100. | Fetched through the Exa web-fetch tool (a third-party reader), not directly from the sandbox, because the sandbox proxy returns 403 for api.gbif.org. GBIF is a backbone aggregator, not a primary nomenclatural authority. |
| gbif-syn-5402874 | GBIF Secretariat | GBIF synonyms of usage key 5402874 | https://api.gbif.org/v1/species/5402874/synonyms?limit=20 | 2026-11-25 | Lists Cunigunda perfoliata (L.) Lunell and Eupatorium chapmanii Small as synonyms of the accepted name. | Fetched through the Exa web-fetch tool (a third-party reader), not directly from the sandbox, because the sandbox proxy returns 403 for api.gbif.org. GBIF is a backbone aggregator, not a primary nomenclatural authority. The page was cut off after two entries. |
| fna-eupat | Flora of North America vol. 21, p. 471 (Siripun & Schilling), reprinted at nwwildflowers.com | Eupatorium perfoliatum | https://nwwildflowers.com/flora/?t=Eupatorium+perfoliatum | 2026-11-25 | Leaves usually opposite, sessile, bases connate-perfoliate, serrate, gland-dotted beneath; 7-11 florets per head; perennial 40-100+ cm; moist low ground, marshes, roadsides, swamps; hybrids with other Eupatorium reported, E. x truncatum being E. perfoliatum x E. serotinum; named varieties colpophilum (narrower, leathery leaves, extreme NE) and cuneatum. | Reprint on a third-party site, not the FNA original. Floret count differs from other sources (see identification note). |
| mdc-boneset | Missouri Department of Conservation | American Boneset (Common Boneset) field guide | https://mdc.mo.gov/discover-nature/field-guide/american-boneset-common-boneset | 2026-11-25 | Identified by opposite stalkless leaves fused across the stem so the stem appears to pierce a single leaf; flower heads white, in flat-topped clusters, 9-23 florets; spreading hairs; leaves roughened or felty, undersides grayer; blooms July-October. States that none of Missouri's other eupatoriums have perfoliate leaves. |  |
| mdc-thoroughworts | Missouri Department of Conservation | Thoroughworts (Bonesets) field guide | https://mdc.mo.gov/discover-nature/field-guide/thoroughworts-bonesets | 2026-11-25 | Describes nine Eupatorium species in Missouri and how they are told apart. Gives white snakeroot (Ageratina altissima) as looking very similar to thoroughworts, with triangular leaf blades more broadly angled or rounded at the base, and says it is toxic if eaten. Joe-Pye weeds (Eutrochium) have pinkish flowers and usually whorled leaves. False boneset (Brickellia eupatorioides) has cream flowers and narrow alternate leaves. | The page says white snakeroot is toxic if eaten but does not name the toxin or the effect; nothing beyond that is claimed here. |
| missouriplants | MissouriPlants.com (Dr. Tenaglia) | Eupatorium perfoliatum page | https://missouriplants.com/Eupatorium_perfoliatum_page.html | 2026-11-25 | Opposite, sessile, mostly perfoliate leaves with one main vein; densely short-hairy stems; discoid heads of about 9-23 white florets; lists lookalikes as other Eupatorium and Eutrochium and Brickellia eupatorioides; notes a hybrid with E. serotinum (E. x truncatum). | Individual-authored regional site, not an institutional flora. |
| putnam | University of Wisconsin-Eau Claire (Putnam Park Wildflowers) | Eupatorium perfoliatum notes | https://www.chem.uwec.edu/putnam/notes-Eupatorium-perfoliatum.html | 2026-11-25 | Species is distinguished from similar-looking white-flowered plants by perfoliate leaves on the central stem and a conspicuously textured leaf surface; contrasts Brickellia eupatorioides (alternate leaves), Eutrochium and E. altissimum. | Field notes, low authority; used only as corroboration. |
| morton-boneset | The Morton Arboretum | Common boneset | https://mortonarb.org/plant-and-protect/trees-and-plants/common-boneset/ | 2026-11-25 | Corroborates opposite perfoliate leaves, 9-23 disk florets and flat-topped corymbs, BUT heads the page 'Eutrochium perfoliatum (syn. Eupatorium perfoliatum)'. | Nomenclature on this page conflicts with FNA/MDC/GBIF; see discrepancies. |
| colegate2018 | Phytochemical Analysis (Wiley); Colegate, Upton, Gardner, Panter, Betz | Potentially toxic pyrrolizidine alkaloids in Eupatorium perfoliatum and three related species. Implications for herbal use as boneset | https://analyticalsciencejournals.onlinelibrary.wiley.com/doi/10.1002/pca.2775 | 2026-11-25 | Forty-nine E. perfoliatum samples all contained dehydropyrrolizidine alkaloids (0.0002-0.07% w/w), mostly lycopsamine and intermedine, their N-oxides and acetylated forms; alcoholic tinctures and hot-water infusions and decoctions had high concentrations. Earlier reports on this species were described as 'scant and contradictory'. Authors conclude there is a compelling reason for precautionary caution until toxicity and carcinogenicity of the alkaloid content are better defined. | Read from the abstract/search excerpt only; full text not read. A conference abstract of the same work (Planta Med 2018, doi 10.1055/s-0038-1644957) states 40 collections tested. |
| herbalgram125 | HerbalGram no. 125, American Botanical Council (Yearsley) | American Herbal Pharmacopoeia publishes boneset monograph and therapeutic compendium | https://www.herbalgram.org/resources/herbalgram/issues/125/table-of-contents/hg125-orgnews-ahpboneset/ | 2026-11-25 | Reports that AHP's own analyses of authenticated boneset samples, teas and tinctures all tested positive for lycopsamine and intermedine at very low concentrations that still exceeded EU interim limits for herbal medicinal products; a University of Mississippi report of PAs in boneset (2015) came late in the monograph's development. Quotes AHP's Upton that hepatotoxicity risk is likely low in general and boneset is often used short-term, but fetuses, infants and people with compromised livers may be more sensitive; formal toxicology studies are needed. | Secondary report by a magazine; AHP is a herbal-industry body; the article also says boneset 'may be one of the most effective anti-influenza plants'. That is an efficacy claim and is NOT adopted. |
| phillips-denham | Phillips & Denham (practitioner discussion paper, hosted on theforagerspath.com) | Pyrrolizidine alkaloids: key points for herbal practitioners (Aug 2016) | https://www.theforagerspath.com/wp-content/uploads/2018/03/Pyrrolizidine-alkaloids-Aug2016.pdf | 2026-11-25 | States that EFSA-commissioned work identified PAs in a boneset powder while other recent research (Mulder et al. 2015, table 38; Hensel et al. 2011) found none, i.e. the literature disagreed at the time. Authors say it is their personal views. | Low authority; used ONLY to document that the disagreement existed in 2016. Primary Mulder et al. (2015, EFSA) not read. |
| hensel2011 | Journal of Ethnopharmacology 138(3):641-651 (Hensel, Maas, Sendker, Stark et al.), via ResearchGate listing | Eupatorium perfoliatum L.: Phytochemistry, traditional use and current applications | https://www.researchgate.net/publication/51721118_Eupatorium_perfoliatum_L_Phytochemistry_traditional_use_and_current_applications | 2026-11-25 | Excerpts: reviews had described E. perfoliatum as free of pyrrolizidine alkaloids, though other Eupatorium species are suspected producers. A related German summary on the same page (2008) says potentially hepatotoxic PAs 'are not detectable' and that the species contains flavonoids, sesquiterpene lactones, triterpenes and steroids with little volatile oil, and that traditional use for fever and flu is well documented and reflected in former USP monographs. | Only search-result excerpts of a ResearchGate page were read; the paper itself was not. The 'not detectable' sentence is from a 2008 summary on that page, not necessarily the 2011 paper's own conclusion. Superseded on the PA question by the 2018 survey of authenticated samples. |
| drugs-boneset | Drugs.com (Natural Products database; monograph last updated Jan 2026) | Boneset uses, benefits and dosage | https://www.drugs.com/npp/boneset.html | 2026-11-25 | Common names include 'sweating plant' and 'feverwort'; traditional use was 2 g of leaves and flowers; says internal use should be cautioned because of pyrrolizidine alkaloids, that no direct evidence of hepatotoxic effect from boneset exists, and that large amounts of tea or extract may cause severe diarrhoea; cites sources calling E. perfoliatum a toxic plant. | Non-peer-reviewed compendium; used to record the state of its own claims, not as proof of toxicity. |
| stegelmeier2016 | Toxins 8(12):356 (Stegelmeier, Colegate, Brown) | Dehydropyrrolizidine alkaloid toxicity, cytotoxicity, and carcinogenicity | https://pmc.ncbi.nlm.nih.gov/articles/PMC5198550/ | 2026-11-25 | Describes the mechanism of dehydropyrrolizidine alkaloid liver injury and, in a cytotoxicity/chick comparison, groups lycopsamine and intermedine in the low-toxicity group relative to alkaloids such as lasiocarpine or senecionine; notes chronic, low-dose exposure from herbal tisanes is poorly understood and may contribute to chronic disease. | General context only (not boneset-specific); animal and cell models; does not make boneset safe. |
| kopp2020 | Kopp, Abdel-Tawab, Mizaikoff (PMC7290370) | Extracting and analyzing pyrrolizidine alkaloids in medicinal plants: a review | https://pmc.ncbi.nlm.nih.gov/articles/PMC7290370/ | 2026-11-25 | In its Eupatorium section lists echinatine, lycopsamine and intermedine among the most reported PAs in the genus, and cites Colegate et al. on hot-water infusions and decoctions giving high PA amounts. |  |
