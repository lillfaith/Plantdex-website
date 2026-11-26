# One-photo default: tested patches per lane (owner decision 2026-11-26)

Owner: ONE mandatory in-app camera photograph to collect (extra angles optional, up to 3); NO mandatory capture delay (`min_capture_ms` = 0);
duplicate images are FLAGGED for review (cross-account) and never auto-refused; lookups (imported photos) keep the existing two-photo minimum.

The coordinator may not edit lane-owned source, so the change is delivered as two patches written and tested by the coordinator
(local PostgreSQL 16 harness: 93 checks; `D5_RUN_SQL=1` vitest 29 tests; `src/lib/scan-one-photo.test.ts` 4 tests). Apply IN ORDER, each on its own lane branch from `integration`:

1. `discoveries.patch` (discoveries lane): `0016` SQL (min_images 1, min_capture_ms 0, per-account digests, `suspect_duplicate` flag), `0016_verify.sql`
   (+3 checks), the receipt contract and anti-cheat docs, `observation-capture-receipt.ts` constants and code list.
2. `scan.patch` (scan lane), only after (1) is merged (its test imports the constants): `scans.ts` (`MIN_CAPTURE_PHOTOS`), `ScanPanel.tsx`,
   `ObservationPhotos.tsx` (channel-aware minimum), `scan-capture-session.ts` (fallback 0), `scan-one-photo.test.ts`.

`git fetch origin coord/one-photo-patches && git show origin/coord/one-photo-patches:docs/agent-workflow/one-photo/<lane>.patch | git apply --index`,
then run `npm run verify` and, for (1), `D5_RUN_SQL=1 npx vitest run src/lib/observation-capture-receipt.test.ts` and `docs/discoveries/sql/run-local.sh --mutate`.
If a patch does not apply cleanly, resolve by hand to the same behaviour; do not weaken a test. Do not enable any flag or switch.
The coordinator then mirrors the contract to `docs/agent-workflow/discovery-receipt-contract.md` and reconciles `identify-plant` (min 1 image for `purpose=collect`).
