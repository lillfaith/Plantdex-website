# Owner checklist: only what requires your personal GitHub account

Everything not listed here I do myself (pull requests, patches, tests, documentation). No secret value ever goes into
a chat, an issue, a file or a screenshot: type or paste it only into the GitHub secret box or the provider's own page.
Repository settings live at `https://github.com/lillfaith/Plantdex-website/settings`. Tell me the step number when
done; I run the matching test and report the evidence.

## Part 1: identities and rules (about 20 minutes)

**1. Read the Claude GitHub App's permissions.**
Profile photo -> **Settings** -> **Applications** -> **Installed GitHub Apps** -> **Claude** -> **Configure** -> scroll to
*Repository permissions*.
Send me the permission names and Read/Write. I most need: Administration, Actions, Deployments, Environments, Secrets,
Workflows, Contents, Pull requests.
*Verify:* you have the list. If Administration, Environments or Secrets say Write, stop and tell me.

**2. Choose the release approver (the identity agents do not hold).**
Either a second GitHub account only you use, with a passkey or hardware key on a device that never runs a Claude
session, or a trusted second person. Then: repository **Settings** -> **Collaborators** -> **Add people** -> enter
that account -> role **Read**.
*Verify:* the account accepts the invitation and shows as **Read** under *Collaborators*. (Why: `deploy-gate.md`.)

**3. Merge the pull request that adds the maintenance authorization** (I will give you its number; it is inert until
armed). You merge it, not me, because it edits the guard.
*Verify:* the PR shows Merged, and `agents/maintenance/untrack-private-assets-2026-11.json` exists on `integration`.

**4. Import the two rulesets, integration first.**
**Settings** -> **Rules** -> **Rulesets** -> **New ruleset** ▾ -> **Import a ruleset** -> choose
`docs/agent-workflow/github/ruleset-integration.json` -> **Create**. Repeat with `ruleset-production.json`.
Settings to confirm on each: **Enforcement status = Active**, **Bypass list = empty**.
*Verify:* both listed as Active under *Rulesets*. Then tell me: I test that a direct push to `integration` is refused.
(Consequence: you can no longer push straight to the production branch either; changes arrive as PRs from `integration`.)

**5. Create the environments.** **Settings** -> **Environments** -> **New environment** (for `github-pages`, open the
existing one). For each, **Deployment branches and tags** -> **Selected branches and tags** -> add the branches in the
table; where a reviewer is listed tick **Required reviewers** and add the **release approver**; for **every**
environment untick **Allow administrators to bypass configured protection rules**.

| Environment | Branches allowed | Required reviewer | Prevent self-review |
|---|---|---|---|
| `github-pages` | production branch | release approver | **ON** |
| `supabase-production` | production branch | release approver | **ON** |
| `anthropic-paid` | production branch, `claude/botanical-catalog-stage-1` | release approver | **ON** |
| `supabase-test` | production branch, `integration` | none | n/a |
| `asset-store` | production branch | none | n/a |

*Verify:* each environment page lists exactly those branches, the reviewer, and "administrators can bypass" unticked.
(`claude-assistant` is not created yet; see `secrets-audit.md`.)

**6. Put secrets in their environments** (Environment page -> **Add environment secret**; same names as today).
- `supabase-production`: `SUPABASE_ACCESS_TOKEN` (production-capable).
- `supabase-test`: `SUPABASE_ACCESS_TOKEN` (a **test-only** token if you can make one, ideally from an account that owns
  only the test project), `TEST_ACCOUNT_PASSWORD`, `SPECIES_ATTESTATION_SECRET` if you use it.
- `anthropic-paid`: `ANTHROPIC_API_KEY` (a dedicated key with a monthly cap in the Console).
- `asset-store`: the four `PLANTDEX_ASSET_*` values and `PLANTDEX_DROPBOX_TOKEN`.
*Verify:* each environment shows its secret names (never values). Use **new** values where you can: that makes rotation free.

**7. Actions settings.** **Settings** -> **Actions** -> **General**.
- *Workflow permissions* -> **Read repository contents and packages permissions**; leave "Allow GitHub Actions to create
  and approve pull requests" **unticked**. (Checked: every workflow already declares what it needs, so none breaks.)
- *Fork pull request workflows* -> **Require approval for all outside collaborators**.
*Verify:* the page shows those selections after saving.

**8. Settings -> General -> Pull Requests -> tick "Automatically delete head branches".**
*Verify:* ticked. (Then delete the old test branches under **Code** -> **Branches**.)

**9. Make your private full backup** (on your own computer): `git clone --mirror https://github.com/lillfaith/Plantdex-website.git plantdex-mirror.git`, stored privately.
*Verify:* the folder exists and `git -C plantdex-mirror.git branch -a | wc -l` is about 20.

## Part 2: things I then do, and the two pull requests you merge
After steps 1-9 I run acceptance tests 2, 4, 6, 7, 8 (below) and open two pull requests that touch `.github/`, which
**you** merge (I never merge those): the **secrets-to-environments** patch (16 files) and the **deploy gate** patch.
Read `deploy-gate.md` first; do not merge the deploy gate until step 5 is verified.

## Part 3: the one-time cleanup authorization (when I ask)
**10.** **Settings** -> **Secrets and variables** -> **Actions** -> **Variables** -> **New repository variable**: name
`MAINTENANCE_AUTH`, value = the SHA-256 in the untrack PR description. Then in that PR: **Checks** -> **Re-run all jobs**.
*Verify:* `guard` passes and says it excused 928 listed deletions. I merge the PR once everything is green.
**11.** After it merges, **delete the variable.** *Verify:* the Variables list no longer shows it.

## Part 4: after the migration works
**12.** For each secret, in this order: new test token, Anthropic key, asset-store keys, production Supabase token last:
create the new value at the provider, put it in the environment, run one check workflow, revoke the old value at the
provider, then **delete the repository-level secret** of the same name (**Settings** -> **Secrets and variables** ->
**Actions** -> **Secrets** -> repository secrets). *Verify:* the repository secrets list ends up empty except the assistant token.

## Acceptance tests (what I run and what it proves)
| # | Test | Needs | Passes when |
|---|---|---|---|
| 1 | Agent creates and updates its own branch | nothing | Done (pilot) |
| 2 | Direct push to `integration` | step 4 | GitHub refuses it |
| 3 | Out-of-lane change | nothing | `guard` fails (done, PR #27) |
| 4 | PR with a failing check | step 4 | Merge refused |
| 5 | Integration merge does not deploy | nothing | No deploy run (done three times) |
| 6 | Production deploy waits for a human the agents cannot be | steps 2, 5 and the deploy gate PR | Deployment sits in "waiting"; you reject as the approver; the site is unchanged |
| 7 | A pushed throwaway workflow cannot read an environment secret | steps 5, 6 | The job is refused by the environment's branch rule |
| 8 | Agents cannot change rulesets, environments or secrets | step 1 | The App lacks Administration and no tool exists |
If 6 or 8 cannot be enforced by GitHub for the account as configured, I stop and say exactly why.
