import React from 'react';
import { Img, interpolate, Easing, useCurrentFrame } from 'remotion';
import { screen } from '../lib/assets';
import { C } from '../lib/brand';
import type { Highlight, Pan } from '../lib/spec';

/**
 * A plain device frame. It is a presentation device, not app UI: no notch icons, no status
 * bar numbers, nothing the app draws. The screenshot inside is the real capture.
 */
export const PhoneFrame: React.FC<{ width: number; height: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  width,
  height,
  children,
  style,
}) => (
  <div
    style={{
      width: width + 28,
      height: height + 28,
      padding: 14,
      borderRadius: 72,
      background: `linear-gradient(160deg, ${C.panelHi}, ${C.ground})`,
      boxShadow: `0 0 0 3px ${C.line}, 0 50px 90px rgba(0,0,0,0.6)`,
      ...style,
    }}
  >
    <div style={{ width, height, borderRadius: 58, overflow: 'hidden', position: 'relative', background: C.ground }}>
      {children}
    </div>
  </div>
);

/**
 * A real screenshot in a window, panned and zoomed between two framings. The capture is
 * only ever moved and scaled uniformly; nothing inside it is animated as if the app were
 * running (CREATIVE_RULES §3). Highlights are an outline drawn OVER the capture, in
 * fractions of it, so they point at something that is really there.
 */
export const ScreenshotView: React.FC<{
  screenKey: string;
  framing: string;
  width: number;
  height: number;
  from: Pan;
  to: Pan;
  duration: number;
  highlights?: Highlight[];
}> = ({ screenKey, framing, width, height, from, to, duration, highlights = [] }) => {
  const frame = useCurrentFrame();
  const shot = screen(screenKey, framing);
  const t = interpolate(frame, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });
  const zoom = from.zoom + (to.zoom - from.zoom) * t;
  const panY = from.y + (to.y - from.y) * t;
  const panX = (from.x ?? 0.5) + ((to.x ?? 0.5) - (from.x ?? 0.5)) * t;
  const drawW = width * zoom;
  const drawH = (drawW * shot.height) / shot.width;
  const left = -(drawW - width) * panX;
  const top = -Math.max(0, drawH - height) * panY;

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Img src={shot.src} style={{ position: 'absolute', left, top, width: drawW, height: drawH }} />
      {highlights.map((h, i) => {
        const o = interpolate(frame, [h.from, h.from + 8, h.to - 6, h.to], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: left + h.x * drawW - 10,
              top: top + h.y * drawH - 10,
              width: h.w * drawW + 20,
              height: h.h * drawH + 20,
              borderRadius: 28,
              border: `6px solid ${C.gold}`,
              boxShadow: `0 0 40px ${C.gold}88`,
              opacity: o,
            }}
          />
        );
      })}
    </div>
  );
};
