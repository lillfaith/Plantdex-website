# Owner checklist: what only you can do in GitHub

Everything below needs your personal account. Order matters. No secret value ever goes in a chat, issue, file
or screenshot; type or paste it only into the GitHub secret box or the provider's own page. When a step is done,
tell me its number; I run the matching acceptance test.

Repository settings live at `https://github.com/lillfaith/Plantdex-website/settings`.

## Step 1. Read the Claude GitHub App's permissions (2 minutes; decides how strong the guarantees can be)
GitHub -> your profile photo -> **Settings** -> **Applications** -> **Installed GitHub Apps** -> **Claude** ->
**Configure**. Scroll to **Permissions** and send me the permission *names* and whether each says Read or Write
(for example "Contents: Write"). I need especially: **Administration, Actions, Deployments, Environments,
Secrets, Workflows, Pull requests, Contents**. If Administration, Environments or Secrets say Write, stop and tell
me before anything else.

## Step 2. Create the integration ruleset, then the production ruleset (5 minutes)
Settings -> **Rules** -> **Rulesets** -> **New ruleset** -> **Import a ruleset**.
1. Import `docs/agent-workflow/github/ruleset-integration.json`. Check: Enforcement **Active**, **Bypass list
   empty**, target `integration`. Save.
2. Import `docs/agent-workflow/github/ruleset-production.json`. Same checks; target is the production branch.
   Save.
Effect: nobody (including you) can push directly to those two branches, force-push or delete them; every change
arrives through a pull request whose `guard` and `verify` checks pass. Direct pushes you used to make to the
production branch stop working. Your card-production branch is not affected.

## Step 3. Create six environments (10 minutes)
Settings -> **Environments** -> **New environment**, for each name in this table. For each: under **Deployment
branches and tags** choose **Selected branches and tags** and add the listed branches. Where a reviewer is listed,
tick **Required reviewers** and add yourself, and leave **Prevent self-review OFF**. For **every** environment,
untick **Allow administrators to bypass configured protection rules**.

| Environment | Branches allowed | Required reviewer |
|---|---|---|
| `github-pages` (already exists) | the production branch only | you |
| `supabase-production` | the production branch only | you |
| `supabase-test` | the production branch and `integration` | none |
| `anthropic-paid` | the production branch and `claude/botanical-catalog-stage-1` | you |
| `asset-store` | the production branch | none |
| `claude-assistant` | the production branch | none |

## Step 4. Put each secret into its environment
Add the secret *inside* the environment (Environment -> **Add environment secret**), not at repository level. Use the
same names the workflows already read (`docs/agent-workflow/secrets-audit.md` lists them). Where you can, use
**new** values instead of copying old ones: that makes step 8 free. If you use the existing production Supabase
token, put it only in `supabase-production`; put a separate, test-only token in `supabase-test` if you can create
one (a second Supabase account that owns only the test project is the clean way).

## Step 5. Approve (or decline) the two workflow changes
I will open pull requests into `integration` containing them, and show you the plain-language effect again.
- `github/secrets-to-environments.patch` (17 files, 17 added lines): every job that reads a secret declares which
  environment it uses. **Only merge after steps 3 and 4.**
- `github/deploy-approval-gate.patch` (1 file, 7 added lines): the deploy job uses the `github-pages`
  environment, so it waits for your click. **This changes production deployment behaviour**: from then on, every
  push to the production branch pauses until you approve it in the Actions tab.

## Step 6. Actions settings
Settings -> **Actions** -> **General**:
- **Workflow permissions** = *Read repository contents and packages permissions*; leave "Allow GitHub Actions to
  create and approve pull requests" **unticked**.
- **Fork pull request workflows**: *Require approval for all outside collaborators*.
- (Optional) **Actions permissions** = *Allow select actions* (GitHub, plus the few third-party ones the workflows use).

## Step 7. General settings
Settings -> **General** -> tick **Automatically delete head branches**. Then delete the leftover branches
`coord/wave0-guardrails`, `coord/wave0-results`, `agent/scan/pilot-001` and `agent/scan/guard-negative-test`
(Code -> Branches); the session's git relay cannot delete remote branches.

## Step 8. Rotate, after steps 3-5 work (`secrets-audit.md`, "Safe rotation plan")
Create new values at each provider, enter them in the environments, run one check workflow, revoke the old value,
delete the repository-level secret.

## Step 9. Private backup before any file leaves tracking
On your own computer: `git clone --mirror https://github.com/lillfaith/Plantdex-website.git plantdex-mirror.git`
and keep it somewhere private (an encrypted drive). That single folder contains every file and every branch,
including the photographs and the evidence. I will also send you a zip of the 48 photographs. Tell me when the
mirror exists; I then ask you to approve the "untrack" pull request.

---

## Acceptance tests I will run (and what each proves)

| # | Test | Expected | Possible now? |
|---|---|---|---|
| 1 | An agent creates and updates its own feature branch | Succeeds | Done (pilot session) |
| 2 | An agent pushes directly to `integration` / the production branch | **Rejected by GitHub** (ruleset message) | After step 2. I will only test `integration` directly; for production I read the branch's protected state instead of pushing |
| 3 | An out-of-lane file change in a pull request | `guard` check fails | Done (PR #27) |
| 4 | A pull request with a failing check | **Merge refused** | After step 2, with a throwaway PR |
| 5 | A normal merge into `integration` | No deploy run | Done twice; repeated after step 5 |
| 6 | A production deployment waits for you, and an agent cannot release it | Run shows "waiting"; you reject it; nothing publishes | After steps 3 and 5. **Cannot be fully proven** if step 1 shows the Claude App can approve deployments; see `credential-isolation.md` |
| 7 | An agent reads a production secret from a pushed branch | Value unavailable, job refused by the environment's branch rule | After steps 3-5, using a harmless probe workflow that prints only whether a variable is set, never its value |
| 8 | An agent edits a ruleset or environment | No tool exists; the App lacks Administration | Read from step 1 |

Tests 2, 4 and 6 are the ones that need your steps first. If 6 or 8 cannot be enforced by GitHub for the account
as configured, I stop and say so rather than call it done.
