# Shared Change Request: dispatchable workflow for the live capture-receipt suite (workflows are coordinator-owned)

- From lane: scan      Task: agents/ledger/scan/s6-edge-receipts.md
- Needs: other (new workflow file)

## Why
The live suite (`agents/requests/scan-s6-capture-receipts-e2e.md`) must be run by the owner against TEST. Agents may not create or edit workflows or dispatch them.

## Exact proposal
Add `.github/workflows/live-capture-receipts.yml` as a copy of `.github/workflows/live-confirm-scan.yml` with only these differences:
`name: Live capture-receipt checks (TEST project only)`, `concurrency.group: live-capture-receipts`, `timeout-minutes: 20`, and the final command
`npx vitest run --config vitest.e2e.config.ts e2e/capture-receipts.e2e.test.ts --reporter=verbose`. Keep: `workflow_dispatch` only, the literal TEST ref and
its guard step, `vars.TEST_SUPABASE_ANON_KEY` (a variable, no secret), the key-format and "TEST accepts this key" checks, `permissions: contents: read`.
It sets no flag, deploys nothing and applies no migration. Extend the guard test pattern of `live-confirm-scan-e2e-guard.test.ts` to it.

## Who else depends on it
The owner's run. As with the confirm_scan workflow, `workflow_dispatch` lists a workflow only once its file is on the default branch.

## Risk and rollback
Spends real provider credits (about six) per dispatch, TEST only. Delete the file to roll back.

## Does this need the owner? (coordinator fills in)
