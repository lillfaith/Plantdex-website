'use client';

import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePageHidden } from './BotanicalStage';

/**
 * THE FULL-SCREEN FRAME EVERY BOSS FORM SCREEN SITS IN: a header, a content region and a footer,
 * with the same geometry on every screen so nothing jumps between them.
 *
 *   header   Exit on the left, the activity name centred, a counter on the right, then an
 *            optional progress row. The left and right cells are the same width, so the title is
 *            truly centred.
 *   content  fills the space between. It scrolls only if it must; it is never clipped.
 *   footer   a fixed-height status line, then ONE action button. The button does not move when
 *            the status text changes, because the status line has a fixed height.
 *
 * IT COVERS THE SITE NAVIGATION THROUGH A PORTAL, as the evolution screen does, so the bottom bar
 * is not shown inside the experience. Exit is always visible, labelled in words, and at least 48px
 * tall. Escape also exits. Safe-area insets are honoured at the top and bottom.
 *
 * It is a modal dialog: focus moves into it, Tab stays inside it, and the page behind does not
 * scroll. It draws no animation of its own and uses no filter, blur, timer or randomness.
 */
export interface ShellAction {
  label: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface ChallengeShellProps {
  /** The activity's name, shown centred in the header. */
  title: string;
  /** A short line above the title, such as "Question 2 of 3". */
  kicker?: string;
  /** Shown at the right of the header, such as "2/3". */
  counter?: string;
  /** Optional row under the header (progress). */
  progress?: ReactNode;
  /** The fixed-height line above the action. */
  status?: ReactNode;
  action: ShellAction;
  /** An optional quiet text control under the action. */
  secondary?: ReactNode;
  onExit: () => void;
  /**
   * Changes when the screen's content changes (the next question), and scrolls the content back to
   * the top. Without it a player who scrolled down a long question starts the next one half way.
   */
  scrollKey?: string | number;
  children: ReactNode;
}

function Chevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 8 12" className="h-4 w-3" shapeRendering="crispEdges" fill="currentColor">
      <path d="M6 0h2v2H6zM4 2h2v2H4zM2 4h2v2H2zM2 6h2v2H2zM4 8h2v2H4zM6 10h2v2H6z" />
    </svg>
  );
}

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ChallengeShell({
  title,
  kicker,
  counter,
  progress,
  status,
  action,
  secondary,
  onExit,
  scrollKey,
  children,
}: ChallengeShellProps) {
  // A portal needs `document`; this avoids a server/client mismatch and renders nothing on the server.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const hidden = usePageHidden();
  const root = useRef<HTMLDivElement | null>(null);
  const body = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [scrollKey]);

  useEffect(() => {
    if (!mounted) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [mounted]);

  if (!mounted) return null;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onExit();
      return;
    }
    if (event.key !== 'Tab' || !root.current) return;
    const items = Array.from(root.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === root.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={`${title}, Boss Form challenge`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      data-paused={hidden}
      data-shell="boss"
      className="boss-scene fixed inset-0 z-[60] flex flex-col bg-plum-950 bg-[radial-gradient(ellipse_90%_45%_at_50%_0%,rgb(255_210_110/0.14),transparent_70%)] pt-[env(safe-area-inset-top)] text-violet-50 outline-none"
    >
      <header className="shrink-0">
        <div className="grid grid-cols-[5.5rem_1fr_5.5rem] items-center gap-1 px-3 pt-2">
          <button
            type="button"
            onClick={onExit}
            className="pixel-tile flex min-h-12 items-center justify-center gap-1.5 rounded-lg px-3 text-base font-extrabold text-violet-50 outline-none focus-visible:ring-4 focus-visible:ring-gold-300"
          >
            <Chevron />
            Exit
          </button>
          <div className="min-w-0 text-center">
            {kicker ? (
              <p className="truncate text-sm font-bold tracking-wide text-gold-300 uppercase">{kicker}</p>
            ) : null}
            <h1 className="truncate font-display text-base leading-tight font-extrabold text-gold-plate">{title}</h1>
          </div>
          <p className="text-center text-base font-extrabold text-violet-100">{counter ?? ''}</p>
        </div>
        {progress ? <div className="px-4 pt-2">{progress}</div> : null}
      </header>

      <div ref={body} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-2">
        {children}
      </div>

      <footer className="shrink-0 px-4 pt-1 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
        <div
          aria-live="polite"
          className="flex h-[4.25rem] items-center justify-center overflow-hidden text-center text-base leading-snug text-violet-100"
        >
          {status}
        </div>
        <button
          type="button"
          disabled={action.disabled}
          onClick={action.onClick}
          className={`min-h-14 w-full rounded-full px-6 text-lg font-extrabold outline-none focus-visible:ring-4 focus-visible:ring-gold-300 ${
            action.disabled
              ? 'cursor-default bg-plum-700 text-violet-200'
              : 'arcade-key holo-fill text-plum-900'
          }`}
        >
          {action.label}
        </button>
        {secondary ? <div className="mt-1 flex justify-center">{secondary}</div> : null}
      </footer>
    </div>,
    document.body,
  );
}
