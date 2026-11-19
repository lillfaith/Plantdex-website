## What and why

<!-- One or two sentences. Link the task card in agents/ledger/ if there is one. -->

## Lane and scope

- Lane / role: <!-- scan | quests | discoveries | ui | coordinator | lane-b -->
- Task card: <!-- agents/ledger/<lane>/<task>.md -->
- Files outside my lane: <!-- none, or list them and link the Shared Change Request -->

## Verification (paste real output, do not summarise)

- [ ] `npm run verify` exit code 0 on this branch: <!-- paste the last lines -->
- [ ] New or changed behaviour has a test that fails without the change
- [ ] `node scripts/agent-guard.mjs diff` is clean

## Safety checklist

- [ ] No change to XP, scoring, the reducer, schema, auth, routing, global styles or card/photo assets (or a Shared Change Request approved by the coordinator is linked)
- [ ] No new secret, key, token or credential anywhere in the diff
- [ ] No new network call, paid API use, or workflow dispatch
- [ ] Nothing here changes what deploys to production

## Rollback

<!-- How to undo this: revert the squash commit, plus any data/flag step. -->
