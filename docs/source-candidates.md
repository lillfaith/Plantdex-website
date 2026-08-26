# Source candidates — awaiting verification

**Status of every entry in this file: UNVERIFIED.**

Nothing here has been opened and read. These are search results recorded against the
specific card claim they appear relevant to, so a human can work through them quickly.

## Why nothing here is verified

The build environment blocks outbound HTTPS to every reference host. `WebSearch` works
(it routes through the API); `WebFetch` returns `EGRESS_BLOCKED` for `plants.usda.gov`,
`en.wikipedia.org`, `powo.science.kew.org`, `pubmed.ncbi.nlm.nih.gov` and
`plants.ces.ncsu.edu` — tested, not assumed.

So a search can tell me a source *exists and looks relevant*. It cannot tell me the source
says what a card says. Marking these `verified: true` off a search snippet is exactly the
"searches for something vaguely similar → attaches citation" failure the brief rules out,
so none of them reach the website: `resolveRefs()` drops anything not in
`src/data/sources.json` with `verified: true`.

That file now holds 126 references besides the deck, from the card-mapped source audit —
those were opened and checked by a human before being brought in, which is the whole
difference between that file and this one. Nothing here graduates into it on a search
result.

## How to verify one

1. Open the URL and read the relevant part.
2. Confirm it supports **the specific claim in the Claim column** — not the plant generally.
3. Add the source to `src/data/sources.json` with `"verified": true`.
4. Attach it to the card in `src/lib/card-sources.ts` — plant-level references — or, for a
   claim-level citation, as a `claimSources` entry in `scripts/build_deck.py` followed by a
   deck rebuild. `herbs.json` is generated and is never hand-edited.
5. If it does *not* support the claim, add a row to `docs/card-claim-review.md` instead.

Claim categories follow `SOURCEABLE_SECTIONS` in `src/lib/types.ts`:
`identification · habitat · facts · growing · traditionalUse · preparations · cautions`.

---

## #01 Dandelion — *Taraxacum officinale*

| Claim | Section | Candidate | Type |
|---|---|---|---|
| Family Asteraceae | identification | https://plants.ces.ncsu.edu/plants/taraxacum-officinale/ | Univ. extension |
| Family / accepted name | identification | https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:254151-1 | Botanical institution |
| Native to Eurasia, introduced to N. America | habitat | https://plants.usda.gov/plant-profile/TAOFO | Government |
| Taxonomic treatment | identification | http://www.efloras.org/florataxon.aspx?flora_id=1&taxon_id=220013281 | Flora of N. America |
| Occurrence in lawns/turf | habitat | https://extension.umn.edu/weeds/dandelions | Univ. extension |
| Traditional diuretic use | traditionalUse | *none recorded yet — needs a pharmacopoeial source* | — |

Card claims still needing a candidate: compounds (Kaempferol, Taraxasterol, Quercetin,
Inulin), preparations (roasted root), usable parts.

## #04 Ragweed — *Ambrosia artemisiifolia*

| Claim | Section | Candidate | Type |
|---|---|---|---|
| Family Asteraceae; ragweed dermatitis in N. America | identification, cautions | https://pmc.ncbi.nlm.nih.gov/articles/PMC4861741/ | Peer-reviewed |
| Contact allergy via sesquiterpene lactones | cautions | https://www.ncbi.nlm.nih.gov/pubmed/12492548 | Peer-reviewed |
| Sesquiterpene lactone content by growth stage | facts | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11314284/ | Peer-reviewed |

⚠️ See `docs/card-claim-review.md` — this card lists topical preparations with no allergy caution.

## #08 Stinging Nettle — *Urtica dioica*

| Claim | Section | Candidate | Type |
|---|---|---|---|
| Family Urticaceae | identification | https://plants.ces.ncsu.edu/plants/urtica-dioica/ | Univ. extension |
| Stinging trichomes contain histamine, acetylcholine, serotonin | facts | https://pubmed.ncbi.nlm.nih.gov/27141606/ | Peer-reviewed |
| Botanical characteristics, constituents | facts | https://link.springer.com/article/10.1007/s13659-023-00380-5 | Peer-reviewed |
| Young leaves cooked as a potherb | preparations | https://www.britannica.com/plant/stinging-nettle | Reference (weaker — prefer an extension source) |

## #31 Elderberry — *Sambucus* spp.

| Claim | Section | Candidate | Type |
|---|---|---|---|
| Cyanogenic glycoside (sambunigrin) in leaves/stems/seeds | cautions | https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7961730/ | Peer-reviewed |
| Cooking required; raw berries not to be eaten | cautions, preparations | https://extension.umn.edu/cottage-food-connection/elderberries-safe-way | Univ. extension |
| Culinary handling, remove stems/leaves/unripe fruit | preparations | https://extension.psu.edu/elderberry-in-the-garden-and-the-kitchen | Univ. extension |
| Glycoside levels by plant part and altitude | facts | https://pubmed.ncbi.nlm.nih.gov/27734518/ | Peer-reviewed |

⚠️ See `docs/card-claim-review.md` — card lists "Cold soak" and berry/bark as usable, with no cooking requirement.

## #32 St. John's Wort — *Hypericum perforatum*

| Claim | Section | Candidate | Type |
|---|---|---|---|
| CYP3A4 induction; interaction mechanism | cautions | https://pubmed.ncbi.nlm.nih.gov/11673747/ | Peer-reviewed |
| Hyperforin as the driver of enzyme induction | cautions, facts | https://pubmed.ncbi.nlm.nih.gov/16477470/ | Peer-reviewed |
| Clinical risks of co-administration | cautions | https://pubmed.ncbi.nlm.nih.gov/28885074/ | Peer-reviewed |
| Interactions incl. oral contraceptives, ciclosporin, warfarin | cautions | https://pubmed.ncbi.nlm.nih.gov/15260917/ | Peer-reviewed |
| General monograph | cautions, traditionalUse | https://www.ncbi.nlm.nih.gov/books/NBK557465/ | NCBI Bookshelf (StatPearls) |

⚠️ See `docs/card-claim-review.md` — highest-priority flag in the deck.

## #33 Yarrow — *Achillea millefolium*

| Claim | Section | Candidate | Type |
|---|---|---|---|
| Family Asteraceae; lacy, non-triangular leaves | identification | https://plants.ces.ncsu.edu/plants/achillea-millefolium/ | Univ. extension |
| Accepted name and range | identification, habitat | https://plants.usda.gov/plant-profile/ACMI2 | Government |
| Native range / N. American distribution | habitat | https://www.wildflower.org/plants/result.php?id_plant=acmi2 | Botanical institution |
| Poison hemlock identification (the printed "poisonous lookalike") | cautions | https://extension.umn.edu/identify-invasive-species/poison-hemlock | Univ. extension |

⚠️ See `docs/card-claim-review.md` — the printed warning does not name the lookalike.

---

## #38 Willow — *Salix* spp. — RESOLVED

Kept here as the record of what went wrong, because it is the failure the citation tests
were written around.

The card-mapped audit mapped #38 to Cinquefoil (*Potentilla* spp.), a different family. The
deck prints Willow, whose compounds are salicin, salicortin and tremulacin, so those three
Potentilla references were **discarded rather than reassigned** — a citation attached to the
wrong plant is worse than none. Willow's own three arrived later, were confirmed opened, and
now live in `src/data/sources.json` (`ema-salicis-cortex`, `pubmed-37895439`,
`pubmed-19140170`) mapped to `'38'` in `src/lib/card-sources.ts`.

The lasting guard is a test: no two cards may cite the same source id. A reference
researched for one plant cannot be quietly reused on another, which is exactly how this
would have gone unnoticed.

---

## Not yet researched

Cards #02–03, #05–07, #09–30, #34–45 at CLAIM level. All 45 now carry plant-level
references from the card-mapped audit except #11, #19 and #21 (see
`src/lib/card-sources.ts` for why each is held); what is missing here is the finer
granularity — a source attached to one specific sentence. The pattern above is the template:
one row per claim, an authoritative candidate, and the section it belongs to.

Source-quality order used when choosing candidates, per the brief: peer-reviewed →
government database → university extension → botanical institution → pharmacopoeia →
high-quality reference. SEO herbal blogs were excluded from every search by domain filter,
not by judgement after the fact.
