# Task: Habitats view-model (Q3)

- Lane / role: quests
- Branch: `agent/quests/q3-habitats-view-model` (from `integration`)
- Status: review

## Goal
Pure data layer for the approved Habitats screen (poster carousel, 3-column sprite grid, plant info sheet). No UI.

## What changed
- `src/lib/habitat-view-model.ts`: `habitatsViewModel(input)` plus `HABITAT_VIEW_COPY`.
- `src/lib/habitat-view-model.test.ts`: 18 tests (union once, no habitat-sum totals, Georgia parity, collected independent of region, deterministic order, scope labels, flag-off parity, vocabulary).

## For the UI session
- Input: `discoveries`, `enabled` (multiRegionEnabled()), `preference`, `membership`, `stateId`, `legacyRegionId` (today's `/quests` region), optional injected sources.
- Output: `state` (`ready|empty|noRegionSelected|noRegionData`), `scope` (label/source/regionIds/stateId), five `habitats` sections always present in HABITATS order (tiles + `count`), `total` (unique, counted once), `message`.
- Tile: `status` is `collected|notFound` only; `recorded` / `recordedOccasionally` are separate flags. `info` is the sheet payload; `cardHref` is `/herbdex/<id>` (no base path).
- Tile order: recorded-often first, then occasional, each by card number (same as `nearbyByHabitat`).
- Words come from `HABITAT_VIEW_COPY`; "unlocked" is Field Cards only.

## Decisions to review
- Flag off or no selected region => today's single-region view; `stateId` is ignored there (state is a multi-region filter).
- With a lens, species come from `speciesInView`; `recorded` is true only where an occurrence source lists the species. Ecoregion membership has no occurrence data yet, so those tiles are `recorded: false`, scope label "... species list".
- A state with no list => `noRegionData`.
- Region display names: only `us-ga` => "Georgia" is built in; other ids fall back to the id until the UI injects `regionName`.

## Not done / out of lane
No components, CSS, flag default, region data, or schema.
