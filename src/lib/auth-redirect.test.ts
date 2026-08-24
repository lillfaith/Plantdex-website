import { describe, expect, it } from 'vitest';
import {
  PASSWORD_RESET_PATH,
  SIGNUP_CONFIRM_PATH,
  passwordResetRedirectUrl,
  signupConfirmRedirectUrl,
} from './auth-redirect';

/**
 * These two redirects are the only URLs in this app built by hand rather than by
 * `next/link`, so nothing else prefixes the base path for them. Getting it wrong 404s only
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

describe('signupConfirmRedirectUrl', () => {
  it('lands on the account page, where the session is picked up', () => {
    // supabase-js exchanges the token in the fragment on load and AuthProvider's
    // onAuthStateChange sees it, so confirming an email signs you in on arrival.
    expect(SIGNUP_CONFIRM_PATH).toBe('/account/');
  });

  it('keeps the trailing slash, so the fragment carrying the token survives', () => {
    expect(signupConfirmRedirectUrl('https://lillfaith.github.io')).toMatch(/\/account\/$/);
  });

  it('includes the deployment base path, like the reset link does', () => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    expect(signupConfirmRedirectUrl('https://example.test')).toBe(
      `https://example.test${basePath}/account/`,
    );
  });

  it('never doubles the slash when origin has a trailing one', () => {
    expect(signupConfirmRedirectUrl('http://localhost:3000/')).toBe(
      signupConfirmRedirectUrl('http://localhost:3000'),
    );
  });

  it('is a different destination from the recovery link', () => {
    // Both must be on the Supabase redirect allow-list; collapsing them into one would
    // send someone resetting a password to the wrong page.
    expect(signupConfirmRedirectUrl('https://example.test')).not.toBe(
      passwordResetRedirectUrl('https://example.test'),
    );
  });
});
