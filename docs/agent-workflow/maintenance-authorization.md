# One-time maintenance authorization

For the single case the ownership guard is built to refuse: a change to a Tier 0 area (your photographs, evidence,
card art, generated data) that **you** have approved. It is not a bypass role, it does not let a failing check
merge, and it is inert until you arm it.

## What it can do
Excuse the deletion of an **exact list of files**, nothing more. Today there is one authorization,
`agents/maintenance/untrack-private-assets-2026-11.json`: 928 files, namely the 48 personal photographs and the
880 evidence image binaries (photos, candidate previews, segmentation images). The list is in the repository,
merged **before** any deletion, so you can review it first; it is not something an agent decides at merge time.

## What it cannot do
| Attempt | Result (simulated against the real 928-deletion commit) |
|---|---|
| Delete the listed files, authorization not armed | Rejected. `guard` fails |
| Armed with a wrong hash | Rejected |
| Armed correctly, but from any branch other than `coord/untrack-private-assets` | Rejected |
| Armed correctly, plus one other protected file edited in the same PR (for example `AGENTS.md`) | Rejected; **only** that file is reported, the 928 are excused |
| Armed correctly, plus a *new* file added under protected evidence | Rejected |
| Delete a file that is not on the list, or a listed path whose content has since changed | Rejected (each entry pins the exact content by git blob id) |
| After 2026-12-31 | Rejected (expiry) |
| Any change to anything else, any failing test or build | Unchanged: `guard` and `verify` still decide |

The list stores each path as a SHA-256 and each file's exact content as its git blob id, so it also names no
file in the clear. It is deletions only: an addition or modification under a protected area is never excused.

## How you arm it (and disarm it)
1. Merge the pull request that adds this mechanism (it is inert on its own).
2. Settings -> Secrets and variables -> Actions -> **Variables** -> New repository variable.
   Name `MAINTENANCE_AUTH`, value = the SHA-256 printed in the untrack pull request's description (also
   `shasum -a 256 agents/maintenance/untrack-private-assets-2026-11.json`, which must match).
3. In the untrack pull request: Checks -> **Re-run all jobs**. `guard` should now pass and say it excused 928
   listed deletions.
4. After it merges, **delete the variable**. The authorization is spent; the expiry is a backstop.

## The one honest limit
`.github/workflows/pr-verify.yml` is read from the pull request itself (that is how GitHub runs `pull_request`
workflows). A pull request that **edits that workflow** could in principle feed the guard a value you did not set.
The base-branch copy of the guard and the manifest close the rest of the loop, but not this one. The mitigation is
procedural and stated plainly: **a pull request that touches `.github/workflows/`, `agents/ownership.json`,
`agents/maintenance/` or `scripts/agent-guard.mjs` is merged by you, never by the coordinator.** The coordinator
does not merge them even when checks pass; CODEOWNERS lists them for you for that reason, and the coordinator
announces each one. GitHub's native fix for this (required workflows) is an organization feature.

## If you would rather not use it
The manual alternatives, none of which weaken anything:
- **Do it yourself.** On your computer: `git clone`, `git rm -r --cached` the same paths, add the ignore rules,
  push a branch, open a PR, and merge it yourself with the **guard check failing** only if you are prepared to use
  the owner's administrator override on that single PR. This is the thing you asked me not to build around, so I
  recommend against it.
- **Leave the files tracked** and rely on ownership rules keeping agents out of them. This leaves the 1.4 GB in
  every checkout and the photographs in the current tree of a public repository.
