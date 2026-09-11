'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CHIP_WIDTH, chipArt } from '@/lib/card-art';
import { FIELD_CARDS_TOTAL, fieldCardProgress } from '@/lib/field-cards';
import { assetPath } from '@/lib/asset-path';
import { ANONYMOUS_SCOPE, resolveUnlocked, useFieldCardUnlocks } from '@/lib/unlocked-field-cards';
import { useAuth } from '@/state/AuthProvider';
import { useHerbdex } from '@/state/HerbdexProvider';
import { EYEBROW } from '../ui/accents';

/**
 * The Field Cards this player has earned.
 *
 * The profile gathers every other kind of standing a player has — level, collection,
 * habitats, rarest find, frames, titles, achievements — and said nothing at all about Field
 * Cards, which are the only thing in the product earned purely by playing. They existed
 * solely on /herbdex/research.
 *
 * DELIBERATELY A STRIP, NOT A SECTION. The research page already owns the reward: it names
 * the next card, draws its artwork and counts down to it. Repeating that here would be a
 * second reward panel competing with the first, and the profile's job is different — it says
 * what you HOLD, in one line, the same way "Rarest held" does. So: a count, the chips, and a
 * way back to where they are earned.
 *
 * IT SHOWS HELD CARDS ONLY, and never the locked ones. A row of nine slots with two filled
 * is a page telling somebody what they have not got; `FieldCardReward` is the place that
 * legitimately shows the gap, because that is the page they went to in order to close it.
 *
 * A slot whose artwork is not drawn yet (5-9) is counted but has no chip to show — the count
 * is the honest thing there, and inventing a placeholder card would be inventing botany.
 */
export function FieldCardsHeld() {
  const { progress, ready } = useHerbdex();
  const { user } = useAuth();
  const { record } = useFieldCardUnlocks(user?.id ?? ANONYMOUS_SCOPE);

  if (!ready) return null;

  const held = resolveUnlocked(progress.xp, record);
  const drawn = held.filter((slot) => slot.card);
  const { next } = fieldCardProgress(progress.xp);

  return (
    <section aria-labelledby="profile-field-cards" className="panel p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="profile-field-cards" className={`${EYEBROW} text-gold-400`}>
          Field Cards
        </h2>
        <p className="text-sm font-semibold text-violet-200 tabular-nums">
          {held.length} <span className="text-violet-400">/ {FIELD_CARDS_TOTAL}</span>
        </p>
      </div>

      {held.length === 0 ? (
        <p className="mt-2 text-sm text-violet-300">
          Earned with XP rather than found outdoors. The first opens at{' '}
          {next ? next.xp.toLocaleString() : '—'} XP.
        </p>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {drawn.map((slot) => (
              <li key={slot.ordinal}>
                <Link href={`/herbdex/${slot.card!.id}`} title={slot.card!.commonName} className="block">
                  <Image
                    src={assetPath(chipArt(slot.card!))}
                    alt={slot.card!.commonName}
                    width={CHIP_WIDTH}
                    height={Math.round((CHIP_WIDTH * 576) / 356)}
                    className="h-14 w-[2.2rem] rounded object-cover transition-transform hover:scale-105 motion-reduce:hover:scale-100"
                  />
                </Link>
              </li>
            ))}
          </ul>
          {/* Says what an unlock IS, on the one page that lists standings, so a Field Card
              is never read as a plant this player has found. Same distinction the card page
              and the research panel both make in their own words. */}
          {/* No countdown here any more: the hero's XP track a few rows above now carries
              "N XP to next Field Card" on the bar itself, and saying it twice on one page is
              how a number starts being read as two different numbers. This strip's job is
              what you HOLD. */}
          <p className="mt-2.5 text-xs text-violet-400">Earned with XP, not found outdoors.</p>
        </>
      )}
    </section>
  );
}
