# Shared Change Request: engine-recorded completion for the Georgia Habitat Trail

- From lane: quests      Task: agents/ledger/quests/q4-georgia-complete.md
- Needs: contract (research engine + provider wiring), possibly a reward decision. NO migration is required for step 1.

## Why
The Georgia Habitat Trail derives its progress from `discoveries` (Quests lane, done). Its completion is therefore the
same answer on every device, signed in or out. What the Quests lane CANNOT do is the research-engine half of the
convention: record completion once, server-side, where the reducer already runs. This lane's own record
(`region-quest-store.ts`) is device-local, keyed by account scope, a date and a ratchet only. It cannot pay anything and
a second device shows the trail complete (derived) with no date.

## Exact proposal
1. `src/lib/research.ts` (coordinator): add ONE standing task, id `region:us-ga:habitat-trail`, whose steps are the five
   Georgia habitat groups from `trailProgress()` (`src/lib/region-quest.ts`), each `target: 1`, each measuring
   "confirmed Georgia cards in this group that are in `world.state.discoveries`". Steps are sized from supply and the
   test `region-quest.test.ts` already proves a full Georgia collection completes it. Use `RESEARCH_POOL` ids only.
2. `src/state/HerbdexProvider.tsx` (coordinator): nothing new beyond `reconcileResearch` seeing the task. Completion is then
   written to `state.research` once, never revoked, and synced like every other completion (no schema change).
3. `research.test.ts` already masters the whole deck and asserts every standing task completes; it will cover the new one.

## Owner decision needed: the REWARD
No XP value was added. Registering the task under an existing `ResearchKind` WOULD pay that kind's existing XP
(25 daily / 250 / 500, `RESEARCH_XP`) retroactively to every player who already holds the cards. Options:
(a) register with no payout (visual completion only, as the board tiers do today) - needs a `ResearchKind` that pays 0
    or a non-paying task list; (b) reuse the 250 `collection` tier, accepting a retroactive 250 XP for existing players
    (CLAUDE.md warns against this for the board); (c) an achievement/badge (pays a badge, not XP). Recommendation: (a)
    now, decide (c) later. Do not pick (b) without the owner.

## Who else depends on it
`research.ts`, `herbdex-reducer.ts` (via reconcileResearch), the edge-shared mirror (`npm run sync:edge-shared`; the
server recomputes research, so a redeploy is needed for server completion to know the task), `/herbdex/research`
presentation (Quests lane owns the components).

## Risk and rollback
A wrong target would make the task impossible or retroactively complete; the supply test guards both. Rollback: remove the
task; recorded completions remain in `state.research` harmlessly (unknown ids are ignored on read).

## Does this need the owner? (coordinator fills in)
Reward choice: yes (touches XP/progression). Task registration itself: coordinator.
