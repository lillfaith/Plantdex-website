import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { CardReveal, PhysicalCard } from '../components/PhysicalCard';
import { RevealRing, SparkBurst } from '../components/Sparkles';
import { SpriteAnimation } from '../components/SpriteAnimation';
import { Caption, GradientText } from '../components/Text';
import { fillCardTokens } from '../lib/assets';
import { C, outfit, SAFE } from '../lib/brand';
import type { Line, OwnershipScene } from '../lib/spec';

const W = 1080;
const fill = (line: Line, plant: string): Line =>
  line.source === 'card' ? { ...line, text: fillCardTokens(line.text, plant) } : line;

/** A drawn tick or cross in a round badge. Decorative status marks, not app UI. */
const Mark: React.FC<{ ok: boolean; p: number; size?: number }> = ({ ok, p, size = 58 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 58 58"
    style={{ transform: `scale(${0.4 + 0.6 * p})`, opacity: Math.min(1, p * 1.5), flexShrink: 0 }}
  >
    <circle cx="29" cy="29" r="27" fill={ok ? C.gold : 'transparent'} stroke={ok ? C.gold : C.pink} strokeWidth="4" />
    {ok ? (
      <path d="M16 30 L25 39 L43 20" fill="none" stroke={C.ground} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <path d="M19 19 L39 39 M39 19 L19 39" fill="none" stroke={C.pink} strokeWidth="6" strokeLinecap="round" />
    )}
  </svg>
);

const Status: React.FC<{ line: Line; ok: boolean; at: number; flipAt?: number }> = ({ line, ok, at, flipAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const show = spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 200 } });
  const flipped = flipAt !== undefined && frame >= flipAt;
  const flip = flipAt !== undefined ? spring({ frame: frame - flipAt, fps, config: { damping: 9, stiffness: 240 } }) : 1;
  const state = flipped ? true : ok;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        opacity: Math.min(1, show * 1.4),
        transform: `translateY(${(1 - show) * 24}px)`,
        fontFamily: outfit,
        fontWeight: 800,
        fontSize: 38,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: state ? C.gold : C.pink,
      }}
    >
      {line.text}
      <Mark ok={state} p={flipped ? flip : show} />
    </div>
  );
};

export const OwnershipView: React.FC<{ scene: OwnershipScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const discovered = scene.mode === 'discovered';

  // Two columns: the physical card, and the digital entry in a panel the same height.
  const colW = 420;
  const gapX = 48;
  const leftX = (W - colW * 2 - gapX) / 2;
  const rightX = leftX + colW + gapX;
  const cardH = Math.round((colW * 1295) / 800);
  const top = 520;
  const cx = rightX + colW / 2;
  const cy = top + cardH / 2;

  const silhouette = discovered
    ? interpolate(frame, [scene.at, scene.at + 4], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1;
  const flash = discovered
    ? interpolate(frame, [scene.at, scene.at + 2, scene.at + 12], [0, 0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;
  const punch = discovered ? spring({ frame: frame - scene.at, fps, config: { damping: 8, stiffness: 190, mass: 0.6 } }) : 0;
  const spriteScale = discovered && frame >= scene.at ? 1 + 0.12 * Math.sin(Math.min(punch, 1) * Math.PI) : 1;
  const panelIn = discovered ? 1 : spring({ frame: frame - 8, fps, config: { damping: 200 }, durationInFrames: 18 });
  // Once the status row lands, the hook steps back: one main thing to read at a time.
  const headlineDim = discovered
    ? 1
    : interpolate(frame, [scene.at, scene.at + 10], [1, 0.45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const xpAt = scene.at + 22;
  const counterAt = scene.at + 40;
  const xpP = spring({ frame: frame - xpAt, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });
  const tick = scene.counter && frame >= counterAt + 14;

  return (
    <AbsoluteFill>
      <Backdrop glowY={45} seed={`own-${scene.mode}`} />
      {scene.headline ? (
        discovered ? (
          <div
            style={{
              position: 'absolute',
              top: SAFE.top + 20,
              width: W,
              textAlign: 'center',
              fontFamily: outfit,
              fontWeight: 800,
              fontSize: 92,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              opacity: frame >= scene.at ? Math.min(1, punch * 2) : 0,
              transform: `scale(${frame >= scene.at ? 1.4 - 0.4 * Math.min(punch, 1) : 1.4})`,
            }}
          >
            <GradientText>{fill(scene.headline, scene.plant).text}</GradientText>
          </div>
        ) : (
          <Caption
            line={fill(scene.headline, scene.plant)}
            delay={0}
            size={66}
            style={{ position: 'absolute', top: SAFE.top + 10, left: SAFE.side, width: W - SAFE.side * 2, opacity: headlineDim }}
          />
        )
      ) : null}

      {/* The physical card */}
      <div style={{ position: 'absolute', left: leftX, top }}>
        {discovered ? (
          <PhysicalCard plant={scene.plant} width={colW} rotateY={-5} rotateX={3} rotateZ={-2} />
        ) : (
          <CardReveal plant={scene.plant} width={colW} delay={0} />
        )}
      </div>

      {/* The digital entry: the real sprite, as a silhouette until it is discovered */}
      <div
        style={{
          position: 'absolute',
          left: rightX,
          top,
          width: colW,
          height: cardH,
          borderRadius: colW * 0.05,
          background: `linear-gradient(170deg, ${C.panelHi}, ${C.panel})`,
          border: `3px ${discovered && frame >= scene.at ? 'solid' : 'dashed'} ${discovered && frame >= scene.at ? C.gold : C.line}`,
          boxShadow: `0 40px 80px rgba(0,0,0,0.5), 0 0 ${Math.round(80 * flash)}px ${C.gold}`,
          opacity: panelIn,
          transform: `translateY(${(1 - panelIn) * 40}px)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <div style={{ transform: `scale(${spriteScale})` }}>
          <SpriteAnimation
            plant={scene.plant}
            stage={scene.stage}
            scale={2}
            startFrame={discovered ? scene.at + 4 : 9999}
            silhouette={silhouette}
          />
        </div>
      </div>
      {discovered ? (
        <>
          <RevealRing x={cx} y={cy} at={scene.at} size={700} />
          <SparkBurst x={cx} y={cy} at={scene.at} seed="own" count={20} radius={360} />
        </>
      ) : null}

      {/* Status row under each column */}
      <div style={{ position: 'absolute', top: top + cardH + 40, left: leftX, width: colW }}>
        <Status line={scene.owned} ok at={discovered ? -20 : scene.at} />
      </div>
      <div style={{ position: 'absolute', top: top + cardH + 40, left: rightX, width: colW }}>
        <Status
          line={scene.discovered}
          ok={false}
          at={discovered ? -20 : scene.at + 10}
          flipAt={discovered ? scene.at + 8 : undefined}
        />
      </div>

      {/* Reward: XP, then the collection count ticking up by one */}
      {discovered && scene.xp ? (
        <div
          style={{
            position: 'absolute',
            top: top + cardH + 130,
            width: W,
            textAlign: 'center',
            fontFamily: outfit,
            fontWeight: 800,
            fontSize: 84,
            opacity: frame >= xpAt ? Math.min(1, xpP * 2) : 0,
            transform: `scale(${frame >= xpAt ? 1.5 - 0.5 * Math.min(xpP, 1) : 1.5})`,
          }}
        >
          <GradientText>{fill(scene.xp, scene.plant).text}</GradientText>
        </div>
      ) : null}
      {discovered && scene.counter && frame >= counterAt ? (
        <div
          style={{
            position: 'absolute',
            top: top + cardH + 236,
            width: W,
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: 22,
            fontFamily: outfit,
            opacity: Math.min(1, (frame - counterAt) / 6),
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.lilac }}>
            {scene.counter.label.text}
          </span>
          <span
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: tick ? C.gold : C.text,
              fontVariantNumeric: 'tabular-nums',
              display: 'inline-block',
              transform: `scale(${tick ? 1 + 0.15 * Math.max(0, 1 - (frame - counterAt - 14) / 8) : 1})`,
            }}
          >
            {String(tick ? scene.counter.to : scene.counter.from).padStart(2, '0')}
            <span style={{ color: C.lilac, fontSize: 44 }}> / {scene.counter.of}</span>
          </span>
        </div>
      ) : null}
      <AbsoluteFill
        style={{ background: `radial-gradient(circle at ${(cx / W) * 100}% ${(cy / 1920) * 100}%, ${C.goldSoft} 0%, ${C.gold}00 50%)`, opacity: flash, pointerEvents: 'none' }}
      />
    </AbsoluteFill>
  );
};
