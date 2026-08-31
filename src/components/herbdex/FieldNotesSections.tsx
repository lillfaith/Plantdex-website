import type { Herb } from '@/lib/types';
import {
  fieldNotesFor,
  isGenusCard,
  GENUS_CARD_NOTICE,
  IDENTIFICATION_CAVEAT,
} from '@/lib/card-field-notes';
import { Panel } from '../ui/Panel';
import { EYEBROW, MICRO_LABEL, NOTE, READING, ACCENTS } from '../ui/accents';
import { SectionHeader } from '../ui/SectionHeader';
import { LookalikeRisk } from '../SafetyNotice';
import { PlantdexIcon } from '../icons/PlantdexIcon';
import { iconForTrait } from '@/lib/trait-icons';

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
 * The eyebrow every field-note section carries.
 *
 * Card-derived sections say "From the card". These must say the opposite just as plainly,
 * for the same reason `SiteCaution` leads with "Not printed on the card": a reader who
 * believes a lookalike discriminator came off their own deck weighs it differently from
 * one who knows the site added it. "Field notes" alone distinguished them typographically
 * and told the reader nothing.
 */
const FIELD_NOTE_EYEBROW = 'Added by Plantdex — not on the card';

/** The quiet notice for a card whose own scientific name is `spp.` — never an error banner. */
function GenusNotice({ herb }: { herb: Herb }) {
  const notes = fieldNotesFor(herb);
  const text = isGenusCard(herb) ? GENUS_CARD_NOTICE : notes?.genusTraitsNote;
  if (!text) return null;
  return (
    <p className={`mt-3 flex items-start gap-2 rounded-lg border border-violet-700/70 bg-plum-800/50 px-3 py-2 ${NOTE} text-violet-200`}>
      <PlantdexIcon name="compass" className="mt-0.5 shrink-0 text-sm text-violet-300" />
      <span>{text}</span>
    </p>
  );
}

export function IdentificationSection({ herb }: { herb: Herb }) {
  const notes = fieldNotesFor(herb);
  if (!notes?.identification?.length) return null;

  return (
    <Panel frame="plate" pad="lg" accent="lilac" aria-labelledby="identification-heading">
      <SectionHeader
        id="identification-heading"
        eyebrow={FIELD_NOTE_EYEBROW}
        accent="lilac"
        title="How to recognise it"
        size="lg"
        note={IDENTIFICATION_CAVEAT}
      />
      {/* Provenance, stated once where the field notes begin. The caveat above is about
          safety and stays exactly as it is; this is about where the words came from. */}
      <p className={`-mt-1 mb-1 ${NOTE} text-violet-300`}>
        These notes are not printed on your card. They were added here from the sources
        listed at the foot of this page.
      </p>
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
                <dt className={`${MICRO_LABEL} text-gold-400`}>
                  {trait}
                </dt>
                <dd className={`mt-0.5 ${READING} leading-relaxed text-violet-200`}>{detail}</dd>
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
        eyebrow={FIELD_NOTE_EYEBROW}
        accent="pink"
        title="Commonly confused with"
        size="lg"
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {notes.lookalikes.map((look) => (
          <li
            key={look.commonName}
            className="rounded-card border border-mystery-pink/25 bg-mystery-pink/[0.04] p-4"
          >
            <p className={`${EYEBROW} ${ACCENTS.pink.label}`}>
              Lookalike
            </p>
            <p className={`mt-1 ${READING} font-bold text-violet-100`}>{look.commonName}</p>
            {look.scientificName && (
              <p className={`font-botanical ${READING} text-violet-300 italic`}>
                {look.scientificName}
              </p>
            )}
            <p className={`mt-3 ${MICRO_LABEL} text-gold-400`}>
              How to tell them apart
            </p>
            <p className={`mt-1 ${READING} leading-relaxed text-violet-200`}>{look.distinguishBy}</p>
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
    <Panel frame="card" pad="md" accent="orchid" aria-labelledby="habitat-heading" className="max-w-3xl">
      <SectionHeader
        id="habitat-heading"
        eyebrow={FIELD_NOTE_EYEBROW}
        accent="orchid"
        title="Where it grows"
        icon="plot"
      />
      <p className={`${READING} leading-relaxed text-violet-200`}>{notes.habitat}</p>
    </Panel>
  );
}
