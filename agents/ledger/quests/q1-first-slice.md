# Task: Nearby species by chosen region, grouped by habitat

- Lane / role: quests
- Branch: `agent/quests/q1-first-slice` (from `integration`)
- Priority: A
- Token/time budget: one session
- Status: review

## Scope (revised 2026-11-24, after owner review of #42)
The owner approves the FUNCTIONALITY (reuse of the regional quest system, habitat grouping, collection
progress from existing discoveries, qualified occurrence data, no scoring/XP/schema change) and does NOT
approve the visual design, which the owner will choose in a separate UI session. So this PR ships **logic
only**:
- `src/lib/regional-nearby.ts` (+ tests): `nearbyByHabitat()` and `RECORDED_COPY`, the one constant of
  exact user-facing strings (heading "Recorded in <region>", subheading, "<n> of <m> in your collection",
  "Recorded only occasionally in <region>", unlocked badge, and the source/disclosure note). Any layout
  must take its words from it.
- `src/components/quests/NearbyByHabitat.tsx`: **UNMOUNTED and provisional** (`data-ui-placeholder`, header
  comment "not mounted anywhere, awaiting the UI session's design, do not mount"). Nothing imports it.
- `src/components/quests/QuestBoardPanel.tsx`: reverted, byte-identical to `origin/integration`;
  `/quests` renders exactly what it did before. A test fails if the panel imports the view or the module.

## What the data is, and is not
Historical GBIF occurrence RECORDS for a whole region, surveyed on a date. Not live sightings, not the
player's location (nothing about position is read), not presence or season, not an identification guide.
A test bans nearby / near you / around you / close to you / where to look / right now / currently / live /
likely / here across every exported string and every literal in the component.

## Rules kept
Confirmed and occasional counts stay separate; a two-habitat plant appears under both so counts overlap and
must not be summed; insufficient/unlikely species never appear; species with no printed card are silently
excluded; progress counts only cards the player has already unlocked.

## Why nothing is mounted
Integration is promoted to production, so a mounted provisional panel would eventually ship.

## Open questions deferred to the owner's UI session
Layout and grouping style; where (if anywhere) the view mounts; whether the occasional group is shown
collapsed; how the source note is disclosed; whether a season/phenology view is wanted (needs real
phenology data; the survey measures recording effort only).

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
this ledger file. (QuestBoardPanel.tsx is NOT touched.)

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
Status: review. Revised scope above. Verify output appended after the final run.

`npm run verify` exit 0 (revised scope). Real output (filtered):
```
✖ 1 problem (0 errors, 1 warning)      # pre-existing warning in scripts/agent-guard.mjs
 ✓ src/lib/regional-nearby.test.ts (40 tests)
 Test Files  132 passed (132)
      Tests  2117 passed | 1 skipped (2118)
✓ Generating static pages using 3 workers (84/84)
```
`agent-guard diff --role quests --base origin/integration`: "changed only files it may change."
Not verified: rendered appearance (view is unmounted by design).

## Coordinator review (2026-11-24)
Independently checked out at `0747b26` and run by the coordinator, not the authoring agent:
- Logic reviewed against `quest-board.ts`, `region-species.ts`, `habitat.ts`: confirmed vs occasionally-recorded counts stay separate; a
  two-habitat plant is listed under both (counts overlap, never summed); insufficient/unlikely never shown; species with no printed card are
  excluded consistently; discoveries only read.
- `npm run lint`: 0 errors (1 pre-existing warning in `scripts/agent-guard.mjs`). `npm run typecheck`: clean.
- `npx vitest run`: 132 files, 2118 tests passed.
- `QuestBoardPanel.tsx` is byte-identical to `integration`; nothing imports the provisional `NearbyByHabitat.tsx`, so no page changes.
- Wording: `RECORDED_COPY` says records for a region, never nearby/near you/right now/live (test-enforced). Remaining wording issue outside this PR:
  the existing `/quests` page itself is titled "Plants near you" in three places; that copy is the owner's/UI session's call.
