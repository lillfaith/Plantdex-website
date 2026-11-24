# Shared Change Request (UI): what the capture screen needs from `src/lib/scan-capture*`

- From lane: scan      Task: agents/ledger/scan/s4-camera-capture-logic.md
- Needs: UI (owner-supervised). No UI was built or wired.

The logic is `createCameraCapture({ deps: browserCaptureDeps, scope })`. A screen would need:
1. An entry from the existing Collect flow only, behind `isCameraCaptureEnabled()`. Never a precondition of a scan or a lookup.
2. A `<video playsInline muted autoPlay>` that the screen attaches `camera.stream` to, and a shutter that calls `camera.capture(video, 'collect' | 'lookup')`.
3. Copy for each state: `unsupported`, `insecure-context`, `not-asked`, `prompting`, `denied`, `no-device`, `in-use`, `error`, `captured`.
   `denied` must say the choice is changed in browser settings; this code never asks again. Owner owns wording (D7). No wording may imply that a
   capture shows where a plant was or that anyone found it.
4. `camera.release()` on unmount, route change and page hide.
5. Accessibility of the camera experience itself (D6): large shutter, no timer, keyboard-operable.
6. Passing `scope` (the user id, or the default `'device'` signed out) so the remembered decline is per account.
7. The captured `image` (`PreparedImage`) feeds the existing identify call; sending `channel` as `purpose` is the discoveries lane's contract, not wired here.
