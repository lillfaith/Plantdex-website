'use client';

import { useCallback, useEffect, useState } from 'react';
import { scoreFromRecords } from '@/lib/leaderboard';
import { BOARD_FETCH_LIMIT } from '@/lib/board-view';
import {
  fetchMembership,
  fetchStandings,
  joinLeaderboard,
  leaveLeaderboard,
  type Standing,
} from '@/lib/remote-leaderboard';
import { launchedRegions } from '@/lib/regions';
import { useSightingsStore } from '@/lib/sightings-store';
import { useAuth } from '@/state/AuthProvider';
import { BoardScreen, type BoardScope } from './BoardScreen';
import { useHerbdex } from '@/state/HerbdexProvider';

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
export function FieldBoardView() {
  const { user, ready: authReady, configured } = useAuth();
  const { state, ready } = useHerbdex();
  const { sightings } = useSightingsStore();

  const [scope, setScope] = useState<BoardScope>({ kind: 'global' });
  const [standings, setStandings] = useState<Standing[] | null>(null);
  const [membership, setMembership] = useState<{ regionId: string | null } | null | undefined>(
    undefined,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Added up from the player's own records on this device; nothing stores a score.
  const own = scoreFromRecords(state, sightings);
  const regions = launchedRegions();

  const reload = useCallback(() => {
    if (!user) return undefined;
    const userId = user.id;
    const regionId = scope.kind === 'region' ? scope.id : null;
    let live = true;
    // The whole board in one call, so the player's own row is found wherever it sits (up to
    // the function's cap) and "Show more" is a slice rather than another request.
    void Promise.all([
      fetchStandings({ regionId, limit: BOARD_FETCH_LIMIT }),
      fetchMembership(userId),
    ])
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

  const access = !configured ? 'unconfigured' : !user ? 'signedOut' : 'member';

  return (
    <BoardScreen
      access={access}
      own={{
        ready,
        points: own.points,
        discoveries: own.discoveries,
        journalEntries: own.journalEntries,
        challenges: own.challenges,
      }}
      membership={authReady ? membership : undefined}
      standings={standings}
      error={error}
      scope={scope}
      regions={regions}
      busy={busy}
      onScope={(next) => {
        setStandings(null);
        setScope(next);
      }}
      onJoin={(regionId) => void join(regionId)}
      onLeave={() => void leave()}
      onRetry={() => {
        setStandings(null);
        setError(null);
        reload();
      }}
    />
  );
}
