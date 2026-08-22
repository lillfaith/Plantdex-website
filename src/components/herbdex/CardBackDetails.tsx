import type { Herb } from '@/lib/types';
import { BACK_SECTION_LABEL } from '@/lib/deck';

/**
 * The six sections printed on the back of every card.
 *
 * Content is reproduced exactly as printed. The "Healing Traits" heading is the deck's
 * own wording; the framing line below makes clear these are traditional-use categories
 * rather than medical claims, which is what AGENTS.md requires of this site.
 */

function Chips({ items, tone }: { items: string[]; tone: 'gold' | 'cyan' | 'violet' }) {
  const toneClass = {
    gold: 'border-gold-500/45 bg-gold-500/12 text-gold-300',
    cyan: 'border-cyan-accent/45 bg-cyan-accent/12 text-cyan-accent',
    violet: 'border-violet-600 bg-violet-900/60 text-violet-200',
  }[tone];

  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="panel p-5">
      <h2 id={id} className="text-sm font-bold tracking-wide text-gold-400 uppercase">
        {title}
      </h2>
      {note && <p className="mt-1 mb-3 text-xs text-violet-400">{note}</p>}
      <div className={note ? '' : 'mt-3'}>{children}</div>
    </section>
  );
}

export function CardBackDetails({ herb }: { herb: Herb }) {
  const { back } = herb;
  const hasProfile = back.taste.length > 0 || back.aromatic.length > 0;

  return (
    <div className="space-y-4">
      {back.healingTraits.length > 0 && (
        <Section
          id="healing-heading"
          title={BACK_SECTION_LABEL.healingTraits}
          note="As printed on the card. These describe traditional and historical use — they are not medical advice, and not claims that this plant treats any condition."
        >
          <Chips items={back.healingTraits} tone="gold" />
        </Section>
      )}

      {back.compounds.length > 0 && (
        <Section
          id="compounds-heading"
          title={BACK_SECTION_LABEL.compounds}
          note="Constituents named on the card."
        >
          <Chips items={back.compounds} tone="cyan" />
        </Section>
      )}

      {hasProfile && (
        <section aria-labelledby="profile-heading" className="panel p-5">
          <h2
            id="profile-heading"
            className="text-sm font-bold tracking-wide text-gold-400 uppercase"
          >
            Taste &amp; aroma
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {back.taste.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold tracking-wide text-violet-300 uppercase">
                  {BACK_SECTION_LABEL.taste}
                </h3>
                <Chips items={back.taste} tone="violet" />
              </div>
            )}
            {back.aromatic.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold tracking-wide text-violet-300 uppercase">
                  {BACK_SECTION_LABEL.aromatic}
                </h3>
                <Chips items={back.aromatic} tone="violet" />
              </div>
            )}
          </div>
        </section>
      )}

      {(back.preparations.length > 0 || back.usableParts.length > 0) && (
        <section aria-labelledby="prep-heading" className="panel p-5">
          <h2 id="prep-heading" className="text-sm font-bold tracking-wide text-gold-400 uppercase">
            Traditional preparation
          </h2>
          <p className="mt-1 mb-3 text-xs text-violet-400">
            How the card says this plant has traditionally been used. Confirm identification
            with reliable references and qualified expertise before preparing any wild plant.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {back.preparations.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold tracking-wide text-violet-300 uppercase">
                  {BACK_SECTION_LABEL.preparations}
                </h3>
                <Chips items={back.preparations} tone="violet" />
              </div>
            )}
            {back.usableParts.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-bold tracking-wide text-violet-300 uppercase">
                  {BACK_SECTION_LABEL.usableParts}
                </h3>
                <Chips items={back.usableParts} tone="violet" />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
