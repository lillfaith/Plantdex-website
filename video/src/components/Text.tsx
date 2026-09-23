import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, goldPink, outfit } from '../lib/brand';
import type { Line } from '../lib/spec';

/**
 * `*words*` in a caption render in the brand gradient. Emphasis is presentation only: the
 * asterisks are stripped before `lint:ads` compares a quote with the app's copy, so marking a
 * word can never change what the words say.
 */
export function Emphasis({ text }: { text: string }): React.ReactElement {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('*') && p.endsWith('*') ? <GradientText key={i}>{p.slice(1, -1)}</GradientText> : <React.Fragment key={i}>{p}</React.Fragment>,
      )}
    </>
  );
}

/** Shared entrance: fade + small rise, spring-timed. Returns style for a child. */
export function useRise(delay = 0, distance = 36): React.CSSProperties {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 18 });
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
}

/** Fade everything out over the last `frames` of a scene of length `duration`. */
export function useOutro(duration: number, frames = 8): number {
  const frame = useCurrentFrame();
  return interpolate(frame, [duration - frames, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export const Kicker: React.FC<{ line: Line; delay?: number; style?: React.CSSProperties }> = ({
  line,
  delay = 0,
  style,
}) => (
  <div
    style={{
      fontFamily: outfit,
      fontWeight: 700,
      fontSize: 30,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: C.gold,
      ...useRise(delay, 20),
      ...style,
    }}
  >
    {line.text}
  </div>
);

/**
 * A caption. On a busy plate (a photograph) pass `plate` and it sits on a plum panel so it
 * stays legible without darkening the asset underneath.
 */
export const Caption: React.FC<{
  line: Line;
  kicker?: Line;
  delay?: number;
  size?: number;
  plate?: boolean;
  align?: 'left' | 'center';
  style?: React.CSSProperties;
}> = ({ line, kicker, delay = 0, size = 64, plate = false, align = 'center', style }) => {
  const rise = useRise(delay);
  return (
    <div
      style={{
        textAlign: align,
        ...(plate
          ? {
              background: `${C.ground}e6`,
              border: `2px solid ${C.line}`,
              borderRadius: 36,
              padding: '32px 40px',
            }
          : {}),
        ...rise,
        ...style,
      }}
    >
      {kicker ? (
        <div
          style={{
            fontFamily: outfit,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: C.gold,
            marginBottom: 14,
          }}
        >
          {kicker.text}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: outfit,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.12,
          color: C.text,
          letterSpacing: '-0.01em',
          textWrap: 'balance',
        }}
      >
        <Emphasis text={line.text} />
      </div>
    </div>
  );
};

/** Text filled with the brand gold→pink gradient (the site's heading/button treatment). */
export const GradientText: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <span
    style={{
      background: goldPink,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      ...style,
    }}
  >
    {children}
  </span>
);

/** The on-screen safety line. Small, but never below 30px and never under 1.5s. */
export const SafetyLine: React.FC<{ line: Line; delay?: number; style?: React.CSSProperties }> = ({
  line,
  delay = 0,
  style,
}) => (
  <div
    style={{
      fontFamily: outfit,
      fontWeight: 600,
      fontSize: 32,
      lineHeight: 1.3,
      color: C.lilac,
      textAlign: 'center',
      ...useRise(delay, 12),
      ...style,
    }}
  >
    {line.text}
  </div>
);
