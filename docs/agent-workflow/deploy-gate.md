# The production deploy gate: the exact change, what it does, and who can approve

Nothing here is applied. The patch is `github/deploy-approval-gate.patch` (15 added lines, 0 removed, one file).
It changes production deployment behaviour, so it waits for your explicit approval after you have read this.

## The change
The final step of `deploy.yml`'s single job (`actions/deploy-pages`) becomes its own job:

```yaml
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Everything above it (checks, build, the Boss Form guard, the CNAME write, the Pages artifact upload) is untouched,
and so are the workflow's triggers, `concurrency` group and `permissions`.

## Behaviour after the change
1. A push to the production branch starts `build` immediately, exactly as today. It runs lint, types, tests, builds
   the export and uploads it as an artifact. No approval is needed for this part, and it holds no secrets.
2. If `build` fails, nothing else happens.
3. If it passes, `deploy` is created and **stops** at "Waiting for review". The run page shows a "Review
   deployments" button to the environment's required reviewers.
4. **Approve** publishes that exact, already-tested artifact to plantdex.online. **Reject** publishes nothing;
   the live site stays as it was.
5. While a deployment waits, the `pages-deploy` concurrency group keeps later pushes queued behind it. Only the
   newest queued run is kept, so approve or reject promptly or the older waiting run is superseded. This is the
   safe direction: a stale build is never published by accident.
6. The environment's settings (reviewer, allowed branches, administrator bypass) are set in GitHub, not in this
   file. **Without those settings the patch does nothing** (the job would run immediately), which is why the owner's
   steps come first and I will not merge the patch before you confirm them.

Not changed: what is built, the CNAME, the draft-question guard, the Supabase project, the custom domain.
Rollback: revert the commit; the site deploys as it does today.

## Why a required reviewer alone is not enough, and what I am proposing instead
The agents act through your GitHub account (measured: pull requests, pushes and merges all appear as you). An
approval is a call that the *reviewer's* identity makes. So the questions are:

1. **Can the Claude GitHub App approve a deployment as you?** It could if the App was granted write access on
   deployments/actions: GitHub's API for reviewing a pending deployment requires the caller to be a listed
   reviewer *and* to hold that permission. **I cannot verify this from here.** None of my tools offers an approval
   call (and I am not permitted to call the GitHub API directly), so I cannot even try. The authoritative answer is
   the App's permission list (checklist step 1).
2. Therefore **do not assume** that "required reviewer = me, self-review prevention off" is a human-only gate. If
   the answer to 1 is yes, an agent could approve its own deployment.

**The design that does not depend on the answer to 1: make the reviewer a different GitHub identity from the one
agents use.**
- Create a separate GitHub account used only to approve releases (call it the *release approver*), with its own
  strong password and a passkey or hardware key on a device that never runs a Claude session. Add it to the
  repository as a collaborator with **Read** access only (reviewers need read access; it can then push nothing).
- On the `github-pages` environment: **Required reviewers = the release approver only.** Your day-to-day account is
  *not* a reviewer. Turn **Prevent self-review ON** (now meaningful, because the person who pushes is you and the
  approver is someone else). Turn administrator bypass **off**.
- Result: an approval can only come from a login the agents do not hold. Whatever the Claude App is permitted to do
  as you, it cannot approve as the release approver. You approve by switching to that account in the browser when a
  release is waiting (about 20 seconds).
- A second *person* you trust works equally well as the approver, and is cleaner under GitHub's terms, which
  generally allow one personal account per person (a machine account for automation is allowed; check the current
  terms before creating an extra personal account).

The same reviewer protects `supabase-production` and `anthropic-paid`.

## If a separate approver is not possible: the hybrid
Run the implementation agents where I can give them a **restricted token of their own**: local sessions on your
computer, or a self-hosted runner, using a second (machine) GitHub account with a fine-grained token limited to this
repository and **only** Contents and Pull requests (no Workflows, Actions, Deployments or Administration). Then your
own account can safely be the reviewer and required reviews also work (the PR author is the machine account, not
you). Cost: those sessions stop being cloud sessions, which you said you would prefer to keep. I recommend the
separate approver first because it keeps cloud sessions.

## What I will verify once the environment exists (tests 6 and 8)
- A push to a throwaway branch cannot reach the production environment (its branch rule refuses it).
- A real (no-op) promotion produces a deployment in "waiting", and I confirm from the run's status that nothing was
  published before you act. You reject it, and I confirm the site did not change.
- I report exactly which of the above I could and could not observe from the tools I have.
