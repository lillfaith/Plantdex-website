'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { getHerb } from '@/lib/deck';
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
 * Packets per board.
 *
 * THIS NUMBER AND THE COLUMN COUNT ARE THE SAME NUMBER, and they have to be: a board is one
 * plank drawn under one row, so a board holding more packets than the grid has columns wraps
 * — and the plank then appears under the second row only, with the first row floating above
 * nothing. That is exactly what the first render did.
 *
 * So the shelf is three across at every width, and the unit itself is given a fixed maximum
 * width instead. That is also how a real shelf behaves: it does not grow columns when you
 * move it into a bigger room, the objects on it just get more room.
 *
 * The class names are written out in full because Tailwind scans source text — an
 * interpolated `grid-cols-${n}` compiles to nothing and the grid collapses to one column.
 */
const PER_BOARD = 3;

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
      const herb = herbId ? getHerb(herbId) : undefined;
      if (!herb) return;
      discover(herb, entry.firstFoundAt);
      track('seed_shelf_sprouted');
      setClaimed(herb.id);
    },
    [discover],
  );

  const boards: SeedShelfEntry[][] = [];
  for (let i = 0; i < ordered.length; i += PER_BOARD) {
    boards.push(ordered.slice(i, i + PER_BOARD));
  }

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
        */}
        <p className="mt-4 text-sm leading-relaxed text-violet-200">
          A Plantdex card is one of the 45 collectibles. A seed packet is a real species you
          photographed that has no card yet. Packets earn no XP and don&apos;t fill the
          collection — they hold your find until a future collection catches up with it.
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
              {getHerb(claimed)?.commonName} is a card now, and it&apos;s yours — dated the day
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
            <div className="mt-6 max-w-md sm:max-w-xl">
              <ShelfBoard>
                {[0, 1, 2].map((slot) => (
                  <ShelfProp key={slot} variant={slot} />
                ))}
              </ShelfBoard>
            </div>
          </>
        ) : (
          // Left-aligned with the heading rather than centred: the shelf is a piece of
          // furniture standing against the same wall as everything else on the page.
          <div className="mt-6 max-w-md space-y-5 sm:max-w-xl">
            {boards.map((board, index) => (
              <ShelfBoard key={index}>
                {board.map((entry) => (
                  <Packet
                    key={entry.speciesKey}
                    entry={entry}
                    status={shelfStatus(entry, state)}
                    onClaim={() => claim(entry)}
                  />
                ))}
                {/*
                  THE GAP ON THE LAST BOARD IS WHERE THE PLANTS GO, and that is the whole rule:
                  a pot never takes a slot a packet could have used, so the three-across
                  invariant above is untouched and no board ever wraps. It also puts the
                  dressing exactly where the shelf looked unfinished — a lone packet on a wide
                  plank with two empty thirds beside it.
                */}
                {Array.from({ length: PER_BOARD - board.length }, (_, slot) => (
                  <ShelfProp key={`plant-${slot}`} variant={index + slot} />
                ))}
              </ShelfBoard>
            ))}
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
 * One board of the shelf.
 *
 * The plank is drawn by the container, not by the packets, for the same reason the Garden's
 * soil is: a shelf holding one packet still has to look like a shelf. Uprights at both ends
 * make it read as built rather than as a stripe.
 */
function ShelfBoard({ children }: { children: React.ReactNode }) {
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
      <ul
        className="grid grid-cols-3 items-end gap-x-3 px-2 sm:gap-x-6"
      >
        {children}
      </ul>
      {/* The board itself: a lit top edge, a grain, and a shadow underneath. */}
      <div aria-hidden="true" className="shelf-board h-3 rounded-sm" />
    </div>
  );
}

/**
 * A potted plant standing in a slot no packet is using.
 *
 * Narrower than a packet on purpose: a pot filling its third as completely as the paper does
 * would read as another collectible rather than as the furniture beside the collectibles. It
 * carries no label, so the board's `items-end` sets it straight down on the plank.
 */
function ShelfProp({ variant }: { variant: number }) {
  return (
    <li className="flex flex-col items-center">
      <div className="mx-auto w-full max-w-12 drop-shadow-[0_3px_2px_rgba(0,0,0,0.45)]">
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
  const herb = herbId ? getHerb(herbId) : undefined;
  const label = entry.commonName ?? entry.scientificName;

  return (
    <li className="flex flex-col items-center">
      {/* The packet stands ON the board: it sits in the row above and the plank is drawn
          under it, so the bottom edge of the paper meets the wood. */}
      <div className="relative mx-auto w-full max-w-20 drop-shadow-[0_3px_2px_rgba(0,0,0,0.45)]">
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

      {/* Labelled underneath, exactly as the Garden labels its sprites. */}
      <p className="mt-1.5 line-clamp-2 text-center text-[0.72rem] leading-tight font-semibold text-violet-100">
        {label}
      </p>
      <p className="text-center text-[0.72rem] leading-tight text-violet-400 italic">
        {entry.scientificName}
      </p>
      <p className="mt-0.5 text-center text-[0.72rem] leading-tight text-violet-400">
        {status === 'grown' ? 'Grown into a card' : `Found ${formatDate(entry.firstFoundAt)}`}
        {entry.encounters > 1 && ` · ${entry.encounters}×`}
      </p>

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
          className="arcade-key mt-2 min-h-11 w-full rounded-full border border-gold-500/60 bg-gold-500/15 px-2 text-[0.72rem] font-bold text-gold-300 transition-colors hover:bg-gold-500/25"
        >
          Plant
        </button>
      )}
      {status === 'grown' && herb && (
        <Link
          href={`/herbdex/${herb.id}`}
          className="mt-1 text-[0.72rem] font-semibold text-gold-400 underline underline-offset-2 hover:text-gold-300"
        >
          {herb.commonName}
        </Link>
      )}
    </li>
  );
}
