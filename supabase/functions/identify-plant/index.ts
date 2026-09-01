import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * PLANT ID V1 — the identification call, server side.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS AN EDGE FUNCTION AND NOT A FETCH FROM THE BROWSER.
 *
 * The provider needs an API key. A key in the client bundle is a key anybody can read and
 * spend, and the allowance it spends is shared by every player. So the key lives only in
 * this function's environment, and the browser never sees the provider's hostname at all.
 *
 * WHAT THIS FUNCTION DOES NOT DO. It does not decide anything. It returns ranked candidates
 * and their scores; the matching onto deck cards happens in `src/lib/plant-match.ts` on the
 * client, and CONFIRMATION IS ALWAYS AN EXPLICIT TAP by the player. Nothing here writes a
 * discovery, and nothing here says a plant is safe to eat.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ANONYMOUS SCANNING IS ALLOWED. Requiring an account to try the feature is exactly the wall
 * this project keeps refusing to build. Anonymous callers get a small daily allowance;
 * signed-in callers get a larger one. See RATE LIMITS below.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** PlantNet. Set with `supabase secrets set PLANTNET_API_KEY=...` — never in the repo. */
const PROVIDER_KEY = Deno.env.get('PLANTNET_API_KEY') ?? '';
const PROVIDER_URL = 'https://my-api.plantnet.org/v2/identify/all';

/**
 * Rotates the anonymous bucket hash daily. Any non-empty secret works; if it is unset the
 * function still runs, but anonymous buckets become stable across days, so set it.
 */
const QUOTA_SALT = Deno.env.get('SCAN_QUOTA_SALT') ?? 'plantdex-default-salt';

/*
 * RATE LIMITS.
 *
 * PlantNet's free tier is roughly 500 identifications/day for the whole project, so these
 * are sized against a shared budget rather than against what one person might enjoy.
 *
 *   ANON_DAILY_LIMIT  5   Enough to genuinely try the feature on a walk — photograph a few
 *                         things and see it work — without one device being able to spend
 *                         a meaningful share of the day's allowance.
 *   USER_DAILY_LIMIT  30  A real session of use. Signing in is rewarded with more, which is
 *                         a reason to make an account rather than a penalty for not having
 *                         one.
 *   GLOBAL_DAILY_LIMIT 450 The backstop. Without it, 90 anonymous devices exhaust the tier
 *                         and every later scan fails at the provider with an error nobody
 *                         can act on. Held below 500 so there is headroom to notice.
 */
const ANON_DAILY_LIMIT = 5;
const USER_DAILY_LIMIT = 30;
const GLOBAL_DAILY_LIMIT = 450;

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

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
 * A caller's quota bucket.
 *
 * Signed in, it is their user id — stable, already known, nothing new collected. Anonymous,
 * it is a SHA-256 of the caller's IP plus a secret salt plus today's date. That value cannot
 * be reversed to an address, cannot be joined to yesterday's bucket for the same device, and
 * stops meaning anything at midnight. The raw IP is never stored, logged, or returned.
 */
async function anonBucket(ip: string, day: string): Promise<string> {
  const data = new TextEncoder().encode(`${QUOTA_SALT}:${day}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `anon:${hex.slice(0, 32)}`;
}

interface ProviderResult {
  score: number;
  species?: {
    scientificNameWithoutAuthor?: string;
    scientificName?: string;
    commonNames?: string[];
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!PROVIDER_KEY) {
    return json(
      { error: 'Plant identification is not configured on this deployment.', code: 'unconfigured' },
      503,
    );
  }

  const day = new Date().toISOString().slice(0, 10);
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  /*
   * WHO IS CALLING. An Authorization header is optional here, unlike delete-account: scanning
   * anonymously is supported on purpose. A header that is present but not a valid session is
   * treated as anonymous rather than rejected — the anon key itself arrives in that header
   * for a signed-out caller.
   */
  let userId: string | null = null;
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data } = await asCaller.auth.getUser();
    userId = data.user?.id ?? null;
  }

  // ── Quota ────────────────────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';
  const bucket = userId ? `user:${userId}` : await anonBucket(ip, day);
  const limit = userId ? USER_DAILY_LIMIT : ANON_DAILY_LIMIT;

  const { data: globalCount, error: globalError } = await admin.rpc('claim_scan', {
    p_bucket: 'global',
    p_day: day,
    p_limit: GLOBAL_DAILY_LIMIT,
  });
  if (globalError) return json({ error: 'Could not check the daily allowance.' }, 500);
  if (globalCount === null) {
    return json(
      {
        error: 'Plant identification has hit its limit for today. Please try again tomorrow.',
        code: 'globalLimit',
      },
      429,
    );
  }

  const { data: count, error: quotaError } = await admin.rpc('claim_scan', {
    p_bucket: bucket,
    p_day: day,
    p_limit: limit,
  });
  if (quotaError) return json({ error: 'Could not check your daily allowance.' }, 500);
  if (count === null) {
    return json(
      {
        error: userId
          ? `You have used all ${USER_DAILY_LIMIT} identifications for today.`
          : `You have used all ${ANON_DAILY_LIMIT} identifications for today. Signing in raises it to ${USER_DAILY_LIMIT}.`,
        code: 'rateLimited',
        limit,
        signedIn: Boolean(userId),
      },
      429,
    );
  }

  // Housekeeping: yesterday's buckets are meaningless and the anonymous ones should not
  // outlive the day whose salt made them.
  await admin
    .from('scan_quota')
    .delete()
    .lt('day', new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10));

  // ── The image ────────────────────────────────────────────────────────────
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: 'Send the photograph as multipart form data.' }, 400);
  }
  const image = form.get('image');
  if (!(image instanceof File)) return json({ error: 'No photograph was attached.' }, 400);
  if (image.size > MAX_IMAGE_BYTES) {
    return json({ error: 'That photograph is too large. Images are resized before upload.' }, 413);
  }

  // ── The provider ─────────────────────────────────────────────────────────
  const providerForm = new FormData();
  providerForm.append('images', image, 'scan.jpg');
  providerForm.append('organs', typeof form.get('organ') === 'string' ? String(form.get('organ')) : 'auto');

  let payload: { results?: ProviderResult[] };
  try {
    const response = await fetch(`${PROVIDER_URL}?api-key=${encodeURIComponent(PROVIDER_KEY)}`, {
      method: 'POST',
      body: providerForm,
    });
    if (response.status === 404) {
      // PlantNet answers 404 when it recognises nothing at all. That is a real result, not
      // an error, and it must reach the player as "no match" rather than as a failure.
      return json({ candidates: [], providerFoundNothing: true });
    }
    if (!response.ok) {
      return json(
        { error: 'The identification service could not be reached. Please try again.' },
        502,
      );
    }
    payload = await response.json();
  } catch {
    return json({ error: 'The identification service could not be reached. Please try again.' }, 502);
  }

  /*
   * Only what the client needs, and nothing that identifies the caller. No IP, no bucket, no
   * user id, and none of the provider's raw response beyond name and score.
   */
  const candidates = (payload.results ?? []).slice(0, 5).map((result) => ({
    scientificName:
      result.species?.scientificNameWithoutAuthor ?? result.species?.scientificName ?? '',
    commonName: result.species?.commonNames?.[0],
    score: typeof result.score === 'number' ? Math.max(0, Math.min(1, result.score)) : 0,
  }));

  return json({
    candidates: candidates.filter((candidate) => candidate.scientificName),
    remaining: Math.max(0, limit - (count as number)),
    limit,
    signedIn: Boolean(userId),
  });
});
