import Image from 'next/image';
import { assetPath } from '@/lib/asset-path';
import { photosFor, referencePreview } from '@/lib/reference-photos';
import { comparisonFor } from '@/lib/reference-comparisons';
import type { Herb } from '@/lib/types';

/**
 * REAL PHOTOGRAPHS, SHOWN AS THEY ARE. Identification photos are never pixelated, filtered or
 * stylised: they sit on the field-guide page as mounted prints, because the detail in them is
 * the point. Both blocks render nothing unless a photograph or comparison is reviewed (or the
 * development-only preview is on, in which case each is marked as a draft).
 */

function Draft() {
  return (
    <span className="rounded border border-dashed border-gold-500 px-1.5 py-0.5 text-[0.72rem] font-bold tracking-wide text-gold-400 uppercase">
      Draft &middot; unreviewed
    </span>
  );
}

function Print({ src, alt, size = 'md' }: { src: string; alt: string; size?: 'md' | 'sm' }) {
  return (
    <span className="block bg-white p-1.5 shadow-[2px_2px_0_rgba(59,38,22,0.35)]">
      <Image
        src={assetPath(src)}
        alt={alt}
        width={320}
        height={240}
        loading="lazy"
        className={`w-full object-cover ${size === 'sm' ? 'aspect-square' : 'aspect-[4/3]'}`}
      />
    </span>
  );
}

export function ReferencePhotos({ herb }: { herb: Herb }) {
  const photos = photosFor(herb.id).filter((photo) => photo.kind === 'plant');
  if (photos.length === 0) return null;
  const preview = referencePreview();

  return (
    <section aria-labelledby="reference-photos-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="reference-photos-heading" className="font-display text-xl font-bold text-gold-plate">
          Reference photographs
        </h2>
        {preview && <Draft />}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <li key={photo.src} className="min-w-0">
            <Print src={photo.src} alt={photo.alt} />
            <p className="mt-1.5 text-xs font-bold text-violet-100">{photo.shows}</p>
            <p className="text-[0.72rem] leading-snug text-violet-300">
              {photo.author} &middot;{' '}
              <a href={photo.licenceUrl} rel="noreferrer" className="underline underline-offset-2">
                {photo.licence}
              </a>
            </p>
          </li>
        ))}
      </ul>
      {/* The full attribution each licence requires, one tap away rather than under every photo. */}
      <details className="mt-3 rounded-lg border border-violet-700/70 bg-plum-800/40 px-3 py-1">
        <summary className="min-h-11 cursor-pointer py-2.5 text-xs font-bold text-violet-200">
          Photo credits and licences
        </summary>
        <ul className="space-y-2 pb-3">
          {photosFor(herb.id).map((photo) => (
            <li key={photo.src} className="text-[0.72rem] leading-snug text-violet-300">
              {photo.attribution}
              <br />
              {photo.changesNote}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export function LookalikeCompare({ herb }: { herb: Herb }) {
  const comparison = comparisonFor(herb.id);
  if (!comparison) return null;
  const preview = referencePreview();
  const photoFor = (src: string) =>
    photosFor(herb.id).find((photo) => photo.src === src);

  return (
    <section aria-labelledby="compare-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="compare-heading" className="font-display text-xl font-bold text-gold-plate">
          Compare: {herb.commonName} and {comparison.lookalikeName}
        </h2>
        {preview && <Draft />}
      </div>
      <p className="mt-1 text-xs text-violet-300">
        <span className="font-botanical italic">{comparison.lookalikeScientific}</span> is commonly
        mistaken for {herb.commonName}. These differences illustrate; they do not make an
        identification safe.
      </p>
      <div className="mt-3 space-y-5">
        {comparison.rows.map((row) => (
          <div key={row.trait}>
            <h3 className="text-[0.72rem] font-extrabold tracking-[0.12em] text-gold-400 uppercase">
              {row.trait}
            </h3>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              {[
                { name: herb.commonName, text: row.plant, src: row.plantPhoto },
                { name: comparison.lookalikeName, text: row.lookalike, src: row.lookalikePhoto },
              ].map((side) => {
                const photo = photoFor(side.src);
                return (
                  <figure key={side.name} className="min-w-0">
                    {photo && <Print src={photo.src} alt={photo.alt} size="sm" />}
                    <figcaption className="mt-1.5">
                      <span className="block text-xs font-bold text-violet-100">{side.name}</span>
                      <span className="block text-xs leading-snug text-violet-200">{side.text}</span>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
            <p className="mt-1.5 text-[0.72rem] leading-snug text-violet-300">
              Sources:{' '}
              {row.cites.map((cite, index) => (
                <span key={cite.url}>
                  {index > 0 && '; '}
                  <a href={cite.url} rel="noreferrer" className="underline underline-offset-2">
                    {cite.label}
                  </a>
                </span>
              ))}
              .
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
