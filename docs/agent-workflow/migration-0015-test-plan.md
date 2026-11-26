# Migration 0015 (expansion ids in the four card-id tables): review notes, test evidence, rollback

**Status: owner-approved for the TEST project ONLY (2026-11-26). NOT APPLIED by this branch. PRODUCTION IS NOT AUTHORISED.**
The exact apply and verification procedure is `docs/agent-workflow/migration-0015-test-apply.md`; this file is the review evidence behind it.

## What it is
`supabase/migrations/0015_expansion_catalogue_ids.sql` adds `is_expansion_herb()` (the 85 ids of #57-141, in card-number order) and
`is_permitted_herb()` (`is_catalogue_herb(p) or is_expansion_herb(p)`) and re-points the four id-bearing CHECK constraints (`discoveries`,
`learned`, `mastered`, `sightings`) from `is_catalogue_herb` to `is_permitted_herb`, each again `NOT VALID`. Nothing else.

**Why the first draft was withdrawn.** It replaced `is_catalogue_herb` with 139 ids. That function also feeds `leaderboard_standings()` and the
daily-task rule, so every expansion discovery would have scored 50 Field Board points. Owner decision 6 (no board score until separately
approved) forbids that, and a flag cannot undo it, because the scoring is in SQL. `is_catalogue_herb` is now untouched: byte-identical to 0013,
same 54 ids in the same order, same signature, same attributes.

The ids are not typed here: `src/lib/expansion-ids-schema.test.ts` requires every added id to come from the audit inventory
(`docs/expansion/audit/inventory.csv`), in card-number order, equal to the lowercase hyphenated scientific name.

## Required properties, and what pins each
| Property | Evidence |
|---|---|
| a. Existing records intact | Constraints stay `NOT VALID`, so nothing is scanned or rewritten. The migration contains no DML. Verification script reads row counts and checks no pre-existing row holds a refused id; its own fixture rows are rolled back. Local run: zero rows before and after. |
| b. 0013 compatibility | `is_catalogue_herb` not redefined (test); first 54 ids identical and in order, same signature (test, and verification check). `is_scoring_task`, `is_research_task`, `is_achievement`, `leaderboard_standings` not redefined (test). |
| c. No new scoring or unlock behaviour | The standings filters all call `is_catalogue_herb` (test); no migration other than 0015, no edge function and no `src/lib` module names the new functions or an expansion id (test); 0015's code contains no points/XP/task/achievement/unlock vocabulary (test). Verification script: a participant with one printed and one expansion discovery, plus learned, mastered and a qualifying sighting for the expansion id, scores **exactly 50** through the real `leaderboard_standings`. |
| d. Rollback tested | `migration-0015-rollback.sql`: one `DO` block that counts rows beyond the 54 in the four tables and raises before changing anything if any exist; no DELETE/UPDATE/INSERT (test). |
| e. Unpublished card inaccessible | `src/lib/expansion-gate.test.ts`: catalogue, card route, scan matcher, Seed Shelf, research supply and standing tasks, knowledge-check pool, garden and profile strip, XP, with the flag off. |

## Local evidence (throwaway PostgreSQL 16, minimal shim, migrations 0001-0013, deleted afterwards; a review aid, not an application to a project)
| Step | Result |
|---|---|
| Control: verification script BEFORE 0015 | Errors at the first new-function check (`is_expansion_herb` does not exist), as it should. |
| Apply 0015, apply again | Both silent: idempotent. |
| Verification script | `RESULT ALL PASSED`, 21 PASS and 2 INFO, no FAIL. Fixture rows rolled back: 0 users, 0 discoveries, 0 sightings, 0 participants afterwards. |
| **Mutation: widen `is_catalogue_herb` to include an expansion id (the withdrawn first-draft shape)** | Verification reports 5 FAIL, including `is_catalogue_herb accepts 1 expansion ids; scoring would count them` and `standings moved by 115 points (expected 50)`. The script can see the failure this design exists to prevent. |
| Rollback with no new-id rows | Constraints back on `is_catalogue_herb`, both new functions dropped, `NOT VALID` kept. |
| **Re-apply, insert a real `rudbeckia-hirta` discovery, run rollback** | `ROLLBACK REFUSED ... discoveries_beyond_54=1. Nothing was changed.` Constraint still `is_permitted_herb`, row still present. |

Not covered: PostgREST, real two-session concurrency, the live leaderboard suite, the edge bundle, the TEST project itself.

## Findings worth the reviewer's time
1. **A permitted id is an id any signed-in client can record by hand on TEST.** It scores 0 and pays 0, but it writes a row that belongs to the
   player. Before this goes anywhere real, `is_expansion_herb` must be trimmed to the released batch (the schema test accepts any in-order subset
   for the `ADDED` ordering check; the "approved TEST batch is all 85" test would be updated in the same commit).
2. **The new functions are executable by `anon` through PostgREST**, like `is_catalogue_herb` under 0013, and for the same reason `authenticated`
   must keep it (CHECK constraints run as the inserting role). The verification script prints this as INFO rather than judging it.
3. **Applying this alone is inert.** Nothing writes a new id until a catalogue gate in the app is on, and the flag that would switch it is off by
   default in `next.config.ts` and set by no workflow (test).
4. The constraint swap takes a brief lock on each of the four tables. It is `NOT VALID`, so there is no table scan.
