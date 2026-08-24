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
  className = '',
}: {
  herbId: string;
  /** Describes the plant, not the animation — screen readers gain nothing from "bouncing". */
  alt: string;
  /** Growth stage. Accepted today, distinct art later — see `plant-sprites.ts`. */
  stage?: GardenStage;
  /** Multiplier on the sheet's own size. Keep to whole or half steps to stay crisp. */
  scale?: number;
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
      className={`plant-sprite plant-sprite-${sprite.frames} ${className}`}
      style={{
        width,
        height,
        backgroundImage: `url(${assetPath(sprite.src)})`,
        // The sheet is `frames` wide; height auto-scales with it.
        backgroundSize: `${width * sprite.frames}px ${height}px`,
        // Custom properties rather than literals so one keyframe serves every sprite.
        // `steps()` is the one thing that cannot read a variable, hence the class above.
        ['--sprite-sheet-width' as string]: `${width * sprite.frames}px`,
        ['--sprite-duration' as string]: `${sprite.frames / sprite.fps}s`,
      }}
    />
  );
}
