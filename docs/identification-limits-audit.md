# Identification daily limits: audit of every place that states or enforces one

Audited on the development branch against the **deployed** state. No production change was made.

| Place | Anonymous | Signed in | Global | Notes |
| --- | --- | --- | --- | --- |
| **Deployed `identify-plant` (what players hit today)** | 5 | 30 | 450 | not redeployed since the limits changed in source |
| `supabase/functions/identify-plant/index.ts` (source) | 10 | 10 | 450 | `ANON_DAILY_LIMIT`, `USER_DAILY_LIMIT`, `GLOBAL_DAILY_LIMIT` |
| `src/lib/scan-allowance.ts` (page counter) | 10 | 10 | n/a | compared with the source by `scan-allowance.test.ts` |
| **Deployed website (commit `8eca58e`)** | shows 10 | shows 10 | n/a | already live |
| `docs/identification-benchmark.md`, `docs/field-validation-phase-1.md` | 5 | 30 | 450 | accurate for the deployed function, stale for the source |
| `scripts/identify_web_images.py`, `scripts/verify_pilot_gate.py`, `.github/workflows/field-realism.yml` | 5 | 30 | 450 | planning arithmetic for validation runs; nothing safety-critical |
| Page copy ("higher daily limit") in `ScanPanel.tsx` | n/a | n/a | n/a | was false once both limits matched; **fixed on the development branch** |

## Discrepancies

1. **Live now: the page and the server disagree.** The deployed website tells every player "of 10". The deployed
   function allows 5 to a signed-out player and 30 to a signed-in one. A signed-out player is stopped after 5
   with the function's own message, and a signed-in player sees "10 left" while 30 are allowed. Nothing breaks
   and no limit is exceeded, but the counter is wrong until one side moves.
   Ways to close it, each needing your approval: deploy the function (then the server says 10 / 10), or ship a
   frontend that mirrors 5 / 30.
2. **Deploying the function lowers an existing limit.** Signed-in players currently get 30 a day; the source gives
   them 10. That is the product decision you asked for, but it is a reduction for existing accounts, so confirm it.
3. **Anonymous 5 to 10 doubles anonymous exposure to the shared budget.** `GLOBAL_DAILY_LIMIT` (450) is unchanged,
   so 45 devices at 10 scans can use the whole day's allowance. A busy launch day could therefore refuse everyone.
4. **Two lines of page copy described a higher signed-in limit that no longer exists.** Fixed in this commit:
   they now say signing in keeps your scan history.
5. **Validation scripts and docs still assume 5 and 30.** They are accurate for the currently deployed function
   and become stale when it is redeployed. They only affect how long benchmark runs take.
6. **The server counts a day in UTC; the page says so ("midnight UTC").** Consistent.

## What was not changed

No production setting, secret, migration or function. The source limit stays at 10 / 10 on the development branch.
