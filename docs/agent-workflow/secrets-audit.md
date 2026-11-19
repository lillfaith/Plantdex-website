# Secrets audit and environment migration plan (2026-11-19)

Names only; **no value was read, printed or logged**. Method: every workflow file on all 18 remote branches
(79 distinct versions across 70 file names) parsed for `secrets.*`, triggers, write permissions and
`environment:`. **No workflow on any branch uses a GitHub environment**, so every secret below is a plain
repository secret readable by a job in a run of any workflow on any branch.

## Why this matters now
An agent session can push a branch containing a new workflow file (measured). A new `on: push` workflow runs
from that branch with every repository secret. Environment-scoped secrets close that: an environment's secrets
are released only to a job that names the environment **and** runs on a branch the environment allows, and the
environment can require the owner's approval first.

## Secrets in use (12)

| Secret | Used by | Reaches | Needs production? | Plan |
|---|---|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | 14 workflows, 37 uses | Supabase **management API**, both projects (a personal access token is account-wide) | Only 3 workflows need to act on production: `deploy-function`, `run-migration`, `release-checkpoint` (and the read-only `check-*`, `function-identity`, `verify-plant-id` when pointed at production). The rest are test-only. | Split into **two tokens in two environments** (below). Rotate. |
| `SUPABASE_TEST_ACCESS_TOKEN` | 2 workflows on one branch (`verify-supabase-live`, one `comparison-account`) | Test project | No | Someone already began separating the test token. Adopt it as the value for `supabase-test`. |
| `TEST_ACCOUNT_PASSWORD` | 4 workflows, all hard-scoped to the TEST project | One disposable test account | No | `supabase-test` environment. Change the account password after migration. |
| `SPECIES_ATTESTATION_SECRET` | 2 workflows on one branch | Signs species tokens for the test project's functions | No (test) | `supabase-test`. Do **not** rotate the production function secret as part of this (it would invalidate signed tokens a signed-out player may still hold, 90-day lifetime). |
| `ANTHROPIC_API_KEY` | `vision-review` (push to `claude/botanical-catalog-stage-1` or manual) | Paid Anthropic API | No, but it **spends money** | `anthropic-paid` environment with the owner as required reviewer; use a dedicated key with a monthly cap in the Console. |
| `CLAUDE_CODE_OAUTH_TOKEN` | `claude.yml` (any `@claude` comment) | The owner's Claude subscription | No | `claude-assistant` environment, default branch only. Re-issue after migration. |
| `PLANTDEX_ASSET_BUCKET` / `_ENDPOINT` / `_KEY_ID` / `_SECRET` | `photo-candidates` | Cloudflare R2 bucket | No | `asset-store` environment. Make sure the key is bucket-scoped. |
| `PLANTDEX_DROPBOX_TOKEN` | `photo-candidates` | Dropbox | No | `asset-store`. App-folder scope only. |

**What is not a secret problem:** the card-production line on `claude/production-system-v1` (about 30
push-triggered workflows with `contents: write`) references **no** secrets, so it is unaffected by this
migration. `deploy.yml` references none either; it deploys with the repository's Pages permission and public
build variables.

## Proposed environments

| Environment | Holds | Allowed branches | Required reviewer | Admin bypass |
|---|---|---|---|---|
| `supabase-production` | the production-capable `SUPABASE_ACCESS_TOKEN` | production branch only | **owner** | **off** |
| `supabase-test` | test-scoped `SUPABASE_ACCESS_TOKEN`, `TEST_ACCOUNT_PASSWORD`, `SPECIES_ATTESTATION_SECRET` | production branch + `integration` (not agent branches) | none | off |
| `anthropic-paid` | `ANTHROPIC_API_KEY` | production branch + `claude/botanical-catalog-stage-1` | **owner** | off |
| `asset-store` | the R2 and Dropbox values | production branch | none | off |
| `claude-assistant` | `CLAUDE_CODE_OAUTH_TOKEN` | production branch | none | off |
| `github-pages` (exists) | none (it gates the deploy) | production branch | **owner** | **off** |

The same secret name (`SUPABASE_ACCESS_TOKEN`) lives in both Supabase environments with **different values**, so
the workflows need no renaming: the job picks the environment, and the environment supplies the matching token.
The patch derives that from the existing `project_ref` input.

## The exact workflow change (NOT applied)
`github/secrets-to-environments.patch`: 17 files, **17 added lines, nothing removed**: one `environment:` line
under `runs-on:` in each job that reads a secret. For the 11 workflows that take a `project_ref` input it is

```yaml
environment: ${{ inputs.project_ref == 'vygiamigomwlvnwkryyl' && 'supabase-production' || 'supabase-test' }}
```

so choosing the production project asks for the owner's approval and releases the production token; choosing
the test project does neither. The four workflows that are hard-scoped to test (`field-run`,
`identification-pilot`, `test-identification-config`, `comparison-account`) name `supabase-test`. The rest name
`anthropic-paid`, `asset-store` or `claude-assistant`.

**Effects.** Behaviour is unchanged once the environments exist and hold their secrets. Until then the affected
jobs would fail to find their secret, so the order is: create environments and add secrets, then merge the patch,
then delete the repository-level secrets. A workflow that names an environment that does not exist makes GitHub
create an empty, unprotected one, which is why the owner creates them first.

## Least-privilege workflow permissions
- Repository setting: workflow `GITHUB_TOKEN` default = read-only (owner setting, checklist step 7).
- `pr-verify.yml` already declares `contents: read` only.
- Workflows that write (`contents: write`) are the card-pipeline and evidence ones; they need it to commit
  results. Leave as is.
- Anything with `id-token: write` is `deploy.yml` (Pages) and `claude.yml`; both need it.

## Safe rotation plan (after migration, values never pasted into chat)
1. Create the new value at the provider (Supabase account tokens page, Anthropic Console, Cloudflare R2 tokens,
   Dropbox app console, `claude setup-token`).
2. Enter it **directly into the matching environment** in GitHub (Settings -> Environments -> secret). Do not
   paste it into a chat, an issue, or a file.
3. Run one read-only workflow that uses it (for example `check-supabase-token` against the test project) and
   confirm it passes without printing the value.
4. Revoke the old value at the provider.
5. Delete the old repository-level secret in GitHub.
6. Order: test token first, then Anthropic key, then R2/Dropbox, then `CLAUDE_CODE_OAUTH_TOKEN`, then the
   production Supabase token last, in a quiet period, with the production reviewer ready to approve.
7. Do not rotate `SPECIES_ATTESTATION_SECRET` in production.
Rotation is a precaution: no sign of misuse was found (no hostile workflow, and the public repository gives
forks no secrets), but a write-capable credential was able to read them, so assume exposure is possible.

## Limits
A Supabase personal access token cannot be restricted to one project or to read-only (**unverified**; confirm in
the dashboard). If so, the only true isolation between test and production is two tokens owned by two
different accounts or organizations, where the test one owns only the test project. That is a Supabase-side
setup the owner would do once.
