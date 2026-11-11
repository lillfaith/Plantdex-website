'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import { FIELD_LOG_TRIGGER_ID } from '@/lib/grow-track';
import type { Herb } from '@/lib/types';
import { GROWTH_STAGE_LABEL, GROWTH_STAGES, type GrowthStage } from '@/lib/sightings';
import {
  MIN_QUALIFYING_NOTE,
  awardForEntry,
  paidJournalSpecies,
  scoreFromRecords,
} from '@/lib/leaderboard';
import { localDateKey } from '@/lib/research';
import { useSightingsStore } from '@/lib/sightings-store';
import { useAuth } from '@/state/AuthProvider';
import { useHerbdex } from '@/state/HerbdexProvider';
import { SightingPhoto } from './SightingPhoto';
import { PhotoField } from './PhotoField';

/**
 * "My Sightings" — a running field record for one species.
 *
 * A sighting is not a discovery: logging one awards no XP and changes no collection
 * state. The point is to let someone build their own field guide over time, seeing the
 * same patch change across a season.
 */

/**
 * Today, WHERE THE PLAYER IS.
 *
 * This used to be `new Date().toISOString().slice(0, 10)`, which is today in UTC — and the
 * two are different for most of the world for several hours a day. West of UTC an evening
 * find pre-filled TOMORROW's date and the `max` below happily accepted it; east of UTC,
 * between local midnight and UTC midnight, both were YESTERDAY, so a player could not
 * select today at all: the picker refused the only date they wanted.
 *
 * `formatDate` immediately below has always parsed these strings as local "so a date never
 * displays as the previous day" — this is the other half of that same rule, and
 * `localDateKey` is the app's one implementation of it.
 */
function todayIso(): string {
  return localDateKey();
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

/**
 * What the save panel reports after a successful write, or null when there is nothing to say.
 *
 * `points` is what THIS entry earned; `total` is the player's whole field score afterwards.
 * Both are computed from records already on this device by the same pure module the board's
 * SQL mirrors — see `src/lib/leaderboard.ts`. Nothing is sent anywhere to produce them, and
 * nothing anywhere stores them.
 */
interface EntryReward {
  points: number;
  total: number;
}

export function MySightings({ herb }: { herb: Herb }) {
  const { sightings, addSighting, removeSighting } = useSightingsStore(herb.id);
  /*
   * EVERY SPECIES, NOT JUST THIS ONE. The scoped list above is what the panel draws; the
   * daily cap is counted across the whole journal, so scoring needs the lot. Both come from
   * the same store, so this is a second read of one cache rather than a second source.
   */
  const { sightings: allSightings } = useSightingsStore();
  const { state } = useHerbdex();
  const { user } = useAuth();
  const formRef = useRef<HTMLDialogElement>(null);
  const [reward, setReward] = useState<EntryReward | null>(null);

  /*
   * Has this species already had its one paying entry? Derived rather than remembered, like
   * everything else on this board: it is a question about the rows, and the rows are here.
   */
  const firstEntryPaid = paidJournalSpecies(
    allSightings,
    new Set(Object.keys(state.discoveries)),
  ).includes(herb.id);

  const [date, setDate] = useState(todayIso);
  const [region, setRegion] = useState('');
  const [notes, setNotes] = useState('');
  const [growthStage, setGrowthStage] = useState<GrowthStage | ''>('');
  const [foundAgain, setFoundAgain] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  // A save that failed has to say so and leave the form filled in. Closing the dialog on a
  // failed write is how a sighting appears to have been logged and then isn't.
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
      setReward(null);
      let saved;
      try {
        saved = await addSighting({
          herbId: herb.id,
          date,
          region: region.trim() || undefined,
          notes: notes.trim() || undefined,
          growthStage: growthStage || undefined,
          foundAgain: foundAgain || undefined,
          photo,
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not save this sighting.');
        setSaving(false);
        return;
      }

      /*
       * WHAT THAT ENTRY EARNED, ASKED OF THE RECORD RATHER THAN OF THE FORM.
       *
       * `awardForEntry` is handed the journal as it now stands INCLUDING the new row, because
       * the question is "given everything recorded, is this the entry that paid for this
       * species" — which is the same question the board's SQL asks, and the only phrasing
       * whose answer matches it. A second entry for a plant, an edit, a delete-and-relog and
       * an empty form all come back `awarded: false` for their own stated reason.
       *
       * The store may or may not have flushed the new row into `allSightings` by the time
       * this runs, so it is appended and deduplicated by id: either ordering gives the same
       * answer, which is what stops this being a race.
       */
      const journal = [...allSightings.filter((entry) => entry.id !== saved.id), saved];
      const award = awardForEntry(saved, journal, new Set(Object.keys(state.discoveries)));
      if (award.awarded) {
        setReward({ points: award.points, total: scoreFromRecords(state, journal).points });
      }

      setSaving(false);
      formRef.current?.close();
      reset();
    },
    [
      herb.id,
      date,
      region,
      notes,
      growthStage,
      foundAgain,
      photo,
      reset,
      addSighting,
      allSightings,
      state,
    ],
  );

  return (
    // The field log. A game panel, because a record of what you have found IS progression —
    // unlike the botanical sections around it, which stay flat.
    <section aria-labelledby="sightings-heading" className="game-panel game-clip p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="sightings-heading"
          className="flex items-baseline gap-2 text-[0.72rem] font-bold tracking-[0.1em] text-gold-400 uppercase"
        >
          Field log
          {/* The count is the collectible part: it only ever goes up by going outside. */}
          <span className="text-sm font-extrabold text-gold-300 tabular-nums">
            {sightings.length}
          </span>
        </h2>
        {/* The id is how the growth panel's third step opens this form; see
            FIELD_LOG_TRIGGER_ID for why the two sections talk through the DOM. */}
        <button
          id={FIELD_LOG_TRIGGER_ID}
          type="button"
          onClick={() => formRef.current?.showModal()}
          className="min-h-11 rounded-full border border-gold-500/60 bg-gold-500/15 px-4 text-xs font-bold text-gold-300 transition-colors hover:bg-gold-500/30 hover:text-gold-200"
        >
          + Log sighting
        </button>
      </div>

      {/* Also rendered inside the dialog, because a modal makes everything behind it
          inert: this copy is what a failed DELETE has to land on. */}
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-stat-temp">
          {error}
        </p>
      )}

      {/*
        THE REWARD, AND IT ONLY APPEARS WHEN THERE REALLY WAS ONE.

        `awardForEntry` returns false for a second entry about the same plant, for an edit,
        and for anything past the daily cap — and in every one of those cases this renders
        nothing at all. A panel that congratulated somebody for zero points is how they learn
        to stop reading the next one.

        `role="status"` rather than `aria-live` on a container: it is announced once, when it
        arrives, and the dialog that was focused has just closed, so nothing is talking over
        it. Dismissable, because it sits above the log it is about and a player scrolling back
        to re-read their own entries should be able to put it away.

        IT SAYS PROVISIONAL IN THE LINK, NOT IN A BADGE. Nothing in Plantdex verifies that
        anybody went outside, so the board these points feed is a board of self-reported
        field work — stated plainly where somebody can act on it rather than as decoration
        here.
      */}
      {reward && (
        <div
          role="status"
          className="reward-pop game-panel game-panel-earned mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 p-3"
        >
          <p className="text-sm font-bold text-gold-300">
            Field Journal entry complete!{' '}
            <span className="text-gold-plate tabular-nums">+{reward.points} points</span>
          </p>
          <p className="flex items-center gap-3 text-xs text-violet-200">
            <span className="tabular-nums">
              Field score <strong className="text-violet-100">{reward.total.toLocaleString()}</strong>
            </span>
            <Link href="/leaderboard" className="font-semibold text-gold-400 underline underline-offset-2">
              Field Board
            </Link>
            <button
              type="button"
              onClick={() => setReward(null)}
              className="text-violet-400 underline underline-offset-2 hover:text-violet-200"
            >
              Dismiss
            </button>
          </p>
        </div>
      )}

      {sightings.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-violet-700 px-4 py-6 text-center">
          <p className="text-[0.72rem] font-bold tracking-[0.1em] text-violet-400 uppercase">
            No sightings recorded
          </p>
          <p className="mt-1.5 text-sm text-violet-300">
            Find {herb.commonName} in the wild to expand your field log.
          </p>
        </div>
      ) : (
        <ol className="mt-4 space-y-4">
          {sightings.map((sighting) => (
            <li key={sighting.id} className="border-l-2 border-gold-500/50 pl-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-sm font-bold text-violet-100">
                  <time dateTime={sighting.date}>{formatDate(sighting.date)}</time>
                  {sighting.foundAgain && (
                    <span className="ml-2 rounded-full bg-plum-600 px-2 py-0.5 text-[0.72rem] font-semibold tracking-wide text-violet-200 uppercase">
                      Found again
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    void removeSighting(sighting.id).catch((cause: unknown) => {
                      setError(
                        cause instanceof Error ? cause.message : 'Could not delete this sighting.',
                      );
                    });
                  }}
                  className="text-xs text-violet-400 underline underline-offset-2 hover:text-stat-temp"
                >
                  Delete
                </button>
              </div>
              {sighting.region && <p className="text-xs text-violet-300">{sighting.region}</p>}
              {sighting.growthStage && (
                <p className="mt-1 inline-block rounded-full border border-violet-600 px-2 py-0.5 text-[0.72rem] font-semibold text-violet-200">
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
        className="panel m-auto max-h-[90dvh] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto p-5 text-violet-100 backdrop:bg-plum-950/88 backdrop:backdrop-blur-sm"
      >
        <h2 id="sighting-form-title" className="font-display text-lg font-bold text-gold-plate">
          Log a sighting of {herb.commonName}
        </h2>
        {/*
          This used to read "it stays on this device and does not change your collection or
          XP". V0.3 made both halves wrong for a signed-in player: sightings sync to their
          account, and mastery — which is XP — is re-derived server-side from exactly these
          rows. A promise the product no longer keeps is worse than no promise, so it now
          says what is actually true of the person reading it.
        */}
        <p className="mt-1 text-xs text-violet-400">
          {user
            ? 'A personal note, saved to your account. Logging one awards no XP by itself, though repeat sightings are what master a card.'
            : 'A personal note. It stays on this device. Logging one awards no XP by itself, though repeat sightings are what master a card.'}
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
              className="mt-1 min-h-11 w-full rounded-lg border border-violet-600 bg-plum-700/70 px-3 text-sm text-violet-100"
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
              className="mt-1 min-h-11 w-full rounded-lg border border-violet-600 bg-plum-700/70 px-3 text-sm text-violet-100 placeholder:text-violet-500"
            />
            <span className="mt-1 block text-xs leading-relaxed text-violet-400">
              Keep it general. Please don&apos;t record exact spots for wild plants — precise
              locations are how patches get stripped.
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-violet-200">Growth stage (optional)</span>
            <select
              value={growthStage}
              onChange={(e) => setGrowthStage(e.target.value as GrowthStage | '')}
              className="mt-1 min-h-11 w-full rounded-lg border border-violet-600 bg-plum-700/70 px-3 text-sm text-violet-100"
            >
              <option value="">Not recorded</option>
              {GROWTH_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {GROWTH_STAGE_LABEL[stage]}
                </option>
              ))}
            </select>
          </label>

          <PhotoField file={photo} onChange={setPhoto} />

          <label className="block">
            <span className="text-xs font-semibold text-violet-200">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Growing along the sunny edge of a field. Several plants flowering."
              className="mt-1 w-full rounded-lg border border-violet-600 bg-plum-700/70 p-3 text-sm text-violet-100 placeholder:text-violet-500"
            />
            {/*
              WHAT MAKES AN ENTRY COUNT, SAID WHERE THE DECISION IS MADE — and only the first
              time, because after that the species is paid and the sentence would be a prompt
              to do something that earns nothing. The photo field above is the other half of
              the same rule, so both are named here rather than only the one this label is on.
            */}
            {!firstEntryPaid && (
              <span className="mt-1 block text-xs leading-relaxed text-violet-400">
                A photo, or a note of at least {MIN_QUALIFYING_NOTE} characters, makes this your
                first real entry for {herb.commonName} — worth points on the Field Board.
              </span>
            )}
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

          {error && (
            <p role="alert" className="text-sm font-semibold text-stat-temp">
              {error} Your notes are still here — try again.
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                formRef.current?.close();
                reset();
              }}
              className="min-h-11 rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-plum-600"
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
