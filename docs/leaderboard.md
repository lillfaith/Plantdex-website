# The Field Board

A competitive standing built from field work. This is the runbook; the design argument lives
in `src/lib/leaderboard.ts` and the rules it enforces live in
`supabase/migrations/0011_leaderboard.sql`.

## What it measures, and why not XP

XP already answers "how far has this player got with the collection", and it pays for
learning a card and mastering it — both of which happen indoors. A competitive board ranked
on XP would reward sitting at a table with the deck, which points the incentive at the
screen. The board measures the other thing: how much real field work somebody has put in.

| | Points | Once per |
|---|---|---|
| A species recorded for the first time | 50 | species, ever |
| The first qualifying Field Journal entry for it | 15 | species, ever — and at most 4 a day |
| A completed Field Research challenge | 100 | task |

A qualifying entry is one for a species already in the collection that carries a
**photograph, or a note of at least 24 characters**. A growth stage on its own is two taps
and does not qualify.

Daily Field Research tasks pay XP and nothing here. The regional **quest board**
(`quest-board.ts`) pays nothing either and structurally cannot: it is a seeded client-side
lens with no completion record, so scoring it would mean trusting a client to assert that it
finished one — the write path the whole design avoids.

## There is no stored score

Nothing in the schema holds a point total. `leaderboard_standings()` computes one at read
time from `discoveries`, `sightings` and `research_completions`. That is the whole security
model: there is no statement, callable by anybody, that raises a score.

It also means every anti-farming rule is a property rather than a check:

| Attempt | Why it earns nothing |
|---|---|
| Log the same plant again | `discoveries` has primary key `(user_id, herb_id)`. One row. |
| Edit an entry to make it longer | The score counts species with a qualifying entry, not entries. |
| Delete an entry and write a new one | The set is the same size afterwards. |
| Write fifty entries in an evening | At most four species pay per UTC day. |
| Write entries for plants never found | A qualifying entry joins to `discoveries`. |

The cap runs on **UTC**, not the player's clock, so the window means the same thing for
everybody on one board and cannot be widened by changing a phone's timezone. An entry past
the cap is kept in the journal as normal — it simply earns nothing, then or later.

## Nothing here is verified

Plantdex verifies nothing. A find is recorded because somebody said so, and a plant
identifier only ever suggests a species (CLAUDE.md, "Progression is self-declared"). So
**every score on this board is provisional**, the page says so above the table, and the type
carries `PROVISIONAL` so that a verified tier would have to be built and named rather than
assumed into existence.

`photo_backed_entries` is the closest thing to evidence the schema holds — a journal entry
with a photograph. It is shown beside the score and **never folded into it**, because a
photograph is better evidence than a tap and still not proof, and because a board that scored
it would become a ranking of who uploads the most pictures.

## Privacy

Joining is a decision. A row in `leaderboard_participants` is the consent; without one the
account appears nowhere and is not readable through the standings function at all.

**Published:** the display name the player set on `/profile` (or nothing, if they set none),
the region they picked when joining, and counts — points, species, qualifying entries, how
many had a photograph.

**Never published:** which plants, any dates, journal notes, photographs, scans, the
free-text `region` a player may have typed into a sighting, or any user id or email. The
return signature of `leaderboard_standings()` is pinned by `leaderboard-schema.test.ts` for
exactly that reason.

Leaving the board deletes the row. So does deleting the account —
`leaderboard_participants` is in `USER_TABLES`, and the listing is in the account export.

## Setup

1. Apply `supabase/migrations/0011_leaderboard.sql` (the manually dispatched
   `run-migration.yml`, like every other migration). It is safe to run twice: the table and
   index are `if not exists`, the policies are guarded against `pg_policies`, and the
   function is `create or replace`.
2. Nothing else. There is no new secret, no edge function and no deploy step — the board is
   a read-only RPC from the existing client.

To check it live, sign in, open `/leaderboard`, join, and confirm your own row appears with
the counts your collection shows. `e2e/supabase.e2e.test.ts` is where a cross-user attack on
it would belong; it is not written yet, and that gap is listed below.

## Known gaps

- **No live cross-user test.** The RLS attacks in `e2e/supabase.e2e.test.ts` do not yet cover
  `leaderboard_participants` or the standings function. The source-level guards in
  `leaderboard-schema.test.ts` check the shape of the SQL, not Postgres's behaviour.
- **One launched region.** `regions.ts` has launched only `us-ga`, so the regional board is
  correct and nearly empty. It needs no code change when a second region launches.
- **Ties share a standing but not an order.** `rank()` gives equal scores equal numbers; the
  row order within a tie is by user id, which is deterministic and arbitrary.

## Field Board UI polish (development branch)

Decisions made without review, all reversible and all presentation-only:

- **No schema change.** `leaderboard_standings()` is untouched, so migration 0011 stays separate and
  unapplied. The page fetches the function's maximum (200 rows) in one call, finds the player's own
  row wherever it sits within that, and pages the rest client-side ("Show more").
- **Published fields only.** The function returns a display name, a launched region, counts and
  points. It returns no level, XP, avatar or frame, so none is shown and none is invented. The
  podium art is decorative (a crown and two medals), never a stand-in for a player's avatar.
- **Ties.** Ranking is the server's `rank()`: equal points share a standing. Three players tied for
  first all stand on the first step.
- **Honesty line stays in the first render of every state.** `scripts/check_live_site.py` asserts
  "These scores are provisional" on `/leaderboard/`.
- **Failure copy.** A missing function (migration not applied to the project) reads as "not switched
  on for this project yet" rather than a database error.
- **Calm by design.** No streaks, timers, urgency or invented rewards. The one animation is a
  single 420ms rise on the podium, switched off under reduced motion.
- **Pure helpers** live in `src/lib/board-view.ts`; `BoardScreen` is presentational and takes plain
  props, so every state is renderable in tests with clearly labelled mock data.
