'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/state/AuthProvider';
import { useHerbdex } from '@/state/HerbdexProvider';
import {
  ANONYMOUS_SCOPE,
  markWelcomeSeen,
  shouldShowWelcome,
  useWelcomeSeen,
  welcomeSeen,
} from '@/lib/first-run';
import { TOUR_EVENT } from '@/lib/welcome-tour';
import { SCENES } from './WelcomeScenes';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THE FIRST SCREEN A NEW PLAYER EVER SEES.
 *
 * A short tour of scenes (see `WelcomeScenes`), all skippable, ending on the first objective
 * and what it pays. It can also be opened on purpose through `welcome-tour.ts`, which touches
 * no flag. It is the beginning of a collecting game, so it opens with a creature
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

export function WelcomeIntro() {
  const { user } = useAuth();
  const { ready, discoveredCount } = useHerbdex();
  const scope = user?.id ?? ANONYMOUS_SCOPE;
  const seen = useWelcomeSeen(scope);
  const pathname = usePathname();
  const frame = useRef<HTMLDialogElement | null>(null);
  const [index, setIndex] = useState(0);
  // An explicit "Take the tour". Independent of the first-run gate and never persisted.
  const [requested, setRequested] = useState(false);

  /**
   * SIGNING IN SEEDS THE ACCOUNT'S FLAG FROM THE DEVICE, ONCE.
   *
   * Without this the welcome reappears the moment somebody signs up: a new account is empty
   * until the local-progress import runs, and signup lands on the page that hosts that
   * import's own dialog. One-time, only ever sets an unset flag; a flag in one account's
   * scope is never readable by another. A shared device costs an introduction, not progress.
   */
  useEffect(() => {
    if (!user?.id) return;
    if (welcomeSeen(user.id)) return;
    if (!welcomeSeen(ANONYMOUS_SCOPE)) return;
    markWelcomeSeen(user.id);
  }, [user?.id]);

  useEffect(() => {
    const open = () => {
      setIndex(0);
      setRequested(true);
    };
    window.addEventListener(TOUR_EVENT, open);
    return () => window.removeEventListener(TOUR_EVENT, open);
  }, []);

  const open = requested || shouldShowWelcome({ ready, discoveredCount, seen, pathname });

  /*
   * `showModal` traps focus, uses the top layer above the fixed nav and makes Escape work.
   * The element stays mounted whatever `open` says: a <dialog> that unmounts underneath
   * itself is the bug this repo has recorded fixing twice.
   */
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  // Land on the new scene's heading so a screen reader announces it. Not on first paint:
  // there focus belongs on the primary button.
  useEffect(() => {
    if (index === 0) return;
    frame.current?.querySelector<HTMLElement>('#welcome-title')?.focus();
  }, [index]);

  function dismiss() {
    markWelcomeSeen(scope);
    setRequested(false);
    frame.current?.close();
  }

  const last = index === SCENES.length - 1;
  const Scene = SCENES[index]?.Component ?? SCENES[0]!.Component;

  return (
    <dialog
      ref={frame}
      aria-labelledby="welcome-title"
      /* `onCancel` covers Escape, so every route out writes the flag. */
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      className="welcome-sheet"
    >
      <span aria-hidden="true" className="welcome-woods" />

      <header className="relative flex items-center justify-between px-3 pt-2">
        <ol
          aria-label={`Step ${index + 1} of ${SCENES.length}`}
          className="flex items-center gap-1.5 pl-2"
        >
          {SCENES.map((one, position) => (
            <li
              key={one.id}
              aria-current={position === index ? 'step' : undefined}
              className={`h-2 rounded-full transition-all ${
                position === index ? 'w-6 bg-gold-400' : 'w-2 bg-violet-400/60'
              }`}
            />
          ))}
        </ol>
        <button
          type="button"
          onClick={dismiss}
          className="tap-44 inline-flex items-center justify-center rounded px-3 text-xs font-bold tracking-[0.1em] text-violet-100 uppercase transition-colors hover:text-white focus-visible:text-white"
        >
          Skip
          <span className="sr-only"> the introduction</span>
        </button>
      </header>

      <div className="welcome-scene relative mx-auto w-full max-w-md px-5 text-center">
        <div key={index} className="welcome-scene-in">
          <Scene returning={discoveredCount > 0} onLeave={dismiss} />
        </div>
      </div>

      {!last && (
        <footer className="relative mx-auto flex w-full max-w-md items-center gap-3 px-5 pb-4">
          <button
            type="button"
            onClick={() => setIndex((one) => Math.max(0, one - 1))}
            disabled={index === 0}
            className="tap-44 rounded px-3 text-sm font-bold text-violet-100 transition-colors hover:text-white disabled:invisible"
          >
            Back
          </button>
          {/* Focus lands here on open, not on Skip: Skip is the least useful first stop. */}
          <button
            autoFocus
            type="button"
            onClick={() => setIndex((one) => Math.min(SCENES.length - 1, one + 1))}
            className="arcade-key inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-gold-400 px-6 text-sm font-bold tracking-wide text-plum-900 uppercase transition-colors hover:bg-gold-300"
          >
            {index === 0 ? 'Begin Adventure' : 'Next'}
          </button>
        </footer>
      )}
    </dialog>
  );
}
