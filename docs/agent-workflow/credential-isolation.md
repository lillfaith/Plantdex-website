# Agent credentials: what GitHub can and cannot enforce today (2026-11-19)

The question: can implementation agents hold a **separate, restricted GitHub identity**, so that GitHub itself
(not a hook) stops them editing production workflows, changing rulesets, reading production secrets or
authorizing a deployment?

**Short answer: not with cloud sessions as they are configured. Part of it can be enforced by GitHub today; the
part that cannot is stated precisely below, with the upgrade path.**

## What is measured
| Fact | Evidence |
|---|---|
| Cloud sessions authenticate to GitHub through the owner's connected account and the Claude GitHub App. Pull requests and pushes show the owner as author and actor. | PRs #18-29 are all authored by the owner's account; workflow runs list the owner as actor and triggering actor |
| That credential **can push workflow files**. | The branch that added `pr-verify.yml` was accepted |
| It can merge pull requests and create branches. | The coordinator merged PRs #26, #28, #29 and created `integration` |
| It **cannot delete remote branches or push tags** through the session's git relay. | Two tag pushes and one branch delete were refused |
| The platform documentation offers no way to give a session, an environment or an individual agent a *different* GitHub identity. The credential tool explicitly excludes GitHub. | `read_documentation` pages "github.access" and "environment.secrets" |
| The GitHub tool set exposed to sessions has no function for rulesets, environments, secrets or approving deployments. | The tool list; it has dispatch/re-run/cancel, but nothing that edits repository settings |

Not measured (and not guessable from here): the **exact permission list of the Claude GitHub App**. The owner can
read it in one screen (checklist step 1).

## What binds regardless of identity (GitHub-enforced, applies to the owner's account too)
1. **Rulesets with an empty bypass list.** They block direct pushes, force pushes and deletion for everyone, and
   require a pull request and passing checks. The owner can still change them, but only in Settings.
2. **Repository settings are not reachable from a session.** Rulesets, environments and secrets need the
   Administration permission. The tool set above has no such function, and the App is very unlikely to hold
   Administration. Confirm in checklist step 1; if the App lists "Administration", stop and tell me.
3. **Environments with a branch rule and a required reviewer.** A secret held in an environment is released only
   to a job on an allowed branch, and a production job waits for a human to approve.

## What does NOT bind, because agents and the owner are one identity
- **Required pull-request reviews.** The author cannot approve their own PR, so a required approval deadlocks.
  That is why the rulesets require a PR and checks but set approvals to zero.
- **"Prevent self-review" on the production environment.** Leave it **off**. If it is on, the owner (the
  triggering actor) cannot approve a deploy the owner's own account pushed.
- **CODEOWNERS.** Same self-review limit. Kept as documentation of intent.
- **Anything that tells one session from another.** GitHub sees one actor.

## The one gap that matters
"A production deployment requires a human-controlled approval **that agent credentials cannot grant**."
Approving a waiting deployment is a write action on Actions/Deployments for the *reviewer's* identity. The
owner is the reviewer. If the Claude GitHub App holds the permission to review deployments (the App acts as the
owner), an agent holding that credential could approve. Today the **tools** offered to sessions contain no such
call, which is a harness limit, **not a GitHub guarantee**. So:
- If the App lacks Actions/Deployments **write**: the gate is enforced by GitHub. (Likely, but unverified; the
  existence of a workflow-dispatch tool suggests Actions is at least readable.)
- If the App has it: the gate depends on the tool set, which is good but not what was asked for.

## Update, second round: the independent human boundary
`deploy-gate.md` carries the design that does not depend on what the Claude App is permitted to do: **the required
reviewer is a different GitHub identity** (a separate release-approver account, or a trusted second person) that no
agent session holds, with self-review prevention ON, administrator bypass OFF, and a branch rule. An approval can then
only come from a login the agents do not have. The "hybrid" below remains the fallback if a separate approver is not
possible.

## Options, strongest first

| Option | What it gives | What it costs |
|---|---|---|
| **A. Keep the App identity; rely on rulesets, environments and the App's lack of Administration** (recommended now) | Everything in the "binds regardless" list, enforced by GitHub. Achievable immediately. | The deployment-approval gap above stays open unless the App lacks the permission. |
| **B. A dedicated machine account** (second GitHub user, collaborator with Write) **and a fine-grained token** limited to this repository with Contents and Pull requests only; **no** Workflows, Actions, Administration, Secrets or Deployments | The full set the owner asked for, enforced by GitHub: a token without the Workflows permission cannot push `.github/workflows`; without Actions it cannot dispatch; it cannot approve; required reviews work because the author is not the owner | Cloud sessions cannot use it today (no per-session GitHub identity, and the credential tool excludes GitHub). It means agents run where I can place the token: **local worktrees** or a self-hosted runner on the owner's machine, which gives up the "no terminals to manage" preference |
| **C. Ask Anthropic whether a session can run under a separately installed, narrower GitHub App** | Possibly the best of both | Unknown; not documented. Worth one support question. |
| D. A second GitHub *organization* | Lets rulesets and Apps be scoped per repository properly | Migration cost; does not by itself change the identity problem |

**Recommendation:** do **A now**, since nothing blocks it and it removes the largest exposures (production
secrets, deploy gate, direct pushes). Read the App's permission list (step 1) and run the acceptance tests. If the
App can approve deployments or reach settings, escalate to **B** for the lanes that matter, and ask the C question
in parallel. I will not claim the "agent credentials cannot grant" requirement is met until step 1 shows it.

## Second line (soft, kept)
The path hook, the PR `guard` check and the ownership test remain. They stop honest mistakes and out-of-lane
edits, and the PR check is real (a failing `guard` blocks a merge once it is a required check). They are not an
identity boundary and nothing here relies on them for that.
