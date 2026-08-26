# Card claim review

Discrepancies and gaps found while researching sources for the printed cards.

**Nothing here has been changed on a card or in `herbs.json`.** The deck is in production,
so these are surfaced for a human decision rather than silently corrected — which is what
the brief requires.

Two things have since changed *on the website*, both outside the transcription and both
labelled as site-added where they appear: the recorded printing errors now render on the
affected plant's page (`src/lib/card-issues.ts`), and #32 carries a site caution
(`src/lib/card-cautions.ts`). Neither touches what a card is transcribed as saying.

---

## ⏱ The deck is in production — what that changes

Confirmed 2026-08-24: the run is on the press. That splits every item in this file into
two different decisions, and only one of them is still open.

**If the printer can still take a plate change**, #32 is the one worth spending it on. It
is the only HIGH item here, and the only card that recommends internal preparations for a
use case where the reader is disproportionately likely to already be taking an interacting
medicine. The exact wording is drafted in its section below and fits #33's existing warning
slot.

**If the plates are closed**, the cards are final and the website becomes the only
correction channel. Two things follow:

1. **Structural errata are already handled.** `knownIssueFor()` in `src/lib/card-issues.ts`
   now renders the recorded `KNOWN_CARD_ISSUES` entry on each affected herb page (#02,
   #11, #24, #31, #38), so a reader of card #31 is told its back is sumac's rather than
   being left to wonder. That needed no new claims — it only surfaces what the build
   script already recorded.

2. **#32's warning now has a home, and it is not `herbs.json`.** Every field there is
   transcribed from the physical card by rule, and inventing a printed warning that no card
   carries would break exactly the guarantee that makes the transcription trustworthy. It
   went instead into `src/lib/card-cautions.ts`, the curated seam, and renders through
   `SiteCaution` — the same weight as a printed warning, prefixed "Not printed on the card",
   on both the discovered and the locked view. `/safety` lists it separately from the
   printed warnings for the same reason.

   Wording shipped (chosen by the deck's owner, shorter than the draft below):

   > Beware: interacts with many prescription medicines.

   The card-mapped source audit independently graded #32's evidence `strong` and flagged the
   interaction risk, and its three references now render on the plant's page. If the plates
   are still open, the printed warning is still worth the plate change — the site caution is
   the correction available to a printed deck, not a replacement for one.

**Sources listed against individual entries below are UNVERIFIED** unless they also appear
in `src/data/sources.json`: the build environment blocks outbound HTTPS to every reference
host, so anything found here was found by search and not opened. Confirm before acting on
one. See `docs/source-candidates.md`. Separately, the card-mapped audit's references *were*
opened by hand before being brought in, which is why those render and these do not.

Separate from this file: `knownCardIssues` in `scripts/build_deck.py` already records five
*transcription-level* errors on the printed cards (duplicated backs on #11, #24 and #31; a
`Stock`/`Stalk` typo on #02; `Sallicin` on #38). Those are transcribed faithfully and
reported there. This file is about whether claims are **supportable**, which is a different
question.

---

## ⚠ HIGH — Card #32, St. John's Wort (*Hypericum perforatum*)

**Claim (card back):** Preparations "Tea · Tincture · Oil · Infusion". Healing traits
"Wound aid · Menopause aid · Nervous system aid · Mood aid". **No printed warning.**

**Status:** ⚠ Needs review — most significant safety gap found. **Site caution shipped**
(`card-cautions.ts`); a printed warning remains open for the next print run.

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

---

# From the card-mapped source audit

All 45 cards were graded by a card-by-card audit whose references were opened and checked
(they are in `src/data/sources.json`, mapped by `src/lib/card-sources.ts`). Four cards came
back `revise` — meaning the audit found the card stating something its evidence does not
carry. Each shows **Card needs review** on its page.

The card text itself is NOT changed, here or anywhere. It is transcribed from a printed card
that is in production; "correcting" it would mean the site and the deck disagree while
claiming they do not. These are the entries a next print run should act on.

## ⚠ Card #29, Field Garlic (*Allium vineale*) — a compound generalised across a genus

**Claim (card back):** signature compounds include **Allicin**.

**Reason:** quercetin and organosulfur compounds fit *Allium* broadly, but allicin is
specifically associated with garlic (*A. sativum*), where alliin meets alliinase on
crushing. Attributing it to wild onions generally overstates what has been measured. Note
the audit worked from "Wild Onion (*Allium* spp.)"; the deck's card is the narrower
*A. vineale*, which makes the species-level point sharper rather than weaker.

**Suggested revision (next print run):** name the species the compound belongs to, or drop
allicin and keep the sulfur compounds.

## ⚠ Card #34, Jewelweed (*Impatiens capensis*) — an effect a trial did not find

**Claim (card back):** itch relief / poison-ivy use.

**Reason:** this is the audit's one *contradicted* claim rather than an unsupported one. A
controlled trial of jewelweed extract against experimentally induced poison ivy/oak
dermatitis found it **not effective**; later reviews of herbal treatments for contact
dermatitis report the same. Traditional use is real and the card may say so as tradition —
what it may not do is present relief as established.

**Suggested revision (next print run):** frame as traditional use only.

## ⚠ Card #09, Wood Sorrel (*Oxalis stricta*) — extrapolated from its relatives

**Reason:** direct research on *O. stricta* is sparse. Vitamin C, oxalate content and edible
use are supportable; digestive, appetite and diuretic claims lean on other *Oxalis* species.
Two of its three references are genus-level for exactly that reason.

**Suggested revision (next print run):** keep the claims that are species-specific, and mark
the rest as traditional.

## ⚠ Card #04, Ragweed (*Ambrosia artemisiifolia*) — see the MEDIUM entry above

The audit reached the same verdict independently: fever, skin-care and digestive claims are
not strongly justified, and the plant is a major allergen. The topical-preparation concern
recorded above is the sharpest form of it.

---

## Coverage

Reviewed in depth: #01, #04, #08, #31, #32, #33.
Graded by the card-mapped audit: all 45, of which #04, #09, #29 and #34 are `revise`.

Cards were prioritised by safety exposure — those recommending internal use, topical
contact, or carrying a known interaction or toxicity risk — rather than by card order,
per the brief's instruction to prioritise identification, traditional use and safety.
