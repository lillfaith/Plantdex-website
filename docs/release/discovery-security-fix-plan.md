# Camera-required collecting: security fix plan (PROPOSAL, nothing deployed)

Owner decision (final, 2026-11-28): every NEW collectible card unlock originates from the authorised in-app camera + server receipt flow, for signed-in and signed-out players. Library photos identify only. A manual declaration (Log a Discovery, signed-out local progress, import) never unlocks a card, pays discovery XP or earns Field Board credit. Hiding a button is not the security fix; the database decides.

Nothing in this document is applied. Production is not touched. Migration 0016 and enforcement on production need a separate explicit owner approval.

## 1. Confirmed posture (what is proven, what is not)

| Fact | Status | Evidence |
|---|---|---|
| TEST: `discovery_rules().enforcing = false` | CONFIRMED live, 2026-11-28 | RPC returned `{"enforcing": false, ...}` |
| TEST, enforcement OFF: a signed-in player can create any real card with no receipt, through the app (Log a Discovery) and through a direct PostgREST insert | CONFIRMED live | UI run: celebration, 100 XP, server row, zero capture/identify/claim requests, zero receipts. Direct insert: HTTP 201 |
| TEST: that row feeds the Field Board | CONFIRMED live | `leaderboard_standings` returned 1 discovery / 50 points for the account |
| A made-up card id is refused | CONFIRMED live | `discoveries_valid_herb` check, HTTP 400 |
| Signed-out play unlocks locally with no server involvement | CONFIRMED by code (`DiscoverPanel` -> `discover()` -> local storage) and in Chromium | |
| `decideConfirm` lets unlocks through for `unspecified` channel, signed-out (`local-only`) and `mock` (no receipt, enforcement not on) | CONFIRMED by code | `src/lib/scan-receipt.ts` |
| With enforcement ON the trigger `discoveries_capture_gate_trg` refuses a new card with no claimed receipt and no grandfather row, for every role | By the migration text and the earlier live TEST enforcement-ON window; NOT re-run today | 0016 section 7 |
| PRODUCTION: whether 0016 exists, whether enforcement is ON | **NOT CONFIRMED.** I did not touch production. The repo header says 0016 is "TEST PROJECT ONLY. NOT APPLIED" and not authorised for production | run `docs/release/production-security-posture-check.sql` (read-only, SELECT only) in the production SQL editor, or authorise a read-only dispatch of an equivalent |

Until the production check is run, the safe assumption is: production has no gate, and any signed-in player can insert any card.

## 2. What the fix consists of (three layers, each independent)

### Layer A: the database (the real authorisation). No new migration is required.
Already written and tested on TEST: `0016_discovery_capture_enforcement.sql`. It provides:
- direct unauthorised inserts: `discoveries_capture_gate_trg` (before insert, security definer) raises 42501 `discovery_requires_capture_receipt` unless a claimed receipt or a grandfather row exists; it binds every role including the service role; `learned`/`mastered` refuse a card with no discovery row;
- missing / forged / cross-account receipts: `claim_discovery` returns `receipt_unknown` for both a forged id and another account's id (nothing is learned about other accounts); ids are `rcpt_` + a random uuid;
- expired receipts: a NEW claim after `expires_at` returns `receipt_expired`; a receipt already claimed stays valid evidence;
- reused / duplicate claims: `already_claimed` / `already_held`, idempotent; one receipt row per eligible candidate of an accepted single-use, 10-minute capture session; image digests are single use across accounts;
- ineligible species: only the five eligible bases (`exact`, `synonym`, `acceptedGroup`, `curatedEquivalent`, `genusCard`) can be claimed; `related`, `sameGenus`, `legacyGenus` cannot;
- free-tier limit: `collection_limit_reached` rolls the whole claim back.

Remaining database questions (owner decisions, not coded here):
1. Minimum identification confidence for a receipt (see section 5, blocker B2). Today a 1% hallucinated candidate can earn a receipt.
2. The grandfather cutoff. `set_discovery_enforcement(true, <cutoff>, 'ENFORCE NEW DISCOVERIES')` grandfathers every existing `discoveries` row up to the cutoff. The cutoff is server-controlled (must not be in the future). Recommended: `now()` at the moment of enabling, after the new client is live. Anything self-declared before then is kept (the standing rule is no revocation, no rescoring). Anything inserted after the cutoff without a receipt is refused.
3. Journal credit on the Field Board. `leaderboard_standings` pays 15 points per species with a journal entry, and journal entries are self-declared. Your rule says a manual declaration must not earn leaderboard credit. Changing that is a backend (SQL function) change that needs your explicit approval. Options: (a) pay journal points only for sightings with a photograph that went through the app (`photo_backed_entries`), (b) remove journal points, (c) keep as is and state it. Not changed.

### Layer B: the client tells the truth (branches below, none merged)
| Change | Lane | Branch |
|---|---|---|
| Card page: replace Log a Discovery with a route to Scan; copy says library photos identify but cannot unlock; refusal notice component | ui | `ui/scan-route-no-manual` |
| `decideConfirm`: remove `unrestricted`, `local-only`, `mock`; a new card needs `collect` channel + signed in + server receipt + successful claim; Seed Shelf claim no longer calls `discover()` | scan | `agent/scan/camera-only-collect` |
| Local import never sends discoveries/learned/mastered/research; per-record isolation; `leftOnDevice` counts; grandfathering policy doc | discoveries | `agent/discoveries/import-untrusted` |
| Roll back optimistic state when the server refuses a write; one refused row never blocks others; permanent refusals are not retried; `lastRefusal` for the UI | coordinator | `coord/discovery-rollback` |
| Daily Field Research board scoped per account (signed-out has its own scope; legacy key never handed to an account) | quests | `agent/quests/research-board-scope` |

Signed-out consequence (owner-visible): a signed-out player can still browse cards, scan, and identify, but cannot collect. Collecting needs an account and the in-app camera. Existing local-only progress stays on the device and is never imported.

### Layer C: Field Research server trust (proposal only, no change made)
`herbdex-action` takes `dailyTaskIds` from the client as proof of "offered". The server re-verifies qualification from its own reads, and each daily pays once per account (primary key), but nothing proves the task was offered. Minimum reliable validation without a migration: recompute the deterministic `pickDailyTasks` candidate set on the server and accept an id only if it was pickable on a UTC day within the last N days; cap dailies paid per UTC day to the board size by counting today's `daily:` completions. The alternative is a `daily_offers` table (needs a migration). Details: `docs/release/research-daily-server-validation-proposal.md` (quests agent). Needs your approval to implement because it changes the deployed edge function.

## 3. Deployment plan (every step needs your explicit approval; nothing runs without it)

Order matters because the old client and the new database must never meet in a bad combination.
1. Merge and deploy the new client with the SECURITY CHANGES first (flags: `NEXT_PUBLIC_CAMERA_CAPTURE`, `NEXT_PUBLIC_SCAN_CONSENT`, `NEXT_PUBLIC_CONFIRM_SCAN_RPC` on). With enforcement still OFF this changes only what the UI offers.
2. Read-only production audit (section 1 SQL). If 0016 is absent, apply 0014 and 0016 to production through the reviewed `run-migration` workflow, verify with `0016_verify.sql`, confirm the switch reads OFF.
3. Deploy the edge functions (`identify-plant`, `herbdex-action`, `seed-packet`, `delete-account`) from the same commit with `check:edge` green; verify with the read-only checks.
4. Shadow period: enforcement OFF, measure receipts issued/claimed and any refused client writes in logs.
5. Enable: `select public.set_discovery_enforcement(true, now(), 'ENFORCE NEW DISCOVERIES');` then verify `discovery_rules()->>'enforcing' = 'true'`, one real camera collection, one refused direct insert.
6. Announce in the app copy that collecting requires the in-app camera (no scarcity or verification claims).

## 4. Rollback plan
- Instant, data-preserving: `select public.set_discovery_enforcement(false, null, 'x');` (revokes nothing).
- Structural: `docs/discoveries/sql/0016_rollback.sql` drops triggers/functions only; tables and player rows stay.
- Client: redeploy the previous static build (GitHub Pages); the server gate being ON with an old client only means old-client manual discoveries are refused, never data loss.
- Grandfather rows are additive and never deleted.

## 5. TEST validation matrix (authorised window, enforcement ON, auto-OFF afterwards; at most 2 provider calls)
Run via the documented isolated window (`docs/release/v1-enforcement-on-test-plan.md`). Each row PASS/FAIL with evidence:
1. Camera capture + receipt claim succeeds (1 provider call; the claim path).
2. Manual declaration through the app cannot unlock (UI has no path; direct insert refused 42501).
3. Direct insert with no receipt refused, including a service-role statement.
4. Signed-out local progress cannot reach the server (import never sends it); signed-in account stays clean.
5. Existing grandfathered discoveries remain loadable and re-insertable.
6. Forged, expired, replayed and cross-account receipts refused.
7. A refused write leaves no fake XP or achievements (client rollback), mixed batches still land the valid rows.
8. Two accounts on one browser see only their own daily tasks.
9. Genuine XP and Field Board progress for a claimed card still work.
10. Baseline restored: `enforcing = false`, residue counts zero.

## 6. Remaining blockers before enforcement can go live
- B1. Production posture unconfirmed (section 1).
- B2. Minimum confidence / non-leading candidate decision for receipts (`v1-pre-enforcement-findings.md` section 2). Changes the card-awarding path; needs a design review and a paid live proof.
- B3. Grandfather cutoff and legacy-import policy approved (`docs/release/import-and-grandfathering-policy.md`).
- B4. Journal points decision (section 2, item 3).
- B5. The five client branches merged and deployed first, with flags on.
- B6. TEST enforcement-ON validation matrix passed.
- B7. iPhone rehearsal of the real capture flow (camera, consent, backgrounding).
- B8. Server-side daily task validation decision (Layer C).
- B9. Safari session-reload fix (already a required prelaunch item).
