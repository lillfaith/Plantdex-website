# Field validation, phase 2 — the card-heavy set

Phase 1 was eight plants and **seven of them were off-deck**. It told us a great deal about
photo quality and almost nothing about card unlocking, which is the mechanism the whole
collection rests on. This set exists to fix that imbalance, and nothing else.

Nine specimens, three photos each: **27 requests, one day's signed-in quota, 0 Kindwise
credits.** PlantNet only, same as phase 1.

---

## BLOCKING vs SUPPORTING

The automated audit (`benchmark/identification-audit.bench.test.ts`, 314 probes over all 54
cards) established that **51 of 54 are structurally verified** and need no botanical research
and no field testing. That collapses this set's job to two questions, and everything else here
is supporting validation that must NOT hold up the decision.

| | Specimens | Blocking? |
| --- | --- | --- |
| **Goldenrod scope, A vs B** | 7 | **YES** — nothing else can answer it |
| **Taraxacum on real local plants** | 1, 2 | **YES** — two different individuals |
| Everything else | 3-6, 8, 9 | No. Useful, not blocking. |

**If weather, season or time costs you specimens, drop from the bottom.** A run of three —
one goldenrod and two dandelions — resolves both open questions. A run of nine is better
evidence about photo count and false unlocks, and neither of those is gating the merge.

`ONLY=spec-001,spec-002,spec-007` runs exactly the blocking three: **9 requests.**

## What it is for

Four questions, each tied to specific specimens rather than to the set as a whole:

| Question | Answered by |
| --- | --- |
| **Legitimate unlock rate** — does a real deck plant actually open its card? | 1-7 |
| **False unlocks** — does a near relative open a card it should not? | 9, and 2 against 1 |
| **Does photo 2 or 3 help on DECK species?** | all of them; phase 1 could only answer it on plants with no card |
| **Does PlantNet repeat the Taraxacum failure on North American dandelions?** | 1 and 2 |

---

## The nine

| # | Target | Deck card | Why it is here |
| --- | --- | --- | --- |
| 1 | **Dandelion** — individual A | `taraxacum-officinale` | The Commons pilot had PlantNet answer *T. mattmarkense* — a sect. *Alpina* endemic of the western Alps — four times out of four. Whether that happens on a real North American lawn plant is the single most valuable unknown in this set. |
| 2 | **Dandelion** — individual B, **a different plant** | `taraxacum-officinale` | One dandelion cannot separate "the species is hard" from "that specimen was odd". Two can. |
| 3 | **Common plantain** *(Plantago major)* | `plantago-major` | The control. 0.877-0.945 across every Commons condition. If this misses, something is wrong with the run, not the model. |
| 4 | **Dock** *(Rumex obtusifolius* or *crispus)* | `rumex-obtusifolius` / `rumex-acetosella` | The species whose 0.616-to-0.303 score spread is the reason `outcomeFor` reads rank rather than an absolute score. **The deck holds two *Rumex* cards**, so this is also the one place a genuine ambiguity can arise. |
| 5 | **Yarrow** *(Achillea millefolium)* | `achillea-millefolium` | The only card in the deck that prints a lookalike warning — "Beware: this plant has a poisonous lookalike". A wrong answer matters more here than anywhere else. |
| 6 | **Ragweed** *(Ambrosia artemisiifolia)* | `ambrosia-artemisiifolia` | The one unambiguous success of phase 1 (0.86-0.94, three for three). Carried over as a cross-run anchor: if it moves, the two runs are not comparable. |
| 7 | **Goldenrod** *(Solidago* sp.) | `solidago-canadensis` | **Decides the scope question.** The proposed curated scope makes a bare `Solidago` answer NON-confirmable. If PlantNet answers goldenrods at genus level, that change costs real coverage; if it answers at species, it costs nothing. Nothing else can tell us which. |
| 8 | **Clover** *(Trifolium pratense*, red) | `trifolium-pratense` | A deck species with an extremely common off-deck congener (*T. repens*), so it is the cleanest test of "does the right card open" next to specimen 9. |
| 9 | **White clover** *(Trifolium repens)* — **off-deck congener** | none — Seed Shelf | The Capsella shape, with a plant anybody can be certain about. The correct outcome is `relatedOnly` and **NOT** a confirmable red-clover card. If this unlocks a card, that is a false unlock on a plant you identified yourself. |

**Add if you can find them:** common violet *(Viola sororia)* and wood sorrel *(Oxalis stricta)* — both deck species and both in genera where the deck holds exactly one of many congeners.

**Substitutions are fine.** A specimen you are certain about beats one from this list you are
guessing at. But keep **1, 2, 7 and 9** if at all possible: those four carry questions nothing
else in the set can answer.

---

## What phase 1 changed about how to shoot it

This is the part to read twice. Phase 1's clearest finding was not about counting photos.

**Specimen 6 of phase 1 returned a confident *Magnolia grandiflora* from ONE photograph, and
then NOTHING AT ALL from two and three.** Its second photo was a wide shot of a whole fence
line — a post, a utility box, and several other plants. Both providers blend the set into a
single answer, so a second photo containing other species does not dilute the result, it
**destroys** it.

So:

1. **Whole plant.** Step back. The target plant should be the obvious subject.
2. **Leaf and stem — FILL THE FRAME.** One leaf, and where it joins the stem. **Get close
   enough that no other plant is in the shot.** This is the photo that broke phase 1.
3. **Flower / fruit / seed head.** Optional. Close, same rule.

Everything else is unchanged from `docs/field-validation-phase-1.md`: ordinary phone camera,
no editing or cropping, mixed light, ground truth written down **before** scanning, and the
naming convention `field/spec-NNN/spec-NNN_<1|2|3>-<organ>.jpg` checked with
`scripts/check_field_set.py`.

---

## Ground truth

Same CSV, same rules, same validator. Two notes specific to this set:

- **You can be certain about most of these**, which is the point of choosing them. Phase 1
  had four of eight at genus or family rank; this set should be mostly `species` /
  `certain`, which is what makes the unlock rate meaningful.
- **Goldenrod is the exception.** *Solidago* is genuinely difficult and the card is
  deliberately genus-wide meanwhile — `truth_rank: genus`, `truth_name: Solidago` is the
  honest entry unless you are confident of the species.

Use `class` to carry the role: `deck-control`, `deck-hard`, `aggregate`, `high-stakes`,
`scope-decision`, `off-deck-congener`.

---

## Reading the result

The number that matters is **false unlocks**, not the aggregate. Phase 1's only genuine
false card came from a 0.065 *Solidago caesia* answer reaching a confirmable Goldenrod — a
6.5% answer with a confirm button under it. One such event in nine specimens is a finding;
zero is reassuring but not yet evidence, because nine specimens cannot distinguish a 5% rate
from a 0% one.

And the standing caution from phase 1: nine specimens, one person, one area, one season.
Enough to catch something badly wrong before production. Not enough to move a threshold, a
photo minimum or a provider.
