'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlantdexIcon, type IconName } from './icons/PlantdexIcon';

/**
 * Primary navigation.
 *
 * Six destinations, no sub-menus: minor features live inside "Learn" rather than earning
 * their own top-level slot. On a phone this is a fixed bottom bar within thumb reach,
 * which is where navigation belongs when the app is being used outdoors one-handed; on
 * wider screens it moves to the top.
 */

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/herbdex', label: 'Herbdex', icon: 'herbdex' },
  { href: '/garden', label: 'Garden', icon: 'garden' },
  { href: '/journal', label: 'Journal', icon: 'journal' },
  { href: '/seasons', label: 'Seasons', icon: 'seasons' },
  { href: '/learn', label: 'Learn', icon: 'learn' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="panel-raised fixed inset-x-0 bottom-0 z-50 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] sm:static sm:border-x-0 sm:border-t-0 sm:bg-transparent sm:backdrop-blur-none"
    >
      <ul className="mx-auto flex max-w-4xl items-stretch justify-between gap-0.5 px-1 py-1 sm:justify-start sm:gap-1 sm:px-4 sm:py-2">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href} className="flex-1 sm:flex-none">
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[0.72rem] font-semibold transition-colors sm:min-h-10 sm:flex-row sm:gap-1.5 sm:px-3 sm:text-sm ${
                  active
                    ? 'bg-plum-600/70 text-gold-300'
                    : 'text-violet-300 hover:bg-plum-600/40 hover:text-violet-100'
                }`}
              >
                {/*
                  The active marker is a gold rule along the edge the bar is anchored to —
                  under the label on a phone's bottom bar, above it on the desktop top bar.
                  A tinted pill alone was doing the work before, and a tint is the first
                  thing to disappear on a dim screen outdoors.
                */}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 top-0 h-0.5 rounded-full bg-gold-500 sm:inset-x-2 sm:top-auto sm:bottom-0"
                  />
                )}
                <PlantdexIcon name={link.icon} className="text-[1.35rem] leading-none sm:text-base" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
