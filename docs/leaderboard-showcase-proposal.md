# Field Board: categories and a collection showcase (proposal only)

**Status: investigation and proposal. Nothing here is implemented, no scoring rule changes, and no
migration is created or applied.** It needs a separate approval.

## What the board is made of today

`leaderboard_standings()` (migration 0011) ranks by one number: points from three tables that
already have no update policy and a one-row-per-key primary key.

| Source table | Rule today | Anti-farming already structural |
| --- | --- | --- |
| `discoveries` | 10 pts per species | one row per (user, species) |
| `sightings` | 5 pts for the first qualifying journal entry per species, daily cap | counts species, not entries |
| `research_completions` | 100 pts per completed challenge | one row per (user, task) |

Published per player: display name, region, counts, points. No level, XP, avatar, frame or title.

## Which other categories the existing data could support

All are derivable at read time from tables that already exist. None needs a stored score.

| Candidate category | Data | Farmable? | Verdict |
| --- | --- | --- | --- |
| Species found | `discoveries` (distinct herb) | Self-declared, same as today | Already visible as a count; could be its own sort |
| Journal depth | `sightings` with photo or a real note | Capped per day today | Already a count; a "with photo" board would reward uploads, which the current design deliberately avoids |
| Challenges completed | `research_completions` | One per task | Already a count |
| Cards mastered | `mastered` (write-once) | Self-declared; mastery needs only 1 sighting today | Feasible; weak signal until the mastery bar is raised |
| Collection completion | `discoveries` / deck size | Same as species found | Redundant with species found |
| Habitat breadth | discoveries joined to `habitat.ts` classes | Self-declared | Feasible, needs the habitat map duplicated in SQL (drift risk like `leaderboard.ts`) |
| Rarity finds | discoveries by card rarity | Self-declared | Feasible; invites ranking luck rather than effort |
| Level / XP | derived on the client from state | Not server-computed anywhere | **Not feasible** without moving the XP formula into SQL |

Recommendation: keep one primary ranking (points). If a second view is wanted, "Species found"
and "Cards mastered" are the two that need no new rule and no new table, only a different
`order by` over the same rows. The XP/level idea should not ship until XP is server-computed.

## The bigger idea: a place to show off collections and cosmetics

The recommendation to make the board a showcase fits Plantdex better than ranking alone. The
profile already stores the cosmetic choices (`avatar_herb_id`, `avatar_frame_id`, `title_id`,
`featured_herb_id`, `pinned_achievement_ids`), but the `profiles` table is owner-only and the
standings function publishes none of it. That is deliberate: `leaderboard-schema.test.ts` pins the
return signature as "name, region, counts".

What the frontend does now, with no new data exposure:

- Your own row shows your own avatar, earned frame and title (read from your own profile on this device).
- The podium stands real sprites on the steps, chosen by place, clearly decorative.
- Rows render another player's avatar and frame **only if** the server ever returns them, validated
  against the sprite manifest and the frame list. Today it returns neither, so none renders.

What a showcase for other players would need (a separate, explicitly approved change):

1. A **second opt-in**, not the existing one. Joining the board consents to name, region and counts.
   Publishing a collection is a different disclosure, so it should be its own toggle on the board
   row (for example `show_cosmetics boolean not null default false`), reversible by leaving or
   switching it off.
2. `leaderboard_standings()` returns, for participants with that toggle on only,
   `avatar_herb_id`, `avatar_frame_id`, `title_id` and `featured_herb_id`, taken from `profiles` and
   re-validated server-side against the player's own `discoveries` (the client validates on read
   today; a published value must not rely on that).
3. No user id, email, dates, notes, photographs or free-text regions are added. The pinned-signature
   test is updated deliberately, in the same change, to the new column list.
4. `leaderboard-schema.test.ts` and `account-security.test.ts` (export and deletion parity) updated;
   the live cross-user test in `e2e/supabase.e2e.test.ts` written first, since it does not exist yet.
5. Frames and titles are derived predicates of state; the server cannot evaluate them. Publishing a
   frame id the player has not earned would be a cosmetic lie, so the server should publish only the
   default frame unless the predicate is mirrored in SQL. This is the main design question.

Sketch only (not a migration file, so no workflow can pick it up):

```sql
-- alter table public.leaderboard_participants add column show_cosmetics boolean not null default false;
-- leaderboard_standings(...) adds: avatar_herb_id, featured_herb_id (null unless show_cosmetics),
--   joined from profiles and checked against discoveries for the same user.
```

## Migration 0011: verified status

Verified from the repository's workflow history, without applying anything:

- `0011_leaderboard.sql` was applied successfully to the **test** project
  (`vgjehmwcpavflbfhbbrp`, per `supabase/README.md`) by `run-migration.yml` run 30 on 2026-11-12,
  and its "Confirm the objects exist" step passed. Three earlier attempts (runs 27 to 29) failed
  before any SQL ran, on a paused test database and a scope check.
- No `run-migration.yml` run targets the **production** project (`vygiamigomwlvnwkryyl`) with
  `0011_leaderboard.sql` or `0012_boss_forms.sql`. Treat both as unapplied in production.
- A signed-in `/leaderboard` in production therefore cannot load standings; the page now says the
  board "is not switched on for this project yet" instead of showing a database error.

## Remaining production blockers (all need your approval)

1. Apply `0011_leaderboard.sql` to production via the manually dispatched `run-migration.yml`
   (safe to re-run; it is guarded and idempotent).
2. Write the live cross-user attack test for `leaderboard_participants` and the standings function
   (it is listed as a known gap) and run `npm run verify:supabase` against the test project.
3. Decide whether the showcase proposal above is wanted; if so, it needs its own migration number.
4. Only 1 launched region exists (`us-ga`), so the regional board will look empty until a second
   launches.
