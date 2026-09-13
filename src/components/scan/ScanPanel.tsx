'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/state/AuthProvider';
import { useHerbdex } from '@/state/HerbdexProvider';
import { getPrintedCard } from '@/lib/deck';
import type { DiscoveryResult } from '@/lib/types';
import { confidenceBand, genusOf, type ScanCandidate } from '@/lib/plant-match';
import { identifyPlant, isScanFailure, recordScan, type ScanResult } from '@/lib/scans';
import { warmIdentifier } from '@/lib/scan-warmup';
import { ACCEPT_ATTRIBUTE, ACCEPTED_LABEL } from '@/lib/photo-input';
import { track } from '@/lib/analytics';
import { DiscoveryCelebration } from '../herbdex/DiscoveryCelebration';
import { ScanCaution } from './ScanCaution';
import { ScanOutcome } from './ScanOutcome';
import { SaveToSeedShelf } from '../seedshelf/SaveToSeedShelf';

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
  const { discover, isDiscovered, ready, progress } = useHerbdex();

  const inputRef = useRef<HTMLInputElement>(null);
  /*
   * TWO STAGES, AND DELIBERATELY NOT THREE.
   *
   * `preparing` is the decode-and-re-encode in `prepareImage`; `identifying` is everything
   * after it — upload, quota, provider, answer. There is no third stage because `fetch` gives
   * no upload-completion signal, so an "Uploading" that flipped to "Identifying" on a timer
   * would be a state the code cannot observe, invented to look busier. Two honest stages beat
   * three convincing ones.
   */
  const [stage, setStage] = useState<'idle' | 'preparing' | 'identifying'>('idle');
  const busy = stage !== 'idle';
  /*
   * The chosen photograph, shown the INSTANT it is chosen.
   *
   * Before this, the first visible response to a tap was the finished answer — everything in
   * between happened behind a single changed word on a button, including a full-resolution
   * decode that blocks the main thread and can outlast a second on its own. An object URL
   * costs no decode and no round trip: the picture is on screen before the work starts, which
   * is the difference between "it did nothing" and "it is working on this".
   */
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState<{ signedIn: boolean } | null>(null);
  /*
   * What the confirmation ACTUALLY produced, not just which card it was.
   *
   * `discover()` already returns the XP it awarded and any achievement ids that unlocked, and
   * this path was throwing both away — so the scan loop, which is the path a first-time user
   * takes, was the one place in the app where finding your first plant unlocked "First Find"
   * and nothing said so. The card page has celebrated it since the beginning.
   */
  const [confirmed, setConfirmed] = useState<{
    herbId: string;
    xpAwarded: number;
    newAchievementIds: string[];
    /* Stamped at the tap so research feedback only claims what followed it. */
    at: number;
  } | null>(null);
  // The history row this result was written to, so a Seed Shelf save can point back at the
  // scan it came from. Null signed out, where there is no history to point at.
  /*
   * THE CELEBRATION, WHICH IS A SEPARATE FACT FROM THE RECORD.
   *
   * `confirmed` above is the RECORD of what happened and stays on screen for as long as the
   * player is on this page — `ScanOutcome` reads it. This is the MOMENT, and it is over when
   * the dialog closes. Two lifetimes, so two pieces of state: clearing one on close must not
   * take the outcome panel with it.
   *
   * Set only when `awarded` is true. A plant already in the collection returns
   * `awarded: false` from the same idempotent `discover()` every other entry point calls, and
   * a celebration there would claim a reward the reducer did not give. The candidate row
   * already says "Already in your collection", and that is the whole of what is true.
   */
  const celebrateRef = useRef<HTMLDialogElement>(null);
  const [celebrating, setCelebrating] = useState<{
    herbId: string;
    result: DiscoveryResult;
  } | null>(null);

  // Closed with Escape or a backdrop click as well as by the button, so the state that
  // mounts the contents is cleared by the `close` event rather than by any one control.
  useEffect(() => {
    const node = celebrateRef.current;
    if (!node) return;
    const handleClose = () => setCelebrating(null);
    node.addEventListener('close', handleClose);
    return () => node.removeEventListener('close', handleClose);
  }, []);

  const [scanId, setScanId] = useState<string | null>(null);
  // True once this scan's species has been put on the shelf, so the page can stop offering
  // an alternative to the one place it has just told the player their find went.
  const [shelved, setShelved] = useState(false);

  const answerRef = useRef<HTMLDivElement>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);

  /*
   * WARM THE FUNCTION WHILE THE PLAYER IS STILL FRAMING THE SHOT.
   *
   * The first scan of a session otherwise arrives at a cold Deno isolate, which is already
   * running by the time the photograph is ready if something asks first. It costs no quota —
   * the function answers OPTIONS before it claims anything — sends no image, and its failure
   * is ignored entirely, because a warm-up that could break a scan would be worse than a cold
   * one. It does NOT prime the later POST's CORS preflight; that was measured and is wrong,
   * and `scan-warmup.ts` carries the numbers.
   */
  useEffect(() => {
    void warmIdentifier();
  }, []);

  // An object URL holds the file alive until it is released. One per pick, released when it
  // is replaced or when the screen goes away.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  /*
   * Bring the answer to the player rather than trusting them to go and find it.
   *
   * Only when it is not already fully on screen, so a desktop layout where everything fits
   * does not jump for no reason. `block: 'start'` puts the caution at the top of the viewport
   * with the result under it. The fixed bottom nav is why this is measured against the
   * viewport rather than assumed: a region can end inside `innerHeight` and still be hidden.
   */
  useEffect(() => {
    // `busy` joins `result` and `problem` for the reason the region exists: on a 390px
    // viewport the status line renders below the fold too, and a player who cannot see the
    // work happening is in exactly the position this region was built to fix.
    if (!result && !problem && !busy) return;
    const node = answerRef.current;
    if (!node) return;
    // Once an outcome exists it is what the player is waiting to read, so bring THAT into
    // view rather than the top of the answer they have already seen. See `confirmed` below.
    const target = outcomeRef.current ?? node;
    if (target !== node) {
      target.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
        block: 'center',
      });
      return;
    }
    const rect = node.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
    node.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
    // `confirmed` is a dependency for the reason spelled out at the outcome panel: the panel
    // reporting the most important action in the app used to render below the fold with
    // nothing scrolling to it.
  }, [result, problem, confirmed, busy]);

  const run = useCallback(
    async (file: File) => {
      setStage('preparing');
      // Created OUTSIDE the state updater, deliberately. An updater is not a place for a side
      // effect: React invokes it twice under StrictMode, so minting the URL in there would
      // create two and keep one, leaking the other and revoking a URL still being displayed.
      // The effect above owns releasing it, which is the only place that knows when it stops
      // being on screen.
      setPreview(URL.createObjectURL(file));
      setProblem(null);
      setRateLimited(null);
      setResult(null);
      setConfirmed(null);
      setScanId(null);
      setShelved(false);
      track('scan_started');

      /*
       * The stage flips on the next macrotask rather than inline, because `prepareImage`'s
       * decode runs on the main thread: set synchronously, React would batch the change into
       * the same commit as the work that blocks the paint, and "Preparing photo" would never
       * be drawn at all. A frame is what it costs to actually see the first stage.
       */
      await new Promise((resolve) => setTimeout(resolve, 0));
      const answer = await identifyPlant(file, () => setStage('identifying'));

      if (isScanFailure(answer)) {
        if (answer.kind === 'rateLimited') setRateLimited({ signedIn: answer.signedIn });
        setProblem(answer.message);
        setStage('idle');
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
      if (user) void recordScan(user.id, answer).then(setScanId);
      setStage('idle');
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
        {/*
          "Take a photo", not "Take or choose a photo".
          The input carries `capture="environment"`, which opens the camera directly on a
          phone and is simply ignored on a desktop browser, where the same control opens a
          file picker instead. The old label spelled out both paths — and in doing so made
          the primary one, on the device this is actually used from, sound optional. This is
          a field guide: the expected posture is standing in front of the plant. Choosing a
          file still works exactly as it did; it is just no longer offered as a co-equal
          option in six words on the loudest control of the page.
        */}
        {/*
          THE ONE PIECE OF FRAMING ADVICE, BESIDE THE CONTROL IT IS ABOUT.

          It cannot go where it belongs — over the viewfinder — because there is no viewfinder
          to put it on: `capture="environment"` hands off to the OS camera app, and the page is
          backgrounded for the whole of the capture. So the last moment Plantdex can say
          anything is the instant before the tap, which is here.

          Short enough to be REMEMBERED through that handoff, which is the real constraint: the
          paragraph above describes what makes a good photograph and this is the single
          instruction to carry into a screen we do not control. Deliberately "one plant" rather
          than a framing rectangle — nothing here implies the plant must fit a box.
        */}
        <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-mystery-pink">
          <span aria-hidden="true" className="pixel-rule w-4 shrink-0" />
          Fill the frame with one plant
        </p>

        <label
          htmlFor="scan-photo"
          className="arcade-key mt-2 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-gold-400 px-6 text-sm font-bold tracking-wide text-plum-900 uppercase transition-colors hover:bg-gold-300 sm:w-auto"
        >
          {busy ? 'Identifying…' : 'Take a photo'}
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

        {/*
          WHAT IS HAPPENING, WHERE THE ANSWER WILL BE.

          Until this existed, the whole wait was one changed word on a button at the top of
          the page — and on a 390px viewport the player had already scrolled past it, so a
          scan looked like a tap that did nothing for several seconds. The status renders
          inside the answer region, so the existing scroll effect brings it into view and the
          answer then replaces it in the place the player is already looking.

          THE PHOTOGRAPH IS THE POINT OF THIS PANEL. It is on screen from the instant of the
          tap, before the decode has started, which is the first honest signal that the app
          received the thing it was handed.
        */}
        {busy && (
          /*
            THE SAME RETICLE AS THE CAPTURE PANEL, BECAUSE THIS IS THE SAME INSTRUMENT.

            Between the tap and the answer the player has just come back from the OS camera —
            a screen with none of Plantdex on it — and returned to a plain panel. Wearing the
            capture panel's own four pink brackets is what makes the handoff read as a round
            trip through one device rather than as a departure and an unrelated arrival. It is
            the frame we CAN draw, sitting either side of the one we cannot.

            `scanner-frame` already exists and is already on the capture panel; this adds one
            class and no CSS. Not also on the photo thumbnail inside it — two nested reticles
            is a pattern, not an instrument.
          */
          <section className="panel scanner-frame p-5" aria-live="polite" aria-busy="true">
            <div className="flex items-center gap-4">
              {preview && (
                /*
                  THE WHOLE PHOTOGRAPH, AT ITS OWN PROPORTIONS.

                  This was an `object-cover` square, which is the right treatment for a
                  decorative tile and the wrong one for the picture somebody just took: a
                  portrait phone photo is 3024x4032, so a 1:1 crop threw away a THIRD of its
                  height — measured — and a landscape shot lost half its width. The plant is
                  usually the tallest thing in the frame, so what got cut was the flower and
                  the base: the player was shown a square of leaf and asked to recognise their
                  own photograph in it.

                  `object-contain` in a FIXED SLOT is what keeps both properties at once. The
                  image is never cropped and never stretched, and the slot does not resize
                  between a portrait and a landscape shot, so the status text beside it does
                  not jump. The slot carries the border and the ground, so the letterboxing
                  either side reads as a frame rather than as a gap. Same rule as
                  `PhotoField`, which has always shown a chosen photo at `w-auto`.
                */
                <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-violet-800/70 bg-plum-900">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a blob: URL next/image cannot optimise, and it must appear before any decoding starts. */}
                  <img src={preview} alt="" className="h-full w-full object-contain" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-violet-100">
                  {stage === 'preparing' ? 'Preparing photo\u2026' : 'Identifying\u2026'}
                </p>
                {/*
                  A determinate bar with exactly two steps, because there are exactly two
                  things this code can observe happening. It reuses `path-fill` — the same
                  800ms width transition as the mastery track and every profile meter — and
                  adds no keyframe: CLAUDE.md's Motion rule allows one-shot effects only, and
                  a bar that loops forever while waiting is ambient motion by another name.
                  It moves when something real happened, and is still the rest of the time.
                */}
                <div
                  aria-hidden="true"
                  className="mt-2 h-2 w-full overflow-hidden rounded-full bg-plum-900"
                >
                  <div
                    className="path-fill h-full rounded-full bg-gold-500"
                    style={{ ['--fill' as string]: stage === 'preparing' ? '15%' : '65%' }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-violet-300">
                  {stage === 'preparing'
                    ? 'Resizing it and removing its location data on your device.'
                    : 'Sent for identification. This usually takes a few seconds.'}
                </p>
              </div>
            </div>
          </section>
        )}

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
                    // Every card in the genus. The deck holds two Rumex species, and naming
                    // one of them confidently was a coin flip that always landed the same way.
                    const ids = near?.match.relatedHerbIds ?? (near?.match.herbId ? [near.match.herbId] : []);
                    const herbs = ids.map(getPrintedCard).filter((herb) => herb !== undefined);
                    if (herbs.length === 0) return null;
                    return (
                      <ul className="mt-3 space-y-2">
                        {herbs.map((herb) => (
                          <li key={herb.id}>
                            <Link
                              href={`/herbdex/${herb.id}`}
                              className="block rounded-xl border-y border-r border-l-4 border-y-violet-800/70 border-r-violet-800/70 border-l-mystery-pink p-3 transition-colors hover:bg-plum-600/40"
                            >
                              <span className="block font-bold text-violet-100">
                                {herb.commonName}
                              </span>
                              <span className="block text-xs italic text-violet-400">
                                {herb.scientificName}
                              </span>
                            </Link>
                          </li>
                        ))}
                        <li className="text-xs text-violet-300">
                          {herbs.length === 1
                            ? 'The deck\u2019s card for this group \u2014 open it and compare'
                            : `The deck\u2019s ${herbs.length} cards for this group \u2014 open them and compare`}
                        </li>
                      </ul>
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
                  THE DEAD END, REMOVED.
                  
                  Both of these outcomes mean the same thing about the species in the
                  photograph: the deck has no card for it. That used to be the end of the
                  screen. The shelf is offered on both — including `relatedOnly`, where the
                  deck's card is for a RELATIVE and this species is still uncarded — and it
                  is offered under the card links rather than above them, because reading the
                  related card is the better next step when there is one.
                */}
                <SaveToSeedShelf
                  candidates={result.candidates}
                  scanId={scanId ?? undefined}
                  onSaved={() => setShelved(true)}
                />

                {/*
                  Only on a real no-match. On `relatedOnly` the card is already offered
                  above, so "browse the collection instead" would be pointing away from the
                  very thing the player was just handed.
                */}
                {result.outcome === 'noMatch' && !shelved && (
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
                    : "The identifier's best guess is not a card in this deck, but one below is. Open it and compare before you confirm anything."}
                </p>

                <ul className="mt-4 space-y-3">
                  {result.candidates.map((candidate) => {
                    const herb = candidate.match.herbId ? getPrintedCard(candidate.match.herbId) : null;
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
                            /*
                             * A 44px hit area drawn by a pseudo-element rather than by
                             * padding: this link sits on a baseline row beside the score
                             * meter, so growing the box would shift the meter off the name it
                             * belongs to. Measured at 24px before this — a real sub-target in
                             * the launch loop's own critical path. Same pattern
                             * `GlossaryTermLink` uses, and invisible to layout.
                             */
                            className="relative font-bold text-violet-100 underline underline-offset-2 before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-full before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:text-gold-400"
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
                            {(candidate.match.relatedHerbIds?.length ?? 1) > 1
                              ? `Related to the deck\u2019s ${candidate.match.relatedHerbIds?.length} cards in this group, but a different species \u2014 so it cannot be logged as any of them.`
                              : `Related to this card, but a different species \u2014 so it cannot be logged as ${herb.commonName}.`}
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
                              const outcome = discover(herb);
                              track('scan_confirmed');
                              setConfirmed({
                                herbId: herb.id,
                                xpAwarded: outcome.xpAwarded,
                                newAchievementIds: outcome.newAchievementIds,
                                at: Date.now(),
                              });
                              /*
                               * THE MOMENT, AND ONLY WHEN ONE WAS EARNED.
                               *
                               * The card page has celebrated a discovery since the beginning;
                               * the scanner — the route a stranger from a vendor table
                               * actually takes — recorded the identical reward and rendered it
                               * as two static chips under a paragraph. Same event, same data,
                               * no moment. This is the card page's own celebration, reading
                               * the same `DiscoveryResult`, with an onward step that suits
                               * this screen instead of a mastery track that is not on it.
                               *
                               * Gated on `awarded`: a repeat find celebrates nothing.
                               */
                              if (outcome.awarded) {
                                setCelebrating({ herbId: herb.id, result: outcome });
                                celebrateRef.current?.showModal();
                              }
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

        {/*
          CASE A'S OUTCOME, AND WHY IT MOVED IN HERE.

          This panel used to sit OUTSIDE this region, below everything, with the scroll effect
          watching only `result` and `problem`. So confirming a find — the single most
          important action in the app, and the one a first-time user takes once — rendered its
          confirmation underneath a list of candidates, off the bottom of a phone, behind the
          fixed nav, with nothing bringing it into view. Exactly the bug this file's own
          comment above records having fixed for the RESULT, repeated one step later in the
          flow: every path rendered, and the one that mattered was not visible.

          It is inside the answer region now, directly under the candidate that produced it,
          and `confirmed` is a dependency of the scroll effect.
        */}
        {confirmed &&
          (() => {
            const herb = getPrintedCard(confirmed.herbId);
            if (!herb) return null;
            return (
              <div ref={outcomeRef}>
                <ScanOutcome
                  kind="card"
                  herbId={herb.id}
                  commonName={herb.commonName}
                  scientificName={herb.scientificName}
                  href={`/herbdex/${herb.id}`}
                  xpAwarded={confirmed.xpAwarded}
                  newAchievementIds={confirmed.newAchievementIds}
                  confirmedAt={confirmed.at}
                />
              </div>
            );
          })()}
      </div>


      {!user && (
        <p className="text-xs leading-relaxed text-violet-400">
          You can scan without an account. Signed in, you get a higher daily limit and your
          scan history is kept &mdash; signed out, nothing is saved anywhere.
        </p>
      )}

      {/*
        THE DIALOG ELEMENT IS ALWAYS HERE; ONLY ITS CONTENTS ARE CONDITIONAL.

        Same structure as `HerbDetail`'s, and for the reason recorded there: a <dialog> that
        mounts and unmounts around its own open state is one React can recreate underneath
        itself. This sits at a fixed position at the end of the tree, and `celebrating` decides
        what is inside it.

        `aria-label` is STATIC. HerbDetail's own comment records a dangling `aria-labelledby`
        pointing at a heading that only existed once the dialog had something to show. Here the
        species is not even known until somebody confirms, so naming it would dangle on every
        load of this page — a static label cannot.

        A closed <dialog> is `display: none`, so it contributes nothing to the `space-y-5`
        rhythm above; when open the browser positions it itself.
      */}
      <dialog
        ref={celebrateRef}
        aria-label="New discovery"
        /*
         * TAP THE BACKDROP TO LEAVE, AND THIS IS NOT DECORATION.
         *
         * Measured at 390x720 with two achievements unlocked — which is the FIRST find every
         * new player makes, so it is the common case rather than an edge one: the reveal, the
         * XP, the level bar and two achievement rows are taller than the dialog's 90dvh, so
         * the footer holding both controls sits below the fold INSIDE a scrollable modal. The
         * way out existed and was not visible, on the one screen that is the climax of the
         * loop.
         *
         * A click reports the <dialog> itself as its target only when it landed outside the
         * content box, so this closes on the backdrop and never on the card, the buttons or
         * the achievement rows. Escape already worked; this is the pointer equivalent, and it
         * is what the brief asked for by "dismissible by tap".
         *
         * Scoped to this dialog deliberately. The plant page's copy has the same geometry and
         * the same pre-existing behaviour, but it is not what this pass was asked to change.
         */
        onClick={(event) => {
          if (event.target === celebrateRef.current) celebrateRef.current?.close();
        }}
        className="panel m-auto max-h-[90dvh] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto p-5 text-violet-100 backdrop:bg-plum-950/88 backdrop:backdrop-blur-sm"
      >
        {celebrating &&
          (() => {
            const herb = getPrintedCard(celebrating.herbId);
            if (!herb) return null;
            return (
              <DiscoveryCelebration
                herb={herb}
                result={celebrating.result}
                /*
                 * The total AFTER the discovery. `discover()` has already run and the provider
                 * has re-rendered by the time this mounts, so `progress.xp` is the new total —
                 * which is what lets the bar and the figure animate from the real previous
                 * value rather than from zero. Same contract as the card page.
                 */
                xpAfter={progress.xp}
                onClose={() => celebrateRef.current?.close()}
                next={{
                  href: `/herbdex/${herb.id}`,
                  label: 'Open its card',
                  dismissLabel: 'Keep scanning',
                  // The same goal `ScanOutcome`'s link fires, because it measures the same
                  // thing: the scan flow led to the card. No new event name.
                  onNavigate: () => track('herbdex_opened_from_scan'),
                }}
              />
            );
          })()}
      </dialog>
    </div>
  );
}
