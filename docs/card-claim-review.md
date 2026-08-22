# Card claim review

Discrepancies and gaps found while researching sources for the printed cards.

**Nothing here has been changed on a card, in `herbs.json`, or on the website.** The deck
may be in or near production, so these are surfaced for a human decision rather than
silently corrected — which is what the brief requires.

**Every source below is UNVERIFIED**: the build environment blocks outbound HTTPS to all
reference hosts, so these were found by search and not opened. Confirm before acting on
any of them. See `docs/source-candidates.md`.

Separate from this file: `knownCardIssues` in `scripts/build_deck.py` already records five
*transcription-level* errors on the printed cards (duplicated backs on #11, #24 and #31; a
`Stock`/`Stalk` typo on #02; `Sallicin` on #38). Those are transcribed faithfully and
reported there. This file is about whether claims are **supportable**, which is a different
question.

---

## ⚠ HIGH — Card #32, St. John's Wort (*Hypericum perforatum*)

**Claim (card back):** Preparations "Tea · Tincture · Oil · Infusion". Healing traits
"Wound aid · Menopause aid · Nervous system aid · Mood aid". **No printed warning.**

**Status:** ⚠ Needs review — most significant safety gap found.

**Reason:** St John's Wort is one of the best-documented herb–drug interaction risks in
common use. It induces CYP3A4 and P-glycoprotein, reducing plasma concentrations of a long
list of medicines — oral contraceptives, ciclosporin, warfarin, digoxin, indinavir,
irinotecan, simvastatin, and others — with life-threatening events reported in the
literature. It also interacts with SSRIs. The card recommends internal preparations (tea,
tincture, infusion) and cites mood and nervous-system use, which is precisely the use case
where someone is most likely to already be taking an interacting medication.

Every other card that carries a real hazard either has a printed warning (#33) or is not
recommended internally. This one has neither.

**Suggested revision:** add a printed warning to card #32, in the same slot as #33's:

> Beware: interacts with many prescription medicines, including the contraceptive pill.

**Sources reviewed (unverified):**
- https://pubmed.ncbi.nlm.nih.gov/11673747/ — effects on human CYP450 activity
- https://pubmed.ncbi.nlm.nih.gov/16477470/ — hyperforin as the driver of induction
- https://pubmed.ncbi.nlm.nih.gov/28885074/ — clinical risks of co-administration
- https://pubmed.ncbi.nlm.nih.gov/15260917/ — pharmacokinetic interactions
- https://www.ncbi.nlm.nih.gov/books/NBK557465/ — StatPearls monograph

---

## ⚠ MEDIUM — Card #31, Elderberry (*Sambucus* spp.)

**Claim (card back):** Usable parts "Berry · Bark". Preparations "Tea · Infusion · Spice ·
**Cold soak**". No printed warning.

**Status:** ⚠ Needs review.

**Reason:** *Sambucus* leaves, stems, bark and seeds contain the cyanogenic glycoside
sambunigrin; cooking is the standard means of making berries safe, and raw berries are
routinely advised against. "Cold soak" is the one listed preparation that involves **no
heat**, and bark is listed as a usable part. Extension guidance is explicit about removing
stems and leaves and cooking the fruit.

Note this card is *also* already flagged in `knownCardIssues` as printing Sumac's back
content by mistake — so its whole back needs revisiting regardless, and this should be
fixed in the same pass.

**Suggested revision:** when the duplicated back is corrected, drop "Cold soak", and state
that berries are cooked before use.

**Sources reviewed (unverified):**
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7961730/ — cyanogenic glycoside analysis
- https://extension.umn.edu/cottage-food-connection/elderberries-safe-way — cooking guidance
- https://extension.psu.edu/elderberry-in-the-garden-and-the-kitchen — handling
- https://pubmed.ncbi.nlm.nih.gov/27734518/ — glycoside levels by plant part

---

## ⚠ MEDIUM — Card #04, Ragweed (*Ambrosia artemisiifolia*)

**Claim (card back):** Healing traits include "Skin care". Preparations "Tea · Tincture ·
**Poultice** · Infusion". Usable parts include leaf and flower. No printed warning.

**Status:** ⚠ Needs review.

**Reason:** Ragweed is a classical cause of contact dermatitis in North America, mediated
by sesquiterpene lactones — and the card itself lists "Lactones" among its compounds. A
poultice is prolonged skin contact with leaf material, and "Skin care" reads as an
endorsement of exactly that. It is also a major aeroallergen, so a proportion of any
audience is already sensitised.

**Suggested revision:** add a printed caution that skin contact can cause dermatitis in
sensitive people, or drop the topical framing.

**Sources reviewed (unverified):**
- https://www.ncbi.nlm.nih.gov/pubmed/12492548 — contact allergy in SL-sensitive patients
- https://pmc.ncbi.nlm.nih.gov/articles/PMC4861741/ — allergological relevance
- https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11314284/ — SL content by growth stage

---

## ◇ LOW — Card #33, Yarrow (*Achillea millefolium*)

**Claim (printed warning):** "Beware: this plant has a poisonous lookalike."

**Status:** ◇ Supportable, but could be more useful.

**Reason:** The warning is correct and is the deck's best safety feature — it is the only
printed warning in the collection. It does not name the lookalike, which is the one piece
of information that would actually help someone standing in front of the plant. Yarrow is
commonly confused with poison hemlock (*Conium maculatum*); extension guidance distinguishes
them by leaf shape, yarrow's being lacy but not triangular.

**Suggested revision (next print run only — not a correction):** name it.

> Beware: resembles poison hemlock. Yarrow's leaves are lacy, not triangular.

**Sources reviewed (unverified):**
- https://extension.umn.edu/identify-invasive-species/poison-hemlock
- https://plants.ces.ncsu.edu/plants/achillea-millefolium/

---

## ◇ LOW — Card #08, Stinging Nettle (*Urtica dioica*)

**Claim (card back):** Signature compounds "Chlorophyll · Histamine · Iron · Silica".

**Status:** ◇ Wording, not accuracy.

**Reason:** Histamine is genuinely present, in the stinging trichomes alongside
acetylcholine and serotonin — so the entry is defensible. But "Iron" and "Chlorophyll" are
a nutrient and a pigment rather than signature compounds in the sense the other cards use
the field, which elsewhere lists things like achilleine, hypericin and quercetin. No action
needed for safety; noted only if the field is ever standardised.

**Sources reviewed (unverified):**
- https://pubmed.ncbi.nlm.nih.gov/27141606/ — botanical characteristics and constituents

---

## Coverage

Reviewed: #01, #04, #08, #31, #32, #33.
Not yet reviewed: the remaining 39 cards.

Cards were prioritised by safety exposure — those recommending internal use, topical
contact, or carrying a known interaction or toxicity risk — rather than by card order,
per the brief's instruction to prioritise identification, traditional use and safety.
