'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/state/AuthProvider';
import { ForgotPasswordForm, SignInForm, SignUpForm } from '@/components/auth/AuthForms';
import { ImportLocalProgressDialog } from '@/components/auth/ImportLocalProgressDialog';
import { AccountDataSection } from '@/components/auth/AccountDataSection';
import { SafetyNotice } from '@/components/SafetyNotice';

export default function AccountPage() {
  const { ready, configured, user, signOut } = useAuth();
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
          <section className="panel p-5">
            <p className="text-xs font-semibold text-violet-400">Signed in as</p>
            <p className="mt-1 text-sm font-bold text-violet-100">{user.email}</p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-4 min-h-11 rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-plum-600"
            >
              Sign out
            </button>
          </section>
          {/* Rendered unconditionally so it keeps a stable position in the tree — it only
              actually opens once its own effect decides local progress should be offered. */}
          <ImportLocalProgressDialog userId={user.id} />
        </div>
      )}

      {/*
        Outside every branch on purpose. The export is offered signed out as well as signed
        in, because a signed-out collection lives only in this browser and is gone for good
        the moment site data is cleared — which is exactly the person who most needs a copy.
        Keeping it here also gives the delete dialog inside it a stable position in the tree,
        which matters: deleting an account signs the player out, and a dialog nested in the
        signed-in branch would be unmounted by its own success.
      */}
      {(!configured || ready) && (
        <div className="mt-6">
          <AccountDataSection userId={user?.id} email={user?.email ?? undefined} />
        </div>
      )}

      <div className="mt-6">
        <SafetyNotice variant="brief" />
      </div>
    </main>
  );
}
