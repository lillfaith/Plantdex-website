import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { C } from '../lib/brand';
import { rand } from '../lib/rand';

/**
 * The shared ground: plum with a soft violet glow, and a few drifting square "pixel
 * motes". DECORATIVE — it is atmosphere in the deck's palette and pixel grammar, and it
 * does not resemble any app element, so it cannot be read as a feature.
 */
export const Backdrop: React.FC<{ glow?: string; glowY?: number; motes?: number; seed?: string }> = ({
  glow = C.violet,
  glowY = 42,
  motes = 22,
  seed = 'bg',
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: 'hidden' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 45% at 50% ${glowY}%, ${glow}55 0%, ${C.panel}00 70%)`,
        }}
      />
      {Array.from({ length: motes }, (_, i) => {
        const x = rand(`${seed}x${i}`) * 1080;
        const y0 = rand(`${seed}y${i}`) * 1920;
        const speed = 0.4 + rand(`${seed}s${i}`) * 0.9;
        const size = [6, 8, 10][Math.floor(rand(`${seed}z${i}`) * 3)]!;
        const y = (((y0 - frame * speed) % 1920) + 1920) % 1920;
        const tw = interpolate(Math.sin(frame / 14 + i), [-1, 1], [0.15, 0.55]);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: Math.round(x),
              top: Math.round(y),
              width: size,
              height: size,
              background: i % 3 === 0 ? C.gold : C.lilac,
              opacity: tw,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
