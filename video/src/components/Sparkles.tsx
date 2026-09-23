import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { C } from '../lib/brand';
import { rand } from '../lib/rand';

/**
 * A one-shot burst of square pixel sparks from a point. DECORATIVE: it plays once (the
 * product's motion rule — nothing repeats forever) and is not an app effect.
 */
export const SparkBurst: React.FC<{
  x: number;
  y: number;
  at: number;
  count?: number;
  radius?: number;
  seed?: string;
  duration?: number;
}> = ({ x, y, at, count = 18, radius = 420, seed = 'burst', duration = 26 }) => {
  const frame = useCurrentFrame();
  const t = (frame - at) / duration;
  if (t < 0 || t > 1) return null;
  const ease = 1 - Math.pow(1 - t, 3);
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + rand(`${seed}a${i}`) * 0.4;
        const dist = radius * (0.55 + rand(`${seed}d${i}`) * 0.45) * ease;
        const size = [10, 14, 18][i % 3]!;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: Math.round(x + Math.cos(angle) * dist - size / 2),
              top: Math.round(y + Math.sin(angle) * dist - size / 2),
              width: size,
              height: size,
              background: i % 2 ? C.gold : C.pink,
              opacity: interpolate(t, [0, 0.6, 1], [1, 0.9, 0]),
            }}
          />
        );
      })}
    </>
  );
};

/** A soft ring that expands once behind a reveal. Decorative. */
export const RevealRing: React.FC<{ x: number; y: number; at: number; size?: number }> = ({
  x,
  y,
  at,
  size = 760,
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame - at, [0, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (frame < at) return null;
  const s = size * (0.3 + 0.7 * t);
  return (
    <div
      style={{
        position: 'absolute',
        left: x - s / 2,
        top: y - s / 2,
        width: s,
        height: s,
        borderRadius: '50%',
        border: `6px solid ${C.gold}`,
        opacity: 1 - t,
      }}
    />
  );
};
