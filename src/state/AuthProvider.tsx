'use client';

import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

/**
 * Session/user context for V0.3 accounts, wrapping Supabase Auth.
 *
 * Mirrors the shape of `HerbdexProvider`: an external system (here, Supabase's own
 * `onAuthStateChange` subscription) wrapped for React, false/null until the first check
 * resolves so the server-rendered page and the first client render always agree — nothing
 * here can assume a session exists during the static export's initial paint.
 */

export type AuthResult = { error: string | null };

interface AuthContextValue {
  /** False until the initial session check has resolved. */
  ready: boolean;
  /** False when NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are not set on this deployment. */
  configured: boolean;
  session: Session | null;
  user: User | null;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const NOT_CONFIGURED = 'Accounts are not set up on this deployment yet.';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // `supabase` is a module-level constant, known before the first render — an
  // unconfigured deployment never becomes "ready" via an effect, it just starts that way.
  const [ready, setReady] = useState(() => supabase === null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
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
        if (!supabase) return { error: NOT_CONFIGURED };
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      async signIn(email, password) {
        if (!supabase) return { error: NOT_CONFIGURED };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
    }),
    [ready, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
