# Shared Change Request: update a coordinator-owned handler test for the one-photo collect floor

- From lane: scan      Task: agents/ledger/scan/s7-one-photo-consent-v2.md
- Needs: other (coordinator-owned test file)

## Why
Owner decision 2026-11-26: a `purpose=collect` request needs ONE photograph, not two. `identify-plant/index.ts`
(scan-owned) now applies a floor of 1 for collect only. `src/lib/scan-edge-handler.test.ts` (coordinator-owned)
still pins the old behaviour in `purpose=collect > too few images is still the old 400, before any capture call`:
it sends ONE image with `collect` fields and expects 400 `tooFewImages`. That test now fails, and I may not edit it.

## Exact proposal
Replace that single test (around line 334) with two:

```ts
it('a collect request of ONE image is accepted (owner decision 2026-11-26)', async () => {
  const { admin } = fakeAdmin();
  router.admin = admin;
  const out = await invoke(handler, { token: 'tok-alice', images: [fakeImage('solo')], fields: collect });
  expect(out.status).toBe(200);
});

it('a NON-collect request of one image is still the old 400', async () => {
  const { admin, calls } = fakeAdmin();
  router.admin = admin;
  const out = await invoke(handler, { token: 'tok-alice', images: [fakeImage('solo')] });
  expect(out.status).toBe(400);
  expect(out.body.code).toBe('tooFewImages');
  expect(calls.rpc.map(([n]) => n)).toEqual(['claim_scan_pair']);
});
```
(Adjust the first to whatever extra fakeAdmin wiring a successful collect needs; the point is status 200, not 400.)

## Who else depends on it
Only this test. No mirror or contract file changes; `observation-capture-receipt.ts` already says min_images 1.

## Risk and rollback
Test-only. Until it lands, `npm run verify` on the scan branch has exactly this one failure; it is reported in the PR, not skipped.

## Does this need the owner? (coordinator fills in)
No - it implements an owner decision already made.
