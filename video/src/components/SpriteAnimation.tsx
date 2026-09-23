import React from 'react';
import { Img, useCurrentFrame, useVideoConfig } from 'remotion';
import { asset, sprite } from '../lib/assets';
import type { SpriteStage } from '../lib/spec';

/**
 * Plays a creature's REAL frame sequence from the pack, at the fps its manifest records
 * (which is `src/data/sprites.json`, the same number the website animates at).
 *
 * The video runs at 30fps and a sprite at 4-12; the frame shown is the one the sprite's
 * own clock is on, so a 12fps gesture takes exactly as long here as it does on the site.
 *
 * INTEGER SCALE ONLY, nearest-neighbour. The frames are already authored pixel art; a
 * fractional scale lands pixel edges between device pixels and the creature goes soft.
 * Whole-sprite motion (enter, bob, pop) is the caller's transform, never a frame warp.
 */
export const SpriteAnimation: React.FC<{
  plant: string;
  stage?: SpriteStage;
  scale: number;
  /** Frame (of this component's Sequence) at which the gesture starts. Before it: frame 0. */
  startFrame?: number;
  loop?: boolean;
  /** Centre the drawn ink rather than the whole cell (cells carry empty sky). */
  centreOnInk?: boolean;
  style?: React.CSSProperties;
}> = ({ plant, stage = 'adult', scale, startFrame = 0, loop = true, centreOnInk = true, style }) => {
  if (!Number.isInteger(scale) || scale < 1) {
    throw new Error(`SpriteAnimation scale must be a whole number ≥ 1, got ${scale}`);
  }
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seq = sprite(plant, stage);
  const elapsed = Math.max(0, frame - startFrame);
  const step = Math.floor((elapsed * seq.fps) / fps);
  const index = loop ? step % seq.frameCount : Math.min(step, seq.frameCount - 1);
  const w = seq.frameWidth * scale;
  const h = seq.frameHeight * scale;

  // Offset so the centre of the frame-0 ink box sits at the centre of the element.
  let dx = 0;
  let dy = 0;
  if (centreOnInk && seq.content) {
    dx = (0.5 - (seq.content.left + seq.content.right) / 2) * w;
    dy = (0.5 - (seq.content.top + seq.content.bottom) / 2) * h;
  }

  return (
    <div style={{ width: w, height: h, position: 'relative', ...style }}>
      <Img
        src={asset(seq.frames[index]!)}
        style={{
          position: 'absolute',
          left: Math.round(dx),
          top: Math.round(dy),
          width: w,
          height: h,
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
};
