'use client';

import { supabase } from './supabase-client';
import type { ActivityId } from './boss-form';

/**
 * The browser's one call to `challenge-submit`. It sends `{ herbId, activity, attempt, answers }`
 * and nothing else: the function rebuilds the questions itself, scores the answers itself and
 * writes the record itself, so a score or a completion flag has nowhere to go from here.
 *
 * Used only when `NEXT_PUBLIC_BOSS_FORMS=on`. The function is not deployed anywhere yet, so
 * every failure, including "function not found", becomes `{ ok: false }` and never throws.
 */
export type SubmitResult =
  | { ok: true; passed: boolean; resolved: number; total: number; bossForm: boolean }
  | { ok: false; reason: string };

export async function submitChallenge(body: {
  herbId: string;
  activity: ActivityId;
  attempt: number;
  answers: number[][];
}): Promise<SubmitResult> {
  if (!supabase) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.functions.invoke('challenge-submit', { body });
    if (error || !data) return { ok: false, reason: 'unavailable' };
    const reply = data as Record<string, unknown>;
    if (reply.ok !== true) {
      return { ok: false, reason: typeof reply.reason === 'string' ? reply.reason : 'refused' };
    }
    return {
      ok: true,
      passed: reply.passed === true,
      resolved: Number(reply.resolved ?? 0),
      total: Number(reply.total ?? 0),
      bossForm: reply.bossForm === true,
    };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
