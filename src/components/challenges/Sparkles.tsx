/**
 * A few gold sparks that fly outward once. Positions are fixed by index (no randomness, which
 * the screens avoid so a render is the same render), each is a tiny rotated square, and the
 * whole burst is one 800ms transform-and-opacity animation per spark, then gone. Purely
 * decorative: `aria-hidden`, `pointer-events-none`, no text.
 */
export function Sparkles({
  count = 6,
  radius = 44,
  startMs = 0,
  className = '',
}: {
  count?: number;
  radius?: number;
  /** Delay before the first spark, so a burst can wait for the moment it celebrates. */
  startMs?: number;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`}>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
        const far = radius * (i % 2 === 0 ? 1 : 0.72);
        return (
          <span
            key={i}
            className="sparkle-out absolute top-1/2 left-1/2 h-2 w-2 rotate-45 bg-gold-300"
            style={{
              ['--dx' as string]: `${Math.round(Math.cos(angle) * far)}px`,
              ['--dy' as string]: `${Math.round(Math.sin(angle) * far)}px`,
              animationDelay: `${startMs + i * 45}ms`,
            }}
          />
        );
      })}
    </span>
  );
}
