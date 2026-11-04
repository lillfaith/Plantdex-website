'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo } from 'react';
import { track } from '@/lib/analytics';
import { assetPath } from '@/lib/asset-path';
import { chipArt } from '@/lib/card-art';
import { getPrintedCard } from '@/lib/deck';
import {
  QUEST_TIERS, boardProgress, questBoard, regionalCollection,
  type BoardSeason, type QuestTier,
} from '@/lib/quest-board';
import { useRegion } from '@/lib/region-store';
import { featuredForRegion, speciesForRegion } from '@/lib/region-species';
import { useHerbdex } from '@/state/HerbdexProvider';

/**
 * The regional board: a lens over cards the player could plausibly find nearby.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IT AWARDS NOTHING AND GATES NOTHING.
 *
 * Every plant here is an existing card, every link goes to the page that card already has,
 * and a find made from it is the ordinary discovery the scanner and the card page already
 * record. Progress is counted from `discoveries` on each render, so a player who found
 * these last year opens the board with the tier already complete, and a second find of the
 * same plant changes nothing — there is no counter here to increment twice.
 *
 * THE WHOLE REGIONAL COLLECTION IS SHOWN BELOW THE BOARD, not just the featured thirteen.
 * Featuring is an editorial choice about a good first experience; it is never a statement
 * that the rest are unsuitable, and a player must be able to find and collect any of them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const TIER_COPY: Record<QuestTier, { title: string; blurb: string }> = {
  starter: {
    title: 'Start here',
    blurb: 'Common plants of verges, lawns and the edges of paths. No special trip needed.',
  },
  main: {
    title: 'The collection',
    blurb: 'A walk somewhere open or wooded will turn most of these up.',
  },
  stretch: {
    title: 'Worth going out for',
    blurb: 'Scarcer, or particular about where they grow.',
  },
};

/** The meteorological season, read once per render from the caller's clock. */
export function seasonOf(date: Date): BoardSeason {
  const month = date.getMonth() + 1;
  if (month <= 2 || month === 12) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

function PlantChip({ herbId, found }: { herbId: string; found: boolean }) {
  const card = getPrintedCard(herbId);
  if (!card) return null;
  return (
    <li>
      <Link
        href={`/herbdex/${card.id}`}
        onClick={() => track('quest_plant_opened')}
        className="flex min-h-11 items-center gap-3 rounded-lg border border-violet-800/60 p-2 transition hover:border-gold-400/60"
      >
        <Image
          src={assetPath(chipArt(card))}
          alt=""
          width={112}
          height={179}
          loading="lazy"
          /*
            The chip variant, 112px, is what `/herbdex/research` uses for a strip this size.
            Naming the 400px thumbnail here would ship four times the bytes to draw the same
            pixels, which is the one lever `images.unoptimized` leaves available.
          */
          className={`h-14 w-9 shrink-0 rounded object-cover ${found ? '' : 'opacity-40 grayscale'}`}
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-violet-100">
            {card.commonName}
          </span>
          <span className="block truncate text-xs text-violet-400">
            {found ? 'Found' : 'Not yet found'}
          </span>
        </span>
      </Link>
    </li>
  );
}

export function QuestBoardPanel({ now = new Date() }: { now?: Date }) {
  const { region, ready: regionReady } = useRegion();
  const { state, ready } = useHerbdex();

  const season = seasonOf(now);
  const featured = useMemo(() => featuredForRegion(region?.id), [region?.id]);
  const board = useMemo(
    () => (region ? questBoard(region.id, season, now.getFullYear(), featured) : null),
    [region, season, now, featured],
  );
  const collection = useMemo(() => regionalCollection(speciesForRegion(region?.id)), [region?.id]);

  // LOADING. Two sources have to settle — the region and the collection — and showing the
  // empty state while either is pending would tell a returning player they have no region
  // and no finds, which is wrong twice.
  if (!regionReady || !ready) {
    return (
      <div className="panel p-5" aria-busy="true">
        <p className="text-sm text-violet-300">Loading your region&hellip;</p>
      </div>
    );
  }

  // EMPTY. No region chosen is a legitimate, permanent state: Plantdex works everywhere and
  // the board is an addition, never a gate.
  if (!region || !board) {
    return (
      <div className="panel p-5">
        <h2 className="text-sm font-bold tracking-wide text-gold-400 uppercase">
          Plants near you
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-violet-200">
          Choose a region and Plantdex will show which of its plants are recorded growing
          there. The whole collection stays available either way.
        </p>
      </div>
    );
  }

  const progress = boardProgress(board, state.discoveries);
  const byTier = (tier: QuestTier) => board.entries.filter((entry) => entry.tier === tier);

  return (
    <div className="space-y-6">
      <div className="panel p-5">
        <h2 className="text-sm font-bold tracking-wide text-gold-400 uppercase">
          {region.name}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-violet-200">
          {collection.length} plants from the deck are recorded growing in {region.name}.
          These are the ones to start with.
        </p>
      </div>

      {QUEST_TIERS.map((tier) => {
        const entries = byTier(tier);
        if (entries.length === 0) return null;
        const { found, total } = progress[tier];
        return (
          <section key={tier} className="panel p-5" aria-labelledby={`tier-${tier}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 id={`tier-${tier}`} className="text-sm font-bold text-violet-100">
                {TIER_COPY[tier].title}
              </h3>
              <p className="text-xs tabular-nums text-violet-300">
                {found} of {total} found
              </p>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-violet-400">
              {TIER_COPY[tier].blurb}
            </p>
            {/* `path-fill` is the same 800ms width transition every other meter uses. */}
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-plum-800">
              <div
                className="path-fill h-full rounded-full bg-gold-400"
                style={{ width: `${total === 0 ? 0 : (found / total) * 100}%` }}
              />
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {entries.map((entry) => (
                <PlantChip
                  key={entry.herbId}
                  herbId={entry.herbId}
                  found={Boolean(state.discoveries[entry.herbId])}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {/*
        EVERY findable plant, not only the featured ones. This is what makes "discoverable
        even when not on the board" a property of the page rather than a promise.
      */}
      <section className="panel p-5" aria-labelledby="whole-region">
        <h3 id="whole-region" className="text-sm font-bold text-violet-100">
          Everything else recorded in {region.name}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-violet-400">
          Not on the board, and just as collectible. Finding any of them unlocks its card
          exactly the same way.
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {collection
            .filter((card) => !board.entries.some((entry) => entry.herbId === card.id))
            .map((card) => (
              <PlantChip
                key={card.id}
                herbId={card.id}
                found={Boolean(state.discoveries[card.id])}
              />
            ))}
        </ul>
      </section>

      <p className="text-xs leading-relaxed text-violet-400">
        {/*
          The safety line belongs ON the board, where somebody is deciding to go out — not
          only on the pages they reach afterwards. It says look, never pick.
        */}
        Plantdex records what you find. Look and photograph; do not pick, eat or disturb
        anything, and stay off private land. A card is not an identification.
      </p>
    </div>
  );
}
