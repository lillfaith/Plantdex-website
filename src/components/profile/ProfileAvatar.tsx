import { PlantSprite } from '../PlantSprite';
import { contentFit, spriteFor } from '@/lib/plant-sprites';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import type { FieldFrame } from '@/lib/field-frames';
import type { GardenStage } from '@/lib/garden';

/**
 * The player's avatar: a chosen plant sprite inside a chosen frame.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE ELEMENTS, NOT THREE SHADOWS. A frame can carry a blurred bloom, an outer border and
 * an inner border, and each is its OWN absolutely-positioned element. Stacking them as
 * `ring-*` or arbitrary `shadow-[…]` on one node is what this codebase has already shipped
 * twice and watched paint nothing: both compose into `box-shadow`, which the surrounding
 * card surfaces already own, so the winner is whichever declaration came last and the
 * frame quietly disappears. Borders and backgrounds compose with nothing.
 *
 * THE BLOOM IS NOT `-z-10`. A negative z-index paints behind the background of the stacking
 * context — and `body` carries the plum ground plus two radial gradients, so a bloom placed
 * there is drawn underneath the page itself. Same bug `RarityAura` documents. The layers sit
 * at `z-0` and the sprite is lifted above them.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * WITH NOTHING CHOSEN it draws an empty frame with a sprout mark rather than a broken image
 * or a blank square, because a player who has discovered nothing still has a profile and it
 * should look like the start of something.
 */
export function ProfileAvatar({
  herbId,
  herbName,
  frame,
  stage = 'flowering',
  size = 'lg',
  frozen = false,
}: {
  herbId: string | null;
  herbName?: string;
  frame: FieldFrame;
  stage?: GardenStage;
  /**
   * `lg` is the identity banner, `sm` a picker swatch, `xs` the sitewide badge.
   *
   * `xs` FRAMES THE PLANT RATHER THAN THE CANVAS. Every stage is drawn on one canvas
   * against a shared ground line, so a seedling occupies under half of it and, at 36px,
   * came out as about twelve pixels of plant floating low in a thirty-six pixel circle.
   * `contentFit` scales and re-centres what was actually drawn — the sprite, the stage and
   * the art are untouched, so the badge still shows exactly the growth stage the collection
   * has earned; it is simply framed as a portrait. The larger sizes have room to spare and
   * keep the authored composition, ground line and all.
   */
  size?: 'xs' | 'sm' | 'lg';
  /**
   * Hold frame 0 instead of playing.
   *
   * The sitewide badge uses this. Frame 0 is authored as a complete resting pose for every
   * sprite — the same guarantee `prefers-reduced-motion` leans on — so a frozen avatar is a
   * portrait rather than a paused animation. A creature idling in the corner of every page
   * in the app is ambient motion nobody asked for.
   */
  frozen?: boolean;
}) {
  // 80px on a phone, 112px from `sm:` up. The mobile size is smaller than the desktop one
  // because the hero has to keep the name, title, both meters and the signature card above
  // the fold at 390px — see ProfileHero.
  const box =
    size === 'lg' ? 'h-20 w-20 sm:h-28 sm:w-28' : size === 'sm' ? 'h-14 w-14' : 'h-9 w-9';
  const radius =
    size === 'lg' ? 'rounded-[1.4rem]' : size === 'sm' ? 'rounded-xl' : 'rounded-full';

  // Measured from the sheet, per sprite and per stage — see `contentFit`. Resolving the
  // sprite here rather than inside PlantSprite keeps that component a renderer: it takes a
  // class and a transform and knows nothing about why they were chosen.
  const fit = size === 'xs' ? contentFit(herbId ? spriteFor(herbId, stage) : null) : null;

  return (
    <span className={`relative inline-flex shrink-0 ${box}`}>
      {frame.bloom && (
        <span aria-hidden="true" className={`absolute -inset-2 z-0 ${radius} ${frame.bloom}`} />
      )}
      {frame.outer && (
        <span aria-hidden="true" className={`absolute -inset-1.5 z-0 ${radius} ${frame.outer}`} />
      )}
      <span
        className={`relative z-10 flex h-full w-full items-center justify-center overflow-hidden ${radius} ${frame.ring}`}
      >
        {herbId ? (
          <PlantSprite
            herbId={herbId}
            alt={herbName ?? 'Your chosen plant'}
            stage={stage}
            fit
            frozen={frozen}
            className={fit ? 'w-full' : 'w-[86%]'}
            style={
              fit
                ? {
                    transform: `translate(${fit.translateX.toFixed(2)}%, ${fit.translateY.toFixed(2)}%) scale(${fit.scale.toFixed(3)})`,
                  }
                : undefined
            }
          />
        ) : (
          <PlantdexIcon
            name="sprout"
            aria-hidden="true"
            className={`text-violet-400 opacity-70 ${size === 'xs' ? 'text-sm' : 'text-2xl'}`}
          />
        )}
      </span>
    </span>
  );
}
