import type { IconName } from '../icons/PlantdexIcon';
import Link from 'next/link';
import type { Herb } from '@/lib/types';
import { BACK_SECTION_LABEL } from '@/lib/deck';
import { ArtTile, HerbalPanel, PixelIcon, TraitList } from './HerbalVisuals';
import { PREP_ART, artFor, illustration } from '@/lib/pixel-icons';
import { ProvenanceChip } from '../game/Provenance';
import { evidenceFor, STANDING_LABEL } from '@/lib/trait-evidence';
import { isFieldCard } from '@/lib/field-cards';
import { MICRO_LABEL } from '../ui/accents';
import { GlossaryTermLink } from '../learn/GlossaryTermLink';
import { ContaminationNote } from '../SafetyNotice';

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
  {
    match: /^(powder|spice|roasted|roasted roots)$/i,
    icon: 'drying',
    guide: 'drying',
  },
  // No guide exists for these yet, so they get an icon and no link rather than a link to
  // the nearest thing — a tincture is not an infused oil, and syrup is not dry storage.
  { match: /^(tincture|extract)$/i, icon: 'tincture' },
  { match: /^(syrup|juice|sap)$/i, icon: 'storage' },
  { match: /^(cooked|cooked root|steam)$/i, icon: 'decoction' },
  { match: /^(fresh|fresh greens|salad)$/i, icon: 'leaves' },
];

export function UsablePartsSection({ herb }: { herb: Herb }) {
  const parts = herb.back.usableParts;
  if (!parts.length) return null;
  return (
    <HerbalPanel id="parts-heading" icon="leaf" title={BACK_SECTION_LABEL.usableParts}>
      <div className="space-y-2 px-2 pb-2">
        <ul className="grid grid-cols-2 gap-1.5">
          {parts.map((part) => (
            <li key={part}>
              <ArtTile kind="part" word={part} />
            </li>
          ))}
        </ul>
      </div>
    </HerbalPanel>
  );
}

/**
 * Parts and preparations sit side by side as one working pair, with the single foraging
 * warning underneath at full width where it can be read. It is rendered once here, below the
 * parts it is about, and nowhere else on the profile.
 */
export function PartsAndPreparations({ herb }: { herb: Herb }) {
  const hasParts = herb.back.usableParts.length > 0;
  const hasPreps = herb.back.preparations.length > 0;
  return (
    <div>
      <div className={hasParts && hasPreps ? 'grid grid-cols-[5fr_7fr] items-start gap-2' : ''}>
        <UsablePartsSection herb={herb} />
        <PreparationsSection herb={herb} />
      </div>
      {hasParts && (
        <div className="mt-2">
          <ProvenanceChip source={isFieldCard(herb.id) ? 'field-card' : 'card'} />
        </div>
      )}
    </div>
  );
}

/**
 * The foraging warning closes the Herbalism tab: after the sources, as the last thing read
 * before acting on anything above it. Rendered once per profile, only where usable parts are
 * shown, exactly as before.
 */
export function ForagingSafetyFooter({ herb }: { herb: Herb }) {
  if (!herb.back.usableParts.length) return null;
  return <ContaminationNote />;
}

export function PreparationsSection({ herb }: { herb: Herb }) {
  const preparations = herb.back.preparations;
  if (!preparations.length) return null;
  return (
    <HerbalPanel id="prep-heading" icon="mortar" title={BACK_SECTION_LABEL.preparations}>
      <ul className="grid grid-cols-2 gap-1.5 px-2 pb-2">
        {preparations.map((prep) => {
          const entry = PREPARATION_GUIDE.find((candidate) => candidate.match.test(prep));
          return (
            <li
              key={prep}
              className="pixel-tile flex flex-col items-center gap-0.5 px-1 py-2 text-center"
            >
              <PixelIcon uri={illustration(artFor(PREP_ART, prep))} size={32} />
              <span className="text-xs leading-tight font-bold text-violet-50">
                <Term>{prep}</Term>
              </span>
              {entry?.guide && (
                <Link
                  href={`/learn/preparations#${entry.guide}`}
                  className="inline-flex min-h-8 items-center px-2 text-[0.72rem] font-semibold text-violet-200 underline underline-offset-2 hover:text-gold-300"
                >
                  Guide
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </HerbalPanel>
  );
}

export function HealingTraitsSection({ herb }: { herb: Herb }) {
  const traits = herb.back.healingTraits;
  if (!traits.length) return null;
  return (
    <HerbalPanel id="healing-heading" icon="leaf" title={BACK_SECTION_LABEL.healingTraits}>
      <div className="space-y-2 px-2 pb-2">
        {/* The one place on this page that says it, directly under the heading it qualifies. */}
        <p className="text-xs leading-snug text-violet-200 italic">
          Traditional and historical use, as printed. Not medical advice, and not a claim that this
          plant treats anything.
        </p>
        <TraitList traits={traits} render={(trait) => <Term>{trait}</Term>} />
        <TraitEvidenceNote herb={herb} />
      </div>
    </HerbalPanel>
  );
}

/**
 * Which of the printed traits are ethnobotanical record and which have laboratory work.
 *
 * UNDER the chips, never instead of them: the transcription is what the card says and does
 * not move. This answers the question the four equal chips raise — whether they are four of
 * the same kind of thing — and it renders only for cards that have an authored entry, so
 * every other page is byte-identical.
 *
 * The Plantdex chip is the right one here even though the subject is a card field: the
 * EVIDENCE FRAMING is the site's, not the deck's, and labelling it card data would borrow
 * the transcription's authority for a judgement the card never made.
 */
function TraitEvidenceNote({ herb }: { herb: Herb }) {
  const evidence = evidenceFor(herb);
  if (!evidence) return null;
  return (
    <div className="mt-4 rounded-xl border border-violet-700/60 bg-plum-800/45 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`${MICRO_LABEL} text-violet-300`}>What stands behind these</p>
        <ProvenanceChip source="plantdex" />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-violet-200">{evidence.summary}</p>
      <dl className="mt-3 space-y-2.5">
        {evidence.traits.map((row) => (
          <div key={row.trait}>
            <dt className="text-xs font-bold text-violet-100">
              {row.trait}
              <span className="ml-2 rounded-full border border-violet-600/70 bg-violet-800/30 px-2 py-0.5 text-[0.72rem] font-semibold tracking-wide text-violet-300 uppercase">
                {STANDING_LABEL[row.standing]}
              </span>
            </dt>
            <dd className="mt-1 text-xs leading-relaxed text-violet-200">{row.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function TasteAromaSection({ herb }: { herb: Herb }) {
  const { taste, aromatic } = herb.back;
  if (!taste.length && !aromatic.length) return null;
  const strips = [
    { key: 'taste', icon: 'taste', items: taste, label: BACK_SECTION_LABEL.taste },
    { key: 'aromatic', icon: 'aroma', items: aromatic, label: BACK_SECTION_LABEL.aromatic },
  ].filter((strip) => strip.items.length > 0);
  return (
    <HerbalPanel id="profile-heading" icon="taste" title="Taste &amp; aroma">
      <div className="space-y-1.5 px-2 pb-2">
        {strips.map((strip) => (
          <div key={strip.key} className="herbal-strip flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1 text-[0.72rem] font-extrabold tracking-wide text-violet-200 uppercase">
              <PixelIcon uri={illustration(strip.icon)} size={22} />
              {strip.label}
            </span>
            <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm font-bold text-violet-50">
              {strip.items.map((item) => (
                <li key={item}>
                  <Term>{item}</Term>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </HerbalPanel>
  );
}
