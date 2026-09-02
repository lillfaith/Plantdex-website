import { PlantSprite } from '../PlantSprite';
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
}: {
  herbId: string | null;
  herbName?: string;
  frame: FieldFrame;
  stage?: GardenStage;
  /** `lg` is the identity banner; `sm` is a picker swatch. */
  size?: 'sm' | 'lg';
}) {
  const box =
    size === 'lg' ? 'h-24 w-24 sm:h-28 sm:w-28' : 'h-14 w-14';
  const radius = size === 'lg' ? 'rounded-[1.4rem]' : 'rounded-xl';

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
            className="w-[86%]"
          />
        ) : (
          <PlantdexIcon
            name="sprout"
            aria-hidden="true"
            className="text-2xl text-violet-400 opacity-70"
          />
        )}
      </span>
    </span>
  );
}
