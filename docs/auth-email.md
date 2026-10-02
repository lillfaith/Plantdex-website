# Why a password-reset email does not arrive

**The app is not the problem, and no code change can fix this one.** It is a Supabase
project setting. This file exists because the symptom is silent: the site says a link is on
its way, Supabase returns no error, and nothing is delivered.

## What the app does

`AuthProvider.requestPasswordReset` calls `supabase.auth.resetPasswordForEmail` with a
`redirectTo` built by `passwordResetRedirectUrl()` — absolute, carrying the deployment's base
path, keeping its trailing slash (see `src/lib/auth-redirect.ts` for why each of those three
matters). Any error comes straight back and is shown on the form, translated by
`src/lib/auth-errors.ts`.

So **an error on screen is an app-level answer, and silence is not.** If the form says a link
is on its way, Supabase accepted the request. Delivery is downstream of that.

## The cause, almost always

Supabase's built-in email service is a demo server, and its documented limits are exactly the
symptom:

> Unless you configure a custom SMTP server for your project, Supabase Auth will refuse to
> deliver messages to addresses that are not part of the project's team.

It is also capped at **two messages per hour for the whole project**, and Supabase states it
is not intended for production — no delivery or uptime guarantee.

Read together: a reset for any address that is not a member of the Supabase organisation is
accepted and then dropped. There is no error because, from Supabase's side, nothing failed.

## The fix

**Authentication → Emails → SMTP Settings**, in the Supabase dashboard for project
`vygiamigomwlvnwkryyl`. Supply credentials for a real transactional sender (Resend, Postmark,
SendGrid, Mailgun, SES — any of them). With custom SMTP the team-only restriction is gone and
the default limit becomes 30 new users per hour, itself adjustable.

Two things to get right while in there:

- **The From address must be on a domain you control**, and that domain needs SPF and DKIM
  records or mail goes to spam — which looks identical to not sending. `plantdex.online` is
  yours, so `no-reply@plantdex.online` is the natural choice.
- **Send yourself a test** from an address that is *not* a Supabase team member. Testing with
  your own team address passes on the built-in server too, so it proves nothing about the
  thing you just changed.

## The other setting that breaks this, differently

**Authentication → URL Configuration → Redirect URLs** must list
`https://plantdex.online/account/reset/`. Unlisted, Supabase refuses the redirect — the mail
arrives and the link fails. That is a different symptom from this file's, and
`auth-redirect.ts` carries the full note.

## What was ruled out

- The client exchanges the token correctly: `createClient` is left on its defaults, so
  `detectSessionInUrl` is on and the implicit flow puts the token in the fragment, which is
  what `/account/reset/` reads.
- Errors are surfaced rather than swallowed, in both the request form and the new-password
  form.
- The redirect URL is built for the live domain from `window.location.origin`, so it followed
  the custom-domain move without an edit.
