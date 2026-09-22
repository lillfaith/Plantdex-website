import { createClient } from 'npm:@supabase/supabase-js@2';
import { canonicalIdentity } from '../_shared/herbdex/species-identity.ts';
import { identifyWithPlantId, identifyWithPlantNet, type ObservationImage } from './providers.ts';
import {
  isIdentificationFailure,
  type IdentificationFailure,
  type NormalizedIdentification,
} from '../_shared/herbdex/identification-types.ts';
import {
  ATTESTATION_SECRET_ENV,
  attestIdentity,
} from '../_shared/herbdex/species-attestation.ts';

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
const PLANT_ID_KEY = Deno.env.get('PLANT_ID_API_KEY') ?? '';

/*
 * WHICH PROVIDER ANSWERS, AND WHY UNSET MEANS PLANTNET.
 *
 * Unset reproduces today's behaviour exactly, so deploying this changes nothing on the live
 * site until the owner chooses. An UNKNOWN value is a configuration error rather than a
 * silent fall back to the default: falling back would let a typo look like a working
 * deployment while quietly answering from the provider nobody selected.
 */
const PROVIDER_ID = (Deno.env.get('PLANT_IDENTIFICATION_PROVIDER') ?? 'plantnet').trim();

/*
 * PROVIDER COMPARISON — off unless BOTH of these say otherwise.
 *
 * Deciding between PlantNet and plant.id on anything but anecdote needs both answers to the
 * SAME photographs. Comparison mode asks both and records what each said; the player is
 * still served the configured provider's answer, so nothing about the flow changes for them.
 *
 * TWO GATES, AND THE SECOND IS AN EXPLICIT LIST OF ACCOUNTS. A flag alone would mean "every
 * signed-in player is now in an experiment", which is the thing not to build: it doubles the
 * shared API spend, and it keeps a record of somebody's scans for a purpose they had no part
 * in. The list holds the ids of whoever is running the evaluation. An anonymous caller is
 * never in it — there is no id to match, and no account for the row to belong to.
 */
const COMPARISON_ON = (Deno.env.get('IDENTIFICATION_COMPARISON') ?? '').trim() === 'on';
const COMPARISON_USER_IDS = new Set(
  (Deno.env.get('IDENTIFICATION_COMPARISON_USER_IDS') ?? '')
    .split(',')
    .map((one) => one.trim())
    .filter(Boolean),
);
/** At most this many candidates per provider reach the comparison row. */
const COMPARISON_CANDIDATE_CAP = 5;

/** Two required, three allowed. Enforced here as well as in the browser. */
const MIN_IMAGES = 2;
const MAX_IMAGES = 3;
/** PlantNet's vocabulary. Anything else from a client is replaced with `auto`. */
const ORGANS = new Set(['habit', 'leaf', 'flower', 'fruit', 'bark', 'auto']);

/**
 * THE SPECIES ATTESTATION SECRET — a dedicated secret, never the service-role key.
 *
 * This function is the one place in Plantdex that has seen PlantNet's own answer, so it is
 * the only place that can honestly say "the provider named this species with these taxonomy
 * ids". It signs that statement here; `seed-packet` verifies it before creating a permanent
 * canonical row. Without the signature, a signed-in player could hand `seed-packet` a
 * well-formed fictional species, or a real species wearing another species' GBIF id.
 *
 * UNSET, SCANNING STILL WORKS AND MINTING DOES NOT. Identification is the anonymous front
 * door of this app and must not break because a secret is missing — so candidates simply come
 * back without attestations, and `seed-packet` refuses to create new canon until the secret
 * is set on BOTH functions. Failing closed there is the point: a missing secret must not
 * silently reopen the hole this exists to close.
 */
const ATTESTATION_SECRET = Deno.env.get(ATTESTATION_SECRET_ENV) ?? '';

/**
 * THE ANONYMOUS QUOTA SALT — what it actually does, and why the old default was wrong.
 *
 * The bucket is `SHA-256(salt : day : ip)`. The DAY is already in that input, so rotation
 * across days never depended on the salt at all — the comment that used to sit here claimed
 * an unset salt made anonymous buckets "stable across days", and that was simply false.
 *
 * What the salt actually buys is that the hash cannot be COMPUTED. Without one, anybody who
 * can read a `scan_quota` row can test a guessed address against it — the day is public and
 * the hash is standard — which turns a table of opaque buckets into a table anyone can ask
 * "did this IP scan today?" of. The old fallback was the literal string
 * `'plantdex-default-salt'`, published in this repository, so an unset secret meant exactly
 * that: a salt everybody has.
 *
 * It also made "is SCAN_QUOTA_SALT set in production?" unanswerable. The function behaves
 * identically either way — same buckets, same limits, same responses — so nothing would ever
 * surface the omission.
 *
 * The fallback now derives from the service-role key, which is always present (the function
 * cannot run without it), is stable across isolates so a caller's bucket does not change
 * between invocations, and is not public. It is only ever an input to a one-way digest and
 * never leaves this process. Setting SCAN_QUOTA_SALT explicitly is still correct — it lets
 * the salt rotate without rotating the database key — but an unset one is no longer a hole.
 *
 * Deliberately NOT fail-closed, unlike the attestation secret. That one guards what may be
 * written into a global immutable registry, so refusing is the safe answer. This one guards a
 * rate-limit bucket, and refusing would take identification down for everybody.
 */
const QUOTA_SALT = Deno.env.get('SCAN_QUOTA_SALT') ?? `derived:${SERVICE_ROLE_KEY}`;

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

/**
 * Strip anything key-shaped out of text that came from the provider.
 *
 * The API key travels as a query parameter, so an error body that quotes the request URL
 * quotes the key with it. This runs over every provider string that leaves this function.
 */
function redact(value: string): string {
  return value
    .replace(/api[-_]?key=[^&\s"']+/gi, 'api-key=[redacted]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[redacted]');
}

/**
 * One provider's answer, flattened for the comparison table.
 *
 * A FAILURE IS A ROW, NOT A DROPPED ONE. "plant.id refused the key" and "plant.id answered
 * with nothing" are the two most useful results an evaluation can have, and both would
 * disappear if this only recorded successes. The candidate list is capped here rather than
 * by the column: an uncapped jsonb is an unbounded write.
 *
 * NOTHING ABOUT THE CALLER BEYOND THEIR OWN ID GOES IN. No image, no photo path, no IP, no
 * quota bucket. The table holds answers.
 */
function comparisonRow(
  userId: string,
  observationId: string,
  provider: 'plantnet' | 'plantid',
  result: NormalizedIdentification | IdentificationFailure,
): Record<string, unknown> {
  const base = { user_id: userId, observation_id: observationId, provider };
  if (isIdentificationFailure(result)) {
    return { ...base, candidates: [], failure: result.kind };
  }
  const candidates = result.candidates.slice(0, COMPARISON_CANDIDATE_CAP).map((candidate) => ({
    scientificName: candidate.scientificName,
    rank: candidate.rank,
    probability: candidate.probability,
  }));
  const top = candidates[0];
  return {
    ...base,
    top_scientific_name: top?.scientificName ?? null,
    top_rank: top?.rank ?? null,
    top_probability: top?.probability ?? null,
    candidates,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  /*
   * THE GATE FOLLOWS THE SELECTED PROVIDER, WHICH IT DID NOT WHEN THERE WAS ONLY ONE.
   *
   * This read `PLANTNET_API_KEY` unconditionally. With `plantid` selected and PlantNet's key
   * absent — the ordinary state for a deployment that has moved over — every scan would have
   * been refused as unconfigured before the dispatch below ever ran, and the message would
   * have blamed a provider nobody was using.
   */
  const activeKey = PROVIDER_ID === 'plantid' ? PLANT_ID_KEY : PROVIDER_KEY;
  if (!activeKey) {
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
  const resolveCaller = async (): Promise<string | null> => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return null;
    try {
      const asCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await asCaller.auth.getUser();
      return data.user?.id ?? null;
    } catch {
      /*
       * ANONYMOUS IS THE ANSWER TO "I COULD NOT TELL", not a failure.
       *
       * That was already this function's rule for a header it cannot resolve — the anon key
       * itself arrives in that header for a signed-out caller — but the rule lived in
       * `data.user?.id ?? null` and only covered a REFUSAL, not a network fault. Now that
       * this runs inside a `Promise.all` beside the global claim, a throw here would reject
       * the pair, leave the other promise's rejection unhandled, and fail a scan that was
       * always going to be served anonymously. The caller simply gets the anonymous
       * allowance, which is what an unauthenticated request gets anyway.
       */
      return null;
    }
  };

  // ── Quota ────────────────────────────────────────────────────────────────
  /*
   * THE GLOBAL CLAIM DOES NOT DEPEND ON WHO IS CALLING, so it does not wait to find out.
   *
   * Resolving the caller is a network round trip to the auth service, and the global backstop
   * is keyed on the literal bucket 'global' — nothing in it reads `userId`. Run serially they
   * are two round trips in front of a provider call that is already the slow part of the
   * request; run together they are one. The PER-CALLER claim below genuinely does depend on
   * the answer and stays where it is.
   *
   * ORDER IS UNCHANGED. The global backstop is still claimed before the per-caller limit is
   * checked, so a caller over their own quota still spends a unit of the shared 450 — a small
   * accounting defect that predates this and is deliberately not fixed here, because merging
   * the two claims into one atomic decision is a migration, not a latency change.
   */
  const [userId, { data: globalCount, error: globalError }] = await Promise.all([
    resolveCaller(),
    admin.rpc('claim_scan', { p_bucket: 'global', p_day: day, p_limit: GLOBAL_DAILY_LIMIT }),
  ]);
  if (globalError) return json({ error: 'Could not check the daily allowance.' }, 500);

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';
  const bucket = userId ? `user:${userId}` : await anonBucket(ip, day);
  const limit = userId ? USER_DAILY_LIMIT : ANON_DAILY_LIMIT;
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

  /*
   * HOUSEKEEPING, AND WHY IT NO LONGER SITS IN FRONT OF THE PLAYER.
   *
   * Yesterday's buckets are meaningless and the anonymous ones should not outlive the day
   * whose salt made them — but this delete used to be AWAITED on every single request, so
   * every person scanning a plant paid a round trip for tidying up rows they will never see.
   *
   * It is started here and resolved at the end, by which time the ~1.5s provider call has
   * covered it many times over: the cost is now zero rather than one round trip.
   * `Promise.resolve` is what actually issues the query — a PostgREST builder is a lazy
   * thenable, not a promise, so nothing runs until something calls `.then()` on it — and the
   * `catch` is there because a failed tidy-up must never fail a scan, which is also how the
   * old unchecked `await` behaved.
   */
  const housekeeping: Promise<unknown> = Promise.resolve(
    admin
      .from('scan_quota')
      .delete()
      .lt('day', new Date(Date.now() - 2 * 86400_000).toISOString().slice(0, 10)),
  ).catch(() => undefined);
  /*
   * Every path below this point returns before the final `await`, so hand the promise to the
   * runtime: an isolate may be frozen the moment a response is written, and a detached promise
   * that never ran is a tidy-up nobody would ever notice missing. Guarded because
   * `EdgeRuntime` is a Supabase extension rather than a Deno global — where it is absent the
   * query is already in flight and simply usually finishes anyway.
   */
  (globalThis as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } })
    .EdgeRuntime?.waitUntil?.(housekeeping);

  // ── The image ────────────────────────────────────────────────────────────
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: 'Send the photograph as multipart form data.' }, 400);
  }
  /*
   * TWO TO THREE PHOTOGRAPHS OF ONE PLANT, VALIDATED HERE AS WELL AS IN THE BROWSER.
   *
   * The client disables its own button below two, but this endpoint is reachable without it,
   * and the count is the whole basis of the identification: both providers treat the set as
   * ONE individual, so a caller that sent pictures of two different plants would be asking
   * for a blended answer and getting a confident one.
   *
   * `getAll` rather than `get` is the change. The old code read a single `image` and appended
   * one `organs` field — the multi-image shape PlantNet documents was already half-wired.
   */
  const files = form.getAll('image').filter((one): one is File => one instanceof File);
  if (files.length < MIN_IMAGES) {
    return json(
      {
        error: `Add ${MIN_IMAGES} photographs of the same plant — the whole plant and a close-up.`,
        code: 'tooFewImages',
      },
      400,
    );
  }
  if (files.length > MAX_IMAGES) {
    return json({ error: `At most ${MAX_IMAGES} photographs.`, code: 'tooManyImages' }, 400);
  }
  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) {
      return json({ error: 'That photograph is too large. Images are resized before upload.' }, 413);
    }
  }

  /*
   * Organ tags ride alongside, one per image and in the same order. An absent or unrecognised
   * tag becomes `auto` rather than an error: a wrong organ label costs a little accuracy, and
   * refusing the scan over one costs the whole find.
   */
  const organs = form.getAll('organ').map((one) => String(one));
  const images: ObservationImage[] = files.map((file, index) => ({
    file,
    organ: ORGANS.has(organs[index] ?? '') ? organs[index]! : 'auto',
  }));

  // ── The provider ─────────────────────────────────────────────────────────

  /*
   * DISPATCH, AND THE KEY NEVER LEAVES THE SERVER.
   *
   * Both adapters return the SAME normalised shape, so everything below this point is
   * provider-agnostic — which is the point of the seam: swapping providers is a branch here
   * and a normalizer in `_shared`, not a change to the matcher, the scan UI or the reducer.
   */
  if (PROVIDER_ID !== 'plantnet' && PROVIDER_ID !== 'plantid') {
    return json(
      {
        error: 'Plant identification is not set up correctly on this deployment.',
        code: 'unconfigured',
      },
      500,
    );
  }

  /*
   * COMPARISON MODE RUNS THE OTHER PROVIDER ALONGSIDE, AND COSTS THE PLAYER NOTHING.
   *
   * Both calls go out together, so the wait is the slower of the two rather than their sum,
   * and the ALTERNATE's answer is never what gets returned — it is recorded and dropped. A
   * missing key on the alternate side simply means no second call: comparison is an
   * evaluation aid and must never be able to fail a scan somebody is standing in a field
   * waiting for.
   */
  const comparing = Boolean(userId) && COMPARISON_ON && COMPARISON_USER_IDS.has(userId!);
  const alternateId = PROVIDER_ID === 'plantid' ? 'plantnet' : 'plantid';
  const alternateKey = alternateId === 'plantid' ? PLANT_ID_KEY : PROVIDER_KEY;

  const run = (id: 'plantnet' | 'plantid', key: string) =>
    id === 'plantid' ? identifyWithPlantId(images, key) : identifyWithPlantNet(images, key);

  const [identification, alternate] = await Promise.all([
    run(PROVIDER_ID, activeKey),
    comparing && alternateKey ? run(alternateId, alternateKey) : Promise.resolve(null),
  ]);

  /*
   * The id that ties the two rows — and the client's own scan row — to one set of
   * photographs. Minted here because this is the only place that has seen both answers, and
   * returned to the client so `recordScan` can carry it onto `scans`. That is what lets
   * "which provider agreed with what the player confirmed?" be a JOIN rather than a column
   * somebody has to go back and update; there is no update policy to do it with, deliberately.
   */
  const observationId = crypto.randomUUID();

  if (comparing) {
    /*
     * Fire-and-forget, and handed to `waitUntil` for the same reason the quota housekeeping
     * is: an isolate can be frozen the moment the response is written. Telemetry that fails
     * is telemetry that is missing a row, which is the correct way for it to fail — it must
     * never turn into an error the player sees.
     */
    const rows = [
      comparisonRow(userId!, observationId, PROVIDER_ID, identification),
      ...(alternate ? [comparisonRow(userId!, observationId, alternateId, alternate)] : []),
    ];
    const write: Promise<unknown> = Promise.resolve(
      admin.from('identification_comparisons').insert(rows),
    ).catch(() => undefined);
    (globalThis as { EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void } })
      .EdgeRuntime?.waitUntil?.(write);
  }

  if (isIdentificationFailure(identification)) {
    /*
     * THE FAILURE KIND SURVIVES TO THE CLIENT AS A CODE, AND THE PROVIDER'S BODY DOES NOT.
     *
     * An error body may echo the request URL, and PlantNet's key rides in that URL as a query
     * parameter — so nothing from the provider's response is forwarded. Only our own kind and
     * a sentence written here.
     *
     * A REFUSED KEY IS A CONFIGURATION FAULT AND MUST NOT READ AS AN OUTAGE. "Could not be
     * reached" once sent a live debugging session hunting a PlantNet outage that was not
     * happening: the key was invalid and the provider was saying so. `auth` and `unconfigured`
     * both reuse the existing `unconfigured` code, because from the player's side an absent
     * key and a refused one are the same fact — this deployment cannot identify plants — and
     * that path is already handled all the way to the screen.
     */
    const { kind, message, status } = identification;
    const configFault = kind === 'auth' || kind === 'unconfigured';
    return json(
      {
        error: configFault
          ? 'Plant identification is not set up correctly on this deployment.'
          : kind === 'rateLimited'
            ? 'The identification service is busy. Please try again shortly.'
            : kind === 'schema'
              ? 'The identification service answered in a way this app did not recognise.'
              : 'The identification service could not be reached. Please try again.',
        code: configFault ? 'unconfigured' : kind,
        provider: identification.provider,
        providerStatus: status,
        /*
         * REDACTED EVEN THOUGH IT IS OUR OWN TEXT. Every message reaching here is written in
         * `providers.ts`, so none of it quotes a provider body today — but PlantNet's key
         * travels as a query parameter, and the cost of a future adapter forwarding upstream
         * text is a leaked key. Defence kept where it is cheap rather than removed because it
         * is currently unnecessary.
         */
        providerMessage: redact(message),
      },
      configFault ? 500 : 502,
    );
  }

  /*
   * "NOT A PLANT" IS AN ANSWER, AND IT STOPS EVERYTHING.
   *
   * Only an explicit `false` blocks — `null` means the provider does not answer that question
   * (PlantNet has no equivalent) and must never be read as a yes. Nothing is matched, nothing
   * is attested, and therefore nothing can reach a card or the global species registry.
   */
  if (identification.isPlant === false) {
    return json({
      candidates: [],
      notAPlant: true,
      provider: identification.provider,
      observationId,
    });
  }

  if (identification.candidates.length === 0) {
    return json({
      candidates: [],
      providerFoundNothing: true,
      provider: identification.provider,
      observationId,
    });
  }

  /*
   * Only what the client needs, and nothing that identifies the caller. No IP, no bucket, no
   * user id, and none of the provider's raw response beyond the fields named here.
   *
   * `scientificName` is the provider's own string, untouched — the client builds the observed
   * taxon from it, and normalisation must never become the record of what was returned.
   */
  const candidates = identification.candidates.slice(0, 5).map((candidate) => ({
    scientificName: candidate.scientificName,
    commonName: candidate.commonNames[0],
    commonNames: candidate.commonNames,
    score: candidate.probability,
    rank: candidate.rank,
    gbifId: candidate.gbifId,
    powoId: candidate.powoId,
  }));

  /*
   * ATTEST WHAT THE PROVIDER ACTUALLY SAID.
   *
   * The token is issued over the CANONICAL identity rather than over PlantNet's raw spelling,
   * because that is what `seed-packet` will compare against: the client may relay
   * "Bellis perennis L." and the server rebuilds "Bellis perennis" on both sides, so the two
   * agree about a name that differs only in authorship. A candidate that does not canonicalise
   * gets no token — it could never have been minted anyway.
   *
   * Attestations are issued to ANONYMOUS callers too. A signed-out player scans, shelves the
   * plant on their device, and signs in days later; the import is what mints it, and it needs
   * the token that scan produced. Withholding it from anonymous scans would quietly make
   * every signed-out find unmintable.
   */
  const attested = await Promise.all(
    candidates.map(async (candidate) => {
      if (!ATTESTATION_SECRET) return candidate;
      const identity = canonicalIdentity(candidate);
      if (!identity) return candidate;
      return {
        ...candidate,
        attestation: await attestIdentity(identity, ATTESTATION_SECRET),
      };
    }),
  );

  // Free by now — the provider call above took far longer than this did.
  await housekeeping;

  return json({
    candidates: attested.filter((candidate) => candidate.scientificName),
    remaining: Math.max(0, limit - (count as number)),
    limit,
    signedIn: Boolean(userId),
    /*
     * WHICH PROVIDER ANSWERED, and which set of photographs this was. Neither identifies
     * anybody: the provider is a deployment setting, and the observation id is a random uuid
     * minted for this request. The client stores both on its own scan row, so a history row
     * can say what produced it — before this, a deployment that switched providers left every
     * earlier scan looking as though the new one had answered it.
     */
    provider: identification.provider,
    observationId,
  });
});
