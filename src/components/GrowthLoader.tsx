/**
 * The loading state: a seed putting out a stem and two leaves, on a loop.
 *
 * Plantdex's progression metaphor is growth, so waiting should look like growth rather
 * than like a generic spinner — this is the one place the brief asks for plant imagery
 * that ISN'T decoration bolted onto something that already worked.
 *
 * Kept deliberately restrained: thin strokes, the deck's own gold, one cycle every two
 * seconds. Under `prefers-reduced-motion` the global rule in globals.css collapses every
 * animation, which lands this on a finished sprout — a still botanical mark, not a frozen
 * half-drawn one. That is why the keyframes end where they start.
 */
export function GrowthLoader({
  label = 'Loading',
  className = '',
}: {
  /** Announced to screen readers. The visual is decorative. */
  label?: string;
  className?: string;
}) {
  return (
    <span role="status" className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 24 26"
        aria-hidden="true"
        className="growth-loader h-8 w-8 text-gold-500"
        fill="none"
      >
        {/* Ground line — the seed never moves, everything grows out of it. */}
        <path
          d="M6 24h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.35"
        />
        <path
          className="growth-stem"
          d="M12 24V7"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          className="growth-leaf growth-leaf-a"
          d="M12 16c0-3.3-2.7-6-6-6 0 3.3 2.7 6 6 6z"
          fill="currentColor"
        />
        <path
          className="growth-leaf growth-leaf-b"
          d="M12 11c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6z"
          fill="currentColor"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * A block-shaped placeholder with the growth mark centred in it.
 *
 * Holds the same footprint as the content it stands in for, so nothing jumps when the
 * real thing arrives.
 */
export function GrowthPlaceholder({
  className = '',
  label,
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-[var(--radius-card)] border border-violet-700/50 bg-violet-900/40 ${className}`}
    >
      <GrowthLoader label={label} />
    </div>
  );
}
