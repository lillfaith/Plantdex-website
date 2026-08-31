import Link from 'next/link';
import type { Herb } from '@/lib/types';
import { BACK_SECTION_LABEL } from '@/lib/deck';
import { Panel } from '../ui/Panel';
import { SectionHeader } from '../ui/SectionHeader';
import { Chip, ChipRow } from '../ui/Chip';
import { InfoTile } from '../ui/InfoTile';
import { ProvenanceChip } from '../game/Provenance';
import { MICRO_LABEL, NOTE, READING } from '../ui/accents';
import { GlossaryTermLink } from '../learn/GlossaryTermLink';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';

/**
 * The six sections printed on the back of every card.
 *
 * Content is reproduced exactly as printed — this file changed presentation only. What is
 * NOT a presentation choice and must not drift:
 *
 *  - "Healing Traits" keeps the deck's own heading and its non-claim framing line, which
 *    sits under that heading and nowhere else on the page.
 *  - Healing Traits is NOT gold. Gold is reserved for display type and earned state; a
 *    page whose every chip is gold has nothing left to say "this one is different", and
 *    gold chips out-shout the printed card art the page is built around.
 *
 * Each section is exported separately so the page can place them at different widths and
 * in different frames. They were one stack of identical panels, and that is the specific
 * thing being fixed.
 */

/** Card wording wrapped so any word in the glossary gains its inline definition. */
function Term({ children }: { children: string }) {
  return (
    <>
      {children}
      <GlossaryTermLink word={children} />
    </>
  );
}

/**
 * Which prepared form a card's wording corresponds to, and therefore which guide it links
 * to. Matched on the card's own words; anything unmatched simply renders without an icon
 * rather than being forced into the nearest guide, because "Sap" is not a decoction.
 */
const PREPARATION_GUIDE: { match: RegExp; icon: IconName; guide?: string }[] = [
  { match: /^(infusion|tea)$/i, icon: 'infusion', guide: 'infusion' },
  { match: /^(decoction|cold soak)$/i, icon: 'decoction', guide: 'decoction' },
  { match: /^oil$/i, icon: 'tincture', guide: 'infused-oil' },
  { match: /^(salve|poultice)$/i, icon: 'salve', guide: 'salve' },
  { match: /^(powder|spice|roasted|roasted roots)$/i, icon: 'drying', guide: 'drying' },
  // No guide exists for these yet, so they get an icon and no link rather than a link to
  // the nearest thing — a tincture is not an infused oil, and syrup is not dry storage.
  { match: /^(tincture|extract)$/i, icon: 'tincture' },
  { match: /^(syrup|juice|sap)$/i, icon: 'storage' },
  { match: /^(cooked|cooked root|steam)$/i, icon: 'decoction' },
  { match: /^(fresh|fresh greens|salad)$/i, icon: 'leaves' },
];

const PART_ICON: { match: RegExp; icon: IconName }[] = [
  { match: /^(leaf|shoot)$/i, icon: 'leaves' },
  { match: /^(flower|petal)$/i, icon: 'flower' },
  { match: /^(berry|fruit|hip|nut|cone)$/i, icon: 'fruit' },
  { match: /^(seed)$/i, icon: 'seed' },
  { match: /^(root|bulb|stock)$/i, icon: 'root' },
  { match: /^(bark|twigs)$/i, icon: 'bark' },
  { match: /^(stem|stalk|needle|resin|sap)$/i, icon: 'stem' },
];

export function UsablePartsSection({ herb }: { herb: Herb }) {
  const parts = herb.back.usableParts;
  if (!parts.length) return null;
  return (
    <section aria-labelledby="parts-heading">
      <SectionHeader
        id="parts-heading"
        title={BACK_SECTION_LABEL.usableParts}
        accent="mauve"
        size="lg"
        right={<ProvenanceChip source="card" />}
        note="The parts the card names as usable."
      />
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {parts.map((part) => (
          <li key={part}>
            <InfoTile
              icon={PART_ICON.find((entry) => entry.match.test(part))?.icon}
              label={part}
              align="center"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PreparationsSection({ herb }: { herb: Herb }) {
  const preparations = herb.back.preparations;
  if (!preparations.length) return null;
  return (
    <section aria-labelledby="prep-heading">
      <SectionHeader
        id="prep-heading"
        title={BACK_SECTION_LABEL.preparations}
        accent="violet"
        size="lg"
        note="How the card says it has traditionally been prepared."
      />
      <ul className="divide-y divide-mystery-violet/20 rounded-card border border-mystery-violet/25 bg-mystery-violet/[0.04]">
        {preparations.map((prep) => {
          const entry = PREPARATION_GUIDE.find((candidate) => candidate.match.test(prep));
          return (
            <li key={prep} className="flex items-center gap-3 px-4 py-2.5">
              {entry ? (
                <PlantdexIcon name={entry.icon} className="shrink-0 text-lg text-violet-300" />
              ) : (
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
              )}
              <span className={`flex-1 ${READING} font-semibold text-violet-100`}>
                <Term>{prep}</Term>
              </span>
              {entry?.guide && (
                <Link
                  href={`/learn/preparations#${entry.guide}`}
                  className={`inline-flex min-h-11 items-center px-1 ${NOTE} font-semibold text-violet-300 underline underline-offset-2 hover:text-gold-400`}
                >
                  Guide
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HealingTraitsSection({ herb }: { herb: Herb }) {
  const traits = herb.back.healingTraits;
  if (!traits.length) return null;
  return (
    <Panel frame="bare" as="section" aria-labelledby="healing-heading">
      <SectionHeader
        id="healing-heading"
        title={BACK_SECTION_LABEL.healingTraits}
        accent="gold"
        size="lg"
        // The one place on this page that says it, directly under the heading it qualifies,
        // which is where a caveat actually gets read.
        note="Traditional and historical use, as printed. Not medical advice, and not a claim that this plant treats anything."
      />
      <ChipRow>
        {traits.map((trait) => (
          <li key={trait}>
            <Chip tone="violet">
              <Term>{trait}</Term>
            </Chip>
          </li>
        ))}
      </ChipRow>
    </Panel>
  );
}

export function TasteAromaSection({ herb }: { herb: Herb }) {
  const { taste, aromatic } = herb.back;
  if (!taste.length && !aromatic.length) return null;
  return (
    <Panel family="field" pad="md" accent="blossom" aria-labelledby="profile-heading">
      <SectionHeader
        id="profile-heading"
        accent="blossom"
        title="Taste &amp; aroma"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { key: 'taste', items: taste, label: BACK_SECTION_LABEL.taste },
          { key: 'aromatic', items: aromatic, label: BACK_SECTION_LABEL.aromatic },
        ]
          .filter((column) => column.items.length > 0)
          .map((column) => (
            <div key={column.key}>
              <h3 className={`mb-2 ${MICRO_LABEL} text-violet-300`}>
                {column.label}
              </h3>
              <ChipRow>
                {column.items.map((item) => (
                  <li key={item}>
                    <Chip tone="plain">
                      <Term>{item}</Term>
                    </Chip>
                  </li>
                ))}
              </ChipRow>
            </div>
          ))}
      </div>
    </Panel>
  );
}
