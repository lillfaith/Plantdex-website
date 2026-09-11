'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useHerbdex } from '@/state/HerbdexProvider';
import { useAuth } from '@/state/AuthProvider';
import {
  FIELD_CARDS_NAME,
  FIELD_CARDS_TOTAL,
  fieldCardProgress,
  type FieldCardSlot,
} from '@/lib/field-cards';
import {
  ANONYMOUS_SCOPE,
  recordUnlocks,
  useFieldCardUnlocks,
  resolveUnlocked,
} from '@/lib/unlocked-field-cards';
import { assetPath } from '@/lib/asset-path';
import { CHIP_WIDTH, chipArt } from '@/lib/card-art';
import { track } from '@/lib/analytics';

/**
 * WHAT XP IS FOR.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * The loop's last link. Research pays XP; XP has to visibly lead somewhere or it is a number
 * that goes up. This is that somewhere: the next Field Card, how far off it is, the cards
 * already held — and, the first time a threshold is crossed, the new one announced.
 *
 * NO CLAIM BUTTON. Unlock is a pure function of XP (`slotsUnlockedAt`), so there is nothing
 * to claim: crossing the line IS the unlock, and a button would only add a way to not have
 * done it yet. `recordUnlocks` writes the date so the reveal fires once rather than on every
 * load, and so the set ratchets — see `unlocked-field-cards.ts` for why both matter.
 *
 * "NEW" MEANS THE CROSSING THAT JUST HAPPENED, AND NOTHING ELSE. The announcement is driven
 * by `justUnlocked`, which the store REPLACES on each crossing; everything else the player
 * holds appears in the quiet row at the foot, which says only that they own it. Those two
 * treatments are the whole design: a card is news exactly once, and then it is inventory.
 *
 * A FIELD CARD IS NOT A FIND. The copy says "unlocked", never "discovered" or "found", and
 * the reveal deliberately does not use the discovery celebration's language. Unlocking
 * Spicebush is not the same event as standing in front of one, and the moment those two read
 * alike is the moment the collection stops meaning anything.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function FieldCardReward() {
  const { progress, ready } = useHerbdex();
  const { user } = useAuth();
  /*
   * The record belongs to an account, not to a browser. Signed out this is the device's own
   * scope, which is correct rather than a fallback: signed out, the XP is local too.
   */
  const scope = user?.id ?? ANONYMOUS_SCOPE;
  const { record, justUnlocked } = useFieldCardUnlocks(scope);

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
    const fresh = recordUnlocks(progress.xp, scope);
    fresh.forEach(() => track('xp_card_unlocked'));
  }, [ready, progress.xp, scope]);

  useEffect(() => {
    if (ready) track('xp_card_progress_viewed');
  }, [ready]);

  if (!ready) return null;

  const { next, fraction, remaining } = fieldCardProgress(progress.xp);
  const held = resolveUnlocked(progress.xp, record);
  /*
   * The reveal is whatever the LATEST crossing recorded — reported by the store, so no ref
   * is read during render and no state is set inside an effect.
   */
  const revealed: FieldCardSlot[] = held.filter((slot) => justUnlocked.includes(slot.ordinal));
  const announced = new Set(revealed.map((slot) => slot.ordinal));

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
          className="mt-3 space-y-3 rounded-xl border border-gold-500/50 bg-gold-500/10 p-3"
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
        /*
          THE COMPLETED STATE. One line, and then the same held row every other state shows.
          Deliberately NOT a bigger treatment: a player at 9/9 has finished this panel's
          business and came to the page for the research below it, so a celebration that
          grew at the moment it stopped being useful would push the tasks off the screen.
          The count in the header already reads 9 / 9.
        */
        <p className="mt-3 text-sm text-violet-200">
          Every Field Card unlocked. More arrive as the set is finished.
        </p>
      )}

      {/*
        WHAT YOU ALREADY HOLD — quiet, and the reason a card stops being news without
        disappearing. Chips rather than a list: at 35px they fit nine across two rows on a
        phone, they are the same artwork the tasks below use, and they are links, so a card
        unlocked weeks ago is still one tap from here.

        A card announced in the block above is skipped, so it is never shown twice in one
        panel. It rejoins this row on the next load, which is exactly when it stops being new.
      */}
      {held.length > announced.size && (
        <div className="mt-4 border-t border-violet-800/70 pt-3">
          <h3 className="text-xs tracking-[0.12em] text-violet-400 uppercase">Unlocked</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {held
              .filter((slot) => !announced.has(slot.ordinal))
              .map((slot) =>
                slot.card ? (
                  <li key={slot.ordinal}>
                    <Link
                      href={`/herbdex/${slot.card.id}`}
                      onClick={() => track('xp_card_opened')}
                      title={slot.card.commonName}
                      className="block"
                    >
                      <Image
                        src={assetPath(chipArt(slot.card))}
                        alt={slot.card.commonName}
                        width={CHIP_WIDTH}
                        height={Math.round((CHIP_WIDTH * 576) / 356)}
                        className="h-14 w-[2.2rem] rounded object-cover transition-transform hover:scale-105"
                      />
                    </Link>
                  </li>
                ) : (
                  /*
                    An unlocked slot whose card is not drawn yet. It says its number and
                    nothing else — inventing a species to fill the tile is the one thing
                    this codebase never does, and an empty tile would read as a bug.
                  */
                  <li
                    key={slot.ordinal}
                    className="flex h-14 w-[2.2rem] items-center justify-center rounded border border-violet-700/70 bg-plum-900/70 text-[0.72rem] font-bold tabular-nums text-violet-300"
                  >
                    {slot.ordinal}
                  </li>
                ),
              )}
          </ul>
        </div>
      )}

      {/*
        THE DISTINCTION, SAID PLAINLY AND IN THE ONE PLACE A PLAYER MEETS IT. A Field Card is
        earned by playing; it is not a card anybody posted you, and unlocking it is not the
        same as having found that plant outdoors.
      */}
      <p className="mt-3 text-xs leading-relaxed text-violet-400">
        Field Cards are digital and earned by XP. They are not part of the printed Collection
        01 deck, and unlocking one does not mean you have found that plant.
      </p>
    </section>
  );
}
