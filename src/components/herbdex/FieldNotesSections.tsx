import type { Herb } from '@/lib/types';
import {
  fieldNotesFor,
  isGenusCard,
  GENUS_CARD_NOTICE,
  IDENTIFICATION_CAVEAT,
} from '@/lib/card-field-notes';
import { Panel } from '../ui/Panel';
import { SectionHeader } from '../ui/SectionHeader';
import { LookalikeRisk } from '../SafetyNotice';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';

/**
 * Identification, lookalikes and habitat — the three site-added field-note sections.
 *
 * Each returns `null` when its part of `FieldNotes` is absent, so a species with habitat
 * but no useful lookalike shows one section rather than an empty box, and content added
 * later lights up with no page surgery.
 *
 * ORDER MATTERS: lookalikes render IMMEDIATELY after identification, because a
 * discriminating character is only useful beside the thing it discriminates from. Habitat
 * follows at a narrower measure — it is context, not a key.
 */

/**
 * A trait row gets an icon only where one genuinely helps place the character on the
 * plant, and the same icon is reused for the same body part across all 45 species. It is
 * decorative in every case: the trait label beside it says the same thing in words.
 * Matching is on the trait LABEL, which is why the labels in `card-field-notes.ts` are
 * short and physical rather than prose.
 */
const TRAIT_ICONS: { match: RegExp; icon: IconName }[] = [
  { match: /leaf|leaves|leaflet|rosette|foliage|frond/i, icon: 'leaves' },
  { match: /flower|bloom|petal|head|umbel|catkin|corona/i, icon: 'flower' },
  { match: /fruit|berr|acorn|hip|samara|seed|pod|capsule|bur|cone/i, icon: 'fruit' },
  { match: /stem|stalk|cane|twig|node|runner|vine|shoot/i, icon: 'stem' },
  { match: /root|bulb|rhizome/i, icon: 'root' },
  { match: /bark|woody|tree|shrub/i, icon: 'bark' },
];

function iconForTrait(trait: string): IconName | undefined {
  return TRAIT_ICONS.find((entry) => entry.match.test(trait))?.icon;
}

/** The quiet notice for a card whose own scientific name is `spp.` — never an error banner. */
function GenusNotice({ herb }: { herb: Herb }) {
  const notes = fieldNotesFor(herb);
  const text = isGenusCard(herb) ? GENUS_CARD_NOTICE : notes?.genusTraitsNote;
  if (!text) return null;
  return (
    <p className="mt-3 flex items-start gap-2 rounded-lg border border-violet-700/70 bg-plum-800/50 px-3 py-2 text-xs text-violet-200">
      <PlantdexIcon name="compass" className="mt-0.5 shrink-0 text-sm text-violet-300" />
      <span>{text}</span>
    </p>
  );
}

export function IdentificationSection({ herb }: { herb: Herb }) {
  const notes = fieldNotesFor(herb);
  if (!notes?.identification?.length) return null;

  return (
    <Panel frame="plate" pad="lg" aria-labelledby="identification-heading">
      <SectionHeader
        id="identification-heading"
        eyebrow="Field notes"
        title="How to recognise it"
        size="lg"
        note={IDENTIFICATION_CAVEAT}
      />
      {/*
        Two columns of trait rows rather than one long list: at reading measure the details
        are short enough that a single column leaves half the plate empty, which is what
        made the old page feel like a form.
      */}
      <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {notes.identification.map(({ trait, detail }) => {
          const icon = iconForTrait(trait);
          return (
            <div key={trait} className="flex items-start gap-2.5">
              {icon ? (
                <PlantdexIcon name={icon} className="mt-0.5 shrink-0 text-base text-violet-300" />
              ) : (
                <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
              )}
              <div>
                <dt className="text-[0.68rem] font-bold tracking-[0.1em] text-gold-400 uppercase">
                  {trait}
                </dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-violet-200">{detail}</dd>
              </div>
            </div>
          );
        })}
      </dl>
      <GenusNotice herb={herb} />
    </Panel>
  );
}

export function LookalikeSection({ herb }: { herb: Herb }) {
  const notes = fieldNotesFor(herb);
  if (!notes?.lookalikes?.length) return null;

  return (
    <section aria-labelledby="lookalikes-heading">
      <SectionHeader
        id="lookalikes-heading"
        eyebrow="Field notes"
        title="Commonly confused with"
        size="lg"
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {notes.lookalikes.map((look) => (
          <li
            key={look.commonName}
            className="rounded-card border border-violet-700/60 bg-plum-800/45 p-4"
          >
            <p className="text-[0.62rem] font-bold tracking-[0.14em] text-violet-300 uppercase">
              Lookalike
            </p>
            <p className="mt-1 text-sm font-bold text-violet-100">{look.commonName}</p>
            {look.scientificName && (
              <p className="font-botanical text-sm text-violet-300 italic">
                {look.scientificName}
              </p>
            )}
            <p className="mt-3 text-[0.62rem] font-bold tracking-[0.14em] text-gold-400 uppercase">
              How to tell them apart
            </p>
            <p className="mt-1 text-sm leading-relaxed text-violet-200">{look.distinguishBy}</p>
            {/* Full hazard weight — never softened because it sits inside an ID section. */}
            {look.risk && <LookalikeRisk risk={look.risk} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HabitatSection({ herb }: { herb: Herb }) {
  const notes = fieldNotesFor(herb);
  if (!notes?.habitat) return null;

  return (
    <Panel frame="card" pad="md" aria-labelledby="habitat-heading" className="max-w-3xl">
      <SectionHeader
        id="habitat-heading"
        eyebrow="Field notes"
        title="Where it grows"
        icon="plot"
      />
      <p className="text-sm leading-relaxed text-violet-200">{notes.habitat}</p>
    </Panel>
  );
}
