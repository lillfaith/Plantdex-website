'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PlantSprite } from '@/components/PlantSprite';
import { ANONYMOUS_SCOPE, markWelcomeSeen } from '@/lib/first-run';
import {
  WALKTHROUGH_EVENT,
  WALK_FINISH,
  WALK_STEPS,
  WALK_TOTAL,
  markWalkthroughDone,
  type WalkStep,
} from '@/lib/walkthrough';
import { useAuth } from '@/state/AuthProvider';

/**
 * THE GUIDED WALKTHROUGH: a spotlight that walks a new player through the real app.
 *
 * It navigates to each page, scrolls the real element into view, dims everything else and
 * says one short thing about it. It owns no feature: every step points at markup that already
 * exists (see `walkthrough.ts`), the sample artwork is static, and nothing here reads or writes
 * a collection, so it needs no scan and no account and cannot award anything.
 *
 * MOUNTED ONCE IN THE SHELL, so the card persists while the page underneath changes and a step
 * can navigate without remounting itself. It renders nothing until asked: the intro's last
 * scene, or "Take the guided tour" on the profile, dispatches `WALKTHROUGH_EVENT`.
 *
 * THE CARD NEVER COVERS WHAT IT POINTS AT. It is pinned to the bottom of the screen, above the
 * tab bar on a phone, and the target is scrolled to the TOP of the free area, so the thing being
 * described sits above the words describing it. The page can still be scrolled (the dim layer
 * only blocks taps), and the spotlight follows it.
 *
 * MOTION: the spotlight eases between steps and the page scrolls smoothly, and both stop under
 * `prefers-reduced-motion` (CSS for the first, a media query read here for the second).
 */

/** Space kept above a spotlighted element, clear of the fixed header marks. */
const TOP_GAP = 72;
const PAD = 6;

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const normalise = (path: string | null) => (path ?? '').replace(/\/$/, '') || '/';

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function findTarget(step: WalkStep): HTMLElement | null {
  for (const selector of step.targets) {
    const found = document.querySelector<HTMLElement>(selector);
    if (!found) continue;
    const box = found.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) return found;
  }
  return null;
}

/** Three real sprites at the three growth stages, still, for a garden that may be empty. */
function GardenStages() {
  const stages = [
    { herbId: 'plantago-major', stage: 'sprout', label: 'Discovered' },
    { herbId: 'trifolium-pratense', stage: 'growing', label: 'Learned' },
    { herbId: 'taraxacum-officinale', stage: 'flowering', label: 'Mastered' },
  ] as const;
  return (
    <ul aria-hidden="true" className="mt-2 flex items-end justify-center gap-1">
      {stages.map((one, position) => (
        <li key={one.stage} className="flex items-end gap-1">
          <span className="flex w-16 flex-col items-center">
            <PlantSprite herbId={one.herbId} stage={one.stage} alt="" fit frozen />
            <span className="text-[0.72rem] leading-tight font-bold text-gold-300">{one.label}</span>
          </span>
          {position < stages.length - 1 && <span className="pb-4 text-violet-300">→</span>}
        </li>
      ))}
    </ul>
  );
}

export function AppWalkthrough() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const scope = user?.id ?? ANONYMOUS_SCOPE;

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  // Tagged with the step it was measured for, so a box left over from the previous step is
  // simply ignored rather than having to be cleared from inside an effect.
  const [held, setHeld] = useState<{ index: number; box: Box | null } | null>(null);
  // The step whose page has been reached. Leaving it afterwards (browser Back, say) means the
  // player has gone their own way, and the tour must not shove them forward again.
  const arrived = useRef(-1);
  const card = useRef<HTMLDivElement | null>(null);
  const title = useRef<HTMLHeadingElement | null>(null);

  const finishing = index >= WALK_STEPS.length;
  const step = finishing ? null : WALK_STEPS[index]!;
  const box = held && held.index === index ? held.box : null;

  useEffect(() => {
    const start = () => {
      // Starting the tour counts as having been welcomed. Without this, somebody who deep-linked
      // to /profile and replayed the tour would have the intro open over it on /herbdex.
      markWelcomeSeen(scope);
      arrived.current = -1;
      setIndex(0);
      setHeld(null);
      setActive(true);
    };
    window.addEventListener(WALKTHROUGH_EVENT, start);
    return () => window.removeEventListener(WALKTHROUGH_EVENT, start);
  }, [scope]);

  const close = useCallback(
    (how: 'finished' | 'skipped') => {
      markWalkthroughDone(scope, how);
      setActive(false);
      setHeld(null);
    },
    [scope],
  );

  // Go to the step's page, then find, scroll to and follow its element.
  useEffect(() => {
    if (!active || !step) return;
    if (normalise(pathname) !== step.route) {
      if (arrived.current === index) {
        close('skipped');
        return;
      }
      router.push(step.route);
      return;
    }
    arrived.current = index;
    const at = index;

    let target: HTMLElement | null = null;
    let cancelled = false;
    let attempts = 0;
    let retry: number | undefined;
    let frame = 0;

    const measure = () => {
      frame = 0;
      if (!target || !target.isConnected) return;
      const rect = target.getBoundingClientRect();
      const next = { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
      setHeld((was) => {
        const b = was && was.index === at ? was.box : null;
        return b &&
          Math.abs(b.top - next.top) < 0.5 &&
          Math.abs(b.left - next.left) < 0.5 &&
          Math.abs(b.width - next.width) < 0.5 &&
          Math.abs(b.height - next.height) < 0.5
          ? was
          : { index: at, box: next };
      });
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    /*
     * WHERE TO SCROLL, OR NOWHERE. A scroll is only worth making when the target is actually hidden
     * (above the header marks, or under the card) AND the page can really move far enough to fix it.
     * Short pages (the Journal, the Field Board) already show their heading, and a scroll there can
     * only be a no-op that still lands in the middle of a tap: on an iPhone a programmatic scroll
     * during a touch can swallow the tap, and scrolling toward the top makes Safari redraw its
     * toolbars, which shifts a bottom-pinned card out from under the finger. Returns null when no
     * scroll is needed.
     */
    const scrollDestination = (): number | null => {
      if (!target || !target.isConnected) return null;
      const rect = target.getBoundingClientRect();
      const cardTop = card.current?.getBoundingClientRect().top ?? window.innerHeight;
      if (rect.top >= 8 && rect.bottom <= cardTop - 8) return null;
      const furthest = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const to = Math.min(Math.max(0, window.scrollY + rect.top - TOP_GAP), furthest);
      return Math.abs(to - window.scrollY) < 2 ? null : to;
    };

    // A page that is still loading has no target yet, so look for a moment before settling for
    // the step's words with no hole: a tour must never wait on a selector.
    const look = () => {
      if (cancelled) return;
      target = findTarget(step);
      if (target) {
        const to = scrollDestination();
        if (to !== null) window.scrollTo({ top: to, behavior: reducedMotion() ? 'auto' : 'smooth' });
        measure();
        return;
      }
      attempts += 1;
      if (attempts < 30) retry = window.setTimeout(look, 100);
      else setHeld({ index: at, box: null });
    };
    look();

    // Content can still be arriving when the first smooth scroll starts (a daily-goal strip, a
    // hydrating store), which leaves the target short of where it was aimed. Re-align twice,
    // instantly, shortly after arriving, unless the player has already started scrolling.
    let touched = false;
    let touching = false;
    const touch = () => {
      touched = true;
    };
    const down = () => {
      touching = true;
    };
    const up = () => {
      touching = false;
    };
    window.addEventListener('touchstart', touch, { once: true, passive: true });
    window.addEventListener('wheel', touch, { once: true, passive: true });
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchend', up, { passive: true });
    window.addEventListener('touchcancel', up, { passive: true });
    const realign = () => {
      if (cancelled || touched || touching) return;
      const to = scrollDestination();
      if (to !== null) window.scrollTo({ top: to, behavior: 'auto' });
    };
    const realigning = [window.setTimeout(realign, 700), window.setTimeout(realign, 1500)];

    window.addEventListener('scroll', queue, { passive: true, capture: true });
    window.addEventListener('resize', queue);
    const watcher = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(queue);
    watcher?.observe(document.body);
    // Layout can settle after the first look (images, fonts, a store hydrating).
    const settle = window.setInterval(queue, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(retry);
      window.clearInterval(settle);
      realigning.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener('touchstart', touch);
      window.removeEventListener('wheel', touch);
      window.removeEventListener('touchstart', down);
      window.removeEventListener('touchend', up);
      window.removeEventListener('touchcancel', up);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', queue, { capture: true });
      window.removeEventListener('resize', queue);
      watcher?.disconnect();
    };
  }, [active, step, index, pathname, router, close]);

  // Land on the new step's heading, so a screen reader announces it.
  useEffect(() => {
    if (active) title.current?.focus({ preventScroll: true });
  }, [active, index]);

  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close('skipped');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, close]);

  // Keep Tab inside the card: the dim layer stops taps, this stops the keyboard wandering behind it.
  const trapTab = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || !card.current) return;
    const stops = [...card.current.querySelectorAll<HTMLElement>('button, a[href]')];
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!first || !last) return;
    // Focus lands on the heading at every step, and the heading sits BEFORE the first button, so
    // Shift+Tab from it has to wrap too or it walks straight out of the card into the page behind.
    if (event.shiftKey && (document.activeElement === first || document.activeElement === title.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!active) return null;

  const progress = Math.min(index, WALK_TOTAL - 1);

  return (
    <>
      {/* Stops taps on the page behind, so nothing is pressed by accident mid-tour. Scrolling
          still passes through, and the spotlight follows it. */}
      <div aria-hidden="true" className="fixed inset-0 z-[60]" />
      {box ? (
        <div
          aria-hidden="true"
          className="tour-hole"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
          }}
        />
      ) : (
        <div aria-hidden="true" className="tour-dim" />
      )}

      <div
        ref={card}
        role="dialog"
        aria-label="Plantdex guided tour"
        onKeyDown={trapTab}
        className="game-panel fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[62] mx-auto max-w-md p-4 sm:bottom-6"
      >
        <div className="flex items-center justify-between">
          <ol aria-label={`Step ${progress + 1} of ${WALK_TOTAL}`} className="flex items-center gap-1.5">
            {Array.from({ length: WALK_TOTAL }, (_, position) => (
              <li
                key={position}
                aria-current={position === progress ? 'step' : undefined}
                className={`h-2 rounded-full ${
                  position === progress ? 'w-5 bg-gold-400' : position < progress ? 'w-2 bg-gold-400/60' : 'w-2 bg-violet-400/50'
                }`}
              />
            ))}
          </ol>
          {!finishing && (
            <button
              type="button"
              onClick={() => close('skipped')}
              className="tap-44 inline-flex items-center rounded px-2 text-[0.72rem] font-bold tracking-[0.1em] text-violet-100 uppercase hover:text-white focus-visible:text-white"
            >
              Skip
              <span className="sr-only"> the tour</span>
            </button>
          )}
        </div>

        <h2
          ref={title}
          tabIndex={-1}
          className="font-display mt-2 text-xl font-extrabold text-gold-plate outline-none"
        >
          {step ? step.title : WALK_FINISH.title}
        </h2>
        <p className="mt-1 text-base leading-snug text-violet-100">
          {step ? step.body : WALK_FINISH.body}
        </p>
        {step?.sample === 'garden-stages' && <GardenStages />}

        <div className="mt-3 flex items-center gap-3">
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex((one) => Math.max(0, one - 1))}
              className="tap-44 rounded-full bg-plum-900/80 px-4 text-sm font-bold text-violet-100 transition-colors hover:text-white"
            >
              Back
            </button>
          )}
          {finishing ? (
            <Link
              href={WALK_FINISH.href}
              onClick={() => close('finished')}
              className="arcade-key ml-auto inline-flex min-h-12 flex-1 items-center justify-center rounded-full welcome-key px-6 text-sm font-bold tracking-wide uppercase transition-colors"
            >
              {WALK_FINISH.cta}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((one) => one + 1)}
              className="arcade-key ml-auto inline-flex min-h-12 min-w-[8rem] items-center justify-center rounded-full welcome-key px-8 text-sm font-bold tracking-wide uppercase transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </>
  );
}
