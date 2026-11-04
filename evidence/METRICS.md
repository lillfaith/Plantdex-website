# Pipeline metrics — species 1 of 8 (*Matricaria chamomilla*)

Requirement 9. Recorded as measured, with estimates labelled. Nothing here is projected
from a model of the work; the per-species numbers are what this run actually cost.

## 1. AI API cost — **$0.00 spent, and that is not the good news**

The extraction for this species was performed **in the development session**, not by a
scripted API call, because the sandbox would not release a credential to check for one
(`[Credential Materialization]` denial). So:

| | |
|---|---|
| **Actual paid API spend, this species** | **$0.00** |
| Image-generation API spend | **$0.00** — none called, and none is planned (see §3) |
| What a scripted run would cost | **estimated**, below |

**The estimate, and what it rests on.** Measured from the real artifacts:

| Input | Measured |
|---|---|
| Retrieved bundle | 49,634 bytes, 37 passages |
| Passages actually put in front of the extractor | 37 |
| Draft produced | 7 claims, 6,232 bytes |

Tokens are **estimated at ~3.6 characters per token** for English prose; they have **not**
been measured with `count_tokens`, which needs a credential. On that basis, roughly 14K
input and 1.7K output tokens per species.

| Model | Standard | With Batch (−50%) | 8 species | 2,000 species |
|---|---|---|---|---|
| **Claude Opus 5.5** ($4 / $20 per MTok) | ~$0.09 | **~$0.045** | **~$0.36** | **~$90** |
| Claude Sonnet 5.5 ($2 / $10) | ~$0.045 | ~$0.023 | ~$0.18 | ~$45 |

List prices as published, 2026-11; re-measure both the token counts and the prices before
relying on these. **The API is not the budget.**

## 2. Source-review time — **not yet spent, and it is the real cost**

| | |
|---|---|
| Sources retrieved | **41** (32 open access) |
| Sources **verified by a human** | **0** |
| Distinct sources cited by the 7 drafted claims | **6** |
| Human review time spent so far | **0 minutes** |

Verification means what `sources.json` has always made it mean: somebody opened the
document. At ~5 minutes per source to open it, confirm it is about this species, and
confirm it supports the claim attached to it, species 1 needs **~30 minutes** of reading
for its 6 cited sources — before anyone looks at the claims themselves.

**Extrapolated, that is the whole feasibility question.** 6 sources × 2,000 species is
12,000 documents. At 5 minutes each that is **1,000 hours**, against ~$90 of API spend.
The ratio is roughly **11,000 : 1 in favour of human time**, and no change to the model,
the prompt or the batching moves it. This is the number to design against.

## 3. Artwork correction time — **measured, and it is the surprise**

No image API was called. All three methods are code, so the cost is authoring and
correction, measured in rounds of "render it and look".

| | A procedural | B ai-authored | C hybrid |
|---|---|---|---|
| Correction rounds to pass the audit | 3 | 4 | 3 |
| Defects found by **rendering**, not by tests | 2 | 3 | 2 |
| Defects found by **looking at the picture** | 1 | 2 | 1 |
| Per-species authoring, after the shared work | **0 lines** | ~120 lines | **~25 lines** |
| Marginal API cost per species | $0 | $0 | $0 |

Every defect and how it was found:

1. **`trim_tail` cut the face off** (B, C). The default is `True`; it removed the bottom
   of the face patch, leaving a 1-row face with the eyes and mouth hanging in the air.
   Found by rendering. Fixed by measuring: 8,640 geometries swept, 720 qualify.
2. **Leaves floating free** (A, C). The audit reported three disconnected pieces in frame
   0 — a plant and two 14px leaves. Found by the audit. Fixed in the generator: every leaf
   carries its own petiole and its origin is computed from the stem column.
3. **The blush drawn through the eyes** (A). Reported as the *cheeks* being off-face in
   every frame — the right failure naming the wrong part. Found by the audit, diagnosed by
   printing where the pixels landed. Fixed by deriving `mouth_dy` from `eye_dy`.
4. **The mane tuned on the wrong objective** (B, C). The second sweep maximised *white
   pixel count*; it passed every numeric check and rendered as two rectangular slabs —
   sleeves, not ray florets. **Found only by putting it beside the coneflower already in
   the deck.** Re-scored on petal separation: 697 of 5,120 qualify, 13 distinct rays.
5. **Fronds detached under the new mane** (B). Found by the audit. Placement searched: 311
   of 486 positions work; the first guess was not one.
6. **Quotes that name no species** (content, not artwork — recorded here because it was
   found the same way). Two claims quoted real passages whose text never says "chamomile".
   **Found by reading the rendered review page.** Now refusal 7 in the checker.

**Four of the six were invisible to every test and visible immediately in a render.** That
is the finding: for this kind of work, rendering is not verification theatre, it is the
instrument.

## 4. Acceptance rates

| Stage | In | Out | Rate |
|---|---|---|---|
| Species → candidate (dedup + conservation gate) | 1 | 1 | 100% |
| Sources retrieved → cited by a claim | 41 | 6 | 15% |
| Claims drafted → passed the citation check | 7 | 6 | **86%** |
| Claims drafted → **approved** | 7 | **0** | **0%** |
| Cards → publishable | 1 | **0** | **0%** |
| Adversarial attacks → stopped | 8 | 8 | **100%** |

The last three are correct, not a failure. Approval needs a named human and a verified
source, and neither exists yet.

**The one genuine refusal:** claim `c5` names the essential-oil sesquiterpenoids and was
drafted at `laboratory` standing, but its source sits in the `documented-use` query group,
which can only support `traditional`. The claim is probably true and the rule still
refuses it. That is the group-ceiling rule's **false-negative cost**, left in the open
rather than designed around; it is the first thing to revisit if the rate drops further.

## 5. What a human still has to do for this one species

| Task | Estimate |
|---|---|
| Open and verify 6 cited sources | ~30 min |
| Read 6 claims beside their quotes and vote | ~15 min |
| Judge the artwork, pick a method | ~10 min |
| Write the common-name and framing copy | ~10 min |
| **Total** | **~65 min** |

Multiplied out: **2,000 species ≈ 2,170 hours.** Against ~$90 of API spend.

## 6. The limit no machine check reaches

The citation checker verifies **provenance** — this sentence came from that document. It
cannot verify **entailment**: that the sentence supports the claim written beside it. A
perfectly quoted passage can sit under a body that overstates it, inverts it, or describes
a different finding in the same paper, and every one of the seven checks would pass.

That judgement is the reviewer's, and nothing in this pipeline reduces it.
