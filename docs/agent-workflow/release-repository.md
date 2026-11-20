# The release repository: the simplest secure way to keep cloud agents and still control production

Status: PROPOSAL (nothing created, nothing activated). Supersedes `deploy-gate.md` and narrows the plan in
`secrets-audit.md`. It exists because of one measured fact.

## What the Claude GitHub App's permission list proves (owner-supplied, 2026-11-20)
| Permission | Consequence |
|---|---|
| Administration: **Read** only | Agents **cannot** change rulesets, branch protection or repository settings. Good: the rulesets hold. |
| Secrets, Environments, Variables: **not granted** | Agents **cannot** create, read or change environment settings, environment secrets, or repository variables. So the `MAINTENANCE_AUTH` variable can only be set by you. |
| Actions: **Read & Write**, Workflows: **Read & Write**, Code and Pull requests: **Read & Write** | Agents **can** edit workflow files, merge pull requests (including into the production branch if checks pass) and run, re-run or cancel workflows. **They may also be able to approve a waiting deployment.** GitHub's rule for that is documented loosely and I cannot test it, so treat it as possible. |
| Repository creation: Read & Write; Repository hooks: Read & Write | Unusual for this job and not removable by you; the only lever is which repositories the App is installed on. |

Result: **inside this repository a required reviewer is not a boundary**, because the identity that must click
"Approve" is the same identity the App acts as. The same hole opens the environment secrets: an agent could merge a
workflow that uses an environment, approve its own run and read the secret. So production publishing and
production credentials must live **where the App cannot reach**.

## The setup (no second personal account)
A second, **public** repository in your own account, `plantdex-release`, on which **the Claude App is not installed**.
GitHub scopes the App's tokens to the repositories it is installed on, so agents cannot read, push to, dispatch, approve
or re-run anything there. You operate it from your own signed-in browser.

| Lives in the release repository | Stays in the app repository |
|---|---|
| The **publish** workflow (builds a commit you name and deploys it to plantdex.online) | All development, tests, the PR gate, rulesets, the ownership guard |
| Every workflow that needs a production credential or spends money: Supabase migrations and function deploys, release checkpoint, production checks | Test-only checks that need no credential |
| The production Supabase token, the paid Anthropic key, the asset-store keys | Nothing secret except, until you decide otherwise, the `@claude` responder's token |
| The custom domain and the Pages site | The app's own github.io preview, if any |

How a release works: in the release repository's **Actions** tab you press **Run workflow** on *Publish
plantdex.online* and give the full commit SHA. It refuses any commit that is not on the app's production branch, runs
the tests and build against exactly that commit, and publishes it. Nothing an agent does can start, approve or edit
that. Promotion PRs still happen in the app repository; they now just *prepare* a release instead of making one.

## What it costs you
One-time: create the repository, copy seven **public** repository variables across (Supabase URL and anon key,
Plausible id, Stripe payment link, deck price, donate URL, site domain), move the custom domain from the app repository's
Pages settings to the release repository's, and later press a button per release. I write every file; I can only push
to the release repository while you have temporarily added it to the App, which is a visible setting you switch on and
off (and switching it off is itself the acceptance test).

## Order of work (nothing live changes until step 6)
1. **Done:** the release repository exists, public, without the App. The App is restricted to the app repository only.
2. Owner temporarily adds the release repository to the App; I push the workflow and README; owner removes it again;
   I confirm GitHub now refuses me (the first acceptance test).
3. Owner copies the 7 public variables, **except `SITE_DOMAIN`**; enables Pages (source: GitHub Actions) in the release
   repository. A dry run of the publish workflow proves it builds. The live site is untouched.
4. A real publish to the release repository's own github.io address, with no custom domain, proves the pipeline end to end.
5. Copy over, then (later, separately approved) remove, the production-credential workflows.
6. **Domain move (separately approved, quiet window):** release repository claims plantdex.online, then the app
   repository's deploy job is removed. The old site keeps serving until the new one is verified.

## What I verify
1. After the App's access is restricted: I cannot push to or dispatch anything in `plantdex-release` (GitHub refuses).
2. A no-op publish of the current production commit works and leaves the site unchanged.
3. A throwaway branch in the app repository cannot publish anything, because no workflow there can.

## What I will not do without your approval
Remove the deploy job from the app repository's `deploy.yml` (that is the production-affecting change; it is the *last*
step, after step 2 above succeeds), or move any secret.

## Alternatives, and why they rank lower
- *You as the only required reviewer, here:* GitHub-enforced only if the App cannot approve deployments. Not provable.
- *A trusted second person as reviewer:* works, but needs a person.
- *Local agent sessions with a restricted machine token:* works, but gives up cloud sessions.

## Verified (2026-11-20): the Claude App cannot reach the release repository
Run after the owner merged the first pull request and removed `plantdex-release` from the App's repository list:

| Attempt, by the coordinator session | Result |
|---|---|
| `git push` of a throwaway branch to `plantdex-release` | **Refused**: HTTP 403, "Claude doesn't have GitHub access to lillfaith/plantdex-release". The branch is not on the remote. |
| GitHub API: create a branch in `plantdex-release` | **Refused**: 403 "Resource not accessible by integration". |

What was done while access was briefly granted: one branch and one pull request, with two files (the manual publish workflow
and its README), which the owner reviewed and squash-merged. The workflow has no secrets and no automatic trigger.
Leftover: the branch `setup/publish-workflow` in the release repository (the session can no longer delete it; the owner can).
