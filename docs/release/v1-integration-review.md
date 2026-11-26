# V1 integration review: D5 (#78), S5 (#77), V1-QA (#76), Q4 (#74), P4 (#72)

Coordinator, 2026-11-26. Method: I read the code and SQL, checked CI logs, merged S5 + D5 + V1-QA together on `coord/v1-integration` (no conflicts), and ran the whole suite on the result. I did **not** run anything against Supabase (no credentials, none requested).

## Verdict
D5 and S5 are well-built and inert (every switch OFF). **They do not yet form a working server-authoritative collection flow**, because one piece nobody owns-in-practice is missing: `identify-plant` does not yet consume the capture session or issue receipts. S5 already sends the three fields; the deployed function ignores them. So today: enforcement OFF = nothing changes; enforcement ON = nobody could collect. It must stay OFF until the edge half exists and is proven on TEST.

## D5 / migration 0016 (reviewed in `/docs/discoveries/sql`)
Sound:
- RLS on every new table; `revoke all ... from public, anon, authenticated`; read-only own-row policies on receipts and grandfather rows; no insert/update/delete policy or grant on any `capture_*` table.
- Every SECURITY DEFINER function pins `search_path = ''`; the two that create trust (`consume_capture_session`, `issue_capture_receipts`) and the switch setter are `service_role` only; `claim_discovery`, `open_capture_session`, `discovery_rules` are `authenticated` only.
- Gate triggers bind every role (service role included) on `discoveries`; `learned`/`mastered` require a discovery row. `recorded_at` is stamped from the server clock, so an import cannot back-date.
- Replay: single-use session, nonce stored as a digest, image digests, receipt claimed once (`for update`), a forged and a foreign receipt id answer identically.
- Grandfathering: every existing `discoveries` row is recorded at apply time; at enable, rows up to an owner-chosen cutoff (not in the future) are grandfathered, so pre-stuffing between announcement and switch is not rewarded. Nothing is revoked or rescored.
- Rollback keeps tables and rows; apply, re-apply, rollback, re-apply is claimed in a real PostgreSQL 16 harness with a mutation run. CI green.
Findings:
1. **(Blocker to enabling) Server half missing.** `identify-plant` must accept `purpose`, `capture_session_id`, `capture_nonce`, hash each image, call `consume_capture_session`, then `issue_capture_receipts`, and return `captureReceipt`. S6 (below).
2. **What this does and does not stop.** It closes F-03, the casual hole: a signed-in user inserting any catalogue id straight into `discoveries`/`learned` through the public API, which the Field Board pays 50 for. It does **not** stop a determined user who opens a capture session and feeds arbitrary images to `identify-plant` (a photo of a screen is the same). Nothing may claim otherwise; copy says "captured in the app".
3. **Write order (resolved here).** `learned` could land before `discoveries`; the adapter now writes discoveries first (`remote-herbdex-storage.ts`, with `remote-herbdex-storage-order.test.ts`, which fails without the change).
4. **Local import.** With enforcement ON a signed-out player's local collection cannot be imported as new cards (the database refuses). Owner decision: grandfather local collections at import time (cannot be proven) or let imported cards stay local.
5. **Ship together.** `capture_sessions`, `capture_receipts`, `capture_image_digests`, `discovery_grandfathered` must be added to export and deletion (`USER_TABLES`) in the same release that applies 0016; I have NOT added them now, because an edge function naming a table that does not yet exist would break export. Tracked on the promotion gate.
6. Placement: 0016 stays under `docs/discoveries/sql/` until 0014 (#43, already on TEST) and a safe 0015 are in `supabase/migrations/`, to avoid a numbering gap. For TEST it is applied from a branch by the owner.

## S5 / consent and camera (#77)
Sound: flags off; library photos can only look up (confirm path removed); a mixed observation is a lookup; stream released on every exit; claim goes before the ordinary `discover()`; copy never claims outdoor proof; 24 browser checks and unit tests green.
Findings:
1. **Consent flag defaults OFF.** Owner requires consent for BOTH scanner and camera. S5 enforces it inside `identifyPlant`, so no caller can bypass the notice; but with `NEXT_PUBLIC_SCAN_CONSENT` off nothing is shown. **Recommendation: ship consent ON for V1 regardless of the camera pilot** (default stays `'off'` in committed config until you approve; the literal line is now in `next.config.ts` and pinned by the guard test).
2. Real-backend test missing: the signed-in path ran against a fake server inside the script, not TEST. Needs 0016 + the edge half on TEST, then a run.
3. `/privacy` wording is Tier 0 (yours); proposed text is in `agents/requests/scan-s5-privacy-page-copy.md`.

## V1-QA (#76)
Both fixes are correct and small. F-01: `reconcile` awaits in-flight saves (test fails without it). F-02: an unreadable local save is copied aside, never overwritten. CI had failed only on ownership coverage of three new test files; fixed (`agents/ownership.json`). F-03 (direct-API discovery) and F-08 (consent) are the launch blockers it names; both are addressed above. Signed-in persistence against a real project is still unverified.

## Q4 (#74)
CI had failed only because the screenshots sat in a coordinator-owned folder (my brief's mistake); moved to `docs/quests-q4/`, guard clean. Objective matches your approval (one plant from each of Georgia's five habitat groups; wetland sized from real supply). No XP; completion mark only. Signed-in: progress is derived from synced discoveries, the completion date is device-local (server record is an SCR, off). The UI is a plain placeholder; the Poster Carousel direction is the separate preview on `ui/palette-sample-habitats`.

## P4 (#72)
Not a V1 item. One cross-lane note: it edits `src/lib/leaderboard.ts` so expansion discoveries score nothing, which agrees with your decision.

## Field Board
Do not enable competitive scoring until 0016 is applied and enforcing. Until then F-03 stands.

## TEST demonstration: what is real
| Step | Against real TEST backend today |
|---|---|
| Camera, identify (provider), review | Camera and review: browser only. Identify needs the deployed function and provider keys: not exercised by agents |
| Open session / receipt / claim | MOCK (needs 0016 + edge half on TEST) |
| Confirm (`confirm_scan` 0014) | REAL on TEST (14/14 earlier); client flag OFF |
| Discover, collect, reveal, XP, garden | Local/derived: works; signed-in sync REAL only after you dispatch a run |
| Georgia quest | Derived from discoveries; completion date device-local |
