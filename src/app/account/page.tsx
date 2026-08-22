'use client';

import { useAuth } from '@/state/AuthProvider';
import { SignInForm, SignUpForm } from '@/components/auth/AuthForms';
import { ImportLocalProgressDialog } from '@/components/auth/ImportLocalProgressDialog';
import { SafetyNotice } from '@/components/SafetyNotice';

export default function AccountPage() {
  const { ready, configured, user, signOut } = useAuth();

  return (
    <main id="main" className="mx-auto max-w-md px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-gold-plate">Account</h1>

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
              Sign in
            </h2>
            <p className="mt-1 text-xs text-violet-400">
              Your collection follows you to any device you sign in on.
            </p>
            <div className="mt-4">
              <SignInForm />
            </div>
          </section>
          <section className="panel p-5">
            <h2 className="text-sm font-bold tracking-wide text-gold-400 uppercase">
              Create an account
            </h2>
            <div className="mt-4">
              <SignUpForm />
            </div>
          </section>
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
              className="mt-4 min-h-11 rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-violet-800"
            >
              Sign out
            </button>
          </section>
          {/* Rendered unconditionally so it keeps a stable position in the tree — it only
              actually opens once its own effect decides local progress should be offered. */}
          <ImportLocalProgressDialog userId={user.id} />
        </div>
      )}

      <div className="mt-6">
        <SafetyNotice variant="brief" />
      </div>
    </main>
  );
}
