# Request to the scan lane: hand the capture session back when the provider failed

- From lane: coordinator      Resolves: agents/requests/scan-s6-consume-before-provider.md (option a)
- Owner direction (2026-11-26): "Fix safe retry behavior when the identification provider fails."

## Done by the coordinator (this PR)
- `0016` gains `release_capture_session(p_user, p_session) returns boolean`: service role only, refuses (false) when ANY receipt
  exists for the session, un-consumes only a session that belongs to `p_user`, leaves image digests in place. 5 new checks in
  `0016_verify.sql` (99 total with 0014 present).
- `CapturePort.release(userId, sessionId): Promise<boolean>` in `supabase/functions/identify-plant/capture.ts`. Never throws.

## Needed from the scan lane (`supabase/functions/identify-plant/index.ts`, lane-owned)
After the provider call returns, when the identification is a FAILURE (the 502 path) AND `capture` was accepted with `replay === false`,
call `await capturePort.release(userId, capture.sessionId)` before returning, and add `capture.retryable = true` to the response
capture block (the client may resend the same photographs with the same session). Do not release on a replay, on a refusal, or on a
successful identification. A test in `scan-edge-handler.test.ts` is coordinator-owned: ask for the case there, or add it to a lane-owned
file such as `scan-edge-release.test.ts` using the existing fake port.

## Risk
Only the service-role edge function can release, and only a session with zero receipts, so it cannot re-roll a seen answer. A forced
provider failure repeated by one player is bounded by the per-caller and global scan quotas that already apply to every request.
