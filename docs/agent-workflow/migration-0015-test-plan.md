# Migration 0015 (`is_catalogue_herb`: expansion ids): review notes, TEST-only apply plan, rollback

**Status: DRAFT. NOT APPLIED ANYWHERE.** Nothing here is authorised by approval of the design document. Applying a migration to any
database needs the owner's explicit approval of THIS change. Production is out of scope of this document and is not planned in it.

## What it is
`supabase/migrations/0015_expansion_catalogue_ids.sql` replaces one function, `public.is_catalogue_herb(text)`, with the same 54 ids
migration 0013 lists (45 printed + 9 Field Cards), in the same order, followed by the 85 digital-only Herbdex Expansion ids (#57-141)
in card-number order. It is the only thing on the database side that refuses a new card id: 0013's five `NOT VALID` CHECK constraints
(`discoveries`, `learned`, `mastered`, `sightings`, and the daily-task rule inside `is_research_task`) call it by name, and
`leaderboard_standings()` counts only ids it accepts. No constraint, table, policy, grant or row is touched.

The id list is not typed here: `src/lib/expansion-ids-schema.test.ts` requires every added id to come from the audit inventory
(`docs/expansion/audit/inventory.csv`), in card-number order, equal to the lowercase hyphenated scientific name, with 0013's 54 as an
untouched prefix. It also fails if `CATALOGUE` ever holds an id the file would refuse, and if any other migration redefines the function.

## What was checked, and how
The file, the rollback and the verification script were run against a **throwaway local PostgreSQL 16 cluster** that was created for the
purpose, held no project data and was deleted afterwards (minimal `auth`/`storage` shim; migrations 0001-0013 applied verbatim). This is
a review aid, not an application to a project database.

| Step | Result |
|---|---|
| Control: verification script BEFORE 0015 | 4 FAIL, exactly the expansion checks (0 of 85 ids accepted; daily id for a new card refused; new-id discovery and sighting refused by the real constraints). Everything else PASS. |
| Apply 0015, verify | ALL PASSED (17 checks). Applying it twice changes nothing. |
| Real row + real standings | A participant holding `taraxacum-officinale` and `eupatorium-perfoliatum`: 100 points / 2 discoveries with 0015. |
| Rollback, verify | Back to the control result (4 FAIL), which is the point of a rollback. |
| **Rollback with a new-id row present** | The row stays, stops scoring, and the same participant drops from 100 to 50 points. This is why the rollback script runs a pre-check first and says to stop on any non-zero count. |
| Self-rolling-back | After the verification the fixture tables held 0 users, 0 discoveries, 0 sightings. |

Not covered by any of the above, and stated so: PostgREST itself, real two-session concurrency, the live leaderboard suite, and the edge
bundle (deployed separately, below).

## Findings worth the reviewer's time
1. **A listed id is an id any signed-in client can record.** Discoveries are plain RLS-scoped upserts from the browser; the only gate is
   this function. So listing an id the app does not yet serve (a HELD card, for example the pilot's #57 whose safety review is unresolved)
   would let a hand-written request record it and score 50 board points. The migration header therefore says to apply **only the released
   batch**: delete the unreleased ids from block 2 before applying, and trim `expansion_ids` in the verification script to match. The schema
   test accepts any in-order subset for exactly this reason.
2. **The function is executable by `anon` over PostgREST** (0013 revoked the sibling functions' grants but not this one's, and
   `authenticated` must keep it because CHECK constraints run as the inserting role). Whatever it lists is therefore probeable. The
   verification script reports this as INFO rather than judging it; it is 0013's posture and 0015 does not change it. A reviewer may prefer to
   revoke from `anon` alone, which would be a separate decision.
3. **Applying this alone is inert.** Nothing writes a new id until the catalogue gate in the app is on, so the migration cannot be the step
   that changes a player's experience. The order below keeps it that way.

## TEST-only apply plan (needs the owner's go-ahead; nothing else is touched)
Preconditions: the design PR reviewed; owner approval of this migration recorded in that PR; the TEST project is `vgjehmwcpavflbfhbbrp`; the
workflow's access token is limited to that project; the released batch is decided and the file trimmed to it.
1. The owner dispatches **Run a Supabase migration** (`run-migration.yml`) from this branch, project **test**, migration
   `0015_expansion_catalogue_ids.sql`. Coordinators and agents do not dispatch workflows.
2. In the TEST project's SQL editor, paste `docs/agent-workflow/migration-0015-test-verification.sql` (trimmed to the same batch). It runs in
   one `DO` block that ends by raising an exception, so it leaves no rows; the exception text is the report. Expect `RESULT ALL PASSED`.
   Return the text to the coordinator.
3. Only after 1-2 pass: ask the owner whether to sync and deploy the edge bundle to TEST
   (`npm run sync:edge-shared`, then `herbdex-action` through its workflow), and whether to run the live suites there. The catalogue gate in
   the app is a later, separate decision and is not part of this plan.

## Rollback (TEST)
`docs/agent-workflow/migration-0015-rollback.sql`, one paste in the TEST SQL editor: a pre-check (four counts, all must be 0), the 0013 body
restored, and a confirmation (54 accepted, 0 expansion ids accepted). **Do not run step 2 if any count is non-zero**: those rows would stop
scoring. In that case leave 0015 in place. The file is deliberately not under `supabase/migrations/`.
