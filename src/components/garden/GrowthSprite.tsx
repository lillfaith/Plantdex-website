import Image from 'next/image';
import { gardenSpriteFor, stageFrame } from '@/lib/garden-sprites';
import { assetPath } from '@/lib/asset-path';
import { STAGE_SCALE, type GardenStage } from '@/lib/garden';
import type { Herb } from '@/lib/types';

/**
 * One plant in the Garden, at the stage the player has grown it to.
 *
 * TWO PATHS, AND ONLY THE FIRST IS REAL GROWTH. A species with authored growth art gets its
 * own three-stage sequence — a dandelion's first toothed leaves, its rosette, then the
 * rosette in flower. A species without gets its creature portrait, held still and scaled by
 * stage: the same plant three sizes, which is honestly a placeholder for growth rather than
 * a depiction of it. Growth art is authored one species at a time, and
 * `docs/garden-sprites.md` names exactly which are still waiting.
 *
 * THE FALLBACK IS THE PREVIOUS BEHAVIOUR, UNCHANGED, and that is the point: shipping growth
 * art for five species must not make the other forty look worse than they did yesterday.
 * It is a crop of the printed card, so it carries the card's purple background baked in and
 * sits beside a transparent growth sprite like a sticker on the bed. That is ugly and it is
 * still the right fallback — the two alternatives are worse. A shared generic sprout would
 * make forty species identical, which is the exact failure this system was built to end;
 * and the animated portrait, though transparent, is a CREATURE with a face, which the
 * Garden's whole brief rules out. Ugly-but-honest beats wrong.
 *
 * THE SHEET IS WALKED, NOT CROPPED. All three stages live in one image and the stage is a
 * `background-position` step. One request per species however many stages it has, and moving
 * between stages costs nothing.
 *
 * `background-size` is a PERCENTAGE, so the sprite scales with whatever box it is given: the
 * same asset works in today's small Garden tile and, later, at any size in a larger Garden
 * scene.
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
  const sprite = gardenSpriteFor(herb.id);

  if (!sprite) {
    return (
      <Image
        src={assetPath(herb.sprite)}
        alt=""
        aria-hidden="true"
        width={276}
        height={276}
        style={{ width: `${STAGE_SCALE[stage] * 100}%` }}
        className={`max-h-20 origin-bottom object-contain transition-all duration-700 ease-out motion-reduce:transition-none ${
          stage === 'sprout'
            ? 'opacity-70 saturate-[0.7]'
            : stage === 'growing'
              ? 'opacity-90'
              : 'drop-shadow-[0_0_10px_rgba(240,193,90,0.45)]'
        } ${className}`}
      />
    );
  }

  const frame = stageFrame(stage);
  const count = sprite.stages.length;

  return (
    <span
      aria-hidden="true"
      className={`garden-sprite block h-full w-full ${
        // The one animation, and only on the last stage: a mature plant breathes, a
        // seedling holds still. Restraint is the point — if everything sways, nothing
        // reads as alive.
        stage === 'flowering' ? 'garden-sprite-sway' : ''
      } ${className}`}
      style={{
        backgroundImage: `url(${assetPath(sprite.src)})`,
        // `count × 100%` puts exactly one stage in view; the frame slides the sheet.
        backgroundSize: `${count * 100}% 100%`,
        backgroundPosition: `${(frame / (count - 1)) * 100}% 0`,
      }}
    />
  );
}
