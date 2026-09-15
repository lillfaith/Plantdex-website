import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

/**
 * THE CUSTOM-DOMAIN SWITCH.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Moving this site to a domain of its own is four settings and one repo variable, and three
 * of the four fail in ways a deploy log reports as success. This file exists because that
 * is exactly the shape of change nobody notices going wrong.
 *
 *   THE BASE PATH. A custom domain serves from the root. Leave `/Plantdex-website` on and
 *   every asset, every `next/link` href and both Supabase auth redirects 404 — a whole-site
 *   outage from a build that compiled, exported and uploaded perfectly.
 *
 *   THE CNAME. Pages reads it out of the artifact and adopts that domain. Committed to
 *   `public/`, it takes effect on the very next deploy, before any DNS exists, and Pages
 *   starts redirecting the working github.io URL at a hostname that does not resolve. A file
 *   with no code in it, taking the site down.
 *
 *   THE LIVE CHECK. It used to name its URL as a literal, so on cutover day it would keep
 *   passing against the old address while the real one was broken. A green check on a URL
 *   nobody visits is worse than no check, because it gets read as evidence.
 *
 * So all three hang off ONE variable, `SITE_DOMAIN`, and these tests fail if any of them
 * comes off it. The fourth — the Supabase redirect allow-list — is in a dashboard no test
 * can reach; `docs/custom-domain.md` is where that is written down.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DEPLOY = readFileSync('.github/workflows/deploy.yml', 'utf8');
const LIVE_CHECK = readFileSync('.github/workflows/check-live-site.yml', 'utf8');

/**
 * Loads the real config under a given environment.
 *
 * Deliberately the config itself rather than a regex over its source: what matters is the
 * `basePath` it RESOLVES TO, and a source match would keep passing on a refactor that
 * computed the wrong one. `resetModules` because a config module is cached after its first
 * import and would otherwise answer with whichever environment ran first.
 */
async function loadConfig(env: Record<string, string | undefined>) {
  const previous = { ...process.env };
  /*
   * DELETED, NOT ASSIGNED `undefined`. `process.env` coerces every write to a string, so
   * `Object.assign(process.env, { SITE_DOMAIN: undefined })` stores the literal five
   * characters "undefined" — which is truthy, and made the unset case test the set one.
   * The helper reported it as a config bug; the config was right.
   */
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.resetModules();
  try {
    return (await import('../../next.config')).default;
  } finally {
    process.env = previous;
  }
}

afterEach(() => {
  vi.resetModules();
});

describe('the base path follows the domain', () => {
  it('keeps the project path when no domain is set — today, unchanged', async () => {
    const config = await loadConfig({ GITHUB_PAGES: 'true', SITE_DOMAIN: undefined });
    expect(config.basePath).toBe('/Plantdex-website');
    expect(config.assetPrefix).toBe('/Plantdex-website');
    expect(config.env?.NEXT_PUBLIC_BASE_PATH).toBe('/Plantdex-website');
  });

  it('drops it entirely once a domain is set', async () => {
    const config = await loadConfig({ GITHUB_PAGES: 'true', SITE_DOMAIN: 'plantdex.example' });
    expect(config.basePath).toBeUndefined();
    expect(config.assetPrefix).toBeUndefined();
    /*
     * `asset-path.ts` reads this and returns its argument untouched when it is empty, which
     * is what makes every card image resolve from the root. An empty STRING, not undefined:
     * `NEXT_PUBLIC_BASE_PATH` is inlined at build time and `undefined` would inline the
     * literal word.
     */
    expect(config.env?.NEXT_PUBLIC_BASE_PATH).toBe('');
  });

  it('treats a blank or whitespace variable as unset', async () => {
    /*
     * An unset GitHub Actions variable interpolates as the EMPTY STRING, not as nothing —
     * so `SITE_DOMAIN: ${{ vars.SITE_DOMAIN }}` always reaches the build as a defined value.
     * A truthiness check on it alone would be right; this pins the trim as well, because a
     * domain pasted with a trailing space would otherwise drop the base path and write a
     * CNAME for a hostname with a space in it.
     */
    for (const blank of ['', '   ']) {
      const config = await loadConfig({ GITHUB_PAGES: 'true', SITE_DOMAIN: blank });
      expect(config.basePath).toBe('/Plantdex-website');
    }
  });

  it('never applies a base path off Pages, whatever the domain says', async () => {
    // `next dev` and the Playwright suite both serve from a bare localhost root.
    const config = await loadConfig({ GITHUB_PAGES: undefined, SITE_DOMAIN: 'plantdex.example' });
    expect(config.basePath).toBeUndefined();
  });
});

describe('the CNAME exists only when the domain does', () => {
  it('is not committed anywhere a build would copy it', () => {
    /*
     * The one file in this repository that could take the site down by existing. `public/`
     * is copied verbatim into the export, so a CNAME there is published on the next deploy
     * regardless of any variable.
     */
    expect(existsSync('public/CNAME')).toBe(false);
    expect(existsSync('CNAME')).toBe(false);
  });

  it('is written by the deploy workflow, gated on the same variable', () => {
    expect(DEPLOY).toMatch(/if: vars\.SITE_DOMAIN != ''/);
    expect(DEPLOY).toMatch(/> out\/CNAME/);
  });

  it('writes it with no trailing newline', () => {
    // Pages is tolerant, but a bare hostname is what the file is specified to hold, and
    // `echo` without -n is the reflex that puts a newline in it.
    expect(DEPLOY).toMatch(/echo -n "\$\{\{ vars\.SITE_DOMAIN \}\}" > out\/CNAME/);
  });

  it('passes the same variable into the build that decides the base path', () => {
    expect(DEPLOY).toMatch(/SITE_DOMAIN: \$\{\{ vars\.SITE_DOMAIN \}\}/);
  });
});

describe('the live check follows the domain', () => {
  it('derives its URL from the variable rather than naming a host', () => {
    expect(LIVE_CHECK).toMatch(/vars\.SITE_DOMAIN/);
    expect(LIVE_CHECK).toMatch(/format\('https:\/\/\{0\}', vars\.SITE_DOMAIN\)/);
  });

  it('still falls back to the current address, so unset changes nothing', () => {
    expect(LIVE_CHECK).toContain('https://lillfaith.github.io/Plantdex-website');
  });
});

describe('the cutover is written down where it can be followed', () => {
  const DOC = readFileSync('docs/custom-domain.md', 'utf8');

  it('names the Supabase allow-list, which no test can check', () => {
    /*
     * `auth-redirect.ts` builds from `window.location.origin`, so it follows the domain for
     * free — and Supabase then refuses to redirect anywhere not on its list. Password reset
     * and signup confirmation break while every page still loads, which is why this is the
     * step that needs a human to have read it.
     */
    expect(DOC).toMatch(/URL Configuration/);
    expect(DOC).toMatch(/redirect/i);
  });

  it('names the DNS records the registrar needs', () => {
    for (const ip of ['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153']) {
      expect(DOC).toContain(ip);
    }
  });

  it('names the variable the whole switch hangs off', () => {
    expect(DOC).toContain('SITE_DOMAIN');
  });
});
