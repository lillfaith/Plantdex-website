'use client';

import Link from 'next/link';
import { MysteryCard } from './MysteryCard';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { FIELD_CARDS_NAME } from '@/lib/field-cards';
import type { Herb } from '@/lib/types';

/**
 * A Field Card whose XP threshold has not been reached.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NOT THE UNDISCOVERED TREATMENT, because that says something false here. `LockedHerb`
 * tells a player to go and find the plant and promises the XP a find pays — both correct
 * for a printed card and both wrong for this one. A Field Card is not gated on going
 * outdoors, it is gated on XP; and finding it pays nothing, because XP resolves through the
 * printed deck only (`xpForDiscoveries`). So this says what actually opens it.
 *
 * REVEAL DOES NOT BYPASS IT. `reveals.ts` is the escape hatch for somebody who bought the
 * deck to read about plants, and every printed card is one they own. A Field Card is earned,
 * so a reveal must not hand it over early — the caller checks the threshold BEFORE it checks
 * `revealed`, which is what keeps the XP ladder meaning anything.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function LockedFieldCard({
  herb,
  ordinal,
  unlockXp,
  xp,
}: {
  herb: Herb;
  /** Which of the nine this is, so the page can name it without naming the species. */
  ordinal: number;
  /** The XP total that opens it. */
  unlockXp: number;
  /** What the player has now. */
  xp: number;
}) {
  const remaining = Math.max(0, unlockXp - xp);

  return (
    <div className="mx-auto max-w-sm text-center">
      <p className="flex items-center justify-center gap-1.5 text-xs font-bold tracking-[0.2em] text-violet-300 uppercase">
        <PlantdexIcon name="locked" className="text-sm" />
        {FIELD_CARDS_NAME} {ordinal} — Locked
      </p>

      {/* The same silhouette the grid uses. Nothing here names the species: an unearned
          card should not be readable, and inventing a placeholder name would be worse. */}
      <div className="relative mx-auto mt-4 aspect-[356/576] w-52 overflow-hidden rounded-[var(--radius-card)] shadow-card-lift">
        <MysteryCard herb={herb} size="detail" />
      </div>

      <h1 className="font-display mt-5 text-2xl font-bold text-violet-100">
        This Field Card is not unlocked yet
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-violet-300">
        Field Cards are earned with XP, not found outdoors. This one opens at{' '}
        <strong className="text-gold-300 tabular-nums">{unlockXp.toLocaleString()} XP</strong>
        {remaining > 0 && (
          <>
            {' '}
            &mdash; <span className="tabular-nums">{remaining.toLocaleString()}</span> to go
          </>
        )}
        .
      </p>

      <Link
        href="/herbdex/research"
        className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-gold-400 underline underline-offset-2 hover:text-gold-300"
      >
        Earn XP in Field Research &rarr;
      </Link>
    </div>
  );
}
