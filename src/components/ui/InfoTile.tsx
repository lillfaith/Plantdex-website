import type { ReactNode } from 'react';
import { PlantdexIcon, type IconName } from '../icons/PlantdexIcon';

/**
 * A small labelled fact: an icon, what it is, and what it says.
 *
 * Used for the usable-parts grid and the field-data strip. The icon is always decorative —
 * the label beside it says the same thing in words, which is why it stays `aria-hidden`
 * (PlantdexIcon does that by default when given no `title`).
 */
export function InfoTile({
  icon,
  label,
  children,
  align = 'left',
}: {
  icon?: IconName;
  label: string;
  children?: ReactNode;
  align?: 'left' | 'center';
}) {
  const centred = align === 'center';
  return (
    <div
      className={`rounded-xl border border-violet-700/60 bg-plum-800/45 p-3 ${
        centred ? 'text-center' : ''
      }`}
    >
      {icon && (
        <PlantdexIcon
          name={icon}
          className={`text-xl text-violet-300 ${centred ? 'mx-auto' : ''}`}
        />
      )}
      <p
        className={`text-[0.62rem] font-bold tracking-[0.12em] text-violet-300 uppercase ${
          icon ? 'mt-1.5' : ''
        }`}
      >
        {label}
      </p>
      {children && <div className="mt-1 text-sm font-semibold text-violet-100">{children}</div>}
    </div>
  );
}
