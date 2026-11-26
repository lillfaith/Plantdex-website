# Shared Change Request: call the shadow classifier after a scan (flag-gated) - DRAFT, NOT APPLIED

- From lane: discoveries      Task: agents/ledger/discoveries/trust-design.md
- Needs: contract (scan UI call site) | config (`next.config.ts` build flag)
- **To: scan lane** for the call site (`src/components/scan/**`, `src/lib/scans*`) and **coordinator** for the flag (`next.config.ts`, `.env.example`). Stage 3. Depends on `discoveries-receipt-contract.md`. **Off by default. Revised 2026-11-24 (D0-D7).**

## Why
`classifyQualification()` (`src/lib/observation-qualification.ts`, built in PR #40) answers "would this discovery have qualified"
as a pure function. Nothing calls it. Shadow testing (Stage 3) needs exactly one call after a scan is confirmed, so the owner
can see the reason histogram before any rule exists. It changes no behaviour and shows the player nothing.

## Exact proposal
1. **`next.config.ts`**: `env: { NEXT_PUBLIC_DISCOVERY_SHADOW: process.env.NEXT_PUBLIC_DISCOVERY_SHADOW ?? 'off' }`. Only the exact string
   `on` enables it (`qualificationShadowEnabled`). With `off` the bundler drops the branch below.
2. **`ScanPanel.confirmCandidate`** (Scan lane), after the existing three writes and never before or instead of them:
   ```ts
   if (qualificationShadowEnabled(process.env.NEXT_PUBLIC_DISCOVERY_SHADOW)) {
     const verdict = classifyQualification({
       channel: 'collect',            // the Collect entry point; a lookup path passes 'lookup'
       signedIn,
       match: chosen.match,           // the CHOSEN candidate, never the leading one
       rankPosition: chosenIsLeading ? 'top' : 'listed',
       alreadyHeld: heldBefore,       // read BEFORE discover() ran
     });
     void reportShadow(verdict);      // aggregate-only; failures swallowed
   }
   ```
3. **`reportShadow`** sends `reason` and `matchClass` only (no user, card, taxon, score or photograph) to the counter in
   `discoveries-receipt-accept.md` item 4. It is detached and caught: telemetry that fails is a missing count, never an error
   somebody standing in front of a plant is shown. No `track()` second parameter is added.
4. **No UI.** The verdict is never rendered. No string, class or attribute changes with the flag on or off.

## Who else depends on it
`discoveries-receipt-accept.md` (the counter). `scan-reward.test.ts` and `launch-loop.test.ts` must pass unchanged.

## Risk and rollback
A throw here must not affect the confirm: the call is inside a try/catch and runs after the writes. Rollback: set the flag to `off`
(or leave it unset); delete the branch. No stored value is read or written by the classifier.

## Does this need the owner? (coordinator fills in)
D7 permits minimal aggregate diagnostics during shadow testing. Enabling the flag on a real project is the owner's call.
