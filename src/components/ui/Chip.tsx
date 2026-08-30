import type { ReactNode } from 'react';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';

/**
 * The one chip on the profile page.
 *
 * TONE IS MEANING, NOT DECORATION. `gold` is reserved for earned state and display
 * emphasis — it is deliberately NOT the default, because a page whose every chip is gold
 * has no way left to say "this one is different", and gold chips shout over the printed
 * card art the page is built around. `plain` is the workhorse.
 */
export type ChipTone = 'plain' | 'violet' | 'gold' | 'cyan';

const TONE: Record<ChipTone, string> = {
  plain: 'border-violet-700 bg-plum-700/70 text-violet-200',
  violet: 'border-violet-600 bg-violet-800/35 text-violet-100',
  gold: 'border-gold-500/45 bg-gold-500/12 text-gold-300',
  cyan: 'border-cyan-accent/40 bg-cyan-accent/10 text-cyan-accent',
};

export function Chip({
  tone = 'plain',
  icon,
  children,
  after,
}: {
  tone?: ChipTone;
  icon?: IconName;
  children: ReactNode;
  /** Trailing slot — the glossary "?" lives here rather than inside the label text. */
  after?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE[tone]}`}
    >
      {icon && <PlantdexIcon name={icon} className="shrink-0 text-sm opacity-80" />}
      {children}
      {after}
    </span>
  );
}

/** A wrapping row of chips. Kept here so no caller re-derives the gap. */
export function ChipRow({ children }: { children: ReactNode }) {
  return <ul className="flex flex-wrap gap-1.5">{children}</ul>;
}
