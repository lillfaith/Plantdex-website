# plantdex-release

The only place that can publish plantdex.online. The Claude GitHub App is deliberately **not** installed on this
repository, so no agent session can edit it, run its workflows or approve anything here. Only the owner, signed in,
can use it.

## To release
1. In the app repository, note the full 40-character commit SHA on the production branch you want live.
2. **Actions -> Publish plantdex.online -> Run workflow.** Paste the SHA.
3. Leave **publish** unticked for a dry run (builds and tests that commit, publishes nothing). Tick it to go live.

The run refuses any commit that is not on the app's production branch, runs the same checks as the app's own deploy,
builds with this repository's variables, and (only if ticked) publishes through this repository's `github-pages`
environment.

## Variables this repository needs (public values, copied from the app repository's Actions variables)
`SITE_DOMAIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_ID`,
`NEXT_PUBLIC_STRIPE_PAYMENT_LINK`, `NEXT_PUBLIC_DECK_PRICE`, `NEXT_PUBLIC_DONATE_URL`.
**Do not set `SITE_DOMAIN` here until the domain move is approved**: it makes the build write the CNAME for the live domain.

See `docs/agent-workflow/release-repository.md` in the app repository.
