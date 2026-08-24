/**
 * Where Supabase should send someone back to after they click a link it emailed them.
 *
 * Two links use this: the password-recovery link, and the signup confirmation link. Both
 * are built by hand rather than by `next/link`, so nothing else prefixes the base path
 * for them, and both have the same three ways to go wrong:
 *
 * They have to be ABSOLUTE — Supabase redirects the browser from its own domain, so a
 * site-relative path would resolve against Supabase, not against us.
 *
 * They have to carry the deployment's BASE PATH, because GitHub Pages serves this repo
 * from `/Plantdex-website`: `${origin}/account/reset/` 404s on the deployed site while
 * working perfectly in local dev, which is exactly the class of bug `asset-path.ts` exists
 * to stop.
 *
 * They have to keep the TRAILING SLASH. `trailingSlash: true` in next.config.ts means the
 * exported routes really are `/account/` and `/account/reset/`; asking for either without
 * the slash costs a redirect that some hosts answer by dropping the URL fragment — and the
 * fragment is where Supabase puts the token, so losing it breaks the whole flow.
 *
 * Whatever these return must also be on the Supabase project's redirect allow-list
 * (Authentication → URL Configuration), or Supabase refuses to redirect there at all.
 *
 * WHY SIGNUP NEEDS ONE TOO. Without an explicit `emailRedirectTo`, a confirmation link
 * falls back to whatever the dashboard's Site URL happens to be. That is invisible while
 * "Confirm email" is off, because no confirmation mail is ever sent — and it silently
 * becomes the whole signup path the moment it is turned on. One setting in a dashboard
 * nobody is looking at is a poor place for the base path to live when the code already
 * knows it.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const PASSWORD_RESET_PATH = '/account/reset/';

/**
 * Confirmation lands on the account page itself. supabase-js exchanges the token in the
 * fragment for a session on load and `AuthProvider`'s `onAuthStateChange` picks it up, so
 * someone arriving from their email is simply signed in and looking at their account —
 * no interstitial, and no separate route to keep in step with the allow-list.
 */
export const SIGNUP_CONFIRM_PATH = '/account/';

function absoluteUrl(origin: string, path: string): string {
  return `${origin.replace(/\/$/, '')}${BASE_PATH}${path}`;
}

/** Absolute URL of the password-reset page for the deployment `origin` serves. */
export function passwordResetRedirectUrl(origin: string): string {
  return absoluteUrl(origin, PASSWORD_RESET_PATH);
}

/** Absolute URL a signup confirmation link should return to. */
export function signupConfirmRedirectUrl(origin: string): string {
  return absoluteUrl(origin, SIGNUP_CONFIRM_PATH);
}
