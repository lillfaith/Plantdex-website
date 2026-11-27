# Before enforcement: what live run 2 proved, and what it did not

Run: https://github.com/lillfaith/Plantdex-website/actions/runs/45942457055 (TEST `vgjehmwcpavflbfhbbrp`, enforcement OFF, 2 provider calls).
Evidence is labelled **LIVE** (observed in that run), **LOCAL** (executed by the coordinator against the repository's own code or a local
Postgres, not the deployed project) or **UNIT** (an existing automated test with fakes). Nothing here is production.

## 1. Why `Taraxacum campylodes` unlocked `Taraxacum officinale`  (LIVE + LOCAL)

- LIVE: PlantNet's top answer was `Taraxacum campylodes` (0.454); that candidate carried the receipt (`rankPosition: top`); the claim
  returned `herb_id: taraxacum-officinale`.
- LOCAL (the real `matchScientificName`): `Taraxacum campylodes` -> `kind: exact`, **`eligibility: synonym`**, rank `species`.
  The rule is the checked-name table `ACCEPTED_NAME_SYNONYMS` in `src/lib/plant-match.ts`: *"POWO treats Taraxacum campylodes
  G.E.Haglund as a synonym of T. officinale"* (IPNI 252973-1). `synonym` is one of the five receipt-eligible bases.
- It is **not** the genus rule. The other four candidates resolved as: `Taraxacum sect. Taraxacum` -> `acceptedGroup` (eligible, but
  one receipt per card per observation, so it got none: `hasReceipt: false`); `T. pubescens`, `T. erythrospermum`, `T. mattmarkense` ->
  `sameGenus` / `related` (never eligible).

## 2. Do blank-image candidates earn receipts?  (NOT PROVEN LIVE; a gap found)

- LIVE: a flat grey 640px image returned HTTP 200 with **5 candidates**. The provider does not say "not a plant". The test proved no
  discovery was written and that receipts issued equalled candidates carrying one, but it did **not record how many that was**
  (now recorded as `candidatesWithReceipt`; the accounts and rows were deleted by cleanup, so run 2 cannot answer it).
- LOCAL: `receiptItemsFor` issues a receipt to **any** candidate whose own match is confirmable and eligible, **whatever its score**.
  Executed: `Plantago major` at 0.012 and `Taraxacum officinale` at 0.004 both produce receipts with `species_confidence: "low"`.
  The SQL accepts `low`, and `claim_discovery` does not look at confidence. So a photograph the provider hallucinates a deck species
  onto, even at 1%, can be claimed.
- **Finding / decision for the owner before enforcement:** require a minimum `species_confidence` (e.g. at least `moderate`) for a
  receipt, and decide whether a `listed` (non-leading) candidate may earn one. This changes the card-awarding path (coordinator-owned,
  needs the reward-validation design review already required). Not implemented. A paid live run is needed to prove the fix against
  the real provider's answer for a blank image.

## 3. Replay protection at the provider-call level  (UNIT + code reading; live evidence partial)

- Code: in `identify-plant/index.ts` the replay check (`checkReplay`) runs **before** `claim_scan_pair` and before the provider
  call, and returns `{candidates: [], capture: {accepted: true, replay: true, receipts}}`. So a replay spends no allowance and calls no
  provider. UNIT: `scan-edge-handler.test.ts` "a replay ... calls no provider and spends no quota".
- LIVE: the replayed request was accepted and created no new receipt rows. It did **not** measure the scan allowance or the provider
  call count. A provider call cannot be observed from outside the function; the observable proxy is `scan_quota.count` for the
  caller's bucket, which a privileged read can take before and after the replay.
- Needs one more paid run (2 provider calls) to turn this into LIVE evidence: add quota reads (before first identify, after it, after
  the replay, after the blank image) to the suite. Not run; needs your approval.

## 4. Not proven live, stated plainly

- Provider outage handling (session handed back, allowance refunded): UNIT and local database only.
- Enforcement ON: not exercised live. Plan: `v1-enforcement-on-test-plan.md`.
- `SPECIES_ATTESTATION_SECRET`: unverifiable with the current token (HTTP 403 on the secrets endpoint); not used by the collect path.
- Goldenrod (`legacyGenus`) earns no receipt, so it could not be newly unlocked by camera once enforcement is on.
