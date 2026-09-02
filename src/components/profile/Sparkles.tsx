/**
 * Three pixels drifting around the sidekick.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ONLY THING ON THIS PAGE THAT MOVES ON ITS OWN, and it is deliberately near the edge
 * of noticeable: 2px squares, gold at low opacity, on a five-second cycle with each one
 * offset so they never pulse together. A profile carries a lot of information, and anything
 * ambient that competes with reading it is a bug rather than polish.
 *
 * `aria-hidden` and `pointer-events-none`: it is decoration on a creature that is already
 * fully described in text beside it, and it must never intercept the link behind it.
 *
 * Frozen outright under `prefers-reduced-motion` (globals.css) rather than left to the
 * duration collapse — a loop that collapses stops at whatever opacity it happened to reach,
 * which would strand a visible dot in mid-air.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Position and phase per pixel. Whole classes, never interpolated. */
const PIXELS = [
  { at: 'left-1 top-6', delay: '0ms' },
  { at: 'right-2 top-3', delay: '1700ms' },
  { at: 'right-4 bottom-5', delay: '3400ms' },
] as const;

export function Sparkles() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {PIXELS.map((pixel) => (
        <span
          key={pixel.at}
          className={`sparkle absolute ${pixel.at} block h-0.5 w-0.5 bg-gold-300`}
          style={{ animationDelay: pixel.delay }}
        />
      ))}
    </span>
  );
}
