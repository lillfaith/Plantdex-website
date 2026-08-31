import type { Herb } from '@/lib/types';
import { RARITY_LABEL, SEASON_LABEL } from '@/lib/deck';
import { StatPips } from './StatPips';
import { Panel } from '../ui/Panel';
import { SectionHeader } from '../ui/SectionHeader';
import { InfoTile } from '../ui/InfoTile';
import { MICRO_LABEL } from '../ui/accents';
import { ProvenanceChip } from '../game/Provenance';

/**
 * Season, encounter rate, XP and growing conditions — the card's own reference data.
 *
 * It sits in the HERO, under the discovery panel, for two reasons. It is the same kind of
 * thing as the card standing beside it, so it belongs in the same spread; and the identity
 * column is otherwise much shorter than a 21rem card, which left the hero visibly
 * lopsided. Growing conditions used to be a full-height panel of its own, which gave a
 * rating out of five the same weight as the plant's traditional uses.
 */
export function FieldDataStrip({ herb }: { herb: Herb }) {
  return (
    <Panel family="game" clip pad="md" aria-labelledby="field-data-heading">
      <SectionHeader
        id="field-data-heading"
        title="Card data"
        right={<ProvenanceChip source="card" />}
      />
      <div className="grid grid-cols-3 gap-2.5">
        <InfoTile icon={herb.season} label="Best in" align="center">
          {SEASON_LABEL[herb.season]}
        </InfoTile>
        <InfoTile icon="compass" label="Encounter rate" align="center">
          {RARITY_LABEL[herb.rarity]}
        </InfoTile>
        <InfoTile icon="crystal" label="Discovery XP" align="center">
          <span className="tabular-nums">{herb.xp}</span>
        </InfoTile>
      </div>
      <div className="mt-2.5 rounded-xl border border-violet-700/60 bg-plum-800/45 p-3">
        <p className={`mb-2 ${MICRO_LABEL} text-violet-300`}>
          Growing conditions
        </p>
        <StatPips stats={herb.stats} />
      </div>
    </Panel>
  );
}
