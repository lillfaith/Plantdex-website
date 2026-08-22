'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

/**
 * Renders a sighting photo, from IndexedDB (signed out) or the private `sighting-photos`
 * Supabase Storage bucket (signed in) — see `src/lib/remote-sightings.ts`.
 *
 * A remote `photoId` is a storage path (`{userId}/{sightingId}.<ext>`, always containing a
 * `/`); a local one is generated as `photo_<timestamp>_<random>` and never contains one —
 * that's enough to tell the two apart without threading auth state through this component.
 *
 * Object URLs pin their blob in memory until revoked, so the effect revokes on unmount
 * and whenever the id changes. A stale-response guard stops a slow load from overwriting
 * a newer one if the component is reused for a different sighting.
 */
export function SightingPhoto({ photoId, alt }: { photoId: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const isRemote = photoId.includes('/');

  useEffect(() => {
    let active = true;
    let created: string | null = null;

    async function resolve(): Promise<string | null> {
      if (isRemote) {
        if (!supabase) return null;
        const { data } = await supabase.storage
          .from('sighting-photos')
          .createSignedUrl(photoId, 60 * 60);
        return data?.signedUrl ?? null;
      }
      const { getPhotoUrl } = await import('@/lib/photo-store');
      const objectUrl = await getPhotoUrl(photoId);
      created = objectUrl;
      return objectUrl;
    }

    resolve().then((next) => {
      if (!active) {
        if (created) URL.revokeObjectURL(created);
        return;
      }
      setUrl(next);
    });

    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [photoId, isRemote]);

  if (!url) {
    return <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-violet-900/60" />;
  }

  // eslint-disable-next-line @next/next/no-img-element -- blob:/signed URL; next/image cannot optimise either.
  return <img src={url} alt={alt} className="w-full rounded-lg object-cover" />;
}
