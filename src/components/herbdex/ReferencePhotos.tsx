import Image from 'next/image';
import { assetPath } from '@/lib/asset-path';
import { photosFor } from '@/lib/reference-photos';
import type { Herb } from '@/lib/types';

/** Verified reference photographs with their attribution. Renders nothing when there are none. */
export function ReferencePhotos({ herb }: { herb: Herb }) {
  const photos = photosFor(herb.id);
  if (photos.length === 0) return null;

  return (
    <section aria-labelledby="reference-photos-heading">
      <h2 id="reference-photos-heading" className="font-display text-xl font-bold text-gold-plate">
        Reference photographs
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3">
        {photos.map((photo) => (
          <li key={photo.src} className="min-w-0">
            <Image
              src={assetPath(photo.src)}
              alt={photo.alt}
              width={320}
              height={240}
              loading="lazy"
              className="aspect-[4/3] w-full rounded border border-violet-700 object-cover"
            />
            <p className="mt-1 text-xs font-bold text-violet-100">{photo.shows}</p>
            <p className="text-[0.72rem] leading-snug text-violet-300">
              {photo.attribution}{' '}
              <a
                href={photo.licenceUrl}
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {photo.licence}
              </a>
              . {photo.changesNote}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
