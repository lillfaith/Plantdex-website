# Task: Nearby species by chosen region, grouped by habitat

- Lane / role: quests
- Branch: `agent/quests/q1-first-slice` (from `integration`)
- Priority: A
- Token/time budget: one session
- Status: review

## Finding before design
`/quests` already shows the chosen region's featured board, tier progress and an "everything else
recorded" list (`QuestBoardPanel`, `quest-board.ts`, `region-species.ts`). So this slice adds what is
missing rather than a second board: (1) a **by-habitat view** of the same region data, answering "where
should I look", and (2) a plain statement of **what the occurrence data is** (source, survey date, rule),
which the page currently describes only as "herbarium specimens or many verified observations".

## What it shows
For a chosen region, a section "Where to look" listing habitat classes (Woodland, Meadow, Wetland,
Wayside, Garden). Each shows the region's **confirmed** species whose habitat class (primary or secondary,
as already classified in `habitat.ts`) is that habitat, with "N of M found" derived from the player's
existing `discoveries`. Species only "recorded occasionally" (`likely`) are listed under a separate,
qualified line per habitat and never added to the confirmed count. `insufficient`/`unlikely` are not shown.
A closing note states the data source: GBIF specimen and observation counts for the state, surveyed
2026-11-04, rule >=5 specimens or >=100 observations, link text to `docs/georgia-occurrence.md` content in
words (no new route). With no region: nothing renders (the existing empty state stays).

## Data read (nothing written)
`speciesForRegion()` (`region-species.ts`, reviewed GBIF survey), `habitatsOf()` (`habitat.ts`, confirmed
classification), `state.discoveries` (existing). No new store, key, table, network call or XP.

## How it avoids claiming presence, edibility, safety or identification
- Wording is likelihood-framed: "recorded in <region>", never "grows near you"/"you will find".
- Confirmed != guaranteed: copy says records show the plant is in the state, not at the player's spot;
  no records is not absence (reuses existing wording).
- No medicinal, edibility or safety statement; no identification tips. Habitat words come from the
  existing classification and say "where to look", with the existing look-don't-pick line kept on the page.
- Region is the state chosen by the player; nothing about their position is read.

## Acceptance criteria
- [ ] Pure `nearbyByHabitat()` groups only findable species, counts confirmed and likely separately, and
      counts found from discoveries.
- [ ] A species with a secondary habitat appears under both; totals are per-habitat, not summed.
- [ ] Output never contains `insufficient`/`unlikely` species; unknown region -> empty.
- [ ] Module imports no reducer/progression/store; component writes nothing and calls no `track`.
- [ ] Source note text derived from one constant; mentions date, rule and that absence is not proof.
- [ ] `npm run verify` exits 0.

## Authorised paths (checked with `agent-guard who`)
`src/lib/regional-nearby.ts`, `src/lib/regional-nearby.test.ts`, `src/components/quests/NearbyByHabitat.tsx`,
`src/components/quests/QuestBoardPanel.tsx` (one mount), this ledger file.

## Prohibited
XP, scoring, progression, mastery, reducer, types, achievements, research engine/tasks, Field Board, auth,
schema, migrations, packages, workflows, `src/data`, `public/cards`, nav, Boss Form flag, any payout.

## Contracts read, not changed
`quest-board.ts` (`RegionalSpecies`), `region-species.ts`, `habitat.ts`.

## Presentation is PROVISIONAL
Plain markup using existing `panel`, violet/gold tokens and the same list/chip shape as `QuestBoardPanel`.
The visual treatment (layout, grouping style) is the UI session's call; no request filed because nothing
here needs a new primitive. Section carries `data-ui-placeholder`.

## Test plan
`regional-nearby.test.ts`: grouping/counts, dual-habitat, likely kept separate, found from discoveries,
repeat/empty states, empty for unknown region, source-note content, import-boundary and no-write checks,
every Georgia species has a habitat assignment (so none silently drops).

## Report
(appended below)

Status: review. Added `src/lib/regional-nearby.ts` (+test), `NearbyByHabitat.tsx`, one mount in
`QuestBoardPanel.tsx`. Diff ~320 lines incl. this file. `agent-guard diff --role quests --base origin/integration`:
"changed only files it may change". `npm ci` was run to install existing lockfile deps (no package file changed).

`npm run verify` exit code 0. Real output (filtered lines):
```
✖ 1 problem (0 errors, 1 warning)
 ✓ src/lib/regional-nearby.test.ts (11 tests) 7ms
 Test Files  132 passed (132)
      Tests  2088 passed | 1 skipped (2089)
  Generating static pages using 3 workers (0/84) ...
  Generating static pages using 3 workers (21/84) 
  Generating static pages using 3 workers (42/84) 
  Generating static pages using 3 workers (63/84) 
✓ Generating static pages using 3 workers (84/84) in 1242ms
```
Not verified: rendered appearance in a browser (presentation is provisional, UI session's call).
Open question: none blocking. A season/phenology view needs real phenology data (survey is recording effort).
