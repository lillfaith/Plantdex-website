import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { resolveMinImages } from './observation-bounds';
import { MAX_OBSERVATION_PHOTOS, MIN_OBSERVATION_PHOTOS } from './scans';

/**
 * THE PHOTOGRAPH FLOOR, AND THE ONE DEPLOYMENT ALLOWED TO MOVE IT.
 *
 * `IDENTIFY_MIN_IMAGES` exists for exactly one question: does the second photograph buy
 * enough accuracy to justify making every player take it? That cannot be measured against a
 * deployment that hard-codes the answer, so the test project may lower the floor to one.
 *
 * Which makes the DEFAULT the thing to nail down. Production never sets the variable, so
 * every test below that passes no override is a test of what production does — and the
 * failure mode to fear is not a floor that is too high (one refused scan, loudly) but one
 * that quietly is not there at all, on a public endpoint, because somebody typed `0` or
 * `two` or left a stray quote in a dashboard field.
 */

const BOUNDS = { fallback: MIN_OBSERVATION_PHOTOS, max: MAX_OBSERVATION_PHOTOS };
const FUNCTION = 'supabase/functions/identify-plant/index.ts';

/** What the endpoint does with a given count, expressed as the check it actually performs. */
function accepts(count: number, override?: string): boolean {
  return count >= resolveMinImages(override, BOUNDS);
}

describe('the default floor, which is what production runs', () => {
  it('is two, and rejects a single photograph', () => {
    // The variable unset is the production configuration, stated three ways because each is
    // a different thing somebody could get wrong.
    expect(resolveMinImages(undefined, BOUNDS)).toBe(2);
    expect(accepts(1)).toBe(false);
    expect(accepts(2)).toBe(true);
  });

  it('rejects a single photograph however the variable is absent or malformed', () => {
    /*
     * Every one of these is a realistic thing to find in an environment: a variable declared
     * and left blank, a value with a stray space or quote, a word, a fraction, a zero, a
     * negative, a number in a notation nobody meant. NOT ONE of them may open the endpoint
     * to a single image, because the whole point of the default is that it holds when the
     * configuration is wrong.
     */
    const junk = [
      undefined,
      null,
      '',
      '   ',
      '0',
      '-1',
      'one',
      'two',
      '1.0',
      '1.5',
      '1e0',
      '0x1',
      '+1',
      ' 1', // NOT trimmed into a valid 1 by accident: it is, and that is tested below.
      'Infinity',
      'NaN',
      'true',
      '"1"',
      '1;',
      '9007199254740993',
    ];
    for (const raw of junk) {
      // ' 1' trims to a legitimate 1 and is the one member of this list that IS an override.
      if (raw === ' 1') continue;
      expect(resolveMinImages(raw, BOUNDS), `${JSON.stringify(raw)} must not lower the floor`).toBe(
        2,
      );
      expect(accepts(1, raw ?? undefined), `${JSON.stringify(raw)} must reject one image`).toBe(
        false,
      );
    }
  });

  it('agrees with the browser, which refuses before the request is ever made', () => {
    // Two independent refusals for one rule. The endpoint is reachable without the button.
    expect(MIN_OBSERVATION_PHOTOS).toBe(resolveMinImages(undefined, BOUNDS));
  });
});

describe('the test-environment override', () => {
  it('permits a single photograph when it is explicitly set to 1', () => {
    expect(resolveMinImages('1', BOUNDS)).toBe(1);
    expect(accepts(1, '1')).toBe(true);
    // And still accepts the ordinary counts: lowering a floor is not capping a ceiling.
    expect(accepts(2, '1')).toBe(true);
    expect(accepts(3, '1')).toBe(true);
  });

  it('tolerates the surrounding whitespace a dashboard field tends to add', () => {
    expect(resolveMinImages(' 1 ', BOUNDS)).toBe(1);
    expect(resolveMinImages('\n2\n', BOUNDS)).toBe(2);
  });

  it('may raise the floor, and is clamped below the ceiling rather than honoured above it', () => {
    expect(resolveMinImages('3', BOUNDS)).toBe(3);
    /*
     * A floor above MAX_IMAGES would refuse EVERY request that could ever be made — the
     * endpoint would be off, and the error would blame the caller for sending too few
     * photographs while another check refused them for sending too many. Clamping is the
     * behaviour that leaves a misconfigured deployment usable.
     */
    expect(resolveMinImages('4', BOUNDS)).toBe(MAX_OBSERVATION_PHOTOS);
    expect(resolveMinImages('99', BOUNDS)).toBe(MAX_OBSERVATION_PHOTOS);
    expect(accepts(3, '99')).toBe(true);
  });
});

describe('the deployed function reads the same rule', () => {
  /*
   * A pure function nothing calls is a rule that is not enforced. These read the real source
   * because `supabase/functions/**` is Deno — excluded from this project's tsconfig and
   * ESLint, so nothing else in `npm run verify` looks at it. Same idiom as
   * `observation-photos.test.ts`, and the reason `npm run check:edge` exists beside it.
   */
  const fn = readFileSync(FUNCTION, 'utf8');

  it('derives its floor from the shared resolver, not from a second copy of the guards', () => {
    expect(fn).toContain("import { resolveMinImages } from '../_shared/herbdex/observation-bounds.ts'");
    expect(fn).toContain("resolveMinImages(Deno.env.get('IDENTIFY_MIN_IMAGES')");
  });

  it('still declares the default as the constant the browser is pinned to', () => {
    expect(fn).toContain(`const MIN_IMAGES = ${MIN_OBSERVATION_PHOTOS};`);
    expect(fn).toContain(`const MAX_IMAGES = ${MAX_OBSERVATION_PHOTOS};`);
    expect(fn).toContain('fallback: MIN_IMAGES');
    expect(fn).toContain('max: MAX_IMAGES');
  });

  it('compares the request against the resolved floor rather than the default', () => {
    /*
     * THE REGRESSION THIS EXISTS FOR. Adding the override and leaving the comparison on
     * `MIN_IMAGES` would typecheck, deploy, pass every other test, and do nothing at all —
     * the variable would be set on the test project and the 1-photograph arm would keep
     * recording 400s that look like a result.
     */
    expect(fn).toContain('files.length < MIN_IMAGES_FLOOR');
    expect(fn).not.toMatch(/files\.length\s*<\s*MIN_IMAGES\b(?!_)/);
  });
});
