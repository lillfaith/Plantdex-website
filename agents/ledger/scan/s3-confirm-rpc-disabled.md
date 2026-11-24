# Task: s3-confirm-rpc-disabled — RPC confirm path, built and inert

- Lane / role: scan
- Branch: `agent/scan/s3-confirm-rpc-disabled` (from `integration`)
- Status: `review`

## Change
`src/lib/scans.ts`, `confirmScan`: when `NEXT_PUBLIC_CONFIRM_SCAN_RPC === 'on'`, call `rpc('confirm_scan')` with the seven parameters first.
- `true` is success. `false` is refusal (other card or not the caller's), never success.
- Any RPC error or thrown failure returns false and logs only the scan id. No fallback.
- Only `PGRST202` or `42883` (function missing) falls through to the existing mitigation.
- Flag unset or anything but `'on'`: the new block is skipped and the old code runs unchanged. I did not set the flag anywhere.

`src/lib/scans-confirm-rpc.test.ts` (17 tests, fake client): flag off (unset, off, preview, ON, empty), exact seven parameters, true, false, null data,
errors 42501 / 23514 / PGRST301 / no code, thrown network error (none fall back), PGRST202 and 42883 fall back, and the fallback still refuses a different card.

## Out of lane (Shared Change Requests)
- `agents/requests/scan-s3-flag-in-next-config.md`: one line in `next.config.ts` so the bundler can strip the branch.
- `agents/requests/scan-s3-live-confirm-scan-cases.md` + `scan-s3-scans-confirm.e2e.test.ts.txt`: the 12 live TEST cases. `e2e/**` is coordinator-owned,
  so they are attached rather than added. Verified from `e2e/` (tsc, eslint, skip without credentials, production ref refused), then moved out. Not run anywhere.

## Untouched
Reducer, XP, progression, migrations, workflows, secrets, production. Migration 0014 was read, not copied.
