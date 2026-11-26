# Shared Change Request: define NEXT_PUBLIC_CONFIRM_SCAN_RPC in next.config.ts

- From lane: scan      Task: agents/ledger/scan/s3-confirm-rpc-disabled.md
- Needs: contract (`next.config.ts` is coordinator-owned)

## Why
`confirmScan` tests `process.env.NEXT_PUBLIC_CONFIRM_SCAN_RPC === 'on'`. Unset, the flag is simply false, so behaviour is today's. But
only a variable defined in `next.config.ts` becomes the literal `'off'` at build time, which is what lets the bundler remove the RPC
branch entirely (the Boss Forms pattern). Without this line the branch ships in the bundle, inert.

## Exact proposal
In the `env` block of `next.config.ts`, beside `NEXT_PUBLIC_BOSS_FORMS`:
```ts
NEXT_PUBLIC_CONFIRM_SCAN_RPC: process.env.NEXT_PUBLIC_CONFIRM_SCAN_RPC ?? 'off',
```
Optionally pin it with a test like `boss-form-bundle.test.ts`'s config check. Do not set the variable in any workflow or environment.

## Who else depends on it
Only `src/lib/scans.ts`.

## Risk and rollback
None while `'off'`. Revert the line.

## Does this need the owner? (coordinator fills in)
Enabling the flag (a later, separate step) is production-affecting and needs the owner; this line alone does not.
