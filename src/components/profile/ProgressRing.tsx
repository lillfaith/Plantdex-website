/**
 * A ring readout, and the only one on the page.
 *
 * WHY A RING AT ALL. The hero already carries an XP bar; a second bar beside it for
 * collection makes two identical meters and the eye stops separating them. A ring says the
 * same fraction in a different shape, which is what lets both be read at a glance — and it
 * is one of the few non-rectangular objects on a page built from rounded rectangles.
 *
 * THE NUMBER AND THE ARC CANNOT DISAGREE. Both come from the one `value` this takes, which
 * is the same derived percentage the bars use (`profile-stats.ts`). There is no second
 * calculation here to drift.
 *
 * `--dash` is the circumference and `--fill` the fraction; the stroke offset is computed in
 * CSS (`.progress-ring-value`) so the arc animates in once on mount, matching `.path-fill`
 * on the bars. Under reduced motion it paints its final value immediately.
 */
export function ProgressRing({
  value,
  label,
  size = 72,
  stroke = 7,
}: {
  /** 0-100. Clamped, because a derived percentage should never be able to draw past full. */
  value: number;
  /** Announced to screen readers — the ring itself is decorative geometry. */
  label: string;
  size?: number;
  stroke?: number;
}) {
  const safe = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* The track. Dim enough to read as a groove rather than as a second value. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-plum-950)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-cyan-accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="progress-ring-value"
          /* Rotated so the arc starts at twelve o'clock rather than at three. */
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={
            {
              '--dash': `${circumference}`,
              '--fill': `${safe / 100}`,
            } as React.CSSProperties
          }
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base leading-none font-extrabold text-violet-100 tabular-nums">
          {safe}
          <span className="text-[0.72rem] font-bold text-violet-300">%</span>
        </span>
      </span>
    </div>
  );
}
