import { pixelRuns } from '@/lib/pixel-runs';
import {
  PACKET_HEIGHT,
  PACKET_WIDTH,
  packetGrid,
  type PacketRecipe,
} from '@/lib/seed-packet';

/**
 * One generated seed packet, drawn as pixels.
 *
 * SVG rather than an image file, for the reason the whole system exists: there is no file.
 * A packet is a grid computed from a species name, so it is drawn at render time from that
 * grid — which also means it scales without blurring and costs no request.
 *
 * COLOURS COME FROM THE TOKENS, NOT FROM THE RECIPE. The recipe names shades
 * (`mystery-lilac`); this resolves them to `var(--color-mystery-lilac)`. Nothing in the
 * generator holds a hex value, so a palette change moves the shelf with the rest of the site.
 * The shade is the paper mixed toward the ground rather than a second token, so a packet's
 * two paper tones can never drift into an unrelated pair.
 */
export function SeedPacket({
  recipe,
  alt,
  className = '',
  faded = false,
}: {
  recipe: PacketRecipe;
  /** Describes the packet for a reader who cannot see it. */
  alt: string;
  className?: string;
  /** Grown into a card: the packet is history now, so it steps back. */
  faded?: boolean;
}) {
  const grid = packetGrid(recipe);
  const token = (name: string) => `var(--color-${name})`;

  const fill: Record<string, string> = {
    p: token(recipe.paper),
    s: `color-mix(in srgb, ${token(recipe.paper)} 76%, ${token('plum-950')})`,
    b: token(recipe.band),
    i: token(recipe.ink),
    o: `color-mix(in srgb, ${token('plum-950')} 82%, transparent)`,
  };

  return (
    <svg
      viewBox={`0 0 ${PACKET_WIDTH} ${PACKET_HEIGHT}`}
      role="img"
      aria-label={alt}
      shapeRendering="crispEdges"
      className={`h-auto w-full ${faded ? 'opacity-70' : ''} ${className}`}
    >
      {grid.map((row, y) =>
        /*
         * One rect per RUN of identical cells rather than per cell: a packet is 252 cells and
         * a shelf holds dozens, so the runs are what keep a full shelf a few hundred nodes
         * instead of tens of thousands.
         */
        pixelRuns(row).map(({ x, width, cell }) =>
          cell === '.' || cell === ' ' ? null : (
            <rect key={`${y}-${x}`} x={x} y={y} width={width} height={1} fill={fill[cell]} />
          ),
        ),
      )}
    </svg>
  );
}
