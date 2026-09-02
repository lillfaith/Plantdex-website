'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/state/AuthProvider';
import { ForgotPasswordForm, SignInForm, SignUpForm } from '@/components/auth/AuthForms';
import { ImportLocalProgressDialog } from '@/components/auth/ImportLocalProgressDialog';
import { SafetyNotice } from '@/components/SafetyNotice';

export default function AccountPage() {
  const { ready, configured, user } = useAuth();
  const [forgot, setForgot] = useState(false);

  return (
    <main id="main" className="mx-auto max-w-md px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-gold-plate">Account</h1>

      {/*
        Reached from here as well as from the Herbdex, because "my profile" is the thing
        people look for on an account page — and it works signed out too, so it sits outside
        every branch below.
      */}
      <Link
        href="/profile"
        className="panel mt-4 flex min-h-14 items-center justify-between gap-3 p-4 transition-colors hover:bg-plum-600/50"
      >
        <span>
          <span className="block text-sm font-bold text-violet-100">Your profile</span>
          <span className="block text-xs text-violet-300">
            Level, collection, habitats and the plants that travel with you
          </span>
        </span>
        <span aria-hidden="true" className="text-gold-400">
          &rarr;
        </span>
      </Link>

      {!configured && (
        <p className="mt-4 text-sm text-violet-300">
          Accounts aren&apos;t set up on this deployment yet. Your progress is still saved
          on this device.
        </p>
      )}

      {configured && !ready && <p className="mt-4 text-sm text-violet-300">Loading…</p>}

      {configured && ready && !user && (
        <div className="mt-6 space-y-8">
          <section className="panel p-5">
            <h2 className="text-sm font-bold tracking-wide text-gold-400 uppercase">
              {forgot ? 'Reset your password' : 'Sign in'}
            </h2>
            {!forgot && (
              <p className="mt-1 text-xs text-violet-400">
                Your collection follows you to any device you sign in on.
              </p>
            )}
            <div className="mt-4">
              {forgot ? (
                <ForgotPasswordForm onCancel={() => setForgot(false)} />
              ) : (
                <SignInForm onForgotPassword={() => setForgot(true)} />
              )}
            </div>
          </section>
          {/* Hidden while resetting: offering "create an account" to someone who just said
              they already have one is how a player ends up with two. */}
          {!forgot && (
            <section className="panel p-5">
              <h2 className="text-sm font-bold tracking-wide text-gold-400 uppercase">
                Create an account
              </h2>
              <div className="mt-4">
                <SignUpForm />
              </div>
            </section>
          )}
        </div>
      )}

      {configured && ready && user && (
        <div className="mt-6 space-y-4">
          {/*
            THIS PAGE IS THE DOOR, NOT THE DESTINATION.

            Identity, "your data" and account deletion all live on the profile now. They were
            MOVED rather than copied: deletion is irreversible, and an irreversible action
            offered in two places is one somebody meets twice and trusts less each time. So
            once you are through, this page's job is to point at the profile and get out of
            the way.
          */}
          <section className="panel p-5">
            <p className="text-xs font-semibold text-violet-400">Signed in as</p>
            <p className="mt-1 truncate text-sm font-bold text-violet-100">{user.email}</p>
            <Link
              href="/profile"
              className="mt-4 inline-flex min-h-11 items-center rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-plum-600"
            >
              Your profile, data and sign out &rarr;
            </Link>
          </section>
          {/* Rendered unconditionally so it keeps a stable position in the tree — it only
              actually opens once its own effect decides local progress should be offered.

              IT STAYS HERE, NOT ON THE PROFILE. Its effect fires on `userId`, and a player
              who has just signed in lands on THIS page — so this is the only place the
              local-progress offer reliably gets a chance to appear. */}
          <ImportLocalProgressDialog userId={user.id} />
        </div>
      )}

      <div className="mt-6">
        <SafetyNotice variant="brief" />
      </div>
    </main>
  );
}
