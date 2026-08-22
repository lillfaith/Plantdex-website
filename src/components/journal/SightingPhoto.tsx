'use client';

import { useEffect, useState } from 'react';

/**
 * Renders a photo held in IndexedDB.
 *
 * Object URLs pin their blob in memory until revoked, so the effect revokes on unmount
 * and whenever the id changes. A stale-response guard stops a slow load from overwriting
 * a newer one if the component is reused for a different sighting.
 */
export function SightingPhoto({ photoId, alt }: { photoId: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let created: string | null = null;

    import('@/lib/photo-store').then(async ({ getPhotoUrl }) => {
      const next = await getPhotoUrl(photoId);
      if (!active) {
        if (next) URL.revokeObjectURL(next);
        return;
      }
      created = next;
      setUrl(next);
    });

    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [photoId]);

  if (!url) {
    return <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-violet-900/60" />;
  }

  // eslint-disable-next-line @next/next/no-img-element -- blob: URL from IndexedDB; next/image cannot optimise it.
  return <img src={url} alt={alt} className="w-full rounded-lg object-cover" />;
}
