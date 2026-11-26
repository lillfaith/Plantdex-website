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

## Also: give the caller's own daily unit back (owner direction 2026-11-26, same failure)
0016 now has `refund_scan_claim(p_bucket text, p_day date, p_observation_id text) returns boolean` (service role only). Call it with the
SAME `bucket` and `day` the request claimed, and the request's own `observationId` (the uuid minted per request). THE DATABASE, not the
caller, makes it safe: one refund per observation id (a repeat returns false), at most 3 refunds per caller bucket per UTC day, the `global`
bucket is refused outright (it is the upstream-cost backstop and is spent whether or not the provider charged), a day more than one day from
today is refused, a bucket with no claim that day is refused, and the count never goes below zero. Verified under 12-way concurrency: the
same id refunds exactly once; twelve distinct ids refund exactly three.

The CALLER still decides which failures qualify, and only these may: a failure on the PROVIDER's side (outage, timeout, 5xx, network).
Never an invalid or rejected photograph, a malformed request, a quota refusal, a "nothing found" answer, a replay, or a success. Ignore the
RPC's failure (never surface it).

Tests to add (lane-owned file, e.g. `src/lib/scan-edge-release.test.ts`, using the existing fake admin and port): provider failure after an
accepted capture calls `release_capture_session` and `refund_scan_claim` once each with those arguments and answers as before with
`capture.retryable = true`; a replay, a refusal, a successful identification, "nothing found" and an invalid-image rejection call neither;
a throwing release/refund never changes the response the player sees.

## Risk
Only the service-role edge function can release, and only a session with zero receipts, so it cannot re-roll a seen answer. A forced
provider failure repeated by one player is bounded by the per-caller and global scan quotas that already apply to every request.
