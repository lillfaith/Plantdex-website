'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BOARD_FETCH_LIMIT, boardCardLine, selfOf, type BoardCardState } from '@/lib/board-view';
import { fetchMembership, fetchStandings } from '@/lib/remote-leaderboard';
import { useAuth } from '@/state/AuthProvider';
import { PlantdexIcon } from '../icons/PlantdexIcon';

/**
 * THE FIELD BOARD'S DOOR ON THE COLLECTION PAGE, between your progress and the daily tasks.
 *
 * A COMPACT STRIP, NOT A PANEL: a trophy and the word Leaderboard, about a third of the height
 * of the first version, which carried a description and a rank line. The place is still
 * announced to a screen reader. Everything the longer card said lives on the board's own page.
 *
 * The board was reachable only by typing /leaderboard or finding the Garden's links, which is
 * how a feature nobody can find stops being used. This is a link and a sentence: no score is
 * computed here and nothing is stored. The rank, when there is one, is the standings
 * function's own row for you (`selfOf`), the same one the board page shows, so the card and
 * the page cannot disagree.
 *
 * IT NEVER CLAIMS A RANK YOU DO NOT HAVE. The board is opt-in, so a signed-out player and a
 * signed-in player who has not joined each get a different honest line, and while the
 * standings load, or if they cannot be fetched, the card says nothing extra rather than
 * guessing. Every failure is swallowed: a door that errors is worse than a door without a
 * name on it.
 */
export function FieldBoardCard() {
  const { ready, configured, user } = useAuth();
  // Keyed by account, so a result fetched for one account is never shown for another.
  const [fetched, setFetched] = useState<{ userId: string; state: BoardCardState } | null>(null);

  const userId = user?.id;
  useEffect(() => {
    if (!ready || !configured || !userId) return;
    let live = true;
    const settle = (state: BoardCardState) => {
      if (live) setFetched({ userId, state });
    };
    Promise.all([fetchMembership(userId), fetchStandings({ limit: BOARD_FETCH_LIMIT })])
      .then(([membership, rows]) => {
        const me = selfOf(rows);
        if (me) settle({ kind: 'listed', standing: me.standing, points: me.points });
        else settle(membership ? { kind: 'unavailable' } : { kind: 'notListed' });
      })
      .catch(() => settle({ kind: 'unavailable' }));
    return () => {
      live = false;
    };
  }, [ready, configured, userId]);

  // Signed out and unconfigured are answers in themselves and need no fetch.
  const board: BoardCardState = !ready
    ? { kind: 'loading' }
    : !configured
      ? { kind: 'unavailable' }
      : !userId
        ? { kind: 'signedOut' }
        : fetched?.userId === userId
          ? fetched.state
          : { kind: 'loading' };

  const line = boardCardLine(board);

  return (
    <Link
      href="/leaderboard"
      className="tap-44 panel flex h-[2.4rem] flex-col items-center justify-center border-gold-500/40 transition-colors hover:bg-plum-600/50"
    >
      <PlantdexIcon name="trophy" className="text-lg leading-none text-gold-300" />
      <span className="text-[0.65rem] leading-none font-bold tracking-wide text-gold-400">
        Leaderboard
      </span>
      {/* Your place, for a screen reader and only when there is one: the strip itself is a
          trophy and a word, and the Field Board page says everything else. */}
      {line && <span className="sr-only">. {line}</span>}
    </Link>
  );
}
