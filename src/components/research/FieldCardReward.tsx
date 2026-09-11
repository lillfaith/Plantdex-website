'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useHerbdex } from '@/state/HerbdexProvider';
import {
  FIELD_CARDS_NAME,
  FIELD_CARDS_TOTAL,
  fieldCardProgress,
  type FieldCardSlot,
} from '@/lib/field-cards';
import { recordUnlocks, useFieldCardUnlocks, resolveUnlocked } from '@/lib/unlocked-field-cards';
import { assetPath } from '@/lib/asset-path';
import { track } from '@/lib/analytics';

/**
 * WHAT XP IS FOR.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * The loop's last link. Research pays XP; XP has to visibly lead somewhere or it is a number
 * that goes up. This is that somewhere: the next Field Card, how far off it is, and — the
 * first time a threshold is crossed — the card itself.
 *
 * NO CLAIM BUTTON. Unlock is a pure function of XP (`slotsUnlockedAt`), so there is nothing
 * to claim: crossing the line IS the unlock, and a button would only add a way to not have
 * done it yet. `recordUnlocks` writes the date so the reveal fires once rather than on every
 * load, and so the set ratchets — see `unlocked-field-cards.ts` for why both matter.
 *
 * A FIELD CARD IS NOT A FIND. The copy says "unlocked", never "discovered" or "found", and
 * the reveal deliberately does not use the discovery celebration's language. Unlocking
 * Spicebush is not the same event as standing in front of one, and the moment those two read
 * alike is the moment the collection stops meaning anything.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function FieldCardReward() {
  const { progress, ready } = useHerbdex();
  const { record, justUnlocked } = useFieldCardUnlocks();

  /*
   * Record any newly reached slot.
   *
   * In an effect because it writes to an external store; doing it during render would make
   * the component impure and fire twice under StrictMode. `recordUnlocks` is write-once and
   * returns [] when nothing is new, so running it on every XP change is idempotent.
   */
  useEffect(() => {
    if (!ready) return;
    // One event per card crossed. `recordUnlocks` returns [] on a repeat, so this cannot
    // double-count a threshold the player already passed.
    const fresh = recordUnlocks(progress.xp);
    fresh.forEach(() => track('xp_card_unlocked'));
  }, [ready, progress.xp]);

  useEffect(() => {
    if (ready) track('xp_card_progress_viewed');
  }, [ready]);

  if (!ready) return null;

  const { next, fraction, remaining } = fieldCardProgress(progress.xp);
  const held = resolveUnlocked(progress.xp, record);
  /*
   * The reveal is whatever THIS session recorded — reported by the store, so no ref is read
   * during render and no state is set inside an effect.
   */
  const revealed: FieldCardSlot[] = held.filter((slot) => justUnlocked.includes(slot.ordinal));

  return (
    <section aria-labelledby="field-card-reward" className="panel p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="field-card-reward"
          className="text-sm font-bold tracking-wide text-gold-400 uppercase"
        >
          {FIELD_CARDS_NAME}
        </h2>
        <span className="text-xs font-bold tabular-nums text-violet-300">
          {held.length} / {FIELD_CARDS_TOTAL}
        </span>
      </div>
      <div aria-hidden="true" className="pixel-rule mt-2 w-16" />

      {/*
        THE REVEAL, when a threshold was just crossed. Brief by design — a card, its names,
        and a way to open it. No animation system: the panel appearing is the moment.
      */}
      {revealed.length > 0 && (
        <div
          aria-live="polite"
          className="mt-3 rounded-xl border border-gold-500/50 bg-gold-500/10 p-3"
        >
          {revealed.map((slot) => (
            <div key={slot.ordinal} className="flex items-center gap-3">
              {slot.card && (
                <Image
                  src={assetPath(slot.card.thumb)}
                  alt={`${FIELD_CARDS_NAME} ${slot.ordinal}: ${slot.card.commonName}`}
                  width={178}
                  height={288}
                  className="w-14 shrink-0 rounded-lg shadow-card"
                />
              )}
              <div className="min-w-0">
                <p className="text-[0.72rem] font-bold tracking-[0.12em] text-gold-300 uppercase">
                  New Field Card unlocked
                </p>
                <p className="font-display text-base leading-tight font-bold text-gold-plate">
                  {slot.card ? slot.card.commonName : `Field Card ${slot.ordinal}`}
                </p>
                {slot.card && (
                  <p className="text-xs text-violet-300 italic">{slot.card.scientificName}</p>
                )}
                {slot.card && (
                  <Link
                    href={`/herbdex/${slot.card.id}`}
                    onClick={() => track('xp_card_opened')}
                    className="mt-1 inline-flex min-h-11 items-center text-xs font-bold text-gold-400 underline underline-offset-2 hover:text-gold-300"
                  >
                    View card &rarr;
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {next ? (
        <div className="mt-3">
          <p className="text-xs tracking-[0.12em] text-violet-400 uppercase">Next Field Card</p>
          {/*
            A SLOT WITH NO CARD SAYS SO. Five of the nine are approved thresholds whose
            artwork is not finished, and naming a species we have not drawn — or inventing
            one — is the thing this codebase never does.
          */}
          <p className="font-display text-lg leading-tight font-bold text-gold-plate">
            {next.card ? next.card.commonName : `Field Card ${next.ordinal}`}
          </p>
          {next.card && (
            <p className="text-xs text-violet-300 italic">{next.card.scientificName}</p>
          )}

          <div
            aria-hidden="true"
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-plum-900"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-500 to-pink-accent"
              style={{ width: `${Math.round(fraction * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs tabular-nums text-violet-300">
            <span className="font-bold text-violet-100">
              {progress.xp.toLocaleString()} / {next.xp.toLocaleString()} XP
            </span>{' '}
            &middot; {remaining.toLocaleString()} to unlock
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-violet-200">
          Every Field Card unlocked. More arrive as the set is finished.
        </p>
      )}

      {/*
        THE DISTINCTION, SAID PLAINLY AND IN THE ONE PLACE A PLAYER MEETS IT. A Field Card is
        earned by playing; it is not a card anybody posted you, and unlocking it is not the
        same as having found that plant outdoors.
      */}
      <p className="mt-3 text-xs leading-relaxed text-violet-400">
        Field Cards are digital and earned by XP. They are not part of the printed{' '}
        {FIELD_CARDS_TOTAL > 0 ? 'Collection 01' : ''} deck, and unlocking one does not mean
        you have found that plant.
      </p>
    </section>
  );
}
