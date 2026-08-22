import type { NextConfig } from 'next';

/**
 * The site is fully static — every route is prerendered, there are no API routes or
 * server actions, and all player state lives in localStorage. So it exports to plain
 * files and can be served by any static host.
 *
 * GitHub Pages serves this repo from a project path (/Plantdex-website), which needs a
 * basePath. That is gated behind an env var set only by the deploy workflow, so local
 * `next dev` and the Playwright suite keep working at a bare localhost root.
 */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const basePath = isGitHubPages ? '/Plantdex-website' : undefined;

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
