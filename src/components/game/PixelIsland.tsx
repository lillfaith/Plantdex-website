import { ISLAND_ASPECT, pixelIsland } from '@/lib/pixel-art';

/**
 * The small floating grass island plants stand on: grass, flowers and soil, hand-drawn on a
 * 44x22 pixel grid. Decorative only (`aria-hidden`). Plant sprites are layered over it by the
 * caller; this never draws a plant.
 */
export function PixelIsland({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block w-full ${className}`}
      style={{
        aspectRatio: ISLAND_ASPECT,
        backgroundImage: pixelIsland(),
        backgroundSize: '100% 100%',
        imageRendering: 'pixelated',
      }}
    />
  );
}
