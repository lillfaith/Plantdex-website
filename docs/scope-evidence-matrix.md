# Scope evidence matrix

Two audits under the frozen model: the **nine existing `Genus spp.` cards** (scopes that
already affect users), then the **six curated-equivalent candidates**. Nothing is implemented.

**What is sourced and what is not.** Criterion 1, *current authoritative taxonomy*, is
answered by GBIF's backbone, queried from a CI runner (`scripts/resolve_taxa.py`,
[runs 36936503360 / 36936514974 / 36936735911](https://github.com/lillfaith/Plantdex-website/actions/workflows/resolve-taxa.yml)).
Matcher behaviour is measured by running the real `matchScientificName`. **Criteria 2-7 —
traditional use, part, phytochemistry, edibility, safety, card wording — are literature, and
every nomenclatural and pharmacological source is blocked from this environment** (`CONNECT
tunnel failed, response 403`, measured). They are marked `UNSOURCED` throughout and no claim
is made on them.

---

# 1. Existing genus-card hazards

## 1.1 What can unlock a `Genus spp.` card

**The reachable set is not a list, it is a rule:** `cardsCoveringByScope` accepts any name
whose first word normalises to the card's genus. `genusOf()` reads **the name as returned**, so
**a plant whose accepted placement has moved to another genus still reaches the old genus's
card under its historical name.** No card declares an exclusion today — measured, 0 of 9.

Bare genus also unlocks all nine. **That is correct** for category 4: the card prints `spp.`
and says its own scope.

## 1.2 Probed against the real matcher — 15 of 15 unlock a card

| Name | GBIF verdict | Unlocks | Card content at risk |
| --- | --- | --- | --- |
| **`Rhus vernix`** | → genus ***Toxicodendron*** | `rhus-spp` | Berry, Bark |
| **`Rhus radicans`** | → ***Toxicodendron radicans*** subsp. *radicans* | `rhus-spp` | Berry, Bark |
| **`Rhus toxicodendron`** | → genus ***Toxicodendron*** | `rhus-spp` | Berry, Bark |
| **`Rhus diversiloba`** | → ***Toxicodendron diversilobum*** | `rhus-spp` | Berry, Bark |
| **`Rhus rydbergii`** | → ***Toxicodendron rydbergii*** | `rhus-spp` | Berry, Bark |
| `Morus papyrifera` | → ***Broussonetia papyrifera*** | `morus-spp` | Fruit, Leaf, Bark |
| `Quercus densiflora` | → ***Notholithocarpus densiflorus*** | `quercus-spp` | Bark, Nut, Leaf |
| `Sambucus ebulus` | ACCEPTED, in genus | `sambucus-spp` | Berry, Flower, Leaf, Shoot |
| `Sambucus racemosa` | ACCEPTED, in genus | `sambucus-spp` | Berry, Flower, Leaf, Shoot |
| `Pinus ponderosa` | ACCEPTED, in genus | `pinus-spp` | Needle |
| `Acer rubrum` | ACCEPTED, in genus | `acer-spp` | Leaf |
| `Pinus abies` / `larix` / `picea` | **ACCEPTED, in *Pinus*** | `pinus-spp` | — see correction |
| `Pinus canadensis` | unresolved (family only) | `pinus-spp` | — see correction |

In every case `observedTaxon.name` is preserved exactly as queried — asserted, not assumed.

## 1.3 HAZARD H1 — the Sumac card is reachable by five names for poison ivy, oak and sumac

**Established, not hypothesised.** Both halves are measured: the matcher confirms all five, and
GBIF places every one in ***Toxicodendron***. The card lists **Berry** and **Bark** as usable
parts and carries no printed warning. Urushiol contact dermatitis from *Toxicodendron* is not a
contested claim, so this clears the bar for a **removal** without needing literature — and a
removal has a lower bar than an addition by design.

**`Toxicodendron vernix` and `Toxicodendron radicans` are already refused** (`kind: none`). The
exposure exists *only* under the historical combination, which is exactly why it is invisible
without probing for it.

### The smallest fix: five strings, zero code

`CardScope.genus` already carries `excluded?: readonly string[]`, and
`cardsCoveringByScope` already honours it — built for this, empty since. So:

```ts
'rhus-spp': {
  type: 'genus',
  excluded: ['Rhus vernix', 'Rhus radicans', 'Rhus toxicodendron',
             'Rhus diversiloba', 'Rhus rydbergii'],
},
```

**Measured, and it behaves better than I predicted.** I expected an excluded name to fall
through to `sameGenus`/`related`, which would still have offered Sumac as a *related* card for
poison ivy. It does not: an excluded name returns **`kind: none`, no card at all**, because
`SPECIES_BY_GENUS` is built from cards' own binomials and `Rhus spp.` contributes none. The
outcome is the right one and it needed no extra rule.

Legitimate sumacs are untouched, verified in the same run: `Rhus typhina`, `R. glabra`,
`R. aromatica`, `R. coriaria`, `R. copallinum` and bare `Rhus` all still unlock.

**The alternative — normalising the historical name to its current one — is the better long-term
shape** (it would also record the observation under the correct modern name) but it needs a new
name→name table; `ACCEPTED_NAME_SYNONYMS` maps name→`herbId`. **Recommend the exclusion now and
the normalisation later**, because the exclusion is a data edit with the correct outcome today.

**Residual, stated rather than hidden:** an excluded poison sumac becomes shelf-eligible and
would be offered a seed packet. That is honest — it *is* a real species with no card, and the
shelf already says it confirms nothing about edibility or safety — but it is a consequence worth
seeing before approving.

## 1.4 HAZARD H2 / H3 — two wrong-genus plants, lower severity

`Morus papyrifera` → *Broussonetia papyrifera* unlocks Mulberry (Fruit, Leaf, Bark);
`Quercus densiflora` → *Notholithocarpus densiflorus* unlocks Oak (Bark, Nut, Leaf). Same
mechanism, same one-line fix. **Neither is a poisoning risk** — both are the "card content is
about a different plant" problem, not a safety one. **UNSOURCED**: whether either card's content
is materially wrong for the substitute.

## 1.5 CORRECTION — the Pine former-placement claim is withdrawn

I previously flagged `Pinus abies`, `Pinus larix`, `Pinus picea` and `Pinus canadensis` as
Linnaean names for spruce, larch, fir and hemlock reaching the Pine card. **GBIF does not
support that.** Queried without authorship, all three binomials come back **ACCEPTED, genus
*Pinus*** — later homonyms (`Siev.`, `Siev.`, `Hablitz`) — and `Pinus canadensis` resolves only
to family Pinaceae. The strings are ambiguous between a Linnaean basionym and a *Pinus* homonym,
and a backbone query cannot tell which a provider meant.

**So H-Pine is not established and is withdrawn.** Pine's remaining question is content-only
(`Pinus ponderosa` needles against a card listing Needle), and it is **UNSOURCED**.

This is the second thing GBIF corrected in this audit, and the reason the taxonomy half went to
a runner instead of to recollection.

## 1.6 Content questions — all UNSOURCED, none a scope change

| Card | Question | Note |
| --- | --- | --- |
| #31 Elderberry | does the content generalise to *S. ebulus*, *S. racemosa*? | already carries `SITE_CAUTIONS` #31; card prints Leaf/Shoot as usable |
| #41 Pine | does the Needle claim generalise to *P. ponderosa*? | |
| #17 Maple | does the Leaf claim generalise to *A. rubrum*, *A. negundo*? | card's Sap claim is not in question |
| #45 Oak | acorn tannins / leaching across the genus | likely already implied |
| #18, #37, #38, #42 | no divergence worth review time | |

**None of these is a scope change.** Each is a card-wording or `SITE_CAUTIONS` question under
the existing two-layer mechanism.

---

# 2. Curated-equivalent candidates that genuinely pass

## **NONE. Zero candidates pass today.**

The frozen rule requires **all seven** criteria. Exactly one is sourceable from here. **Six of
seven are unsourced for every candidate**, so no proposal can be made — and the honest result of
applying the rule as written is an empty list, not a shorter one.

**What taxonomy can and cannot do:** it is a **gate, never a qualifier.** It disqualified one
candidate outright and reclassified two, which is real progress — but a species passing the
taxonomy check has cleared 1 of 7, not 1 of 1.

---

# 3. Candidates that fail or remain uncertain

## 3.1 DISQUALIFIED on sourced taxonomy

| Candidate | Verdict | Why it is closed |
| --- | --- | --- |
| ***Malva rotundifolia*** | `HIGHERRANK` → genus *Malva* only | GBIF cannot resolve it to a species. A **nomen confusum**: long applied to more than one plant. A name that does not denote one species cannot be an accepted taxon. **Closed.** |
| ***Stellaria pallida*** | SYNONYM → ***Stellaria apetala*** | It is **not** a synonym of *S. media*, and *S. apetala* is a third species. It is not an equivalence candidate at all. **Closed** unless *S. apetala* is argued on its own merits. |

## 3.2 RECLASSIFIED — not an equivalence question after all

| Candidate | Verdict | What it actually is |
| --- | --- | --- |
| ***Oxalis europaea*** | SYNONYM → ***Oxalis stricta*** | A synonym of the **Wood Sorrel card's own anchor**. Under the frozen model this is `unlockBasis: 'synonym'`, which needs **no equivalence argument and none of criteria 2-7** — it is the same plant. It belongs in `ACCEPTED_NAME_SYNONYMS`, checked exactly as *Viola papilionacea* was. **The cheapest real coverage win in this audit.** |

## 3.3 TAXONOMY PASSES — six criteria outstanding

Every candidate below is GBIF-**ACCEPTED** and **distinct** from its anchor, so any expansion is
genuine species-equating and `curatedEquivalent` is the right basis. **All six remaining criteria
are UNSOURCED.**

| Card | Candidate | Taxonomy | 2 use | 3 part | 4 chem | 5 edib | 6 safety | 7 wording |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #22 Burdock | *Arctium minus* | **PASS** | ? | ? | ? | ? | ? | ? |
| #22 Burdock | *Arctium tomentosum* | **PASS** | ? | ? | ? | ? | ? | ? |
| #9 Wood Sorrel | *Oxalis dillenii* | **PASS** | ? | ? | ? | ? | ? | ? |
| #9 Wood Sorrel | *Oxalis corniculata* | **PASS** | ? | ? | ? | ? | ? | ? |
| #30 Strawberry | *Fragaria vesca* | **PASS** | ? | ? | ? | ? | ? | ? |
| #5 Lamb's Quarters | *Chenopodium berlandieri* | **PASS** | ? | ? | ? | ? | ? | ? |
| #13 Chickweed | *Stellaria neglecta* | **PASS** | ? | ? | ? | ? | ? | ? |
| #53 Mallow | *Malva sylvestris* | **PASS** | ? | ? | ? | ? | ? | ? |
| #3 Goldenrod | *S. altissima*, *S. gigantea*, *S. rugosa*, *S. juncea* | **PASS** (all ACCEPTED, distinct) | **DEFERRED by instruction** | | | | | |

**The Goldenrod row is the one that changes meaning.** All four are accepted distinct species —
so every one of them currently unlocks the card **through the legacy genus override and nothing
else**. There is no synonymy to fall back on. Whatever is decided, it will be an explicit
equivalence judgement or an explicit narrowing; there is no third reading.

**A note on the two aggregates.** *C. berlandieri* and *S. neglecta* are accepted species, which
means the aggregate framing (category 3) is **not** automatically available: an aggregate member
that is an accepted species in its own right is an equivalence question, same as any other. The
"category question before species question" framing stands, but taxonomy did not settle it.

## 3.4 What criteria 2-7 need, and how to get them

Each needs a cited source naming **the candidate species**, not the genus and not a common name:

1. ~~taxonomy~~ — **done**, GBIF, from CI.
2. **traditional use** — the card's *own* printed claims, for this species.
3. **part** — the card's own parts; for Burdock, **root** decides it.
4. **phytochemistry** — the card's own four compounds, measured in this species.
5. **edibility** — no contradiction, at the card's own preparations.
6. **safety** — no contraindication absent from the anchor.
7. **wording** — nothing on the card made misleading by inclusion.

**This is a literature task that needs network access this environment does not have.** The
pattern that worked for taxonomy — a read-only CI workflow against a named authority with the
answer in the log — extends to any source with an API. It does not extend to a pharmacopoeia
behind a paywall, and that gap should be named now rather than discovered later.

---

# 4. Card wording changes required by an accepted expansion

**None — because nothing was accepted.** Stated conditionally so the requirement is not
rediscovered later:

**A `curatedEquivalent` on any card requires the equivalent-species notice** (`card-scope.md` §6)
wherever the unlock is reported. That is a presentation change, not a wording change, and the
printed transcription stays untouched — the deck is generated from print masters and must not be
edited to match a scope decision.

**A card's printed text would need changing only if an accepted species made it false.** No such
case arose. Two to watch if those candidates ever pass: #30 Wild Strawberry's *Astringent* and
*Oral health* claims rest on **leaf**, which is the part least likely to generalise; #22
Burdock's claims rest on **root**, which is the part most likely to.

**The genus-card findings in §1.6 are a separate wording question already**, independent of any
expansion, and belong in `SITE_CAUTIONS` or a card note rather than here.

---

# 5. Recommended order

1. **H1 — the Sumac exclusion.** Five strings, no code, measured outcome, legitimate sumacs
   verified unaffected. The only item here with established evidence.
2. **H2/H3** — same one-line fix for *Morus papyrifera* and *Quercus densiflora*, lower severity.
3. ***Oxalis europaea* → synonym.** One line in `ACCEPTED_NAME_SYNONYMS`, GBIF-checked, no
   equivalence argument needed.
4. **Close *Malva rotundifolia* and *Stellaria pallida*** in writing, so neither is reopened.
5. **Everything else waits on literature**, and the shortlist is now eight species rather than
   an open question per card.

Nothing above is implemented.
