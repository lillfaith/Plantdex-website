import type { ReactNode } from 'react';
import { ACCENTS, EYEBROW, type AccentName } from './accents';

/**
 * A `<details>` block in the deck's own surface language.
 *
 * `<details>` rather than React state, because it works before hydration and the browser's
 * own find-in-page can open it — both matter for a section that holds citations and a
 * plate of forty compounds.
 *
 * THE SUMMARY IS NOT JUST A TITLE. A collapsed section that shows only its heading has
 * hidden its content; one that lists what is inside has merely folded it. `preview` is
 * where the compound names go, so a reader skimming a phone still sees what the card names
 * without expanding anything.
 */
export function Disclosure({
  id,
  eyebrow,
  summary,
  preview,
  aside,
  accent = 'neutral',
  children,
  className = '',
  ...rest
}: {
  id: string;
  eyebrow?: string;
  summary: ReactNode;
  preview?: ReactNode;
  aside?: ReactNode;
  accent?: AccentName;
  children: ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLElement>) {
  const tone = ACCENTS[accent];
  const tint = accent === 'neutral' ? '' : `${tone.border} ${tone.wash}`;
  return (
    <details
      className={`panel-raised group rounded-card border ${tint} ${className}`.replace(/\s+/g, ' ').trim()}
      {...rest}
    >
      <summary className="min-h-11 cursor-pointer list-none p-5 pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="flex items-baseline gap-2">
            {/*
              The chevron is a SIBLING of the heading, not a child of it. Inside the <h2> it
              inherits `.text-gold-plate`, which paints text transparent so a gradient can
              show through the glyphs — the chevron measured 1.02:1 against its own
              background, i.e. invisible, and the only affordance saying this section opens
              was not on screen at all. Rotating rather than swapping glyph keeps the row
              from reflowing.
            */}
            <span
              aria-hidden="true"
              className={`shrink-0 text-lg leading-none ${tone.label} transition-transform group-open:rotate-90 motion-reduce:transition-none`}
            >
              ›
            </span>
            <div>
              {eyebrow && <p className={`${EYEBROW} ${tone.label}`}>{eyebrow}</p>}
              <h2
                id={id}
                className="font-display mt-1 text-xl font-extrabold text-gold-plate"
              >
                {summary}
              </h2>
            </div>
          </div>
          {aside}
        </div>
        {/* Shown only while closed: once the real content is open this would just repeat it. */}
        {preview && <div className="mt-3 group-open:hidden">{preview}</div>}
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}
