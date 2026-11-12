'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/state/AuthProvider';
import { useHerbdex } from '@/state/HerbdexProvider';
import {
  ANONYMOUS_SCOPE,
  markWelcomeSeen,
  shouldShowWelcome,
  useWelcomeSeen,
  welcomeSeen,
} from '@/lib/first-run';
import { getAchievement } from '@/lib/achievements';
import { FIELD_FRAMES } from '@/lib/field-frames';
import { PlantSprite } from '../PlantSprite';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THE FIRST SCREEN A NEW PLAYER EVER SEES.
 *
 * Two panes, both skippable: who you are about to become, then what the first objective is
 * and what it pays. It is the beginning of a collecting game, so it opens with a creature
 * and a promise rather than a form.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * IT LIVES IN THE APP SHELL, NOT ON /start, AND THAT IS A HARD CONSTRAINT RATHER THAN A
 * PREFERENCE.
 *
 * `/start` is a printed QR target. `entry-point.ts` names five trust levels that must never
 * collapse, and a generic printed code sits at the first of them: it is a public string
 * readable off a photograph of the box, so it can establish that somebody saw a code and
 * nothing else. That guarantee is structural — the route is a server component of links that
 * imports no store, no reducer and no progression module, and `entry-point.test.ts` reads its
 * source and fails if one appears.
 *
 * The welcome has to read the collection to know whether this player is new, so putting it
 * there would mean threading state into the one route whose whole value is having none. In
 * the shell it also reaches a player who arrives at `/` rather than through a QR code, which
 * is most of them.
 * ───────────────────────────────────────────────────────────────────────────────
 *
 * IT AWARDS NOTHING. No discovery, no XP, no achievement, no frame. The rewards named in the
 * second pane are the ones the collection ALREADY pays for a first find — `first-find` and
 * the `amber-ring` frame, both pure predicates that unlock themselves the moment a real
 * discovery is recorded. This screen only tells the player they exist, which is the whole
 * reason it cannot create a duplicate of anything.
 *
 * NO NUMBER IS PRINTED FOR THE XP, deliberately. A number in a button is a promise, and this
 * repo has broken that one twice by printing a card's face value where the ledger paid
 * something else. Which plant a player finds first decides what it pays, and this screen
 * cannot know it.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** The creature on the first pane. Dandelion: the most recognisable plant in the deck. */
const GREETER = 'taraxacum-officinale';

export function WelcomeIntro() {
  const { user } = useAuth();
  const { ready, discoveredCount } = useHerbdex();
  const scope = user?.id ?? ANONYMOUS_SCOPE;
  const seen = useWelcomeSeen(scope);
  const frame = useRef<HTMLDialogElement | null>(null);
  const [pane, setPane] = useState(0);

  /**
   * SIGNING IN SEEDS THE ACCOUNT'S FLAG FROM THE DEVICE, ONCE.
   *
   * Without this the welcome reappears the moment somebody signs up. A new account is empty
   * until the local-progress import runs, so `discoveredCount` is 0 and the account scope has
   * no flag of its own — and the player who dismissed this screen two minutes ago meets it
   * again. Worse, signup lands on /account, which is where `ImportLocalProgressDialog` is
   * mounted, so a second modal would open on top of that one.
   *
   * This is the arrangement the player profile already uses, in its words: signing in seeds
   * the account from the device, never overwrites and never clears. The write is one-time and
   * only ever sets a flag that was unset.
   *
   * THE COST IS A SHARED DEVICE, and it is the right way round. If one person dismisses the
   * welcome while signed out and somebody else then signs into their own fresh account on the
   * same device, that second person inherits the dismissal and does not see it. What they lose
   * is an introduction — `FirstFindNote` still explains the empty Herbdex, and /start still
   * exists — whereas the alternative interrupts a player who has already read it, on the one
   * screen that already has a dialog open. Note this leaks only DEVICE to ACCOUNT: one
   * account's flag is never readable by another, which is the leak that actually matters and
   * the one this repo has shipped twice.
   */
  useEffect(() => {
    if (!user?.id) return;
    if (welcomeSeen(user.id)) return;
    if (!welcomeSeen(ANONYMOUS_SCOPE)) return;
    markWelcomeSeen(user.id);
  }, [user?.id]);

  const show = shouldShowWelcome({ ready, discoveredCount, seen });

  /*
   * `showModal` rather than rendering in the flow: it traps focus, puts the overlay in the
   * top layer above the fixed nav, and makes Escape work without a key handler of its own.
   * The dialog element stays mounted whatever `show` says, because a <dialog> that unmounts
   * underneath itself is the bug this repo has recorded fixing twice.
   */
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    if (show && !node.open) node.showModal();
    if (!show && node.open) node.close();
  }, [show]);

  function dismiss() {
    markWelcomeSeen(scope);
    frame.current?.close();
  }

  const badge = getAchievement('first-find');
  const amberRing = FIELD_FRAMES.find((entry) => entry.id === 'amber-ring');

  return (
    <dialog
      ref={frame}
      aria-labelledby="welcome-title"
      /*
       * `onCancel` covers Escape and the backdrop, so dismissing by any route writes the flag
       * — otherwise a player who pressed Escape would be met by the same overlay on the next
       * page load, which reads as a bug rather than as a welcome.
       */
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      className="welcome-sheet"
    >
      <div className="relative mx-auto w-full max-w-md px-5 py-7 text-center">
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-2 right-3 rounded px-2 py-1 text-xs font-bold tracking-[0.1em] text-violet-300 uppercase transition-colors hover:text-violet-100 focus-visible:text-violet-100"
        >
          Skip
          <span className="sr-only"> the introduction</span>
        </button>

        {pane === 0 ? (
          <>
            {/*
              The creature arrives first, because this is a collecting game. `frozen` under
              reduced motion is handled by the sprite itself — frame 0 is authored as a
              complete resting pose precisely so it can be held.
            */}
            <div className="welcome-greeter mx-auto mt-5 w-28">
              <PlantSprite herbId={GREETER} stage="flowering" alt="" />
            </div>

            <h2
              id="welcome-title"
              className="font-display mt-4 text-3xl font-bold text-gold-plate"
            >
              Welcome to Plantdex
            </h2>
            <p className="mt-2 text-sm text-violet-200">
              Every great herbalist starts with a single discovery.
            </p>

            <button
              type="button"
              onClick={() => setPane(1)}
              className="arcade-key inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-400 px-6 text-sm font-bold tracking-wide text-plum-900 uppercase transition-colors hover:bg-gold-300 mt-6"
            >
              Begin Your Adventure
            </button>
          </>
        ) : (
          <>
            <p className="text-xs font-bold tracking-[0.2em] text-violet-300 uppercase">
              Your Field Journal
            </p>
            <h2
              id="welcome-title"
              className="font-display mt-1 text-2xl font-bold text-gold-plate"
            >
              Your First Discovery
            </h2>
            <p className="mt-2 text-sm text-violet-200">
              Find and identify your first medicinal plant. Your Field Journal keeps every
              find — what you saw, where you were looking, and the card it unlocked.
            </p>

            {/*
              THE REWARD IS SHOWN BEFORE THE QUEST, which is the point of this pane. Both
              rows read from the real definitions rather than restating them: the badge's
              own description, and the frame's own `condition` sentence and `ring` classes.
              Restating either here would let this screen promise something the predicate
              does not pay.
            */}
            <ul className="mt-5 space-y-2 text-left">
              {badge && (
                <li className="flex items-center gap-3 rounded-xl border border-gold-500/50 bg-gold-500/10 px-3 py-2">
                  <PlantdexIcon name="sprout" className="shrink-0 text-base text-gold-400" />
                  <span>
                    <p className="text-sm font-bold text-gold-300">{badge.name} badge</p>
                    <p className="text-xs text-violet-200">{badge.description}</p>
                  </span>
                </li>
              )}
              {amberRing && (
                <li className="flex items-center gap-3 rounded-xl border border-gold-500/50 bg-gold-500/10 px-3 py-2">
                  <span
                    aria-hidden="true"
                    className={`h-7 w-7 shrink-0 rounded-full ${amberRing.ring}`}
                  />
                  <span>
                    <p className="text-sm font-bold text-gold-300">
                      {amberRing.name} card frame
                    </p>
                    <p className="text-xs text-violet-200">{amberRing.condition}</p>
                  </span>
                </li>
              )}
              <li className="flex items-center gap-3 rounded-xl border border-violet-600/40 bg-plum-800/60 px-3 py-2">
                <PlantdexIcon name="leaves" className="shrink-0 text-base text-violet-300" />
                <span>
                  <p className="text-sm font-bold text-violet-100">Discovery XP</p>
                  {/* No figure: which plant you find decides what it pays. */}
                  <p className="text-xs text-violet-200">
                    Earned for the plant you find, towards your next level.
                  </p>
                </span>
              </li>
            </ul>

            <Link href="/scan" onClick={dismiss} className="arcade-key inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gold-400 px-6 text-sm font-bold tracking-wide text-plum-900 uppercase transition-colors hover:bg-gold-300 mt-6">
              Find my first plant
            </Link>

            {/*
              THE DEMONSTRATION, AND IT IS LABELLED FOR WHAT IT IS.

              `/herbdex` reveals read through `reveals.ts`, a store with its own key that
              never touches `HerbdexState` — so reading a card's entry awards no XP, does not
              count toward the collection and leaves the card a silhouette in the grid. That
              is already the safe way to look around without claiming a find, so the brief's
              "clearly labelled demonstration that does not award real discoveries" needed no
              new mechanism, only a door and an honest sentence.
            */}
            <Link
              href="/herbdex"
              onClick={dismiss}
              className="mt-3 block text-sm font-bold text-violet-300 underline-offset-2 hover:text-violet-100 hover:underline"
            >
              Or look around the deck first
            </Link>
            <p className="mt-1 text-xs text-violet-300">
              Browsing records no discovery and earns no XP.
            </p>
          </>
        )}
      </div>
    </dialog>
  );
}
