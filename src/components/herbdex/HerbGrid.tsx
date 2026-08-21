'use client';

import { useMemo, useState } from 'react';
import type { Herb, Rarity, Season } from '@/lib/types';
import { RARITIES, SEASONS } from '@/lib/types';
import { SEASON_LABEL } from '@/lib/deck';
import { useHerbdex } from '@/state/HerbdexProvider';
import { HerbCard } from './HerbCard';

type StatusFilter = 'all' | 'discovered' | 'undiscovered';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'discovered', label: 'Discovered' },
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
      className={`min-h-11 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
        active
          ? 'border-gold-500 bg-gold-500/20 text-gold-300'
          : 'border-violet-700 bg-violet-900/50 text-violet-300 hover:border-violet-500 hover:text-violet-100'
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
  const { isDiscovered, ready } = useHerbdex();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [rarity, setRarity] = useState<Rarity | 'all'>('all');
  const [season, setSeason] = useState<Season | 'all'>('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return herbs.filter((herb) => {
      const discovered = ready && isDiscovered(herb.id);

      if (status === 'discovered' && !discovered) return false;
      if (status === 'undiscovered' && discovered) return false;
      if (rarity !== 'all' && herb.rarity !== rarity) return false;
      if (season !== 'all' && herb.season !== season) return false;

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
  }, [herbs, status, rarity, season, query, isDiscovered, ready]);

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
            className="min-h-11 w-full rounded-full border border-violet-700 bg-violet-900/60 px-4 text-sm text-violet-100 placeholder:text-violet-500"
          />
        </label>

        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <div className="flex gap-2" role="group" aria-label="Filter by discovery status">
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

        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <div className="flex gap-2" role="group" aria-label="Filter by encounter rate">
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

        <div className="-mx-4 overflow-x-auto px-4 pb-1">
          <div className="flex gap-2" role="group" aria-label="Filter by season">
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
                priority={index < 4}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
