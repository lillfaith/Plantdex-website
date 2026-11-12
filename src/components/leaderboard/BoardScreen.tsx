'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LEADERBOARD_POINTS, SCORING_RULES } from '@/lib/leaderboard';
import type { Standing } from '@/lib/remote-leaderboard';
import {
  BOARD_PAGE_SIZE,
  PODIUM_PLANTS,
  beyondPodium,
  countsLine,
  friendlyBoardError,
  gapToNext,
  isFull,
  ordinal,
  ownDisplay,
  placeNote,
  podiumOf,
  remainingAfter,
  selfOf,
} from '@/lib/board-view';
import { illustration, traitBadge, trophyArt } from '@/lib/pixel-icons';
import { DEFAULT_FRAME_ID, getFrame, type FieldFrame } from '@/lib/field-frames';
import { hasSprite } from '@/lib/plant-sprites';
import type { GardenStage } from '@/lib/garden';
import { PlantSprite } from '../PlantSprite';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import { pixelObject } from '@/lib/pixel-art';
import { regionById } from '@/lib/regions';
import { PixelIcon } from '../herbdex/HerbalVisuals';

export type BoardScope = { kind: 'global' } | { kind: 'region'; id: string };

/** The signed-in player's own identity, from their own profile on this device. */
export interface BoardMe {
  name: string | null;
  title: string;
  avatarHerbId: string | null;
  frame: FieldFrame;
  stage: GardenStage;
}

export interface BoardScreenProps {
  me?: BoardMe;
  /** `unconfigured`: no accounts on this build. `signedOut`: accounts exist, nobody is in. */
  access: 'unconfigured' | 'signedOut' | 'member';
  own: {
    ready: boolean;
    points: number;
    discoveries: number;
    journalEntries: number;
    challenges: number;
  };
  membership: { regionId: string | null } | null | undefined;
  standings: Standing[] | null;
  error: string | null;
  scope: BoardScope;
  regions: readonly { id: string; name: string }[];
  busy: boolean;
  onScope: (scope: BoardScope) => void;
  onJoin: (regionId: string | null) => void;
  onLeave: () => void;
  onRetry: () => void;
}

const STEP: Record<1 | 2 | 3, { height: string; tone: string; label: string }> = {
  1: {
    height: '6.4rem',
    tone: 'from-gold-300 to-gold-500 text-plum-900',
    label: 'First place',
  },
  2: {
    height: '5.2rem',
    tone: 'from-violet-200 to-violet-400 text-plum-900',
    label: 'Second place',
  },
  3: {
    height: '4.4rem',
    tone: 'from-pink-accent/80 to-pink-accent text-plum-900',
    label: 'Third place',
  },
};

const nameOf = (row: Standing) => row.displayName ?? 'No name set';

export function BoardScreen(props: BoardScreenProps) {
  const { access, own, membership, standings, error, scope, regions } = props;
  const [shown, setShown] = useState(BOARD_PAGE_SIZE);
  const listed = Boolean(membership);
  const shownOwn = ownDisplay(own, selfOf(standings ?? []));
  const ownReady = own.ready || shownOwn.source === 'board';

  return (
    <main id="main" className="mx-auto max-w-xl px-4 py-6">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3">
        <PixelIcon uri={illustration('trophy')} size={40} />
        <h1 className="font-display text-3xl leading-none font-extrabold text-gold-plate">
          Field Board
        </h1>
      </header>

      {/*
        THE HONESTY LINE, FIRST AND ALWAYS RENDERED. Plantdex verifies nothing, so every score
        here is self-reported. The live-site check looks for this exact heading in the built page,
        so it is in the first render in every state, not behind a tap.
      */}
      <p className="mt-2 text-xs leading-snug text-violet-200">
        <strong className="font-bold text-gold-300">These scores are provisional.</strong> Plantdex
        does not verify that anybody went outside, so they are self-reported.
      </p>

      {/* ── Your points, on one line ─────────────────────────────── */}
      <section aria-labelledby="own-heading" className="mt-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h2 id="own-heading" className="text-sm font-bold text-violet-50">
            Your points{' '}
            <span className="font-display text-xl font-extrabold text-gold-plate tabular-nums">
              {own.ready || shownOwn.source === 'board'
                ? shownOwn.score.points.toLocaleString()
                : '\u2014'}
            </span>
          </h2>
          <dl className="flex items-center gap-3 text-xs text-violet-200">
            <MiniStat
              icon={<PixelIcon uri={illustration('leaf')} size={20} />}
              label="species"
              value={ownReady ? shownOwn.score.discoveries : null}
            />
            <MiniStat
              icon={<PixelIcon uri={pixelObject('book')} size={20} />}
              label="entries"
              value={ownReady ? shownOwn.score.journalEntries : null}
            />
            <MiniStat
              icon={<PixelIcon uri={traitBadge('star')} size={20} />}
              label="challenges"
              value={ownReady ? shownOwn.score.challenges : null}
            />
          </dl>
        </div>
        <p className="mt-1 text-xs leading-snug text-violet-300">
          {shownOwn.source === 'board'
            ? shownOwn.difference === null
              ? 'Counted by the board from your synced records.'
              : `The board counts ${Math.abs(shownOwn.difference).toLocaleString()} ${shownOwn.difference > 0 ? 'fewer' : 'more'} points than this device. It counts only records synced to your account.`
            : 'Counted on this device. Join the board to be ranked by the same rule.'}
        </p>
      </section>

      {/* ── How rankings work ──────────────────────────────────────── */}
      <details className="group mt-2 border-y border-violet-500/25">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-bold text-violet-100">
          <span
            aria-hidden="true"
            className="text-lg leading-none text-violet-300 transition-transform group-open:rotate-90 motion-reduce:transition-none"
          >
            &rsaquo;
          </span>
          How rankings work
        </summary>
        <ul className="space-y-2.5 pb-3">
          {SCORING_RULES.map((rule) => (
            <li key={rule.what} className="flex gap-3">
              <span className="font-display w-10 shrink-0 text-right text-lg leading-tight font-extrabold text-gold-400 tabular-nums">
                +{rule.points}
              </span>
              <span className="min-w-0 text-xs leading-relaxed text-violet-300">
                <span className="block text-sm font-semibold text-violet-100">{rule.what}</span>
                {rule.note}
              </span>
            </li>
          ))}
          <li className="text-xs leading-relaxed text-violet-300">
            Your own score is counted from the records on this device, so you can check it. Players
            are ranked by points, and equal points share a place. The daily journal limit runs on
            UTC so it means the same thing for everyone. A discovery is worth{' '}
            {LEADERBOARD_POINTS.discovery} points because going outside is what this is for. Nothing
            on this board unlocks anything, costs anything or changes your collection.
          </li>
        </ul>
      </details>

      {access !== 'member' ? (
        <SignedOut access={access} />
      ) : (
        <>
          <Membership {...props} listed={listed} />
          <section aria-labelledby="standings-heading" className="mt-4">
            <h2 id="standings-heading" className="sr-only">
              Standings
            </h2>
            {regions.length > 0 && (
              <div
                role="group"
                aria-label="Choose a board"
                className="mb-4 flex flex-wrap gap-1.5 rounded-full border-2 border-violet-500/60 bg-plum-900/50 p-0.5"
              >
                <Scope
                  active={scope.kind === 'global'}
                  onClick={() => props.onScope({ kind: 'global' })}
                >
                  Everyone
                </Scope>
                {regions.map((region) => (
                  <Scope
                    key={region.id}
                    active={scope.kind === 'region' && scope.id === region.id}
                    onClick={() => props.onScope({ kind: 'region', id: region.id })}
                  >
                    {region.name}
                  </Scope>
                ))}
              </div>
            )}

            {error ? (
              <div role="alert" className="py-6 text-center">
                <p className="text-sm font-semibold text-violet-100">{friendlyBoardError(error)}</p>
                <button
                  type="button"
                  onClick={props.onRetry}
                  className="mt-3 inline-flex min-h-11 items-center rounded-full border border-violet-400 px-5 text-sm font-semibold text-violet-100 hover:bg-plum-700"
                >
                  Try again
                </button>
              </div>
            ) : standings === null ? (
              <Skeleton />
            ) : standings.length === 0 ? (
              <Empty listed={listed} />
            ) : (
              <Standings
                rows={standings}
                listed={listed}
                shown={shown}
                onMore={() => setShown((count) => count + BOARD_PAGE_SIZE)}
                scope={scope}
                memberRegion={membership?.regionId ?? null}
                me={props.me}
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex items-center gap-1">
      {icon}
      <dd className="font-bold text-violet-50 tabular-nums">
        {value === null ? '\u2014' : value.toLocaleString()}
      </dd>
      <dt className="text-violet-300">{label}</dt>
    </div>
  );
}

function Scope({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 flex-1 rounded-full px-3 text-sm font-bold whitespace-nowrap transition-colors ${
        active
          ? 'bg-gradient-to-b from-pink-accent to-violet-400 text-violet-deep'
          : 'text-violet-200 hover:text-violet-50'
      }`}
    >
      {children}
    </button>
  );
}

function SignedOut({ access }: { access: 'unconfigured' | 'signedOut' }) {
  return (
    <section aria-labelledby="signin-heading" className="mt-8 text-center">
      <span className="mx-auto block w-fit">
        <PixelIcon uri={illustration('crown')} size={56} />
      </span>
      <h2 id="signin-heading" className="font-display mt-2 text-xl font-bold text-violet-50">
        {access === 'unconfigured' ? 'The board needs accounts' : 'Sign in to see the board'}
      </h2>
      <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-violet-200">
        Standings are only readable by signed-in players, and you only appear if you ask to be
        listed. Your collection works the same either way.
      </p>
      {access === 'signedOut' && (
        <Link
          href="/account"
          className="holo-fill mt-4 inline-flex min-h-12 items-center justify-center rounded-full px-8 text-base font-extrabold text-plum-900"
        >
          Sign in
        </Link>
      )}
    </section>
  );
}

function Membership(props: BoardScreenProps & { listed: boolean }) {
  const { membership, regions, busy, listed } = props;
  return (
    <section aria-labelledby="listing-heading" className="mt-3">
      <h2 id="listing-heading" className="sr-only">
        Your listing
      </h2>
      {membership === undefined ? (
        <p className="text-sm text-violet-300">Checking your listing…</p>
      ) : listed ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-violet-100">
            Listed
            {membership?.regionId ? ` in ${regionById(membership.regionId)?.name}` : ' globally'}.
          </p>
          <button
            type="button"
            onClick={props.onLeave}
            disabled={busy}
            className="min-h-11 rounded-full border border-violet-400/70 px-4 text-sm font-semibold text-violet-100 hover:bg-plum-700 disabled:opacity-60"
          >
            Leave the board
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => props.onJoin(null)}
            disabled={busy}
            className="holo-fill min-h-11 rounded-full px-5 text-sm font-extrabold text-plum-900 disabled:opacity-70"
          >
            Join the board
          </button>
          {regions.map((region) => (
            <button
              key={region.id}
              type="button"
              onClick={() => props.onJoin(region.id)}
              disabled={busy}
              className="min-h-11 rounded-full border border-gold-500/70 px-4 text-sm font-semibold text-gold-300 hover:bg-plum-700 disabled:opacity-60"
            >
              Join as {region.name}
            </button>
          ))}
        </div>
      )}
      <p className="mt-1.5 text-xs leading-snug text-violet-300">
        {listed ? 'Shared with signed-in players: ' : 'Joining shares '}your display name, region
        and counts. Nothing else.{' '}
        <Link href="/profile" className="underline underline-offset-2 hover:text-violet-100">
          Set your name
        </Link>
        .
      </p>
    </section>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading the board</p>
      <div className="flex items-end justify-center gap-2" aria-hidden="true">
        {[3.9, 5.25, 3].map((height, index) => (
          <div
            key={index}
            className="w-24 rounded-t-md bg-plum-800/70"
            style={{ height: `${height}rem` }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-3" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <li key={row} className="h-9 rounded-lg bg-plum-800/50" />
        ))}
      </ul>
    </div>
  );
}

function Empty({ listed }: { listed: boolean }) {
  return (
    <div className="py-6 text-center">
      <span className="mx-auto block w-fit">
        <PixelIcon uri={illustration('crown')} size={48} />
      </span>
      <p className="mt-2 text-base font-bold text-violet-50">Nobody is listed here yet.</p>
      <p className="mt-1 text-sm text-violet-200">
        {listed
          ? 'You are on the board. This one just has nobody else in it.'
          : 'Join above to be the first.'}
      </p>
    </div>
  );
}

function RowAvatar({ row, me, size }: { row: Standing; me?: BoardMe; size: 'xs' | 'sm' }) {
  // Your own avatar and frame come from your own profile. Anybody else's appears only if the
  // standings function publishes them, which it does not today, and only for a plant with art.
  if (row.isSelf && me && me.avatarHerbId) {
    return (
      <ProfileAvatar
        herbId={me.avatarHerbId}
        frame={me.frame}
        stage={me.stage}
        size={size}
        frozen
      />
    );
  }
  if (!row.isSelf && row.avatarHerbId && hasSprite(row.avatarHerbId)) {
    return (
      <ProfileAvatar
        herbId={row.avatarHerbId}
        frame={getFrame(row.frameId) ?? getFrame(DEFAULT_FRAME_ID)!}
        stage="flowering"
        size={size}
        frozen
      />
    );
  }
  return null;
}

function RankStrip({ rows, me }: { rows: Standing[]; me?: BoardMe }) {
  const mine = selfOf(rows);
  if (!mine) return null;
  const gap = gapToNext(rows, mine);
  const text =
    gap.kind === 'gap'
      ? `${gap.points.toLocaleString()} pts to reach ${ordinal(gap.toStanding)}`
      : gap.kind === 'lead'
        ? `You lead by ${gap.points.toLocaleString()} pts`
        : gap.kind === 'tied'
          ? `Tied for ${ordinal(gap.standing)}`
          : 'You are first on this board';
  return (
    <section aria-label="Your rank" className="holo-border rounded-2xl px-3 py-2.5">
      <div className="flex items-center gap-3">
        <RowAvatar row={mine} me={me} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-extrabold text-violet-50">
            {me?.name ?? mine.displayName ?? 'You'}
          </p>
          {me?.title && <p className="truncate text-xs text-gold-300">{me.title}</p>}
        </div>
        <div className="text-right">
          <p className="font-display text-4xl leading-none font-extrabold text-gold-plate">
            {ordinal(mine.standing)}
          </p>
          <p className="text-sm font-bold text-violet-100 tabular-nums">
            {mine.points.toLocaleString()} pts
          </p>
        </div>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-violet-100">{text}</p>
    </section>
  );
}

function Standings({
  rows,
  listed,
  shown,
  onMore,
  scope,
  memberRegion,
  me,
}: {
  rows: Standing[];
  listed: boolean;
  shown: number;
  onMore: () => void;
  scope: BoardScope;
  memberRegion: string | null;
  me?: BoardMe;
}) {
  const podium = podiumOf(rows);
  const rest = beyondPodium(rows, shown);
  const left = remainingAfter(rows, shown);
  const note = placeNote(rows, listed, isFull(rows));
  const otherRegion = scope.kind === 'region' && memberRegion !== scope.id;

  return (
    <div>
      {note.kind === 'place' ? (
        <div className="mb-4">
          <RankStrip rows={rows} me={me} />
        </div>
      ) : note.kind === 'outside' ? (
        <p className="mb-3 text-center text-sm text-violet-200">
          You are listed, but outside the top {rows.length} shown here.
        </p>
      ) : note.kind === 'elsewhere' && otherRegion ? (
        <p className="mb-3 text-center text-sm text-violet-200">
          You are listed on a different board. Switch above to see your place.
        </p>
      ) : null}

      <ol aria-label="Top three" className="mx-auto flex max-w-sm items-end justify-center gap-2">
        {podium.map(({ place, row }, index) => (
          <li
            key={`${row.standing}-${index}`}
            className="board-rise flex min-w-0 flex-1 flex-col items-center"
            style={{ animationDelay: `${index * 110}ms` }}
          >
            {/* A real Plantdex sprite stands on each step. Decorative: chosen by place, never a
                player's own plant. */}
            <span aria-hidden="true" className="block w-14">
              <PlantSprite herbId={PODIUM_PLANTS[place]} alt="" fit />
            </span>
            <p
              className={`mt-1 w-full truncate text-center text-sm font-bold ${
                row.isSelf ? 'holo-border rounded px-1 text-violet-50' : 'text-violet-50'
              }`}
              title={nameOf(row)}
            >
              {nameOf(row)}
            </p>
            {row.regionId && (
              <p className="text-[0.72rem] leading-tight text-violet-300">
                {regionById(row.regionId)?.name}
              </p>
            )}
            <p className="mt-0.5 text-sm font-extrabold text-gold-300 tabular-nums">
              {row.points.toLocaleString()} pts
            </p>
            <div
              className={`mt-1.5 flex w-full flex-col items-center rounded-t-md bg-gradient-to-b pt-1 font-display leading-none font-extrabold shadow-[inset_0_3px_0_rgb(255_255_255/0.5)] ${STEP[place].tone}`}
              style={{ height: STEP[place].height }}
            >
              <span aria-hidden="true">
                <PixelIcon uri={trophyArt(place)} size={place === 1 ? 40 : 34} />
              </span>
              <span className="mt-0.5 text-2xl">
                <span className="sr-only">{STEP[place].label}, standing </span>
                {row.standing}
              </span>
            </div>
          </li>
        ))}
      </ol>
      <div aria-hidden="true" className="mx-auto h-1.5 max-w-sm bg-violet-500/60" />

      {rest.length > 0 && (
        <ol className="mt-3" start={4}>
          {rest.map((row, index) => (
            <li
              key={`${row.standing}-${index}`}
              className={`flex items-center gap-3 py-2 ${
                row.isSelf
                  ? 'holo-border my-1 rounded-xl px-2'
                  : 'border-t border-violet-500/20 first:border-t-0'
              }`}
            >
              <span className="font-display w-9 shrink-0 text-right text-lg font-extrabold text-violet-200 tabular-nums">
                {row.standing}
              </span>
              <RowAvatar row={row} me={me} size="xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-violet-50">
                  {nameOf(row)}
                  {row.isSelf && (
                    <span className="ml-2 rounded-full bg-gold-500 px-2 py-0.5 text-[0.72rem] font-extrabold text-violet-deep">
                      You
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-violet-300">
                  {row.regionId ? `${regionById(row.regionId)?.name} \u00b7 ` : ''}
                  {countsLine(row)}
                </span>
              </span>
              <span className="shrink-0 text-base font-extrabold text-gold-300 tabular-nums">
                {row.points.toLocaleString()}
                <span className="ml-0.5 text-xs font-bold text-violet-300">pts</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      {left > 0 && (
        <button
          type="button"
          onClick={onMore}
          className="mx-auto mt-3 flex min-h-11 items-center rounded-full border border-violet-400/70 px-5 text-sm font-semibold text-violet-100 hover:bg-plum-700"
        >
          Show more ({left} left)
        </button>
      )}
    </div>
  );
}
