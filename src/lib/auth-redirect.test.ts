import { describe, expect, it } from 'vitest';
import { PASSWORD_RESET_PATH, passwordResetRedirectUrl } from './auth-redirect';

/**
 * The recovery redirect is the one URL in this app that is built by hand rather than by
 * `next/link`, so nothing else prefixes the base path for it. Getting it wrong 404s only
 * on the deployed GitHub Pages site — never in local dev — which is precisely the failure
 * `asset-path.ts` already exists to prevent for images.
 *
 * `NEXT_PUBLIC_BASE_PATH` is inlined at build time, so these tests pin the shape of the
 * URL (absolute, trailing slash, no doubled slash) rather than trying to restub it.
 */
describe('passwordResetRedirectUrl', () => {
  it('is absolute, so Supabase redirects to us and not to itself', () => {
    expect(passwordResetRedirectUrl('https://lillfaith.github.io')).toMatch(
      /^https:\/\/lillfaith\.github\.io/,
    );
  });

  it('keeps the trailing slash the static export actually emits', () => {
    // trailingSlash: true means the real route is /account/reset/. Requesting it without
    // the slash costs a redirect, and a redirect can drop the URL fragment — which is
    // where Supabase puts the recovery token.
    expect(PASSWORD_RESET_PATH).toBe('/account/reset/');
    expect(passwordResetRedirectUrl('http://localhost:3000')).toMatch(/\/account\/reset\/$/);
  });

  it('never doubles the slash when origin has a trailing one', () => {
    expect(passwordResetRedirectUrl('http://localhost:3000/')).toBe(
      passwordResetRedirectUrl('http://localhost:3000'),
    );
    expect(passwordResetRedirectUrl('http://localhost:3000/')).not.toContain('//account');
  });

  it('includes the deployment base path so the Pages project URL resolves', () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    expect(passwordResetRedirectUrl('https://example.test')).toBe(
      `https://example.test${basePath}/account/reset/`,
    );
  });
});
