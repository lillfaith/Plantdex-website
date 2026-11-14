'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { pixelForest } from '@/lib/pixel-art';

/**
 * THE ATMOSPHERE BEHIND THE CHALLENGES: soft pine silhouettes, a strip of pixel ferns and
 * mushrooms (the one the Identify page already draws), a golden light from above, and a few
 * dandelion seeds drifting past.
 *
 * LIGHTWEIGHT BY CONSTRUCTION. Silhouettes are inline SVG polygons at low opacity, the forest
 * strip is an existing generated data URI, and the seeds are five tiny spans moving by
 * transform and opacity only, each making three slow passes and then resting. There is no
 * blur, no filter, no timer and no library. Everything decorative is `aria-hidden` and
 * `pointer-events-none`, sits behind the content, and stays well away from text, so it cannot
 * lower any contrast the page is measured on.
 *
 * It owns two attributes the stylesheet reads: `data-paused` (set while the page is hidden, so
 * every animation inside freezes in place and resumes without restarting) and `data-skip`
 * (set by a caller, to land every animation on its end state at once).
 */
const SEEDS = [
  { left: '12%', top: '62%', x: '40px', y: '-170px', d: '13s', delay: '0s' },
  { left: '34%', top: '74%', x: '-30px', y: '-190px', d: '15s', delay: '3s' },
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
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_50%_0%,rgb(255_210_110/0.2),transparent_70%)]" />
        <Pine className="absolute bottom-10 -left-3 h-40 w-24 fill-plum-950 opacity-60" />
        <Pine className="absolute bottom-10 left-14 h-28 w-16 fill-plum-950 opacity-45" />
        <Pine className="absolute right-12 bottom-10 h-32 w-20 fill-plum-950 opacity-45" />
        <Pine className="absolute -right-4 bottom-10 h-44 w-28 fill-plum-950 opacity-60" />
        <span
          className="scan-forest absolute inset-x-0 bottom-12 opacity-30"
          style={{ ['--scan-forest' as string]: pixelForest() }}
        />
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
    </div>
  );
}
