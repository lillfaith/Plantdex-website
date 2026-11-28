'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/state/AuthProvider';
import { useHerbdex } from '@/state/HerbdexProvider';
import { ForgotPasswordForm, SignInForm, SignUpForm } from '@/components/auth/AuthForms';
import { ImportLocalProgressDialog } from '@/components/auth/ImportLocalProgressDialog';
import { PageAtmosphere } from '@/components/PageAtmosphere';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { SafetyNotice } from '@/components/SafetyNotice';
import { useProfileStore } from '@/lib/profile-store';
import { resolveProfile } from '@/lib/player-profile';
import { titleLabel } from '@/lib/field-titles';
import { progressFromState } from '@/lib/progression';
import { stageForState } from '@/lib/garden';
import { PRINTED_DECK_SIZE } from '@/lib/deck';

type Mode = 'signin' | 'create';

/** A row that is plainly a link: bevelled tile, a title, one line of what is behind it, an arrow. */
function Row({ href, title, note }: { href: string; title: string; note: string }) {
  return (
    <Link href={href} className="pd-tile flex min-h-14 items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:brightness-105">
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-violet-100">{title}</span>
        <span className="block text-[0.8125rem] leading-snug text-violet-300">{note}</span>
      </span>
      <span aria-hidden="true" className="text-xl text-violet-300">
        &rsaquo;
      </span>
    </Link>
  );
}

export default function AccountPage() {
  const { ready, configured, user } = useAuth();
  const { state } = useHerbdex();
  const { profile: stored } = useProfileStore();
  const [mode, setMode] = useState<Mode>('signin');
  const [forgot, setForgot] = useState(false);

  const passport = useMemo(() => {
    const profile = resolveProfile(stored, state);
    const progress = progressFromState(state);
    return {
      name: profile.displayName,
      title: profile.title ? titleLabel(profile.title, state) : progress.levelName,
      level: progress.level,
      levelName: progress.levelName,
      avatarHerbId: profile.avatarHerbId,
      frame: profile.frame,
      stage: (profile.avatarHerbId && stageForState(state, profile.avatarHerbId)) || 'flowering',
      cards: Object.keys(state.discoveries).length,
    };
  }, [stored, state]);

  return (
    <main id="main" data-ground="lavender" data-palette="card" className="mx-auto max-w-md px-4 py-8">
      <PageAtmosphere theme="collection" />
      <h1 className="font-display text-3xl font-extrabold text-gold-plate">Account</h1>
      <p className="mt-1 text-sm text-violet-300">
        {user ? 'Your PlantDex passport.' : 'Optional. Sign in to carry your collection to any device. Playing without an account works too.'}
      </p>

      {!configured && (
        <p className="pd-tile mt-4 px-4 py-3 text-sm text-violet-100">
          Accounts aren&apos;t set up on this deployment yet. Your progress is still saved on this device.
        </p>
      )}

      {configured && !ready && <p className="mt-4 text-sm text-violet-300">Loading…</p>}

      {configured && ready && !user && (
        <div className="mt-5">
          <section className="pd-panel p-4" aria-label={forgot ? 'Reset your password' : mode === 'signin' ? 'Sign in' : 'Create an account'}>
            {!forgot && (
              <div role="tablist" aria-label="Account" className="grid grid-cols-2 gap-1 rounded-2xl bg-[var(--card-violet-100)] p-1">
                {(['signin', 'create'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mode === value}
                    onClick={() => setMode(value)}
                    className={`min-h-11 rounded-xl text-sm font-extrabold transition-colors ${
                      mode === value ? 'bg-[var(--card-violet-500)] text-white shadow-[0_3px_0_0_var(--card-violet-900)]' : 'text-violet-100 hover:bg-white/60'
                    }`}
                  >
                    {value === 'signin' ? 'Sign in' : 'Create account'}
                  </button>
                ))}
              </div>
            )}
            {forgot && <h2 className="font-display text-xl font-extrabold text-violet-100">Reset your password</h2>}
            <p className="mt-3 text-[0.8125rem] leading-snug text-violet-300">
              {forgot
                ? 'We will email you a link to choose a new password.'
                : mode === 'signin'
                  ? 'Your collection follows you to any device you sign in on.'
                  : 'Your collection on this device can be added to the new account afterwards.'}
            </p>
            <div className="mt-3">
              {forgot ? (
                <ForgotPasswordForm onCancel={() => setForgot(false)} />
              ) : mode === 'signin' ? (
                <SignInForm onForgotPassword={() => setForgot(true)} />
              ) : (
                <SignUpForm />
              )}
            </div>
          </section>
          <div className="mt-4">
            <Row href="/profile" title="Your profile" note="Level, collection, habitats and the plants that travel with you. Works without an account." />
          </div>
        </div>
      )}

      {configured && ready && user && (
        <div className="mt-5 space-y-3">
          {/*
            THE PASSPORT. It reads what the profile and collection already hold (avatar, display name, title, level, cards found) and adds
            nothing of its own. It does not repeat the Profile's record, achievements or garden; those stay on /profile.

            THIS PAGE IS THE DOOR, NOT THE DESTINATION: identity details, "your data" and account deletion live on the profile, MOVED rather
            than copied, because an irreversible action offered in two places is one somebody meets twice and trusts less each time.
          */}
          <section className="pd-panel overflow-hidden" aria-label="Your passport">
            {/* A passport's cover strip: deep violet with gold lettering (the one dark emphasis on the page). It is a label, not a status. */}
            <div className="flex items-center justify-between bg-[var(--card-violet-900)] px-4 py-1.5 shadow-[inset_0_-3px_0_0_var(--card-gold-700)]">
              <p className="text-xs font-extrabold tracking-[0.18em] text-[var(--card-gold-300)] uppercase">PlantDex · Player passport</p>
              <span aria-hidden="true" className="text-sm text-[var(--card-gold-500)]">
                &#9670;
              </span>
            </div>
            <div className="flex items-start gap-3 p-4">
              {/* The photo page: the player's own avatar, framed with the frame they chose. */}
              <div className="shrink-0">
                {passport.avatarHerbId ? (
                  <ProfileAvatar herbId={passport.avatarHerbId} frame={passport.frame} stage={passport.stage} size="lg" frozen />
                ) : (
                  <span className="pd-tile flex h-20 w-20 items-center justify-center text-3xl font-extrabold text-violet-100">
                    {(user.email ?? '?').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <dl className="min-w-0 flex-1 space-y-1.5">
                <div>
                  <dt className="text-xs font-extrabold tracking-[0.12em] text-violet-300 uppercase">Name</dt>
                  <dd className="font-display truncate text-xl leading-tight font-extrabold text-violet-100">{passport.name || 'Field naturalist'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-extrabold tracking-[0.12em] text-violet-300 uppercase">Title</dt>
                  <dd className="truncate text-sm font-bold text-violet-100">{passport.title}</dd>
                </div>
              </dl>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-3">
              <div className="pd-tile px-2 py-2 text-center" data-tone="gold">
                <p className="text-xs font-extrabold tracking-[0.1em] text-violet-100 uppercase">Level</p>
                <p className="font-display text-2xl leading-none font-extrabold text-violet-100">{passport.level}</p>
                {passport.levelName !== passport.title && <p className="mt-0.5 truncate text-[0.8125rem] font-bold text-violet-300">{passport.levelName}</p>}
              </div>
              <div className="pd-tile px-2 py-2 text-center" data-tone="leaf">
                <p className="text-xs font-extrabold tracking-[0.1em] text-violet-100 uppercase">Cards</p>
                <p className="font-display text-2xl leading-none font-extrabold text-violet-100 tabular-nums">
                  {passport.cards}
                  <span className="text-sm font-bold text-violet-300"> / {PRINTED_DECK_SIZE}</span>
                </p>
                <div
                  role="progressbar"
                  aria-label="Cards collected"
                  aria-valuemin={0}
                  aria-valuemax={PRINTED_DECK_SIZE}
                  aria-valuenow={passport.cards}
                  className="mx-auto mt-1.5 h-2 w-full overflow-hidden rounded-full border-2 border-[var(--card-leaf-700)] bg-white"
                >
                  <div className="h-full bg-[var(--card-leaf-500)]" style={{ width: `${Math.min(100, (passport.cards / PRINTED_DECK_SIZE) * 100)}%` }} />
                </div>
              </div>
            </div>
            {/* The machine-readable zone of a real passport, here just the account line: perforated rule above, signed-in email below. */}
            <div className="border-t-4 border-dotted border-[var(--card-violet-300)] px-4 py-2">
              <p className="truncate text-[0.8125rem] font-bold tracking-wide text-violet-300">{user.email}</p>
            </div>
          </section>
          <Row href="/profile" title="Your profile" note="Edit your avatar and name, see your record, download your data, sign out or delete your account." />
          <Row href="/leaderboard" title="Field Board" note="Opt in to standings, or leave. Provisional, self-reported scores." />
          <Row href="/privacy" title="Privacy" note="What is stored, and what is never collected." />
          {/* Rendered unconditionally so it keeps a stable position in the tree; it only opens once its own effect decides local progress should
              be offered. IT STAYS HERE: its effect fires on `userId`, and a player who has just signed in lands on THIS page. */}
          <ImportLocalProgressDialog userId={user.id} />
        </div>
      )}

      <div className="mt-6">
        <SafetyNotice variant="brief" />
      </div>
    </main>
  );
}
