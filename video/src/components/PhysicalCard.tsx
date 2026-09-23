import React from 'react';
import { Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { cardFront } from '../lib/assets';

/**
 * A real card front, presented as a physical object: rounded corners, a cast shadow, and
 * perspective. The artwork itself is drawn untouched and at its own 800:1295 aspect — only
 * the object moves. Corner radius matches the printed card as it appears in the product
 * photography (~5% of width).
 */
export const PhysicalCard: React.FC<{
  plant: string;
  width: number;
  rotateY?: number;
  rotateX?: number;
  rotateZ?: number;
  /** 0..1 position of a brief decorative light sweep; omit for none. */
  sheen?: number;
  style?: React.CSSProperties;
}> = ({ plant, width, rotateY = 0, rotateX = 0, rotateZ = 0, sheen, style }) => {
  const card = cardFront(plant);
  const height = Math.round((width * card.height) / card.width);
  return (
    <div style={{ perspective: 2200, width, height, ...style }}>
      <div
        style={{
          width,
          height,
          position: 'relative',
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
          borderRadius: width * 0.05,
          overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,0.55), 0 10px 24px rgba(0,0,0,0.4)',
          backfaceVisibility: 'hidden',
        }}
      >
        <Img src={card.src} style={{ width, height, display: 'block' }} />
        {sheen !== undefined && sheen > 0 && sheen < 1 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(115deg, transparent ${sheen * 140 - 30}%, rgba(255,255,255,0.28) ${
                sheen * 140 - 15
              }%, transparent ${sheen * 140}%)`,
              mixBlendMode: 'screen',
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

/**
 * The reveal: the card swings in from edge-on to face the viewer, settles with a slight
 * tilt, and a single light sweep crosses it. There is deliberately NO card back in this
 * move — the per-card backs print "Healing Traits", which an ad cannot frame the way the
 * app does (CREATIVE_RULES §2), and a generic back would be an invented asset.
 */
export const CardReveal: React.FC<{ plant: string; width: number; delay?: number; style?: React.CSSProperties }> = ({
  plant,
  width,
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 90, mass: 0.9 } });
  const rotateY = interpolate(p, [0, 1], [-88, -6]);
  const float = Math.sin((frame - delay) / 22) * 1.6;
  const sheen = interpolate(frame - delay, [16, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <PhysicalCard
      plant={plant}
      width={width}
      rotateY={rotateY + float}
      rotateX={4 - float * 0.5}
      rotateZ={interpolate(p, [0, 1], [-6, -2])}
      sheen={sheen}
      style={{ opacity: interpolate(p, [0, 0.15], [0, 1], { extrapolateRight: 'clamp' }), ...style }}
    />
  );
};
