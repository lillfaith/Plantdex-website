import type { NextConfig } from 'next';

/**
 * The site is fully static — every route is prerendered, there are no API routes or
 * server actions, and all player state lives in localStorage. So it exports to plain
 * files and can be served by any static host.
 *
 * GitHub Pages serves this repo from a project path (/Plantdex-website), which needs a
 * basePath. That is gated behind an env var set only by the deploy workflow, so local
 * `next dev` and the Playwright suite keep working at a bare localhost root.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE BASE PATH IS THE ONE THING A CUSTOM DOMAIN CHANGES, AND IT BREAKS EVERYTHING.
 *
 * A custom domain serves from the ROOT. Left as it is, every asset, every `next/link` href
 * and both Supabase auth redirects would point at `example.com/Plantdex-website/...` and
 * 404 — a whole-site outage that the deploy log reports as a success, because the build and
 * the upload both worked perfectly.
 *
 * So `SITE_DOMAIN` is the single switch, and it moves TWO things that must move together:
 * this base path, and the `CNAME` file that tells Pages the domain exists (written by the
 * deploy workflow, never committed to `public/` — a committed one would take effect on the
 * very next deploy, and Pages would start redirecting the working github.io URL to a
 * hostname that does not resolve yet). `custom-domain.test.ts` fails if they separate.
 *
 * UNSET IS TODAY'S BEHAVIOUR, EXACTLY. No domain, no CNAME, project path as before. See
 * `docs/custom-domain.md` for the cutover order — the DNS is the easy half; the Supabase
 * redirect allow-list is the half that fails silently.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

/**
 * The bare hostname the site is served from, e.g. `plantdex.example`. Empty everywhere it
 * has not been set — locally, in tests, and on Pages until the repo variable exists.
 */
const siteDomain = (process.env.SITE_DOMAIN ?? '').trim();

const basePath = isGitHubPages && !siteDomain ? '/Plantdex-website' : undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  // GitHub Pages serves directories, so emit /herbdex/<id>/index.html.
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: {
    // Required by `output: 'export'`. Nothing is lost: scripts/build_deck.py already
    // emits card art as correctly sized WebP, so the optimizer had little left to do.
    unoptimized: true,
  },
  env: {
    // Read by src/lib/asset-path.ts so image srcs resolve under the project path.
    NEXT_PUBLIC_BASE_PATH: basePath ?? '',
  },
};

export default nextConfig;
