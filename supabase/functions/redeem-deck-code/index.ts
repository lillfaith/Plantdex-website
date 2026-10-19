import { createClient } from 'npm:@supabase/supabase-js@2';

/**
 * redeem-deck-code — spends one physical deck's activation code and grants Collector access.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A FUNCTION AND NOT AN RLS-SCOPED WRITE, which is how everything else in V0.3
 * reaches the database.
 *
 * `deck_claims` is a GLOBAL table. One row per physical deck ever printed, readable by
 * nobody and writable by nobody — migration 0008 enables RLS on it and then defines no
 * policy at all, which is the same posture `species_packets` takes and for the same reason:
 * a client write surface on a global table is a cross-user write surface. If a client could
 * read it, the hashes would be public; if a client could write it, anybody could mark a code
 * spent, or un-spend their own.
 *
 * So the only path is a function holding the service role, and the only thing it will do is
 * the one conditional update in `redeem_deck_code`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE USER ID COMES FROM THE TOKEN, NEVER FROM THE BODY — the same rule `delete-account`
 * states, and here the consequence is different but just as bad. With the service-role key
 * a `userId` taken from the request would let anybody spend a code they legitimately bought
 * ONTO SOMEBODY ELSE'S ACCOUNT, or, worse, redeem a code they found onto an account they
 * control while the buyer watches it fail. The body carries the code and nothing else.
 *
 * THE CODE IS HASHED HERE, NOT IN THE BROWSER. Hashing client-side would make the hash the
 * credential — anybody who intercepted one could redeem it, and the normalisation rules
 * would be duplicated in a place a future edit could quietly change. The plaintext travels
 * once over TLS and is never stored, logged or echoed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RATE LIMIT IS NOT ABOUT BRUTE FORCE, and saying so matters because the obvious
 * reading is wrong. A code carries eighty bits of entropy, so enumerating the keyspace is
 * not a thing that happens. What an unlimited endpoint buys an attacker is free load, and
 * what it buys a bug is an infinite retry loop against the database. `claim_scan` already
 * exists for exactly this shape of problem, so it is reused rather than reinvented — the
 * bucket is per caller and per day, the same as the scanner's.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Redemption attempts allowed per account per day.
 *
 * Generous on purpose: somebody mistyping a code off a card is the ordinary case, and a
 * limit that punishes a buyer for bad handwriting is worse than no limit at all. Twenty is
 * far more than an honest person needs and far less than an abusive loop wants.
 */
const REDEEM_DAILY_LIMIT = 20;

const CORS_HEADERS = {
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
 * The exact string that gets hashed.
 *
 * MUST MATCH `normalise()` IN `scripts/mint_deck_codes.py` CHARACTER FOR CHARACTER. If the
 * two drift, a perfectly valid code hashes to something the database has never seen and the
 * buyer is told their code is invalid — a failure with no error anywhere and no way for them
 * to tell it from a bad code. `deck-codes.test.ts` holds the two implementations equal.
 *
 * The folds exist because somebody is reading sixteen characters off a card: Crockford
 * omits I, L, O and U from the alphabet precisely so the ambiguous ones can be folded back
 * on input, and a person who types the letter O for a zero still redeems successfully.
 */
export function normaliseCode(input: string): string {
  let cleaned = input.trim().toUpperCase().replaceAll('-', '').replaceAll(' ', '');
  if (cleaned.startsWith('PLNT')) cleaned = cleaned.slice(4);
  return cleaned.replaceAll('I', '1').replaceAll('L', '1').replaceAll('O', '0');
}

/** The code's shape after normalisation: exactly sixteen Crockford characters. */
export const CODE_PATTERN = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{16}$/;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'Not signed in.' }, 401);

  // IDENTITY FIRST, under the CALLER'S OWN token and the anon key. The admin client below
  // bypasses RLS, so RLS is not the boundary here — this call is.
  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await caller.auth.getUser();
  const userId = userData?.user?.id;
  if (userError || !userId) return json({ error: 'Not signed in.' }, 401);

  let code: unknown;
  try {
    ({ code } = await req.json());
  } catch {
    return json({ error: 'Expected a JSON body with a code.' }, 400);
  }
  if (typeof code !== 'string' || code.length > 64) {
    return json({ error: 'Expected a code.' }, 400);
  }

  const normalised = normaliseCode(code);
  /*
   * SHAPE IS CHECKED BEFORE THE QUOTA IS SPENT. A buyer who typed twelve characters has not
   * made an attempt at anything, and charging them a unit of their daily allowance for a
   * paste that went wrong is how somebody ends up locked out of a deck they own.
   */
  if (!CODE_PATTERN.test(normalised)) {
    return json({ outcome: 'malformed' }, 200);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const day = new Date().toISOString().slice(0, 10);
  const { data: attempts, error: quotaError } = await admin.rpc('claim_scan', {
    p_bucket: `redeem:${userId}`,
    p_day: day,
    p_limit: REDEEM_DAILY_LIMIT,
  });
  if (quotaError) return json({ error: 'Could not check your daily allowance.' }, 500);
  if (attempts === null) {
    return json(
      {
        error: `Too many attempts today. Please check the code on your deck and try again tomorrow.`,
        code: 'rateLimited',
      },
      429,
    );
  }

  const { data: outcome, error: redeemError } = await admin.rpc('redeem_deck_code', {
    p_user: userId,
    p_hash: await sha256Hex(normalised),
  });
  if (redeemError) return json({ error: 'Could not redeem that code.' }, 500);

  /*
   * `invalid` COVERS BOTH UNKNOWN AND ALREADY-CLAIMED, and the function deliberately cannot
   * tell the caller which. Distinguishing them would make this endpoint an oracle for which
   * codes exist, which is more useful to an attacker than either answer alone. The message
   * therefore names the two honest possibilities rather than guessing at one.
   */
  return json({ outcome });
});
