import type { ReactNode } from 'react';
import type { Herb } from '@/lib/types';
import { assetPath } from '@/lib/asset-path';
import {
  PART_ART,
  PREP_ART,
  artFor,
  gemFor,
  glyphForTrait,
  illustration,
  traitBadge,
} from '@/lib/pixel-icons';

/**
 * The Herbalism tab's visual layer: pixel-art icons, gems and illustrations that borrow the
 * card's purple, gold and pixel borders without copying its layout. Every graphic here is
 * decorative and `aria-hidden`; the printed word beside it carries the meaning.
 */

export function PixelIcon({ uri, size = 40 }: { uri: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 [image-rendering:pixelated]"
      style={{
        width: size,
        height: size,
        backgroundImage: uri,
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
}

/**
 * The photograph from the front of the printed card, in its frame. The card art is a full
 * 800x1295 print, so the photo window is cropped out with a positioned image and never
 * stretched: width and offsets are percentages of one source rectangle, so the aspect ratio
 * is fixed by construction.
 */
const WINDOW = { x: 50, y: 150, w: 690, h: 440, sheetW: 800 };
export function HerbalPanel({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="herbal-panel">
      <h2 id={id} className="panel-pill">
        <PixelIcon uri={illustration(icon)} size={22} />
        {title}
      </h2>
      {children}
    </section>
  );
}

export function HerbalHero({ herb }: { herb: Herb }) {
  const scale = (WINDOW.sheetW / WINDOW.w) * 100;
  return (
    <figure
      className="herbal-hero relative overflow-hidden"
      style={{ aspectRatio: `${WINDOW.w} / ${WINDOW.h}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={assetPath(herb.image)}
        alt={`Photograph of ${herb.commonName} from the front of its card`}
        draggable={false}
        className="absolute max-w-none"
        style={{
          width: `${scale}%`,
          left: `${-(WINDOW.x / WINDOW.w) * 100}%`,
          top: `${-(WINDOW.y / WINDOW.h) * 100}%`,
        }}
      />
      <figcaption className="absolute top-2 left-2 rounded-sm bg-plum-900/80 px-2 py-0.5 text-[0.72rem] font-extrabold tracking-[0.08em] text-gold-200 uppercase shadow-[0_0_0_2px_#b8841f]">
        Botanical record #{String(herb.cardNumber).padStart(3, '0')}
      </figcaption>
    </figure>
  );
}

export function TraitList({
  traits,
  render,
}: {
  traits: readonly string[];
  render: (t: string) => ReactNode;
}) {
  return (
    <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
      {traits.map((trait) => (
        <li key={trait} className="pixel-tile flex items-center gap-2 px-2 py-1.5">
          <PixelIcon uri={traitBadge(glyphForTrait(trait))} size={28} />
          <span className="text-sm leading-tight font-bold text-violet-50">{render(trait)}</span>
        </li>
      ))}
    </ul>
  );
}

export function GemChip({ name }: { name: string }) {
  return (
    <span className="pixel-tile inline-flex items-center gap-2 px-2.5 py-1.5 text-sm font-bold text-violet-50">
      <PixelIcon uri={gemFor(name)} size={24} />
      {name}
    </span>
  );
}

export type ArtKind = 'part' | 'prep' | 'taste' | 'aroma';
export function artName(kind: ArtKind, word: string) {
  if (kind === 'part') return artFor(PART_ART, word);
  if (kind === 'prep') return artFor(PREP_ART, word);
  return kind;
}

/** A small illustrated tile: pixel-art picture over the card's own word. */
export function ArtTile({
  kind,
  word,
  children,
}: {
  kind: ArtKind;
  word: string;
  children?: ReactNode;
}) {
  return (
    <div className="pixel-tile flex flex-col items-center gap-1 px-1.5 py-2 text-center">
      <PixelIcon uri={illustration(artName(kind, word))} size={32} />
      <span className="text-sm leading-tight font-bold text-violet-50">{children ?? word}</span>
    </div>
  );
}
