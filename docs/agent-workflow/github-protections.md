# GitHub protections: what exists, what is drafted, what the owner must switch on

Written 2026-11-19 from direct inspection. Anything marked **[owner]** cannot be changed from an agent
session (no admin API access) and has to be done in the GitHub settings pages.

## 1. Verified facts

| Fact | Evidence |
|---|---|
| The repository is **public**. Rulesets and environment approvals are available on the free plan for public repositories. | GitHub search API: `visibility: public` |
| The **default branch is the production branch**, `claude/planning-session-61zwro`. A push to it deploys to the live site. | `default_branch` from the API; `deploy.yml` `on.push.branches` |
| **None of the 12 remote branches is protected.** | `protected: false` on every row of the branch list |
| **No workflow uses a GitHub environment**, so no approval gate or deploy-branch rule is attached to anything. | `grep environment: .github/workflows` finds nothing |
| Agent sessions push and open PRs **as the repository owner's own GitHub account**. PRs #18-22 are authored by that account. | PR list |
| The only PR-triggered workflow before this change was `claude.yml` (an `@claude` comment responder). Checks ran after the push, inside the deploy job. | workflow triggers |
| 30 workflows. 5 hold `contents: write`. Most are manual dispatches that read `SUPABASE_ACCESS_TOKEN`, which can address the **production** project; six workflows run on a push to one of two old branch names. | workflow review |
| Secrets referenced (names only): `SUPABASE_ACCESS_TOKEN` (37 uses), `TEST_ACCOUNT_PASSWORD`, `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`, and the `PLANTDEX_ASSET_*` / `PLANTDEX_DROPBOX_TOKEN` storage credentials. All are plain repository secrets. | `grep secrets.` |
| Tags cannot be pushed from agent sessions (the git relay rejected two attempts). | tag push attempts |
| A rollback branch exists: `backup/pre-multi-agent-20261119` at `2803e97`. | `git ls-remote` |

## 2. The limit that shapes the design

Because agents act as the owner's account, **GitHub cannot tell an agent from the owner**. Consequences:

- "Require an approving review" would deadlock (an author cannot approve their own PR) or, if bypassed,
  mean nothing. The rulesets below therefore require a pull request and passing checks, with **zero
  required approvals**.
- CODEOWNERS review is likewise unenforceable against the same identity. It is kept as a statement of
  intent and for any future second contributor.
- What an agent holding the owner's token **cannot** do depends on that token's scopes, which this
  environment does not reveal. The tests in section 6 measure it instead of assuming.

So the protection that cannot be talked around is **a human click in the Actions tab**: a required reviewer
on the deploy environment. Everything else limits blast radius and catches mistakes.

## 3. Layers, strongest first

1. **Deploy approval gate [owner].** Give the `github-pages` environment a required reviewer (the owner) and
   a deployment-branch rule (production branch only), and make the deploy job use it. The one-line change
   is drafted in `github/deploy-approval-gate.patch` and **has not been applied** (it changes production
   deployment behaviour). Until it is applied and the environment is configured, a push to the production
   branch deploys with no human step. This is the single most important item on the page.
2. **Rulesets [owner]: no direct pushes, no force pushes, no deletion, PR + passing checks required** on the
   production branch and on `integration`. Files: `github/ruleset-production.json`,
   `github/ruleset-integration.json`. Leave the bypass list empty. Applying them to production changes how
   the owner's own pushes work: every change reaches production through a PR from `integration`.
3. **PR gate (applied in this branch).** `.github/workflows/pr-verify.yml`: no secrets, read-only, runs the
   full `npm run verify` (about 75 seconds clean) and the lane-ownership check, and refuses any PR into
   production that does not come from `integration`. Made a *required* check by the rulesets above.
4. **Credentials.** Implementation agents get no Supabase, provider, R2 or deploy credentials in their session
   environment. Unit tests need none. The live suite (`npm run verify:supabase`) is coordinator-only and
   targets the test project only.
5. **Hooks and manifest (applied in this branch).** `agents/ownership.json`, `scripts/agent-guard.mjs`,
   `.claude/settings.json`, `src/lib/ownership.test.ts`. They catch out-of-lane edits, edits outside a
   worktree, and the GitHub tools that act outside a worktree. **They are not a security boundary** and the
   document above is why they are listed last.

## 4. What the owner switches on (about ten minutes, once)

Run from any machine with the GitHub CLI signed in as the owner (the commands are the same as the web form):

```bash
# 1. Create the integration branch (the coordinator can also do this), then protect both branches.
gh api --method POST repos/lillfaith/Plantdex-website/rulesets --input docs/agent-workflow/github/ruleset-integration.json
gh api --method POST repos/lillfaith/Plantdex-website/rulesets --input docs/agent-workflow/github/ruleset-production.json
```

Do the production ruleset only after `pr-verify.yml` exists on that branch, or no PR can ever satisfy its
required checks.

**Deploy gate.** Settings -> Environments -> `github-pages`: add yourself under *Required reviewers*; under
*Deployment branches and tags* choose "Selected branches" and allow only `claude/planning-session-61zwro`;
leave "Prevent self-review" **off** (you are the only reviewer). Then approve the change in
`github/deploy-approval-gate.patch`.

**Actions settings.** Settings -> Actions -> General: workflow permissions = *Read repository contents*;
"Approval for running fork pull request workflows" = *Require approval for all outside collaborators*.

**Housekeeping that reduces the attack surface:**
- Retire the two branch names that six workflows still trigger on (`claude/botanical-catalog-stage-1`,
  `claude/plantdex-v0-3-supabase-verify-iic8pz`): a push to a branch with one of those names runs a
  workflow, and some of them read secrets or hold `contents: write`. Both branches exist today and are
  unprotected. Do not delete them without the owner (they hold unmerged work); protecting them with a
  ruleset that blocks updates achieves the same thing without losing anything.
- Confirm `claude.yml` only reacts to people with write access (the `@claude` responder is open to comments
  from anyone on a public repository).
- Do **not** make the repository private on a free plan to hide files: private repositories lose rulesets and
  environment approvals unless the plan is paid, and Pages needs a paid plan too. Remove the files (see
  `asset-audit.md`), do not hide the repository.

## 5. Secrets: the larger structural risk

Every secret is a plain repository secret, readable by **any workflow run from any branch**. Anyone able to
push a branch containing a workflow file can print them. Whether agent sessions can push workflow files at
all is a question of the token's scope and is tested in section 6. The durable fix is to move the
production-capable secrets into **environments with reviewers and a branch rule**, which means editing the
workflows that use them, so it is queued for approval rather than done here:

1. Create environments `supabase-test` (no reviewers) and `supabase-production` (owner as reviewer).
2. Re-point the 37 `SUPABASE_ACCESS_TOKEN` uses accordingly. A Supabase personal access token is account-wide,
   so the same token currently addresses both projects; a second, test-only token would be the real
   separation.
3. Same treatment for the `PLANTDEX_ASSET_*` and Dropbox tokens.

## 6. Verification plan (run during the rollout, results recorded in `rollout-status.md`)

| Question | Test | Pass means |
|---|---|---|
| Can an agent push a workflow file? | Push this branch (it adds `pr-verify.yml`) | Either answer is recorded: if refused, secrets are safe from branch-pushed workflows |
| Does pushing a lane/coordinator/integration branch deploy? | List deploy runs before and after | No new `Deploy to GitHub Pages` run |
| Does the PR gate run on a PR into `integration`? | Open the Wave 0 PR | `guard` and `verify` both run and pass |
| Does the guard catch a violation? | Pilot task deliberately edits a Tier 0 path on a throwaway branch | `guard` fails |
| Can an agent approve a deployment or change settings? | Attempt via the available API tools | Refused (not attempted until the environment gate exists) |
| Does merging to `integration` leave production untouched? | Merge the pilot; list deploy runs | No deploy run |
| Does the owner's gate hold? | After the owner applies the patch, merge a no-op promotion | The deploy job waits for approval |

## 7. Residual risk, stated plainly

Until section 4 is done, an agent session holding the owner's credentials can still push to the production
branch, and that deploys. The hook and manifest do not change this. The pre-commit hook only helps on a
machine that installed it. This is the reason implementation lanes are not launched until the gate is in
place and the tests above pass.
