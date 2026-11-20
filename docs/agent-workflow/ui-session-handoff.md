# UI session: working with the protected production branch

Once the production ruleset is on, **no one pushes directly to `claude/planning-session-61zwro`** (the branch keeps its name).
Direct pushes are refused for everyone, the owner included. This applies to the human-directed UI session too.

## The flow

1. Start every piece of UI work on a branch named `ui/<short-topic>`, cut from the latest `integration`.
2. Push that branch and open a pull request into `integration`. `guard` and `verify` must pass.
3. The owner reviews and merges (squash). The UI session may ask for the merge but does not approve its own design.
4. To go live, open **one promotion PR from `integration` into the production branch**. The PR check refuses any other
   source branch. The owner merges it; the merge is what triggers the existing deploy. Nothing else changes about deploys.

## What to tell the UI session (paste at the start of each session)

> Work on a `ui/*` branch cut from `integration`. Do not push to `claude/planning-session-61zwro` or `integration`.
> Open a PR into `integration` when a change is ready and wait for the owner to merge it. Promotion to production is a
> separate PR from `integration`, opened and merged by the owner.

## If a push is refused

That is the protection working. Do not look for a way around it (no force push, no different remote, no bypass). Open the PR.

## Before the production ruleset is imported

Land every pending UI commit first: anything still only on a `ui/*` branch should be in `integration`, and `integration`
promoted, so nothing is stranded on the production branch's old direct-push history.
