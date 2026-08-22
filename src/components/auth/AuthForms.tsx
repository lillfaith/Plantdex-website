'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/state/AuthProvider';

/**
 * Sign in / sign up. Two small forms rather than one with a mode toggle, so each can state
 * plainly what it does — this is the front door to a real account, not a card detail.
 */

const fieldClass =
  'mt-1 min-h-11 w-full rounded-lg border border-violet-600 bg-violet-900/60 px-3 text-sm text-violet-100';
const submitClass =
  'min-h-11 w-full rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400 disabled:opacity-60';

export function SignUpForm() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setStatus('saving');
      setError(null);
      const result = await signUp(email, password);
      if (result.error) {
        setError(result.error);
        setStatus('idle');
        return;
      }
      setStatus('sent');
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

export function SignInForm() {
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
    </form>
  );
}
