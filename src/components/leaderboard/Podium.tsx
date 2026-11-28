import type { ReactNode } from 'react';
import type { Standing } from '@/lib/remote-leaderboard';
import { ordinal } from '@/lib/board-view';
import { trophyArt } from '@/lib/pixel-icons';
import { regionById } from '@/lib/regions';
import { fromRows, gridToUri } from '@/lib/pixel-art';
import { PixelIcon } from '../herbdex/HerbalVisuals';

/**
 * THE TOP THREE, as compact pixel-beveled player cards, in rank order.
 *
 * PRESENTATION ONLY. Nothing here scores, ranks or breaks a tie: the rows arrive already ranked by
 * the standings function, `row.standing` is the rank it computed, and this file reads it. A card is
 * labelled with its OWN standing, so a 1st / 1st / 3rd board shows two firsts and a third and
 * never pretends a second place exists. A row is "tied" when another row on the board carries the
 * same standing (the whole list is checked, so a third-place tie that spills below the top three
 * is still said out loud).
 *
 * Privacy is unchanged: a name is what the player chose to publish, an unnamed player is shown as
 * "No name set". The art slot holds the player's own avatar ONLY if the standings function
 * publishes it (it does not today); otherwise a NEUTRAL pixel silhouette. It is deliberately not a
 * plant: a species sprite beside a stranger's name reads as that stranger's own plant.
 */

type Place = 1 | 2 | 3;

const TONE: Record<Place, { card: string; plate: string; label: string }> = {
  1: {
    card: 'border-[var(--card-gold-500)] bg-[var(--card-gold-100)] shadow-[inset_0_2px_0_#fff,0_3px_0_0_var(--card-gold-700)]',
    plate: 'bg-[var(--card-gold-300)] border-[var(--card-gold-700)]',
    label: 'First place',
  },
  2: {
    card: 'border-[var(--card-violet-300)] bg-[var(--card-violet-50)] shadow-[inset_0_2px_0_#fff,0_3px_0_0_var(--card-violet-700)]',
    plate: 'bg-[var(--card-violet-100)] border-[var(--card-violet-500)]',
    label: 'Second place',
  },
  3: {
    card: 'border-[var(--card-pink-500)] bg-[var(--card-pink-300)] shadow-[inset_0_2px_0_#fff,0_3px_0_0_var(--card-pink-700)]',
    plate: 'bg-[var(--card-pink-300)] border-[var(--card-pink-700)]',
    label: 'Third place',
  },
};

const SILHOUETTE_ROWS = [
  '    ####    ',
  '   ######   ',
  '   ######   ',
  '   ######   ',
  '    ####    ',
  '  ########  ',
  ' ########## ',
  '############',
  '############',
];
/** A neutral head-and-shoulders in card lilac: not a plant, not anybody in particular. */
const SILHOUETTE = gridToUri(fromRows(SILHOUETTE_ROWS, { '#': '#BF6FFA' }));

const nameOf = (row: Standing) => row.displayName ?? 'No name set';
const placeOf = (row: Standing): Place => Math.min(3, Math.max(1, row.standing)) as Place;
const isTied = (row: Standing, rows: readonly Standing[]) =>
  rows.some((other) => other !== row && other.standing === row.standing);

function PointsPlate({ points }: { points: number }) {
  return (
    <span className="inline-block rounded-md bg-[var(--card-violet-900)] px-2 py-0.5 text-[0.8125rem] leading-tight font-extrabold text-[var(--card-gold-300)] tabular-nums shadow-[inset_0_0_0_1px_var(--card-violet-700)]">
      {points.toLocaleString()}
      <span className="ml-1 text-[0.72rem] font-bold text-[var(--card-violet-200)]">PTS</span>
    </span>
  );
}

function RankPlate({ row, place }: { row: Standing; place: Place }) {
  return (
    <span
      className={`flex w-10 shrink-0 flex-col items-center justify-center rounded-lg border-2 py-0.5 leading-none text-[#38204f] ${TONE[place].plate}`}
    >
      <span aria-hidden="true">
        <PixelIcon uri={trophyArt(place)} size={place === 1 ? 22 : 20} />
      </span>
      <span className="font-display text-[0.9375rem] font-extrabold">
        <span className="sr-only">{TONE[place].label}, standing </span>
        {ordinal(row.standing)}
      </span>
    </span>
  );
}

function TiePill({ standing }: { standing: number }) {
  return (
    <span className="pd-badge !min-h-0 !border-[var(--card-pink-700)] !bg-[var(--card-pink-100)] !px-1.5 !py-0 !text-[0.72rem]">
      Tied<span className="sr-only"> for {ordinal(standing)}</span>
    </span>
  );
}

function Art({ row, size, avatarFor }: { row: Standing; size: number; avatarFor: (row: Standing) => ReactNode }) {
  const avatar = avatarFor(row);
  return (
    <span
      aria-hidden="true"
      className="pd-tile flex shrink-0 items-center justify-center !rounded-lg !bg-white !p-0.5"
      style={{ width: size, height: size }}
    >
      {avatar ?? <PixelIcon uri={SILHOUETTE} size={size - 12} />}
    </span>
  );
}

function CardsLayout({ rows, avatarFor }: { rows: readonly Standing[]; avatarFor: (row: Standing) => ReactNode }) {
  return (
    <ol aria-label="Top three" className="mx-auto flex max-w-sm flex-col gap-2">
      {rows.slice(0, 3).map((row, index) => {
        const place = placeOf(row);
        const lead = place === 1;
        const tied = isTied(row, rows);
        return (
          <li
            key={`${row.standing}-${index}`}
            className={`board-rise flex min-w-0 items-center gap-2 rounded-xl border-2 px-2.5 ${lead ? 'py-2' : 'py-1.5'} ${TONE[place].card}`}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <RankPlate row={row} place={place} />
            <Art row={row} size={lead ? 40 : 34} avatarFor={avatarFor} />
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-sm font-extrabold text-[#38204f] ${row.isSelf ? 'underline decoration-[var(--card-gold-500)] decoration-2 underline-offset-2' : ''}`}
                title={nameOf(row)}
              >
                {nameOf(row)}
                {row.isSelf && <span className="sr-only"> (you)</span>}
              </span>
              <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <PointsPlate points={row.points} />
                {tied && <TiePill standing={row.standing} />}
              </span>
              {row.regionId && (
                <span className="block truncate text-[0.72rem] leading-tight text-[var(--card-violet-700)]">
                  {regionById(row.regionId)?.name}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function Podium({
  rows,
  avatarFor,
}: {
  rows: readonly Standing[];
  avatarFor: (row: Standing) => ReactNode;
}) {
  if (rows.length === 0) return null;
  return <CardsLayout rows={rows} avatarFor={avatarFor} />;
}
