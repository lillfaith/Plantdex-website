import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Security properties of the identification quota, asserted against the edge function's own
 * source. It is Deno — `npm:` specifiers, `Deno.env` — so it cannot be imported here; the
 * pure helper is extracted and compiled instead, which is the same approach
 * `deck-code.test.ts` takes for the redemption normaliser.
 */
const FN = 'supabase/functions/identify-plant/index.ts';

function source(): string {
  return readFileSync(FN, 'utf8');
}

/** `callerAddress`, lifted out and made callable with a fake request. */
function callerAddress(headers: Record<string, string | undefined>): string {
  const body = source().match(
    /function callerAddress\(req: Request\): string \{([\s\S]*?)\n\}/,
  );
  if (!body) throw new Error(`${FN} must define callerAddress`);
  const fn = new Function('req', body[1] ?? '') as (req: unknown) => string;
  return fn({
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  });
}

/**
 * THE VULNERABILITY THIS FILE EXISTS FOR.
 *
 * The anonymous quota bucket is keyed on the caller's address, and the function used to read
 * `x-forwarded-for`'s LEFTMOST entry. That header is an append-only trail — `client, proxy1,
 * proxy2` — so the left-hand entries are the ones nobody verified. A request could simply
 * arrive with one already set, and a different value per request bought a fresh allowance
 * every time: unlimited anonymous identifications, each a real paid provider call, from a
 * single machine with one extra header. The per-IP limit was decorative.
 */
describe('the quota bucket cannot be chosen by the caller', () => {
  it('ignores a forged X-Forwarded-For when the edge reports the real address', () => {
    // `cf-connecting-ip` is set by the edge in front of these functions and overwritten on
    // every request, so a client-supplied copy cannot survive. It therefore wins outright.
    expect(
      callerAddress({
        'cf-connecting-ip': '198.51.100.7',
        'x-forwarded-for': '1.1.1.1, 2.2.2.2',
      }),
    ).toBe('198.51.100.7');
  });

  it('takes the LAST X-Forwarded-For hop, never the first', () => {
    // The last entry is the most recent hop, appended by infrastructure rather than claimed
    // by the caller. Reading [0] is the bug.
    expect(callerAddress({ 'x-forwarded-for': '203.0.113.9, 198.51.100.7' })).toBe(
      '198.51.100.7',
    );
  });

  it('gives a rotating attacker ONE bucket, not a fresh one per request', () => {
    /*
     * The attack, directly. An attacker varies the forged left-hand entry on every request
     * while the real trailing hop stays what it is. Under the old code each of these was a
     * different bucket and therefore a new allowance; all of them must now collapse onto the
     * same key, so the limit actually binds.
     */
    const forged = ['1.1.1.1', '2.2.2.2', '3.3.3.3', '', '  ', 'not-an-ip', '::1'];
    const buckets = new Set(
      forged.map((claim) => callerAddress({ 'x-forwarded-for': `${claim}, 198.51.100.7` })),
    );
    expect(buckets.size, 'a rotating forged header must not rotate the bucket').toBe(1);
    expect([...buckets][0]).toBe('198.51.100.7');
  });

  it('falls back to one SHARED bucket, which is the restrictive direction', () => {
    // Everybody who arrives with no usable header shares one allowance. That is deliberately
    // the worst outcome for a caller and not an escape hatch: stripping headers must never
    // buy a bigger quota than keeping them.
    expect(callerAddress({})).toBe('unknown');
    expect(callerAddress({ 'x-forwarded-for': '' })).toBe('unknown');
    expect(callerAddress({ 'x-forwarded-for': ' , , ' })).toBe('unknown');
  });

  it('does not read the leftmost entry anywhere in the function', () => {
    // Source-level, because the hazard is a one-character edit away: `[0]` instead of the
    // last hop reintroduces the whole vulnerability silently.
    const stripped = source().replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(stripped, 'reading split(",")[0] of x-forwarded-for is the bug').not.toMatch(
      /x-forwarded-for[\s\S]{0,120}?\[0\]/i,
    );
  });
});

/**
 * THE SECOND VULNERABILITY: the shared pool was spent before the caller's own limit was
 * checked, so one machine could drain the shared 450 and take identification down for every
 * user of the product, daily. Migration 0009 makes it one atomic decision; these pin that
 * the function actually uses it and reads both refusals.
 */
describe('the shared allowance is claimed atomically with the caller’s own', () => {
  it('uses claim_scan_pair, not two separate claims', () => {
    const src = source();
    expect(src).toContain("admin.rpc('claim_scan_pair'");
    // The old shape: a bare global claim. Its return is what made the ordering exploitable.
    expect(src, 'a separate global claim_scan reintroduces the DoS').not.toMatch(
      /claim_scan['"],\s*\{\s*p_bucket:\s*['"]global/,
    );
  });

  it('distinguishes "your limit" from "everybody’s limit"', () => {
    // One means come back tomorrow; the other means this is not your fault. Collapsing them
    // into a single falsy check makes the second unanswerable in support.
    const src = source();
    expect(src).toMatch(/claimed === -1/);
    expect(src).toMatch(/claimed === -2/);
    expect(src).toContain("code: 'rateLimited'");
    expect(src).toContain("code: 'globalLimit'");
  });

  it('resolves the caller before claiming, because the bucket depends on who they are', () => {
    const src = source();
    const resolve = src.indexOf('const userId = await resolveCaller()');
    const claim = src.indexOf("admin.rpc('claim_scan_pair'");
    expect(resolve).toBeGreaterThan(-1);
    expect(claim).toBeGreaterThan(resolve);
  });
});

/**
 * The provider key travels as a query parameter, so any provider text that leaves this
 * function is redacted. Worth pinning: the failure is a credential in a response body.
 */
describe('the provider key cannot leave in an error', () => {
  it('redacts key-shaped text, and the redactor is applied not merely defined', () => {
    const src = source();
    expect(src).toMatch(/function redact\(/);
    const calls = src.match(/redact\(/g) ?? [];
    expect(calls.length, 'redact is defined but never used').toBeGreaterThan(1);
  });

  it('never logs the raw request URL or the key', () => {
    const stripped = source().replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    expect(stripped).not.toMatch(/console\.(log|info|debug)\(/);
  });
});
