# Supabase setup

This directory holds the V0.3 accounts backend: a Postgres schema (with Row Level
Security) and one edge function. See `CLAUDE.md`'s "When adding a backend (V0.3)" section
for the design rationale.

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
5. Deploy the edge function — **run the sync script first**, since
   `supabase/functions/_shared/herbdex/` is generated, not hand-edited:
   ```bash
   npm run sync:edge-shared
   supabase functions deploy herbdex-action
   ```
6. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as GitHub repo
   **variables** (Settings → Secrets and variables → Actions → Variables) so
   `.github/workflows/deploy.yml` can bake them into the static export, and to a local
   `.env.local` for `npm run dev` (copy `.env.example`).

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

- **Email confirmation must be off** for the test project (Authentication → Sign In /
  Providers → Email → "Confirm email"), or signup never issues a session and the suite
  cannot sign in. Turn it back on before shipping to real players.
- **The `herbdex-action` function must be deployed**, or the mastery/research tests fail
  with a message saying so.

The suite deletes every row it creates. It cannot delete the users it creates — that needs
a service-role key, which it deliberately never holds — so test accounts accumulate; remove
them from the dashboard periodically.

## After changing anything in `src/lib/{types,herbdex-state,deck,achievements,progression,mastery,rng,research,herbdex-reducer}.ts`

Re-run `npm run sync:edge-shared` and redeploy the function — the copies under
`supabase/functions/_shared/herbdex/` are what actually runs server-side, and they only
stay correct if this step isn't skipped.
