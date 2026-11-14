'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { pixelForest } from '@/lib/pixel-art';

/**
 * THE ATMOSPHERE AROUND THE CHALLENGES: soft pine silhouettes, a strip of pixel ferns and
 * mushrooms (the one the Identify page already draws), a golden light from above, and a few
 * dandelion seeds drifting past.
 *
 * CONTAINED, NEVER LAYERED OVER THE PAGE'S CHROME. The scenery lives inside this wrapper, which
 * ends where the content ends, so it can never sit behind the footer links or the bottom
 * navigation. (It used to be a fixed full-screen layer, and a fern strip ran behind the footer
 * text.) The pines darken the background behind the lower content, which can only help the
 * light text on it; the fern strip is an ordinary block AFTER the content, with no text over it.
 *
 * LIGHTWEIGHT BY CONSTRUCTION. Silhouettes are inline SVG polygons, the forest strip is an
 * existing generated data URI, and the seeds are five tiny spans moving by transform and
 * opacity only, each making three slow passes and then resting. No blur, filter, timer or
 * library. Everything decorative is `aria-hidden` and `pointer-events-none`.
 *
 * It owns two attributes the stylesheet reads: `data-paused` (set while the page is hidden, so
 * every animation inside freezes in place and resumes without restarting) and `data-skip`.
 */
const SEEDS = [
  { left: '10%', top: '62%', x: '40px', y: '-170px', d: '13s', delay: '0s' },
  { left: '32%', top: '74%', x: '-30px', y: '-190px', d: '15s', delay: '3s' },
  { left: '58%', top: '68%', x: '46px', y: '-160px', d: '12s', delay: '6s' },
  { left: '78%', top: '78%', x: '-38px', y: '-200px', d: '16s', delay: '1.5s' },
  { left: '90%', top: '58%', x: '-24px', y: '-150px', d: '14s', delay: '8s' },
] as const;

function Pine({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 40" className={className} shapeRendering="crispEdges">
      <polygon points="12,0 18,12 15,12 21,22 16,22 24,34 14,34 14,40 10,40 10,34 0,34 8,22 3,22 9,12 6,12" />
    </svg>
  );
}

/** True while the page is hidden. Animations are frozen then, and resume in place. */
export function usePageHidden(): boolean {
  return useSyncExternalStore(
    (notify) => {
      document.addEventListener('visibilitychange', notify);
      return () => document.removeEventListener('visibilitychange', notify);
    },
    () => document.hidden,
    () => false,
  );
}

export function BotanicalStage({
  children,
  skip = false,
}: {
  children: ReactNode;
  skip?: boolean;
}) {
  const hidden = usePageHidden();

  return (
    <div className="boss-scene relative" data-paused={hidden} data-skip={skip}>
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-4 inset-y-0 z-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_50%_0%,rgb(255_210_110/0.2),transparent_70%)]" />
        <Pine className="absolute bottom-2 -left-3 h-36 w-20 fill-plum-950 opacity-60" />
        <Pine className="absolute bottom-2 left-12 h-24 w-14 fill-plum-950 opacity-45" />
        <Pine className="absolute right-10 bottom-2 h-28 w-16 fill-plum-950 opacity-45" />
        <Pine className="absolute -right-4 bottom-2 h-40 w-24 fill-plum-950 opacity-60" />
        {SEEDS.map((seed, i) => (
          <span
            key={i}
            className="seed-drift absolute h-1.5 w-1.5 rotate-45 bg-violet-100"
            style={{
              left: seed.left,
              top: seed.top,
              ['--seed-x' as string]: seed.x,
              ['--seed-y' as string]: seed.y,
              ['--seed-d' as string]: seed.d,
              ['--seed-delay' as string]: seed.delay,
            }}
          />
        ))}
      </div>
      <div className="relative z-10">{children}</div>
      <span
        aria-hidden="true"
        className="scan-forest relative z-10 mt-6 block opacity-70"
        style={{ ['--scan-forest' as string]: pixelForest() }}
      />
    </div>
  );
}
