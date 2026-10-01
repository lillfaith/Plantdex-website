# Card scope — the final model

**One rule, four categories, and a default that does not move.**

A card has an **anchor taxon**. It may additionally carry an explicit **curated equivalent
set** of accepted taxa. When an additional taxon unlocks a card, Plantdex **preserves and
displays the taxon actually identified** and never rewrites a distinct accepted species into
the anchor.

```
observed taxon   Solidago altissima
unlocked card    Goldenrod
anchor taxon     Solidago canadensis
unlock basis     curatedEquivalent
```

That is not a claim the species are the same. It is a recorded determination that **this
card's existing content remains materially accurate for both**.

**The default is exact-species and stays exact-species.** Broadening is always an explicit,
sourced, reviewable act. This document is the audit; `benchmark/card-scope-audit.bench.test.ts`
regenerates the census on every run so it cannot drift from what the matcher does.

---

## 1. Census — where all 54 cards sit today

| Category | Count | Cards |
| --- | --- | --- |
| **1. Exact species** | **43** | everything not named below, incl. all 9 Field Cards |
| **2. Curated equivalent group** | **0** | — none exists yet |
| **3. Taxonomic / medicinal complex** | **1** | #1 Dandelion → `Taraxacum` sect. *Taraxacum* |
| **4. Intentional genus `spp.`** | **9** | #17 Acer, #18 Rubus, #20 Rhus, #31 Sambucus, #37 Rosa, #38 Salix, #41 Pinus, #42 Morus, #45 Quercus |
| **Unclassified** | **1** | **#3 Goldenrod** |

**43 of 54 cards need no change and no research.** They accept their own binomial and checked
nomenclatural synonyms, nothing else. That is the finding, and it is the reason this document
is not 54 essays.

**Field Cards are exact by construction, not by declaration.** `card-coverage.ts` iterates the
printed deck, so a Field Card is reachable only by its own binomial — there is no scope entry
to forget. Worth stating so nobody assumes they were classified and found narrow.

### The one unclassified card

**#3 Goldenrod prints `Solidago canadensis` and behaves as `Solidago` spp.** It is in no
category: category 4 requires the card to *say* `spp.`, and it does not. The audit used to
file it beside the nine genus cards, which is exactly the shape this rule exists to refuse — a
card silently behaving as though it declared something it never declared.

**Its decision is deferred by owner instruction and nothing here changes it.** The evidence
sits in [`field-validation-internet-set.md`](./field-validation-internet-set.md): PlantNet
answers goldenrod at species rank, never returned a bare genus, and *S. rugosa* (subsect.
*Venosae*) and *S. juncea* (subsect. *Junceae*) unlock the card today purely through the legacy
genus override.

---

## 2. Human-review shortlist

**Six cards. Nothing below is a proposal, and no species may be added from this document.**
Each entry states the candidate, why it is credible enough to spend research time on, and
**exactly what must be proven** — all seven criteria, every one sourced.

> **I cannot source these from this environment.** The egress proxy blocks POWO, IPNI, GBIF and
> the botanical literature; CI runners have open egress, which is how `check_synonyms.py`
> already queries GBIF. Every claim below about *why a candidate is credible* is a reason to
> look, never a finding. My own Goldenrod proposal failed verification once — *S. elongata* and
> *S. lepida* were both withdrawn after checking — and that is the standard this list is written
> against.

### S1 — #22 Burdock, anchor *Arctium lappa* → candidate *Arctium minus*

**Strongest case in the deck, and the reason is distribution.** The card prints greater burdock;
in North America **common burdock (*A. minus*) is substantially the more frequent plant**, so a
player digging burdock here is likely to photograph the species the card does not name. That is
the Goldenrod shape — card content written for a group, anchor set to one member — on a card
nobody has looked at.

| Criterion | What must be proven |
| --- | --- |
| Taxonomy | POWO/GBIF accept *A. minus* as a species distinct from *A. lappa* (expected) |
| Traditional use | the card's five claims — *Detoxifying, Liver support, Skin care, Anti-inflam., Digestive support* — documented for *A. minus*, not just for "burdock" |
| Part | **Root** above all; card also lists Leaf, Seed, Stem |
| Phytochemistry | **arctiin, inulin, lignans, polyphenols** measured in *A. minus* root |
| Edibility | *A. minus* root documented as a food, same preparations (Decoction, Tea, Tincture, Cooked root) |
| Safety | no contraindication in *A. minus* absent from *A. lappa* |
| No dangerous implication | the lookalike of concern is **outside *Arctium*** |

**Extra check this one needs:** *A. lappa* × *A. minus* hybrids are reported. Decide in advance
how a hybrid name is treated — the parser already keeps the hybrid sign rather than dropping it.

### S2 — #9 Wood Sorrel, anchor *Oxalis stricta* → candidates *O. dillenii*, *O. corniculata*

**This card is the reason the architecture was needed.** The repo already uses *Oxalis dillenii*
as its canonical example of a name that must never be rewritten to *O. stricta*. Under the new
model that tension dissolves: preserve the observed taxon, unlock the card, record
`curatedEquivalent`.

Unusually tractable on safety: **oxalic acid is both a stated compound and the only safety-relevant
one**, so the risk is identical in kind across the yellow wood-sorrels rather than merely absent.

| Criterion | What must be proven |
| --- | --- |
| Taxonomy | current acceptance of all three as distinct species |
| Traditional use | *Vitamin-rich, Appetite support, Digestive support, Diuretic, Cooling* for each |
| Part | Leaf, Flower, Stem, Root |
| Phytochemistry | **oxalate load comparable** — this is the one that decides it |
| Edibility | eaten fresh/in salad, as the card's preparations say |
| Safety | the oxalate caution applies equally and is not *worse* in a candidate |
| No dangerous implication | no toxic *Oxalis* would be swept in |

### S3 — #30 Wild Strawberry, anchor *Fragaria virginiana* → candidate *Fragaria vesca*

Both are common, both wild, **no *Fragaria* fruit is inedible**, and the card's compounds
(Vitamin C, Flavonoids, Ellagic acid, Tannins) are the genus profile.

**The claim to scrutinise is the LEAF, not the fruit.** The card's *Astringent* and *Oral health*
claims rest on leaf tea; those must be documented for *F. vesca* specifically. Fruit equivalence
is the easy half and is not what the card is mostly claiming.

The lookalike — mock strawberry, *Potentilla indica* — is **outside *Fragaria***, so it is not
swept in by any scope within the genus.

### S4 — #3 Goldenrod — **deferred, listed for completeness**

Present scope genus-wide; the card's claims (*Urinary support, Anti-inflam., Mild diuretic,
Allergy support*) and compounds (Quercetin, Flavonoids, Rutin, Saponins) are the checklist any
proposed member must meet. Already-excluded by standing instruction: *S. gigantea*, *S. elongata*,
*S. lepida*, and subsect. *Triplinerviae* as a whole.

### S5 — #5 Lamb's Quarters and #13 Chickweed — **category question before species question**

*Chenopodium album* and *Stellaria media* are each the centre of a **recognised aggregate** —
*C. album* s.l. and the *S. media* group (*S. pallida*, *S. neglecta*). So the first question is
**not** "which species to add" but "is category 3 the right category", exactly as it was for
Dandelion. Asking it the other way round produces a curated-equivalent list that is really an
aggregate wearing a disguise.

**Low urgency**: both are confirmable today via their own binomial, and neither has a reported
coverage failure.

### S6 — #53 Common Mallow (Field Card), anchor *Malva neglecta* → *M. sylvestris*, *M. rotundifolia*

Mallow use is mucilage-based and broadly shared. **Lower stakes — a Field Card pays no XP and
tracks no mastery** — but it is still read as information, so the safety and edibility criteria
apply unchanged. Note *M. rotundifolia* is a long-confused name; the taxonomy criterion is the
hard one here, not the chemistry.

---

## 3. Cards deliberately NOT on the shortlist

Grouped by the reason, because the reasons repeat.

**Safety or potency diverges materially within the genus — must stay exact.**
#23 Wild Mint (*Mentha*), #40 Honeysuckle (*Lonicera* — toxic berries in the genus), #32 St.
John's Wort (*Hypericum* — the card's hypericin/hyperforin claims and its drug interactions are
*perforatum*-specific), #44 Prickly Lettuce (*Lactuca virosa* is far stronger at the card's own
sesquiterpene lactones), #43 Passion Flower, #29 Field Garlic (*Allium* — and the fatal lookalike,
death camas, is outside the genus, so no scope change helps).

**The card's chemistry IS the claim, and it is species-level.**
#10 Red Clover (isoflavones/genistein), #48 Purple Coneflower (*E. angustifolia* and *E. pallida*
differ on echinacoside vs cichoric acid — commercial interchangeability is a market fact, not
evidence).

**The card prints a lookalike warning.** #33 Yarrow — *"Beware: this plant has a poisonous
lookalike"*. Broadening the card that carries the deck's only printed hazard warning is the last
thing to do, not the first.

**Recorded evidence already says no.** #12 Wild Violet — a GBIF run accepted *V. papilionacea* as
a synonym and **refused** *V. riviniana*, *V. odorata*, *V. canina* and *V. septentrionalis* as
accepted species in their own right. That question is answered.

**Two cards share the genus.** #2 Broadleaf Dock and #19 Sheep's Sorrel are both *Rumex*.
Broadening either creates an `ambiguous` match, which is worse than refusing: the matcher would
decline to award *either* card.

**Load-bearing in a test.** #10 Red Clover is the anchor of the phase-2 false-unlock control
(*T. repens* must **not** unlock it). Adding *T. repens* would delete the test it exists for.

---

## 4. The genus cards — the opposite question

These nine are already at genus scope **by their own printed name**, so the review question is
not *can we broaden* but **does this content generalise**. Three warrant a look, and the first is
a genuine hazard rather than a tidiness issue.

**#20 Sumac (*Rhus* spp.) — review first.** **Poison sumac was *Rhus vernix*** and is now
*Toxicodendron vernix*. Current backbones therefore exclude it — but a provider returning the
**historical name** would be matched by this card's genus scope, and the card lists **Berry** and
**Bark** as usable. This is concrete, checkable, and testable: assert that no *Toxicodendron*
species and no historical *Rhus* name for one is confirmable against #20.

**#31 Elderberry (*Sambucus* spp.).** Already carries a site caution (leaf/shoot are not safely
usable, and the card prints them). Within the genus, *S. ebulus* and *S. racemosa* differ
materially from *S. nigra*/*S. canadensis* on edibility. The caution exists; whether it covers
the genus is the question.

**#41 Pine (*Pinus* spp.).** The card lists **Needle**. *P. ponderosa* needles are a documented
livestock abortifacient; whether that generalises to the card's tea preparation is exactly the
"no dangerous implication" criterion, asked of a card that is already broad.

**#45 Oak** (acorn tannins require leaching — likely already implied by the card's content) and
**#17 Acer, #18 Rubus, #37 Rosa, #38 Salix, #42 Morus** show no divergence worth review time.

**None of these is a scope change.** Each is either a card-wording or a `SITE_CAUTIONS` question,
which is the existing two-layer mechanism: the note says *your card is wrong*, the caution says
*here is the risk*, and neither substitutes for the other.

---

## 5. Data representation

### `unlockBasis` — one vocabulary, two places

```ts
export const UNLOCK_BASES = [
  'exact',             // the card's own binomial
  'synonym',           // a checked NOMENCLATURAL synonym of the anchor — same plant
  'acceptedGroup',     // a supra-specific concept IS the card concept   (category 3)
  'curatedEquivalent', // a DISTINCT accepted species, determined equivalent (category 2)
  'genusCard',         // the card itself prints `Genus spp.`            (category 4)
] as const;
```

**Three changes from today's `Eligibility`:**

1. **`synonym` splits out of `exact`.** `matchScientificName` returns `'exact'` both for the
   card's own binomial and for a `ACCEPTED_NAME_SYNONYMS` hit. Those are different facts — one
   is the anchor, one is another name for it — and the distinction is currently lost at the
   moment of recording, where it cannot be recovered.
2. **`curatedEquivalent` is new** and is the whole point: it is the only basis that means *the
   species you found is not the card's species, and we decided the card represents it anyway*.
   It is the basis that **must** trigger the notice in §6.
3. **`legacyGenus` becomes readable-but-not-issuable, never deleted.** Stored sightings carry it.
   Removing it from the union would make historical rows unreadable and the migration would be
   rewriting history — the one thing this model refuses. It stays in the type with a comment
   saying nothing may issue it, and the CHECK constraint keeps accepting it.

The non-unlocking outcomes (`ambiguous`, `related`, `none`) are unchanged and stay on the
matcher's own type; they are not unlock bases.

### `AcceptedTaxon` — evidence becomes structural, not optional

```ts
export interface AcceptedTaxon {
  readonly scientificName: string;
  readonly rank: TaxonRank;
  /** Which kind of membership. Decides the notice AND the rank rule below. */
  readonly basis: 'acceptedGroup' | 'curatedEquivalent';
  readonly note: string;
  /** NOW REQUIRED. `source?` is how an unsourced member gets added by accident. */
  readonly source: string;
  /** The seven criteria, each answered with its own citation. */
  readonly evidence: {
    readonly taxonomy: string;
    readonly traditionalUse: string;
    readonly part: string;
    readonly phytochemistry: string;
    readonly edibility: string;
    readonly safety: string;
    readonly noDangerousImplication: string;
  };
  readonly synonyms?: readonly string[];
}
```

**Making `source` required is the first CI invariant, expressed in the type rather than in a
test** — a test fails after somebody writes the line; a required field means the line cannot be
written. `evidence` being seven named strings rather than one free-text blob is what makes a
half-done addition visible: you cannot satisfy the type by waving at the hard criterion.

**`basis` on the member, not just on the match**, is what keeps categories 2 and 3 from blurring
inside one list — and it is what a rank rule can then be written against (§7, invariant 6).

### The anchor stays derived

The anchor taxon is `herb.scientificName` — already on the card, already generated from the print
master. **Do not add an `anchorTaxon` field.** It would be a second source of truth for a fact the
deck already states, free to disagree with the artwork, and `herbs.json` is generated so it could
not be edited to resolve the disagreement anyway.

### Observed taxon — already satisfied, nothing to build

The requirement that sightings store the provider's actual taxon separately from the unlocked
card **is already met**, on both backends:

| Field | What it holds |
| --- | --- |
| `herbId` | the CARD |
| `observedTaxonProviderName` | the provider's string **exactly** as returned, authorship and all |
| `observedTaxonName` | the tidied identity — authorship dropped, everything that *narrows* kept |
| `observedTaxonKey` | the lookup form, stored because the normaliser's rules may move |
| `observedTaxonRank` | so a section stays a section |
| `eligibility` | **this is the `unlockBasis`** — rename it, do not add a second field |
| `speciesConfidence` | `unresolved` above species rank |

Migration 0006 adds these as **nullable** columns and nothing backfills them, which is correct: a
sighting logged by hand from a card page involves no identifier at all, and inventing a taxon
retroactively would be fabricating a botanical record.

**The only work here is the rename `eligibility` → `unlockBasis` plus the two new values.** That
is a widening of a CHECK constraint and a column rename, with no row rewrite.

---

## 6. The equivalent-species notice

**Required whenever `unlockBasis === 'curatedEquivalent'`.** Not for `exact`, `synonym` or
`genusCard`: in those three the plant and the card already agree, or the card said its own scope.

> You found **Solidago gigantea**. That unlocks the **Goldenrod** card, whose species is
> *Solidago canadensis*. **These are different species** — Plantdex has recorded what you found.

Three placement rules, each from an existing one in this repo:

- It appears **where the unlock is reported** — the scan outcome and the sighting in the journal —
  and on the card page only while that card's own discovery came in this way.
- It **never displaces a `SafetyNotice`**, exactly as a `DeckCta` never does. If room is needed,
  the notice is not the thing that moves.
- It says the species differ **in words**, not by rendering two names next to each other and
  hoping. The whole failure this architecture prevents is a reader concluding the card renamed
  their plant.

`acceptedGroup` (category 3) needs a *different* and quieter line — the observation was
supra-specific, so nothing was equated and nothing contradicts; what the reader needs is that the
species was not resolved, which `speciesConfidence: 'unresolved'` already drives.

---

## 7. Proposed CI invariants

Seven, each tied to one of the failure modes named in the brief. All are pure, need no network,
and belong in `src/lib/` tests rather than the bench suite so they run in `npm run verify`.

**I1 — no unsourced equivalent taxon.** `source` required by the type (above), plus a test that
every `source` is a non-empty absolute URL and every one of the seven `evidence` keys is non-empty.
*Fails on:* a member added with a note and no citation.

**I2 — a curated equivalent cannot become genus-wide.** Members are an **enumerated list, never a
predicate**, and a test asserts that for every `curatedEquivalent` member list the set does not
cover the genus: specifically, that the matcher refuses at least one real congener per card.
*Fails on:* a list quietly grown until "accepted" and "same genus" mean the same thing.

**I3 — no genus scope on a card printing a binomial.** This is the invariant that retires
`pendingCuration` permanently. It ships **today** with a single-element allowlist
(`solidago-canadensis`) and a comment stating that the allowlist may only ever shrink.
*Fails on:* a second card acquiring the Goldenrod treatment — and on Goldenrod itself the day its
decision lands, which is the reminder.

**I4 — bare genera unlock nothing unless the card says `spp.`** Probe `matchScientificName` with
the bare genus of every card and assert `confirmable === false` for every card whose printed name
is not `Genus spp.`
*Fails on:* a scope change that makes `Solidago` alone unlock Goldenrod.

**I5 — the observed taxon is never rewritten to the anchor.** Sweep every card's scope, match each
accepted taxon, and assert `observedTaxon.scientificName` equals the name that was *asked about* —
never the card's binomial — for every basis except `exact`.
*Fails on:* the original bug, in which a *S. altissima* observation was recorded as
*S. canadensis*.

**I6 — categories 2 and 3 cannot blur.** Every `curatedEquivalent` member is species rank or
below; every `acceptedGroup` member is supra-specific. A mixed-rank list fails.
*Fails on:* a section quietly added to an equivalence list, or a species to an aggregate.

**I7 — scope changes are surfaced for review.** The census is written to a committed
`card-scope.generated.json` and compared, in the same shape as `structures.generated.test.ts`.
Any scope change fails CI until the file is regenerated **in the same commit**, so a widening
appears in the diff as a data change a reviewer has to approve rather than as a line in a long
file nobody opened.
*Fails on:* exactly the thing the brief calls "silently broaden".

**What none of them can do:** decide whether a species *belongs*. I1 proves a citation exists, not
that it says what the note claims. That is a human's job, which is why the shortlist above asks
for seven specific proofs per candidate rather than a verdict.

---

## 8. Status

**Nothing in this document is implemented.** No scope changed, no species added, no taxonomy
touched, no production change. The audit generator
(`benchmark/card-scope-audit.bench.test.ts`) is new and read-only; it makes no network call and
spends nothing.
