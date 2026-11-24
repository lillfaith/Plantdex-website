# Task: test-fake-confirm-scan

- Lane / role: discoveries
- Branch: `agent/discoveries/test-fake-confirm-scan` (from `integration`)
- Status: `review`

## Goal
Make `fakeSupabase()` in `src/lib/observation-persistence.test.ts` support the delete chain
`confirmScan` uses on the scan lane's PR #41 (`.delete().eq().eq().is().select('id')`), per the Shared
Change Request `agents/requests/scan-s1-observation-persistence-fake.md`. Test-only; no assertion or
production file changed.

## Runs (`npx vitest run src/lib/observation-persistence.test.ts`)
- Current integration `scans.ts`: 1 file, 24 tests passed.
- `src/lib/scans.ts` temporarily replaced by `origin/agent/scan/s1-first-slice`: 1 file, 24 tests passed.
  Restored with `git checkout -- src/lib/scans.ts`; it is not in the diff.

## Verify output
See the PR description.
