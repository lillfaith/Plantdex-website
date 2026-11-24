# Shared Change Request: ScanPanel wording for "not a plant" and "provider found nothing"

- From lane: scan      Task: agents/ledger/scan/s2-outcome-logic.md
- Needs: UI design (ScanPanel is not scan-lane visual surface; wording and layout are UI's)

## Why
`identifyPlant` now returns `notAPlant` and `providerFoundNothing` on `ScanResult` (the server always sent
them; the client used to drop them). `ScanPanel` still renders both as the ordinary empty `noMatch`
branch: "Not one of the 45 cards" / "Nothing was recognised in that photograph. A closer shot of a single
leaf or flower usually works better." For `notAPlant` that tells somebody whose photograph the provider
said is not a plant to try a closer shot of a leaf, and for `noMatch` generally it implies the plant was seen.

## Exact proposal
In the `noMatch` branch, when `result.notAPlant`: a heading and sentence saying the identifier did not
see a plant in these photographs, with no "closer shot of a leaf" advice and no Seed Shelf offer.
When `result.providerFoundNothing`: keep the current "nothing was recognised" sentence. Wording is the UI
owner's; no logic change is needed, the fields are already on `result`.

## Who else depends on it
`src/components/scan/ScanPanel.tsx` only. No mirrored module changed, no sync:edge-shared.

## Risk and rollback
Presentation only. Until it lands, behaviour is exactly today's.

## Does this need the owner? (coordinator fills in)
UI copy: likely yes.
