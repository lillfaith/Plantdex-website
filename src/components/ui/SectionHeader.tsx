import type { ReactNode } from 'react';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';

/**
 * One heading treatment for the whole profile page.
 *
 * It emits the `<h2 id>` itself so every band can keep pointing `aria-labelledby` at a
 * real heading — that wiring was hand-repeated in eight places and is the sort of thing
 * that silently rots when a section is copied.
 *
 * `eyebrow` is what lets bands differ without differing in colour: a small violet label
 * above a gold title reads as a different kind of section without introducing a shade.
 */
export function SectionHeader({
  id,
  title,
  eyebrow,
  note,
  icon,
  right,
  size = 'md',
}: {
  id: string;
  title: string;
  eyebrow?: string;
  note?: string;
  icon?: IconName;
  right?: ReactNode;
  size?: 'md' | 'lg';
}) {
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          {eyebrow && (
            <p className="text-[0.62rem] font-bold tracking-[0.14em] text-violet-300 uppercase">
              {eyebrow}
            </p>
          )}
          <h2
            id={id}
            className={
              size === 'lg'
                ? 'font-display mt-0.5 flex items-center gap-2 text-xl font-extrabold text-gold-plate'
                : 'mt-0.5 flex items-center gap-2 text-sm font-bold tracking-wide text-gold-400 uppercase'
            }
          >
            {icon && (
              <PlantdexIcon name={icon} className="shrink-0 text-base text-violet-300" />
            )}
            {title}
          </h2>
        </div>
        {right}
      </div>
      {note && <p className="mt-1.5 max-w-prose text-xs text-violet-300">{note}</p>}
    </div>
  );
}
