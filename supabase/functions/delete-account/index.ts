import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * delete-account — erases everything the signed-in caller has stored, permanently.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS NEEDS A FUNCTION AT ALL, when everything else in V0.3 is a plain RLS-scoped
 * write from the browser.
 *
 * Two things a client cannot do, no matter how the policies are written:
 *
 *   1. DELETE ITS OWN AUTH USER. `auth.users` is not exposed to the anon key, and it is the
 *      row every table cascades from. Without it the email address survives, and so does
 *      the ability to sign in to an empty account.
 *
 *   2. GUARANTEE THE PHOTOS GO. `storage.objects` does NOT cascade from `auth.users` —
 *      nothing in Postgres connects them. Deleting the user therefore leaves every
 *      photograph in the bucket with no owner, no policy that can ever match it again
 *      (the delete policy compares `auth.uid()` to the folder name, and that uid no longer
 *      exists), and no way for anyone but a project admin to remove it. Orphaned private
 *      photographs of a deleted account are the worst outcome available here.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ORDER IS THE DESIGN. Photos, then rows, then the user. Never the reverse.
 *
 * If photo deletion fails, the account still exists and the operation reports failure — the
 * player can retry, and nothing is stranded. If the user were deleted first and photo
 * deletion then failed, the files would be permanently unreachable. So the irreversible
 * step goes last, after everything that can still be retried has succeeded.
 *
 * Rows are deleted explicitly rather than left to the cascade, for the same reason: if the
 * final `deleteUser` call fails, the account is already emptied, and a retry finishes the
 * job. A half-done deletion must never leave collection data behind.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * THE SERVICE-ROLE KEY NEVER LEAVES THIS FUNCTION. It is read from the environment, which
 * on Supabase is injected into the function's own runtime and is not part of any client
 * bundle — `src/` contains no reference to it, and `supabase.test.ts` fails the build if
 * one appears. The browser calls this endpoint with an ordinary user JWT and gets back a
 * yes or no.
 *
 * AND THE USER ID COMES FROM THE TOKEN, NEVER FROM THE BODY. This is the whole reason the
 * function reads `auth.getUser()` under an anon-key client before touching the admin one:
 * with the service-role key, a `userId` accepted from the request would let any signed-in
 * player delete any other player's account by guessing a uuid. The request body is not read
 * at all.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const PHOTO_BUCKET = 'sighting-photos';

/** Every table that holds player data, all keyed by `user_id`. */
const USER_TABLES = [
  'sightings',
  'discoveries',
  'learned',
  'mastered',
  'research_completions',
  'unlocked_achievements',
] as const;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/**
 * Every object under `{userId}/`, paged.
 *
 * `list()` returns at most 100 entries by default and caps at 1000, and a player with a
 * photograph on every sighting can exceed that. A single unpaged call would silently leave
 * the remainder behind — which looks exactly like success.
 */
async function listAllPhotos(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<string[]> {
  const paths: string[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin.storage
      .from(PHOTO_BUCKET)
      .list(userId, { limit: pageSize, offset });
    if (error) throw new Error(`Could not list photos: ${error.message}`);
    const page = data ?? [];
    for (const entry of page) paths.push(`${userId}/${entry.name}`);
    if (page.length < pageSize) return paths;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  // Identity first, under the CALLER'S OWN token and the anon key — no privilege at all.
  // Whatever this returns is the only account this request may touch.
  const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asCaller.auth.getUser();
  if (userError || !userData.user) return json({ error: 'Not authenticated' }, 401);
  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── 1. Photographs ─────────────────────────────────────────────────────────
  let photosDeleted = 0;
  try {
    const paths = await listAllPhotos(admin, userId);
    if (paths.length > 0) {
      const { error } = await admin.storage.from(PHOTO_BUCKET).remove(paths);
      if (error) throw new Error(`Could not delete photos: ${error.message}`);
      photosDeleted = paths.length;

      // Storage `remove` reports per-object failures loosely, so the result is verified by
      // reading the folder back. Reporting success while a photograph is still sitting in a
      // private bucket is the one failure this whole function exists to prevent.
      const remaining = await listAllPhotos(admin, userId);
      if (remaining.length > 0) {
        return json(
          { error: `${remaining.length} photo(s) could not be deleted. Nothing else was removed — please try again.` },
          500,
        );
      }
    }
  } catch (cause) {
    return json({ error: cause instanceof Error ? cause.message : 'Photo deletion failed' }, 500);
  }

  // ── 2. Rows ────────────────────────────────────────────────────────────────
  for (const table of USER_TABLES) {
    const { error } = await admin.from(table).delete().eq('user_id', userId);
    if (error) {
      return json(
        { error: `Could not delete your ${table.replace(/_/g, ' ')}: ${error.message}. Your account still exists — please try again.` },
        500,
      );
    }
  }

  // ── 3. The account itself ──────────────────────────────────────────────────
  // Last, because it is the only step that cannot be retried from the outside: once the
  // user is gone, the caller can no longer authenticate to ask for anything else.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    return json(
      { error: `Your data was deleted, but the account itself could not be closed: ${deleteError.message}` },
      500,
    );
  }

  return json({ ok: true, photosDeleted });
});
