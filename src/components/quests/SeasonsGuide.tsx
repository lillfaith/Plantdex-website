'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { printedCardsInDeckOrder, SEASON_LABEL } from '@/lib/deck';
import { assetPath } from '@/lib/asset-path';
import { SEASONS, type Season } from '@/lib/types';
import { useHerbdex } from '@/state/HerbdexProvider';
import { PlantdexIcon, type IconName } from '@/components/icons/PlantdexIcon';

const SEASON_ICON: Record<Season, IconName> = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter' };

/**
 * Season identity is a SMALL accent on the one visible panel, never four competing saturated panels: a tint for the
 * progress rail and the header foot, all from the card-derived tokens. Pink for autumn and turquoise for winter are
 * the nearest honest tokens, not claims about foliage colour.
 */
const ACCENT: Record<Season, { rail: string; tint: string }> = {
  spring: { rail: 'var(--card-leaf-500)', tint: 'var(--card-leaf-100)' },
  summer: { rail: 'var(--card-gold-500)', tint: 'var(--card-gold-100)' },
  autumn: { rail: 'var(--card-orchid-500)', tint: 'var(--card-orchid-100)' },
  winter: { rail: 'var(--card-turq-500)', tint: 'var(--card-turq-100)' },
};

/**
 * THE SEASONAL GUIDE, CONNECTED TO THE PLAYER'S COLLECTION.
 *
 * Seasons are still grouped strictly by the icon printed on each card, and the page still says they are typical, not exact. What this
 * adds is the player's own state: a card is "Collected" only when it is in `discoveries` (the same record every other surface counts),
 * and each season's collected/total is derived from exactly that, so no count here can be fabricated. Nothing implies what is in season
 * where the player is standing today; the default tab is Spring, not "this month".
 */
export function SeasonsGuide() {
  const { state, ready } = useHerbdex();
  const herbs = printedCardsInDeckOrder();
  const [active, setActive] = useState<Season>('spring');

  const collectedIds = new Set(Object.keys(state.discoveries));
  const bySeason = (season: Season) => herbs.filter((herb) => herb.season === season);
  const countFor = (season: Season) => {
    const all = bySeason(season);
    return { total: all.length, collected: all.filter((herb) => collectedIds.has(herb.id)).length };
  };
  const overallCollected = herbs.filter((herb) => collectedIds.has(herb.id)).length;

  const { total, collected } = countFor(active);
  const list = bySeason(active);
  const accent = ACCENT[active];

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % 4 : event.key === 'ArrowLeft' ? (index + 3) % 4 : null;
    if (next === null) return;
    event.preventDefault();
    setActive(SEASONS[next]!);
    document.getElementById(`season-tab-${SEASONS[next]}`)?.focus();
  }

  return (
    <div>
      {/* The caveat stays on screen, shortened to what the player acts on. */}
      <aside className="pd-tile mt-4 flex items-start gap-2.5 px-3 py-2.5" data-tone="gold">
        <span aria-hidden="true" className="mt-0.5 text-lg">
          <PlantdexIcon name="leaves" />
        </span>
        <p className="text-[0.8125rem] leading-snug text-violet-100">
          <strong className="font-extrabold">Typical, not exact.</strong> These are the seasons printed on the cards. Real timing shifts with
          region, weather and elevation, so this is when to start looking, not a harvesting schedule or a live guide to what is growing near
          you.
        </p>
      </aside>

      {/* ONE compact control instead of scrolling past every season. Each tab carries its own collected/total. */}
      <div role="tablist" aria-label="Season" className="pd-panel mt-4 grid grid-cols-4 gap-1 p-1">
        {SEASONS.map((season, index) => {
          const selected = season === active;
          const c = countFor(season);
          return (
            <button
              key={season}
              id={`season-tab-${season}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls="season-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(season)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-xs font-extrabold transition-colors ${
                selected ? 'bg-[var(--card-violet-500)] text-white shadow-[0_3px_0_0_var(--card-violet-900)]' : 'text-violet-100 hover:bg-[var(--card-violet-100)]'
              }`}
            >
              <PlantdexIcon name={SEASON_ICON[season]} className="text-lg" />
              <span>{SEASON_LABEL[season]}</span>
              <span className={`text-[0.72rem] font-bold tabular-nums ${selected ? 'text-white' : 'text-violet-300'}`}>
                {ready ? `${c.collected}/${c.total}` : `${c.total}`}
              </span>
            </button>
          );
        })}
      </div>

      <section
        id="season-panel"
        role="tabpanel"
        aria-labelledby={`season-tab-${active}`}
        className="pd-panel mt-4 overflow-hidden"
        style={{ borderTop: `6px solid ${accent.rail}` }}
      >
        <div className="px-4 pt-3 pb-3" style={{ background: `linear-gradient(180deg, ${accent.tint}, transparent)` }}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-violet-100">
              <PlantdexIcon name={SEASON_ICON[active]} className="text-xl" />
              {SEASON_LABEL[active]}
            </h2>
            <p className="text-sm font-bold text-violet-100 tabular-nums">
              {ready ? (
                <>
                  <span className="font-display text-lg font-extrabold">{collected}</span> of {total} collected
                </>
              ) : (
                <>{total} plants</>
              )}
            </p>
          </div>
          <div
            role="progressbar"
            aria-label={`${SEASON_LABEL[active]} cards collected`}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={ready ? collected : 0}
            className="mt-2 h-3 overflow-hidden rounded-full border-2 border-[var(--card-violet-300)] bg-white"
          >
            <div className="h-full" style={{ width: ready && total ? `${(collected / total) * 100}%` : '0%', background: accent.rail }} />
          </div>
          <p className="mt-2 text-[0.8125rem] leading-snug text-violet-300">
            {!ready
              ? 'Reading your collection…'
              : collected === total && total > 0
                ? `Every ${SEASON_LABEL[active].toLowerCase()} card in the deck is in your collection.`
                : collected === 0
                  ? 'None collected yet. Open a card to see how to find it.'
                  : `${total - collected} left to find. Open a card for how to recognise it.`}
          </p>
        </div>

        {list.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-violet-300">No cards in the deck are marked for this season.</p>
        ) : (
          <ul className="grid divide-y-2 divide-[var(--card-violet-100)] border-t-2 border-[var(--card-violet-100)] sm:grid-cols-2 sm:divide-y-0">
            {list.map((herb) => {
              const have = ready && collectedIds.has(herb.id);
              return (
                <li key={herb.id} className="sm:border-b-2 sm:border-[var(--card-violet-100)] sm:odd:border-r-2">
                  <Link
                    href={`/herbdex/${herb.id}`}
                    className="flex min-h-[4.25rem] items-center gap-3 px-3 py-2 transition-colors hover:bg-[var(--card-violet-50)] focus-visible:bg-[var(--card-violet-50)]"
                  >
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 ${
                        have ? 'border-[var(--card-violet-500)] bg-white' : 'border-dashed border-[var(--card-violet-300)] bg-[var(--card-violet-50)]'
                      }`}
                    >
                      <Image
                        src={assetPath(herb.sprite)}
                        alt=""
                        aria-hidden="true"
                        width={276}
                        height={276}
                        className={`h-9 w-9 object-contain ${have ? '' : 'opacity-60 grayscale'}`}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.95rem] font-extrabold text-violet-100">{herb.commonName}</span>
                      <span className="font-botanical block truncate text-[0.8125rem] text-violet-300 italic">{herb.scientificName}</span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[0.8125rem] font-bold text-violet-300 tabular-nums">#{String(herb.cardNumber).padStart(2, '0')}</span>
                      <span
                        className={`pd-badge !min-h-0 !px-2 !py-0.5 !text-[0.72rem] ${
                          have ? '!border-[var(--card-leaf-700)] !bg-[var(--card-leaf-100)]' : '!border-[var(--card-violet-300)] !bg-white'
                        }`}
                      >
                        {ready ? (have ? 'Collected' : 'To find') : 'Card'}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-lg text-violet-300">
                      &rsaquo;
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="mt-4 text-center text-[0.8125rem] font-bold text-violet-300 tabular-nums">
        {ready ? `${overallCollected} of ${herbs.length} cards collected across all seasons` : ''}
      </p>
      <p className="mt-6 text-[0.8125rem] leading-relaxed text-violet-300">
        Region and month-by-month timing need cited data per region. Guessing at it is guessing at something people act on outdoors, so it
        waits.
      </p>
    </div>
  );
}
