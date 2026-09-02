'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/state/AuthProvider';
import { useHerbdex } from '@/state/HerbdexProvider';
import { getHerb } from '@/lib/deck';
import { confidenceBand, genusOf, type ScanCandidate } from '@/lib/plant-match';
import { identifyPlant, isScanFailure, recordScan, type ScanResult } from '@/lib/scans';
import { ACCEPT_ATTRIBUTE, ACCEPTED_LABEL } from '@/lib/photo-input';
import { track } from '@/lib/analytics';
import { ScanCaution } from './ScanCaution';

/**
 * PLANT ID V1 — the scan screen.
 *
 * Three outcomes, all designed rather than one designed and two handled:
 *
 *   matched    Something confirmable scored well. Candidates listed, best first, and STILL
 *              requiring a tap — the scan proposes, the player decides.
 *   uncertain  Nothing cleared the bar. The same list with nothing preferred, said plainly.
 *   noMatch    Nothing mapped to a card. This is the COMMON case — 45 species out of a world
 *              of them — so it is a real screen with somewhere to go next, not an error.
 *
 * Confirming calls the ordinary `discover()`, which is what keeps repeats idempotent: it is
 * the same reducer every other entry point uses, and a plant already found awards nothing.
 */
/** The genus the candidates share, so the heading can name what was actually found. */
function relatedGenus(candidates: readonly ScanCandidate[]): string {
  const named = candidates.find((candidate) => candidate.match.herbId);
  return named
    ? genusOf(named.scientificName).replace(/^./, (letter) => letter.toUpperCase())
    : 'plant';
}

export function ScanPanel() {
  const { user } = useAuth();
  const { discover, isDiscovered, ready } = useHerbdex();

  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState<{ signedIn: boolean } | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const answerRef = useRef<HTMLDivElement>(null);

  /*
   * Bring the answer to the player rather than trusting them to go and find it.
   *
   * Only when it is not already fully on screen, so a desktop layout where everything fits
   * does not jump for no reason. `block: 'start'` puts the caution at the top of the viewport
   * with the result under it. The fixed bottom nav is why this is measured against the
   * viewport rather than assumed: a region can end inside `innerHeight` and still be hidden.
   */
  useEffect(() => {
    if (!result && !problem) return;
    const node = answerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
    node.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [result, problem]);

  const run = useCallback(
    async (file: File) => {
      setBusy(true);
      setProblem(null);
      setRateLimited(null);
      setResult(null);
      setConfirmed(null);
      track('scan_started');

      const answer = await identifyPlant(file);

      if (isScanFailure(answer)) {
        if (answer.kind === 'rateLimited') setRateLimited({ signedIn: answer.signedIn });
        setProblem(answer.message);
        setBusy(false);
        return;
      }

      setResult(answer);
      // Bare outcome counts. No species and no score travel — "how often does a scan find
      // nothing" is the question that decides whether the deck should grow, and it needs
      // neither. Consistent with the property-free schema.
      track(
        answer.outcome === 'matched'
          ? 'scan_matched'
          : answer.outcome === 'uncertain'
            ? 'scan_uncertain'
            : answer.outcome === 'relatedOnly'
              ? 'scan_related'
              : 'scan_no_match',
      );
      // History is account data; signed out there is nowhere to keep it, and saying so is
      // better than silently discarding it. A failed write never costs the player the answer.
      if (user) void recordScan(user.id, answer);
      setBusy(false);
    },
    [user],
  );

  const onPick = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset first, or picking the same file twice never fires a change event.
      event.target.value = '';
      if (file) void run(file);
    },
    [run],
  );

  return (
    <div className="space-y-5">
      {/*
        The capture panel is the one thing on this site that behaves like a device, so it is
        dressed as one: a hot-pink pixel reticle at its four corners and a gold key you press.
        Trim only — the frame is a pseudo-element and the rule is 3px tall, because the answer
        below still has to clear the fold on a 390x720 phone.
      */}
      <section className="panel scanner-frame p-5">
        <h2 className="text-sm font-bold tracking-wide text-gold-400 uppercase">
          Identify a plant
        </h2>
        <div aria-hidden="true" className="pixel-rule mt-2 w-24" />
        <p className="mt-2 text-sm leading-relaxed text-violet-200">
          Photograph a leaf, a flower or the whole plant. The clearer and closer the shot, the
          better the suggestion.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          capture="environment"
          onChange={onPick}
          className="sr-only"
          id="scan-photo"
        />
        <label
          htmlFor="scan-photo"
          className="arcade-key mt-4 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-gold-400 px-6 text-sm font-bold tracking-wide text-plum-900 uppercase transition-colors hover:bg-gold-300 sm:w-auto"
        >
          {busy ? 'Identifying…' : 'Take or choose a photo'}
        </label>
        <p className="mt-2 text-xs text-violet-400">
          {ACCEPTED_LABEL}. Your photo is resized and its location data removed before it
          leaves your device.
        </p>
      </section>

      {/*
        THE ANSWER REGION, AND WHY IT IS ONE ELEMENT.

        A scan on a phone rendered its answer BELOW THE FOLD. Measured at 390x720 — an
        ordinary iPhone viewport once Safari's chrome is subtracted — the result heading
        landed at y=717 while the fixed bottom nav starts at y=662, so it was off the screen
        and behind the nav at once. The player tapped, watched the button say "Identifying…"
        and then reset, and saw nothing at all: the answer had arrived perfectly correctly,
        sixty pixels past where anybody was looking. Every path rendered. None was visible.

        Scrolling to the RESULT would have been the wrong fix. The caution sits above the
        answer deliberately, and a scroll that brought the answer on screen without it would
        quietly strip the safety framing off the exact moment it exists for. So the caution
        and the answer are ONE region, and it is the region that comes into view — caution at
        the top of the screen, answer beneath it, the composition this screen was designed as.
      */}
      <div ref={answerRef} className="scroll-mt-4 space-y-5">
        {/* Unconditional, and above every result. Never gated on a score. */}
        <ScanCaution />

        {problem && (
          <section className="panel p-5">
            <p className="text-sm text-violet-100">{problem}</p>
            {rateLimited && !rateLimited.signedIn && (
              <p className="mt-2 text-sm text-violet-300">
                <Link
                  href="/account"
                  className="font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
                >
                  Create a free account
                </Link>{' '}
                for a higher daily limit. Everything else here works without one.
              </p>
            )}
          </section>
        )}

        {result && (
          <section className="panel p-5" aria-live="polite">
            {result.outcome === 'noMatch' || result.outcome === 'relatedOnly' ? (
              <>
                <h3 className="font-display text-lg font-bold text-gold-plate">
                  {result.outcome === 'relatedOnly'
                    ? `A ${relatedGenus(result.candidates)}, but not the one on the card`
                    : 'Not one of the 45 cards'}
                </h3>
                <div aria-hidden="true" className="pixel-rule mt-2 w-16" />
                <p className="mt-2 text-sm leading-relaxed text-violet-200">
                  {result.outcome === 'relatedOnly'
                    ? 'The deck has a card for this group of plants, but it names a different species — so this cannot be logged as that card. Open it and compare for yourself.'
                    : result.candidates.length > 0
                      ? 'We recognised the plant, but it is not in this collection. Plantdex covers 45 common wild species — most plants you photograph will not be among them.'
                      : 'Nothing was recognised in that photograph. A closer shot of a single leaf or flower usually works better.'}
                </p>

                {/*
                  The card the matcher was holding all along. Offered for READING, with no
                  confirm button anywhere near it: a related species is still not this
                  species, and that refusal is the point of the distinction, not a bug in it.
                */}
                {result.outcome === 'relatedOnly' &&
                  (() => {
                    const near = result.candidates.find((candidate) => candidate.match.herbId);
                    const herb = near?.match.herbId ? getHerb(near.match.herbId) : null;
                    if (!herb) return null;
                    return (
                      <Link
                        href={`/herbdex/${herb.id}`}
                        className="mt-3 block rounded-xl border-y border-r border-l-4 border-y-violet-800/70 border-r-violet-800/70 border-l-mystery-pink p-3 transition-colors hover:bg-plum-600/40"
                      >
                        <span className="block font-bold text-violet-100">{herb.commonName}</span>
                        <span className="block text-xs italic text-violet-400">
                          {herb.scientificName}
                        </span>
                        <span className="mt-1 block text-xs text-violet-300">
                          The deck&rsquo;s card for this group &mdash; open it and compare
                        </span>
                      </Link>
                    );
                  })()}
                {result.candidates.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-violet-300">
                    {result.candidates.slice(0, 3).map((candidate) => (
                      <li key={candidate.scientificName} className="flex justify-between gap-3">
                        <span className="italic">{candidate.scientificName}</span>
                        <span className="tabular-nums text-violet-400">
                          {Math.round(candidate.score * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {/*
                  Only on a real no-match. On `relatedOnly` the card is already offered
                  above, so "browse the collection instead" would be pointing away from the
                  very thing the player was just handed.
                */}
                {result.outcome === 'noMatch' && (
                  <Link
                    href="/herbdex"
                    className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
                  >
                    Browse the collection instead &rarr;
                  </Link>
                )}
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-gold-plate">
                  {result.outcome === 'matched' ? 'Possible matches' : 'Not sure about this one'}
                </h3>
                <div aria-hidden="true" className="pixel-rule mt-2 w-16" />
                <p className="mt-2 text-sm leading-relaxed text-violet-200">
                  {result.outcome === 'matched'
                    ? 'Check the card before you confirm. You are the one recording the find.'
                    : 'Nothing scored well enough to suggest. These are the closest, in order — open a card and compare it yourself.'}
                </p>

                <ul className="mt-4 space-y-3">
                  {result.candidates.map((candidate) => {
                    const herb = candidate.match.herbId ? getHerb(candidate.match.herbId) : null;
                    if (!herb) return null;
                    const band = confidenceBand(candidate.score);
                    const already = ready && isDiscovered(herb.id);
                    return (
                      <li
                        key={candidate.scientificName}
                        /*
                         * Gold edge: this one can be logged. Hot pink: it cannot — a related species
                         * the matcher deliberately refuses. The colour repeats what the sentence below
                         * already says, for anyone scanning the list rather than reading it.
                         */
                        className={`rounded-xl border-y border-r border-l-4 p-3 ${
                          candidate.match.confirmable
                            ? 'border-y-gold-500/25 border-r-gold-500/25 border-l-gold-500'
                            : 'border-y-violet-800/70 border-r-violet-800/70 border-l-mystery-pink'
                        }`}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <Link
                            href={`/herbdex/${herb.id}`}
                            className="font-bold text-violet-100 underline underline-offset-2 hover:text-gold-400"
                          >
                            {herb.commonName}
                          </Link>
                          <span className="flex items-center gap-2 text-xs tabular-nums text-violet-300">
                            <span
                              aria-hidden="true"
                              className="pixel-meter w-14 shrink-0 rounded-[2px]"
                              style={
                                {
                                  '--fill': `${Math.round(candidate.score * 100)}%`,
                                  '--meter-colour': candidate.match.confirmable
                                    ? 'var(--color-gold-500)'
                                    : 'var(--color-mystery-pink)',
                                } as React.CSSProperties
                              }
                            />
                            {Math.round(candidate.score * 100)}% &middot; {band}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs italic text-violet-400">
                          {candidate.scientificName}
                        </p>

                        {/* A card-printed warning belongs BEFORE the confirm button, not after it. */}
                        {herb.warning && (
                          <p className="mt-2 rounded-lg border border-pink-accent/50 bg-plum-800/60 p-2 text-xs leading-relaxed text-violet-100">
                            <span className="font-bold text-pink-accent">Card warning: </span>
                            {herb.warning}
                          </p>
                        )}

                        {candidate.match.kind === 'sameGenus' ? (
                          <p className="mt-2 text-xs leading-relaxed text-violet-300">
                            Related to this card, but a different species &mdash; so it cannot be
                            logged as {herb.commonName}.
                          </p>
                        ) : already ? (
                          <p className="mt-2 text-xs font-semibold text-gold-300">
                            Already in your collection.
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              // The player's decision, and the only thing that awards anything.
                              // `discover` is the same call the plant page makes, so a repeat
                              // awards nothing — idempotency is the reducer's, not ours.
                              discover(herb);
                              track('scan_confirmed');
                              setConfirmed(herb.id);
                            }}
                            className="arcade-key mt-3 min-h-11 w-full rounded-full border border-gold-500/60 bg-gold-500/12 px-4 text-sm font-bold text-gold-300 transition-colors hover:bg-gold-500/20"
                          >
                            Yes, I found {herb.commonName}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {typeof result.remaining === 'number' && (
              <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-violet-300">
                <span aria-hidden="true" className="inline-block h-2 w-2 shrink-0 bg-gold-500" />
                <span>
                  <span className="font-bold tabular-nums text-gold-300">
                    {result.remaining} identification{result.remaining === 1 ? '' : 's'}
                  </span>{' '}
                  left today{result.signedIn ? '' : ' — signing in raises the limit'}.
                </span>
              </p>
            )}
          </section>
        )}
      </div>

      {confirmed && (
        <section className="panel p-5" aria-live="polite">
          <p className="text-sm font-semibold text-gold-300">
            Added to your collection.
          </p>
          <Link
            href={`/herbdex/${confirmed}`}
            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-violet-100 underline underline-offset-2 hover:text-gold-400"
          >
            Open the card &rarr;
          </Link>
        </section>
      )}

      {!user && (
        <p className="text-xs leading-relaxed text-violet-400">
          You can scan without an account. Signed in, you get a higher daily limit and your
          scan history is kept &mdash; signed out, nothing is saved anywhere.
        </p>
      )}
    </div>
  );
}
