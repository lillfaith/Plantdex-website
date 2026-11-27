import { PlantSprite } from '../PlantSprite';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { assetPath } from '@/lib/asset-path';
import { getPrintedCard } from '@/lib/deck';

/**
 * FIND -> SCAN -> UNLOCK -> COLLECT, in four small pixel scenes across the whole width.
 *
 * It replaces a paragraph and must say the same true thing: an in-app CAMERA photograph of a plant Plantdex has a card for can unlock that card; a photograph
 * imported from the library only identifies. The caption states the second half in words, because the animation alone shows only the happy path. It
 * records nothing, reads no state and awards nothing: the sprite and the card are the deck's own (Dandelion), shown as an example and not as a claim about
 * what this player has found.
 *
 * MOTION: the four steps take turns being lit on one 8s loop (CSS in globals.css, `.cf-*`); the card art is revealed in step three and a "+1" pops on
 * step four. Under `prefers-reduced-motion` every animation is off and each scene shows its finished state, so the static version is the whole explanation.
 */
const EXAMPLE = 'taraxacum-officinale';

const STEPS: { label: string; hint: string }[] = [
  { label: 'Find', hint: 'a plant outdoors' },
  { label: 'Scan', hint: 'with the camera' },
  { label: 'Unlock', hint: 'its card' },
  { label: 'Collect', hint: 'it' },
];

export function CollectFlow() {
  const herb = getPrintedCard(EXAMPLE);
  if (!herb) return null;
  const cardArt = assetPath(herb.thumb);
  return (
    <section aria-label="How collecting works" className="cf mx-auto mt-4 w-full max-w-md" data-ui-placeholder="collect-flow">
      <ol className="cf-strip grid grid-cols-4 gap-2">
        {STEPS.map((step, i) => (
          <li key={step.label} className={`cf-step cf-step-${i + 1} relative flex flex-col items-center`}>
            <span className="cf-scene relative block aspect-square w-full overflow-hidden rounded-xl">
              {i < 2 && (
                <>
                  <span aria-hidden="true" className="cf-meadow absolute inset-0" />
                  <span className="absolute inset-x-[12%] bottom-[10%] block">
                    <PlantSprite herbId={herb.id} alt="" stage="flowering" fit className="w-full" />
                  </span>
                </>
              )}
              {i === 1 && (
                <>
                  <span aria-hidden="true" className="cf-brackets absolute inset-[9%]" />
                  <span aria-hidden="true" className="cf-flash absolute inset-0" />
                  <PlantdexIcon name="scan" aria-hidden="true" className="absolute top-1 right-1 text-sm text-violet-deep" />
                </>
              )}
              {i === 2 && (
                <>
                  <span aria-hidden="true" className="cf-scene-card absolute inset-0" />
                  <span className="cf-card absolute inset-x-[20%] top-[8%] bottom-[8%] block overflow-hidden rounded-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cardArt} alt="" className="h-full w-full object-cover" />
                  </span>
                </>
              )}
              {i === 3 && (
                <>
                  <span aria-hidden="true" className="cf-scene-card absolute inset-0" />
                  <span className="cf-stack absolute inset-x-[18%] top-[20%] bottom-[10%] block">
                    <span className="cf-stack-back absolute inset-0 rounded-md" />
                    <span className="cf-stack-mid absolute inset-0 rounded-md" />
                    <span className="cf-stack-top absolute inset-0 block overflow-hidden rounded-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cardArt} alt="" className="h-full w-full object-cover" />
                    </span>
                  </span>
                  <span aria-hidden="true" className="cf-plus absolute top-1 right-1.5 text-xs font-extrabold">
                    +1
                  </span>
                </>
              )}
            </span>
            <span className="cf-label mt-1.5 text-center text-[0.8rem] leading-tight font-extrabold">{step.label}</span>
            <span className="cf-hint text-center text-[0.72rem] leading-tight">{step.hint}</span>
            {i < STEPS.length - 1 && (
              <span aria-hidden="true" className="cf-arrow absolute top-[32%] -right-[0.7rem] z-10 text-sm font-black">
                &#9656;
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="cf-rule mt-2 text-center text-xs leading-snug font-semibold">
        A photo from the in-app camera can unlock a card. A photo from your library only identifies a plant.
      </p>
    </section>
  );
}
