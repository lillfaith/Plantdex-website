# Shared Change Request: define NEXT_PUBLIC_CAMERA_CAPTURE in next.config.ts

- From lane: scan      Task: agents/ledger/scan/s4-camera-capture-logic.md
- Needs: contract (`next.config.ts` is coordinator-owned)

## Why
`isCameraCaptureEnabled()` (`src/lib/scan-capture.ts`) tests `process.env.NEXT_PUBLIC_CAMERA_CAPTURE === 'on'`. Unset, it is false,
so nothing runs. Only a variable defined in `next.config.ts` becomes the literal `'off'` at build time, which lets the bundler remove
the capture code (same pattern as `NEXT_PUBLIC_BOSS_FORMS` and `NEXT_PUBLIC_CONFIRM_SCAN_RPC`).

## Exact proposal
In the `env` block of `next.config.ts`:
```ts
NEXT_PUBLIC_CAMERA_CAPTURE: process.env.NEXT_PUBLIC_CAMERA_CAPTURE ?? 'off',
```
Do not set the variable in any workflow or environment. The discoveries design names the same pilot `NEXT_PUBLIC_LIVE_CAMERA_PILOT`
(section 14.4); the coordinator should pick one name. This code uses the name in the task card.

## Who else depends on it
Only `src/lib/scan-capture.ts`. Nothing imports these modules yet.

## Risk and rollback
None while `'off'`. Revert the line.

## Does this need the owner? (coordinator fills in)
Enabling it later is the owner's pilot decision (D1); this line alone is inert.
