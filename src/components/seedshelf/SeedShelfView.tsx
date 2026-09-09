'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { getPrintedCard } from '@/lib/deck';
import { useHerbdex } from '@/state/HerbdexProvider';
import { useSeedShelf } from '@/lib/seed-shelf-store';
import {
  cardFor,
  shelfCounts,
  shelfOrder,
  shelfStatus,
  type SeedShelfEntry,
} from '@/lib/seed-shelf';
import { track } from '@/lib/analytics';
import { planShelfRows, type ShelfRow } from '@/lib/shelf-layout';
import type { HerbdexState } from '@/lib/types';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { SeedPacket } from './SeedPacket';
import { ShelfPlant } from './ShelfPlant';

/**
 * THE SEED SHELF — a wooden shelf of generated seed packets, one per species found outside
 * the deck.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT IS FURNITURE, NOT AN ERROR LOG. The thing this page replaces is a dead end: "we
 * recognised the plant, but it is not in this collection", full stop. So it is built as a
 * piece of the game world — a board with a lit edge and a shadow, packets standing on it,
 * each one labelled underneath the way the Garden labels its sprites. Somebody's shelf
 * should be worth looking at even while every packet on it is still waiting.
 *
 * WHAT IT MUST NEVER LOOK LIKE IS A COLLECTION. Packets are paper, not cards; the counts say
 * "species on the shelf", never a fraction of anything; and nothing here reports XP, because
 * shelving pays none.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Column counts, one per breakpoint.
 *
 * A BOARD IS ONE PLANK UNDER ONE ROW, so the number of slots a row holds and the number of
 * columns it renders have to be the same number, or the row wraps and the plank lands under
 * the wrong half of it. Tailwind cannot see an interpolated `grid-cols-${n}`, so both counts
 * exist as literal classes and the two plans are rendered as separate stacks, one hidden per
 * breakpoint. That duplicates the packets in the DOM and is worth it: the alternative is
 * measuring the viewport in JavaScript, which means either a hydration mismatch or a visible
 * reflow on every load of a page whose whole job is to look like a solid object.
 */
const COLUMNS_MOBILE = 3;
const COLUMNS_DESKTOP = 5;

export function SeedShelfView() {
  const { entries, signedIn } = useSeedShelf();
  const { state, ready, discover } = useHerbdex();
  const [claimed, setClaimed] = useState<string | null>(null);

  const ordered = shelfOrder(entries, state);
  const counts = shelfCounts(entries, state);

  /*
   * CLAIMING A SPROUTED SEED.
   *
   * The only write is the ordinary `discover()` — the same call the plant page and the scan
   * screen make — so a card already in the collection awards nothing and a double tap awards
   * once. The shelf itself is not touched: "grown" is derived from the discovery, so the
   * packet changes state because the collection did.
   *
   * The discovery is stamped with the entry's FIRST-FOUND DATE, not with today. The player
   * found the plant then; the deck simply had nowhere to put it yet.
   */
  const claim = useCallback(
    (entry: SeedShelfEntry) => {
      const herbId = cardFor(entry);
      const herb = herbId ? getPrintedCard(herbId) : undefined;
      if (!herb) return;
      discover(herb, entry.firstFoundAt);
      track('seed_shelf_sprouted');
      setClaimed(herb.id);
    },
    [discover],
  );

  // Planned twice, once per breakpoint. `planShelfRows` is pure and tested: every entry
  // appears exactly once and in order, and the pots only ever dress slots.
  const rowsMobile = planShelfRows(ordered, COLUMNS_MOBILE);
  const rowsDesktop = planShelfRows(ordered, COLUMNS_DESKTOP);

  return (
    /*
     * THE ROOM. The wall is a SIBLING of the content rather than a background on `main`,
     * because `main` is a centred max-w-5xl column — a background on it would paint a brown
     * stripe down the middle of a violet page. This wrapper is a plain block, so it spans the
     * document, and the wall fills it edge to edge behind a column that still centres.
     *
     * It stops at this page. The nav and the footer keep the site's own ground: they are
     * chrome rather than shelf, and a wall running behind them would be a sitewide theme
     * change made by one route.
     */
    <div className="relative isolate">
      <div aria-hidden="true" className="shelf-wall pointer-events-none absolute inset-0" />
      {/* Deeper bottom padding than the site default: the wall stops with the page, so
          the last line of text sitting a few pixels off its bottom edge reads as a
          clipped background rather than as the floor of a room. */}
      <main id="main" className="relative mx-auto max-w-5xl px-4 pt-8 pb-16">
        <h1 className="font-display text-3xl font-extrabold text-gold-plate">Seed Shelf</h1>
        <p className="mt-1 text-sm text-violet-300">
          Plants you&apos;ve found that aren&apos;t Plantdex cards — yet.
        </p>

        {/*
          The distinction, said once, at the top. A player who has just been told their find is
          not in the collection needs to know what this shelf IS before they read a count of it.

          It used to open by defining a Plantdex card as "one of the 45 collectibles", which
          the subtitle immediately above had already implied and the empty state says outright.
          What could NOT be cut is the second half: shelving pays nothing, and this is the
          place the page owes somebody that fact before they start collecting packets.
        */}
        <p className="mt-4 text-sm leading-relaxed text-violet-200">
          A seed packet is a real species you photographed that has no card yet. Packets earn
          no XP and don&apos;t fill your collection — they hold the find until a future
          collection catches up.
        </p>

        {ready && entries.length > 0 && (
          <p aria-live="polite" className="mt-4 text-xs font-semibold text-violet-200">
            {counts.species} species on the shelf
            {counts.encounters > counts.species && (
              <span className="text-violet-400">
                {' '}
                · {counts.encounters} encounters
              </span>
            )}
            {counts.sprouted > 0 && (
              <span className="text-gold-300"> · {counts.sprouted} ready to claim</span>
            )}
            {counts.grown > 0 && (
              <span className="text-violet-400">
                {' '}
                · {counts.grown} grown into {counts.grown === 1 ? 'a card' : 'cards'}
              </span>
            )}
          </p>
        )}

        {claimed && (
          <section className="panel mt-4 border border-gold-500/60 p-4" aria-live="polite">
            <p className="font-display text-base font-extrabold text-gold-plate">
              A seed has sprouted.
            </p>
            <p className="mt-1 text-sm text-violet-200">
              {getPrintedCard(claimed)?.commonName} is a card now, and it&apos;s yours — dated the day
              you first found it.
            </p>
            <Link
              href={`/herbdex/${claimed}`}
              className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
            >
              Open the card &rarr;
            </Link>
          </section>
        )}

        {entries.length === 0 ? (
          <>
            <div className="panel mt-6 p-6 text-center">
              <p className="text-4xl" aria-hidden="true">
                <PlantdexIcon name="sprout" />
              </p>
              <p className="mt-3 text-sm text-violet-200">Your shelf is empty.</p>
              <p className="mt-1 text-sm leading-relaxed text-violet-300">
                Identify a plant that isn&apos;t one of the 45 cards and you can keep it here.
              </p>
              <Link
                href="/scan"
                className="mt-4 inline-flex min-h-11 items-center rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400"
              >
                Identify a plant
              </Link>
            </div>

            {/*
              AN EMPTY SHELF IS STILL A SHELF. The header of this file asks that somebody's
              shelf be worth looking at while every packet on it is still waiting — and the one
              state that failed that was the state with no packets at all, which was a notice
              floating on a page with no furniture on it whatsoever. The board is real and the
              plants standing on it are real; the empty thirds are the ones about to be filled.
            */}
            <div className="mt-6 max-w-md sm:max-w-2xl">
              <Shelf rows={planShelfRows([], COLUMNS_MOBILE)} columns={COLUMNS_MOBILE} mobile state={state} />
              <Shelf rows={planShelfRows([], COLUMNS_DESKTOP)} columns={COLUMNS_DESKTOP} state={state} />
            </div>
          </>
        ) : (
          // Left-aligned with the heading rather than centred: the shelf is a piece of
          // furniture standing against the same wall as everything else on the page.
          <div className="mt-6 max-w-md sm:max-w-2xl">
            <Shelf
              rows={rowsMobile}
              columns={COLUMNS_MOBILE}
              mobile
              state={state}
              onClaim={claim}
            />
            <Shelf rows={rowsDesktop} columns={COLUMNS_DESKTOP} state={state} onClaim={claim} />
          </div>
        )}

        {!signedIn && entries.length > 0 && (
          <p className="mt-6 text-xs leading-relaxed text-violet-400">
            This shelf is saved in this browser. Sign in and you&apos;ll be offered the chance to
            bring it with you — after that it follows your account to any device.
          </p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-violet-400">
          A packet records what an identifier suggested from a photograph. It is not a confirmed
          identification and never a statement that a plant is safe to touch, pick or eat.{' '}
          <Link href="/safety" className="underline underline-offset-2 hover:text-violet-300">
            Read the safety notes
          </Link>
          .
        </p>
      </main>
    </div>
  );
}

/**
 * A stack of boards, one plank per row, for one breakpoint.
 *
 * Rendered twice by the page and hidden by media query rather than measured in JavaScript —
 * see the column constants at the top for why. `mobile` picks which half is visible; nothing
 * else about the two differs.
 */
function Shelf({
  rows,
  columns,
  mobile = false,
  state,
  onClaim,
}: {
  rows: ShelfRow[];
  columns: number;
  mobile?: boolean;
  state: HerbdexState;
  onClaim?: (entry: SeedShelfEntry) => void;
}) {
  return (
    <div className={`${mobile ? 'sm:hidden' : 'hidden sm:block'} space-y-6`}>
      {rows.map((row, index) => (
        <ShelfBoard key={index} columns={columns}>
          {row.map((slot, position) =>
            slot.kind === 'packet' ? (
              <Packet
                key={slot.entry.speciesKey}
                entry={slot.entry}
                status={shelfStatus(slot.entry, state)}
                onClaim={() => onClaim?.(slot.entry)}
              />
            ) : (
              <ShelfProp key={`pot-${position}`} variant={slot.variant} />
            ),
          )}
        </ShelfBoard>
      ))}
    </div>
  );
}

/**
 * One board of the shelf.
 *
 * The plank is drawn by the container, not by the packets, for the same reason the Garden's
 * soil is: a shelf holding one packet still has to look like a shelf. Uprights at both ends
 * make it read as built rather than as a stripe, and the front edge below the top face is
 * what gives the plank thickness — without it the board reads as a painted line rather than
 * as a piece of wood with a near side.
 */
function ShelfBoard({ columns, children }: { columns: number; children: React.ReactNode }) {
  // Literal classes, never interpolated: Tailwind cannot see `grid-cols-${n}` and the grid
  // silently collapses to a single column.
  const grid = columns === 5 ? 'grid-cols-5' : 'grid-cols-3';
  return (
    <div className="relative px-3">
      <div
        aria-hidden="true"
        className="shelf-upright pointer-events-none absolute top-2 bottom-0 left-0 w-2 rounded-l-sm"
      />
      <div
        aria-hidden="true"
        className="shelf-upright pointer-events-none absolute top-2 right-0 bottom-0 w-2 rounded-r-sm"
      />
      <ul className={`grid ${grid} items-end gap-x-2 px-2 sm:gap-x-4`}>{children}</ul>
      {/* The board: a lit top face, then a darker front edge that gives it depth. */}
      <div aria-hidden="true" className="shelf-board h-3 rounded-t-sm" />
      <div aria-hidden="true" className="shelf-edge h-2 rounded-b-sm" />
    </div>
  );
}

/**
 * A potted plant standing in a slot no packet is using.
 *
 * Narrower than a packet on purpose: a pot filling its column as completely as the paper
 * does would read as another collectible rather than as the furniture beside the
 * collectibles. It carries no label, so the board's `items-end` sets it straight down on the
 * plank — and it is `aria-hidden`, because a screen reader listing somebody's collection
 * should hear the species they saved and nothing else.
 */
function ShelfProp({ variant }: { variant: number }) {
  return (
    <li aria-hidden="true" className="flex flex-col items-center">
      <div className="mx-auto w-full max-w-[4.75rem] drop-shadow-[0_3px_2px_rgba(0,0,0,0.45)]">
        <ShelfPlant variant={variant} />
      </div>
    </li>
  );
}

function Packet({
  entry,
  status,
  onClaim,
}: {
  entry: SeedShelfEntry;
  status: ReturnType<typeof shelfStatus>;
  onClaim: () => void;
}) {
  const herbId = cardFor(entry);
  const herb = herbId ? getPrintedCard(herbId) : undefined;
  const label = entry.commonName ?? entry.scientificName;

  return (
    <li className="flex flex-col items-center">
      {/* The packet stands ON the board: it sits in the row above and the plank is drawn
          under it, so the bottom edge of the paper meets the wood. */}
      <div className="relative mx-auto w-full max-w-24 drop-shadow-[0_4px_3px_rgba(0,0,0,0.5)]">
        <SeedPacket
          recipe={entry.packet}
          alt={`Seed packet for ${label}`}
          faded={status === 'grown'}
        />
        {status === 'sprouted' && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-gold-500 ring-2 ring-plum-900"
          />
        )}
      </div>

      {/*
        Labelled underneath, exactly as the Garden labels its sprites — inside a fixed block.
        The board aligns its slots on `items-end`, so without a common caption height a
        two-line species name lifts its packet a whole line higher than its neighbours and the
        row stops reading as objects standing on one plank. Long names still clamp; the block
        just does not change size when they do — FIXED rather than a minimum, because a
        min-height still grows for a four-line caption and lifted that packet alone.
      */}
      {/*
        TWO LINES OF LABEL, AND THAT IS THE WHOLE CAPTION.
        A shelf of seventeen packets was carrying seventeen found-dates and encounter counts,
        and the page stopped reading as a shelf of objects and started reading as a table with
        pictures in it. The date has not been deleted — it moved into the details below, which
        is where somebody goes when they want to know about one packet rather than see all of
        them. The height is fixed so a two-line species name does not lift its packet above its
        neighbours; long names clamp and the full value is on the details.
      */}
      <div className="mt-2 flex h-[3.6rem] w-full flex-col justify-start overflow-hidden">
        <p className="line-clamp-2 text-center text-[0.82rem] leading-snug font-semibold text-violet-100">
          {label}
        </p>
        <p className="line-clamp-1 text-center text-[0.74rem] leading-snug text-violet-300 italic">
          {entry.scientificName}
        </p>
      </div>

      {/*
        WHERE THE MOVED METADATA WENT.
        A native <details>, so it is reachable by keyboard and announced as a disclosure
        without any of it being reimplemented — and so the full species name is available to
        anyone whose caption above was clamped. Closed, it is one small line; the shelf stays
        a shelf. The summary is a real hit target rather than a 12px word.
      */}
      <details className="group mt-1 w-full">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center text-[0.72rem] font-semibold text-violet-400 hover:text-violet-200 [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Details</span>
          <span className="hidden group-open:inline">Hide</span>
        </summary>
        <div className="mt-1 space-y-0.5 text-center text-[0.72rem] leading-snug text-violet-300">
          <p className="break-words italic">{entry.scientificName}</p>
          <p>
            {status === 'grown' ? 'Grown into a card' : `Found ${formatDate(entry.firstFoundAt)}`}
          </p>
          {entry.encounters > 1 && <p>Seen {entry.encounters}×</p>}
        </div>
      </details>

      {/*
        A FIXED ACTION SLOT, WHETHER OR NOT THERE IS AN ACTION.
        Only a sprouted packet has a Plant button, so without a reserved row the cells holding
        one are taller than the cells beside them — and because the board aligns on items-end,
        the taller cell's packet rides UP above its neighbours. Two packets standing at
        different heights on one plank reads as a rendering fault, not as a shelf.
      */}
      <div className="flex h-11 w-full items-center justify-center">
      {status === 'sprouted' && herb && (
        /*
         * THE LABEL IS ONE WORD, BUT THE ACCESSIBLE NAME IS NOT. On screen the packet is
         * already captioned with the species directly above the button, so repeating it
         * inside was saying the same thing twice and wrapping a 0.72rem button onto three
         * lines in a third of a phone. A screen reader gets no such adjacency: several
         * sprouted packets side by side would all announce "Plant, button" with nothing to
         * tell them apart, which is why the name still travels in `aria-label`.
         */
        <button
          type="button"
          onClick={onClaim}
          aria-label={`Plant ${herb.commonName}`}
          className="arcade-key min-h-11 w-full rounded-full border border-gold-500/60 bg-gold-500/15 px-2 text-[0.72rem] font-bold text-gold-300 transition-colors hover:bg-gold-500/25"
        >
          Plant
        </button>
      )}
      {status === 'grown' && herb && (
        <Link
          href={`/herbdex/${herb.id}`}
          className="text-[0.72rem] font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
        >
          {herb.commonName}
        </Link>
      )}
      </div>
    </li>
  );
}
