'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Herb } from '@/lib/types';
import { hasSprite } from '@/lib/plant-sprites';
import { MysteryCard } from './MysteryCard';

/**
 * The face-down card at the top of a locked card page, and the one place its silhouette
 * performs.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY HERE AND NOT IN THE GRID, WHICH IS WHERE THIS FIRST WENT.
 *
 * A grid tile is a <Link> to this page, and this page is where `DiscoverPanel` renders
 * "Log a Discovery" — so the tile is the route into recording a find. Putting the press
 * target on the tile meant either swallowing that route or carving the tile into two
 * regions that behave differently, and both are worse than the thing they bought.
 *
 * Here there is no such conflict: the card is not a link to anywhere, so the WHOLE of it
 * can be the control, and arriving on the page is itself the moment the animation belongs
 * to. Opening a locked card is a player asking "what is under there" — the gesture is the
 * answer to that question, and it plays without being asked for.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SHARED BY BOTH LOCKED STATES. `LockedHerb` (a printed card not yet found) and
 * `LockedFieldCard` (a Field Card below its XP threshold) drew the same wrapper around the
 * same component; two copies of this state would be two places for it to drift.
 *
 * IT REVEALS NOTHING. The sprite is the one `MysteryCard` already draws, under the filter
 * it already applies — the shade sits on the sprite element, so every frame of a pass is
 * flattened to the same plum shadow and there is no frame at which colour could appear.
 * No name, no rarity, no card art; nothing here writes a discovery, XP or mastery.
 */
export function LockedCardArt({ herb }: { herb: Herb }) {
  /*
   * ONE PASS, NEVER A LOOP. `plant-sprite-once` is the shared idle with its iteration
   * count set to 1 and no fill mode, so it ends on frame 0 — the pose `build_sprites.py`
   * authors as a complete resting plant. Nothing here re-implements the walk.
   *
   * REPEATED PRESSES CANNOT STACK because the guard IS the class's presence: while
   * `playing` is true the class is already applied and a further press changes nothing.
   */
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const play = useCallback(() => {
    if (playing) return;
    /*
     * REDUCED MOTION IS REFUSED HERE RATHER THAN COLLAPSED IN CSS. The global rule pins
     * `.plant-sprite` to `animation: none`, so setting the class would paint nothing AND
     * fire no `animationend` — leaving `playing` stuck true and the control dead for the
     * rest of the visit. Read at play time, the same way the discovery celebration reads
     * it for its face-down hold.
     */
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    setPlaying(true);
    /*
     * A ceiling, not a duration. The pass ends on `animationend`; this exists only so a
     * dropped event cannot leave the card unable to play again. Four seconds is past the
     * longest sheet in the set (blue vervain, 14 frames at 6fps).
     */
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPlaying(false), 4000);
  }, [playing]);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setPlaying(false);
  }, []);

  /*
   * PLAYS ON ARRIVAL, ON THE FRAME AFTER MOUNT.
   *
   * Not synchronously in the effect, for two reasons that happen to agree. React flags a
   * synchronous setState there as a cascading render — correctly, it is a second render
   * before the first has been painted. And the animation wants the later frame anyway: the
   * class has to land on an element the browser has already laid out, or the first steps of
   * the walk are spent on an element that has not been drawn yet.
   *
   * MOUNT-ONLY, and `play` is deliberately not a dependency. It changes identity with
   * `playing`, so listing it would fire the effect again the moment the first pass ended —
   * a loop assembled out of one-shots, which is the thing the iteration count exists to
   * prevent.
   */
  useEffect(() => {
    const frame = requestAnimationFrame(play);
    return () => {
      cancelAnimationFrame(frame);
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const art = <MysteryCard herb={herb} size="detail" playOnce={playing} onPlayEnd={stop} />;
  const frame =
    'relative mx-auto mt-4 aspect-[356/576] w-52 overflow-hidden rounded-[var(--radius-card)] shadow-card-lift';

  /*
   * A CARD WITH NO SHEET IS NOT A CONTROL. `MysteryCard` draws a keyhole where no sprite
   * exists, and a button over a keyhole is a control that lies about having something to
   * do. Those cards keep exactly the markup they had before this component existed.
   */
  if (!hasSprite(herb.id)) {
    return <div className={frame}>{art}</div>;
  }

  return (
    <button
      type="button"
      aria-label="Play the mystery plant's animation again"
      onClick={play}
      className={`${frame} block cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400`}
    >
      {art}
    </button>
  );
}
