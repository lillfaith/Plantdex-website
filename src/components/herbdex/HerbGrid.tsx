'use client';

import { useMemo, useState } from 'react';
import type { Herb, Rarity, Season } from '@/lib/types';
import { RARITIES, SEASONS } from '@/lib/types';
import { HABITATS, HABITAT_LABEL, matchesHabitatFilter, type HabitatClass } from '@/lib/habitat';
import { SEASON_LABEL } from '@/lib/deck';
import { useHerbdex } from '@/state/HerbdexProvider';
import { HerbCard } from './HerbCard';

type StatusFilter = 'all' | 'discovered' | 'undiscovered' | 'mastered';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'discovered', label: 'Discovered' },
  { value: 'mastered', label: 'Mastered' },
  { value: 'undiscovered', label: 'Not found' },
];

function Chip({
  active,
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      /*
        Drawn at 30px, targeted at 44px. Four rows of 44px pills were about a third of a
        phone screen before the collection began; shrinking the pill without shrinking the
        thumb area is the whole trick, and `tap-44` is where it lives.
      */
      className={`tap-44 h-[1.875rem] rounded-full border px-3 text-[0.72rem] font-semibold whitespace-nowrap transition-colors ${
        active
          ? 'border-gold-500 bg-gold-500/20 text-gold-300'
          : 'border-violet-700 bg-plum-800/50 text-violet-300 hover:border-violet-500 hover:text-violet-100'
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * The collection grid and its filters.
 *
 * Two columns at 390px, widening to six on large screens. Search matches common and
 * scientific names, but only for herbs the player has already discovered — searching by
 * name would otherwise reveal what is hiding behind an undiscovered slot.
 */
export function HerbGrid({ herbs }: { herbs: Herb[] }) {
  const { isDiscovered, isMastered, stageOf, ready } = useHerbdex();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [rarity, setRarity] = useState<Rarity | 'all'>('all');
  const [season, setSeason] = useState<Season | 'all'>('all');
  const [habitat, setHabitat] = useState<HabitatClass | 'all'>('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return herbs.filter((herb) => {
      const discovered = ready && isDiscovered(herb.id);

      if (status === 'discovered' && !discovered) return false;
      if (status === 'undiscovered' && discovered) return false;
      if (status === 'mastered' && !(ready && isMastered(herb.id))) return false;
      if (rarity !== 'all' && herb.rarity !== rarity) return false;
      if (season !== 'all' && herb.season !== season) return false;
      /*
       * PRIMARY HABITAT ONLY. Matching secondaries too would put 29 of 45 cards behind
       * "Wayside", because most of a backyard deck is also a roadside plant — a filter
       * returning two-thirds of the deck has told the player nothing. Primary-only makes
       * the five filters a partition: every card appears under exactly one, and the filter
       * means the same thing as the chip on the card.
       */
      if (habitat !== 'all' && !matchesHabitatFilter(herb.id, habitat)) return false;

      if (needle) {
        // Undiscovered herbs are searchable only by card number, so search cannot be
        // used to peek at names the player has not found yet.
        const haystack = discovered
          ? `${herb.commonName} ${herb.scientificName} #${herb.cardNumber}`
          : `#${herb.cardNumber}`;
        if (!haystack.toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [herbs, status, rarity, season, habitat, query, isDiscovered, isMastered, ready]);

  // Named, not counted: "2 active" tells a player something is on without telling them
  // what, which is the same problem as hiding it.
  const activeFilters = [
    status !== 'all' ? STATUS_OPTIONS.find((option) => option.value === status)?.label : null,
    rarity !== 'all' ? rarity : null,
    season !== 'all' ? SEASON_LABEL[season] : null,
    habitat !== 'all' ? HABITAT_LABEL[habitat] : null,
  ].filter((label): label is string => Boolean(label));

  return (
    <div>
      <div className="space-y-3">
        <label className="block">
          <span className="sr-only">Search your discovered herbs by name or card number</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search discovered herbs or card number…"
            className="min-h-11 w-full rounded-full border border-violet-700 bg-plum-700/70 px-4 text-sm text-violet-100 placeholder:text-violet-500"
          />
        </label>

        <details className="group">
          <summary className="tap-44 flex cursor-pointer list-none items-center justify-between gap-2 text-[0.72rem] font-bold tracking-[0.1em] text-violet-300 uppercase">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="text-base leading-none transition-transform group-open:rotate-90 motion-reduce:transition-none"
              >
                &rsaquo;
              </span>
              Filters
            </span>
            {/*
              A folded control that shows only the word "Filters" hides its own state: a
              player who narrowed to Winter yesterday comes back to a short grid and no
              visible reason for it. The active ones are named here, so folding costs the
              rows and not the answer.
            */}
            <span className={activeFilters.length > 0 ? 'text-gold-400' : 'text-violet-400'}>
              {activeFilters.length > 0 ? activeFilters.join(' · ') : 'None'}
            </span>
          </summary>

          {/*
            WRAPPED, NOT SCROLLED. Each of these four rows used to be its own horizontal
            scroller, which on a phone meant four independent scroll positions, a chip
            sheared in half at the right edge ("Way…" for Wayside) and a scrollbar track
            drawn across the panel. At 44px pills there was no room to do anything else; at
            30px there is, so they wrap and every option is simply visible.
          */}
          <div className="mt-2 space-y-2">
        <div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by discovery status">
            {STATUS_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                active={status === option.value}
                onClick={() => setStatus(option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by encounter rate">
            <Chip active={rarity === 'all'} onClick={() => setRarity('all')}>
              Any rate
            </Chip>
            {RARITIES.map((value) => (
              <Chip key={value} active={rarity === value} onClick={() => setRarity(value)}>
                {value}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by season">
            <Chip active={season === 'all'} onClick={() => setSeason('all')}>
              Any season
            </Chip>
            {SEASONS.map((value) => (
              <Chip key={value} active={season === value} onClick={() => setSeason(value)}>
                {SEASON_LABEL[value]}
              </Chip>
            ))}
          </div>
        </div>

        {/*
          Habitat filters on PRIMARY only — see the predicate above. The label says "grows
          in" rather than naming a place, because a class is a kind of ground, not a
          location.
        */}
        <div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by habitat">
            <Chip active={habitat === 'all'} onClick={() => setHabitat('all')}>
              Any habitat
            </Chip>
            {HABITATS.map((value) => (
              <Chip key={value} active={habitat === value} onClick={() => setHabitat(value)}>
                {HABITAT_LABEL[value]}
              </Chip>
            ))}
          </div>
        </div>
          </div>
        </details>
      </div>

      <p aria-live="polite" className="mt-4 text-xs text-violet-400">
        Showing {visible.length} of {herbs.length} cards
      </p>

      {visible.length === 0 ? (
        <p className="panel mt-3 p-6 text-center text-sm text-violet-300">
          No cards match these filters.
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {visible.map((herb, index) => (
            <li key={herb.id}>
              <HerbCard
                herb={herb}
                discovered={ready && isDiscovered(herb.id)}
                stage={ready ? stageOf(herb.id) : null}
                priority={index < 4}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
