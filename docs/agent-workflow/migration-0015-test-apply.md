# Migration 0015 on the TEST project: exact apply and verification steps

**Production is NOT authorised.** The owner approved applying 0015 to the TEST project only, `vgjehmwcpavflbfhbbrp`. Production is
`vygiamigomwlvnwkryyl`; it appears in the workflow's dropdown and **must not be selected**. Nothing in this document, the migration, or the
approval extends to it. Agents and the coordinator do not dispatch workflows; the owner does.

## What is being applied
`supabase/migrations/0015_expansion_catalogue_ids.sql`: two new functions (`is_expansion_herb`, `is_permitted_herb`) and four CHECK constraints
re-pointed at the second (`discoveries`, `learned`, `mastered`, `sightings`), each still `NOT VALID`. It lets those tables STORE the 85 digital
Herbdex Expansion ids on TEST. It does **not** publish any card (the app serves none; `NEXT_PUBLIC_EXPANSION_PILOT` is off), pay any XP, or
score anything: `is_catalogue_herb` and `leaderboard_standings` are untouched, so an expansion id is worth 0 on the Field Board. Design and
reasons: `docs/expansion/progression-inheritance.md` ("Decided", section 4). Local review evidence: `migration-0015-test-plan.md`.

## Before dispatching (all four must be true)
1. **Independent review is recorded** on PR #69 (a reviewer other than the author of the migration).
2. **CI is green** on the commit you are about to apply (`pr-verify` and the branch's checks).
3. **The file matches the reviewed commit.** On the branch, at the commit the PR shows:
   `git rev-parse HEAD` equals the PR's head sha, and `sha256sum supabase/migrations/0015_expansion_catalogue_ids.sql` equals the value in the
   PR description's "Migration fingerprint" line (the coordinator records it there). The workflow applies the file from the ref it is dispatched
   from, so dispatching from the branch tip applies exactly that content; if anyone pushes after review, repeat this check.
4. **Take a pre-apply snapshot** in the TEST project's SQL editor (read-only) and keep the output:
   ```sql
   select (select count(*) from public.discoveries) as discoveries, (select count(*) from public.learned) as learned,
          (select count(*) from public.mastered) as mastered, (select count(*) from public.sightings) as sightings,
          (select coalesce(sum(points), 0) from public.leaderboard_standings(null, 200)) as board_points_total;
   ```

## Apply: GitHub Actions settings
GitHub repository > **Actions** > workflow **Run a Supabase migration** > **Run workflow**, with exactly:

| Field | Value |
|---|---|
| Use workflow from (branch) | `coord/expansion-progression-design` |
| `project_ref` (Which Supabase project to migrate) | `vgjehmwcpavflbfhbbrp` (the entry commented "test"; **not** `vygiamigomwlvnwkryyl`) |
| `migration` (File name under supabase/migrations/) | `0015_expansion_catalogue_ids.sql` |

Expected log: `Applying supabase/migrations/0015_expansion_catalogue_ids.sql to vgjehmwcpavflbfhbbrp`, `HTTP 200` (or 201), `Migration applied.`
The "Confirm the objects exist" step then prints the tables the file names; it will also list `is_expansion_herb` and `is_permitted_herb` as if
they were tables and print no columns for them. That is the step reading every `public.<name>` in the file, and is harmless. The migration is
idempotent: running it twice changes nothing.

## Post-apply verification (required; this is the acceptance step)
1. In the TEST project's SQL editor paste `docs/agent-workflow/migration-0015-test-verification.sql` and run it. It is one `DO` block that ends
   by raising an exception, so it leaves no rows; the exception text is the report.
2. **Expected: `RESULT ALL PASSED`** with zero `FAIL` lines (21 PASS lines and two INFO lines). Send the full text to the coordinator.
   Lines worth reading: `is_catalogue_herb accepts NONE of the expansion ids`; `the participant scores exactly 50 (the printed discovery)`;
   `a daily research task for an expansion id is still refused`; the four `... present, NOT VALID, calls is_permitted_herb` lines.
3. Re-run the pre-apply snapshot. The four counts must equal the snapshot taken before, and `board_points_total` must be unchanged.
4. If the standings line reports a mismatch and nothing else fails, another writer touched TEST during the run: re-run once.
5. Do **not** run the live suites, deploy any edge function, or turn any flag on as part of this step. None is needed, and none is authorised here.

## Rollback (TEST)
Paste `docs/agent-workflow/migration-0015-rollback.sql` into the TEST SQL editor as one paste. It **refuses** (raises `ROLLBACK REFUSED`, changes
nothing) if any row in the four tables holds an id outside 0013's 54, and it never deletes or edits a player record. If it refuses, leave 0015 in
place and tell the coordinator; those rows are the owner's to decide about.

## What was NOT verified, and cannot be from here
This was exercised against a throwaway local PostgreSQL 16 with a minimal Supabase shim (migrations 0001-0013 applied; the storage policies and the
entitlement view that need real Supabase objects did not apply and are irrelevant to these tables). Not covered: PostgREST, a real signed-in
session, two-session concurrency, the live leaderboard suite, and the TEST project itself. The post-apply verification above is what closes the last of that.
