'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { DiscoveryResult, Herb } from '@/lib/types';
import { getAchievement } from '@/lib/achievements';
import { progressFromXp } from '@/lib/progression';
import { assetPath } from '@/lib/asset-path';
import { CountUp } from './CountUp';

/**
 * The discovery celebration: reveal, reward, progress.
 *
 * Sequenced deliberately rather than firing everything at once — the card flips first,
 * then the XP lands, then the bar moves. Each beat is short; the whole thing is under a
 * second and a half, and a single `revealed` flag drives all of it so reduced-motion
 * users simply start at the end state.
 *
 * `xpAfter` is the player's total *after* the discovery, so the value before it is
 * `xpAfter - xpAwarded`. That is what makes the bar and the number animate from the real
 * previous state rather than from zero.
 */
export function DiscoveryCelebration({
  herb,
  result,
  xpAfter,
  onClose,
}: {
  herb: Herb;
  result: DiscoveryResult;
  xpAfter: number;
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  const xpBefore = xpAfter - result.xpAwarded;
  const before = progressFromXp(xpBefore);
  const after = progressFromXp(xpAfter);
  const leveledUp = after.level > before.level;

  // On a level-up the bar would otherwise animate *backwards* (say 92% -> 8%). Fill the
  // old level to 100% first, then swap to the new level and fill from empty.
  const [barPhase, setBarPhase] = useState<'start' | 'filling' | 'newLevel'>('start');

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Next frame, so the browser paints the start state before the transition begins.
    timers.push(setTimeout(() => setRevealed(true), 60));
    timers.push(setTimeout(() => setBarPhase('filling'), 700));
    if (leveledUp) timers.push(setTimeout(() => setBarPhase('newLevel'), 1500));
    return () => timers.forEach(clearTimeout);
  }, [leveledUp]);

  const shownLevel = leveledUp && barPhase !== 'newLevel' ? before : after;
  const barPct =
    barPhase === 'start'
      ? before.fraction * 100
      : leveledUp
        ? barPhase === 'filling'
          ? 100
          : after.fraction * 100
        : after.fraction * 100;

  return (
    <div className="text-center">
      <p className="text-xs font-bold tracking-[0.2em] text-violet-300 uppercase">
        New discovery
      </p>
      <h2 id="celebrate-title" className="font-display mt-1 text-2xl font-bold text-gold-plate">
        {herb.commonName}
      </h2>
      <p className="font-botanical text-sm text-violet-300 italic">{herb.scientificName}</p>

      {/* The card the player tapped, flipping from its locked silhouette to the real art. */}
      <div className="flip-scene mx-auto mt-4 w-44">
        <div className={`flip-card ${revealed ? 'flip-card-revealed' : ''}`}>
          <div className="flip-face">
            <Image
              src={assetPath(herb.thumb)}
              alt=""
              aria-hidden="true"
              width={400}
              height={648}
              className="w-full scale-105 blur-[3.5px] brightness-[0.62] contrast-[1.05] saturate-0"
            />
          </div>
          {/* No `relative` here: flip-face-back is already absolutely positioned, which
              both stacks the faces and gives the sheen pseudo-element its containing
              block. Adding `relative` would override it and stack the faces vertically. */}
          <div className="flip-face flip-face-back animate-sheen shadow-card-lift">
            <Image
              src={assetPath(herb.image)}
              alt={`Plantdex card ${herb.cardNumber}: ${herb.commonName} (${herb.scientificName})`}
              width={800}
              height={1295}
              priority
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* One polite announcement covering the whole outcome, rather than three. */}
      <p className="sr-only" role="status">
        {herb.commonName} discovered. {result.xpAwarded} XP earned. Level {after.level},{' '}
        {after.levelName}.
        {leveledUp ? ` Level up from ${before.level}.` : ''}
        {result.newAchievementIds.length > 0
          ? ` Achievement unlocked: ${result.newAchievementIds
              .map((id) => getAchievement(id)?.name ?? id)
              .join(', ')}.`
          : ''}
      </p>

      <p aria-hidden="true" className="mt-4 text-2xl font-bold text-gold-400 tabular-nums">
        <CountUp from={0} to={result.xpAwarded} prefix="+" durationMs={700} /> XP
      </p>

      {/* Updated progress */}
      <div className="panel mt-4 p-3 text-left">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <p className="text-sm font-bold text-gold-300">
            Level {shownLevel.level} — {shownLevel.levelName}
          </p>
          <p aria-hidden="true" className="text-xs font-semibold text-violet-200 tabular-nums">
            <CountUp from={xpBefore} to={xpAfter} durationMs={900} />
            {after.nextLevelXp !== null && (
              <span className="text-violet-400"> / {after.nextLevelXp.toLocaleString()}</span>
            )}{' '}
            XP
          </p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-violet-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-500 to-pink-accent transition-[width] duration-700 ease-out motion-reduce:transition-none"
            style={{ width: `${barPct}%` }}
          />
        </div>
        {leveledUp && (
          <p className="animate-rise-in mt-2 text-xs font-bold text-gold-400">
            <span aria-hidden="true">▲</span> Level up — you are now {after.levelName}
          </p>
        )}
      </div>

      {result.newAchievementIds.length > 0 && (
        <ul className="mt-3 space-y-2">
          {result.newAchievementIds.map((id) => {
            const achievement = getAchievement(id);
            if (!achievement) return null;
            return (
              <li
                key={id}
                className="animate-toast-in rounded-xl border border-gold-500/60 bg-gold-500/15 px-3 py-2 text-left"
              >
                <p className="text-sm font-bold text-gold-300">
                  <span aria-hidden="true">{achievement.icon}</span> Achievement unlocked —{' '}
                  {achievement.name}
                </p>
                <p className="text-xs text-violet-200">{achievement.description}</p>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-5 min-h-11 w-full rounded-full bg-gold-500 px-5 text-sm font-bold text-violet-deep transition-transform hover:bg-gold-400 active:scale-[0.99] motion-reduce:active:scale-100"
      >
        Continue
      </button>
    </div>
  );
}
