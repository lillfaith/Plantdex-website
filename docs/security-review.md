# Backend security review — 2026-10-26

A pass over the server-side attack surface: the five edge functions, the nine migrations,
RLS, the `SECURITY DEFINER` functions, storage policies and secret handling.

Three real weaknesses were found and patched, plus one latent bug found by testing a
boundary. Several things that look like weaknesses were checked and are not — recorded here
too, because an audit that lists only what it changed is impossible to re-run.

---

## Patched

### 1. HIGH — the anonymous identification limit was bypassable with one header

`identify-plant` keyed its anonymous quota bucket on
`x-forwarded-for`'s **leftmost** entry.

`X-Forwarded-For` is an append-only trail (`client, proxy1, proxy2`): each hop appends the
peer it heard from, so the left-hand entries are the ones **nobody verified**. A request
could simply arrive with one already set. Varying it per request produced a fresh bucket and
therefore a fresh allowance every time — **unlimited anonymous identifications from one
machine**, each a real paid provider call. The per-IP limit was decorative.

**Fix:** `callerAddress()` now prefers `cf-connecting-ip`, which the edge sets and
overwrites on every request so a client copy cannot survive; failing that it takes the
**last** `X-Forwarded-For` hop, which infrastructure appended rather than the caller
claiming; failing that, one shared `unknown` bucket. Note the fallback direction — stripping
headers gets a *smaller* quota, never a larger one.

What this is and is not: a rate-limit key must be hard to **rotate**, which is weaker than
being hard to **forge**. The fix is about rotation, and does not claim to establish identity.

### 2. HIGH — one machine could deny plant identification to every user, daily

The shared `global` bucket (450/day) and the per-caller bucket were two separate
`claim_scan` calls, **global first**, with the caller's refusal checked only afterwards. A
comment called the mismatch "a small accounting defect" and deliberately left it.

It was not small. A caller already over their own allowance **still spent a shared unit on
every further request**. So 450 requests from one machine — no account, no valid image —
took identification down for everybody until midnight, repeatable daily for the cost of a
loop. The per-caller limit protected nothing it sat in front of.

**Fix:** migration `0009` adds `claim_scan_pair`, one decision in one transaction. The
caller's own allowance is claimed **first**, a refusal there costs the shared pool nothing,
and a shared exhaustion **refunds** the unit it just took — charging for that would let a
global outage quietly eat everybody's personal allowance, so they would start tomorrow
already short. It is also one round trip instead of two.

Two statements cannot express "spend a shared unit only if this caller may have one",
because the decision spans both buckets.

### 3. MEDIUM — `seed-packet` had no rate limit, and it is the only writer to a global table

`MAX_SPECIES` bounded one request to 100 species; nothing bounded the number of requests. A
signed-in account could loop them, each costing a canonicalisation pass, an HMAC
verification per unseen species, and up to 100 insert attempts against `species_packets` — a
table every player reads.

The attestation makes the **content** of a canonical row unforgeable. That is a different
property from making the **write path** affordable, and only the first was guarded.

**Fix:** 40 mints per account per day, reusing `claim_scan` rather than inventing a second
limiter. Its own bucket prefix, so shelving and scanning cannot consume each other's
allowance. Over-quota is refused; a failure to *check* the limit proceeds — the limiter is a
backstop, and a transient error on it must not take the Seed Shelf down.

### 4. LATENT — a limit of zero silently meant one

Found by testing `claim_scan_pair` at the boundary. The `where count < p_limit` guard applies
only to the `on conflict do update` branch, so the **first** insert of a day writes `count =
1` whatever the limit says. Correct for every limit of 1 or more; at 0 it meant "one", so the
obvious way to switch identification off — set the limit to zero — would instead have granted
every caller a single request. `claim_scan` shares the behaviour.

**Fix:** explicit `p_limit <= 0` / `p_global_limit <= 0` guards, which turn a trap into a
usable kill switch.

---

## Checked, and NOT weaknesses

Recorded so nobody re-litigates them, and so a future change that breaks the reasoning is
visible as a change.

- **`Access-Control-Allow-Origin: '*'` on all five functions.** Not exploitable here. These
  functions authenticate with a **bearer token the caller sends explicitly**, never a cookie,
  and `*` cannot be combined with credentialed requests. A malicious origin cannot read a
  victim's token — it lives in the victim origin's `localStorage`, which is inaccessible
  cross-origin — so there is no CSRF and no token theft. All `*` permits is calling the
  functions with your *own* token, which `curl` already permits. Tightening it would add
  configuration and break local development while closing nothing.
- **`scan_quota` is not client-readable.** RLS enabled, zero policies (0002). This matters:
  a readable quota table would let anybody watch the shared pool drain and time an attack for
  the minute before midnight. The 0009 test asserts it directly rather than assuming it.
- **No dynamic SQL anywhere.** Every database access goes through PostgREST or a parameterised
  RPC. The only `format()` in the migrations builds an error message; the only `execute` is
  trigger syntax. No injection surface.
- **No request data is logged.** Zero `console.*` calls across all five functions, so no
  photograph, code, address or token can reach a log. The provider key travels as a query
  parameter, so `redact()` runs over every provider string that leaves `identify-plant`.
- **No secret reaches the client bundle.** `src/` contains no service-role key, provider key,
  attestation secret or quota salt. The one hit for `SPECIES_ATTESTATION_SECRET` in `src/` is
  the variable's *name* as a string constant, not its value, and Next inlines only
  `NEXT_PUBLIC_`-prefixed variables.
- **Storage policies are folder-scoped and split.** `sighting-photos` compares
  `auth.uid()::text` to the first path segment, with separate select/insert/delete policies
  and no update — so one account cannot read, overwrite or delete another's photographs.
- **Identity always comes from the token, never the request body.** `delete-account`,
  `redeem-deck-code` and `seed-packet` all resolve the caller via `auth.getUser()` under the
  caller's own JWT before touching a service-role client. This is what stops a forged
  `userId` in a body from having anything to attach to, and it is the property that makes
  the service-role clients safe to use at all.

---

## Recommended, not done

- **`herbdex-action` has no rate limit.** It runs six selects plus upserts per call, all
  under the caller's own RLS and all against their own rows, so the blast radius is one
  account's data and the cost is database time rather than money. It is also the main sync
  path, called on several ordinary app events — so a limit set too low breaks legitimate
  play, and picking the number needs real usage data this project does not have yet. Worth
  doing once the Plausible funnel shows what normal looks like.
- **Harden `claim_scan`'s `search_path`.** It uses `search_path = public`; the newer
  functions use `search_path = ''` with every object fully qualified, which is not shadowable
  by anything creatable in `public`. Supabase denies `anon` and `authenticated` `CREATE` on
  `public`, so the existing function is not exploitable today — this is about not relying on
  a platform default. Non-blocking, and it touches a primitive two functions depend on.

---

## Tests

| | |
|---|---|
| `supabase/tests/0009_atomic_scan_quota.test.sql` | 20 assertions, incl. 50 refused requests spending **zero** shared units |
| `src/lib/scan-quota-security.test.ts` | 10 assertions, incl. a rotating forged header collapsing to **one** bucket |
| `npm run verify` | 1349 tests, lint, typecheck, export |
| `npm run check:edge` | `deno check` across all five functions |

Run the migration tests with:

```
./scripts/test_migration.sh supabase/migrations/0009_atomic_scan_quota.sql \
                            supabase/tests/0009_atomic_scan_quota.test.sql
```

---

## Deployment order

`0009` must be applied **before** the new `identify-plant` is deployed: the function calls
`claim_scan_pair`, and against a database without it every identification fails. The
migration is additive — it creates one function and reads no row — and `claim_scan` is left
in place unchanged, so the currently deployed function keeps working throughout.

1. Apply `0009` to test, then production.
2. Deploy `identify-plant` and `seed-packet`.
3. Confirm a scan still works on the live site.
