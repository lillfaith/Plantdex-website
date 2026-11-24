# Task: s2-outcome-logic — scan results can no longer say more (or less) than the identifier did

- Lane / role: scan
- Branch: `agent/scan/s2-outcome-logic` (from `integration`)
- Priority: A
- Status: `review`

## Defects found (evidence is in the code)
`identifyPlant` (src/lib/scans.ts) mapped the edge function's answer onto a `ScanResult`:
1. **A malformed success read as "no card".** `data ?? {}` turned a null body, an `{error}` body or a
   non-list `candidates` into `candidates: []`, and `outcomeFor([])` is `noMatch`, which the screen words
   as "Not one of the 45 cards". The identifier never said that.
2. **`notAPlant` and `providerFoundNothing` were dropped.** `identify-plant` returns both
   (index.ts ~629/638), nothing on the client read them, so "this is not a plant" and "nothing found" were
   indistinguishable from an ordinary empty result.
3. **Unusable suggestions were passed on.** A candidate with no name, or a non-finite score, went to the
   matcher and the confidence bands (every comparison false, so it rendered as a weak match).

## Change (src/lib/scans.ts only)
- No `candidates` array => `{kind:'error'}`. Suggestions present but none readable => `{kind:'error'}`.
- Unreadable entries dropped when others are fine.
- `ScanResult` gains optional `notAPlant` / `providerFoundNothing`, set only on an explicit `=== true`.
- No outcome rule changed: `outcomeFor` is untouched, so `noMatch` for these still holds; the flags are
  extra information for the UI.

## Tests (src/lib/scans-identify.test.ts, 9)
Against origin/integration's `scans.ts`: 7 failed (null body, error body, non-list candidates, all
unreadable, some unreadable, notAPlant carried, providerFoundNothing carried) and 2 passed (controls:
non-boolean flag ignored, genuine empty list still a result). With the fix: 9 passed.

## Requests filed
`agents/requests/scan-s2-not-a-plant-wording.md` — ScanPanel still words `notAPlant` as an ordinary no-match.

## Untouched
XP, reducer, types, schema, migrations, workflows, secrets, location, the `confirm_scan` RPC (not called),
supabase/**, ScanPanel and every visual surface. No mirrored module changed, so no sync:edge-shared.

## Remaining risks
- Until the UI request lands the screen still shows today's wording for `notAPlant`.
- The strict shape check could turn a future server field rename into an error screen instead of a silent
  empty result; that is the intent, but a server-side shape change now needs this file in step.
- `ScanCandidate` objects still spread the raw server fields; no new field validation beyond name and score.

## Verify output
`npm run verify`: exit 0 — 134 files, 2135 tests passed (lint, typecheck, check:edge, test, build).
agent-guard diff --role scan: "changed only files it may change."
