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

## After changing anything in `src/lib/{types,herbdex-state,deck,achievements,progression,mastery,rng,research,herbdex-reducer}.ts`

Re-run `npm run sync:edge-shared` and redeploy the function — the copies under
`supabase/functions/_shared/herbdex/` are what actually runs server-side, and they only
stay correct if this step isn't skipped.
