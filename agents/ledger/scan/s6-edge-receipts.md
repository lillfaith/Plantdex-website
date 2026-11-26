# Task: S6 edge half of the discovery receipt contract

- Lane / role: scan
- Branch: `agent/scan/s6-edge-receipts` (from `integration`)
- Priority: A
- Status: review

## Goal
`identify-plant` honours the capture fields S5 already sends (`purpose`, `capture_session_id`, `capture_nonce`) per
`docs/discoveries/discovery-receipt-contract.md` sections 3.2/3.3, so a receipt can exist once the owner deploys 0016 and
the function to TEST. Nothing is enabled: no flag, no enforcement switch, no deploy, no workflow.

## Acceptance criteria
- [x] A request with no purpose is byte-identical to the pre-capture handler (golden strings in `scan-edge-handler.test.ts`).
- [x] Only an explicit `purpose=collect`, signed in, with a session, can yield a receipt; every capture failure is a code, never a failed identification.
- [x] Images are hashed (SHA-256) and never decoded; no EXIF, coordinates or device value is read or stored (source guards).
- [x] Service-role calls live only behind `supabasePort(admin)` in the function; a client cannot call `consume_capture_session` / `issue_capture_receipts` (local PostgreSQL run).
- [x] Local end-to-end on PostgreSQL 16 with 0016: receipt -> claim -> discovery row; replay, foreign receipt, expired, bad nonce, import-only, duplicate image, too fast, anonymous all refused or receipt-less.
- [x] Live e2e written for TEST (attached as a file; `e2e/**` is the coordinator's).
- [ ] Coordinator: mirror the receipt modules into `_shared` and drop the local copy (SCR filed).

## Authorised paths
`supabase/functions/identify-plant/**`, `src/lib/scan-*`, `docs/scan-s6/**`, `agents/requests/**`, `agents/ledger/**`.

## Prohibited
Everything else, in particular migrations, workflows, `e2e/**`, `scripts/sync-edge-shared.mjs`, flags, credentials.

## Contracts read, not changed
`docs/discoveries/discovery-receipt-contract.md`, `docs/discoveries/sql/0016_*.sql`, `src/lib/observation-capture-receipt.ts`.
