import { assetPath } from '@/lib/asset-path';
import { spriteFor } from '@/lib/plant-sprites';
import type { GardenStage } from '@/lib/garden';

/**
 * A herb's animated pixel-art portrait.
 *
 * The sheet is one horizontal row of frames. The animation walks it with `steps()` so
 * each frame SNAPS into place — a smooth slide would look like the sprite was gliding
 * sideways, which is the opposite of a low-frame handheld idle. Combined with
 * `image-rendering: pixelated` the authored pixels stay square at any size, with no
 * blur and no anti-aliasing.
 *
 * No JavaScript runs after paint and no animation library is involved: this is one div,
 * a background image, and a keyframe. `prefers-reduced-motion` freezes it on frame 0,
 * which every sprite authors as a complete resting pose (see `globals.css`, and
 * `build_sprites.py` for why frame 0 carries that responsibility).
 *
 * All 45 cards have an authored portrait. It still renders nothing for an id with no
 * sprite, so pages can mount it unconditionally without guarding.
 */
export function PlantSprite({
  herbId,
  alt,
  stage = 'flowering',
  scale = 1,
  frozen = false,
  fit = false,
  className = '',
}: {
  herbId: string;
  /** Describes the plant, not the animation — screen readers gain nothing from "bouncing". */
  alt: string;
  /** Growth stage. Accepted today, distinct art later — see `plant-sprites.ts`. */
  stage?: GardenStage;
  /** Multiplier on the sheet's own size. Keep to whole or half steps to stay crisp. */
  scale?: number;
  /**
   * Hold frame 0 instead of playing. Frame 0 is authored as a complete resting pose — the
   * same guarantee `prefers-reduced-motion` depends on — which is what makes it usable as
   * the still botanical shadow inside a locked card.
   */
  frozen?: boolean;
  /**
   * Fill the width of whatever contains it, keeping the frame's aspect ratio, instead of
   * rendering at a multiple of the authored pixel size.
   *
   * Works with or without `frozen`: the fitted sprite animates through
   * `plant-sprite-play-fit`, which walks the sheet in percentages rather than pixels, so a
   * responsive sprite is no longer forced to hold frame 0. That is what lets a row of
   * creatures shrink to fit four across a phone and still perform.
   */
  fit?: boolean;
  className?: string;
}) {
  const sprite = spriteFor(herbId, stage);
  if (!sprite) return null;

  const width = sprite.frameWidth * scale;
  const height = sprite.frameHeight * scale;

  return (
    <div
      role="img"
      aria-label={alt}
      className={`plant-sprite plant-sprite-${sprite.frames}${fit ? ' plant-sprite-fit' : ''}${frozen ? ' plant-sprite-frozen' : ''} ${className}`}
      style={{
        ...(fit
          ? {
              width: '100%',
              aspectRatio: `${sprite.frameWidth} / ${sprite.frameHeight}`,
              // A percentage background-size measures against the element, so the sheet
              // scales with the box: `frames × 100%` puts exactly one frame in view.
              backgroundSize: `${sprite.frames * 100}% 100%`,
              // How far the percentage walk travels. See `plant-sprite-play-fit`: 100% is
              // the LAST frame rather than one past it, so the range has to overshoot by
              // frames/(frames-1) for every step to land on a whole frame.
              ['--sprite-travel' as string]: `${(sprite.frames / (sprite.frames - 1)) * 100}%`,
            }
          : {
              width,
              height,
              // The sheet is `frames` wide; height auto-scales with it.
              backgroundSize: `${width * sprite.frames}px ${height}px`,
            }),
        backgroundImage: `url(${assetPath(sprite.src)})`,
        // Custom properties rather than literals so one keyframe serves every sprite.
        // `steps()` is the one thing that cannot read a variable, hence the class above.
        ['--sprite-sheet-width' as string]: `${width * sprite.frames}px`,
        ['--sprite-duration' as string]: `${sprite.frames / sprite.fps}s`,
      }}
    />
  );
}
