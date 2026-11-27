# PROPOSAL (not implemented): which candidates may earn a collection receipt

Status: **for owner approval. No code, SQL, flag or deployment has changed.** Production enforcement stays OFF.
Evidence labels: **LIVE** = observed against the deployed TEST project and real PlantNet; **LOCAL** = the repository's own code run by the
coordinator; **UNIT** = existing automated tests with fakes; **DOC** = recorded measurements in `docs/identification-benchmark.md`.

## 1. The problem, restated with the new live evidence

Today a receipt is issued to **any** candidate whose server-side match is confirmable on one of five bases, **whatever its score and
whatever its rank in the list** (`receiptItemsFor`; LOCAL: *Plantago major* at 0.012 and *Taraxacum officinale* at 0.004 both earn one,
labelled `low`). Neither the SQL nor `claim_discovery` looks at confidence.

Run 3 (https://github.com/lillfaith/Plantdex-website/actions/runs/45944350118), LIVE:
- **Blank grey image:** PlantNet returned 5 candidates, all trees (*Populus nigra* 0.00129, *Paulownia tomentosa* 0.00126, *Platanus x hispanica*
  0.00116, *Ginkgo biloba* 0.00104, *Ailanthus altissima* 0.001). **None is a deck card, so none earned a receipt (0 receipt rows).** So the blank
  image was *not* an exploit: but only because the provider's junk guesses happened not to be deck species. Nothing in the rules prevents the
  reverse for another image.
- **Real dandelion photo:** the receipt row reads `eligibility: synonym`, `rank_position: top`, `species_confidence: moderate`, from a score of 0.454.
- **Replay:** caller allowance 1 -> 1 and shared counter 7 -> 7 across the replay; response `replay: true, candidates: 0`. A replay spends no
  allowance and, because the provider call happens only after the allowance claim, calls no provider (code order: UNIT + LOCAL).
- **Refused attempts still cost allowance** (LIVE): the refused different-image reuse (+1 caller) and the cross-account use of Alice's session
  (+1 Bob) each moved the counters (global 7 -> 9). They are refused before any provider call by the capture check, but that ordering was not
  separately measured, only inferred from the code. See open item O5.

## 2. What real scores look like (why a floor cannot be the whole answer)

| Observation | Score | Source |
|---|---|---|
| Legit dandelion (deck card art photographed) | 0.454 top; 0.221 section | LIVE (runs 2 and 3) |
| Legit dandelion (Commons photos, 3 sizes) | 0.347 -> 0.440 -> 0.545 | DOC |
| Legit plantain | 0.838 -> 0.877 -> 0.886 | DOC |
| Legit yarrow | 0.305 -> 0.273 -> 0.196 | DOC |
| Legit broad-leaved dock (*Rumex obtusifolius*) | 0.616 -> 0.303 across photos | DOC |
| WRONG card, provider misidentified (*Capsella rubella* -> bursa-pastoris) | **0.635 - 0.877** | DOC |
| WRONG card, genus scope (*Solidago caesia*) | 0.065 (a card-scope defect, since curated separately; a floor would not have fixed it) | DOC |
| Blank image guesses | 0.001 - 0.0013 | LIVE |

Consequences:
1. **The existing display bands (0.70 strong / 0.35 moderate / below = "low") must not be reused as the collection floor.** Legitimate yarrow
   (0.196-0.305), dock (0.303) and one dandelion (0.347) sit in the "low" band. Treating `low` as ineligible would deny real finds, exactly the
   concern raised. Those two numbers were "chosen, not measured" (DOC), and this proposal does not move them.
2. **A floor stops noise, not misidentification.** The observed noise (0.001) and the lowest observed legitimate score (0.196) are two orders of
   magnitude apart, so a floor between them removes junk with room on both sides. It does nothing about a confident wrong answer
   (0.635-0.877 for Capsella); that is a provider-quality and presentation question, not a threshold.
3. The sample is small (a handful of species, mostly Commons photos, which are an upper bound on field quality). **Numbers below are provisional
   and ship inert behind a flag until measured on field photographs.**

## 3. Proposed policy (server-authoritative, one decision function)

Separate three things that are currently entangled:
- **Suggestion** (what the identifier says; always shown, unchanged),
- **Display band** (strong / moderate / weak; wording only; unchanged),
- **Collectibility** (may this candidate carry a receipt; new, server-decided, one function).

A candidate earns a receipt only if ALL hold:

| # | Rule | Provisional value | Why |
|---|---|---|---|
| R1 | Basis is one of the five eligible (exact, synonym, acceptedGroup, curatedEquivalent, genusCard) | unchanged | verified synonyms such as *T. campylodes* keep working (LIVE) |
| R2 | **Collection floor on the provider's own score** | `score >= 0.15` for the leading candidate | between observed junk (0.001) and lowest observed legit (0.196); NOT the 0.35 band |
| R3 | A **listed** (non-leading) candidate additionally needs `score >= 0.25` AND `score >= 0.5 x leader` AND rank <= 3 | provisional | a runner-up is "also plausible", never "something that happens to be on the list" |
| R4 | **Ambiguity guard:** if two different cards are both eligible by R1-R3 and the runner-up is within 0.5 x of the leader, issue **no** receipt and ask for another photograph | provisional | lookalike pairs; prefers a retake to a coin-flip reward |
| R5 | Rank above species (section, genus) keeps today's behaviour (`acceptedGroup`/`genusCard` bases), but must also pass R2 | unchanged + R2 | |
| R6 | Per-provider thresholds in ONE table (`identification-confidence.ts` already holds one); a provider with no field data (plant.id) uses a **stricter** default until measured | PlantNet 0.15; plant.id 0.30 until measured | plant.id probabilities are not comparable (DOC: "untuned") |

`species_confidence` on the receipt stays as today (display band) and the receipt additionally records the **score** and a **policy version**
so a later tightening can be audited (open item O2: needs a small additive migration 0017, or can be skipped).

### What the player sees (suggestion is never hidden; reward is gated)
The scan response gains a server-computed `collectible` verdict per candidate with a reason code; the client only renders it.
- `below_floor` -> "This looks too uncertain to collect. Retake the photo closer, in better light, or add up to two more angles." (extra angles
  are optional up to 3; **no claim is made that more photographs raise accuracy**, because the benchmark has not shown that)
- `secondary_not_close` -> suggestion shown, no collect button; "A more likely match is above."
- `ambiguous` -> "Could be X or Y. Add a photo of the leaves/flower to tell them apart." (no receipt for either)
- `not_a_card` -> unchanged (Seed Shelf offer).
Uncertain results remain visible and explained; they just carry no collect action and no XP.

## 4. Affected code paths (nothing edited yet)
- `src/lib/observation-capture-receipt.ts` `receiptItemsFor` + `CaptureCandidate` (add score, provider); coordinator-owned contract.
- Mirrors: `supabase/functions/identify-plant/capture.ts` (scan lane) and `_shared/herbdex/observation-capture-receipt.ts` via `npm run sync:edge-shared`;
  **identify-plant must be redeployed to TEST** (needs approval).
- `src/lib/identification-confidence.ts` (provider table), `plant-match.ts` unchanged.
- Client wording and retake prompts: `src/components/scan/*` and `src/lib/scan-*` (scan lane; Shared Change Request).
- Optional SQL: `issue_capture_receipts` could re-check a floor passed in each item (defence in depth; the only caller is the service-role edge function).
- Docs: receipt contract 3.2, `v1-test-deployment.md`; the live suite gains the cases in section 6.
- Not touched: `claim_discovery`, the enforcement switch, discoveries, XP, leaderboard.

## 5. Expected false-positive / false-negative risk

| Risk | Direction | Estimate with the provisional numbers | Mitigation |
|---|---|---|---|
| Junk image guesses a deck species | false positive | removed when its score is < 0.15; every observed junk score is 0.001 | R2 |
| Provider confidently wrong (Capsella -> bursa-pastoris at 0.635+) | false positive | **unchanged**; no threshold can fix it | presentation of uncertainty; the card's own scope; field measurement |
| Real plant at low provider score (yarrow 0.196, dock 0.303) | false negative | passes R2 (0.15) in every observed case; **a field photo scoring under 0.15 would be refused** | retake prompt; collect floor tuned on field data, not Commons |
| Runner-up legitimately the true species | false negative | R3 refuses a runner-up under 0.25 or under half the leader | lower after measurement; the suggestion is still shown |
| Lookalike pair both plausible | either | R4 refuses both until a clearer photo | retake prompt; accepts a few false negatives to avoid coin-flip rewards |
| Provider changes its score scale | both | shifts every rule at once | per-provider table + policy version + the live suite's score-sensitive cases |

## 6. Test cases (to implement only after approval)
UNIT/LOCAL (pure function, no network):
1. **Blank image**: five tree candidates at 0.001-0.0013, none a card -> zero receipts. (LIVE-confirmed in run 3; unit pin added.)
2. **Blank image, hostile**: same junk scores but names resolve to deck cards -> **zero receipts** (below R2).
3. **Unrelated object**: a single deck-card name at 0.02 -> none; the suggestion still returned with `below_floor`.
4. **Extremely low-confidence exact match**: *Plantago major* 0.012 and *Taraxacum officinale* 0.004 (today they earn receipts) -> none.
5. **Verified synonym**: *Taraxacum campylodes* 0.454 -> receipt `synonym`; the same synonym at 0.10 -> none; at 0.15 -> receipt.
6. **Secondary candidates**: leader non-card 0.60, listed card 0.40 -> receipt; listed card 0.20 -> none (below 0.25); listed card 0.30 with leader 0.90 -> none (under 0.5 x leader); listed at rank 4 -> none.
7. **Legit moderate-confidence plants**: dandelion 0.347 -> receipt; yarrow 0.196 -> receipt; dock 0.303 -> receipt.
8. **Ambiguous species**: two different cards 0.40 and 0.30 -> no receipts, `ambiguous`; 0.60 and 0.10 -> receipt for the first.
9. Section-rank `acceptedGroup` (*T. sect. Taraxacum* 0.22) -> receipt only if no better-ranked candidate already holds the card (one per card, as today) and >= 0.15.
10. Provider table: unknown provider uses the strict default; plant.id threshold differs from PlantNet.
11. Server authority: a client-supplied score or verdict is ignored (the existing "nothing the client sent influences the card" pin).
LIVE (needs approved credits): the dandelion photo still earns its `synonym` receipt; the blank image earns none; one deliberately poor/oblique real plant photo shows `below_floor` with the suggestion visible and a retake prompt.

## 7. Open items for the owner
- O1 Approve the shape (floor + runner-up rule + ambiguity guard) and the provisional numbers, or ask for measurement first (a field-photo run: the DOC says Commons numbers are an upper bound).
- O2 Store `provider_score` and `policy_version` on receipts (additive migration 0017) or not.
- O3 Ambiguity: no receipts (proposed) vs. let the player choose among plausible candidates.
- O4 Rollout: flag, TEST first, redeploy identify-plant to TEST, one approved live run (2 provider calls) to prove the three LIVE cases.
- O5 Whether refused capture attempts should consume allowance (observed LIVE; unrelated to this policy, but visible in the counters).
