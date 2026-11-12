'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase-client';
import { isBossPilot } from './boss-form';

/**
 * WHICH PLANTS SHOW THEIR BOSS FORM. Read-only; there is no write path from the browser.
 *
 * OFF BY DEFAULT, AND OFF IN PRODUCTION. `NEXT_PUBLIC_BOSS_FORMS` is read at build time:
 *   unset      nothing is shown and nothing is requested. The deployed site behaves as today.
 *   'preview'  development only: the pilot species shows its Boss Form once MASTERED, with no
 *              server involved and no claim that anything was earned. For looking at the art.
 *   'on'       reads the signed-in player's own `boss_forms` rows (select-only RLS). A missing
 *              table or any error yields the empty set, never a thrown render.
 *
 * Boss Forms are not stored in `HerbdexState`: local storage is editable, and a Boss Form can
 * only be earned through the server, so a signed-out player has none by construction.
 */
export type BossFormsMode = 'off' | 'preview' | 'on';

export function bossFormsMode(raw: string | undefined = process.env.NEXT_PUBLIC_BOSS_FORMS): BossFormsMode {
  return raw === 'preview' || raw === 'on' ? raw : 'off';
}

const NONE: ReadonlySet<string> = new Set();

export function useBossForms(
  userId: string | undefined,
  masteredIds: readonly string[],
): ReadonlySet<string> {
  const mode = bossFormsMode();
  const [earned, setEarned] = useState<ReadonlySet<string>>(NONE);

  useEffect(() => {
    if (mode !== 'on' || !userId || !supabase) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('boss_forms')
          .select('herb_id')
          .eq('user_id', userId);
        if (cancelled || error || !data) return;
        setEarned(new Set(data.map((row) => String(row.herb_id)).filter(isBossPilot)));
      } catch {
        // A missing table or a network failure means "none yet", never a broken Garden.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, userId]);

  if (mode === 'preview') return new Set(masteredIds.filter(isBossPilot));
  if (mode === 'on') return earned;
  return NONE;
}
