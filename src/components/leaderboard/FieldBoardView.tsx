'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  LEADERBOARD_POINTS,
  SCORING_RULES,
  scoreFromRecords,
} from '@/lib/leaderboard';
import {
  fetchMembership,
  fetchStandings,
  joinLeaderboard,
  leaveLeaderboard,
  type Standing,
} from '@/lib/remote-leaderboard';
import { launchedRegions, regionById } from '@/lib/regions';
import { useSightingsStore } from '@/lib/sightings-store';
import { useAuth } from '@/state/AuthProvider';
import { useHerbdex } from '@/state/HerbdexProvider';
import { Panel } from '@/components/ui/Panel';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EYEBROW } from '@/components/ui/accents';

/**
 * THE FIELD BOARD.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE FIRST PUBLIC SURFACE IN THIS PRODUCT, AND IT IS OPT-IN FOR THAT REASON.
 *
 * Everything else here is owner-only by design: `/profile` has no public version, there are
 * no followers, no feed and no comments, and `/privacy` said in those words that there were
 * no leaderboards either. This page changes that for whoever joins, so joining is a decision
 * somebody makes — a row in `leaderboard_participants` IS the consent, and without one the
 * account appears nowhere and is not readable through the standings function at all.
 *
 * WHAT IS PUBLISHED, EXHAUSTIVELY: a display name the player chose (or nothing, if they
 * chose nothing), a region at state scale if they picked one, and counts. The journal's own
 * free-text `region` field — the one that could name the patch a plant is growing in — is
 * never read by the board, and nor are notes, photographs, dates or scans. See the return
 * signature of `leaderboard_standings()` in migration 0011 and the test that pins it.
 *
 * EVERY SCORE HERE IS SELF-REPORTED, AND THE PAGE SAYS SO ABOVE THE TABLE RATHER THAN IN A
 * FOOTNOTE. Plantdex verifies nothing — `DiscoverPanel` records a find from two taps and no
 * camera, and an identifier's answer is a suggestion (CLAUDE.md, "Progression is
 * self-declared"). The brief that asked for this board also asked that provisional points not
 * be dressed up as verified ones; with no verification mechanism in the product, the honest
 * form of that is to say plainly that none of it is checked.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** The scope the table is showing. `null` is everybody. */
type Scope = { kind: 'global' } | { kind: 'region'; id: string };

export function FieldBoardView() {
  const { user, ready: authReady, configured } = useAuth();
  const { state, ready } = useHerbdex();
  const { sightings } = useSightingsStore();

  const [scope, setScope] = useState<Scope>({ kind: 'global' });
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [membership, setMembership] = useState<{ regionId: string | null } | null | undefined>(
    undefined,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * The player's own score, computed on this device from their own records by the same
   * module the board's SQL mirrors. It is shown whether or not they are listed, and whether
   * or not they are signed in — a field score is a fact about somebody's collection, and
   * being ON the board is a separate decision about publishing it.
   */
  const own = scoreFromRecords(state, sightings);

  const regions = launchedRegions();

  /*
   * THE FETCH IS A FUNCTION OUTSIDE THIS COMPONENT THAT SETS NO STATE, and every setState is
   * in a `.then` callback with a liveness flag. Two reasons, and only one of them is the
   * linter.
   *
   *   An async function's body runs SYNCHRONOUSLY up to its first `await`, so an
   *   `async () => { setError(null); await ... }` called from an effect is a synchronous
   *   setState in that effect — a cascading render, which `react-hooks/set-state-in-effect`
   *   refuses outright. Subscribing to an external system and setting state in its callback
   *   is the shape the rule exists to allow.
   *
   *   And the flag is a real fix, not a ceremony: switching scope twice quickly issues two
   *   requests, and without it the SLOWER one wins whenever it happens to land second. The
   *   board would then show one region's standings under another region's button.
   */
  const reload = useCallback(() => {
    if (!user) return undefined;
    const userId = user.id;
    const regionId = scope.kind === 'region' ? scope.id : null;
    let live = true;
    void Promise.all([fetchStandings({ regionId }), fetchMembership(userId)])
      .then(([rows, mine]) => {
        if (!live) return;
        setStandings(rows);
        setMembership(mine);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!live) return;
        setError(cause instanceof Error ? cause.message : 'Could not load the board.');
        setStandings([]);
      });
    return () => {
      live = false;
    };
  }, [user, scope]);

  useEffect(() => reload(), [reload]);

  const join = useCallback(
    async (regionId: string | null) => {
      if (!user) return;
      setBusy(true);
      setError(null);
      try {
        await joinLeaderboard(user.id, regionId);
        reload();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not join the board.');
      }
      setBusy(false);
    },
    [user, reload],
  );

  const leave = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await leaveLeaderboard(user.id);
      reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not leave the board.');
    }
    setBusy(false);
  }, [user, reload]);

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-extrabold text-gold-plate">Field Board</h1>
      <p className="mt-1 text-sm text-violet-300">
        How much field work players have put in, compared with each other.
      </p>

      {/*
        THE HONESTY LINE, ABOVE THE TABLE AND NOT UNDER IT.

        It is the first thing read because it changes how every number below should be read.
        "Provisional" is not a hedge here — it is the accurate word for a score built out of
        records nobody checked, and this product has no mechanism that could check them.
      */}
      <Panel family="science" className="mt-5" aria-labelledby="provisional-heading">
        <SectionHeader
          id="provisional-heading"
          title="These scores are provisional"
          size="md"
          note="Plantdex does not verify that anybody went outside. A find is recorded because a player said so, and a plant identifier only ever suggests a species. Nothing here is a confirmed identification or a checked record — it is self-reported field work, shown honestly as that."
        />
      </Panel>

      {/* ── Your own score ───────────────────────────────────────────────── */}
      <Panel family="game" clip className="mt-5" aria-labelledby="own-heading">
        <SectionHeader
          id="own-heading"
          title="Your field score"
          accent="gold"
          size="lg"
          right={
            <span className="font-display text-2xl font-extrabold text-gold-plate tabular-nums">
              {ready ? own.points.toLocaleString() : '—'}
            </span>
          }
        />
        <dl className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Species found', value: own.discoveries, points: own.discoveryPoints },
            { label: 'Journal entries', value: own.journalEntries, points: own.journalPoints },
            { label: 'Challenges', value: own.challenges, points: own.challengePoints },
          ].map((row) => (
            <div key={row.label} className="rounded-xl border border-violet-700/70 p-3">
              <dt className={`${EYEBROW} text-violet-300`}>{row.label}</dt>
              <dd className="mt-1 font-display text-xl font-bold text-violet-100 tabular-nums">
                {ready ? row.value.toLocaleString() : '—'}
              </dd>
              <dd className="text-xs text-violet-400 tabular-nums">
                {ready ? `${row.points.toLocaleString()} pts` : ''}
              </dd>
            </div>
          ))}
        </dl>
        {/*
          EVERY PART OF THIS IS RECOMPUTABLE BY THE PLAYER, which is what "auditable" means
          here. The three rows above are the three sources, each one countable from records
          they can download in their own account export — there is no fourth term and no
          adjustment anybody applied.
        */}
        <p className="mt-3 text-xs leading-relaxed text-violet-400">
          Counted from your own records, on this device. Nothing stores a score: it is added up
          from what you have found, written and completed, which is also why you can check it.
        </p>
      </Panel>

      {/* ── How points are earned ────────────────────────────────────────── */}
      <Panel family="field" className="mt-5" aria-labelledby="rules-heading">
        <SectionHeader id="rules-heading" title="How points are earned" size="lg" />
        <ul className="space-y-3">
          {SCORING_RULES.map((rule) => (
            <li key={rule.what} className="flex gap-3">
              <span className="font-display mt-0.5 w-12 shrink-0 text-right text-lg font-extrabold text-gold-400 tabular-nums">
                +{rule.points}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-violet-100">{rule.what}</span>
                <span className="block text-xs leading-relaxed text-violet-300">{rule.note}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-violet-400">
          The daily limit runs on UTC rather than your own clock, so that it means the same
          thing for everybody on the board. Entries past it are kept in your journal as normal —
          they simply earn nothing.
        </p>
      </Panel>

      {/* ── The board itself ─────────────────────────────────────────────── */}
      {!configured || !user ? (
        <Panel className="mt-5 text-center" aria-labelledby="signin-heading">
          <SectionHeader id="signin-heading" title="The board needs an account" size="lg" />
          <p className="text-sm leading-relaxed text-violet-200">
            Standings are only readable by signed-in players, and you only appear on them if you
            ask to be listed. Your collection works exactly the same either way.
          </p>
          {configured && (
            <Link
              href="/account"
              className="mt-4 inline-flex min-h-11 items-center rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400"
            >
              Sign in
            </Link>
          )}
        </Panel>
      ) : (
        <>
          <Panel family="game" className="mt-5" aria-labelledby="listing-heading">
            <SectionHeader
              id="listing-heading"
              title={membership ? 'You are listed' : 'You are not listed'}
              size="lg"
              note={
                membership
                  ? 'Your display name, your region and your counts are visible to other signed-in players. Nothing else is.'
                  : 'Nobody can see you on the board. Joining publishes your display name, your region and your counts — never your journal notes, your photographs or any place you have written down.'
              }
            />
            {authReady && membership === undefined ? (
              <p className="text-sm text-violet-300">Checking…</p>
            ) : membership ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-violet-200">
                  Ranked {membership.regionId ? `in ${regionById(membership.regionId)?.name}` : 'globally'}
                </span>
                <button
                  type="button"
                  onClick={() => void leave()}
                  disabled={busy}
                  className="min-h-11 rounded-full border border-violet-500 px-5 text-sm font-semibold text-violet-200 hover:bg-plum-600 disabled:opacity-60"
                >
                  Leave the board
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void join(null)}
                  disabled={busy}
                  className="min-h-11 rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep hover:bg-gold-400 disabled:opacity-60"
                >
                  Join the board
                </button>
                {regions.map((region) => (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => void join(region.id)}
                    disabled={busy}
                    className="min-h-11 rounded-full border border-gold-500/70 px-5 text-sm font-semibold text-gold-300 hover:bg-plum-700 disabled:opacity-60"
                  >
                    Join as {region.name}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs leading-relaxed text-violet-400">
              Your name on the board is the display name on{' '}
              <Link href="/profile" className="underline underline-offset-2 hover:text-violet-200">
                your profile
              </Link>
              . Set one, or leave it blank and be listed without a name.
            </p>
          </Panel>

          <section aria-labelledby="standings-heading" className="mt-6">
            <SectionHeader
              id="standings-heading"
              title="Standings"
              size="lg"
              right={
                /*
                  REGION SCOPE, NOT A LOCATION FILTER. The only regions offered are the ones
                  `regions.ts` has launched — country and state scale — and a player is in one
                  only because they said so when they joined.
                */
                <span className="flex flex-wrap gap-1.5">
                  <ScopeButton
                    active={scope.kind === 'global'}
                    onClick={() => setScope({ kind: 'global' })}
                  >
                    Everyone
                  </ScopeButton>
                  {regions.map((region) => (
                    <ScopeButton
                      key={region.id}
                      active={scope.kind === 'region' && scope.id === region.id}
                      onClick={() => setScope({ kind: 'region', id: region.id })}
                    >
                      {region.name}
                    </ScopeButton>
                  ))}
                </span>
              }
            />

            {error && (
              <p role="alert" className="text-sm font-semibold text-stat-temp">
                {error}
              </p>
            )}

            {standings === null ? (
              <p className="text-sm text-violet-300">Loading the board…</p>
            ) : standings.length === 0 ? (
              <Panel className="text-center">
                <p className="text-sm text-violet-200">Nobody is listed here yet.</p>
                <p className="mt-2 text-sm text-violet-300">
                  {membership
                    ? 'You are on the board — this scope just has nobody in it.'
                    : 'Join above to be the first.'}
                </p>
              </Panel>
            ) : (
              <StandingsTable rows={standings} />
            )}
          </section>
        </>
      )}

      <p className="mt-8 text-xs leading-relaxed text-violet-400">
        A discovery is worth {LEADERBOARD_POINTS.discovery} points because going outside is what
        this is for. Nothing on this board unlocks anything, costs anything or changes your
        collection.
      </p>
    </main>
  );
}

function ScopeButton({
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
      className={`min-h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${
        active
          ? 'border-gold-500 bg-gold-500/20 text-gold-300'
          : 'border-violet-600 text-violet-300 hover:bg-plum-700'
      }`}
    >
      {children}
    </button>
  );
}

/**
 * A real `<table>`, because this is tabular data and a screen reader reading a grid of divs
 * gets a list of numbers with nothing to attach them to. `scope="col"` on the headers is what
 * makes "Olive, 1,250 points, 14 species" come out as a sentence.
 *
 * NO EMPTY CIRCLE FOR A MISSING NAME. A player who never set a display name is listed without
 * one, and the row says so in words — inventing "Player 4" would be naming somebody who
 * declined to be named.
 */
function StandingsTable({ rows }: { rows: readonly Standing[] }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left text-sm">
        <caption className="sr-only">
          Field Board standings. Scores are self-reported and not verified.
        </caption>
        <thead>
          <tr className={`${EYEBROW} text-violet-300`}>
            <th scope="col" className="px-3 py-2 text-right">
              #
            </th>
            <th scope="col" className="px-3 py-2">
              Player
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Points
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Species
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Entries
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              With photo
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.standing}-${row.displayName ?? ''}-${index}`}
              className={`border-t border-violet-800/60 ${
                row.isSelf ? 'bg-gold-500/10 text-violet-100' : 'text-violet-200'
              }`}
            >
              <td className="px-3 py-2 text-right font-bold tabular-nums">{row.standing}</td>
              <td className="px-3 py-2">
                <span className="font-semibold">
                  {row.displayName ?? <span className="text-violet-400">No name set</span>}
                </span>
                {row.isSelf && (
                  <span className="ml-2 rounded-full bg-gold-500 px-2 py-0.5 text-[0.72rem] font-bold text-violet-deep">
                    You
                  </span>
                )}
                {row.regionId && (
                  <span className="block text-xs text-violet-400">
                    {regionById(row.regionId)?.name}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-bold tabular-nums">
                {row.points.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{row.discoveries}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.journalEntries}</td>
              {/*
                REPORTED, NEVER SCORED. A photograph is better evidence than a tap and still
                not proof, so it sits beside the score rather than inside it — which is also
                what stops the board quietly becoming "whoever uploads the most pictures".
              */}
              <td className="px-3 py-2 text-right tabular-nums text-violet-400">
                {row.photoBackedEntries}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
