/**
 * Supabase's own auth error strings, said the way a player would say them.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THESE WERE RENDERED VERBATIM, AND TWO OF THEM ARE THE ONES PEOPLE ACTUALLY HIT.
 * "For security purposes, you can only request this after 47 seconds" is a sentence about
 * somebody else's rate limiter; "email rate limit exceeded" reads like a fault in the
 * account rather than a wait. Neither tells a player what to do, and the second is exactly
 * what the OWNER sees while testing, because Supabase's built-in mail server is capped at
 * two messages an hour for the whole project.
 *
 * MATCHED ON DISTINCTIVE SUBSTRINGS, CASE-INSENSITIVELY, NEVER ON THE WHOLE STRING. These
 * messages are a third party's copy and are free to be reworded without warning; an exact
 * match would silently stop firing and put the raw text back on screen, which is the failure
 * mode this module exists to remove. A miss FALLS THROUGH to the original message rather
 * than to a generic apology — an unrecognised error a player can search for beats a friendly
 * sentence that says nothing.
 *
 * WHAT THIS DELIBERATELY CANNOT FIX. If Supabase accepts a reset request and never delivers
 * the mail, there is no error here to translate — see `docs/auth-email.md`. That is a
 * project-configuration fact, and no amount of copy can stand in for custom SMTP.
 * ─────────────────────────────────────────────────────────────────────────────
 */

interface Rule {
  readonly match: RegExp;
  /** Receives the raw message so a rule can lift a number out of it. */
  readonly say: (raw: string) => string;
}

const RULES: readonly Rule[] = [
  {
    /*
     * The per-address cooldown, roughly a minute. It carries the remaining seconds, which is
     * the one genuinely useful thing in it, so the rewrite keeps the number and drops the
     * rest of the sentence.
     */
    match: /only request this after (\d+) seconds?/i,
    say: (raw) => {
      const seconds = /after (\d+) seconds?/i.exec(raw)?.[1];
      return seconds
        ? `Just a moment — you can ask for another link in ${seconds} seconds.`
        : 'Just a moment — you can ask for another link shortly.';
    },
  },
  {
    /*
     * The project-wide cap. On Supabase's built-in mail server that is two messages an hour
     * for EVERYBODY, so this is far likelier to be the deployment's limit than anything the
     * player did — and the copy says so rather than implying they were hasty.
     */
    match: /email rate limit exceeded|over_email_send_rate_limit/i,
    say: () =>
      'Too many emails have been sent from this site in the last hour. Please try again later.',
  },
  {
    match: /unable to validate email address|invalid format/i,
    say: () => 'That does not look like an email address. Check it and try again.',
  },
  {
    match: /password should be at least (\d+)/i,
    say: (raw) => {
      const min = /at least (\d+)/i.exec(raw)?.[1] ?? '6';
      return `Please choose a password of at least ${min} characters.`;
    },
  },
  {
    match: /should be different from the old password/i,
    say: () => 'That is already your password. Choose a different one.',
  },
  {
    /*
     * The redirect allow-list. A player can do nothing about this one, but naming it plainly
     * is what turns a silent dead end into a bug report the owner can act on — it means the
     * deployment's URL is missing from Authentication → URL Configuration.
     */
    match: /redirect|not allowed/i,
    say: () => 'This site is not set up to complete that link yet. Please let us know.',
  },
  {
    match: /invalid login credentials/i,
    say: () => 'That email and password do not match an account.',
  },
  {
    match: /email not confirmed/i,
    say: () => 'Confirm your email address first — check your inbox for the link we sent.',
  },
];

/** Rewrite one Supabase auth error, or return it unchanged when nothing matches. */
export function friendlyAuthError(raw: string | null): string | null {
  if (!raw) return null;
  for (const rule of RULES) {
    if (rule.match.test(raw)) return rule.say(raw);
  }
  return raw;
}

/**
 * Whether an error is the per-address cooldown, which a resend button should respect rather
 * than let somebody hammer. Returns the seconds to wait, or null.
 */
export function cooldownSeconds(raw: string | null): number | null {
  if (!raw) return null;
  const seconds = /only request this after (\d+) seconds?/i.exec(raw)?.[1];
  return seconds ? Number(seconds) : null;
}
