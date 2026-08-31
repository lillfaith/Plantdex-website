'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/state/AuthProvider';
import { track } from '@/lib/analytics';

/**
 * Sign in / sign up. Two small forms rather than one with a mode toggle, so each can state
 * plainly what it does — this is the front door to a real account, not a card detail.
 */

const fieldClass =
  'mt-1 min-h-11 w-full rounded-lg border border-violet-600 bg-plum-700/70 px-3 text-sm text-violet-100';
const submitClass =
  'min-h-11 w-full rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400 disabled:opacity-60';

export function SignUpForm() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'sent' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setStatus('saving');
      setError(null);
      track('signup_started');
      const result = await signUp(email, password);
      if (result.error) {
        setError(result.error);
        setStatus('idle');
        return;
      }
      // Which of these is right depends on the project's "Confirm email" setting, so it is
      // read from the response rather than assumed. Saying "check your email" when no mail
      // was sent leaves someone waiting for a message that will never arrive.
      // Completed means the account exists — whether or not a confirmation mail is still
      // pending. Firing this on form submit instead would count every failed attempt.
      track('signup_completed');
      setStatus(result.needsConfirmation ? 'sent' : 'done');
    },
    [email, password, signUp],
  );

  if (status === 'sent') {
    return (
      <p className="text-sm text-violet-200">
        Check <span className="font-semibold text-gold-300">{email}</span> to confirm your
        account, then sign in below.
      </p>
    );
  }

  if (status === 'done') {
    // The account page swaps this whole form out the moment `onAuthStateChange` fires, so
    // this is a brief acknowledgement rather than a screen anyone reads for long.
    return (
      <p className="text-sm text-violet-200">
        Account created — signing you in…
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="text-xs font-semibold text-violet-200">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-violet-200">Password</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
      </label>
      {error && <p className="text-sm text-stat-temp">{error}</p>}
      <button type="submit" disabled={status === 'saving'} className={submitClass}>
        {status === 'saving' ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

export function SignInForm({ onForgotPassword }: { onForgotPassword: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setSaving(true);
      setError(null);
      const result = await signIn(email, password);
      setSaving(false);
      if (result.error) setError(result.error);
      else track('login_completed');
    },
    [email, password, signIn],
  );

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="text-xs font-semibold text-violet-200">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="block">
        <span className="text-xs font-semibold text-violet-200">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
      </label>
      {error && <p className="text-sm text-stat-temp">{error}</p>}
      <button type="submit" disabled={saving} className={submitClass}>
        {saving ? 'Signing in…' : 'Sign in'}
      </button>
      <button
        type="button"
        onClick={onForgotPassword}
        className="min-h-11 w-full text-sm font-semibold text-gold-300 underline underline-offset-4 hover:text-gold-200"
      >
        Forgot your password?
      </button>
    </form>
  );
}

/**
 * Requests a recovery email.
 *
 * Always reports the same thing whether or not the address has an account. Saying "no
 * account with that email" would turn this form into a way for anyone to check which
 * addresses are registered, and a player's email is the one identifier this app holds.
 */
export function ForgotPasswordForm({ onCancel }: { onCancel: () => void }) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setStatus('saving');
      setError(null);
      const result = await requestPasswordReset(email);
      if (result.error) {
        setError(result.error);
        setStatus('idle');
        return;
      }
      setStatus('sent');
    },
    [email, requestPasswordReset],
  );

  if (status === 'sent') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-violet-200">
          If an account exists for{' '}
          <span className="font-semibold text-gold-300">{email}</span>, a link to set a new
          password is on its way. The link expires after an hour.
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 text-sm font-semibold text-gold-300 underline underline-offset-4 hover:text-gold-200"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-xs text-violet-400">
        We&apos;ll email you a link to set a new one.
      </p>
      <label className="block">
        <span className="text-xs font-semibold text-violet-200">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
      </label>
      {error && <p className="text-sm text-stat-temp">{error}</p>}
      <button type="submit" disabled={status === 'saving'} className={submitClass}>
        {status === 'saving' ? 'Sending…' : 'Send reset link'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="min-h-11 w-full text-sm font-semibold text-gold-300 underline underline-offset-4 hover:text-gold-200"
      >
        Back to sign in
      </button>
    </form>
  );
}

/**
 * Sets a new password for the session a recovery link established. Rendered only by
 * `/account/reset`, which has already checked that a recovery actually happened.
 */
export function NewPasswordForm({ onDone }: { onDone: () => void }) {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setSaving(true);
      setError(null);
      const result = await updatePassword(password);
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    },
    [password, updatePassword, onDone],
  );

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="text-xs font-semibold text-violet-200">New password</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
        />
      </label>
      {error && <p className="text-sm text-stat-temp">{error}</p>}
      <button type="submit" disabled={saving} className={submitClass}>
        {saving ? 'Saving…' : 'Set new password'}
      </button>
    </form>
  );
}
