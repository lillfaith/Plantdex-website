'use client';

import type { EarnedMoment } from '@/lib/earned-moments';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { CountUp } from '@/components/herbdex/CountUp';
import { PlantSprite } from '@/components/PlantSprite';
import { getPrintedCard } from '@/lib/deck';
import { haptic } from '@/lib/haptics';
import { MASTERY_STAGE_BLURB, MASTERY_STAGE_LABEL } from '@/lib/mastery';
import { hasSprite } from '@/lib/plant-sprites';
import { LEVELS } from '@/lib/progression';
import { researchTaskById } from '@/lib/research';

/**
 * THE EARNED-MOMENT CARD. One at a time, non-blocking, and only ever for a real event.
 *
 * This mirrors the contract of `src/lib/earned-moments.ts` (coordinator lane, branch
 * `coord/earned-moments-core`). It is declared locally so this lane builds on its own; the
 * integrator switches this to `import type { EarnedMoment } from '@/lib/earned-moments'`.
 * The shapes must stay identical.
 */
export type { EarnedMoment };

/** The motion lasts about this long; Skip lands the end state before it. */
export const EARNED_MOTION_MS = 1150;
/** Auto-dismiss, only if the player has not touched the card. Level-up is the bigger beat. */
export const EARNED_HOLD_MS = 5000;
export const EARNED_LEVEL_HOLD_MS = 6500;

export interface MomentCopy {
  kicker: string;
  title: string;
  detail: string | null;
  /** Short one-line label used when this moment is folded into a "+N more" line. */
  short: string;
}

/**
 * Every word comes from the lib the real screens read: level names from `LEVELS`, the stage
 * label and blurb from `mastery.ts`, the card name from the deck and the task title from the
 * research registry. Nothing here states an XP number (the moment never claims a payout) and
 * nothing implies a medicinal effect.
 */
export function describeMoment(moment: EarnedMoment): MomentCopy {
  if (moment.kind === 'level-up') {
    const name = LEVELS.find((level) => level.level === moment.toLevel)?.name ?? null;
    return { kicker: 'Level up', title: `Level ${moment.toLevel}`, detail: name, short: `Level ${moment.toLevel}` };
  }
  if (moment.kind === 'mastery') {
    const name = getPrintedCard(moment.herbId)?.commonName ?? 'A card';
    return {
      kicker: MASTERY_STAGE_LABEL.mastered,
      title: name,
      detail: MASTERY_STAGE_BLURB.mastered,
      short: `${name} ${MASTERY_STAGE_LABEL.mastered.toLowerCase()}`,
    };
  }
  const title = researchTaskById(moment.taskId)?.title ?? 'Field Research';
  return { kicker: 'Field Research complete', title, detail: null, short: title };
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Eight pixel dots thrown outward on a fixed grid. Positions are data, not randomness. */
const BURST: readonly (readonly [number, number])[] = [
  [-26, 0],
  [26, 0],
  [0, -26],
  [0, 26],
  [-18, -18],
  [18, -18],
  [-18, 18],
  [18, 18],
];

function Burst() {
  return (
    <span aria-hidden="true" className="earned-burst">
      {BURST.map(([x, y], index) => (
        <i
          key={index}
          className={index % 2 === 0 ? 'earned-dot' : 'earned-dot earned-dot-alt'}
          style={{ '--bx': `${x}px`, '--by': `${y}px` } as CSSProperties}
        />
      ))}
    </span>
  );
}

/**
 * Is a modal `<dialog>` open anywhere? A modal sits in the top layer, so a card shown under it
 * is invisible while its clock runs. The host therefore does not mount the card (no motion, no
 * auto-dismiss, no Escape handler, no acknowledgement) until the last one closes. Event driven:
 * one MutationObserver on the `open` attribute and on dialogs entering or leaving the tree,
 * plus a capturing `close` listener. No polling.
 */
function subscribeDialogs(notify: () => void): () => void {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['open'],
  });
  document.addEventListener('close', notify, true);
  return () => {
    observer.disconnect();
    document.removeEventListener('close', notify, true);
  };
}
const dialogOpen = () => document.querySelector('dialog[open]') !== null;

function MomentCard({
  moment,
  more,
  onDismiss,
}: {
  moment: EarnedMoment;
  more: string[];
  onDismiss: () => void;
}) {
  // Reduced motion starts at the end state. Safe on the server: the host renders nothing
  // there because the pending list is empty until the provider is ready.
  const [settled, setSettled] = useState(prefersReducedMotion);
  const touched = useRef(false);
  const copy = describeMoment(moment);
  const isLevel = moment.kind === 'level-up';

  // The one haptic, on the real event. A no-op on iOS web and under reduced motion.
  useEffect(() => {
    haptic(moment.kind === 'research' ? 'tap' : 'success');
  }, [moment.kind]);

  // Motion ends by itself; Skip just gets there sooner.
  useEffect(() => {
    if (settled) return;
    const timer = window.setTimeout(() => setSettled(true), EARNED_MOTION_MS);
    return () => window.clearTimeout(timer);
  }, [settled]);

  // Auto-dismiss only if the player never interacted. Touching the card keeps it.
  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        if (!touched.current) onDismiss();
      },
      isLevel ? EARNED_LEVEL_HOLD_MS : EARNED_HOLD_MS,
    );
    return () => window.clearTimeout(timer);
  }, [isLevel, onDismiss]);

  // First Escape or Skip lands the end state; the next one closes. Same two steps as Skip.
  const skip = () => {
    touched.current = true;
    if (!settled) setSettled(true);
    else onDismiss();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      touched.current = true;
      if (!settled) setSettled(true);
      else onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settled, onDismiss]);

  const showSprite = moment.kind === 'mastery' && hasSprite(moment.herbId);

  return (
    <div
      role="status"
      aria-live="polite"
      data-earned-kind={moment.kind}
      data-settled={settled ? 'true' : 'false'}
      onPointerDown={() => {
        touched.current = true;
      }}
      className={`earned-card ${settled ? 'earned-settled' : ''}`}
    >
      <div className="earned-art" aria-hidden={showSprite ? undefined : true}>
        {!settled && <Burst />}
        {showSprite && moment.kind === 'mastery' ? (
          <PlantSprite
            herbId={moment.herbId}
            alt={getPrintedCard(moment.herbId)?.commonName ?? ''}
            stage="flowering"
            fit
            frozen={settled}
            className="earned-sprite"
          />
        ) : (
          <span className="earned-glyph" aria-hidden="true">
            {isLevel ? moment.toLevel : <i className="earned-tick" />}
          </span>
        )}
      </div>

      <div className="earned-text">
        <p className="earned-kicker">{copy.kicker}</p>
        <p className="earned-title">
          {isLevel && !settled ? (
            <CountUp from={moment.fromLevel} to={moment.toLevel} durationMs={700} prefix="Level " />
          ) : (
            copy.title
          )}
        </p>
        {copy.detail && <p className="earned-detail">{copy.detail}</p>}
        {more.length > 0 && (
          <p className="earned-more">
            +{more.length} more: {more.join(' · ')}
          </p>
        )}
      </div>

      <button type="button" onClick={skip} className="earned-skip min-h-11 min-w-11">
        {settled ? 'Done' : 'Skip'}
        <span className="sr-only"> this notice</span>
      </button>
    </div>
  );
}

/**
 * Renders at most ONE card however many moments are pending; the rest fold into a single
 * "+N more" line. Dismissing acknowledges everything that was folded in, so N moments are
 * N acknowledgements but never N cards.
 *
 * It is anchored above the bottom nav and does not take focus, cover a primary action or
 * block the page: `role="status"`, no scrim, no trap. Pure display of data it is handed.
 */
export function EarnedMomentHost({
  moments,
  onAcknowledge,
}: {
  moments: EarnedMoment[];
  onAcknowledge: (id: string) => void;
}) {
  const current = moments[0];
  const blocked = useSyncExternalStore(subscribeDialogs, dialogOpen, () => false);
  // Latest list for the dismiss handler without re-arming the card's timers on each change.
  const latest = useRef(moments);
  useEffect(() => {
    latest.current = moments;
  });
  const acknowledgeAll = useRef((): void => undefined);
  useEffect(() => {
    acknowledgeAll.current = () => {
      for (const moment of latest.current) onAcknowledge(moment.id);
    };
  }, [onAcknowledge]);
  const [dismiss] = useState(() => () => acknowledgeAll.current());

  // Moments stay queued in the provider; they simply wait for the dialog to close.
  if (!current || blocked) return null;

  const more = moments.slice(1).map((moment) => describeMoment(moment).short);

  return (
    <div className="earned-host">
      <MomentCard key={current.id} moment={current} more={more} onDismiss={dismiss} />
    </div>
  );
}
