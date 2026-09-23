import React from 'react';
import { AbsoluteFill, Img, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { CardReveal } from '../components/PhysicalCard';
import { PhoneFrame, ScreenshotView } from '../components/ScreenshotDemo';
import { RevealRing, SparkBurst } from '../components/Sparkles';
import { SpriteAnimation } from '../components/SpriteAnimation';
import { Caption, GradientText, Kicker, SafetyLine, useOutro, useRise } from '../components/Text';
import { UiCallout } from '../components/UiCallout';
import { fillCardTokens, image } from '../lib/assets';
import { C, goldPink, outfit, SAFE } from '../lib/brand';
import type {
  CardRevealScene,
  CtaScene,
  HookScene,
  Line,
  PhotoScene,
  SpriteStage,
  ScreenDemoScene,
  UiCalloutScene,
} from '../lib/spec';

/** Card-sourced lines get their tokens filled from the plant's own data; others pass through. */
const fill = (line: Line, plant?: string): Line =>
  line.source === 'card' && plant ? { ...line, text: fillCardTokens(line.text, plant) } : line;

const W = 1080;

// ── Hook: the creature appears ─────────────────────────────────────────────
export const Hook: React.FC<{ scene: HookScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // The first frame is the thumbnail and the first impression, so it is never empty: the
  // opening line is already on screen at frame 0 and the creature pops a fifth of a second in.
  const popAt = 6;
  const pop = spring({ frame: frame - popAt, fps, config: { damping: 9, stiffness: 140, mass: 0.8 } });
  const lines = scene.lines.map((l) => fill(l, scene.plant));
  const cy = 1080;
  return (
    <AbsoluteFill>
      <Backdrop glowY={56} seed="hook" />
      <RevealRing x={W / 2} y={cy} at={popAt} size={900} />
      <SparkBurst x={W / 2} y={cy} at={popAt} seed="hook" />
      <div
        style={{
          position: 'absolute',
          top: SAFE.top + 30,
          width: W,
          textAlign: 'center',
          fontFamily: outfit,
          fontWeight: 800,
          color: C.text,
        }}
      >
        {lines.map((l, i) => {
          const accent = i === scene.accent;
          return (
            <div
              key={i}
              style={{
                fontSize: accent ? 150 : 86,
                lineHeight: accent ? 1.05 : 1.15,
                letterSpacing: accent ? '-0.02em' : '0',
                ...(i === 0 ? {} : riseAt(frame, fps, i * 6)),
              }}
            >
              {accent ? <GradientText>{l.text}</GradientText> : l.text}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: cy - 330,
          width: W,
          height: 660,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transform: `scale(${pop}) translateY(${Math.sin(frame / 9) * 6}px)`,
        }}
      >
        <SpriteAnimation plant={scene.plant} stage={scene.stage} scale={scene.spriteScale} startFrame={popAt + 8} />
      </div>
    </AbsoluteFill>
  );
};

// A pure twin of useRise for use inside a map (hooks may not be called in loops).
function riseAt(frame: number, fps: number, delay: number): React.CSSProperties {
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 18 });
  return { opacity: p, transform: `translateY(${(1 - p) * 36}px)` };
}

// ── Card reveal: the physical card ──────────────────────────────────────────
export const CardRevealView: React.FC<{ scene: CardRevealScene }> = ({ scene }) => {
  const cardW = 600;
  return (
    <AbsoluteFill>
      <Backdrop glowY={45} seed="card" glow={C.pink} />
      {scene.kicker ? (
        <Kicker
          line={fill(scene.kicker, scene.plant)}
          style={{ position: 'absolute', top: SAFE.top + 10, width: W, textAlign: 'center' }}
        />
      ) : null}
      <div style={{ position: 'absolute', top: SAFE.top + 80, left: (W - cardW) / 2 }}>
        <CardReveal plant={scene.plant} width={cardW} delay={2} />
      </div>
      <Caption
        line={fill(scene.caption, scene.plant)}
        delay={20}
        size={60}
        style={{ position: 'absolute', top: SAFE.top + 80 + 971 + 44, left: SAFE.side, width: W - SAFE.side * 2 }}
      />
    </AbsoluteFill>
  );
};

// ── Photo: real product photography as a moving plate ───────────────────────
export const PhotoView: React.FC<{ scene: PhotoScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const photo = image(scene.image);
  const t = interpolate(frame, [0, scene.duration], [0, 1], { extrapolateRight: 'clamp' });
  const zoom = scene.from.zoom + (scene.to.zoom - scene.from.zoom) * t;
  const px = (scene.from.x ?? 0.5) + ((scene.to.x ?? 0.5) - (scene.from.x ?? 0.5)) * t;
  const py = scene.from.y + (scene.to.y - scene.from.y) * t;
  // Cover the frame at zoom 1, then zoom uniformly.
  const cover = Math.max(W / photo.width, 1920 / photo.height) * zoom;
  const dw = photo.width * cover;
  const dh = photo.height * cover;
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: 'hidden' }}>
      <Img
        src={photo.src}
        style={{ position: 'absolute', width: dw, height: dh, left: -(dw - W) * px, top: -(dh - 1920) * py }}
      />
      <Caption
        line={scene.caption}
        kicker={scene.kicker}
        delay={6}
        size={58}
        plate
        style={{
          position: 'absolute',
          ...(scene.captionAt === 'bottom' ? { bottom: SAFE.bottom + 20 } : { top: SAFE.top + 10 }),
          left: SAFE.side,
          width: W - SAFE.side * 2,
        }}
      />
    </AbsoluteFill>
  );
};

// ── Screen demo: real screenshots in a device frame ─────────────────────────
export const ScreenDemoView: React.FC<{ scene: ScreenDemoScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const phoneW = 680;
  const phoneH = 1060;
  const phoneTop = 470;
  const xfade = 10;
  let start = 0;
  return (
    <AbsoluteFill>
      <Backdrop glowY={60} seed="screens" />
      <div style={{ position: 'absolute', top: phoneTop, left: (W - phoneW - 28) / 2, ...useRise(0, 60) }}>
        <PhoneFrame width={phoneW} height={phoneH}>
          {scene.shots.map((shot, i) => {
            const from = start;
            start += shot.duration;
            const o =
              i === 0
                ? 1
                : interpolate(frame, [from - xfade, from], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return (
              <Sequence key={i} from={i === 0 ? 0 : from - xfade} durationInFrames={shot.duration + xfade} layout="none">
                <div style={{ position: 'absolute', inset: 0, opacity: o }}>
                  <ScreenshotView
                    screenKey={shot.screen}
                    framing={shot.framing}
                    width={phoneW}
                    height={phoneH}
                    from={shot.from}
                    to={shot.to}
                    duration={shot.duration}
                    highlights={shot.highlights}
                  />
                </div>
              </Sequence>
            );
          })}
        </PhoneFrame>
      </div>
      {(() => {
        let s = 0;
        return scene.shots.map((shot, i) => {
          const from = s;
          s += shot.duration;
          return (
            <Sequence key={`c${i}`} from={from} durationInFrames={shot.duration} layout="none">
              <CaptionWithOutro line={shot.caption} duration={shot.duration} last={i === scene.shots.length - 1} />
            </Sequence>
          );
        });
      })()}
      {scene.safety ? (
        <SafetyLine
          line={scene.safety}
          delay={6}
          style={{ position: 'absolute', top: phoneTop - 66, left: SAFE.side, width: W - SAFE.side * 2 }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

const CaptionWithOutro: React.FC<{ line: Line; duration: number; last: boolean }> = ({ line, duration, last }) => {
  const out = useOutro(duration, 8);
  return (
    <Caption
      line={line}
      delay={2}
      size={54}
      style={{
        position: 'absolute',
        top: SAFE.top + 10,
        left: SAFE.side,
        width: W - SAFE.side * 2,
        opacity: last ? 1 : out,
      }}
    />
  );
};

// ── UI callout: one real component, large ──────────────────────────────────
export const UiCalloutView: React.FC<{ scene: UiCalloutScene }> = ({ scene }) => (
  <AbsoluteFill>
    <Backdrop glowY={55} seed="ui" glow={C.pink} />
    <Caption
      line={scene.caption}
      kicker={scene.kicker}
      delay={2}
      size={56}
      style={{ position: 'absolute', top: SAFE.top + 10, left: SAFE.side, width: W - SAFE.side * 2 }}
    />
    <div style={{ position: 'absolute', top: 540, left: SAFE.side - 12 }}>
      <UiCallout part={scene.part} crop={scene.crop} width={W - (SAFE.side - 12) * 2} delay={6} />
    </div>
    {scene.growth ? (
      <div
        style={{
          position: 'absolute',
          top: 1250,
          width: W,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: 24,
        }}
      >
        {scene.growth.stages.map((g, i) => (
          <GrowthStage key={g.stage} plant={scene.growth!.plant} stage={g.stage} label={g.label} delay={14 + i * 8} />
        ))}
      </div>
    ) : null}
  </AbsoluteFill>
);

const GrowthStage: React.FC<{ plant: string; stage: SpriteStage; label: Line; delay: number }> = ({
  plant,
  stage,
  label,
  delay,
}) => (
  <div style={{ textAlign: 'center', ...useRise(delay, 30) }}>
    <SpriteAnimation plant={plant} stage={stage} scale={1} startFrame={delay} />
    <div style={{ fontFamily: outfit, fontWeight: 700, fontSize: 34, color: C.gold, marginTop: 6 }}>{label.text}</div>
  </div>
);

// ── Call to action ─────────────────────────────────────────────────────────
export const CtaView: React.FC<{ scene: CtaScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const photo = scene.photo ? image(scene.photo) : null;
  const photoW = 640;
  const photoH = photo ? Math.round((photoW * photo.height) / photo.width) : 0;
  const pp = spring({ frame, fps, config: { damping: 18 } });
  return (
    <AbsoluteFill>
      <Backdrop glowY={50} seed="cta" />
      {photo ? (
        <div
          style={{
            position: 'absolute',
            top: SAFE.top - 20,
            left: (W - photoW) / 2,
            width: photoW,
            height: photoH,
            borderRadius: 40,
            overflow: 'hidden',
            boxShadow: '0 40px 80px rgba(0,0,0,0.55)',
            transform: `rotate(${interpolate(pp, [0, 1], [4, -2])}deg) scale(${0.9 + 0.1 * pp})`,
            opacity: pp,
          }}
        >
          <Img src={photo.src} style={{ width: photoW, height: photoH }} />
        </div>
      ) : null}
      <div style={{ position: 'absolute', top: SAFE.top - 20 + photoH + 40, width: W, textAlign: 'center' }}>
        <div style={{ fontFamily: outfit, fontWeight: 800, fontSize: 132, lineHeight: 1, letterSpacing: '-0.02em', ...useRise(6) }}>
          <GradientText>{scene.headline.text}</GradientText>
        </div>
        {scene.lines.map((l, i) => (
          <Caption key={i} line={l} delay={12 + i * 6} size={50} style={{ marginTop: 20, padding: `0 ${SAFE.side}px` }} />
        ))}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 8, marginTop: 18, ...useRise(20) }}>
          {scene.sprites.map((s, i) => (
            <SpriteAnimation key={i} plant={s.plant} stage={s.stage} scale={1} startFrame={20 + i * 5} />
          ))}
        </div>
        {scene.button ? (
          <div
            style={{
              display: 'inline-block',
              marginTop: 18,
              padding: '26px 64px',
              borderRadius: 999,
              background: goldPink,
              fontFamily: outfit,
              fontWeight: 700,
              fontSize: 46,
              color: C.ground,
              ...useRise(28),
            }}
          >
            {scene.button.text}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
