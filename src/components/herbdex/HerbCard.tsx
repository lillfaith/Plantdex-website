'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { Herb } from '@/lib/types';
import { assetPath } from '@/lib/asset-path';
import { MASTERY_STAGE_LABEL, type MasteryStage } from '@/lib/mastery';
import { RarityBadge } from './RarityBadge';

/** The marker shown in the corner of a discovered card, one per mastery stage. */
const STAGE_MARK: Record<MasteryStage, string> = {
  discovered: '✓',
  learned: '◆',
  mastered: '★',
};

/**
 * A single slot in the Herbdex grid.
 *
 * Discovered: the real card face, with a corner marker for its mastery stage.
 * Undiscovered: the same art rendered as a silhouette, with the literal words
 * "Not discovered" — the state is never conveyed by the visual treatment alone
 * (AGENTS.md: essential information must not depend solely on colour). The stage marker
 * follows the same rule: every marker carries its stage name in the accessible label.
 */
export function HerbCard({
  herb,
  discovered,
  stage = null,
  priority = false,
}: {
  herb: Herb;
  discovered: boolean;
  /** Mastery stage, or null while storage is still loading. */
  stage?: MasteryStage | null;
  priority?: boolean;
}) {
  const number = `#${String(herb.cardNumber).padStart(2, '0')}`;
  const stageLabel = stage ? MASTERY_STAGE_LABEL[stage] : 'Discovered';

  return (
    <Link
      href={`/herbdex/${herb.id}`}
      aria-label={
        discovered
          ? `${herb.commonName}, card ${number}, ${herb.rarity}. ${stageLabel}.`
          : `Card ${number}. Not discovered.`
      }
      className="group relative block overflow-hidden rounded-[var(--radius-card)] shadow-card transition-transform duration-200 hover:-translate-y-1 hover:shadow-card-lift focus-visible:-translate-y-1 motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-[356/576] bg-violet-900">
        <Image
          src={assetPath(herb.thumb)}
          alt={
            discovered
              ? `Plantdex card ${number}: ${herb.commonName} (${herb.scientificName})`
              : ''
          }
          aria-hidden={!discovered}
          fill
          sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw"
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          className={
            discovered
              ? 'object-cover'
              : // Blur destroys the printed name and stats while the plant's shape
                // survives as a silhouette worth chasing. Darkening alone could not do
                // both: light enough to see the shape was light enough to read the name.
                // scale-105 hides the soft edge the blur leaves at the card border.
                'scale-105 object-cover blur-[3.5px] brightness-[0.62] saturate-0 contrast-[1.05]'
          }
        />

        {!discovered && (
          <div className="absolute inset-0 flex flex-col items-center justify-end gap-1 bg-gradient-to-t from-violet-deep/95 via-violet-deep/45 to-violet-deep/25 p-2 pb-3 text-center">
            <span aria-hidden="true" className="text-xl leading-none text-violet-300/80">
              ?
            </span>
            <span className="text-[0.62rem] leading-tight font-bold tracking-wide text-violet-200 uppercase">
              Not discovered
            </span>
          </div>
        )}

        <span className="absolute top-1.5 left-1.5 rounded-md bg-violet-deep/75 px-1.5 py-0.5 text-[0.6rem] font-bold text-gold-400 tabular-nums">
          {number}
        </span>

        {discovered && (
          <span
            className={`absolute top-1.5 right-1.5 rounded-full px-1.5 py-0.5 text-[0.6rem] font-bold ${
              stage === 'mastered'
                ? 'bg-gold-500 text-violet-deep'
                : 'bg-violet-deep/80 text-gold-400'
            }`}
          >
            <span aria-hidden="true">{STAGE_MARK[stage ?? 'discovered']}</span>
            <span className="sr-only">{stageLabel}</span>
          </span>
        )}
      </div>

      <div className="space-y-1 bg-violet-900/80 px-2 py-2">
        <p
          className={`truncate text-xs font-bold ${
            discovered ? 'text-violet-100' : 'text-violet-400'
          }`}
        >
          {discovered ? herb.commonName : '???'}
        </p>
        {discovered ? (
          <RarityBadge rarity={herb.rarity} />
        ) : (
          <span className="text-[0.62rem] text-violet-400">Find it to reveal</span>
        )}
      </div>
    </Link>
  );
}
