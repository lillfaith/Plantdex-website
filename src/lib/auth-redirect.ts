/**
 * Where Supabase should send someone back to after they click a password-recovery link.
 *
 * This has to be an absolute URL — Supabase redirects the browser to it from its own
 * domain, so a site-relative path would resolve against Supabase, not against us. And it
 * has to carry the deployment's base path, because GitHub Pages serves this repo from
 * `/Plantdex-website`: `${origin}/account/reset/` 404s on the deployed site while working
 * perfectly in local dev, which is exactly the class of bug `asset-path.ts` exists to stop.
 *
 * `trailingSlash: true` in next.config.ts means the exported route really is
 * `/account/reset/`; asking for it without the slash costs a redirect that some hosts
 * answer by dropping the URL fragment — and the fragment is where Supabase puts the
 * recovery token, so losing it would break the whole flow.
 *
 * Whatever this returns must also be on the Supabase project's redirect allow-list
 * (Authentication → URL Configuration), or Supabase refuses to redirect there at all.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const PASSWORD_RESET_PATH = '/account/reset/';

/** Absolute URL of the password-reset page for the deployment `origin` serves. */
export function passwordResetRedirectUrl(origin: string): string {
  return `${origin.replace(/\/$/, '')}${BASE_PATH}${PASSWORD_RESET_PATH}`;
}
