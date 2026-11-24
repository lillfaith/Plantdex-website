# Task: s4-camera-capture-logic — live-camera capture, logic only, inert

- Lane / role: scan
- Branch: `agent/scan/s4-camera-capture-logic` (from `integration`)
- Status: `review`
- Decisions: D1 (pilot from the existing Collect entry point; `getUserMedia` never required), D6 (no camera-free route to a new card; people without a camera keep browsing and educational identification).

## Change (all new files, nothing existing edited)
- `src/lib/scan-capture.ts`: flag read (`NEXT_PUBLIC_CAMERA_CAPTURE === 'on'`, literal), the 11 states, pure `transition()`, `stateForError()`,
  the `'collect' | 'lookup'` channel tag, and the remembered decline (one boolean, key `plantdex.camera-capture.v1:<scope>`, strict validation on read).
- `src/lib/scan-capture-camera.ts`: `createCameraCapture` with every browser API injected (`browserCaptureDeps()` is the real binding, resolved only when called).
  Frame grab to canvas, then the existing `prepareImage` with `IDENTIFY_PROFILE`. Tracks stop on success, failure, release and a late-arriving stream.
- `src/lib/scan-capture.test.ts`: 31 tests with fake `mediaDevices`.

## Behaviour worth knowing
- Flag off: no method touches deps, navigator, window or storage; state stays `unsupported`.
- A decline writes the boolean and `request()` is then a no-op, in this session and later ones for that account. Other errors are never retried and never remembered.
- `SecurityError` maps to `insecure-context`; `OverconstrainedError`, `AbortError` and unknown names map to `error`.
- No frame is stored or uploaded, no location or EXIF is read, no path returns original bytes. The output tag says `source: 'live-camera'` and nothing about the plant.
- Does not import discoveries files, the reducer, progression or any store. The channel is a plain value for the classifier to read later.

## Out of lane (requests)
- `agents/requests/scan-s4-flag-in-next-config.md`: the one `next.config.ts` line (and a note that PR #40 names the pilot flag differently).
- `agents/requests/scan-s4-capture-ui-needs.md`: what a screen needs. No UI or ScanPanel change was made.

## Untouched
XP, reducer, schema, migrations, workflows, secrets, `next.config.ts`, ScanPanel, discoveries files.
