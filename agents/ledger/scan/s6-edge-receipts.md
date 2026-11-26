# Task: s6-edge-receipts - identify-plant issues capture receipts (edge half of the receipt contract)

- Lane / role: scan
- Branch: `agent/scan/s6-edge-receipts` (from `integration`)
- Status: `review`
- Decisions: owner FINAL DECISION (V1): only an eligible in-app camera capture earns NEW cards; imported/manual/self-reported cannot; a capture is never claimed to prove an outdoor sighting; server-authoritative; nothing enabled, TEST only.

## Change
- New `supabase/functions/identify-plant/capture.ts` (zero imports: parse, hash, consume, issue, response additions).
- Edited `supabase/functions/identify-plant/index.ts`: accepts `purpose`, `capture_session_id`, `capture_nonce`; SHA-256 per image part; `consume_capture_session` before the provider call; `issue_capture_receipts` after the unchanged provider call and matcher; `captureReceipt` per eligible candidate and `capture{accepted, code}`; replay path; capture failures are codes, never failed identifications.
- Tests: `src/lib/scan-capture-edge.test.ts` (unit + the real handler with a faked client; includes the no-purpose-unchanged pin), `src/lib/scan-capture-local-pg.test.ts` (skipped unless `S6_LOCAL_PG=1`; real PostgreSQL 16 + the real handler).
- Evidence: `docs/scan-s6/` (README, `run-local-e2e.sh`).

## Out of lane (requests)
`agents/requests/scan-s6-*.md`: the live e2e file (`e2e/**`), its workflow, the quota refund, the burned-session-on-provider-failure case, and the optional `_shared` sync of the receipt mirror.

## Untouched
XP, reducer, progression, schema, migrations, workflows, secrets, `_shared` coordinator files, `sync-edge-shared`, the client, every flag. No credential used or requested.
