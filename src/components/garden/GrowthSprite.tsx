import { STAGE_SCALE, type GardenStage } from '@/lib/garden';
import type { Herb } from '@/lib/types';
import { hasStageArt, spriteFor } from '@/lib/plant-sprites';
import { PlantSprite } from '../PlantSprite';

/**
 * One plant in the Garden, as its own creature at the stage the player has grown it to.
 *
 * THE GARDEN AND THE HERBDEX SHOW THE SAME CHARACTER. A player's dandelion is a shy green
 * rosette while it is only discovered, a bud once they have learned its card, and the full
 * gold lion once they have mastered it — and that is true here, on the card page, and
 * anywhere else a portrait appears, because all of them resolve through
 * `spriteFor(herbId, stage)`.
 *
 * PARTIAL BY DESIGN, AND SAFE. `spriteFor` returns a species' staged art when it exists and
 * its single adult portrait when it does not, so a species whose stages are not drawn yet
 * shows its own character rather than a placeholder — never a shared generic sprout, which
 * would make forty species interchangeable. `docs/creature-stages.md` lists which are done.
 *
 * HELD ON FRAME 0 rather than animating. A bed of a dozen plants each running its own loop
 * is noise; the card page is where a creature performs. Frame 0 is authored as a complete
 * resting pose precisely so it can be used still.
 *
 * SCALED ONLY WHEN THE ART IS NOT ALREADY STAGED. Staged art is drawn at evenly stepped
 * heights — 60%, 80%, 100% of the adult — so applying `STAGE_SCALE` on top of it compounds
 * the two and lands a sprout at a quarter size, with uneven gaps between the stages. A
 * species with no staged art has no such difference to compound and still needs the scale
 * to show any growth at all, so it keeps it.
 *
 * Sized by HEIGHT rather than width, against the frame's own aspect ratio. Every tile is a
 * fixed height and the frames are not square, so sizing by width lets a tall sprite spill
 * out of the row and over its own label.
 */
export function GrowthSprite({
  herb,
  stage,
  className = '',
}: {
  herb: Herb;
  stage: GardenStage;
  className?: string;
}) {
  const sprite = spriteFor(herb.id, stage);
  if (!sprite) return null;

  const scale = hasStageArt(herb.id, stage) ? 1 : STAGE_SCALE[stage];

  return (
    // Decorative: GardenView writes the plant's name and its stage directly underneath,
    // so announcing the picture as well would only repeat them.
    <span
      aria-hidden="true"
      className={`flex h-full w-full items-end justify-center ${className}`}
    >
      <span
        className="block"
        style={{
          height: `${scale * 100}%`,
          aspectRatio: `${sprite.frameWidth} / ${sprite.frameHeight}`,
        }}
      >
        <PlantSprite herbId={herb.id} alt="" stage={stage} frozen fit />
      </span>
    </span>
  );
}
