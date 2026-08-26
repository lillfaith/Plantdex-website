'use client';

import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import {
  passwordResetRedirectUrl,
  signupConfirmRedirectUrl,
} from '@/lib/auth-redirect';

/**
 * Session/user context for V0.3 accounts, wrapping Supabase Auth.
 *
 * Mirrors the shape of `HerbdexProvider`: an external system (here, Supabase's own
 * `onAuthStateChange` subscription) wrapped for React, false/null until the first check
 * resolves so the server-rendered page and the first client render always agree — nothing
 * here can assume a session exists during the static export's initial paint.
 */

export type AuthResult = { error: string | null };

/**
 * Signup has three outcomes, not two, and the third is what the dashboard's "Confirm email"
 * setting decides: with it ON, `signUp` returns a user but no session and the visitor must
 * go and click a link; with it OFF they are signed in already. The form cannot tell those
 * apart without being told, and telling someone to "check your email" when no email was
 * sent is a dead end they have no way out of.
 */
export type SignUpResult = AuthResult & { needsConfirmation: boolean };

interface AuthContextValue {
  /** False until the initial session check has resolved. */
  ready: boolean;
  /** False when NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are not set on this deployment. */
  configured: boolean;
  session: Session | null;
  user: User | null;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Email a recovery link. Resolves without error even when no such account exists. */
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  /** Set a new password for the session a recovery link established. */
  updatePassword: (password: string) => Promise<AuthResult>;
  /**
   * True once Supabase reports the current session came from a recovery link, so the
   * reset page can tell "you may set a new password" apart from "this link was already
   * used, or expired".
   */
  recovering: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const NOT_CONFIGURED = 'Accounts are not set up on this deployment yet.';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // `supabase` is a module-level constant, known before the first render — an
  // unconfigured deployment never becomes "ready" via an effect, it just starts that way.
  const [ready, setReady] = useState(() => supabase === null);
  const [session, setSession] = useState<Session | null>(null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;
    // `.catch` matters as much as `.then` here: `ready` gates the entire account page and
    // the AccountBadge, so a rejected session check (offline, DNS failure, Supabase down)
    // would otherwise leave both stuck on "Loading…" forever. Failing to find a session is
    // just "signed out", which the app already handles.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        setSession(data.session);
      })
      .catch((error: unknown) => {
        console.warn('[plantdex] could not check the current session', error);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // Landing on the reset page with a recovery link in the URL fragment makes
      // supabase-js exchange it for a session and emit this event. It is the only signal
      // that distinguishes a genuine recovery from someone simply opening /account/reset,
      // and it is emitted once — so it is latched here rather than read at render time.
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured: supabase !== null,
      session,
      user: session?.user ?? null,
      async signUp(email, password) {
        if (!supabase) return { error: NOT_CONFIGURED, needsConfirmation: false };
        // `emailRedirectTo` matters only once "Confirm email" is on in the Supabase
        // dashboard — which is exactly why it is easy to leave out. Without it the
        // confirmation link falls back to whatever the dashboard's Site URL happens to
        // be, so the deployment's base path lives in a setting nobody is looking at
        // rather than in the code that already knows it.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: signupConfirmRedirectUrl(window.location.origin) },
        });
        return {
          error: error?.message ?? null,
          // No session on a successful signup means Supabase is waiting for the visitor to
          // confirm. (Supabase also answers this way for an address that already has an
          // account, deliberately — so the form must not say anything that distinguishes
          // the two.)
          needsConfirmation: !error && data.session === null,
        };
      },
      async signIn(email, password) {
        if (!supabase) return { error: NOT_CONFIGURED };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signOut() {
        if (!supabase) return;
        setRecovering(false);
        await supabase.auth.signOut();
      },
      async requestPasswordReset(email) {
        if (!supabase) return { error: NOT_CONFIGURED };
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: passwordResetRedirectUrl(window.location.origin),
        });
        return { error: error?.message ?? null };
      },
      async updatePassword(password) {
        if (!supabase) return { error: NOT_CONFIGURED };
        const { error } = await supabase.auth.updateUser({ password });
        // The recovery session has served its purpose; keeping the flag set would offer
        // the "set a new password" form again on a page the player is now just visiting.
        if (!error) setRecovering(false);
        return { error: error?.message ?? null };
      },
      recovering,
    }),
    [ready, session, recovering],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
