# Supabase setup

This directory holds the V0.3 accounts backend: a Postgres schema (with Row Level
Security) and one edge function. See `CLAUDE.md`'s "When adding a backend (V0.3)" section
for the design rationale.

## Two projects, and which is which

| | Project ref | Role |
|---|---|---|
| **Production** | `vygiamigomwlvnwkryyl` | Real players. Its anon key is the one in the repo's Actions **variables**, baked into the deployed export. |
| **Test** | `vgjehmwcpavflbfhbbrp` | Where `npm run verify:supabase` runs. Its anon key belongs in the local `.env.local`. |

They are separate because the live suite signs up real users, writes real rows and then
attacks the database as a second user. None of that belongs in the database real players
use, and the two settings below have to differ between them — which is only possible if
they are two projects.

|  | Production | Test |
|---|---|---|
| Confirm email (Authentication → Sign In / Providers → Email) | **on** | **off** |
| Redirect allow-list | the GitHub Pages origin | `http://localhost:3000` |

Confirm email **off** on the test project is not a convenience: with it on, `signUp` returns
a user but no session, so the suite has nothing to sign in with and every later assertion is
vacuous. On production it must be **on**, and the signup confirmation link then lands on
`/account/` via `emailRedirectTo` (`src/lib/auth-redirect.ts`) — which means the exact URL
`https://<pages-origin>/Plantdex-website/account/` has to be on that project's redirect
allow-list, trailing slash included, or Supabase refuses the redirect.

An anon key is public by design (RLS is the boundary), so both live in the clear. Keep them
matched to their project all the same: a key from the other project fails with "This API key
might also be owned by another Supabase project", which reads like a broken key rather than
a mixed-up one.

## One-time setup

1. Create a project at [supabase.com](https://supabase.com) and note its Project URL and
   anon public key (Project Settings → API).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and run
   `supabase login`, then `supabase link --project-ref <your-project-ref>` from the repo
   root.
3. Apply the schema: `supabase db push` (runs everything in `migrations/`).
4. In Supabase's dashboard, under Authentication → URL Configuration, set the Site URL to
   your GitHub Pages origin and add it plus `http://localhost:3000` to the redirect
   allow-list. Enable the Email provider.
5. Deploy the edge functions — **run the sync script first**, since
   `supabase/functions/_shared/herbdex/` is generated, not hand-edited:
   ```bash
   npm run sync:edge-shared
   supabase functions deploy herbdex-action
   supabase functions deploy delete-account
   ```
   `delete-account` needs `SUPABASE_SERVICE_ROLE_KEY` in its environment. Supabase injects
   it into every function automatically, so there is nothing to configure — and nothing to
   paste anywhere, which is the point: that key bypasses every RLS policy in the project and
   must never appear in `.env.local`, in the repo, or in any GitHub variable. It is the one
   credential in this system that is not safe to publish.

   Without this function deployed, "Delete my account" reports a failure and deletes
   nothing. That is the intended behaviour — a partial deletion would be worse — but it
   means the two must ship together.
6. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as GitHub repo
   **variables** (Settings → Secrets and variables → Actions → Variables) so
   `.github/workflows/deploy.yml` can bake them into the static export, and to a local
   `.env.local` for `npm run dev` (copy `.env.example`). Add
   `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` there too if you want analytics; left unset, no script
   loads and no event is sent.

## Verifying it actually works

With the schema applied, the function deployed and `.env.local` filled in:

```bash
npm run verify           # lint + typecheck + unit tests + build
npm run verify:supabase  # live end-to-end against the real project
```

`npm run verify:supabase` (`e2e/supabase.e2e.test.ts`) signs up two real users and checks
auth, session persistence, per-user progress, sightings, server-recomputed mastery,
XP/level derivation, garden state, and idempotency — then attacks the database as the
second user, attempting cross-user reads, forged-`user_id` inserts, updates and deletes in
every table plus the private photo bucket. Those tests pass only when Postgres refuses.

If signup fails in the browser with **"String contains non ISO-8859-1 code point"**, the
anon key baked into the deployment carries a character that cannot go in an HTTP header -
almost always an en dash pasted where a hyphen belongs, or a zero-width space picked up on
the way through a doc or a chat client. Re-copy the value as plain text into
Settings -> Secrets and variables -> Actions -> Variables and redeploy.
`src/lib/supabase-client.ts` reports the variable, the character and its position at
startup, so the browser console will name it.

Two project settings it depends on:

- **Email confirmation must be off on the test project** (Authentication → Sign In /
  Providers → Email → "Confirm email"), or signup never issues a session and the suite
  cannot sign in. It stays **on** for production — see the table at the top; this is the
  main reason the two are separate projects rather than one.
- **The `herbdex-action` function must be deployed**, or the mastery/research tests fail
  with a message saying so.

The suite deletes every row it creates. Most of the users it creates survive — the suite
holds no service-role key of its own — so test accounts accumulate; remove them from the
dashboard periodically. The exception is the `account deletion` group, which creates two
throwaway users and destroys them through the real `delete-account` function, which is
exactly what those tests are checking.

- **The `delete-account` function must be deployed too**, or that group fails immediately
  with a message saying so, rather than three unreadable Response dumps.

## Checking the edge function without deploying it

`supabase/functions/**` is excluded from this project's tsconfig and ESLint — it is Deno,
with different globals and `npm:`/`https:` specifiers — so `npm run verify` cannot see it.
Type-check it directly:

```bash
npx deno@2 check supabase/functions/herbdex-action/index.ts
```

`npx` rather than an installed Deno because `deno.land` is unreachable from some sandboxes
while the npm registry is not. This catches what a deploy would not: `supabase functions
deploy` bundles with esbuild and does not type-check, so a type error rides along silently.

`src/lib/edge-shared.test.ts` covers the other half — that the generated `_shared/` copies
match their sources and that every import specifier would resolve under Deno.

After deploying, check the CORS preflight, which nothing else can see:

```bash
curl -i -X OPTIONS "https://<project-ref>.supabase.co/functions/v1/herbdex-action" \
  -H "Origin: https://example.com" -H "Access-Control-Request-Method: POST"
```

Expect **204** with an `access-control-allow-origin` header. A **401** means the deployed
copy predates the CORS handling, and every browser call to it is being blocked before the
request is even sent — while `npm run verify:supabase` still passes, because Node does not
enforce CORS. Signed in, that failure is silent and total: `reconcile()` returns null and no
mastery or Field Research is ever awarded.

## After changing anything in `src/lib/{types,herbdex-state,deck,achievements,progression,mastery,rng,research,herbdex-reducer}.ts`

Re-run `npm run sync:edge-shared` and redeploy the function — the copies under
`supabase/functions/_shared/herbdex/` are what actually runs server-side, and they only
stay correct if this step isn't skipped.
