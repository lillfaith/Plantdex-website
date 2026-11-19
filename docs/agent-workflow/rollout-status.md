# Rollout status

Last updated: 2026-11-19, on branch `coord/wave0-guardrails`. Evidence is quoted, not summarised.
Legend: DONE (verified), DRAFTED (written, not applied; waits for the owner), PENDING, OWNER (only the owner can do it).

## Step 1. Clean rollback point: DONE (with one limit)

- Remote branch `backup/pre-multi-agent-20261119` = `2803e97cdbd459c82aef086c4b25bca9e6c582c4`, the production tip
  at the time (`git ls-remote` shows it). Same convention as the existing `backup/pre-profile-redesign`.
- A tag `rollback/pre-multi-agent-20261119` exists **locally only**: both pushes of it were rejected by the git
  relay ("remote end hung up"). The branch is the rollback point. The owner can add a tag from the GitHub UI
  (Releases -> new tag at that SHA) if a tag is wanted.
- To roll back production itself: revert on a branch and open a PR; the repository has no other mutable state.
  Database state is untouched by everything in Wave 0.

## Step 2. Permissions, triggers, secrets, protections: DONE (audit) / OWNER (changes)

Full detail in `github-protections.md`. Headlines:

- Repository is **public**; default branch **is** the deploy branch; **no branch is protected**; **no workflow
  uses an environment**, so nothing human-approves a deploy.
- Deploy triggers: only `push` to `claude/planning-session-61zwro` (`deploy.yml`) deploys. The other 29
  workflows are manual dispatches or push triggers on two old branch names; none of them deploys the site.
- Agent sessions act as the owner's GitHub account (PR author), so GitHub cannot separate agent from owner.
- 180 deploy runs on record; the latest successful one is the production tip above.

## Step 3. Branches, CI, ownership and ledger: DRAFTED in this branch (nothing merged or deployed)

| Item | Where | State |
|---|---|---|
| Ownership manifest | `agents/ownership.json` | done |
| Guard (hook, diff check, who) | `scripts/agent-guard.mjs`, `.claude/settings.json` | done, exercised by hand and by test |
| Ownership test | `src/lib/ownership.test.ts` | 76 tests, in the normal suite |
| PR gate | `.github/workflows/pr-verify.yml` | done; becomes a *required* check only when the owner applies the rulesets |
| CODEOWNERS, PR template | `.github/` | done (intent only; see the identity limit) |
| Ledger, task card, request template | `agents/` | done |
| Decision record in `CLAUDE.md` | "Progression is self-declared", Garden bullet, agent pointer | done; **new competitive rules NOT activated** |
| Preserved proposal | `architecture-proposal.md` | done |
| Rulesets | `github/ruleset-*.json` | DRAFTED, **OWNER** to apply |
| Deploy approval gate | `github/deploy-approval-gate.patch` | DRAFTED, **not applied** (changes production deploy behaviour: needs approval) |
| Asset audit and plan | `asset-audit.md` | audit done; every action needs approval |
| `integration` branch | pushed from the production tip | see Step 3 evidence below |

Verification run on this branch: `npm run verify` exit 0, 131 test files / 2,065 tests. A clean-checkout
baseline on the production tip took **61 s** (12 s for `npm ci`), so the PR gate is cheap enough to run on every PR.

## Environment recommendation: isolated cloud sessions

This coordinator runs in a cloud container with its own clone, a remote-session API (`create_session`,
`get_session`, `send_message`-style follow-ups, scheduled wakeups), and pushes branches that become reviewable
PRs. That satisfies the three conditions the owner set: persistent work (branches on the remote), separate
branches, reviewable PRs. So: **one cloud session per task, spawned by the coordinator, no terminals for the owner
to manage.** Two things shaped the design:

- A cloud session cannot be given its own environment variables, so the role comes from the **branch prefix**
  (`agent/scan/*` and so on) rather than `AGENT_ROLE`. The hook supports both.
- Sessions can use a per-task cap on turns, but a hard dollar limit per session is not something this tooling
  exposes; budget control is by task size and the plan-level limits the owner sets.

Fall back to local worktrees (`agents/README.md`) only if cloud sessions prove unable to push or open PRs reliably.

## Steps 4-6: PENDING

4. Pilot: one isolated agent task through branch -> PR -> `integration` -> merge, using a deliberately
   boring task and one deliberately out-of-lane edit to prove the guard fails.
5. Prove no production deploy: list deploy runs before and after (expected: none).
6. Launch the three lanes only after 4 and 5 pass **and** the owner has applied the deploy gate, because until
   then a lane agent running as the owner could still push to the deploy branch.
