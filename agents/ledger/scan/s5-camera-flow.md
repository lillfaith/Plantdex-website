# Task: s5-camera-flow - camera capture mounted in the scan flow, flag-gated

- Lane / role: scan
- Branch: `agent/scan/s5-camera-flow` (from `integration`)
- Status: `review`
- Decisions: owner FINAL DECISION (V1): eligible in-app camera scanning earns NEW cards; imported/manual/self-reported cannot; educational identification from imported photos stays; camera capture never claimed to prove an outdoor sighting; existing collections grandfathered.

## Change
- New: `src/lib/scan-consent.ts`, `scan-flow.ts`, `scan-receipt.ts` (confirm decision), `scan-capture-session.ts` (contract RPCs), `scan-capture-copy.ts`; `src/components/scan/ProviderConsent.tsx`, `CameraCapturePanel.tsx`; tests `scan-consent.test.ts`, `scan-flow.test.ts`.
- Edited (all scan-owned): `ScanPanel.tsx`, `ObservationPhotos.tsx`, `scans.ts` (optional `source` on a photo; consent gate before anything is prepared or sent).
- Evidence: `docs/scan-s5/` (README with the WORKING / MOCKED / DISABLED table, screenshots, the Playwright script).

## Flags
`NEXT_PUBLIC_CAMERA_CAPTURE` (exists, default off). `NEXT_PUBLIC_SCAN_CONSENT` (new, default off, unset behaves as off). `NEXT_PUBLIC_CONFIRM_SCAN_RPC` untouched.

## Out of lane (requests)
- `agents/requests/scan-s5-flags-in-next-config.md`, `agents/requests/scan-s5-privacy-page-copy.md`.
- Coded to the discoveries contract (`docs/discoveries/discovery-receipt-contract.md` on `agent/discoveries/d5-server-eligibility`, a DRAFT, server half undeployed). Where its RPCs are missing the client falls back to a labelled MOCK.

## Untouched
XP, reducer, schema, migrations, workflows, secrets, `next.config.ts`, the privacy page, edge functions, `image-prepare`, the Scan RPC flag.
