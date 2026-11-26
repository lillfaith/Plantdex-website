'use client';

import Link from 'next/link';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { HABITAT_BLURB } from '@/lib/habitat';
import { HABITAT_VIEW_COPY } from '@/lib/habitat-view-model';
import { OCCURRENCE_SOURCES, RECORDED_COPY } from '@/lib/regional-nearby';
import {
  GEORGIA_TRAIL_ID, TRAIL_COPY, trailProgress,
} from '@/lib/region-quest';
import {
  emitCompletions, parseCompletions, QUEST_COMPLETION_KEY, readCompletions,
  recordCompletion, subscribeCompletions, writeCompletions,
} from '@/lib/region-quest-store';
import { useRegionScope } from '@/lib/region-scope';
import { useRegion } from '@/lib/region-store';
import { useHerbdex } from '@/state/HerbdexProvider';

/**
 * PREVIEW FOR OWNER REVIEW. Built from existing tokens and components; layout, hierarchy and
 * wording are NOT final and the UI session owns every visual decision. Marked
 * `data-ui-placeholder` accordingly.
 *
 * Functional wiring only: it reads the player's discoveries and the Georgia survey, shows the
 * objective and the habitat groups, and records WHEN the trail was first seen complete. It
 * writes no discovery and pays nothing; a find is made on the card page or the scanner, the
 * ordinary paths, and this screen only links to them.
 */

function readRaw(scope: string): string {
  try {
    return window.localStorage.getItem(`${QUEST_COMPLETION_KEY}:${scope}`) ?? '';
  } catch {
    return '';
  }
}

export function GeorgiaHabitatQuest() {
  const scope = useRegionScope();
  const { region, ready: regionReady, setRegion } = useRegion(scope);
  const { state, ready } = useHerbdex();

  // The raw string is the snapshot: a parsed object would be a new reference on every read.
  const raw = useSyncExternalStore(subscribeCompletions, () => readRaw(scope), () => '');
  const completions = useMemo(() => {
    try {
      return raw === '' ? readCompletions(scope, null) : parseCompletions(JSON.parse(raw));
    } catch {
      return readCompletions(scope, null);
    }
  }, [raw, scope]);

  const chosen = region?.id === 'us-ga';
  const progress = useMemo(
    () => (chosen && ready ? trailProgress(state.discoveries, 'us-ga') : null),
    [chosen, ready, state.discoveries],
  );

  const complete = progress?.complete ?? false;
  useEffect(() => {
    if (!complete) return;
    const current = readCompletions(scope);
    const next = recordCompletion(current, GEORGIA_TRAIL_ID, true, new Date().toISOString());
    if (next === current) return;
    writeCompletions(scope, next);
    emitCompletions();
  }, [complete, scope]);

  if (!regionReady || !ready) {
    return (
      <div className="panel p-5" aria-busy="true" data-ui-placeholder>
        <p className="text-sm text-violet-300">Loading your trail&hellip;</p>
      </div>
    );
  }

  if (!chosen || !progress) {
    return (
      <section className="panel p-5" data-ui-placeholder data-testid="trail-start" aria-labelledby="trail-title">
        <h2 id="trail-title" className="text-sm font-bold tracking-wide text-gold-400 uppercase">
          {TRAIL_COPY.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-violet-200">{TRAIL_COPY.noRegion}</p>
        <button
          type="button"
          onClick={() => setRegion('us-ga')}
          className="mt-4 min-h-11 rounded-lg border border-gold-400/60 px-4 text-sm font-bold text-gold-300 hover:border-gold-400"
        >
          {TRAIL_COPY.chooseGeorgia}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-violet-400">{TRAIL_COPY.chooseNote}</p>
      </section>
    );
  }

  const recordedAt = completions[GEORGIA_TRAIL_ID];
  const note = RECORDED_COPY.sourceNote('us-ga');
  const source = OCCURRENCE_SOURCES['us-ga'];

  return (
    <div className="space-y-6" data-ui-placeholder data-testid="trail">
      <section className="panel p-5" aria-labelledby="trail-title">
        <h2 id="trail-title" className="text-sm font-bold tracking-wide text-gold-400 uppercase">
          {TRAIL_COPY.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-violet-200" data-testid="trail-objective">
          {TRAIL_COPY.objective(progress.total)}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-violet-400">{TRAIL_COPY.howItCounts}</p>
        <p className="mt-3 text-xs tabular-nums text-violet-300" data-testid="trail-overall">
          {TRAIL_COPY.overall(progress.done, progress.total)}
        </p>
        <div
          role="progressbar"
          aria-valuenow={progress.done}
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-label={TRAIL_COPY.overall(progress.done, progress.total)}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-plum-800"
        >
          <div
            aria-hidden
            className="path-fill h-full rounded-full bg-gold-400"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
        {progress.complete && (
          <div data-testid="trail-complete">
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold-400/60 px-3 py-1 text-xs font-bold text-gold-300">
              <span aria-hidden>&#9733;</span>
              {TRAIL_COPY.complete}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-violet-400">{TRAIL_COPY.completeNote}</p>
            {recordedAt && (
              <p className="mt-1 text-xs text-violet-300" data-testid="trail-recorded">
                {TRAIL_COPY.completedOn(recordedAt.slice(0, 10))}
              </p>
            )}
          </div>
        )}
        <p className="mt-4">
          <Link
            href="/scan"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-gold-300 underline underline-offset-2 hover:text-gold-400"
          >
            {TRAIL_COPY.scan}
          </Link>
        </p>
      </section>

      {progress.steps.map((step) => (
        <section
          key={step.habitat}
          className="panel p-5"
          aria-labelledby={`trail-${step.habitat}`}
          data-testid={`trail-step-${step.habitat}`}
          data-done={step.done}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id={`trail-${step.habitat}`} className="text-sm font-bold text-violet-100">
              {step.label}
            </h3>
            <p className="text-xs tabular-nums text-violet-300">
              {step.done ? TRAIL_COPY.stepDone : TRAIL_COPY.stepOpen}
              {' · '}
              {TRAIL_COPY.stepProgress(step.collected, step.tiles.length)}
            </p>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-violet-400">{HABITAT_BLURB[step.habitat]}</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {step.tiles.map((tile) => (
              <li key={tile.herbId}>
                <Link
                  href={tile.cardHref}
                  className="inline-flex min-h-11 items-center rounded-full border border-violet-800/60 px-3 text-xs text-violet-100 hover:border-gold-400/60"
                >
                  {tile.commonName}
                  <span className="ml-1 text-violet-300">
                    &middot; {tile.collected ? HABITAT_VIEW_COPY.collected : HABITAT_VIEW_COPY.notFound}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {note && source && (
        <p className="text-xs leading-relaxed text-violet-400">{note}</p>
      )}
      <p className="text-xs leading-relaxed text-violet-400">{TRAIL_COPY.safety}</p>
      <p className="text-xs leading-relaxed text-violet-400" data-testid="trail-preview-note">
        {TRAIL_COPY.preview}
      </p>
    </div>
  );
}
