import type { Herb } from '@/lib/types';
import { compoundFor, sortForPlate, type CompoundEntry } from '@/lib/compounds';
import { BACK_SECTION_LABEL } from '@/lib/deck';
import { STRUCTURES } from './structures';
import { Disclosure } from '../ui/Disclosure';
import { Chip, ChipRow } from '../ui/Chip';
import { ACCENTS, MICRO_LABEL, NOTE, READING } from '../ui/accents';
import { linksFor, type CompoundLink } from '@/lib/compound-links';

/**
 * The Signature Compounds plate — the widest and most distinctive band on a plant page.
 *
 * Dark plum ground, lavender line art. Cyan used to be the chemistry accent here and is
 * gone from it: gold is reserved for earned state and display type, and a second bright
 * hue competing with the printed card is exactly what this redesign is undoing.
 *
 * NOTHING HERE MAY MISREPRESENT WHAT A COMPOUND IS. A family, a polymer, a mixture and a
 * mineral compound each get their own treatment, and none of them is ever handed a single
 * molecule's skeleton to stand in. That is enforced by `compounds.test.ts`, not by care.
 */

/** The section accent each linked term borrows, so a link points visibly at its band. */
const FIELD_TONE = {
  taste: ACCENTS.blossom,
  aromatic: ACCENTS.blossom,
  healingTraits: ACCENTS.gold,
} as const;

const FIELD_LABEL = {
  taste: 'Taste',
  aromatic: 'Aroma',
  healingTraits: 'Trait',
} as const;

/**
 * What this compound accounts for elsewhere on the SAME card.
 *
 * `linksFor` has already refused anything the card does not print, so everything here is
 * the card's own wording — the plate is joining two of its statements, not adding a third.
 */
function Connections({ links }: { links: CompoundLink[] }) {
  if (!links.length) return null;
  return (
    <div className="mt-3 border-t border-violet-700/40 pt-2.5">
      <p className={`${MICRO_LABEL} text-violet-400`}>Also on this card</p>
      <ul className="mt-1.5 space-y-1.5">
        {links.map((link) => (
          <li key={`${link.field}:${link.term}`}>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${FIELD_TONE[link.field].border} ${FIELD_TONE[link.field].label}`}
            >
              <span className="opacity-70">{FIELD_LABEL[link.field]}</span>
              {link.term}
            </span>
            <p className={`mt-1 ${NOTE} leading-snug text-violet-300`}>{link.because}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Plate({
  title,
  subtitle,
  eyebrow,
  children,
  caption,
  links = [],
}: {
  title: string;
  subtitle?: string;
  eyebrow: string;
  children: React.ReactNode;
  caption?: string;
  links?: CompoundLink[];
}) {
  return (
    <li className="science-panel overflow-hidden">
      {/*
        One compound per disclosure. The structure, name and class are always visible — the
        expensive part is the explanatory copy and the "also on this card" links, and those
        are what fold away. Nothing is removed from the page; the vertical cost is.
      */}
      <details className="group/c">
        <summary className="min-h-11 cursor-pointer list-none p-3">
      <div className="flex h-24 items-center justify-center text-violet-300 sm:h-28">
        {children}
      </div>
      <p className={`mt-2 ${MICRO_LABEL} ${ACCENTS.indigo.label}`}>{eyebrow}</p>
      <p className={`mt-0.5 ${READING} leading-tight font-bold text-violet-100`}>{title}</p>
      {subtitle && <p className={`mt-0.5 ${NOTE} text-violet-300`}>{subtitle}</p>}
          {(caption || links.length > 0) && (
            <p className={`mt-2 ${MICRO_LABEL} ${ACCENTS.indigo.label} group-open/c:hidden`}>
              <span aria-hidden="true">+</span> Details
            </p>
          )}
        </summary>
        <div className="px-3 pb-3">
          {caption && <p className={`${NOTE} leading-snug text-violet-400`}>{caption}</p>}
          <Connections links={links} />
        </div>
      </details>
    </li>
  );
}

function Structure({ name, structure }: { name: string; structure: string }) {
  const art = STRUCTURES[structure];
  if (!art) return <PendingMark />;
  return (
    <svg
      viewBox={art.viewBox}
      role="img"
      aria-label={`Skeletal formula of ${name}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      <title>{`Skeletal formula of ${name}`}</title>
      {art.art}
    </svg>
  );
}

/**
 * The pending mark, and the reason it says nothing.
 *
 * A compound with no drawing yet gets a complete, dignified plate: its name, what kind of
 * thing it is, and a quiet lattice where the structure will go. There is deliberately NO
 * "structure pending" text and no development status of any kind — a reader should not be
 * able to tell which plates are waiting on art, because that is our problem and not theirs.
 */
function PendingMark() {
  return (
    <svg
      viewBox="0 0 90 60"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      className="h-full w-full text-violet-700"
    >
      {/*
        DELIBERATELY NOT A RING. The first version of this was a hexagon with two bond
        stubs, and on the Dandelion page it sat under the word "Taraxasterol" reading as a
        skeletal formula — of cyclohexane, which is not taraxasterol and is not on the card.
        A placeholder that looks like chemistry states something false. This is a specimen
        frame with nothing mounted in it: unmistakably a slot, not a structure.
      */}
      <path d="M14 10h62v40H14z" opacity="0.75" />
      <path d="M14 10 76 50M76 10 14 50" opacity="0.18" />
      <circle cx="45" cy="30" r="7" opacity="0.5" />
    </svg>
  );
}

/** A family motif: deliberately abstract, and captioned so nobody reads it as a molecule. */
function ClassMotif() {
  return (
    <svg
      viewBox="0 0 90 60"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      className="h-full w-full"
    >
      <path d="M30 14h12l6 10-6 10H30l-6-10Z" />
      <path d="M52 26h12l6 10-6 10H52l-6-10Z" opacity="0.6" />
      <path d="M14 30h10l5 9-5 9H14l-5-9Z" opacity="0.35" />
    </svg>
  );
}

function PolymerMotif() {
  return (
    <svg
      viewBox="0 0 110 60"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      className="h-full w-full"
    >
      <path d="M18 30h10M26 20h16l6 10-6 10H26l-6-10Z" />
      <path d="M48 30h8M56 20h16l6 10-6 10H56l-6-10Z" />
      <path d="M78 30h9" strokeDasharray="3 4" />
      {/* The bracket-and-n that says "this repeats an unfixed number of times". */}
      <path d="M20 14v32M92 14v32M92 14h-4M92 46h-4M20 14h4M20 46h4" opacity="0.7" />
      <text
        x="99"
        y="44"
        fill="currentColor"
        stroke="none"
        fontSize="13"
        fontStyle="italic"
        fontWeight="600"
      >
        n
      </text>
    </svg>
  );
}

function ElementTile({ symbol, number }: { symbol: string; number: number }) {
  return (
    <div className="flex h-24 w-24 flex-col justify-between rounded-lg border border-violet-600 bg-violet-800/30 p-2">
      <span className={`${MICRO_LABEL} text-violet-300 tabular-nums`}>{number}</span>
      <span className="font-display text-center text-3xl font-extrabold text-violet-100">
        {symbol}
      </span>
      <span aria-hidden="true" className={MICRO_LABEL}>
        &nbsp;
      </span>
    </div>
  );
}

/** A mineral COMPOUND. Never an element tile — silica is not silicon. */
function FormulaTile({ formula }: { formula: string }) {
  const parts = formula.match(/[A-Z][a-z]?|\d+/g) ?? [formula];
  return (
    <div className="rounded-lg border border-violet-600 bg-violet-800/30 px-5 py-4">
      <span className="font-display text-3xl font-extrabold text-violet-100">
        {parts.map((part, i) =>
          /^\d+$/.test(part) ? (
            <sub key={i} className="text-lg">
              {part}
            </sub>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </span>
    </div>
  );
}

const EYEBROW: Record<CompoundEntry['kind'], string> = {
  molecule: 'Molecule',
  'chemical-class': 'Chemical class',
  polymer: 'Polymer',
  mixture: 'Mixture',
  mineral: 'Mineral element',
  'mineral-compound': 'Mineral compound',
};

function CompoundPlate({ herb, printed }: { herb: Herb; printed: string }) {
  const entry = compoundFor(printed);
  const links = linksFor(herb, printed);

  // A compound the table does not know still renders as itself, named exactly as printed —
  // it just gets no claim about what kind of thing it is.
  if (!entry) {
    return (
      <Plate title={printed} eyebrow="Compound">
        <PendingMark />
      </Plate>
    );
  }

  const shared = {
    title: printed,
    subtitle: entry.subtitle,
    eyebrow: EYEBROW[entry.kind],
    caption: entry.note,
    links,
  };

  switch (entry.kind) {
    case 'molecule':
      return (
        <Plate {...shared}>
          {entry.structure ? (
            <Structure name={printed} structure={entry.structure} />
          ) : (
            <PendingMark />
          )}
        </Plate>
      );
    case 'chemical-class':
      return (
        <Plate {...shared}>
          <ClassMotif />
        </Plate>
      );
    case 'polymer':
      return (
        <Plate {...shared}>
          <PolymerMotif />
        </Plate>
      );
    case 'mixture':
      return (
        <Plate
          {...shared}
          subtitle={entry.components ? entry.components.join(' + ') : entry.subtitle}
        >
          <ClassMotif />
        </Plate>
      );
    case 'mineral':
      return (
        <Plate {...shared}>
          <ElementTile symbol={entry.symbol ?? '?'} number={entry.atomicNumber ?? 0} />
        </Plate>
      );
    case 'mineral-compound':
      return (
        <Plate {...shared}>
          <FormulaTile formula={entry.formula ?? ''} />
        </Plate>
      );
  }
}

export function SignatureCompounds({ herb }: { herb: Herb }) {
  const compounds = herb.back.compounds;
  if (!compounds.length) return null;

  const order = sortForPlate(compounds);

  return (
    <Disclosure
      id="compounds-heading"
      eyebrow="From the card"
      accent="indigo"
      summary={BACK_SECTION_LABEL.compounds}
      aside={
        <span className={`${MICRO_LABEL} text-violet-400 tabular-nums`}>
          {compounds.length} named
        </span>
      }
      // Collapsed, but not hidden: the names are on screen either way, so folding this
      // section costs a reader nothing but the structures.
      preview={
        <ChipRow>
          {order.map((printed) => (
            <li key={printed}>
              <Chip tone="plain">{printed}</Chip>
            </li>
          ))}
        </ChipRow>
      }
    >
      <p className={`max-w-prose ${NOTE} text-violet-300`}>
        Constituents named on the card. Naming a compound is not a claim about what it does.
      </p>
      {/* `items-start` so a plate with four connections does not stretch its whole row;
          the compounds differ a lot in how much they have to say. */}
      <ul className="mt-4 grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {order.map((printed) => (
          <CompoundPlate key={printed} herb={herb} printed={printed} />
        ))}
      </ul>
    </Disclosure>
  );
}
