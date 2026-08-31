import type { ReactNode } from 'react';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';
import { ACCENTS, EYEBROW, NOTE, type AccentName } from './accents';

/**
 * One heading treatment for the whole profile page.
 *
 * It emits the `<h2 id>` itself so every band can keep pointing `aria-labelledby` at a real
 * heading — that wiring was hand-repeated in eight places and is the sort of thing that
 * silently rots when a section is copied.
 *
 * `accent` is what makes each band its own thing. It colours the eyebrow and the icon only;
 * the title stays gold and the note stays on the violet ramp, so a section can be visibly
 * distinct without any of its readable text moving to an untested shade.
 */
export function SectionHeader({
  id,
  title,
  eyebrow,
  note,
  icon,
  right,
  size = 'md',
  accent = 'neutral',
}: {
  id: string;
  title: string;
  eyebrow?: string;
  note?: string;
  icon?: IconName;
  right?: ReactNode;
  size?: 'md' | 'lg';
  accent?: AccentName;
}) {
  const tone = ACCENTS[accent];
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          {eyebrow && <p className={`${EYEBROW} ${tone.label}`}>{eyebrow}</p>}
          <h2
            id={id}
            className={
              size === 'lg'
                ? 'font-display mt-1 flex items-center gap-2 text-xl font-extrabold text-gold-plate'
                : 'mt-1 flex items-center gap-2 text-sm font-bold tracking-wide text-gold-400 uppercase'
            }
          >
            {icon && <PlantdexIcon name={icon} className={`shrink-0 text-base ${tone.icon}`} />}
            {title}
          </h2>
        </div>
        {right}
      </div>
      {note && <p className={`mt-1.5 max-w-prose ${NOTE} text-violet-300`}>{note}</p>}
    </div>
  );
}
