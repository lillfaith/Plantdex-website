'use client';

import { useEffect, useState } from 'react';

/**
 * A number that animates from one value to another.
 *
 * Three details make this behave rather than merely animate:
 *
 * - The reduced-motion check happens *inside* the effect, not during render, so the
 *   server and the first client render always agree (no hydration mismatch).
 * - Reduced motion is handled by collapsing the duration to zero rather than by setting
 *   state in the effect body, so the animation path is identical either way and there is
 *   no cascading-render lint violation.
 * - The final frame is assigned exactly, so the value always lands on `to` rather than
 *   on a rounding artefact.
 */

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function CountUp({
  from,
  to,
  durationMs = 900,
  className,
  prefix,
}: {
  from: number;
  to: number;
  durationMs?: number;
  className?: string;
  prefix?: string;
}) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 0 : durationMs;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      // duration 0 makes this Infinity, which clamps to 1 on the very first frame.
      const t = Math.min(1, (now - start) / duration);
      setValue(t >= 1 ? to : Math.round(from + (to - from) * easeOutCubic(t)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to, durationMs]);

  return (
    <span className={className}>
      {prefix}
      {value.toLocaleString()}
    </span>
  );
}
