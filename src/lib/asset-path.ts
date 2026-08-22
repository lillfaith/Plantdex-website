/**
 * Resolve a path to a file in `public/` against the deployment's base path.
 *
 * Why this exists: when the site is exported for a GitHub Pages *project* site it is
 * served from `/Plantdex-website`, and Next prefixes its own `_next/` assets and all
 * `next/link` hrefs automatically — but it does **not** prefix the `src` of `next/image`
 * when `images.unoptimized` is set (which static export requires). Without this helper
 * every card image resolves to `/cards/...` and 404s on the deployed site while working
 * perfectly in local dev. Verified against the generated HTML, not assumed.
 *
 * Paths in `src/data/herbs.json` stay host-agnostic on purpose — the data should not know
 * where it happens to be deployed. This is the single place that knows.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function assetPath(path: string): string {
  if (!BASE_PATH) return path;
  // Only rewrite site-root-relative paths; leave absolute URLs and data URIs alone.
  if (!path.startsWith('/')) return path;
  return `${BASE_PATH}${path}`;
}
