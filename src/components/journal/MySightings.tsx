'use client';

import { useCallback, useRef, useState } from 'react';
import type { Herb } from '@/lib/types';
import {
  addSighting,
  GROWTH_STAGE_LABEL,
  GROWTH_STAGES,
  removeSighting,
  useSightings,
  type GrowthStage,
} from '@/lib/sightings';
import { SightingPhoto } from './SightingPhoto';

/**
 * "My Sightings" — a running field record for one species.
 *
 * A sighting is not a discovery: logging one awards no XP and changes no collection
 * state. The point is to let someone build their own field guide over time, seeing the
 * same patch change across a season.
 */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  // Parse as local rather than UTC so a date never displays as the previous day.
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function MySightings({ herb }: { herb: Herb }) {
  const sightings = useSightings(herb.id);
  const formRef = useRef<HTMLDialogElement>(null);

  const [date, setDate] = useState(todayIso);
  const [region, setRegion] = useState('');
  const [notes, setNotes] = useState('');
  const [growthStage, setGrowthStage] = useState<GrowthStage | ''>('');
  const [foundAgain, setFoundAgain] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setDate(todayIso());
    setRegion('');
    setNotes('');
    setGrowthStage('');
    setFoundAgain(false);
    setPhoto(null);
  }, []);

  const onSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setSaving(true);
      let photoId: string | undefined;
      try {
        if (photo) {
          const { savePhoto } = await import('@/lib/photo-store');
          photoId = await savePhoto(photo);
        }
      } catch {
        // Losing the photo must not lose the note the player just wrote — save without it.
        photoId = undefined;
      }
      addSighting({
        herbId: herb.id,
        date,
        region: region.trim() || undefined,
        notes: notes.trim() || undefined,
        growthStage: growthStage || undefined,
        foundAgain: foundAgain || undefined,
        photoId,
      });
      setSaving(false);
      formRef.current?.close();
      reset();
    },
    [herb.id, date, region, notes, growthStage, foundAgain, photo, reset],
  );

  return (
    <section aria-labelledby="sightings-heading" className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="sightings-heading"
          className="text-sm font-bold tracking-wide text-gold-400 uppercase"
        >
          My sightings
        </h2>
        <button
          type="button"
          onClick={() => formRef.current?.showModal()}
          className="min-h-10 rounded-full border border-gold-500/60 bg-gold-500/15 px-4 text-xs font-bold text-gold-300 hover:bg-gold-500/25"
        >
          + Add a sighting
        </button>
      </div>

      {sightings.length === 0 ? (
        <p className="mt-3 text-sm text-violet-300">
          No sightings yet. Log each time you come across {herb.commonName}.
        </p>
      ) : (
        <ol className="mt-4 space-y-4">
          {sightings.map((sighting) => (
            <li key={sighting.id} className="border-l-2 border-violet-600 pl-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-bold text-violet-100">
                  <time dateTime={sighting.date}>{formatDate(sighting.date)}</time>
                  {sighting.foundAgain && (
                    <span className="ml-2 rounded-full bg-violet-800 px-2 py-0.5 text-[0.62rem] font-semibold tracking-wide text-violet-200 uppercase">
                      Found again
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => void removeSighting(sighting.id)}
                  className="text-xs text-violet-400 underline underline-offset-2 hover:text-stat-temp"
                >
                  Delete
                </button>
              </div>
              {sighting.region && <p className="text-xs text-violet-300">{sighting.region}</p>}
              {sighting.growthStage && (
                <p className="mt-1 inline-block rounded-full border border-violet-600 px-2 py-0.5 text-[0.65rem] font-semibold text-violet-200">
                  {GROWTH_STAGE_LABEL[sighting.growthStage]}
                </p>
              )}
              {sighting.photoId && (
                <div className="mt-2 max-w-xs">
                  <SightingPhoto
                    photoId={sighting.photoId}
                    alt={`Photo of ${herb.commonName} taken on ${formatDate(sighting.date)}`}
                  />
                </div>
              )}
              {sighting.notes && (
                <p className="mt-2 text-sm leading-relaxed text-violet-200">{sighting.notes}</p>
              )}
            </li>
          ))}
        </ol>
      )}

      <dialog
        ref={formRef}
        aria-labelledby="sighting-form-title"
        className="panel m-auto max-h-[90dvh] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto p-5 text-violet-100 backdrop:bg-violet-deep/85 backdrop:backdrop-blur-sm"
      >
        <h2 id="sighting-form-title" className="font-display text-lg font-bold text-gold-plate">
          Log a sighting of {herb.commonName}
        </h2>
        <p className="mt-1 text-xs text-violet-400">
          This is a personal note. It stays on this device and does not change your
          collection or XP.
        </p>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-violet-200">Date</span>
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 min-h-11 w-full rounded-lg border border-violet-600 bg-violet-900/60 px-3 text-sm text-violet-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-violet-200">Region (optional)</span>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. North Georgia"
              maxLength={80}
              className="mt-1 min-h-11 w-full rounded-lg border border-violet-600 bg-violet-900/60 px-3 text-sm text-violet-100 placeholder:text-violet-500"
            />
            <span className="mt-1 block text-[0.68rem] leading-relaxed text-violet-400">
              Keep it general. Please don&apos;t record exact spots for wild plants — precise
              locations are how patches get stripped.
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-violet-200">Growth stage (optional)</span>
            <select
              value={growthStage}
              onChange={(e) => setGrowthStage(e.target.value as GrowthStage | '')}
              className="mt-1 min-h-11 w-full rounded-lg border border-violet-600 bg-violet-900/60 px-3 text-sm text-violet-100"
            >
              <option value="">Not recorded</option>
              {GROWTH_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {GROWTH_STAGE_LABEL[stage]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-violet-200">Photo (optional)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-xs text-violet-300 file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-violet-700 file:px-4 file:text-xs file:font-semibold file:text-violet-100"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-violet-200">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Growing along the sunny edge of a field. Several plants flowering."
              className="mt-1 w-full rounded-lg border border-violet-600 bg-violet-900/60 p-3 text-sm text-violet-100 placeholder:text-violet-500"
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={foundAgain}
              onChange={(e) => setFoundAgain(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-xs text-violet-200">
              I&apos;ve returned to a patch I saw before
            </span>
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                formRef.current?.close();
                reset();
              }}
              className="min-h-11 rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-violet-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-11 rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save sighting'}
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
