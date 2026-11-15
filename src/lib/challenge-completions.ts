'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isActivityId, type ActivityId } from './boss-form';
import { supabase } from './supabase-client';

/**
 * WHICH ROUNDS THE SERVER SAYS THIS PLAYER HAS PASSED. Read-only, and read from the server's own
 * record, never inferred.
 *
 * Reads `challenge_completions` through the player's own session, under the existing select policy
 * ("own challenge completions read"). No endpoint, no migration, no write: the table has no insert,
 * update or delete policy for any client role, and nothing here could use one.
 *
 * FOUR STATES, AND THEY ARE NOT INTERCHANGEABLE:
 *   disabled  there is nothing to read: a preview, a signed-out player, or the flag is off. This is
 *             NOT "no rounds passed" and carries no set at all.
 *   loading   a read is in flight. No claim is made about what has been passed.
 *   ready     the server answered. An empty set here is a true "none yet".
 *   error     the read failed. Nothing is known, so the screen must say so and offer a retry. An
 *             error is never shown as an empty set, because that would tell somebody who has passed
 *             rounds that they have passed none.
 *
 * A LATE ANSWER NEVER WINS. Each read carries a sequence number and a cancelled flag: if the player
 * changes, the plant changes, the component goes away or a newer read has started, an older answer
 * is dropped on arrival.
 *
 * PREVIEW COMPLETIONS LIVE ELSEWHERE (`boss-session.ts`, under a separate key) and are never merged
 * into this set. A simulated pass cannot appear here, and nothing here can make one.
 */
export type CompletionsState =
  | { readonly status: 'disabled' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly passed: ReadonlySet<ActivityId> }
  | { readonly status: 'error' };

export type CompletionsRead =
  | { readonly ok: true; readonly passed: ReadonlySet<ActivityId> }
  | { readonly ok: false };

/** Only rows that name a real activity count; anything else is ignored rather than trusted. */
export function parseCompletionRows(rows: unknown): ReadonlySet<ActivityId> {
  const out = new Set<ActivityId>();
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    const id = (row as { activity_id?: unknown } | null)?.activity_id;
    if (isActivityId(id)) out.add(id);
  }
  return out;
}

/** The slice of the Supabase client this needs, so a test can stand in for it. */
export interface CompletionsClient {
  from(table: 'challenge_completions'): {
    select(columns: 'activity_id'): {
      eq(column: 'user_id', value: string): {
        eq(column: 'herb_id', value: string): PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
  };
}

export async function readCompletions(
  client: CompletionsClient | null,
  userId: string,
  herbId: string,
): Promise<CompletionsRead> {
  if (!client) return { ok: false };
  try {
    const { data, error } = await client
      .from('challenge_completions')
      .select('activity_id')
      .eq('user_id', userId)
      .eq('herb_id', herbId);
    if (error || !Array.isArray(data)) return { ok: false };
    return { ok: true, passed: parseCompletionRows(data) };
  } catch {
    return { ok: false };
  }
}

export function useChallengeCompletions(options: {
  /** False for a preview, a signed-out player, or anything else with nothing to read. */
  enabled: boolean;
  userId: string | undefined;
  herbId: string;
}): { state: CompletionsState; retry: () => void } {
  const { enabled, userId, herbId } = options;
  const [result, setResult] = useState<{ key: string; read: CompletionsRead } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef(0);
  const key = `${userId ?? ''}|${herbId}|${attempt}`;
  const active = enabled && Boolean(userId);

  useEffect(() => {
    if (!active || !userId) return;
    let cancelled = false;
    const seq = ++latest.current;
    void readCompletions(supabase as unknown as CompletionsClient | null, userId, herbId).then((read) => {
      // Drop an answer that is no longer the latest, or whose player or plant has changed.
      if (cancelled || seq !== latest.current) return;
      setResult({ key, read });
    });
    return () => {
      cancelled = true;
    };
  }, [active, userId, herbId, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  let state: CompletionsState;
  if (!active) state = { status: 'disabled' };
  // An answer for an older key is stale, so it is treated as no answer: loading.
  else if (!result || result.key !== key) state = { status: 'loading' };
  else state = result.read.ok ? { status: 'ready', passed: result.read.passed } : { status: 'error' };
  return { state, retry };
}
