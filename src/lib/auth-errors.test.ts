import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cooldownSeconds, friendlyAuthError } from './auth-errors';

describe('Supabase auth errors are said the way a player would say them', () => {
  it('keeps the number out of the per-address cooldown and drops the rest', () => {
    expect(friendlyAuthError('For security purposes, you can only request this after 47 seconds.'))
      .toBe('Just a moment — you can ask for another link in 47 seconds.');
  });

  it('blames the deployment for the project-wide cap, because that is whose limit it is', () => {
    /*
     * Supabase's built-in mail server sends two messages an hour FOR THE WHOLE PROJECT, so
     * this is far likelier to be the site's limit than anything the player did. Copy that
     * implied they had been hasty would be blaming the wrong party.
     */
    for (const raw of ['email rate limit exceeded', 'over_email_send_rate_limit']) {
      expect(friendlyAuthError(raw), raw).toMatch(/from this site in the last hour/);
    }
  });

  it('says a redirect failure is the site’s to fix, not the reader’s', () => {
    expect(friendlyAuthError('Invalid redirect URL')).toMatch(/not set up|let us know/i);
  });

  it('FALLS THROUGH to the original rather than to a generic apology', () => {
    /*
     * The load-bearing default. These strings are a third party's copy and may be reworded
     * without warning; a miss must leave something a player can search for and an owner can
     * recognise, not "something went wrong" — which would turn a reworded message into an
     * untraceable dead end.
     */
    const unknown = 'Some entirely new Supabase message';
    expect(friendlyAuthError(unknown)).toBe(unknown);
    expect(friendlyAuthError(null)).toBeNull();
  });

  it('matches on substrings, case-insensitively, never on the whole message', () => {
    // Same rule, from the other side: wrapping or re-casing must not stop a rule firing.
    expect(friendlyAuthError('AuthApiError: Email Rate Limit Exceeded (429)'))
      .toMatch(/from this site in the last hour/);
  });

  it('reads the cooldown back as a number a button can count down from', () => {
    expect(cooldownSeconds('you can only request this after 9 seconds')).toBe(9);
    expect(cooldownSeconds('email rate limit exceeded')).toBeNull();
    expect(cooldownSeconds(null)).toBeNull();
  });
});

describe('the reset flow does not leave a dead end', () => {
  const FORM = readFileSync('src/components/auth/AuthForms.tsx', 'utf8');

  it('offers a resend, a correction and the spam folder once a link is sent', () => {
    /*
     * "It never arrived" is the ordinary case, and the sent screen used to answer it with
     * one link back to sign in — so the only route to a second attempt was retyping the
     * address. All three of these are about that one moment.
     */
    expect(FORM).toMatch(/Resend the link/);
    expect(FORM).toMatch(/Use a different address/);
    expect(FORM).toMatch(/spam or junk folder/i);
  });

  it('disables the resend while Supabase’s own cooldown is running', () => {
    // Pressing a button to be told off by a rate limiter is not a flow; the wait is shown.
    expect(FORM).toMatch(/disabled=\{status === 'resending' \|\| waitSeconds > 0\}/);
    expect(FORM).toMatch(/Resend in \$\{waitSeconds\}s/);
  });

  it('still answers identically whether or not the address has an account', () => {
    /*
     * The property the whole form is shaped around: it must not become a way to test which
     * addresses are registered. "Use a different address" offers a correction without
     * confirming anything, and the sent copy stays conditional.
     */
    expect(FORM).toMatch(/If an account exists for/);
  });

  it('shows no raw Supabase string in the reset flow', () => {
    // Both error sinks in this flow go through the translator.
    const resetHalf = FORM.slice(FORM.indexOf('export function ForgotPasswordForm'));
    expect(resetHalf).not.toMatch(/setError\(result\.error\)/);
  });
});
