'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/state/AuthProvider';
import { NewPasswordForm } from '@/components/auth/AuthForms';
import { SafetyNotice } from '@/components/SafetyNotice';

/**
 * Where a password-recovery email lands.
 *
 * supabase-js reads the recovery token out of the URL fragment on load, exchanges it for a
 * session, and emits `PASSWORD_RECOVERY` — which `AuthProvider` latches as `recovering`.
 * So this page waits for `ready` rather than deciding anything on first paint: the token
 * exchange is asynchronous, and rendering "this link is invalid" before it finishes would
 * accuse a perfectly good link.
 *
 * A used or expired link establishes no session at all, which is what makes the
 * signed-out branch the honest one to show for it.
 */
export default function ResetPasswordPage() {
  const { ready, configured, user, recovering } = useAuth();
  const [done, setDone] = useState(false);

  return (
    <main id="main" className="mx-auto max-w-md px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-gold-plate">Set a new password</h1>

      {!configured && (
        <p className="mt-4 text-sm text-violet-300">
          Accounts aren&apos;t set up on this deployment yet.
        </p>
      )}

      {configured && !ready && <p className="mt-4 text-sm text-violet-300">Checking your link…</p>}

      {configured && ready && done && (
        <section className="panel mt-6 p-5">
          <p className="text-sm text-violet-100">
            Your password has been changed. Your collection is exactly as you left it.
          </p>
          <Link
            href="/account"
            className="mt-4 inline-flex min-h-11 items-center rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400"
          >
            Go to your account
          </Link>
        </section>
      )}

      {/* A recovery link signs you in, so `user` is set here as well as `recovering`. Both
          are required: being merely signed in is not grounds to skip knowing the old
          password, or anyone leaving a session open would hand over the account. */}
      {configured && ready && !done && recovering && user && (
        <section className="panel mt-6 p-5">
          <p className="text-xs font-semibold text-violet-400">Setting a new password for</p>
          <p className="mt-1 mb-4 text-sm font-bold text-violet-100">{user.email}</p>
          <NewPasswordForm onDone={() => setDone(true)} />
        </section>
      )}

      {configured && ready && !done && !(recovering && user) && (
        <section className="panel mt-6 p-5">
          <p className="text-sm text-violet-200">
            This link has expired or has already been used. Reset links are single-use and
            last an hour.
          </p>
          <Link
            href="/account"
            className="mt-4 inline-flex min-h-11 items-center rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-plum-600"
          >
            Request a new one
          </Link>
        </section>
      )}

      <div className="mt-6">
        <SafetyNotice variant="brief" />
      </div>
    </main>
  );
}
