# Running the live Supabase tests (test project only)

The live suites sign up temporary users and attack the database as a second user, so they run against
the **test** Supabase project and never anywhere else. `npm run verify:supabase` runs all of them:
the 60 existing tests plus the 9 leaderboard tests in `e2e/leaderboard.e2e.test.ts`.

**Nothing here is a secret.** The two values you need (the project URL and the anon key) are public by
design; Row Level Security is the lock, not the key. Do **not** use or paste a "service_role" key, a
database password or an access token: these tests never need them.

## 1. Find the two values (test project only)

1. Open the Supabase dashboard and pick the project whose reference is `vgjehmwcpavflbfhbbrp`
   (the dashboard URL ends in that text). If you see `vygiamigomwlvnwkryyl` you are in **production**: go back.
2. Open **Project Settings** (gear icon) then **API** (it may be labelled "API Keys" or "Data API").
3. Copy **Project URL**. It looks like `https://vgjehmwcpavflbfhbbrp.supabase.co`.
4. Copy the key labelled **anon** / **anon public**. If your dashboard only shows a **publishable** key, use that.

## 2. Turn off "Confirm email" on the test project (once)

**Authentication**, then **Sign In / Providers**, then **Email**, then switch **Confirm email** off and save.
Without this, sign-up returns no session and the tests cannot log in. Leave it **on** for production.

## 3. Put the values in a file on your computer

In the folder where the Plantdex code lives, create a file named exactly `.env.local` (a dot at the start).
Quickest way, in a terminal opened in that folder:

```bash
cp .env.example .env.local
```

Then open `.env.local` in any text editor and fill in these two lines (leave the others blank):

```
NEXT_PUBLIC_SUPABASE_URL=https://vgjehmwcpavflbfhbbrp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste-the-anon-key-here
```

`.env.local` is ignored by git (`.gitignore` lists it), so it is never committed or uploaded. Do not paste its
contents into chat.

## 4. Check the test project is ready

- Its status in the dashboard is **Healthy** (a free project that has been idle for a week is **Paused**; click
  Restore and wait).
- Migration `0011_leaderboard.sql` is applied to it. It was, on 2026-11-12 (migration workflow run 30).

## 5. Run

```bash
npm run verify:supabase
```

- A safety check runs first. If `.env.local` points at anything except the test project (production, a typo,
  another project) the run stops immediately with "Refusing to run the live Supabase suites" and nothing is
  written.
- Expected result: the leaderboard suite reports **9 passed**. The older suite reports its 60 tests; the ones
  about species packets also need `SPECIES_ATTESTATION_SECRET` (a real secret belonging to the test project)
  in `.env.local`. If you do not have it, those specific tests will fail with a message saying so. That is
  unrelated to the leaderboard and is not a reason to add anything to chat.

## 6. Afterwards

The suites delete the rows they create but cannot delete the temporary users (that needs a service-role key,
which they deliberately never hold). The test project accumulates accounts named `plantdex-e2e-...@mailinator.com`.
They are harmless; remove them in **Authentication, Users** whenever you like.
