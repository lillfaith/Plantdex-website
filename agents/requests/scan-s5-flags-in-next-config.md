# Shared Change Request: define NEXT_PUBLIC_SCAN_CONSENT in next.config.ts

- From lane: scan      Task: agents/ledger/scan/s5-camera-flow.md
- Needs: contract (`next.config.ts` and `.env.example` are coordinator-owned)

## Why
`isConsentEnforced()` (`src/lib/scan-consent.ts`) is true when `NEXT_PUBLIC_SCAN_CONSENT === 'on'` or the camera pilot is on. Unset it is
false, so the code is correct today; defining the variable in `next.config.ts` makes it the literal `'off'` at build time so the bundler can
drop the branch (the `NEXT_PUBLIC_BOSS_FORMS` precedent). `NEXT_PUBLIC_CAMERA_CAPTURE` is already defined there.

## Exact proposal
In the `env` block of `next.config.ts`:
```ts
NEXT_PUBLIC_SCAN_CONSENT: process.env.NEXT_PUBLIC_SCAN_CONSENT ?? 'off',
```
and document it, default `off`, in `.env.example`. Do not set it in any workflow or environment.

## Who else depends on it
Only `src/lib/scan-consent.ts` and the scan screen.

## Risk and rollback
None while `'off'`. Revert the line.

## Does this need the owner? (coordinator fills in)
Switching it ON in production is the owner's decision. Recommendation from this lane: turn it on before any public launch, independent of the
camera pilot, because the notice on /privacy is not shown at the point of sending.
