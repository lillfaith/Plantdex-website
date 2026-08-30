import type { Herb } from '@/lib/types';
import { compoundFor, sortForPlate, type CompoundEntry } from '@/lib/compounds';
import { BACK_SECTION_LABEL } from '@/lib/deck';
import { STRUCTURES } from './structures';
import { Panel } from '../ui/Panel';
import { SectionHeader } from '../ui/SectionHeader';

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

function Plate({
  title,
  subtitle,
  eyebrow,
  children,
  caption,
}: {
  title: string;
  subtitle?: string;
  eyebrow: string;
  children: React.ReactNode;
  caption?: string;
}) {
  return (
    <li className="flex flex-col rounded-card border border-violet-700/60 bg-plum-900/60 p-3">
      <div className="flex h-28 items-center justify-center text-violet-300 sm:h-32">
        {children}
      </div>
      <p className="mt-2 text-[0.58rem] font-bold tracking-[0.16em] text-violet-400 uppercase">
        {eyebrow}
      </p>
      <p className="mt-0.5 text-sm leading-tight font-bold text-violet-100">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-violet-300">{subtitle}</p>}
      {caption && <p className="mt-1.5 text-[0.68rem] leading-snug text-violet-400">{caption}</p>}
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
      <span className="text-[0.6rem] font-semibold text-violet-300 tabular-nums">{number}</span>
      <span className="font-display text-center text-3xl font-extrabold text-violet-100">
        {symbol}
      </span>
      <span aria-hidden="true" className="text-[0.6rem]">
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

function CompoundPlate({ printed }: { printed: string }) {
  const entry = compoundFor(printed);

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

  return (
    <Panel frame="plate" pad="lg" aria-labelledby="compounds-heading">
      <SectionHeader
        id="compounds-heading"
        eyebrow="From the card"
        title={BACK_SECTION_LABEL.compounds}
        size="lg"
        note="Constituents named on the card. Naming a compound is not a claim about what it does."
      />
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sortForPlate(compounds).map((printed) => (
          <CompoundPlate key={printed} printed={printed} />
        ))}
      </ul>
    </Panel>
  );
}
