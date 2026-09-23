import React from 'react';
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { uiPart } from '../lib/assets';

/**
 * A real UI component from `06-ui-parts/`, optionally cropped to a region, animated in as
 * a floating panel. Uniform scale only; the capture is never redrawn or re-lettered.
 */
export const UiCallout: React.FC<{
  part: string;
  width: number;
  crop?: { x: number; y: number; w: number; h: number };
  delay?: number;
  style?: React.CSSProperties;
}> = ({ part, width, crop = { x: 0, y: 0, w: 1, h: 1 }, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const img = uiPart(part);
  const p = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 110 } });
  const drawW = width / crop.w;
  const drawH = (drawW * img.height) / img.width;
  const boxH = drawH * crop.h;
  return (
    <div
      style={{
        width,
        height: boxH,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 32,
        boxShadow: '0 40px 80px rgba(0,0,0,0.55)',
        opacity: interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
        transform: `translateY(${(1 - p) * 120}px) scale(${0.92 + 0.08 * p})`,
        ...style,
      }}
    >
      <Img
        src={img.src}
        style={{ position: 'absolute', left: -crop.x * drawW, top: -crop.y * drawH, width: drawW, height: drawH }}
      />
    </div>
  );
};
