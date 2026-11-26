# Shared Change Request: default the Georgia quest preview flag to off in next.config.ts

- From lane: quests      Task: agents/ledger/quests/q4-georgia-complete.md
- Needs: other (flag default in a coordinator-owned file)

## Why
`/quests/habitats` is gated by `NEXT_PUBLIC_GEORGIA_QUEST_PREVIEW`, read as the exact string `on`. Unset or any other value is
off, so production behaves correctly today with no change. Every other flag is listed in `next.config.ts`'s `env` block with a
default of `'off'` so a deploy is deterministic and visible there.

## Exact proposal
In `next.config.ts` `env`, beside `NEXT_PUBLIC_MULTI_REGION`:
`NEXT_PUBLIC_GEORGIA_QUEST_PREVIEW: process.env.NEXT_PUBLIC_GEORGIA_QUEST_PREVIEW ?? 'off',`

## Who else depends on it
`src/lib/region-quest.ts`, `src/components/quests/GeorgiaQuestGate.tsx`, `src/app/quests/habitats/page.tsx`.

## Risk and rollback
None: default off. Remove the line to revert.

## Does this need the owner? (coordinator fills in)
No.
