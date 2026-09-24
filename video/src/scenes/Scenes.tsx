import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop } from '../components/Backdrop';
import { CardReveal } from '../components/PhysicalCard';
import { PhoneFrame, ScreenshotView } from '../components/ScreenshotDemo';
import { RevealRing, SparkBurst } from '../components/Sparkles';
import { SpriteAnimation } from '../components/SpriteAnimation';
import { Caption, GradientText, Kicker, SafetyLine, useOutro, useRise } from '../components/Text';
import { UiCallout } from '../components/UiCallout';
import { fillCardTokens, footage, image } from '../lib/assets';
import { C, goldPink, outfit, SAFE } from '../lib/brand';
import { rand } from '../lib/rand';
import type {
  CardRevealScene,
  CtaScene,
  FootageScene,
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
/**
 * Silhouette → reveal. The creature is on screen from frame 0 as a dark silhouette (the
 * thumbnail frame is never empty), rustles, then bursts into colour with a flash, a short
 * shake and a scale punch. The silhouette is the app's own convention: an undiscovered
 * plant is a silhouette in the Herbdex grid, so this mirrors real behaviour, not an effect
 * the app lacks. The flash, sparks and shake are decorative (CREATIVE_RULES §3).
 */
export const Hook: React.FC<{ scene: HookScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const teaser = scene.teaser;
  const revealAt = teaser ? teaser.duration : 15;
  const lines = scene.lines.map((l) => fill(l, scene.plant));
  const cy = 1090;

  const silhouette = interpolate(frame, [revealAt, revealAt + 4], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // Anticipation: a small rustle that speeds up just before the reveal.
  // With a teaser the wait is long, so the rustle stays small and only builds over the last
  // half-second; without one it is the short original anticipation.
  const build = Math.max(0, frame - (revealAt - 15));
  const rustle =
    frame >= revealAt
      ? 0
      : teaser
        ? Math.sin(frame * (0.5 + build * 0.06)) * (0.8 + build * 0.35)
        : Math.sin(frame * (0.9 + frame * 0.05)) * (1.5 + frame * 0.18);
  const punch = spring({ frame: frame - revealAt, fps, config: { damping: 8, stiffness: 180, mass: 0.6 } });
  // A teaser's silhouette creeps toward the viewer while the line is read.
  const approach = teaser ? interpolate(frame, [0, revealAt], [0.86, 0.94], { extrapolateRight: 'clamp' }) : 0.94;
  const scale = frame < revealAt ? approach : 0.94 + 0.06 * punch + 0.1 * Math.sin(Math.min(punch, 1) * Math.PI);
  const shakeT = frame - revealAt;
  const shake =
    shakeT >= 0 && shakeT < 7
      ? { x: (rand(`sx${shakeT}`) - 0.5) * 18 * (1 - shakeT / 7), y: (rand(`sy${shakeT}`) - 0.5) * 18 * (1 - shakeT / 7) }
      : { x: 0, y: 0 };
  const flash = interpolate(frame, [revealAt, revealAt + 2, revealAt + 10], [0, 0.55, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const bob = frame > revealAt + 10 ? Math.sin((frame - revealAt) / 9) * 6 : 0;

  return (
    <AbsoluteFill style={{ transform: `translate(${shake.x}px, ${shake.y}px)` }}>
      <Backdrop glowY={56} seed="hook" />
      <RevealRing x={W / 2} y={cy} at={revealAt} size={980} />
      <SparkBurst x={W / 2} y={cy} at={revealAt} seed="hook" count={22} radius={470} />
      {teaser ? <TeaserLine line={fill(teaser.line, scene.plant)} exitAt={revealAt} /> : null}
      <div
        style={{
          position: 'absolute',
          top: SAFE.top + 20,
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
                fontSize: accent ? 172 : 100,
                lineHeight: accent ? 1.02 : 1.12,
                letterSpacing: accent ? '-0.025em' : '0',
                ...(i === 0 ? (teaser ? riseAt(frame, fps, revealAt) : {}) : riseAt(frame, fps, revealAt + 2 + (i - 1) * 7)),
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
          transform: `scale(${scale}) translateY(${bob}px) rotate(${rustle}deg)`,
        }}
      >
        <SpriteAnimation
          plant={scene.plant}
          stage={scene.stage}
          scale={scene.spriteScale}
          startFrame={revealAt + 6}
          silhouette={silhouette}
        />
      </div>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% ${(cy / 1920) * 100}%, ${C.goldSoft} 0%, ${C.gold}00 55%)`,
          opacity: flash,
          pointerEvents: 'none',
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * The curiosity line: words pop in fast (the first two are already there at frame 0, so the
 * thumbnail reads as a sentence starting), hold, then lift away as the reveal fires.
 */
const TeaserLine: React.FC<{ line: Line; exitAt: number }> = ({ line, exitAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words: { text: string; em: boolean }[] = [];
  for (const part of line.text.split(/(\*[^*]+\*)/g).filter(Boolean)) {
    const em = part.startsWith('*') && part.endsWith('*');
    for (const w of (em ? part.slice(1, -1) : part).split(/\s+/).filter(Boolean)) words.push({ text: w, em });
  }
  const exit = interpolate(frame, [exitAt - 3, exitAt + 3], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (exit <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: SAFE.top + 30,
        left: SAFE.side,
        width: W - SAFE.side * 2,
        textAlign: 'center',
        fontFamily: outfit,
        fontWeight: 800,
        fontSize: 104,
        lineHeight: 1.08,
        letterSpacing: '-0.02em',
        color: C.text,
        opacity: exit,
        transform: `translateY(${(1 - exit) * -40}px)`,
      }}
    >
      {words.map((w, i) => {
        // The first three words are up at frame 0, so the thumbnail reads as a line, not a word.
        const at = Math.max(0, (i - 2) * 2.5);
        const p = at === 0 ? 1 : spring({ frame: frame - at, fps, config: { damping: 12, stiffness: 220, mass: 0.5 } });
        return (
          <span
            key={i}
            style={{ display: 'inline-block', marginRight: '0.24em', opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 30}px) scale(${0.85 + 0.15 * p})` }}
          >
            {w.em ? <GradientText>{w.text}</GradientText> : w.text}
          </span>
        );
      })}
    </div>
  );
};

// A pure twin of useRise for use inside a map (hooks may not be called in loops).
function riseAt(frame: number, fps: number, delay: number): React.CSSProperties {
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 18 });
  return { opacity: p, transform: `translateY(${(1 - p) * 36}px)` };
}

// ── Card reveal: the physical card ──────────────────────────────────────────
export const CardRevealView: React.FC<{ scene: CardRevealScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const cardW = 640;
  const cardH = Math.round((cardW * 1295) / 800);
  // A soft halo that blooms once as the card lands. Decorative; it never touches the card.
  const halo = interpolate(frame, [6, 26, 60], [0, 0.9, 0.55], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Backdrop glowY={45} seed="card" glow={C.pink} />
      <div
        style={{
          position: 'absolute',
          left: W / 2 - 520,
          top: SAFE.top + 80 + cardH / 2 - 620,
          width: 1040,
          height: 1240,
          background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${C.gold}66 0%, ${C.pink}33 40%, ${C.ground}00 72%)`,
          opacity: halo,
        }}
      />
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
        size={58}
        style={{ position: 'absolute', top: SAFE.top + 80 + cardH + 40, left: SAFE.side, width: W - SAFE.side * 2 }}
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

// ── Footage: owner-shot video, full bleed ──────────────────────────────────
/**
 * Real footage of the real deck. Played muted (the ad's sound is chosen in-platform), with
 * an optional slow push-in; uniform scale only, never a crop that reframes the subject away.
 */
export const FootageView: React.FC<{ scene: FootageScene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const clip = footage(scene.clip);
  const rate = scene.playbackRate ?? 1;
  const startAt = scene.startAt ?? 0;
  if (startAt + (scene.duration / fps) * rate > clip.duration + 0.05) {
    throw new Error(`${scene.clip}: ${scene.duration} frames at ${rate}x runs past the end of a ${clip.duration}s clip`);
  }
  const zoom = interpolate(frame, [0, scene.duration], [scene.zoomFrom ?? 1, scene.zoomTo ?? 1], {
    extrapolateRight: 'clamp',
  });
  const cover = Math.max(W / clip.width, 1920 / clip.height);
  const offsetY = scene.offsetY ?? 0;
  // An offset must never uncover the frame edge: the zoom has to overhang by at least as much.
  if ((1920 * ((scene.zoomFrom ?? 1) - 1)) / 2 < Math.abs(offsetY)) {
    throw new Error(`${scene.clip}: offsetY ${offsetY} would expose the frame edge at zoom ${scene.zoomFrom ?? 1}`);
  }
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `translateY(${offsetY}px) scale(${zoom})` }}>
        <OffthreadVideo
          src={clip.src}
          muted
          playbackRate={rate}
          startFrom={Math.round(startAt * fps)}
          style={{ width: clip.width * cover, height: clip.height * cover, objectFit: 'cover' }}
        />
      </AbsoluteFill>
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
  const phoneW = 760;
  const phoneH = 1110;
  const phoneTop = 462;
  const xfade = 12;
  let start = 0;
  return (
    <AbsoluteFill>
      <Backdrop glowY={60} seed="screens" />
      <div style={{ position: 'absolute', top: phoneTop, left: (W - phoneW - 28) / 2, ...useRise(0, 60) }}>
        <PhoneFrame width={phoneW} height={phoneH}>
          {scene.shots.map((shot, i) => {
            const from = start;
            start += shot.duration;
            // A push, not a crossfade: two pages of text faded over each other read as one
            // muddy page. The outgoing shot slides left as the incoming one arrives from the right.
            const ease = Easing.inOut(Easing.cubic);
            const inX =
              i === 0
                ? 0
                : interpolate(frame, [from - xfade, from], [phoneW, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
            const outX = scene.shots[i + 1]
              ? interpolate(frame, [start - xfade, start], [0, -phoneW], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
              : 0;
            return (
              <Sequence key={i} from={i === 0 ? 0 : from - xfade} durationInFrames={shot.duration + xfade} layout="none">
                <div style={{ position: 'absolute', inset: 0, transform: `translateX(${inX + outX}px)` }}>
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
