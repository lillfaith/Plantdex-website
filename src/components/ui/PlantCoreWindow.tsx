'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Pixelify_Sans } from 'next/font/google';
import { PlantSprite } from '../PlantSprite';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';
import { getPrintedCard } from '@/lib/deck';
import { STAGE_LABEL, nextStageHint, MASTERY_BY_GARDEN_STAGE, type GardenStage } from '@/lib/garden';
import { MASTERY_STAGE_LABEL } from '@/lib/mastery';

/**
 * PROTOTYPE (owner review only): a retro "window" for one plant, adapted from the owner's plant_core.exe reference. Lavender (#C5B2DC) pixel frame, pink buttons,
 * a segmented side meter, a sprite stage with sparkles, a name bar with previous/next, and a close button.
 *
 * IT INVENTS NO MECHANIC. Everything shown is read from existing data: the growth stage (from mastery, via `garden.ts`), the mastery word, the
 * existing next-step hint, and links that already exist (the card page, the scanner). The side meter is the THREE existing stages and nothing else:
 * it does not fill, drain or tick, there is no water, no health, no daily care and nothing is recorded. Previous/next only move between plants the
 * player already has.
 *
 * `variant="garden"` is the plant-care placement (growth first); `variant="quick"` is the compact card quick-view (status and a way to the card).
 */
/** A readable bitmap-style face for the short labels only (never paragraphs): the window is meant to look like a small vintage program. */
const pixel = Pixelify_Sans({ subsets: ['latin'], weight: ['500', '700'], display: 'swap' });

export interface PlantCorePlant {
  herbId: string;
  stage: GardenStage;
}

const STAGES: GardenStage[] = ['sprout', 'growing', 'flowering'];

export function PlantCoreWindow({
  plants,
  startIndex = 0,
  variant,
  onClose,
}: {
  plants: PlantCorePlant[];
  startIndex?: number;
  variant: 'garden' | 'quick';
  onClose?: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const current = plants[index];
  const herb = current ? getPrintedCard(current.herbId) : undefined;
  if (!current || !herb) return null;
  const stageIdx = STAGES.indexOf(current.stage);
  const hint = nextStageHint(current.stage);
  const mastery = MASTERY_STAGE_LABEL[MASTERY_BY_GARDEN_STAGE[current.stage]];
  const step = (d: number) => setIndex((i) => (i + d + plants.length) % plants.length);

  const action = (href: string, label: string, icon: IconName, tone: 'blush' | 'lav' | 'violet') => (
    <Link href={href} className={`pc-btn pc-${tone} flex min-h-10 items-center justify-center gap-1.5 px-1.5 text-[0.78rem] font-bold`}>
      <PlantdexIcon name={icon} className="text-base" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );

  return (
    <div role="dialog" aria-label={`${herb.commonName}, plant window`} className={`pc-window ${pixel.className} mx-auto w-full max-w-[22rem]`}>
      <div className="pc-titlebar flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="pc-appicon" />
          <span className="pc-title">plantdex.exe</span>
        </span>
        <button type="button" onClick={onClose} aria-label="Close window" className="pc-x">
          <span aria-hidden="true" className="pc-x-glyph" />
        </button>
      </div>

      <div className="mt-1.5 grid grid-cols-[3.8rem_1fr_7.3rem] gap-2">
        {/* The three existing growth stages, as a segmented meter. Display only. */}
        <div role="img" aria-label={`Growth stage ${stageIdx + 1} of 3: ${STAGE_LABEL[current.stage]}`} className="pc-meter flex flex-col-reverse gap-[2px] p-[2px]">
          {STAGES.map((s, i) => (
            <span key={s} className={`pc-seg flex flex-1 items-center justify-center ${i <= stageIdx ? 'pc-seg-on' : ''}`}>
              <span className="flex flex-col items-center gap-0.5 leading-none">
                <PlantdexIcon name={s === 'sprout' ? 'sprout' : s === 'growing' ? 'leaves' : 'flower'} className="text-lg" aria-hidden="true" />
                <span className="text-[0.72rem] font-medium">{STAGE_LABEL[s]}</span>
              </span>
            </span>
          ))}
        </div>

        <div className="flex flex-col">
          <div className="pc-stage relative aspect-[3/4] overflow-hidden">
            <span aria-hidden="true" className="pc-floor" />
            <span className="pc-sprite absolute inset-x-[-6%] bottom-[14%] block">
              <PlantSprite herbId={herb.id} alt={herb.commonName} stage={current.stage} fit className="w-full" />
            </span>
          </div>
          <div className="pc-namebar mt-1.5 grid grid-cols-[1.75rem_1fr_1.75rem] items-stretch gap-[2px]">
            <button type="button" onClick={() => step(-1)} aria-label="Previous plant" className="pc-btn pc-cream pc-arrow tap-44" disabled={plants.length < 2}>
              <span aria-hidden="true" className="pc-tri pc-tri-l" />
            </button>
            <span className="pc-field truncate px-1 text-center text-[0.8rem] leading-9 font-bold">{herb.commonName}</span>
            <button type="button" onClick={() => step(1)} aria-label="Next plant" className="pc-btn pc-cream pc-arrow tap-44" disabled={plants.length < 2}>
              <span aria-hidden="true" className="pc-tri pc-tri-r" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="pc-plaque flex min-h-12 flex-col items-center justify-center px-1 text-center leading-tight">
            <span className="text-[0.85rem] font-bold">{STAGE_LABEL[current.stage]}</span>
            <span className="text-[0.75rem] font-medium">{mastery}</span>
          </div>
          {variant === 'garden' ? (
            <>
              {action(`/herbdex/${herb.id}`, hint === 'Learn its card' ? 'Learn card' : (hint ?? 'Open card'), hint ? 'learn' : 'herbdex', 'blush')}
              {action('/scan', 'Scan a plant', 'scan', 'lav')}
              <Link href={`/herbdex/${herb.id}`} className="pc-btn pc-violet flex min-h-10 items-center justify-center gap-1.5 px-1.5 text-[0.78rem] font-bold">
                <PlantdexIcon name="herbdex" className="text-base" aria-hidden="true" />
                <span>Full card</span>
              </Link>
            </>
          ) : (
            <>
              <p className="pc-note px-1 text-[0.75rem] leading-snug">{hint ? `Next: ${hint.toLowerCase()}.` : 'Fully grown.'}</p>
              <Link href={`/herbdex/${herb.id}`} className="pc-btn pc-violet flex min-h-10 items-center justify-center gap-1.5 px-1.5 text-[0.78rem] font-bold">
                <PlantdexIcon name="herbdex" className="text-base" aria-hidden="true" />
                <span>Open card</span>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-2 flex justify-center">
        <button type="button" onClick={onClose} className="pc-btn pc-blush tap-44 min-h-8 px-9 text-[0.85rem] font-medium">
          Close
        </button>
      </div>
    </div>
  );
}
