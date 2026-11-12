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
 * THE GARDEN IS THE ONE PAGE WHERE EVERY CREATURE PERFORMS AT ONCE, AND THIS USED TO SAY THE
 * OPPOSITE. It held frame 0, arguing that "a bed of a dozen plants each running its own loop
 * is noise; the card page is where a creature performs". That is a defensible reading of a
 * grid — and it is the wrong one for THIS grid, which is not a catalogue. The Garden exists
 * so a player can look at the collection they have grown; a bed of still pictures is a
 * shelf, and the sprites are the whole reason to open the page. Reversed deliberately, and
 * the old argument is kept here rather than deleted so nobody re-derives it from scratch.
 *
 * IT COSTS MEMORY, AND THE NUMBER IS MEASURED RATHER THAN GUESSED. `frozen` loads a single
 * `still` frame; animating takes the whole sheet, and the browser holds the entire decoded
 * bitmap however little of it is on screen. Measured across the manifest: a mean of 1.30 MB
 * decoded per sheet, 2.2 MB for the largest (dandelion). A garden holding all 45 printed
 * species at adult stage is therefore about 58 MB resident — the upper bound, since sprout
 * and growing sheets are smaller. That is real but affordable; if it ever bites on a phone,
 * the fix is to animate only the tiles in view rather than to go back to stills.
 *
 * REDUCED MOTION NEEDS NOTHING HERE. The `prefers-reduced-motion` block in globals.css
 * already stops `.plant-sprite` and `.plant-sprite-fit`, so a player who asked for less
 * motion still gets frame 0 — which is exactly why frame 0 is authored as a complete resting
 * pose. Do not add a second guard in this component; one rule in one place.
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
  advanced = false,
  className = '',
}: {
  herb: Herb;
  stage: GardenStage;
  /** This plant grew since the Garden last showed it — play the moment once. */
  advanced?: boolean;
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
      {/*
        GATED ON `advanced`, AND THE PREVIOUS VERSION OF THIS COMMENT WAS WRONG.

        It said `stage-grow` "plays exactly once, at the moment the plant actually grows — and
        never on an ordinary re-render of a plant that has not moved". True about re-renders,
        and beside the point: nobody re-renders the Garden, they NAVIGATE to it, and a
        navigation is a mount. The class was unconditional, so every plant crossfaded on every
        visit and the one event worth marking was hidden inside a page transition.

        `advanced` comes from `garden-moments.ts`, which knows what this session last SHOWED
        the player — the only thing that can tell a real advance from an arrival. Still keyed
        on the stage so a change mounts a fresh element and the animation restarts cleanly.

        Two one-shot effects together, both already in the vocabulary: `stage-grow` crossfades
        the new drawing in, `node-earned` gives the single scale pop the mastery track already
        uses to mean "you just earned this". Neither loops, and both are listed in the
        reduced-motion block.
      */}
      <span
        key={stage}
        className={`block ${advanced ? 'stage-grow node-earned' : ''}`.trim()}
        style={{
          height: `${scale * 100}%`,
          aspectRatio: `${sprite.frameWidth} / ${sprite.frameHeight}`,
        }}
      >
        <PlantSprite herbId={herb.id} alt="" stage={stage} fit />
      </span>
    </span>
  );
}
