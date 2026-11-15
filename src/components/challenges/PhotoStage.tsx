'use client';

import { useEffect, useRef, useState, type MouseEvent, type ReactNode, type Ref } from 'react';

/**
 * THE BOTANICAL PHOTO STAGE: shows a photograph at its own proportions, as large as the space
 * allows, and never crops it.
 *
 * ANY RATIO, NO SPECIES-SPECIFIC LAYOUT. The stage takes the room its parent gives it and draws
 * the picture in the largest box of the picture's own aspect ratio that fits inside: wide when
 * there is width to spare, tall when there is height. A tall stalk, a square seed head and a wide
 * landscape all use the same rule, with the rest of the stage left as plain background rather
 * than cropped away. It never shrinks below a readable minimum height; if the screen cannot give
 * it that, the page scrolls instead.
 *
 * THE ROOM IS MEASURED, NOT GUESSED. The stage reports its own size through a ResizeObserver and
 * the picture is sized from that. The picture is positioned absolutely inside the stage, so it can
 * never change the room it is sized from (which would loop). Container query units were tried
 * first and abandoned: a stage that gets its height from flex growth reports a height of zero to
 * them, so every photograph collapsed to a dot. Before the first measurement, and in a render
 * with no browser, the picture simply fills the stage's width.
 *
 * THE BOX A TAP IS MEASURED AGAINST IS THE PICTURE ITSELF. `boxRef` lands on an element with
 * exactly the image's aspect ratio and no padding, so a point in it is a true percentage of the
 * photograph and a reviewed region lands in the same place at every screen size. The frame around
 * it is a separate element.
 */
const FRAME = 4; // the 2px border on each side, in px

/** The width of the framed picture: the biggest of this ratio that fits the stage. */
export function framedWidth(stageWidth: number, stageHeight: number, ratio: number): number {
  if (!(stageWidth > 0) || !(stageHeight > 0) || !(ratio > 0)) return Math.max(stageWidth, 0);
  return Math.min(stageWidth, (stageHeight - FRAME) * ratio + FRAME);
}

function useSize(ref: React.RefObject<HTMLDivElement | null>): { w: number; h: number } | null {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

export function PhotoStage({
  ratio,
  children,
  boxRef,
  onBoxClick,
  className = '',
  label,
  height,
}: {
  /** The photograph's width divided by its height. */
  ratio: number;
  /** Drawn inside the picture's own box: the image and any overlays on it. */
  children: ReactNode;
  boxRef?: Ref<HTMLDivElement>;
  onBoxClick?: (event: MouseEvent<HTMLDivElement>) => void;
  className?: string;
  label?: string;
  /**
   * A fixed stage height (any CSS length). Without it the stage grows to fill the room its parent
   * has left, which suits a question whose photograph IS the question. With it the stage is only
   * as tall as asked, which suits a photograph shown beside other things, so a short question is
   * not stretched to fill the screen.
   */
  height?: string;
}) {
  const stage = useRef<HTMLDivElement | null>(null);
  const size = useSize(stage);
  const width = size ? framedWidth(size.w, size.h, ratio) : null;
  return (
    <div ref={stage} className={`relative min-h-[15rem] ${height ? '' : 'flex-1'} ${className}`} style={height ? { height } : undefined}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-md border-2 border-violet-400 bg-plum-950" style={{ width: width === null ? '100%' : `${Math.floor(width)}px`, maxWidth: '100%' }}>
          <div
            ref={boxRef}
            onClick={onBoxClick}
            role={label ? 'group' : undefined}
            aria-label={label}
            className={`relative overflow-hidden bg-plum-950 ${onBoxClick ? 'cursor-pointer touch-manipulation' : ''}`}
            style={{ aspectRatio: ratio.toFixed(4) }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
